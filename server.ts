import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const ai = process.env.GEMINI_API_KEY 
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    })
  : null;

// Generate realistic seed data for the last 48 hours to give the app immediate high-fidelity visualization
const generateSeedData = () => {
  const seedLogs = [];
  const now = new Date();
  
  // Weather profiles for seed data
  const weatherProfiles = [
    { weather: 'sunny', tempCoeff: 1.0, cloudAtten: 1.0 },
    { weather: 'cloudy', tempCoeff: 0.9, cloudAtten: 0.4 },
    { weather: 'overcast', tempCoeff: 0.8, cloudAtten: 0.15 },
    { weather: 'rainy', tempCoeff: 0.7, cloudAtten: 0.08 },
    { weather: 'shaded', tempCoeff: 0.9, cloudAtten: 0.3 }
  ];

  // Helper to generate logs for a specific day
  const createDayLogs = (daysAgo: number, weatherType: 'sunny' | 'cloudy' | 'overcast') => {
    const profile = weatherProfiles.find(p => p.weather === weatherType) || weatherProfiles[0];
    const logs = [];

    // Daylight hours from 6:00 (6 AM) to 19:00 (7 PM)
    for (let hour = 6; hour <= 19; hour++) {
      const logDate = new Date(now);
      logDate.setDate(now.getDate() - daysAgo);
      logDate.setHours(hour, 0, 0, 0);

      // Normal solar curve factor (bell shape peaking at 13:00)
      const hourOffset = hour - 13; // peak at 13:00
      const solarFactor = Math.max(0, Math.exp(-Math.pow(hourOffset, 2) / 14)); // bell-curve width factor

      if (solarFactor === 0) continue;

      // Base specs: 4000W Max DC Panel Array
      // Max Volts DC = 380V, Max Amps DC = 10.5A
      const baseVolts = 320; // nominal voltage
      const voltageFluc = (Math.sin(hour / 2) * 15) + (Math.random() * 5); // fluctuations
      const solarVolts = Math.round(baseVolts + voltageFluc);

      // Amps follow solar factor, attenuated by weather/cloud profile
      const maxAmps = 10.5;
      const baseAmps = maxAmps * solarFactor * profile.cloudAtten;
      const ampsFluc = (Math.random() * 0.4) - 0.2;
      const solarAmps = Math.max(0.1, Math.round((baseAmps + ampsFluc) * 100) / 100);

      // DC Power (Watts In)
      const solarWatts = Math.round(solarVolts * solarAmps);

      // Inverter Conversion Efficiency (usually 94% - 97.5% for high quality)
      // Efficiency is lower at very low loads or extremely high temperatures
      const baseEff = 96.2; // 96.2% efficiency
      // Drop efficiency slightly as panelTemp rises (panelTemp rises near midday)
      const tempFactor = hour >= 11 && hour <= 15 ? 1.5 : 0.5;
      const efficiency = Number((baseEff - tempFactor - (Math.random() * 0.8)).toFixed(1));

      const inverterWatts = Math.round(solarWatts * (efficiency / 100));
      
      // Inverter AC output usually regulated to standard utility volts (e.g., 240V split-phase AC)
      const inverterVolts = Math.round(240 + (Math.sin(hour / 4) * 3) + (Math.random() * 1.5));
      const inverterAmps = Math.max(0.1, Math.round((inverterWatts / inverterVolts) * 100) / 100);

      // Dynamic variables
      const ambientTemp = 18 + Math.sin((hour - 8) / 3) * 8; // daily temp curve
      const panelTemp = Math.round(ambientTemp + (solarFactor * 25 * profile.cloudAtten)); // panels get hot under direct sun
      const gridFreq = Number((59.95 + (Math.random() * 0.1)).toFixed(2)); // grid stability around 60Hz

      logs.push({
        id: `seed-${daysAgo}-${hour}`,
        timestamp: logDate.toISOString(),
        solarVolts,
        solarAmps,
        solarWatts,
        inverterVolts,
        inverterAmps,
        inverterWatts,
        efficiency,
        lossWatts: solarWatts - inverterWatts,
        panelTemp,
        gridFreq,
        weather: weatherType,
        notes: hour === 13 && daysAgo === 1 ? "Peak solar production under clear skies." : ""
      });
    }
    return logs;
  };

  // Build a 2-day historical dataset
  // Day 1 (yesterday): Sunny day
  // Day 2 (today): Partially cloudy day
  const yesterdayLogs = createDayLogs(1, 'sunny');
  const todayLogs = createDayLogs(0, 'cloudy');

  return [...yesterdayLogs, ...todayLogs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
};

// Seed endpoint
app.get("/api/seed-logs", (req, res) => {
  try {
    const seedData = generateSeedData();
    res.json({ logs: seedData });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate seed logs." });
  }
});

// AI analysis endpoint using Gemini
app.post("/api/analyze-performance", async (req, res) => {
  try {
    const { logs, systemCapacityW } = req.body;

    if (!ai) {
      return res.status(400).json({ 
        error: "Gemini API Key is not configured. Please add your GEMINI_API_KEY in the Secrets panel." 
      });
    }

    if (!logs || !Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ error: "No log records provided for performance analysis." });
    }

    // Format logs into a dense summary for Gemini to save tokens and optimize latency
    const recentLogs = logs.slice(-50); // Analyze up to 50 logs
    const summaryData = recentLogs.map(l => ({
      time: new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date(l.timestamp).toLocaleDateString([], { month: 'short', day: '2-digit' }),
      mode: l.systemMode || "grid-tied",
      battSoC: l.batterySoC !== undefined ? `${l.batterySoC}%` : "N/A",
      dc_V: l.solarVolts,
      dc_A: l.solarAmps,
      dc_W: l.solarWatts,
      ac_V: l.inverterVolts,
      ac_A: l.inverterAmps,
      ac_W: l.inverterWatts,
      eff: l.efficiency,
      loss: l.lossWatts,
      temp: l.panelTemp,
      weather: l.weather,
      notes: l.notes || ""
    }));

    // Calculate aggregated metrics for the AI prompt
    const totalInputW = logs.reduce((sum, l) => sum + l.solarWatts, 0);
    const totalOutputW = logs.reduce((sum, l) => sum + l.inverterWatts, 0);
    const avgEff = logs.reduce((sum, l) => sum + l.efficiency, 0) / logs.length;
    const peakDC = Math.max(...logs.map(l => l.solarWatts));
    const peakAC = Math.max(...logs.map(l => l.inverterWatts));
    const avgLoss = logs.reduce((sum, l) => sum + l.lossWatts, 0) / logs.length;

    const weatherCounts = logs.reduce((acc: any, l) => {
      acc[l.weather || 'unknown'] = (acc[l.weather || 'unknown'] || 0) + 1;
      return acc;
    }, {});

    const modeCounts = logs.reduce((acc: any, l) => {
      const mode = l.systemMode || 'grid-tied';
      acc[mode] = (acc[mode] || 0) + 1;
      return acc;
    }, {});

    const batteryLogs = logs.filter(l => l.batterySoC !== undefined);
    const avgBatterySoC = batteryLogs.length > 0
      ? (batteryLogs.reduce((sum, l) => sum + (l.batterySoC || 0), 0) / batteryLogs.length).toFixed(1) + "%"
      : "N/A";

    const prompt = `
You are an expert solar power engineer, inverter hardware diagnostic tool, and system consultant.
Analyze the following solar installation logs. The system has an estimated DC solar capacity of ${systemCapacityW || 4000} Watts.

Aggregated Metrics:
- Total Log Entries: ${logs.length}
- Average DC Solar Power Input: ${(totalInputW / logs.length).toFixed(1)} W
- Average AC Inverter Power Output: ${(totalOutputW / logs.length).toFixed(1)} W
- Calculated Average Inverter Efficiency: ${avgEff.toFixed(1)}%
- Peak Solar Array DC Power: ${peakDC} W
- Peak Inverter AC Power Output: ${peakAC} W
- Average System Power Loss: ${avgLoss.toFixed(1)} W
- Weather conditions recorded: ${JSON.stringify(weatherCounts)}
- System modes recorded: ${JSON.stringify(modeCounts)}
- Average Battery State of Charge (SoC): ${avgBatterySoC}

Detailed Log Entries (recent samples):
${JSON.stringify(summaryData, null, 2)}

Provide a highly professional, expert-level, and visually structured solar health diagnostic report in clean Markdown format with the following sections:

### 1. 📊 System Performance Executive Summary
Provide a high-level summary of the overall health of the system. Compare performance across the logged system modes (such as off-grid, hybrid, and grid-tied). Note whether conversion levels look normal and whether generation curves conform to expected patterns.

### 2. ⚡ Inverter Efficiency & Mode Diagnostic
Explain the conversion efficiency metrics. Note if the average efficiency (${avgEff.toFixed(1)}%) is optimal for typical string/micro-inverters (optimal is usually 94%-98%). 
Detail how the inverter behaves during different system topologies:
- Grid-tied: Power feedback directly into the public grid.
- Hybrid: Energy management buffer, battery charging/discharging loops.
- Off-grid: Independent standalone behavior, lack of grid frequency locking, and load limits.
Analyze if efficiency changes under high loads, elevated panel/ambient temperatures, or low-voltage start-ups. Look for thermal throttling or inverter clipping.

### 3. 🔍 Anomalies, Batteries & Bottlenecks
Identify potential issues if any exist (such as: excessive conversion losses, sub-optimal voltage thresholds, battery over-discharge risks, potential shading patterns, dirty panels causing reduced current, or grid voltage instability). Be highly specific based on the data points.

### 4. 💡 Actionable Optimization Recommendations
Provide 3-4 highly specific and actionable recommendations to improve performance, maintain battery health (if SoC is present), or optimize energy usage. Mention cleaning, venting, load shifting (running heavy loads during peak generation), or physical adjustments (tilt/azimuth).

Keep your language clear, encouraging, and authoritative. Do not use generic placeholders.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are Sunny Side Up, a smart AI diagnostic engineer for solar energy systems and grid-tie/hybrid inverters.",
        temperature: 0.7,
      }
    });

    res.json({
      timestamp: new Date().toISOString(),
      report: response.text || "No analysis generated. Please check your data and try again."
    });

  } catch (err: any) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate AI performance report." });
  }
});

// Vite middleware setup or production static files serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Solar Logger Server running on port ${PORT}`);
  });
}

startServer();
