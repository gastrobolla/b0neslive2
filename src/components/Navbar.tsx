import React from 'react';
import { Bell } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton.js';
import { ClubWeatherBadge } from './ClubWeatherBadge.js';

interface NavbarProps {
  onSyncNff?: () => void;
  isSyncing?: boolean;
  onOpenNotifications?: () => void;
  unreadNotificationCount?: number;
  hasLiveMatch?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNotifications,
  unreadNotificationCount = 0,
  hasLiveMatch = false,
}) => {
  return (
    <header id="app-header" className="sticky top-0 z-40 bg-[#0c1e38] border-b border-slate-800 text-white shadow-xs">
      {/* Bønes ILs lagfarger: diskré aksentlinje (Kongeblå & Rød) */}
      <div
        id="bones-club-accent-line"
        className="h-1 w-full bg-gradient-to-r from-[#165094] via-[#dc2626] to-[#165094]"
        title="Bønes IL klubbfarger: Kongeblå & Rød"
      />
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          
          {/* Logo and Brand */}
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
                {hasLiveMatch && (
                  <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse"></span>
                    <span>LIVE NÅ</span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden md:block">
                16 lag i seriespill • Kampsenter, tabeller og lagoppstillinger
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* Club Weather Widget */}
            <ClubWeatherBadge />

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
          </div>

        </div>
      </div>
    </header>
  );
};
