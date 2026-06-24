export interface LogEntry {
  id: string;
  timestamp: string; // ISO 8601 string or date time string
  
  // Solar Panel Input (DC)
  solarVolts: number;
  solarAmps: number;
  solarWatts: number; // V * A
  
  // Inverter Output (AC)
  inverterVolts: number;
  inverterAmps: number;
  inverterWatts: number; // V * A
  
  // Calculated metrics
  efficiency: number; // (inverterWatts / solarWatts) * 100
  lossWatts: number; // solarWatts - inverterWatts
  
  // Additional system conditions
  panelTemp?: number; // °C
  gridFreq?: number; // Hz (usually 50 or 60)
  batterySoC?: number; // State of charge in % (optional)
  systemMode?: 'grid-tied' | 'hybrid' | 'off-grid';
  weather?: 'sunny' | 'cloudy' | 'overcast' | 'rainy' | 'shaded' | 'unknown';
  notes?: string;
  userId?: string;
}

export interface InverterStats {
  totalLogs: number;
  avgSolarWatts: number;
  avgInverterWatts: number;
  avgEfficiency: number;
  peakSolarWatts: number;
  peakInverterWatts: number;
  peakSolarAmps: number;
  peakInverterAmps: number;
  totalLossWatts: number;
}

export interface AIAnalysisReport {
  timestamp: string;
  report: string;
}
