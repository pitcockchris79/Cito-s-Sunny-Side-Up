import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { LogEntry, AIAnalysisReport } from '../types';
import { Cpu, RefreshCw, AlertCircle, FileText, CheckCircle, Sparkles, BookOpen } from 'lucide-react';
import { getApiUrl } from '../lib/api';

interface AIAnalystProps {
  logs: LogEntry[];
  systemCapacityW: number;
}

export const AIAnalyst: React.FC<AIAnalystProps> = ({ logs, systemCapacityW }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<AIAnalysisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<number>(0);

  const loadingTips = [
    "Reading voltage registers and DC current logs...",
    "Calculating conversion loss coefficients...",
    "Correlating cell temperatures with ambient solar factors...",
    "Checking for possible clipping thresholds in grid connection...",
    "Evaluating potential shading bottlenecks in recent records...",
    "Compiling health advice from expert photovoltaic engineers..."
  ];

  // Rotate loading tips every 2.5 seconds during execution
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingTips.length);
      }, 2500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerateReport = async () => {
    if (logs.length === 0) return;
    
    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const response = await fetch(getApiUrl("/api/analyze-performance"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs, systemCapacityW })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate AI performance report.");
      }

      setReport(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during diagnostics.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#111318] border border-slate-800 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80 mb-6">
        <div>
          <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
            <Cpu size={16} className="text-yellow-500 animate-pulse" />
            Sunny Side Up AI Diagnostic
          </h2>
          <p className="text-[10px] text-slate-500 uppercase mt-0.5">
            Evaluate inverter performance indices using Google Gemini AI
          </p>
        </div>

        {logs.length > 0 && !loading && (
          <button
            onClick={handleGenerateReport}
            className="text-[10px] font-mono font-bold text-slate-950 bg-yellow-500 hover:bg-yellow-400 px-4 py-2.5 transition-all cursor-pointer flex items-center gap-2 uppercase"
          >
            <Sparkles size={12} />
            {report ? "RE-RUN AUDIT" : "RUN DIAGNOSTIC"}
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center border border-dashed border-slate-800 bg-[#1A1C20]/55 p-6">
          <div className="p-3 bg-[#111318] border border-slate-800 text-slate-500 rounded-none mb-3">
            <BookOpen size={20} />
          </div>
          <p className="text-xs font-mono font-bold text-slate-300 uppercase">DIAGNOSTIC DATA NOT DETECTED</p>
          <p className="text-[10px] text-slate-500 mt-1.5 max-w-xs text-center font-mono uppercase leading-normal">
            Requires at least one manual log or seed dataset to generate deep conversion models.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Default state: Prompt user to analyze if no report */}
          {!loading && !report && !error && (
            <div className="p-6 bg-[#1A1C20] border border-slate-800 flex flex-col items-center text-center">
              <span className="text-2xl mb-2">⚡</span>
              <h3 className="text-xs font-bold text-slate-200 uppercase">SOLAR CORE READY FOR SCAN</h3>
              <p className="text-[10px] text-slate-500 mt-1 max-w-sm font-mono leading-normal uppercase">
                Assistant will read {logs.length} telemetry records to evaluate conversion loss, track thermal thresholds, flag shading obstructions, and draft tuning recommendations.
              </p>
              <button
                onClick={handleGenerateReport}
                className="mt-4 text-[10px] font-mono font-bold text-slate-300 bg-[#111318] hover:bg-slate-800 border border-slate-800 px-5 py-2 transition-all uppercase flex items-center gap-1.5"
              >
                <Sparkles size={12} className="text-yellow-500" />
                AUDIT {logs.length} REGISTER RECORDS
              </button>
            </div>
          )}

          {/* Loading state with facts */}
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center bg-[#1A1C20]/40 border border-slate-800">
              <RefreshCw size={24} className="text-yellow-500 animate-spin mb-4" />
              <p className="text-xs font-bold text-white uppercase tracking-wider animate-pulse">RUNNING TELEMETRY EVALUATION...</p>
              <p className="text-[10px] text-slate-400 mt-3 font-mono bg-[#111318] border border-slate-800 px-4 py-1.5 uppercase leading-normal text-center max-w-md">
                {loadingTips[loadingStep]}
              </p>
            </div>
          )}

          {/* Error fallback */}
          {error && (
            <div className="p-5 bg-rose-950/20 border border-rose-900/50 text-rose-300 flex items-start gap-3.5">
              <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={16} />
              <div>
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">DIAGNOSTIC FAILURE</h4>
                <p className="text-[10px] text-rose-400 mt-1 leading-normal uppercase">
                  {error}
                </p>
                {error.includes("API Key") && (
                  <div className="mt-3.5 p-3 bg-[#111318] border border-slate-800 text-[10px] text-slate-400 leading-normal uppercase">
                    <p className="text-slate-200 font-bold mb-1">To configure your Gemini API Key:</p>
                    1. Navigate to Google AI Studio Workspace.<br />
                    2. Click Settings &gt; Secrets panel.<br />
                    3. Bind key to <code className="bg-[#1A1C20] text-yellow-500 px-1 rounded border border-slate-800 font-mono text-xxs lowercase">GEMINI_API_KEY</code>.<br />
                    4. Rerun smart diagnostic pipeline.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Generated Report */}
          {report && !loading && (
            <div className="bg-[#1A1C20] border border-slate-800 p-6 md:p-8">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#111318] text-emerald-400 border border-slate-800">
                    <CheckCircle size={14} />
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-slate-500 tracking-wider uppercase">System Diagnostic</span>
                    <h3 className="text-xs font-bold text-white uppercase">Health Report Generated</h3>
                  </div>
                </div>
                <div className="text-[9px] font-mono text-slate-500">
                  TIME: {new Date(report.timestamp).toLocaleTimeString()}
                </div>
              </div>

              {/* Styled markdown container */}
              <div className="text-xs text-slate-300 leading-relaxed space-y-4 max-w-none font-sans select-text">
                <Markdown>{report.report}</Markdown>
              </div>

              {/* Disclaimer */}
              <div className="mt-8 pt-4 border-t border-slate-800 flex items-center gap-2">
                <FileText size={12} className="text-slate-500" />
                <span className="text-[9px] font-bold text-slate-500 italic uppercase leading-normal">
                  Sunny Side Up diagnostics are AI-generated based on registers. Consult a qualified, licensed electrician prior to any physical array modification or line maintenance.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
