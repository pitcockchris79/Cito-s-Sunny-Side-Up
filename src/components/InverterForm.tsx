import React, { useState, useEffect } from 'react';
import { LogEntry } from '../types';
import { Zap, Sun, PlusCircle, RefreshCw, Thermometer, Info } from 'lucide-react';

interface InverterFormProps {
  systemMode: 'grid-tied' | 'hybrid' | 'off-grid';
  onAddLog: (log: Omit<LogEntry, 'id' | 'timestamp'> & { timestamp?: string }) => void;
}

export const InverterForm: React.FC<InverterFormProps> = ({ systemMode, onAddLog }) => {
  // Solar Input DC
  const [solarVolts, setSolarVolts] = useState<string>('320');
  const [solarAmps, setSolarAmps] = useState<string>('8.2');
  
  // Inverter Output AC
  const [inverterVolts, setInverterVolts] = useState<string>('240');
  const [inverterAmps, setInverterAmps] = useState<string>('10.5');

  // Additional Fields
  const [panelTemp, setPanelTemp] = useState<string>('32');
  const [gridFreq, setGridFreq] = useState<string>('60.0');
  const [batterySoC, setBatterySoC] = useState<string>('80');
  const [weather, setWeather] = useState<LogEntry['weather']>('sunny');
  const [notes, setNotes] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('');

  // Dynamically calculated state
  const [solarWatts, setSolarWatts] = useState<number>(0);
  const [inverterWatts, setInverterWatts] = useState<number>(0);
  const [efficiency, setEfficiency] = useState<number>(0);
  const [lossWatts, setLossWatts] = useState<number>(0);

  // Auto-recalculate metrics on change
  useEffect(() => {
    const sv = parseFloat(solarVolts) || 0;
    const sa = parseFloat(solarAmps) || 0;
    const iv = parseFloat(inverterVolts) || 0;
    const ia = parseFloat(inverterAmps) || 0;

    const sW = Math.round(sv * sa);
    const iW = Math.round(iv * ia);
    const eff = sW > 0 ? Number(((iW / sW) * 100).toFixed(1)) : 0;
    const loss = sW - iW;

    setSolarWatts(sW);
    setInverterWatts(iW);
    setEfficiency(eff);
    setLossWatts(loss);
  }, [solarVolts, solarAmps, inverterVolts, inverterAmps]);

  // Fast presets for easy testing
  const applyPreset = (preset: 'midday' | 'cloudy' | 'evening' | 'battery_discharge') => {
    switch (preset) {
      case 'midday':
        setSolarVolts('335');
        setSolarAmps('9.6');
        setInverterVolts('241');
        setInverterAmps('12.8');
        setPanelTemp('45');
        setGridFreq('59.98');
        setWeather('sunny');
        setNotes('Peak solar performance, clean panels.');
        break;
      case 'cloudy':
        setSolarVolts('310');
        setSolarAmps('2.8');
        setInverterVolts('239');
        setInverterAmps('3.4');
        setPanelTemp('22');
        setGridFreq('60.01');
        setWeather('cloudy');
        setNotes('Passing altocumulus clouds.');
        break;
      case 'evening':
        setSolarVolts('120');
        setSolarAmps('0.5');
        setInverterVolts('240');
        setInverterAmps('0.2');
        setPanelTemp('16');
        setGridFreq('60.00');
        setWeather('overcast');
        setNotes('Sunset decline, standby current.');
        break;
      case 'battery_discharge':
        setSolarVolts('315');
        setSolarAmps('4.2');
        setInverterVolts('240');
        setInverterAmps('9.8');
        setPanelTemp('28');
        setGridFreq('59.96');
        setWeather('shaded');
        setNotes('Hybrid inverter drawing battery backup to meet grid load.');
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const sv = parseFloat(solarVolts);
    const sa = parseFloat(solarAmps);
    const iv = parseFloat(inverterVolts);
    const ia = parseFloat(inverterAmps);

    if (isNaN(sv) || isNaN(sa) || isNaN(iv) || isNaN(ia)) {
      alert("Please check that Volts and Amps contain valid numbers.");
      return;
    }

    onAddLog({
      solarVolts: sv,
      solarAmps: sa,
      solarWatts,
      inverterVolts: iv,
      inverterAmps: ia,
      inverterWatts,
      efficiency,
      lossWatts,
      panelTemp: panelTemp ? parseFloat(panelTemp) : undefined,
      gridFreq: (systemMode !== 'off-grid' && gridFreq) ? parseFloat(gridFreq) : undefined,
      batterySoC: (systemMode !== 'grid-tied' && batterySoC) ? parseFloat(batterySoC) : undefined,
      systemMode,
      weather,
      notes: notes.trim() || undefined,
      timestamp: customTime ? new Date(customTime).toISOString() : undefined
    });

    // Reset notes and customTime after log
    setNotes('');
    setCustomTime('');
  };

  return (
    <div className="bg-[#111318] border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800/80">
        <div>
          <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
            <PlusCircle size={16} className="text-yellow-500" />
            Telemetry Input Console
          </h2>
          <p className="text-[10px] text-slate-500 uppercase font-mono mt-0.5">MANUAL REGISTER RECORDING</p>
        </div>
      </div>

      {/* Preset Selectors */}
      <div className="mb-5">
        <label className="text-[9px] font-bold text-slate-500 tracking-wider uppercase block mb-2">
          LOAD PRESET STATES
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => applyPreset('midday')}
            className="text-[10px] bg-[#1A1C20] text-yellow-500 hover:bg-slate-800 border border-slate-800/80 font-mono font-bold px-2.5 py-1.5 transition-all"
          >
            ☀️ PEAK MIDDAY
          </button>
          <button
            type="button"
            onClick={() => applyPreset('cloudy')}
            className="text-[10px] bg-[#1A1C20] text-slate-300 hover:bg-slate-800 border border-slate-800/80 font-mono font-bold px-2.5 py-1.5 transition-all"
          >
            ⛅ CLOUDY PASS
          </button>
          <button
            type="button"
            onClick={() => applyPreset('evening')}
            className="text-[10px] bg-[#1A1C20] text-indigo-400 hover:bg-slate-800 border border-slate-800/80 font-mono font-bold px-2.5 py-1.5 transition-all"
          >
            🌆 SUNSET DECLINE
          </button>
          <button
            type="button"
            onClick={() => applyPreset('battery_discharge')}
            className="text-[10px] bg-[#1A1C20] text-emerald-400 hover:bg-slate-800 border border-slate-800/80 font-mono font-bold px-2.5 py-1.5 transition-all"
          >
            🔋 HYBRID BATT
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Solar Input */}
        <div className="p-4 bg-[#1A1C20] border border-slate-800">
          <h3 className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest mb-3 flex items-center gap-1">
            <Sun size={12} /> PV ARRAY INPUT (DC)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">Voltage DC</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={solarVolts}
                  onChange={(e) => setSolarVolts(e.target.value)}
                  className="w-full text-xs font-mono font-bold bg-[#111318] text-white border border-slate-800 rounded-none pl-3 pr-8 py-2 focus:outline-none focus:border-yellow-500 transition-all"
                />
                <span className="absolute right-3 top-2 text-xxs font-mono font-bold text-slate-600">VDC</span>
              </div>
            </div>
            <div>
              <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">Current DC</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={solarAmps}
                  onChange={(e) => setSolarAmps(e.target.value)}
                  className="w-full text-xs font-mono font-bold bg-[#111318] text-white border border-slate-800 rounded-none pl-3 pr-8 py-2 focus:outline-none focus:border-yellow-500 transition-all"
                />
                <span className="absolute right-3 top-2 text-xxs font-mono font-bold text-slate-600">ADC</span>
              </div>
            </div>
          </div>
          <div className="mt-3 text-[10px] font-mono text-slate-400 flex justify-between bg-[#111318]/50 border border-slate-800/40 px-3 py-1.5">
            <span className="uppercase text-slate-500 font-bold">Calculated PV Input:</span>
            <span className="font-bold text-yellow-500">{solarWatts.toLocaleString()} W</span>
          </div>
        </div>

        {/* Row 2: Inverter Output */}
        <div className="p-4 bg-[#1A1C20] border border-slate-800">
          <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-1">
            <Zap size={12} /> INVERTER LOAD (AC)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">Voltage AC</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={inverterVolts}
                  onChange={(e) => setInverterVolts(e.target.value)}
                  className="w-full text-xs font-mono font-bold bg-[#111318] text-white border border-slate-800 rounded-none pl-3 pr-8 py-2 focus:outline-none focus:border-emerald-500 transition-all"
                />
                <span className="absolute right-3 top-2 text-xxs font-mono font-bold text-slate-600">VAC</span>
              </div>
            </div>
            <div>
              <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">Current AC</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={inverterAmps}
                  onChange={(e) => setInverterAmps(e.target.value)}
                  className="w-full text-xs font-mono font-bold bg-[#111318] text-white border border-slate-800 rounded-none pl-3 pr-8 py-2 focus:outline-none focus:border-emerald-500 transition-all"
                />
                <span className="absolute right-3 top-2 text-xxs font-mono font-bold text-slate-600">AAC</span>
              </div>
            </div>
          </div>
          <div className="mt-3 text-[10px] font-mono text-slate-400 flex justify-between bg-[#111318]/50 border border-slate-800/40 px-3 py-1.5">
            <span className="uppercase text-slate-500 font-bold">Calculated AC Load:</span>
            <span className="font-bold text-emerald-400">{inverterWatts.toLocaleString()} W</span>
          </div>
        </div>

        {/* Real-time calculated efficiency previews */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-[#1A1C20] border border-slate-800 font-mono">
          <div>
            <span className="text-[8px] font-bold text-slate-500 block uppercase">Conversion Ratio</span>
            <span className={`text-sm font-bold ${efficiency > 90 ? 'text-emerald-400' : 'text-yellow-500'}`}>
              {efficiency.toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-[8px] font-bold text-slate-500 block uppercase">Thermal Loss</span>
            <span className="text-sm font-bold text-rose-400">
              {lossWatts > 0 ? `${lossWatts} W` : '0 W'}
            </span>
          </div>
          {lossWatts < 0 && (
            <div className="col-span-2 text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-1 flex items-center gap-1.5 mt-1">
              <Info size={11} /> BATTERY CHARGE OR DISCHARGE DETECTED
            </div>
          )}
        </div>

        {/* Additional Optional Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">Cell Temp</label>
            <div className="relative">
              <input
                type="number"
                step="1"
                value={panelTemp}
                onChange={(e) => setPanelTemp(e.target.value)}
                placeholder="Temp"
                className="w-full text-xs font-mono bg-[#1A1C20] text-white border border-slate-800 rounded-none pl-3 pr-8 py-2 focus:outline-none focus:border-slate-500"
              />
              <span className="absolute right-3 top-2 text-xxs font-mono text-slate-600">°C</span>
            </div>
          </div>

          {systemMode !== 'off-grid' && (
            <div>
              <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">Grid Freq</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={gridFreq}
                  onChange={(e) => setGridFreq(e.target.value)}
                  placeholder="60.0"
                  className="w-full text-xs font-mono bg-[#1A1C20] text-white border border-slate-800 rounded-none pl-3 pr-8 py-2 focus:outline-none focus:border-slate-500"
                />
                <span className="absolute right-3 top-2 text-xxs font-mono text-slate-600">HZ</span>
              </div>
            </div>
          )}

          {systemMode !== 'grid-tied' && (
            <div className={systemMode === 'off-grid' ? "col-span-1" : "col-span-2"}>
              <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">Battery State of Charge (SoC)</label>
              <div className="flex items-center gap-3 bg-[#111318] border border-slate-800 px-3 py-1.5">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={batterySoC}
                  onChange={(e) => setBatterySoC(e.target.value)}
                  className="flex-1 accent-yellow-500 bg-slate-900 h-1.5 cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-yellow-500 w-10 text-right">{batterySoC}%</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">Sky Conditions</label>
            <select
              value={weather}
              onChange={(e) => setWeather(e.target.value as LogEntry['weather'])}
              className="w-full text-xs bg-[#1A1C20] text-slate-300 border border-slate-800 rounded-none px-3 py-2 focus:outline-none focus:border-slate-500"
            >
              <option value="sunny">☀️ Sunny / Clear</option>
              <option value="cloudy">⛅ Partly Cloudy</option>
              <option value="overcast">☁️ Overcast / Gray</option>
              <option value="rainy">🌧️ Rainy</option>
              <option value="shaded">🌳 Tree Shade / Obstruction</option>
              <option value="unknown">❔ Unspecified</option>
            </select>
          </div>

          <div>
            <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">Log Date Override</label>
            <input
              type="datetime-local"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="w-full text-xs bg-[#1A1C20] text-slate-300 border border-slate-800 rounded-none px-2 py-1.5 focus:outline-none focus:border-slate-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">System Log Comments</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cleaned panels, load matching checks..."
            rows={2}
            className="w-full text-xs bg-[#1A1C20] text-slate-300 border border-slate-800 rounded-none px-3 py-2 focus:outline-none focus:border-slate-500 placeholder:text-slate-600"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-mono font-extrabold py-2.5 flex items-center justify-center gap-2 cursor-pointer uppercase transition-all tracking-wider text-xs"
        >
          <PlusCircle size={14} />
          WRITE REGISTER ENTRY
        </button>
      </form>
    </div>
  );
};
