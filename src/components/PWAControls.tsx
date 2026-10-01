import React, { useState } from 'react';
import { Download, RefreshCw, WifiOff, X, Share, Smartphone } from 'lucide-react';
import { usePWA } from '../usePWA.js';

export const PWAControls: React.FC = () => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isOnline,
    isUpdateAvailable,
    installApp,
    updateApp,
    dismissUpdate,
  } = usePWA();

  const [showIOSModal, setShowIOSModal] = useState(false);

  return (
    <>
      {/* 1. Offline Indicator */}
      {!isOnline && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 border border-amber-300">
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>Frakoblet modus — Viser lagret sesongdata</span>
        </div>
      )}

      {/* 2. Auto-Update Ready Banner */}
      {isUpdateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:max-w-md z-50 bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/40">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-white truncate">Ny versjon er klar!</p>
              <p className="text-[11px] text-slate-300 truncate">Siste lagoppstillinger og resultater er lastet ned.</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={updateApp}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              Oppdater nå
            </button>
            <button
              onClick={dismissUpdate}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Lukk"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. iOS Install Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-slate-900 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-[#165094] text-white flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Installer Bønes Live</h3>
                  <p className="text-[11px] text-slate-500">På din iPhone / iPad</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-slate-700">
              <div className="flex items-start space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-[#165094] flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-900">Trykk på Del-knappen</p>
                  <p className="text-slate-500 mt-0.5 flex items-center gap-1">
                    <span>Trykk</span>
                    <Share className="w-3.5 h-3.5 text-blue-600 inline" />
                    <span>nederst i Safari-verktøylinjen.</span>
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-blue-100 text-[#165094] flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-bold text-slate-900">Velg «Legg til på Hjem-skjerm»</p>
                  <p className="text-slate-500 mt-0.5">
                    Bla litt ned i menyen og trykk på «Legg til på Hjem-skjerm» (Add to Home Screen).
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-bold text-slate-900">Fullskjerm app-opplevelse</p>
                  <p className="text-slate-500 mt-0.5">
                    Appen åpnes nå som en ekte app uten adressefelt og fungerer også uten nettforbindelse!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2.5 bg-[#165094] hover:bg-[#12427a] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Forstått
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// Compact Install button for header
export const PWAHeaderInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, installApp } = usePWA();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If already installed as standalone PWA on phone, don't show install button
  if (isInstalled) {
    return (
      <span className="hidden sm:inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-1 rounded-lg">
        <span>✓ Installert</span>
      </span>
    );
  }

  if (isInstallable) {
    return (
      <button
        onClick={installApp}
        className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
        title="Installer Bønes Live som en app på telefonen din"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installer app</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSModal(true)}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all border border-slate-700 cursor-pointer active:scale-95"
          title="Installer på iPhone/iPad"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span>Få app</span>
        </button>

        {showIOSModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-slate-900 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-black text-sm text-slate-900">Installer på iPhone</h3>
                <button onClick={() => setShowIOSModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-xs text-slate-600">
                <p>1. Trykk <strong>Del-knappen</strong> (firkant med pil opp) i Safari.</p>
                <p>2. Rull ned og velg <strong>«Legg til på Hjem-skjerm»</strong>.</p>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="mt-5 w-full py-2 bg-[#165094] text-white text-xs font-bold rounded-xl"
              >
                Lukk
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
