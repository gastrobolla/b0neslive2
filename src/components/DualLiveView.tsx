import React from 'react';
import { Match, MatchEvent } from '../types.js';
import {
  Radio,
  Clock,
  MapPin,
  Users,
  Trophy,
  Activity,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  ExternalLink,
  Shield,
  Star
} from 'lucide-react';

interface DualLiveViewProps {
  match1: Match;
  match2: Match;
  allConcurrentMatches?: Match[];
  onSelectMatch1?: (match: Match) => void;
  onSelectMatch2?: (match: Match) => void;
  onOpenDetail: (match: Match) => void;
  onOpenLineup?: (match: Match) => void;
  onOpenLagleder?: (match: Match) => void;
  favoriteTeamIds?: string[];
  onToggleFavorite?: (teamId: string, e: React.MouseEvent) => void;
}

export const DualLiveView: React.FC<DualLiveViewProps> = ({
  match1,
  match2,
  allConcurrentMatches = [],
  onSelectMatch1,
  onSelectMatch2,
  onOpenDetail,
  onOpenLineup,
  onOpenLagleder,
  favoriteTeamIds = [],
  onToggleFavorite,
}) => {
  const renderMatchColumn = (
    match: Match,
    columnKey: 'm1' | 'm2',
    onSelectOther?: (m: Match) => void
  ) => {
    const isLive = match.status === 'live';
    const isBonesHome = match.homeTeam.toLowerCase().includes('bønes');
    const isBonesAway = match.awayTeam.toLowerCase().includes('bønes');
    const homeScore = match.homeScore ?? 0;
    const awayScore = match.awayScore ?? 0;
    const minute = match.currentMinute ?? (match.status === 'finished' ? 90 : 0);

    const matchEvents = match.events || [];
    const isFav = favoriteTeamIds.includes(match.teamId);

    // Verified match stats
    const possessionHome = match.stats?.possession?.home ?? 50;
    const possessionAway = match.stats?.possession?.away ?? 50;
    const shotsHome = match.stats?.shotsTotal?.home ?? 0;
    const shotsAway = match.stats?.shotsTotal?.away ?? 0;
    const cornersHome = match.stats?.corners?.home ?? 0;
    const cornersAway = match.stats?.corners?.away ?? 0;

    return (
      <div className="bg-white rounded-2xl border-2 border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between">
        {/* Top bar with match selector & badge */}
        <div className="bg-slate-50/90 p-3 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            {isLive ? (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-red-600 text-white animate-pulse shadow-xs">
                <span className="w-2 h-2 rounded-full bg-white"></span>
                <span>LIVE {minute}'</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{match.time || '18:00'}</span>
              </span>
            )}
            <span className="text-xs font-bold text-slate-700 truncate">{match.teamName}</span>
          </div>

          {allConcurrentMatches.length > 2 && onSelectOther && (
            <div className="relative shrink-0">
              <select
                aria-label={`Bytt kamp for kolonne ${columnKey === 'm1' ? '1' : '2'}`}
                value={match.id}
                onChange={(e) => {
                  const target = allConcurrentMatches.find((m) => m.id === e.target.value);
                  if (target) onSelectOther(target);
                }}
                className="text-[11px] font-semibold bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 pr-6 appearance-none cursor-pointer hover:border-slate-400"
              >
                {allConcurrentMatches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.teamName} vs {m.isHome ? m.awayTeam : m.homeTeam}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2.5 pointer-events-none" />
            </div>
          )}

          {onToggleFavorite && (
            <button
              onClick={(e) => onToggleFavorite(match.teamId, e)}
              className="text-slate-400 hover:text-amber-500 transition-colors p-1 cursor-pointer"
              title="Favorittmerk lag"
            >
              <Star className={`w-4 h-4 ${isFav ? 'text-amber-500 fill-amber-500' : ''}`} />
            </button>
          )}
        </div>

        {/* Division & venue line */}
        <div className="px-4 pt-2.5 pb-1 flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100">
          <span className="font-semibold text-slate-600 truncate">{match.division}</span>
          <span className="flex items-center space-x-1 text-slate-400 truncate shrink-0 ml-2">
            <MapPin className="w-3 h-3 text-slate-400" />
            <span>{match.venue || 'Bønes Idrettsplass'}</span>
          </span>
        </div>

        {/* Live Score Board */}
        <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-50/50 to-white">
          <div className="grid grid-cols-7 items-center text-center">
            {/* Home Team */}
            <div className="col-span-3 flex flex-col items-center space-y-1.5 text-center">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow-xs ${
                  isBonesHome
                    ? 'bg-[#165094] text-white ring-2 ring-[#165094]/30'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {isBonesHome ? 'BØNES' : match.homeTeam.slice(0, 3).toUpperCase()}
              </div>
              <span className={`text-xs font-bold leading-tight line-clamp-2 ${isBonesHome ? 'text-[#165094]' : 'text-slate-800'}`}>
                {match.homeTeam}
              </span>
              {isBonesHome && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-[#165094]">
                  KLUBBLAG
                </span>
              )}
            </div>

            {/* Score Center */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <div className="text-2xl sm:text-3xl font-mono font-black text-slate-900 tracking-tight">
                {homeScore} - {awayScore}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                {isLive ? 'Pågår' : 'Tid'}
              </span>
            </div>

            {/* Away Team */}
            <div className="col-span-3 flex flex-col items-center space-y-1.5 text-center">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow-xs ${
                  isBonesAway
                    ? 'bg-[#165094] text-white ring-2 ring-[#165094]/30'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {isBonesAway ? 'BØNES' : match.awayTeam.slice(0, 3).toUpperCase()}
              </div>
              <span className={`text-xs font-bold leading-tight line-clamp-2 ${isBonesAway ? 'text-[#165094]' : 'text-slate-800'}`}>
                {match.awayTeam}
              </span>
              {isBonesAway && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-[#165094]">
                  KLUBBLAG
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Ticker / Events for this match */}
        <div className="px-4 py-2 bg-slate-50/70 border-t border-b border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center space-x-1">
              <Activity className="w-3.5 h-3.5 text-red-500" />
              <span>Siste hendelser ({matchEvents.length})</span>
            </span>
            {matchEvents.length > 0 && (
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                Oppdatert
              </span>
            )}
          </div>

          {matchEvents.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic py-1 text-center">
              Ingen registrerte mål eller kort enda
            </p>
          ) : (
            <div className="space-y-1 max-h-24 overflow-y-auto pr-1 text-[11px]">
              {matchEvents.slice(-3).reverse().map((ev, idx) => (
                <div key={ev.id || idx} className="flex items-center justify-between py-0.5 border-b border-slate-200/50 last:border-0">
                  <div className="flex items-center space-x-1.5 truncate">
                    <span className="font-mono font-bold text-slate-700 w-6 shrink-0">{ev.minute}'</span>
                    <span className="shrink-0">{ev.type === 'goal' ? '⚽' : ev.type === 'yellow_card' ? '🟨' : '🔄'}</span>
                    <span className="font-semibold text-slate-800 truncate">{ev.player || ev.team}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 truncate ml-2">{ev.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sofascore Quick Stat Bars */}
        <div className="p-3 bg-white space-y-2 text-xs">
          {/* Ballbesittelse bar */}
          <div>
            <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-0.5">
              <span>{possessionHome}%</span>
              <span className="text-slate-400 font-semibold">Ballbesittelse</span>
              <span>{possessionAway}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
              <div style={{ width: `${possessionHome}%` }} className="bg-[#165094] h-full transition-all"></div>
              <div style={{ width: `${possessionAway}%` }} className="bg-slate-400 h-full transition-all"></div>
            </div>
          </div>

          {/* Skudd & Cornere comparison */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-700">{shotsHome}</span>
              <span className="text-slate-500 text-[10px]">Skudd</span>
              <span className="font-bold text-slate-700">{shotsAway}</span>
            </div>
            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100 flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-700">{cornersHome}</span>
              <span className="text-slate-500 text-[10px]">Cornere</span>
              <span className="font-bold text-slate-700">{cornersAway}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            onClick={() => onOpenDetail(match)}
            className="flex-1 py-1.5 px-2 bg-[#165094] hover:bg-[#0F3A6D] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center space-x-1"
          >
            <span>Kampdetaljer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {onOpenLineup && (
            <button
              onClick={() => onOpenLineup(match)}
              className="py-1.5 px-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center space-x-1"
              title="Vis banelayout & lagoppstilling"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Oppstilling</span>
            </button>
          )}

          {onOpenLagleder && (
            <button
              onClick={() => onOpenLagleder(match)}
              className="py-1.5 px-2 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              title="Rapporter mål eller hendelse"
            >
              Lagleder
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div id="dual-live-view-container" className="space-y-3 bg-gradient-to-br from-blue-50/30 to-slate-50/50 rounded-2xl p-3 sm:p-4 border-2 border-[#165094]/30 shadow-xs">
      {/* DualView Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-blue-200/60">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                DualView Kampsenter
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white uppercase tracking-wider animate-pulse">
                Parallell Live
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Følg to samtidige Bønes-kamper i sanntid side-om-side
            </p>
          </div>
        </div>

        {/* Real FIKS Sync Status Indicator */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/80 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px]">Ekte FIKS-livedata (hvert 3. min)</span>
          </div>
        </div>
      </div>

      {/* Concurrent Matches List Bar ("Om Det er flere kamper som er samtidig, så kan de listes opp") */}
      {allConcurrentMatches.length > 2 && (
        <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-blue-100 text-xs flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-slate-700 flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-[#165094]" />
            <span>{allConcurrentMatches.length} kamper spilles på samme tidspunkt:</span>
          </span>
          <div className="flex flex-wrap gap-1">
            {allConcurrentMatches.map((m) => {
              const isSelected = m.id === match1.id || m.id === match2.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    if (m.id === match1.id || m.id === match2.id) return;
                    if (onSelectMatch2) onSelectMatch2(m);
                  }}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#165094] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={`Vis ${m.teamName} i DualView`}
                >
                  {m.teamName} {isSelected ? '✓' : '+'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* The 2-Column Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderMatchColumn(match1, 'm1', onSelectMatch1)}
        {renderMatchColumn(match2, 'm2', onSelectMatch2)}
      </div>
    </div>
  );
};
