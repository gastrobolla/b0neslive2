import React, { useState } from 'react';
import { ScannerState } from '../types.js';
import { Activity, X, RefreshCw, CheckCircle2, ShieldCheck, Sparkles, Terminal, Globe, Clock, Power } from 'lucide-react';

interface ScannerStatusDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  scanner: ScannerState;
  onManualScan: () => void;
  isScanning: boolean;
  onToggleAutoScan: () => void;
}

export const ScannerStatusDrawer: React.FC<ScannerStatusDrawerProps> = ({
  isOpen,
  onClose,
  scanner,
  onManualScan,
  isScanning,
  onToggleAutoScan
}) => {
  if (!isOpen) return null;

  return (
    <div id="scanner-drawer-overlay" className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
      
      <div
        id="scanner-drawer"
        className="w-full max-w-lg bg-slate-900 text-white h-full shadow-2xl flex flex-col border-l border-slate-800 animate-in slide-in-from-right duration-200"
      >
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white flex items-center space-x-2">
                <span>Offisiell Sanntidsskanner</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">
                  AKTIV
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Skanner fortløpende fotball.no & NFF Hordaland
              </p>
            </div>
          </div>

          <button
            id="btn-close-scanner-drawer"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          
          {/* Status & Control Panel */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Neste automatiske skanning:</p>
                <p className="text-xl font-mono font-black text-emerald-400 mt-0.5">
                  {scanner.nextScanSeconds} sekunder
                </p>
              </div>

              <button
                id="btn-drawer-manual-scan"
                onClick={onManualScan}
                disabled={isScanning}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-sm disabled:bg-slate-800 disabled:text-slate-500"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Skanner...' : 'Tving skanning'}</span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Sist synkronisert: <strong className="text-white font-mono">{scanner.lastScanned}</strong></span>
              </span>

              <button
                id="btn-toggle-autoscan"
                onClick={onToggleAutoScan}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                  scanner.autoScanEnabled
                    ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <Power className="w-3 h-3" />
                <span>Autoskann: {scanner.autoScanEnabled ? 'PÅ' : 'AV'}</span>
              </button>
            </div>
          </div>

          {/* Official Sources Monitored */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Overvåkede offisielle kilder</span>
            </h4>

            <div className="space-y-2">
              {scanner.sources.map((source, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-white flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{source.name}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                      {source.url}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      SYNKRONISERT
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {source.lastSync}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Scanner Log Output */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>Sanntids skannelogg ({scanner.logs.length} hendelser)</span>
            </h4>

            <div className="bg-black/80 rounded-xl border border-slate-800 p-3 font-mono text-xs text-slate-300 space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {scanner.logs.map((log) => (
                <div key={log.id} className="text-[11px] leading-relaxed flex items-start space-x-2">
                  <span className="text-slate-500 shrink-0 font-mono">[{log.timestamp}]</span>
                  <span
                    className={`font-bold shrink-0 ${
                      log.level === 'success'
                        ? 'text-emerald-400'
                        : log.level === 'update'
                        ? 'text-amber-400'
                        : log.level === 'warning'
                        ? 'text-red-400'
                        : 'text-blue-400'
                    }`}
                  >
                    [{log.source}]
                  </span>
                  <span className="text-slate-300">{log.message}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 text-center text-xs text-slate-500">
          Tilkoblet NFF FIKS API v2.4 • Oppdateres automatisk hvert minutt
        </div>

      </div>

    </div>
  );
};
