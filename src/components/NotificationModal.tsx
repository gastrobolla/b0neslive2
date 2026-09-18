import React, { useState } from 'react';
import {
  BonesNotification,
  NotificationSettings,
} from '../utils/notificationSystem.js';
import {
  Bell,
  Volume2,
  VolumeX,
  Radio,
  Star,
  CheckCircle2,
  Shield,
  X,
  Trash2,
  Play,
  Settings,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NotificationSettings;
  onUpdateSettings: (newSettings: Partial<NotificationSettings>) => void;
  notifications: BonesNotification[];
  onClearHistory: () => void;
  onTestNotification: (type: 'goal' | 'kickoff') => void;
  onRequestPermission: () => Promise<NotificationPermission>;
  onOpenMatch?: (matchId: string) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  notifications,
  onClearHistory,
  onTestNotification,
  onRequestPermission,
  onOpenMatch,
}) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'history'>('settings');
  const [permissionStatus, setPermissionStatus] = useState<string>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });

  if (!isOpen) return null;

  const handleRequestBrowserPermission = async () => {
    const res = await onRequestPermission();
    setPermissionStatus(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0B2545] via-[#103867] to-[#165094] p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>Varslingssenter</span>
                <span className="text-[10px] bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black">
                  LIVE
                </span>
              </h3>
              <p className="text-xs text-blue-200/80">
                Få direkte push-varsel ved kampstart og mål for Bønes IL
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-[#165094] text-[#165094]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Innstillinger & Lyd</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-[#165094] text-[#165094]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Mottatte varsler ({notifications.length})</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'settings' ? (
            <>
              {/* Browser Push Permission Card */}
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-blue-950">Nettleser Push-varsler:</span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.2 rounded-full uppercase ${
                        permissionStatus === 'granted'
                          ? 'bg-emerald-100 text-emerald-800'
                          : permissionStatus === 'denied'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {permissionStatus === 'granted'
                        ? 'Aktivert ✓'
                        : permissionStatus === 'denied'
                        ? 'Blokkert i nettleser'
                        : 'Ikke aktivert'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-900/80 leading-relaxed">
                    Gir deg varsler selv når du har andre faner åpne eller skjermen låst.
                  </p>
                </div>

                {permissionStatus !== 'granted' && (
                  <button
                    onClick={handleRequestBrowserPermission}
                    className="px-3.5 py-2 rounded-xl bg-[#165094] hover:bg-[#0F3A6D] text-white text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    Tillat push-varsler
                  </button>
                )}
              </div>

              {/* Toggles list */}
              <div className="space-y-3 bg-white rounded-2xl border border-slate-200 p-4 divide-y divide-slate-100">
                {/* Master Switch */}
                <div className="flex items-center justify-between pb-3">
                  <div>
                    <label className="text-sm font-bold text-slate-900 block cursor-pointer">
                      Hovedbryter for varsler
                    </label>
                    <span className="text-xs text-slate-500">
                      Motta automatiske sanntidsoppdateringer
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => onUpdateSettings({ enabled: e.target.checked })}
                    className="w-5 h-5 accent-[#165094] cursor-pointer rounded"
                  />
                </div>

                {/* Kickoff Alerts */}
                <div className="flex items-center justify-between py-3">
                  <div className="space-y-0.5">
                    <label className="text-sm font-bold text-slate-900 block cursor-pointer flex items-center gap-1.5">
                      <span>🏁 Kampstartvarsler</span>
                    </label>
                    <span className="text-xs text-slate-500">
                      Få varsel så snart dommeren blåser i gang kampen
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!settings.enabled}
                    checked={settings.kickoffAlerts}
                    onChange={(e) => onUpdateSettings({ kickoffAlerts: e.target.checked })}
                    className="w-5 h-5 accent-[#165094] cursor-pointer rounded"
                  />
                </div>

                {/* Goal Alerts */}
                <div className="flex items-center justify-between py-3">
                  <div className="space-y-0.5">
                    <label className="text-sm font-bold text-slate-900 block cursor-pointer flex items-center gap-1.5">
                      <span>⚽ Målvarsler i sanntid</span>
                    </label>
                    <span className="text-xs text-slate-500">
                      Umiddelbart varsel med målscorer, stilling og minutt
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!settings.enabled}
                    checked={settings.goalAlerts}
                    onChange={(e) => onUpdateSettings({ goalAlerts: e.target.checked })}
                    className="w-5 h-5 accent-[#165094] cursor-pointer rounded"
                  />
                </div>

                {/* Sound Chimes */}
                <div className="flex items-center justify-between py-3">
                  <div className="space-y-0.5">
                    <label className="text-sm font-bold text-slate-900 block cursor-pointer flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-amber-500" />
                      <span>Lydvarsler (fanfare og fløyte)</span>
                    </label>
                    <span className="text-xs text-slate-500">
                      Spiller av jubellyd ved scoring og fløytetrille ved kampstart
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!settings.enabled}
                    checked={settings.soundEnabled}
                    onChange={(e) => onUpdateSettings({ soundEnabled: e.target.checked })}
                    className="w-5 h-5 accent-[#165094] cursor-pointer rounded"
                  />
                </div>

                {/* Favorites Only Filter */}
                <div className="flex items-center justify-between pt-3">
                  <div className="space-y-0.5">
                    <label className="text-sm font-bold text-slate-900 block cursor-pointer flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span>Kun stjernemerkede favorittlag</span>
                    </label>
                    <span className="text-xs text-slate-500">
                      Hvis avskrudd varsles det for alle 16 Bønes-lag
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!settings.enabled}
                    checked={settings.favoritesOnly}
                    onChange={(e) => onUpdateSettings({ favoritesOnly: e.target.checked })}
                    className="w-5 h-5 accent-[#165094] cursor-pointer rounded"
                  />
                </div>
              </div>

              {/* Test Buttons */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <span className="text-xs font-bold text-slate-700 block">
                  Test varsler og lydeffekter:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onTestNotification('goal')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-950 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <span>⚽ Test Målvarsel</span>
                  </button>
                  <button
                    onClick={() => onTestNotification('kickoff')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-950 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <span>🏁 Test Kampstart</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Notification History */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Mottatte varsler ({notifications.length})
                </span>
                {notifications.length > 0 && (
                  <button
                    onClick={onClearHistory}
                    className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Tøm historikk</span>
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2 bg-slate-50 rounded-2xl border border-slate-200">
                  <Bell className="w-8 h-8 mx-auto opacity-40 text-slate-500" />
                  <p className="text-sm font-bold text-slate-700">Ingen varsler mottatt ennå</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Når en Bønes-kamp starter eller et mål scores, vil du se oppdateringene her.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (n.matchId && onOpenMatch) {
                          onOpenMatch(n.matchId);
                          onClose();
                        }
                      }}
                      className="p-3 rounded-xl border border-slate-200 bg-white hover:border-[#165094] transition-all cursor-pointer shadow-2xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span
                          className={`font-black uppercase px-2 py-0.2 rounded-full text-[10px] ${
                            n.type === 'goal'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-blue-100 text-blue-900'
                          }`}
                        >
                          {n.type === 'goal' ? 'MÅL' : 'KAMPSTART'}
                        </span>
                        <span className="text-slate-400">{n.timestamp}</span>
                      </div>
                      <h5 className="font-bold text-xs text-slate-900">{n.title}</h5>
                      <p className="text-xs text-slate-600">{n.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#165094] hover:bg-[#0F3A6D] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Ferdig
          </button>
        </div>
      </div>
    </div>
  );
};
