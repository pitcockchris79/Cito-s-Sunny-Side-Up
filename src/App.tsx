import { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { LogEntry, InverterStats } from './types';
import { MetricCard, EfficiencyGauge } from './components/MetricCard';
import { InverterForm } from './components/InverterForm';
import { LogTable } from './components/LogTable';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { AIAnalyst } from './components/AIAnalyst';
import { HardwareIntegration } from './components/HardwareIntegration';
import { 
  Sun, 
  Zap, 
  TrendingUp, 
  Gauge, 
  Settings, 
  RefreshCw, 
  ShieldCheck, 
  Info,
  Database,
  Download,
  Upload,
  DollarSign,
  Leaf,
  FileText,
  User,
  LogIn,
  LogOut,
  Lock,
  AlertTriangle
} from 'lucide-react';

// Firebase core modules and references
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInAnonymously, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, deleteDoc, getDocs, writeBatch, query, orderBy } from 'firebase/firestore';
import { auth, db, googleProvider, OperationType, handleFirestoreError } from './lib/firebase';
import { getApiUrl } from './lib/api';

export default function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [systemCapacityW, setSystemCapacityW] = useState<number>(4000);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Firebase Auth states
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  
  const [systemMode, setSystemMode] = useState<'grid-tied' | 'hybrid' | 'off-grid'>(() => {
    const saved = localStorage.getItem('solar_logger_system_mode');
    return (saved as any) || 'hybrid';
  });

  const [simulatedBatterySoC, setSimulatedBatterySoC] = useState<number>(72);
  const [utilityRate, setUtilityRate] = useState<number>(() => {
    const saved = localStorage.getItem('solar_logger_utility_rate');
    return saved ? parseFloat(saved) : 0.16;
  });

  // Listen for Firebase Auth changes and load configuration & logs accordingly
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        
        // Load user settings from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const loadedMode = userData.systemMode || 'hybrid';
            const loadedRate = userData.utilityRate !== undefined ? userData.utilityRate : 0.16;
            const loadedCapacity = userData.systemCapacityW !== undefined ? userData.systemCapacityW : 4000;
            
            setSystemMode(loadedMode);
            setUtilityRate(loadedRate);
            setSystemCapacityW(loadedCapacity);
          } else {
            // Document doesn't exist, seed default profile
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email || 'guest@sunnyside.local',
              displayName: firebaseUser.displayName || 'Solar Analyst',
              photoURL: firebaseUser.photoURL || '',
              systemMode,
              utilityRate,
              systemCapacityW,
              updatedAt: new Date().toISOString()
            });
          }

          // Query user telemetry logs from Firestore
          const logsQuery = query(
            collection(db, 'users', firebaseUser.uid, 'logs'),
            orderBy('timestamp', 'asc')
          );
          
          const logsSnap = await getDocs(logsQuery);
          const fbLogs: LogEntry[] = [];
          logsSnap.forEach((d) => {
            fbLogs.push({
              ...(d.data() as Omit<LogEntry, 'id'>),
              id: d.id
            });
          });

          // Perform seamless automatic migration if Firestore has no logs but local storage has them
          const localSavedLogs = localStorage.getItem('solar_logger_logs');
          if (fbLogs.length === 0 && localSavedLogs) {
            try {
              const localLogs: LogEntry[] = JSON.parse(localSavedLogs);
              if (localLogs.length > 0) {
                console.log("Migrating local telemetry logs to Firestore database...", firebaseUser.uid);
                const batch = writeBatch(db);
                localLogs.forEach((log) => {
                  const logDocRef = doc(db, 'users', firebaseUser.uid, 'logs', log.id);
                  const { id, ...logData } = log;
                  const cleanedLogData: Record<string, any> = {};
                  Object.entries(logData).forEach(([key, val]) => {
                    if (val !== undefined) {
                      cleanedLogData[key] = val;
                    }
                  });
                  batch.set(logDocRef, {
                    ...cleanedLogData,
                    userId: firebaseUser.uid
                  });
                });
                await batch.commit();

                // Reload from Firestore
                const reloadedSnap = await getDocs(logsQuery);
                const reloadedLogs: LogEntry[] = [];
                reloadedSnap.forEach((d) => {
                  reloadedLogs.push({
                    ...(d.data() as Omit<LogEntry, 'id'>),
                    id: d.id
                  });
                });
                setLogs(reloadedLogs);
              } else {
                setLogs([]);
              }
            } catch (e) {
              console.error("Migration error: ", e);
              setLogs([]);
            }
          } else {
            setLogs(fbLogs);
          }
        } catch (err) {
          console.error("Firestore loading error: ", err);
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setCurrentUser(null);
        // Fallback to offline cached local storage logs
        const saved = localStorage.getItem('solar_logger_logs');
        if (saved) {
          try {
            setLogs(JSON.parse(saved));
          } catch (e) {
            console.error("Failed to load offline logs from local storage", e);
            setLogs([]);
          }
        } else {
          setLogs([]);
        }
      }
      setAuthLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Save settings on changes
  const updateSystemMode = async (mode: 'grid-tied' | 'hybrid' | 'off-grid') => {
    setSystemMode(mode);
    localStorage.setItem('solar_logger_system_mode', mode);
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          systemMode: mode,
          utilityRate,
          systemCapacityW,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("Failed to update system mode in Firestore", err);
        handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
      }
    }
  };

  const updateUtilityRate = async (rate: number) => {
    setUtilityRate(rate);
    localStorage.setItem('solar_logger_utility_rate', rate.toString());
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          systemMode,
          utilityRate: rate,
          systemCapacityW,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("Failed to update utility rate in Firestore", err);
        handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
      }
    }
  };

  const updateSystemCapacity = async (capacity: number) => {
    setSystemCapacityW(capacity);
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          systemMode,
          utilityRate,
          systemCapacityW: capacity,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("Failed to update array capacity in Firestore", err);
        handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
      }
    }
  };

  // Sync simulated battery SoC with latest logs on load
  useEffect(() => {
    if (logs.length > 0) {
      const lastWithBatt = [...logs].reverse().find(l => l.batterySoC !== undefined);
      if (lastWithBatt && lastWithBatt.batterySoC !== undefined) {
        setSimulatedBatterySoC(lastWithBatt.batterySoC);
      }
    }
  }, [logs]);

  // Auto-refresh / Simulated live telemetry feed
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      const now = new Date();
      const hour = now.getHours();
      
      // Solar curve calculation
      const hourOffset = hour - 13; // Peak at 13:00 (1 PM)
      const solarFactor = Math.max(0, Math.exp(-Math.pow(hourOffset, 2) / 14));
      
      // Calculate realistic metrics
      const voltageFluc = (Math.sin(hour / 2) * 15) + (Math.random() * 5);
      const solarVolts = solarFactor > 0 ? Math.round(320 + voltageFluc) : 0;
      
      const maxAmps = 10.5;
      const baseAmps = maxAmps * solarFactor;
      const ampsFluc = (Math.random() * 0.4) - 0.2;
      const solarAmps = solarFactor > 0 ? Math.max(0.1, Math.round((baseAmps + ampsFluc) * 100) / 100) : 0;
      
      const solarWatts = Math.round(solarVolts * solarAmps);
      const baseEff = 96.2;
      const tempFactor = hour >= 11 && hour <= 15 ? 1.5 : 0.5;
      const efficiency = solarFactor > 0 
        ? Number((baseEff - tempFactor - (Math.random() * 0.8)).toFixed(1))
        : 0;
        
      let inverterWatts = Math.round(solarWatts * (efficiency / 100));
      
      // Mode-specific modifications
      let battSoC: number | undefined = undefined;
      let gridFreq: number | undefined = Number((59.95 + (Math.random() * 0.1)).toFixed(2));
      let modeNotes = "";

      if (systemMode !== 'grid-tied') {
        // Battery SoC simulation
        setSimulatedBatterySoC((prev) => {
          let change = 0;
          if (solarWatts > 1200) {
            // Charging state
            change = 0.8 + (Math.random() * 0.4);
          } else if (solarWatts < 400) {
            // Discharging state (inverter is drawing power)
            change = -0.5 - (Math.random() * 0.3);
          } else {
            // Idle or slow charge
            change = 0.1 - (Math.random() * 0.1);
          }
          const nextVal = Math.min(100, Math.max(0, prev + change));
          return Number(nextVal.toFixed(1));
        });
        
        battSoC = Math.round(simulatedBatterySoC);
      }

      if (systemMode === 'off-grid') {
        gridFreq = undefined; // No utility grid synchronization
        if (battSoC !== undefined && battSoC <= 10) {
          // Force inverter standby if battery too low
          inverterWatts = 0;
          modeNotes = `Off-grid telemetry. CRITICAL LOW BATTERY (${battSoC}%). Inverter load disconnected to preserve battery bank.`;
        } else {
          // Off-grid load is limited by solar + battery inverter output capability (max 3000W)
          inverterWatts = Math.min(3000, Math.round(inverterWatts + (solarWatts > 1000 ? 200 : -100)));
          modeNotes = `Off-grid telemetry stream. Isolated standalone inverter mode. Battery SoC: ${battSoC}%.`;
        }
      } else if (systemMode === 'hybrid') {
        if (battSoC !== undefined && battSoC <= 20) {
          // Supplemental utility bypass active
          modeNotes = `Hybrid telemetry stream. Low Battery (${battSoC}%), drawing supplemental bypass current from grid to cover home load.`;
        } else {
          modeNotes = `Hybrid telemetry stream. Smart storage and net-metered load balancing active. Battery SoC: ${battSoC}%.`;
        }
      } else {
        // grid-tied
        modeNotes = `Grid-tied telemetry stream. Active net-metered feedback to public utility grid. Dynamic phase synchronization locked.`;
      }

      const inverterVolts = Math.round(240 + (Math.sin(hour / 4) * 3) + (Math.random() * 1.5));
      const inverterAmps = inverterWatts > 0 ? Math.max(0.1, Math.round((inverterWatts / inverterVolts) * 100) / 100) : 0;
      
      const ambientTemp = 18 + Math.sin((hour - 8) / 3) * 8;
      const panelTemp = Math.round(ambientTemp + (solarFactor * 25));
      
      const newLiveLog: LogEntry = {
        id: `live-${Date.now()}`,
        timestamp: now.toISOString(),
        solarVolts,
        solarAmps,
        solarWatts,
        inverterVolts,
        inverterAmps,
        inverterWatts,
        efficiency,
        lossWatts: Math.max(0, solarWatts - inverterWatts),
        panelTemp,
        gridFreq,
        batterySoC: battSoC,
        systemMode,
        weather: solarFactor > 0.6 ? 'sunny' : (solarFactor > 0.2 ? 'cloudy' : 'overcast'),
        notes: modeNotes
      };
      
      if (auth.currentUser) {
        const { id, ...logData } = newLiveLog;
        const cleanedLogData: Record<string, any> = {};
        Object.entries(logData).forEach(([key, val]) => {
          if (val !== undefined) {
            cleanedLogData[key] = val;
          }
        });
        setDoc(doc(db, 'users', auth.currentUser.uid, 'logs', newLiveLog.id), {
          ...cleanedLogData,
          userId: auth.currentUser.uid
        }).catch(err => {
          console.error("Error saving live log to Firestore:", err);
          handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser?.uid}/logs/${newLiveLog.id}`);
        });
      }

      setLogs((prev) => {
        const updated = [...prev, newLiveLog].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        localStorage.setItem('solar_logger_logs', JSON.stringify(updated));
        return updated;
      });
    }, 5000); // 5 seconds polling rate

    return () => clearInterval(interval);
  }, [autoRefresh, systemMode, simulatedBatterySoC]);

  // Save logs to local storage whenever they change (serves as a robust offline fallback)
  const saveLogs = async (updatedLogs: LogEntry[]) => {
    setLogs(updatedLogs);
    localStorage.setItem('solar_logger_logs', JSON.stringify(updatedLogs));
  };

  // Add a new log entry
  const handleAddLog = async (newEntry: Omit<LogEntry, 'id' | 'timestamp'> & { timestamp?: string }) => {
    const logId = `log-${Date.now()}`;
    const log: LogEntry = {
      ...newEntry,
      id: logId,
      timestamp: newEntry.timestamp || new Date().toISOString()
    };
    
    // Insert and sort chronologically
    const updated = [...logs, log].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    await saveLogs(updated);

    if (auth.currentUser) {
      try {
        const { id, ...logData } = log;
        const cleanedLogData: Record<string, any> = {};
        Object.entries(logData).forEach(([key, val]) => {
          if (val !== undefined) {
            cleanedLogData[key] = val;
          }
        });
        await setDoc(doc(db, 'users', auth.currentUser.uid, 'logs', logId), {
          ...cleanedLogData,
          userId: auth.currentUser.uid
        });
      } catch (err) {
        console.error("Failed to add log to Firestore:", err);
        handleFirestoreError(err, OperationType.CREATE, `users/${auth.currentUser.uid}/logs/${logId}`);
      }
    }
  };

  // Delete a log entry
  const handleDeleteLog = async (id: string) => {
    const filtered = logs.filter(log => log.id !== id);
    await saveLogs(filtered);

    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'logs', id));
      } catch (err) {
        console.error("Failed to delete log from Firestore:", err);
        handleFirestoreError(err, OperationType.DELETE, `users/${auth.currentUser.uid}/logs/${id}`);
      }
    }
  };

  // Clear all logs
  const handleClearLogs = async () => {
    await saveLogs([]);

    if (auth.currentUser) {
      try {
        const logsSnap = await getDocs(collection(db, 'users', auth.currentUser.uid, 'logs'));
        const batch = writeBatch(db);
        logsSnap.forEach((d) => {
          batch.delete(doc(db, 'users', auth.currentUser.uid, 'logs', d.id));
        });
        await batch.commit();
      } catch (err) {
        console.error("Failed to clear logs from Firestore:", err);
        handleFirestoreError(err, OperationType.DELETE, `users/${auth.currentUser.uid}/logs`);
      }
    }
  };

  // Seed 48 hours of historical readings from our backend API
  const handleImportSeedLogs = async () => {
    setSeeding(true);
    try {
      const res = await fetch(getApiUrl("/api/seed-logs"));
      if (!res.ok) {
        throw new Error("Server failed to generate seed logs.");
      }
      const data = await res.json();
      const seededLogs = data.logs as LogEntry[];
      await saveLogs(seededLogs);

      if (auth.currentUser) {
        console.log("Seeding telemetry logs to Firestore for user:", auth.currentUser.uid);
        const batch = writeBatch(db);
        seededLogs.forEach((log) => {
          const logDocRef = doc(db, 'users', auth.currentUser!.uid, 'logs', log.id);
          const { id, ...logData } = log;
          const cleanedLogData: Record<string, any> = {};
          Object.entries(logData).forEach(([key, val]) => {
            if (val !== undefined) {
              cleanedLogData[key] = val;
            }
          });
          batch.set(logDocRef, {
            ...cleanedLogData,
            userId: auth.currentUser!.uid
          });
        });
        try {
          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${auth.currentUser.uid}/logs`);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Failed to seed historical data. Please verify your connection.");
    } finally {
      setSeeding(false);
    }
  };

  // Export logs to JSON
  const handleExportJSON = () => {
    if (logs.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `solar_logger_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Download high-fidelity PDF report using jsPDF
  const handleDownloadPDFReport = () => {
    if (logs.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width || 210;
    const pageHeight = doc.internal.pageSize.height || 297;

    // Brand color constants
    const primaryColor = [17, 19, 24]; // Dark slate background header
    const accentColor = [234, 179, 8];  // yellow-500
    const textDark = [30, 41, 59];      // slate-800
    const textMuted = [100, 116, 139];   // slate-500

    // Draw header box
    doc.setFillColor(17, 19, 24);
    doc.rect(0, 0, pageWidth, 42, 'F');

    // Draw accent line
    doc.setFillColor(234, 179, 8);
    doc.rect(0, 42, pageWidth, 2.5, 'F');

    // Header Content
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("SUNNY SIDE UP", 14, 18);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("PHOTOVOLTAIC ARRAY & GRID INVERTER TELEMETRY INDEX", 14, 25);

    // Metadata on the right
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(234, 179, 8);
    doc.setFontSize(10);
    doc.text("V2.1 PRO", pageWidth - 14, 18, { align: "right" });

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text(`REPORT GENERATED: ${new Date().toLocaleString()}`, pageWidth - 14, 25, { align: "right" });
    doc.text(`SYSTEM TOPOLOGY: ${systemMode.toUpperCase()}`, pageWidth - 14, 31, { align: "right" });

    // 1. Executive Summary Section
    let y = 56;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 19, 24);
    doc.text("1. SYSTEM OVERVIEW & PERFORMANCE SUMMARY", 14, y);

    // Section underline
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, y + 2, pageWidth - 14, y + 2);

    y += 8;
    // Overview Box
    doc.setFillColor(248, 250, 252); // soft grey
    doc.rect(14, y, pageWidth - 28, 24, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, y, pageWidth - 28, 24, 'S');

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(17, 19, 24);
    doc.text("SYSTEM MODE:", 18, y + 6);
    doc.setFont("Helvetica", "normal");
    doc.text(systemMode === 'grid-tied' ? "Grid-Tied (Net-Metered Feedback)" : systemMode === 'hybrid' ? "Hybrid (Battery Storage + Utility Backup)" : "Off-Grid (Isolated Microgrid Standalone)", 48, y + 6);

    doc.setFont("Helvetica", "bold");
    doc.text("TOTAL LOGS:", 18, y + 11);
    doc.setFont("Helvetica", "normal");
    doc.text(`${stats.totalLogs} telemetry records analyzed`, 48, y + 11);

    doc.setFont("Helvetica", "bold");
    doc.text("ARRAY LIMIT:", 18, y + 16);
    doc.setFont("Helvetica", "normal");
    doc.text(`${systemCapacityW}W Rated Peak DC Capacity`, 48, y + 16);

    // 2. Financial & Environmental Impact
    y += 33;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 19, 24);
    doc.text("2. SUSTAINABILITY & FINANCIAL YIELD LEDGER", 14, y);
    doc.line(14, y + 2, pageWidth - 14, y + 2);

    y += 8;
    // Two columns for savings and carbon offset
    const boxWidth = (pageWidth - 34) / 2;

    // Column 1: Financial Savings Realized
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, boxWidth, 38, 'F');
    doc.setDrawColor(16, 185, 129); // emerald green
    doc.setLineWidth(1);
    doc.line(14, y, 14, y + 38); // Left colored border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.rect(14, y, boxWidth, 38, 'S');

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    doc.text("FINANCIAL SAVINGS", 18, y + 6);

    const savingsVal = `$${(totalKWh * utilityRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(17, 19, 24);
    doc.text(savingsVal, 18, y + 18);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Net-Metered Yield: ${totalKWh.toLocaleString()} kWh`, 18, y + 26);
    doc.text(`Utility Rate: $${utilityRate.toFixed(2)}/kWh`, 18, y + 31);

    // Column 2: Carbon Mass Deflection
    const col2X = 14 + boxWidth + 6;
    doc.setFillColor(248, 250, 252);
    doc.rect(col2X, y, boxWidth, 38, 'F');
    doc.setDrawColor(234, 179, 8); // yellow-500
    doc.setLineWidth(1);
    doc.line(col2X, y, col2X, y + 38); // Left colored border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.rect(col2X, y, boxWidth, 38, 'S');

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(202, 138, 4); // darker yellow
    doc.text("CARBON OFFSET REDUCTION", col2X + 4, y + 6);

    const co2Val = `${(totalKWh * 0.39).toLocaleString(undefined, { maximumFractionDigits: 1 })} kg CO2`;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(17, 19, 24);
    doc.text(co2Val, col2X + 4, y + 18);

    const treesVal = Math.max(0.1, Number((totalKWh * 0.39 / 21.8).toFixed(1)));
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Atmospheric avoidance: ${(totalKWh * 0.39 * 2.20462).toLocaleString(undefined, { maximumFractionDigits: 1 })} lbs`, col2X + 4, y + 26);
    doc.text(`Equivalent Trees Sequestration: ${treesVal} trees`, col2X + 4, y + 31);

    // 3. Technical Performance Metrics Section
    y += 48;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 19, 24);
    doc.text("3. SYSTEM CONVERSION & PEAK METRICS", 14, y);
    doc.line(14, y + 2, pageWidth - 14, y + 2);

    y += 8;
    // Metrics 3 columns
    const colW = (pageWidth - 34) / 3;

    // Card A: Peak Solar Production
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, colW, 20, 'F');
    doc.rect(14, y, colW, 20, 'S');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("PEAK SOLAR DC", 18, y + 5);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(17, 19, 24);
    doc.text(`${stats.peakSolarWatts} W`, 18, y + 12);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`Max Current: ${stats.peakSolarAmps}A`, 18, y + 17);

    // Card B: Peak Inverter Output
    doc.setFillColor(248, 250, 252);
    doc.rect(14 + colW + 3, y, colW, 20, 'F');
    doc.rect(14 + colW + 3, y, colW, 20, 'S');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("PEAK INVERTER AC", 14 + colW + 7, y + 5);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(17, 19, 24);
    doc.text(`${stats.peakInverterWatts} W`, 14 + colW + 7, y + 12);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`Max Output Current: ${stats.peakInverterAmps}A`, 14 + colW + 7, y + 17);

    // Card C: Average Efficiency
    doc.setFillColor(248, 250, 252);
    doc.rect(14 + (colW * 2) + 6, y, colW, 20, 'F');
    doc.rect(14 + (colW * 2) + 6, y, colW, 20, 'S');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("AVG CONVERSION EFF", 14 + (colW * 2) + 10, y + 5);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(17, 19, 24);
    doc.text(`${stats.avgEfficiency}%`, 14 + (colW * 2) + 10, y + 12);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`Cumulative Loss: ${stats.totalLossWatts.toLocaleString()} W`, 14 + (colW * 2) + 10, y + 17);

    // 4. Historical Telemetry Log Table (last 10 entries)
    y += 30;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 19, 24);
    doc.text("4. RECENT RECORDED TELEMETRY LOGS", 14, y);
    doc.line(14, y + 2, pageWidth - 14, y + 2);

    y += 8;
    // Table Header
    doc.setFillColor(17, 19, 24);
    doc.rect(14, y, pageWidth - 28, 6, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text("TIMESTAMP", 16, y + 4);
    doc.text("MODE", 50, y + 4);
    doc.text("SOLAR (DC)", 80, y + 4);
    doc.text("INVERTER (AC)", 115, y + 4);
    doc.text("EFFICIENCY", 150, y + 4);
    doc.text("WEATHER", 180, y + 4);

    y += 6;
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(17, 19, 24);

    const tableLogs = [...logs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15); // Show up to last 15 logs

    tableLogs.forEach((log, index) => {
      // Alternating row colors
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, pageWidth - 28, 6, 'F');
      }

      doc.setFontSize(7);
      doc.text(new Date(log.timestamp).toLocaleString([], { hour12: false }), 16, y + 4.5);
      doc.text((log.systemMode || "grid-tied").toUpperCase(), 50, y + 4.5);
      doc.text(`${log.solarWatts}W (${log.solarVolts}V / ${log.solarAmps}A)`, 80, y + 4.5);
      doc.text(`${log.inverterWatts}W (${log.inverterAmps}A)`, 115, y + 4.5);
      doc.text(`${log.efficiency}%`, 150, y + 4.5);
      doc.text((log.weather || "sunny").toUpperCase(), 180, y + 4.5);

      y += 6;
    });

    // Save PDF file
    doc.save(`sunny_side_up_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Import logs from JSON upload
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed) && parsed.every(item => item.solarWatts !== undefined && item.inverterWatts !== undefined)) {
            const merged = [...logs, ...parsed].filter((item, index, self) => 
              index === self.findIndex((t) => t.id === item.id)
            ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            saveLogs(merged);
            alert(`Imported ${parsed.length} log records successfully.`);
          } else {
            alert("Invalid log backup format. Missing required conversion metrics.");
          }
        } catch (err) {
          alert("Failed to parse file. Ensure it is a valid JSON solar backup.");
        }
      };
    }
  };

  // Calculate stats based on logs
  const stats = useMemo<InverterStats>(() => {
    if (logs.length === 0) {
      return {
        totalLogs: 0,
        avgSolarWatts: 0,
        avgInverterWatts: 0,
        avgEfficiency: 0,
        peakSolarWatts: 0,
        peakInverterWatts: 0,
        peakSolarAmps: 0,
        peakInverterAmps: 0,
        totalLossWatts: 0
      };
    }

    const totalInput = logs.reduce((sum, l) => sum + l.solarWatts, 0);
    const totalOutput = logs.reduce((sum, l) => sum + l.inverterWatts, 0);
    const avgEff = logs.reduce((sum, l) => sum + l.efficiency, 0) / logs.length;
    const peakDC = Math.max(...logs.map(l => l.solarWatts));
    const peakAC = Math.max(...logs.map(l => l.inverterWatts));
    const peakDCAmps = Math.max(...logs.map(l => l.solarAmps));
    const peakACAmps = Math.max(...logs.map(l => l.inverterAmps));
    const totalLoss = logs.reduce((sum, l) => sum + l.lossWatts, 0);

    return {
      totalLogs: logs.length,
      avgSolarWatts: Math.round(totalInput / logs.length),
      avgInverterWatts: Math.round(totalOutput / logs.length),
      avgEfficiency: Number(avgEff.toFixed(1)),
      peakSolarWatts: peakDC,
      peakInverterWatts: peakAC,
      peakSolarAmps: peakDCAmps,
      peakInverterAmps: peakACAmps,
      totalLossWatts: totalLoss
    };
  }, [logs]);

  // Calculate cumulative energy yield in kWh from chronologically ordered logs using trapezoidal rule
  const totalKWh = useMemo(() => {
    if (logs.length === 0) return 0;
    if (logs.length === 1) {
      // If there is only one log, assume it has been active for an hour to show some immediate feedback
      return Number(((logs[0].inverterWatts * 1) / 1000).toFixed(2));
    }
    
    // Sort chronologically
    const sorted = [...logs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    let sumKWh = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const prevTime = new Date(prev.timestamp).getTime();
      const currTime = new Date(curr.timestamp).getTime();
      const timeDiffMs = currTime - prevTime;
      const hours = timeDiffMs / 3600000;
      
      // Safety threshold: filter out massive chronological gaps (e.g., > 24 hours) or negative times
      if (hours > 0 && hours < 24) {
        const avgWatts = (prev.inverterWatts + curr.inverterWatts) / 2;
        sumKWh += (avgWatts * hours) / 1000;
      }
    }
    return Number(sumKWh.toFixed(2));
  }, [logs]);

  // Current latest reading
  const latestLog = useMemo<LogEntry | null>(() => {
    if (logs.length === 0) return null;
    return logs[logs.length - 1];
  }, [logs]);

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-slate-100 font-mono antialiased pb-16">
      {/* Top Professional Header */}
      <header className="sticky top-0 z-50 bg-[#111318] border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1A1C20] border border-slate-800 text-yellow-500">
              <Sun size={20} className="animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-widest text-white uppercase flex items-center gap-2">
                Sunny Side Up <span className="text-[9px] bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 text-yellow-500 tracking-widest font-bold">V2.1 PRO</span>
              </h1>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Photovoltaic Array & Grid Inverter Telemetry Index</p>
            </div>
          </div>

          {/* Quick controls in header */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-[10px] font-mono font-bold px-3.5 py-2 flex items-center gap-1.5 transition-all uppercase cursor-pointer border ${
                autoRefresh 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40" 
                  : "bg-[#1A1C20] text-slate-300 border-slate-800 hover:bg-[#252830]"
              }`}
            >
              <RefreshCw size={12} className={autoRefresh ? "animate-spin" : ""} />
              {autoRefresh ? "● LIVE STREAM" : "AUTO REFRESH"}
            </button>

            <button
              onClick={() => setShowConfig(!showConfig)}
              className="text-[10px] font-mono font-bold text-slate-300 bg-[#1A1C20] hover:bg-slate-800 border border-slate-800 px-3.5 py-2 flex items-center gap-1.5 transition-all uppercase cursor-pointer"
            >
              <Settings size={12} />
              Array Limit: {systemCapacityW}W
            </button>

            {logs.length === 0 ? (
              <button
                onClick={handleImportSeedLogs}
                disabled={seeding}
                className="text-[10px] font-mono font-bold text-slate-950 bg-yellow-500 hover:bg-yellow-400 border border-yellow-600 px-3.5 py-2 flex items-center gap-1.5 transition-all uppercase cursor-pointer disabled:opacity-55"
              >
                <Database size={12} className={seeding ? "animate-spin" : ""} />
                {seeding ? "LOADING INDEX..." : "SEED TELEMETRY"}
              </button>
            ) : (
              <>
                <button
                  onClick={handleDownloadPDFReport}
                  className="text-[10px] font-mono font-bold text-slate-950 bg-yellow-500 hover:bg-yellow-400 border border-yellow-600 px-3.5 py-2 flex items-center gap-1.5 transition-all uppercase cursor-pointer"
                  title="Download PDF Telemetry Report"
                >
                  <FileText size={12} />
                  DOWNLOAD REPORT
                </button>
                <button
                  onClick={handleExportJSON}
                  className="text-[10px] font-mono font-bold text-slate-300 bg-[#1A1C20] hover:bg-slate-800 border border-slate-800 px-3 py-2 flex items-center gap-1.5 transition-all uppercase cursor-pointer"
                  title="Export records to JSON file"
                >
                  <Download size={12} />
                  EXPORT
                </button>
                <label className="text-[10px] font-mono font-bold text-slate-300 bg-[#1A1C20] hover:bg-slate-800 border border-slate-800 px-3 py-2 flex items-center gap-1.5 transition-all uppercase cursor-pointer relative">
                  <Upload size={12} />
                  IMPORT
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </label>
              </>
            )}

            {/* Firebase Auth Controls */}
            <div className="flex items-center gap-2 border-l border-slate-800/80 pl-2 ml-1">
              {authLoading ? (
                <div className="h-8 w-24 bg-[#1A1C20] border border-slate-800 animate-pulse flex items-center justify-center">
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">SYNCING...</span>
                </div>
              ) : currentUser ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-[#1A1C20] border border-slate-800 px-2.5 py-1.5">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="User Avatar" className="w-4 h-4 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center text-[10px] font-bold text-slate-950 uppercase">
                        {currentUser.displayName ? currentUser.displayName[0] : (currentUser.isAnonymous ? 'G' : 'U')}
                      </div>
                    )}
                    <div className="hidden md:flex flex-col text-left">
                      <span className="text-[8px] font-bold text-white uppercase tracking-wider max-w-[100px] truncate">
                        {currentUser.displayName || (currentUser.isAnonymous ? 'Guest Analyst' : 'Cloud Analyst')}
                      </span>
                      <span className="text-[7px] text-emerald-400 font-bold uppercase tracking-widest mt-[-2px]">
                        ● CLOUD SYNCED
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => signOut(auth)}
                    className="text-[10px] font-mono font-bold text-slate-400 hover:text-white bg-[#1A1C20] hover:bg-slate-800 border border-slate-800 px-2.5 py-2 flex items-center gap-1 transition-all uppercase cursor-pointer"
                    title="Sign Out of Cloud Session"
                  >
                    <LogOut size={11} />
                    <span className="hidden sm:inline">DISCONNECT</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setAuthError(null);
                      signInWithPopup(auth, googleProvider)
                        .catch((err) => {
                          console.log("Google Sign-In blocked/failed. Falling back to anonymous login.", err);
                          signInAnonymously(auth).catch((anonErr) => {
                            console.error("Anonymous Sign-In failed too:", anonErr);
                            setAuthError(
                              "Google Sign-In failed/blocked. Automatic Guest fallback also failed because the Anonymous Sign-In provider is disabled in your Firebase Console configuration."
                            );
                          });
                        });
                    }}
                    className="text-[10px] font-mono font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 border border-emerald-600 px-3.5 py-2 flex items-center gap-1.5 transition-all uppercase cursor-pointer"
                    title="Sync Telemetry index with secure Google Cloud account"
                  >
                    <LogIn size={12} />
                    CLOUD SYNC
                  </button>
                  <button
                    onClick={() => {
                      setAuthError(null);
                      signInAnonymously(auth).catch((err) => {
                        console.error("Anonymous Sign-In failed:", err);
                        setAuthError(
                          "Guest/Anonymous login failed because the 'Anonymous' provider is disabled in your Firebase Authentication settings."
                        );
                      });
                    }}
                    className="text-[9px] font-mono font-bold text-slate-400 hover:text-white bg-[#1A1C20] hover:bg-slate-800 border border-slate-800 px-2 py-2 transition-all uppercase cursor-pointer"
                    title="Log in anonymously as a Guest Analyst"
                  >
                    GUEST
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Auth and Connection Error Banner */}
      {authError && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div className="bg-red-500/10 border border-red-500/30 p-4 text-xs text-red-400 flex items-start justify-between gap-3">
            <div className="flex gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <div>
                <p className="font-bold uppercase tracking-wider text-[10px]">Database Authentication Constraint</p>
                <p className="mt-1 leading-relaxed text-slate-300">
                  {authError}
                </p>
                <div className="mt-2 text-[9px] text-slate-500 leading-relaxed font-sans max-w-4xl space-y-1">
                  <p><strong>Recommended Next Steps:</strong></p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>
                      <strong>Enable Anonymous Sign-In:</strong> Go to your <a href={`https://console.firebase.google.com/project/${auth.app.options.projectId}/authentication/providers`} target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:underline font-bold">Firebase Console &rarr; Authentication &rarr; Sign-in method</a> and enable the <strong>Anonymous</strong> provider.
                    </li>
                    <li>
                      <strong>Google Sign-In Popup Support:</strong> Browsers block third-party popups inside iframes. To use Google Account sync, click the <strong>Open in New Tab</strong> button at the top-right corner of the screen and try again.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <button
              onClick={() => setAuthError(null)}
              className="text-slate-500 hover:text-white uppercase font-bold text-[9px] px-2 py-1 border border-slate-800 bg-[#14161C] cursor-pointer"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        
        {/* Topology Mode Banner */}
        <div className="bg-[#111318] border border-slate-800 p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 tracking-widest uppercase font-mono">
                SYSTEM TOPOLOGY
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                {systemMode === 'grid-tied' ? '⚡ GRID-TIED NET-METERED' : systemMode === 'hybrid' ? '🔋 HYBRID BATTERY + GRID' : '⛺ ISOLATED OFF-GRID'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-normal">
              {systemMode === 'grid-tied' 
                ? 'Solar power feeds directly into the household grid. Excess generation is exported back to the utility network. Phase-locked to utility line voltage.' 
                : systemMode === 'hybrid'
                ? 'Intelligent load matching with solar battery storage. Offsets household draw, charges batteries, and utilizes utility backup power dynamically.'
                : 'Completely isolated off-grid microgrid. Operates independently of utility operators. Matches local AC loads purely from solar generation and battery bank.'}
            </p>
          </div>
          <div className="flex bg-[#0A0B0D] border border-slate-800 p-1 rounded-none select-none shrink-0">
            <button
              onClick={() => updateSystemMode('grid-tied')}
              className={`px-3 py-2 text-[10px] font-mono font-bold transition-all flex items-center gap-1.5 uppercase cursor-pointer ${systemMode === 'grid-tied' ? 'bg-yellow-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              <Zap size={11} />
              GRID-TIED
            </button>
            <button
              onClick={() => updateSystemMode('hybrid')}
              className={`px-3 py-2 text-[10px] font-mono font-bold transition-all flex items-center gap-1.5 uppercase cursor-pointer ${systemMode === 'hybrid' ? 'bg-yellow-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              <TrendingUp size={11} />
              HYBRID
            </button>
            <button
              onClick={() => updateSystemMode('off-grid')}
              className={`px-3 py-2 text-[10px] font-mono font-bold transition-all flex items-center gap-1.5 uppercase cursor-pointer ${systemMode === 'off-grid' ? 'bg-yellow-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
            >
              <Sun size={11} />
              OFF-GRID
            </button>
          </div>
        </div>

        {/* Capacity configuration block */}
        {showConfig && (
          <div className="p-5 bg-[#111318] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#1A1C20] border border-slate-800 text-slate-400 mt-1">
                <ShieldCheck size={14} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">HARDWARE MATRIX RATING</h3>
                <p className="text-[10px] text-slate-500 uppercase mt-0.5">Configure PV panel rating limits for efficiency index scaling</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">Capacity Limit:</label>
              <div className="relative w-36">
                <input
                  type="number"
                  value={systemCapacityW}
                  onChange={(e) => updateSystemCapacity(Math.max(100, parseInt(e.target.value) || 0))}
                  className="w-full text-xs font-mono font-bold bg-[#1A1C20] text-white border border-slate-800 pl-3 pr-10 py-2 focus:outline-none focus:border-yellow-500"
                />
                <span className="absolute right-3 top-2.5 text-[9px] font-bold text-slate-500">W</span>
              </div>
              <button
                onClick={() => setShowConfig(false)}
                className="text-[10px] font-bold bg-yellow-500 hover:bg-yellow-400 text-slate-950 px-4 py-2 transition-all uppercase"
              >
                COMMIT
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Grid - Gauges and Summaries */}
        <div className={`grid grid-cols-1 ${systemMode === 'grid-tied' ? 'md:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'} gap-6`}>
          {/* Gauge 1: Solar input */}
          <MetricCard
            title="Solar panel production (DC)"
            value={latestLog ? latestLog.solarWatts.toLocaleString() : "0"}
            unit="W"
            icon={Sun}
            iconColor="text-yellow-500"
            iconBg="bg-yellow-500/10"
            description={latestLog ? `V: ${latestLog.solarVolts.toFixed(1)}V  ·  A: ${latestLog.solarAmps.toFixed(2)}A` : "NO READINGS REGISTERED"}
          >
            <div className="flex justify-between items-center text-[10px] text-slate-500">
              <span className="uppercase">PEAK DC PRODUCTION:</span>
              <span className="font-bold text-slate-200">{stats.peakSolarWatts.toLocaleString()} W</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1.5">
              <span className="uppercase">AVERAGE DC CURRENT:</span>
              <span className="font-bold text-slate-200">{stats.avgSolarWatts.toLocaleString()} W</span>
            </div>
          </MetricCard>

          {/* Gauge 2: Inverter Output */}
          <MetricCard
            title={systemMode === 'grid-tied' ? "Inverter Grid Output (AC)" : "Inverter Load Output (AC)"}
            value={latestLog ? latestLog.inverterWatts.toLocaleString() : "0"}
            unit="W"
            icon={Zap}
            iconColor="text-emerald-400"
            iconBg="bg-emerald-500/10"
            description={latestLog ? `V: ${latestLog.inverterVolts.toFixed(1)}V  ·  A: ${latestLog.inverterAmps.toFixed(2)}A` : "NO READINGS REGISTERED"}
          >
            <div className="flex justify-between items-center text-[10px] text-slate-500">
              <span className="uppercase">PEAK AC LOAD:</span>
              <span className="font-bold text-slate-200">{stats.peakInverterWatts.toLocaleString()} W</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1.5">
              <span className="uppercase">AVERAGE AC LOAD:</span>
              <span className="font-bold text-slate-200">{stats.avgInverterWatts.toLocaleString()} W</span>
            </div>
          </MetricCard>

          {/* Gauge 3: Efficiency Circular Gauge */}
          <EfficiencyGauge
            title="Inverter Conversion Efficiency"
            value={latestLog ? latestLog.efficiency : stats.avgEfficiency}
            lossW={latestLog ? latestLog.lossWatts : (logs.length > 0 ? Math.round(stats.totalLossWatts / logs.length) : 0)}
          />

          {/* Gauge 4: Battery Storage (Conditional for Hybrid/Off-Grid) */}
          {systemMode !== 'grid-tied' && (
            <MetricCard
              title="Battery Storage (LFP Bank)"
              value={latestLog?.batterySoC !== undefined ? `${latestLog.batterySoC}` : "72"}
              unit="%"
              icon={TrendingUp}
              iconColor="text-yellow-500"
              iconBg="bg-yellow-500/10"
              description={
                latestLog 
                  ? `BANK STATUS: ${latestLog.solarWatts > (latestLog.inverterWatts + 150) ? 'CHARGING' : latestLog.solarWatts < latestLog.inverterWatts ? 'DRAINING' : 'STANDBY'}`
                  : 'INTEGRATED 51.2V 100AH LiFePO4'
              }
            >
              <div className="w-full bg-slate-900 h-2 border border-slate-800 p-0.5 mt-2">
                <div 
                  className="bg-yellow-500 h-full transition-all duration-500"
                  style={{ width: `${latestLog?.batterySoC !== undefined ? latestLog.batterySoC : 72}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2">
                <span className="uppercase">BANK TEMP / HEALTH:</span>
                <span className="font-bold text-slate-200">28°C / 100% SOH</span>
              </div>
            </MetricCard>
          )}
        </div>

        {/* Environmental & Financial Impact Dashboard */}
        <div className="bg-[#111318]/50 border border-slate-800/80 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 gap-3">
            <div>
              <span className="text-[10px] font-bold text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-0.5 tracking-widest uppercase font-mono">
                SOLAR INVESTMENT YIELD
              </span>
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mt-1.5 flex items-center gap-2">
                🌱 Sustainability & Financial Offset Ledger
              </h3>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono">
              <span className="uppercase">ESTIMATED PAYBACK FACTOR:</span>
              <span className="font-bold text-slate-200 bg-[#1A1C20] border border-slate-800 px-2.5 py-1">{(totalKWh > 0 ? "ACTIVE CORRELATION" : "WAITING FOR GENERATION")}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Financial Savings Card */}
            <div className="bg-[#0A0B0D] border border-slate-800 p-5 flex flex-col justify-between h-full relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">SAVINGS REALIZED</span>
                  <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <DollarSign size={13} />
                  </div>
                </div>
                
                <div className="border-l-2 border-emerald-500 pl-4 py-1">
                  <p className="text-4xl sm:text-5xl font-mono font-light text-white tracking-tighter">
                    <span className="text-slate-500 text-2xl sm:text-3xl font-sans mr-0.5">$</span>
                    {(totalKWh * utilityRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase mt-2 tracking-wider font-mono">
                    Based on <span className="text-white font-bold">{totalKWh.toLocaleString()} kWh</span> of net-metered AC inversion.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 uppercase font-mono">EDIT LOCAL UTILITY RATE:</span>
                  <span className="font-bold text-yellow-500">${utilityRate.toFixed(2)} / kWh</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.60"
                  step="0.01"
                  value={utilityRate}
                  onChange={(e) => updateUtilityRate(parseFloat(e.target.value))}
                  className="w-full accent-yellow-500 bg-[#1A1C20] h-1.5 cursor-pointer border border-slate-800"
                />
                <div className="flex justify-between text-[8px] text-slate-600 font-mono">
                  <span>$0.05 (LOW)</span>
                  <span>$0.30 (US AVG)</span>
                  <span>$0.60 (PEAK/HAWAII)</span>
                </div>
              </div>
            </div>

            {/* Carbon Offset Card */}
            <div className="bg-[#0A0B0D] border border-slate-800 p-5 flex flex-col justify-between h-full relative overflow-hidden">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">CARBON MASS DEFLECTION</span>
                  <div className="p-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
                    <Leaf size={13} />
                  </div>
                </div>
                
                <div className="border-l-2 border-yellow-500 pl-4 py-1">
                  <p className="text-4xl sm:text-5xl font-mono font-light text-white tracking-tighter">
                    {(totalKWh * 0.39).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    <span className="text-lg sm:text-xl text-slate-500 ml-1.5 font-sans">KG CO₂</span>
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase mt-2 tracking-wider font-mono">
                    Equivalent to <span className="text-white font-bold">{(totalKWh * 0.39 * 2.20462).toLocaleString(undefined, { maximumFractionDigits: 1 })} LBS</span> of atmospheric greenhouse gas avoided.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80">
                <div className="flex items-center gap-3.5 bg-[#111318] border border-slate-800 p-3">
                  <div className="text-2xl select-none">🌳</div>
                  <div>
                    <div className="text-[10px] font-bold text-white uppercase tracking-wider">
                      {Math.max(0.1, Number((totalKWh * 0.39 / 21.8).toFixed(1)))} TREES DECLARED EQUIVALENT
                    </div>
                    <p className="text-[9px] text-slate-500 uppercase font-mono mt-0.5 leading-normal">
                      Equivalent 12-month carbon sequestration capacity of young pine tree seedlings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Empty state recommendation */}
        {logs.length === 0 && (
          <div className="p-6 bg-[#111318] border border-yellow-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="text-xl mt-0.5">ℹ️</span>
              <div>
                <h4 className="text-xs font-bold text-yellow-500 uppercase">EXPLORE INTERACTIVE TELEMETRY</h4>
                <p className="text-[10px] text-slate-400 leading-normal uppercase mt-0.5">
                  The local register database is empty. Provide telemetry values manually, or instantly populate 48 hours of simulated diurnal solar radiation curves to analyze live charts and AI summaries!
                </p>
              </div>
            </div>
            <button
              onClick={handleImportSeedLogs}
              disabled={seeding}
              className="text-[10px] font-bold bg-yellow-500 hover:bg-yellow-400 text-slate-950 px-5 py-2.5 flex items-center gap-2 transition-all shrink-0 cursor-pointer uppercase"
            >
              <Database size={12} className={seeding ? "animate-spin" : ""} />
              SEED SYSTEM HISTORY
            </button>
          </div>
        )}

        {/* Dynamic Section Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Log Form */}
          <div className="lg:col-span-4 h-fit">
            <InverterForm systemMode={systemMode} onAddLog={handleAddLog} />
            <div className="mt-6 p-4 bg-[#111318] border border-slate-800 flex items-start gap-2.5">
              <Info size={14} className="text-slate-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-[10px] font-bold text-slate-300 uppercase">Conversion Physics</h4>
                <p className="text-[9px] text-slate-500 uppercase leading-normal mt-1">
                  Inverters map high voltage Direct Current (DC) from solar arrays to standard domestic Alternating Current (AC) matching the utility grid. Conversion efficiency indicates minimal heat dissipation losses.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Charts and AI diagnostic */}
          <div className="lg:col-span-8 space-y-8">
            <AnalyticsCharts logs={logs} />
            <AIAnalyst logs={logs} systemCapacityW={systemCapacityW} />
          </div>

        </div>

        {/* ESP32 Hardware Specs and Firmware Console Section */}
        <div className="w-full">
          <HardwareIntegration />
        </div>

        {/* Logs Registry Table - Full Width */}
        <div className="w-full">
          <LogTable 
            logs={logs} 
            onDeleteLog={handleDeleteLog} 
            onClearLogs={handleClearLogs} 
          />
        </div>

      </main>
    </div>
  );
}
