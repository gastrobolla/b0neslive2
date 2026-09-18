import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall.js';
import { Download, Share2, PlusSquare, X } from 'lucide-react';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        id="pwa-install-btn"
        onClick={install}
        className={`flex items-center gap-1.5 font-bold rounded-lg transition-all shadow-xs active:scale-95 ${
          compact
            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-1.5 text-xs'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 text-xs sm:text-sm'
        }`}
        title="Installer Bønes Fotball som app på mobilen"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Installer app</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          id="pwa-ios-install-btn"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 font-bold rounded-lg transition-all ${
            compact
              ? 'bg-white/15 hover:bg-white/25 text-white px-2.5 py-1.5 text-xs'
              : 'border border-white/30 text-white hover:bg-white/10 px-3 py-2 text-xs'
          }`}
          title="Installer på iPhone / iPad"
        >
          <Share2 className="w-3.5 h-3.5 shrink-0 text-blue-200" />
          <span>Legg til hjemskjerm</span>
        </button>

        {showIOSGuide && (
          <div
            id="pwa-ios-modal"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs animate-fadeIn"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 w-full max-w-sm text-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <img src="/pwa-192x192.png" alt="Bønes IL" className="w-8 h-8 rounded-lg shadow-xs" />
                  <div>
                    <h3 className="text-sm font-black text-[#165094]">Installer Bønes Fotball</h3>
                    <p className="text-[11px] text-slate-500">For iPhone og iPad</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#165094] flex items-center justify-center font-black shrink-0">
                    1
                  </div>
                  <p className="pt-0.5">
                    Trykk på <Share2 className="w-4 h-4 inline-block text-[#165094] mx-1" /> <strong>Del</strong>-knappen nederst i Safari.
                  </p>
                </div>

                <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#165094] flex items-center justify-center font-black shrink-0">
                    2
                  </div>
                  <p className="pt-0.5">
                    Rull nedover og velg <PlusSquare className="w-4 h-4 inline-block text-emerald-600 mx-1" /> <strong>Legg til på Hjem-skjerm</strong>.
                  </p>
                </div>

                <div className="flex items-start space-x-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-black shrink-0">
                    3
                  </div>
                  <p className="pt-0.5">
                    Trykk <strong>Legg til</strong> øverst til høyre. Nå har du rask ett-trykks tilgang med fullskjerm-modus!
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-[#165094] hover:bg-[#0B2545] text-white font-bold text-xs transition-colors shadow-xs"
              >
                Forstått
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
