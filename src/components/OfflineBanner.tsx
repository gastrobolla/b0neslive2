import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, Clock } from 'lucide-react';

interface OfflineBannerProps {
  isRealData?: boolean;
  lastUpdated?: string;
  isScrapingNow?: boolean;
  onRefresh?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isRealData,
  lastUpdated,
  isScrapingNow,
  onRefresh,
}) => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (showReconnected) {
    return (
      <div
        id="reconnected-banner"
        className="bg-emerald-700 text-white px-3 py-1.5 text-xs font-medium flex items-center justify-between transition-all duration-300 shadow-xs"
      >
        <div className="flex items-center space-x-1.5 mx-auto">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
          <span>Tilkoblet igjen – Live data fra NFF synkroniseres automatisk</span>
        </div>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div
        id="offline-banner"
        className="bg-amber-600 text-white px-3 py-2 text-xs font-semibold flex items-center justify-between shadow-xs sticky top-0 z-40"
      >
        <div className="flex items-center space-x-2">
          <WifiOff className="w-4 h-4 text-amber-200 shrink-0" />
          <span>
            Frakoblet modus (Offline) – Viser lagret NFF-data for Bønes IL
          </span>
        </div>
        {lastUpdated && (
          <span className="text-[11px] text-amber-100 hidden sm:inline">
            Sist lagret: {lastUpdated}
          </span>
        )}
      </div>
    );
  }

  if (isScrapingNow) {
    return (
      <div
        id="scraping-now-banner"
        className="bg-slate-900 text-emerald-400 px-3 py-1.5 text-xs font-medium flex items-center justify-center space-x-2 border-b border-slate-800"
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>Oppdaterer livescore og tabeller direkte fra NFF fotball.no...</span>
      </div>
    );
  }

  return null;
};
