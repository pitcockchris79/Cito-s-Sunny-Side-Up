import React, { useState, useMemo } from 'react';
import { LogEntry } from '../types';
import { Trash2, Search, Filter, ArrowUpDown, CloudSun, Calendar, HelpCircle } from 'lucide-react';

interface LogTableProps {
  logs: LogEntry[];
  onDeleteLog: (id: string) => void;
  onClearLogs: () => void;
}

type SortField = 'timestamp' | 'efficiency' | 'solarWatts' | 'inverterWatts';
type SortOrder = 'asc' | 'desc';

export const LogTable: React.FC<LogTableProps> = ({ logs, onDeleteLog, onClearLogs }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [weatherFilter, setWeatherFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Sorting handlers
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Weather icons helper
  const getWeatherEmoji = (weather?: string) => {
    switch (weather) {
      case 'sunny': return '☀️';
      case 'cloudy': return '⛅';
      case 'overcast': return '☁️';
      case 'rainy': return '🌧️';
      case 'shaded': return '🌳';
      default: return '❔';
    }
  };

  // Weather badge colors
  const getWeatherBadgeClass = (weather?: string) => {
    switch (weather) {
      case 'sunny': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'cloudy': return 'bg-slate-500/10 text-slate-300 border-slate-800';
      case 'overcast': return 'bg-indigo-500/10 text-indigo-300 border-indigo-950/40';
      case 'rainy': return 'bg-blue-500/10 text-blue-400 border-blue-950/40';
      case 'shaded': return 'bg-emerald-500/10 text-emerald-400 border-emerald-950/40';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-800';
    }
  };

  // Efficiency badge colors
  const getEfficiencyBadgeClass = (eff: number) => {
    if (eff >= 95) return 'bg-emerald-500/10 text-emerald-400 border-emerald-900/30 font-bold';
    if (eff >= 90) return 'bg-blue-500/10 text-blue-400 border-blue-900/30';
    if (eff >= 80) return 'bg-yellow-500/10 text-yellow-500 border-yellow-900/30';
    return 'bg-rose-500/10 text-rose-400 border-rose-900/30';
  };

  // Filtering and sorting logic
  const processedLogs = useMemo(() => {
    let result = [...logs];

    // Filter by Weather
    if (weatherFilter !== 'all') {
      result = result.filter(log => log.weather === weatherFilter);
    }

    // Filter by Search text (notes, volts, amps, etc.)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(log => 
        (log.notes && log.notes.toLowerCase().includes(q)) ||
        log.solarWatts.toString().includes(q) ||
        log.inverterWatts.toString().includes(q) ||
        new Date(log.timestamp).toLocaleString().toLowerCase().includes(q)
      );
    }

    // Sort logs
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'timestamp') {
        valA = new Date(a.timestamp).getTime();
        valB = new Date(b.timestamp).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [logs, weatherFilter, searchQuery, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(processedLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [processedLogs, currentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="bg-[#111318] border border-slate-800 p-6 overflow-hidden">
      {/* Table Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-800/80">
        <div>
          <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
            <Calendar size={16} className="text-slate-400" />
            Telemetry Register Index
          </h2>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase">
            Viewing {processedLogs.length} of {logs.length} logged inverter samples
          </p>
        </div>

        {logs.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm("Are you absolutely sure you want to delete ALL logged readings? This cannot be undone.")) {
                onClearLogs();
              }
            }}
            className="text-[10px] font-mono font-bold text-rose-400 hover:text-rose-300 bg-rose-950/10 hover:bg-rose-950/30 border border-rose-900/50 px-3.5 py-2 transition-all cursor-pointer uppercase self-start md:self-auto"
          >
            Purge System Database
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-5">
        <div className="md:col-span-6 relative">
          <span className="absolute left-3.5 top-3 text-slate-500">
            <Search size={14} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="FILTER REGISTER BY SPEC, VOLTS, NOTES..."
            className="w-full text-xs bg-[#1A1C20] border border-slate-800 text-white placeholder:text-slate-600 pl-10 pr-4 py-2.5 focus:outline-none focus:border-yellow-500 font-mono uppercase"
          />
        </div>

        <div className="md:col-span-3 relative">
          <span className="absolute left-3 top-3 text-slate-500">
            <Filter size={14} />
          </span>
          <select
            value={weatherFilter}
            onChange={(e) => { setWeatherFilter(e.target.value); setCurrentPage(1); }}
            className="w-full text-xs bg-[#1A1C20] border border-slate-800 text-slate-300 pl-9 pr-3 py-2.5 focus:outline-none focus:border-yellow-500 font-mono"
          >
            <option value="all">☁️ ALL CONDITIONS</option>
            <option value="sunny">☀️ SUNNY DAY</option>
            <option value="cloudy">⛅ PARTLY CLOUDY</option>
            <option value="overcast">☁️ OVERCAST / GRAY</option>
            <option value="rainy">🌧️ RAINY WEATHER</option>
            <option value="shaded">🌳 OBSTRUCTED SHADE</option>
          </select>
        </div>

        <div className="md:col-span-3 flex gap-1 bg-[#1A1C20] p-1 border border-slate-800">
          <button
            onClick={() => handleSort('timestamp')}
            className={`flex-1 text-[9px] font-mono py-1.5 font-bold flex items-center justify-center gap-1.5 transition-all uppercase ${sortField === 'timestamp' ? 'bg-[#111318] text-yellow-500 border border-slate-800' : 'text-slate-500 hover:text-slate-400'}`}
          >
            DATE {sortField === 'timestamp' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSort('efficiency')}
            className={`flex-1 text-[9px] font-mono py-1.5 font-bold flex items-center justify-center gap-1.5 transition-all uppercase ${sortField === 'efficiency' ? 'bg-[#111318] text-yellow-500 border border-slate-800' : 'text-slate-500 hover:text-slate-400'}`}
          >
            EFF {sortField === 'efficiency' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {/* Grid Table Container */}
      <div className="overflow-x-auto -mx-6 px-6">
        {paginatedLogs.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center border border-dashed border-slate-800 bg-[#1A1C20]/55 p-6">
            <div className="p-3.5 bg-[#111318] border border-slate-800 text-slate-500 rounded-full mb-3">
              <CloudSun size={24} />
            </div>
            <p className="text-xs font-mono font-bold text-slate-300 uppercase">NO REGISTER LOGS FOUND</p>
            <p className="text-[10px] text-slate-500 mt-1.5 max-w-xs text-center font-mono leading-normal uppercase">
              No matching records exist. Clear filters or add a manual log entry.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[800px] border-collapse text-left font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                <th className="py-3 px-4 font-bold">TIMESTAMP</th>
                <th className="py-3 px-4 font-bold">ATMOSPHERE</th>
                <th className="py-3 px-4 cursor-pointer hover:text-slate-300 font-bold" onClick={() => handleSort('solarWatts')}>
                  DC INPUT <ArrowUpDown size={10} className="inline ml-0.5 text-slate-600" />
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-slate-300 font-bold" onClick={() => handleSort('inverterWatts')}>
                  AC LOAD <ArrowUpDown size={10} className="inline ml-0.5 text-slate-600" />
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-slate-300 font-bold" onClick={() => handleSort('efficiency')}>
                  CONVERSION <ArrowUpDown size={10} className="inline ml-0.5 text-slate-600" />
                </th>
                <th className="py-3 px-4 font-bold">SPECS</th>
                <th className="py-3 px-4 max-w-[200px] font-bold">REGISTER NOTES</th>
                <th className="py-3 px-4 text-right font-bold">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-[11px] text-slate-400">
              {paginatedLogs.map((log) => {
                const dateObj = new Date(log.timestamp);
                const formattedDate = dateObj.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' });
                const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return (
                  <tr key={log.id} className="hover:bg-[#1A1C20]/40 transition-all border-b border-slate-800/30">
                    {/* Timestamp */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-200">{formattedTime}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5 uppercase">{formattedDate}</div>
                    </td>

                    {/* Condition */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 border text-[9px] font-bold uppercase tracking-wide ${getWeatherBadgeClass(log.weather)}`}>
                        <span>{getWeatherEmoji(log.weather)}</span>
                        <span>{log.weather}</span>
                      </span>
                    </td>

                    {/* Solar DC */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-yellow-500">{log.solarWatts.toLocaleString()} W</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        {log.solarVolts.toFixed(1)}V · {log.solarAmps.toFixed(2)}A
                      </div>
                    </td>

                    {/* Inverter AC */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-emerald-400">{log.inverterWatts.toLocaleString()} W</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        {log.inverterVolts.toFixed(1)}V · {log.inverterAmps.toFixed(2)}A
                      </div>
                    </td>

                    {/* Efficiency */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-1.5 py-0.5 border font-bold ${getEfficiencyBadgeClass(log.efficiency)}`}>
                        {log.efficiency.toFixed(1)}%
                      </span>
                    </td>

                    {/* System specs */}
                    <td className="py-3 px-4">
                      <div className="text-slate-500 flex flex-col gap-0.5 text-[10px]">
                        {log.systemMode && (
                          <span className="text-[9px] font-bold text-yellow-500 uppercase tracking-widest">{log.systemMode}</span>
                        )}
                        {log.panelTemp !== undefined && (
                          <span>CEL: <span className="text-slate-300 font-bold">{log.panelTemp}°C</span></span>
                        )}
                        {log.gridFreq !== undefined && (
                          <span>FRQ: <span className="text-slate-300 font-bold">{log.gridFreq}HZ</span></span>
                        )}
                        {log.batterySoC !== undefined && (
                          <span>BAT: <span className="text-slate-300 font-bold">{log.batterySoC}%</span></span>
                        )}
                      </div>
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-4 text-slate-400 font-sans text-xs max-w-[200px] truncate" title={log.notes}>
                      {log.notes || <span className="text-slate-600 italic">EMPTY_REGISTER</span>}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onDeleteLog(log.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-none transition-all cursor-pointer"
                        title="Delete log record"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 mt-4">
          <span className="text-[10px] font-bold text-slate-500 tracking-widest font-mono">
            PAGE {currentPage} / {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 text-[10px] font-mono border transition-all ${currentPage === 1 ? 'border-slate-800 text-slate-600 cursor-not-allowed bg-transparent' : 'border-slate-800 text-slate-300 bg-[#1A1C20] hover:bg-slate-800'}`}
            >
              PREVIOUS
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 text-[10px] font-mono border transition-all ${currentPage === totalPages ? 'border-slate-800 text-slate-600 cursor-not-allowed bg-transparent' : 'border-slate-800 text-slate-300 bg-[#1A1C20] hover:bg-slate-800'}`}
            >
              NEXT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
