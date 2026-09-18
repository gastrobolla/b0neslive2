import React, { useEffect } from 'react';
import { BonesNotification } from '../utils/notificationSystem.js';
import { Bell, X, Volume2, ChevronRight, Trophy } from 'lucide-react';

interface NotificationToastProps {
  notification: BonesNotification | null;
  onDismiss: () => void;
  onOpenMatch?: (matchId: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
  onOpenMatch,
}) => {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 7000); // auto-dismiss after 7 seconds
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  const isGoal = notification.type === 'goal';

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full animate-in fade-in slide-in-from-top-4 duration-300 px-3">
      <div
        className={`rounded-2xl p-4 shadow-2xl border flex items-start gap-3 backdrop-blur-md cursor-pointer transition-transform hover:scale-[1.01] ${
          isGoal
            ? 'bg-gradient-to-br from-[#0B2545]/95 via-[#165094]/95 to-[#0F3A6D]/95 text-white border-amber-400/60 ring-2 ring-amber-400/40'
            : 'bg-white/95 text-slate-900 border-slate-200 shadow-lg'
        }`}
        onClick={() => {
          if (notification.matchId && onOpenMatch) {
            onOpenMatch(notification.matchId);
          }
          onDismiss();
        }}
      >
        {/* Icon */}
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-xl shrink-0 shadow-md ${
            isGoal
              ? 'bg-amber-400 text-slate-950 animate-bounce'
              : 'bg-[#165094] text-white'
          }`}
        >
          {isGoal ? '⚽' : '🏁'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <div className="flex items-center space-x-1.5">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isGoal ? 'bg-amber-400 text-slate-950' : 'bg-blue-100 text-[#165094]'
                }`}
              >
                {isGoal ? 'MÅLVARSEL' : 'KAMPSTART'}
              </span>
              <span className="text-[11px] opacity-75">{notification.timestamp}</span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="p-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h4 className="font-extrabold text-sm leading-snug truncate">{notification.title}</h4>
          <p className={`text-xs mt-1 leading-relaxed ${isGoal ? 'text-blue-100' : 'text-slate-600'}`}>
            {notification.body}
          </p>

          <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center justify-between text-[11px] font-bold">
            <span className="flex items-center gap-1 opacity-90">
              <Volume2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Bønes IL Sanntidsvarsel</span>
            </span>
            <span className="flex items-center gap-0.5 text-amber-300 hover:underline">
              Åpne kamp <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
