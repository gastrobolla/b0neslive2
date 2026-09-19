import React from 'react';
import { Match } from '../types.js';
import { Star, Shield, ChevronRight } from 'lucide-react';

interface SofascoreMatchCardProps {
  match: Match;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onOpenDetail: () => void;
  onOpenLineup?: () => void;
}

export const SofascoreMatchCard: React.FC<SofascoreMatchCardProps> = ({
  match,
  isFavorite,
  onToggleFavorite,
  onOpenDetail,
  onOpenLineup,
}) => {
  const isBonesHome = match.homeTeam.toLowerCase().includes('bønes');
  const isBonesAway = match.awayTeam.toLowerCase().includes('bønes');
  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';
  const isUpcoming = match.status === 'upcoming';

  // Winner calculation
  const homeWon = isFinished && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWon = isFinished && (match.awayScore ?? 0) > (match.homeScore ?? 0);

  const latestEvent = match.events && match.events.length > 0 ? match.events[match.events.length - 1] : null;
  const hasLineup = Boolean(
    (match.homeLineup && match.homeLineup.starters?.length > 0) ||
    (match.awayLineup && match.awayLineup.starters?.length > 0) ||
    (match.lineup && match.lineup.starters?.length > 0)
  );

  return (
    <div
      id={`match-card-${match.id}`}
      onClick={onOpenDetail}
      className={`bg-white rounded-xl border transition-all cursor-pointer hover:shadow-xs overflow-hidden ${
        isLive
          ? 'border-red-200 border-l-4 border-l-red-600 shadow-2xs'
          : 'border-slate-200/90 hover:border-slate-300'
      }`}
    >
      <div className="p-3 sm:p-4">
        {/* Top mini-header */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 border-b border-slate-100 pb-1.5">
          <div className="flex items-center space-x-2 truncate">
            <span className="font-bold text-slate-700 uppercase tracking-wider">{match.date}</span>
            <span>•</span>
            <span className="truncate text-slate-600 font-medium">{match.venue}</span>
            {match.isHome && (
              <span className="bg-blue-50 text-[#165094] border border-blue-200/80 text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0">
                HJEMME
              </span>
            )}
            {hasLineup && (
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0">
                Tropp klar
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {onOpenLineup && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenLineup();
                }}
                className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Se lagoppstilling"
              >
                Oppstilling
              </button>
            )}
            <button
              onClick={onToggleFavorite}
              aria-label={isFavorite ? 'Fjern favoritt' : 'Lagre favoritt'}
              className="p-1 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sofascore 3-Column Match Row */}
        <div className="grid grid-cols-12 items-center gap-2">
          {/* Status Column */}
          <div className="col-span-3 sm:col-span-2 flex flex-col items-center justify-center text-center pr-2 border-r border-slate-100">
            {isLive && (
              <div className="flex flex-col items-center">
                <span className="relative flex h-2 w-2 mb-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                </span>
                <span className="text-xs font-black text-red-600">
                  {match.currentMinute ? `${match.currentMinute}'` : 'LIVE'}
                </span>
              </div>
            )}
            {isFinished && (
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-slate-500">FT</span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {match.halfTimeScore ? `(${match.halfTimeScore.home}-${match.halfTimeScore.away})` : ''}
                </span>
              </div>
            )}
            {isUpcoming && (
              <div className="flex flex-col items-center">
                <span className="text-xs font-black text-[#165094]">{match.time}</span>
                <span className="text-[10px] text-slate-400 font-medium">Kommende</span>
              </div>
            )}
          </div>

          {/* Teams and Scores Column */}
          <div className="col-span-9 sm:col-span-10 space-y-1.5">
            {/* Home Team */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-slate-100">
                  {isBonesHome ? (
                    <img src="/bones-logo.svg" alt="Bønes IL" className="w-4 h-4 object-contain" />
                  ) : (
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
                <span
                  className={`text-sm truncate ${
                    homeWon
                      ? 'font-black text-slate-900'
                      : isBonesHome
                      ? 'font-extrabold text-[#165094]'
                      : 'font-medium text-slate-700'
                  }`}
                >
                  {match.homeTeam}
                </span>
              </div>
              <span
                className={`font-mono text-base font-black px-2 ${
                  isUpcoming ? 'text-slate-300' : homeWon ? 'text-slate-950' : 'text-slate-700'
                }`}
              >
                {isUpcoming ? '-' : (match.homeScore ?? 0)}
              </span>
            </div>

            {/* Away Team */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-slate-100">
                  {isBonesAway ? (
                    <img src="/bones-logo.svg" alt="Bønes IL" className="w-4 h-4 object-contain" />
                  ) : (
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
                <span
                  className={`text-sm truncate ${
                    awayWon
                      ? 'font-black text-slate-900'
                      : isBonesAway
                      ? 'font-extrabold text-[#165094]'
                      : 'font-medium text-slate-700'
                  }`}
                >
                  {match.awayTeam}
                </span>
              </div>
              <span
                className={`font-mono text-base font-black px-2 ${
                  isUpcoming ? 'text-slate-300' : awayWon ? 'text-slate-950' : 'text-slate-700'
                }`}
              >
                {isUpcoming ? '-' : (match.awayScore ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Latest Goal / Event Pill */}
        {latestEvent && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-amber-800 bg-amber-50/60 -mx-3 -mb-3 sm:-mx-4 sm:-mb-4 px-3 sm:px-4 py-1.5">
            <span className="truncate font-medium">
              {latestEvent.type === 'goal' ? '⚽' : '⚡'} {latestEvent.minute}' {latestEvent.description}
            </span>
            <span className="text-[10px] font-bold text-[#165094] flex items-center gap-0.5 shrink-0 ml-2">
              Detaljer <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
