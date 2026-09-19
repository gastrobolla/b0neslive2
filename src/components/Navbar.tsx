import React from 'react';
import { RefreshCw, Radio, Shield, Sparkles, Activity, Bell } from 'lucide-react';
import { ScannerState } from '../types.js';
import { PWAInstallButton } from './PWAInstallButton.js';

interface NavbarProps {
  scanner: ScannerState;
  onSyncNff: () => void;
  isSyncing: boolean;
  onOpenAiModal: () => void;
  onOpenScannerDrawer: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationCount?: number;
  hasLiveMatch?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  scanner,
  onSyncNff,
  isSyncing,
  onOpenAiModal,
  onOpenScannerDrawer,
  onOpenNotifications,
  unreadNotificationCount = 0,
  hasLiveMatch = false,
}) => {
  return (
    <header id="app-header" className="sticky top-0 z-40 bg-[#0c1e38] border-b border-slate-800 text-white shadow-xs">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Logo and Brand - FotMob Style */}
          <div className="flex items-center space-x-3">
            <div id="club-badge" className="relative shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white p-1 shadow-xs border border-white/20 overflow-hidden flex items-center justify-center">
              <img
                src="/bones-logo.svg"
                alt="Bønes IL"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/bones-logo.png';
                }}
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-base sm:text-lg tracking-tight text-white">
                  Bønes IL
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  FotMob
                </span>
                {hasLiveMatch ? (
                  <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse"></span>
                    <span className="hidden sm:inline">LIVE NÅ</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium border border-slate-700/60">
                    <span className="hidden sm:inline">NFF Hordaland</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block">
                16 lag i seriespill • Kampsenter, tabeller og lagoppstillinger
              </p>
            </div>
          </div>

          {/* Quick Actions & Live Scanner Status */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            
            {/* Scanner Info Pill */}
            <button
              id="btn-open-scanner-drawer"
              onClick={onOpenScannerDrawer}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 text-xs transition-colors cursor-pointer"
              title="Vis kildestatus og skannerlogger"
            >
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline text-slate-400 text-[11px]">NFF-skann:</span>
              <span className="font-mono font-bold text-blue-300 text-xs">{scanner.nextScanSeconds}s</span>
            </button>

            {/* Notification Bell */}
            {onOpenNotifications && (
              <button
                id="btn-open-notifications"
                onClick={onOpenNotifications}
                className="relative flex items-center justify-center p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-amber-400 border border-slate-700/80 transition-colors cursor-pointer"
                title="Varslingsinnstillinger (Mål & Kampstart)"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-[#0c1e38]">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                )}
              </button>
            )}

            {/* PWA Install Button */}
            <PWAInstallButton compact />

            {/* AI Assistant Insight */}
            <button
              id="btn-ai-analysis"
              onClick={onOpenAiModal}
              className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="Åpne AI Kampsenter Analyse"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>AI-rapport</span>
            </button>

            {/* Automated 5-Minute NFF Sync Badge */}
            <div
              id="nff-autosync-badge"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-xs shadow-2xs"
              title="Data synkroniseres automatisk fra NFF fotball.no hvert 5. minutt"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-[11px] text-emerald-300 hidden sm:inline">NFF-synk:</span>
              <span className="text-[11px] text-emerald-200 font-bold font-mono">Hvert 5. min</span>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
