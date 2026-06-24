import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  description?: string;
  children?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  iconColor,
  iconBg,
  description,
  children
}) => {
  // Determine border and accent based on title/type
  const isDC = title.toLowerCase().includes('solar') || title.toLowerCase().includes('dc');
  const accentColorClass = isDC ? 'border-yellow-500 text-yellow-500' : 'border-emerald-500 text-emerald-400';
  const tagText = isDC ? 'DC SOURCE' : 'AC OUTPUT';
  const tagBg = isDC ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

  return (
    <div className="bg-[#111318] border border-slate-800 p-5 flex flex-col justify-between h-full relative overflow-hidden">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</h2>
          <span className={`text-[8px] font-mono px-2 py-0.5 border uppercase ${tagBg}`}>
            {tagText}
          </span>
        </div>
        
        <div className={`border-l-2 ${accentColorClass} pl-4 py-1 mt-3`}>
          <p className="text-5xl font-mono font-light text-white tracking-tighter">
            {value}
            {unit && <span className="text-xl text-slate-500 ml-1 font-sans">{unit}</span>}
          </p>
          {description && (
            <p className="text-[10px] text-slate-500 uppercase mt-1 italic tracking-wide">
              {description}
            </p>
          )}
        </div>
      </div>
      
      {children && (
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          {children}
        </div>
      )}
    </div>
  );
};

interface SemiGaugeProps {
  value: number; // percentage, e.g. 96.5
  title: string;
  lossW: number;
}

export const EfficiencyGauge: React.FC<SemiGaugeProps> = ({ value, title, lossW }) => {
  // Determine color based on efficiency
  let strokeColor = "stroke-emerald-400";
  let badgeText = "EXCELLENT";
  let badgeBg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

  if (value < 80) {
    strokeColor = "stroke-rose-500";
    badgeText = "CRITICAL LOSS";
    badgeBg = "bg-rose-500/10 text-rose-400 border-rose-500/20";
  } else if (value < 90) {
    strokeColor = "stroke-yellow-500";
    badgeText = "FAIR CONVERSION";
    badgeBg = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  } else if (value < 94) {
    strokeColor = "stroke-blue-400";
    badgeText = "GOOD";
    badgeBg = "bg-blue-500/10 text-blue-400 border-blue-500/20";
  }

  // Circular gauge config
  const radius = 52;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className="bg-[#111318] border border-slate-800 p-5 flex flex-col sm:flex-row items-center justify-between gap-6 h-full">
      <div className="flex-1 w-full">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</span>
        </div>
        
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-4xl font-mono text-white tracking-tighter">{value.toFixed(1)}%</span>
          <span className={`text-[8px] font-mono px-2 py-0.5 border ${badgeBg}`}>
            {badgeText}
          </span>
        </div>
        
        <p className="text-[10px] text-slate-500 mt-4 uppercase">
          CONVERSION LOSS: <span className="text-rose-400 font-mono font-bold">{lossW.toLocaleString()} W</span>
        </p>
      </div>

      <div className="relative flex items-center justify-center shrink-0">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            stroke="#1e293b"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Progress circle */}
          <circle
            className={`transition-all duration-500 ease-out ${strokeColor}`}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset }}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-xs font-mono font-bold text-white">EFF</span>
          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Ratio</span>
        </div>
      </div>
    </div>
  );
};
