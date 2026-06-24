import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { LogEntry } from '../types';
import { TrendingUp, Activity, Info } from 'lucide-react';

interface AnalyticsChartsProps {
  logs: LogEntry[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ logs }) => {
  // Format logs for display in the charts (sort chronological first)
  const chartData = React.useMemo(() => {
    return [...logs]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(log => {
        const d = new Date(log.timestamp);
        return {
          ...log,
          // Hourly formatted label
          label: d.toLocaleDateString([], { month: 'short', day: '2-digit' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          shortTime: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          // Enforce raw numbers
          "Solar Input (DC W)": log.solarWatts,
          "Inverter Output (AC W)": log.inverterWatts,
          "Efficiency (%)": Number(log.efficiency.toFixed(1)),
          "Panel Temp (°C)": log.panelTemp || 0,
        };
      });
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div className="bg-[#111318] border border-slate-800 p-6 h-full flex flex-col items-center justify-center py-20 font-mono">
        <div className="p-3 bg-[#1A1C20] border border-slate-800 text-slate-500 rounded-none mb-3">
          <Activity size={20} />
        </div>
        <p className="text-xs font-bold text-white uppercase tracking-widest">Analytics Charts Offline</p>
        <p className="text-[10px] text-slate-500 mt-1.5 max-w-xs text-center font-mono uppercase leading-normal">
          Interactive conversion graphs will populate as soon as register samples are written to the database.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono">
      {/* Chart 1: Power Envelope */}
      <div className="bg-[#111318] border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp size={14} className="text-yellow-500" />
              Power Conversion Envelope (DC Input vs AC Load)
            </h3>
            <p className="text-[10px] text-slate-500 uppercase mt-1">
              Wattage correlation between panel array generation and inverter load grid transmission
            </p>
          </div>
        </div>

        <div className="w-full h-80 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="colorInverter" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" strokeOpacity={0.4} />
              <XAxis 
                dataKey="shortTime" 
                stroke="#475569" 
                fontSize={9} 
                tickLine={false} 
                style={{ fontFamily: 'monospace' }}
              />
              <YAxis 
                stroke="#475569" 
                fontSize={9} 
                tickLine={false} 
                unit="W" 
                style={{ fontFamily: 'monospace' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#111318', 
                  borderRadius: '0px', 
                  border: '1px solid #334155',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: '#f8fafc'
                }}
                labelStyle={{ fontWeight: 'bold', color: '#94a3b8' }}
              />
              <Legend verticalAlign="top" height={36} iconType="square" wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', color: '#94a3b8' }} />
              <Area 
                type="monotone" 
                dataKey="Solar Input (DC W)" 
                stroke="#eab308" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorSolar)" 
              />
              <Area 
                type="monotone" 
                dataKey="Inverter Output (AC W)" 
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorInverter)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Efficiency Profile & Temp Correlation */}
      <div className="bg-[#111318] border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
              <Activity size={14} className="text-emerald-400" />
              Conversion Ratio vs Array Temperature Correlation
            </h3>
            <p className="text-[10px] text-slate-500 uppercase mt-1">
              Cross-referencing real-time inversion ratio against solar panel temperature coefficients
            </p>
          </div>
        </div>

        <div className="w-full h-80 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: -10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" strokeOpacity={0.4} />
              <XAxis 
                dataKey="shortTime" 
                stroke="#475569" 
                fontSize={9} 
                tickLine={false} 
                style={{ fontFamily: 'monospace' }}
              />
              {/* Primary Y Axis for Efficiency */}
              <YAxis 
                yAxisId="left"
                stroke="#10b981" 
                fontSize={9} 
                tickLine={false} 
                domain={[70, 100]}
                unit="%" 
                style={{ fontFamily: 'monospace' }}
              />
              {/* Secondary Y Axis for Temperature */}
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#f43f5e" 
                fontSize={9} 
                tickLine={false} 
                domain={[0, 'auto']}
                unit="°C" 
                style={{ fontFamily: 'monospace' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#111318', 
                  borderRadius: '0px', 
                  border: '1px solid #334155',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: '#f8fafc'
                }}
                labelStyle={{ fontWeight: 'bold', color: '#94a3b8' }}
              />
              <Legend verticalAlign="top" height={36} iconType="square" wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', color: '#94a3b8' }} />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="Efficiency (%)" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="Panel Temp (°C)" 
                stroke="#f43f5e" 
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={{ r: 1 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 p-3.5 bg-[#1A1C20] border border-slate-800/80 flex items-start gap-2.5">
          <Info size={14} className="text-slate-500 mt-0.5 shrink-0" />
          <p className="text-[10px] text-slate-400 uppercase font-mono leading-normal">
            <strong>HARDWARE RATING MEMO:</strong> Photovoltaic performance decays as panel array temperature spikes. This register logs heat coefficients to detect efficiency degradation or convection faults on active heat sinks.
          </p>
        </div>
      </div>
    </div>
  );
};
