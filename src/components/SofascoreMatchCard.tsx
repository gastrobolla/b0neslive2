import React from 'react';
import { Match } from '../types.js';
import { Star, Shield, ChevronRight, Binoculars, PlusCircle, Trophy, Vote } from 'lucide-react';
import { WeatherWidget } from './WeatherWidget.js';
import { AddToCalendarButton } from './AddToCalendarButton.js';
import { calculateMatchPOTM } from '../utils/potmCalculator.js';

interface SofascoreMatchCardProps {
  match: Match;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onOpenDetail: () => void;
  onOpenLineup?: () => void;
  onOpenScout?: (match: Match) => void;
  onOpenReport?: (match: Match) => void;
  onOpenPOTM?: (match: Match) => void;
}

export const SofascoreMatchCard: React.FC<SofascoreMatchCardProps> = ({
  match,
  isFavorite,
  onToggleFavorite,
  onOpenDetail,
  onOpenLineup,
  onOpenScout,
  onOpenReport,
  onOpenPOTM,
}) => {

  const isBonesHome = match.homeTeam.toLowerCase().includes('bønes');
  const isBonesAway = match.awayTeam.toLowerCase().includes('bønes');
  const opponentName = isBonesHome ? match.awayTeam : match.homeTeam;
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

  // Banens Beste (POTM) status & leader
  const potm = match.playerOfTheMatch || (isFinished || isLive ? calculateMatchPOTM(match) : undefined);
  const leader = potm?.candidates?.find((c) => c.playerName === potm.winnerName) || potm?.candidates?.[0];
  const isPotmDecided = Boolean(potm?.status === 'decided' || isFinished);
  const isPotmVotingOpen = Boolean(isLive || (isFinished && potm?.status === 'voting_open'));

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
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 border-b border-slate-100 pb-1.5 gap-2">
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
            {/* Direct Banens Beste Star Badge in Header */}
            {leader && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenPOTM) onOpenPOTM(match);
                  else onOpenDetail();
                }}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black cursor-pointer transition-all shadow-2xs shrink-0 ${
                  isPotmDecided
                    ? 'bg-gradient-to-r from-amber-100 via-amber-200 to-amber-100 text-amber-950 border border-amber-300 hover:border-amber-400'
                    : 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 hover:brightness-105 shadow-xs'
                }`}
                title={
                  isPotmDecided
                    ? `Banens Beste er kåret: ${leader.playerName} (Score ${leader.algoRating.toFixed(1)})`
                    : `Stemmegivning er åpen! Leder: ${leader.playerName} (Score ${leader.algoRating.toFixed(1)})`
                }
              >
                <Star
                  className={`w-3 h-3 shrink-0 ${
                    isPotmDecided ? 'fill-amber-500 text-amber-600' : 'fill-slate-950 text-slate-950'
                  }`}
                />
                <span className="truncate max-w-[110px] sm:max-w-[160px]">
                  {isPotmDecided ? 'Banens beste: ' : 'Leder: '}
                  {leader.playerName}
                </span>
                <span className="font-mono text-[9px] bg-black/10 px-1 rounded font-black shrink-0">
                  {leader.algoRating.toFixed(1)}
                </span>
              </button>
            )}
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            {onOpenScout && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenScout(match);
                }}
                className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-colors flex items-center gap-1"
                title={`Speiderrapport for ${opponentName}`}
              >
                <Binoculars className="w-3 h-3 text-indigo-600" />
                <span>Speider</span>
              </button>
            )}
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
            {onOpenReport && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenReport(match);
                }}
                className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 hover:bg-blue-100 text-[#165094] border border-blue-200/80 transition-colors flex items-center gap-1 cursor-pointer"
                title="Meld inn mål, assist, bytte, kort eller status"
              >
                <PlusCircle className="w-3 h-3 text-[#165094]" />
                <span>Hendelse</span>
              </button>
            )}
            <AddToCalendarButton match={match} variant="compact" />
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

            {/* Direct POTM star pill under status */}
            {leader && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenPOTM) onOpenPOTM(match);
                  else onOpenDetail();
                }}
                className={`mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black cursor-pointer transition-all hover:scale-105 shadow-2xs ${
                  isPotmDecided
                    ? 'bg-amber-100 text-amber-950 border border-amber-300'
                    : 'bg-amber-400 text-slate-950 animate-pulse'
                }`}
                title={
                  isPotmDecided
                    ? `Banens Beste: ${leader.playerName} (★ ${leader.algoRating.toFixed(1)})`
                    : `Stemmegivning åpen! Leder: ${leader.playerName}`
                }
              >
                <Star className="w-2.5 h-2.5 fill-current" />
                <span>POTM</span>
              </button>
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

        {/* Pitch Weather & Condition Strip */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
          <WeatherWidget match={match} variant="compact" />
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenScout && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenScout(match);
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-colors cursor-pointer"
                title={`Speiderrapport for ${opponentName}`}
              >
                <Binoculars className="w-3 h-3 text-indigo-600" />
                <span>Speider</span>
              </button>
            )}
            <span className="text-[10px] text-slate-400 font-medium truncate hidden sm:inline max-w-[140px]">
              {match.division}
            </span>
          </div>
        </div>

        {/* Banens Beste (Player of the Match) Strip */}
        {leader && potm && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenPOTM) onOpenPOTM(match);
              else onOpenDetail();
            }}
            className={`mt-2 pt-2 border-t flex items-center justify-between text-xs transition-colors -mx-3 px-3 sm:-mx-4 sm:px-4 py-2 cursor-pointer group ${
              isPotmDecided
                ? 'bg-amber-50/70 hover:bg-amber-100/90 border-t-amber-200/60'
                : 'bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 hover:bg-amber-100/80 border-t-amber-300/70'
            }`}
            title="Trykk for å se spillerbørs, live stemmefordeling og avgi stemme"
          >
            <div className="flex items-center space-x-2 min-w-0">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${
                  isPotmDecided
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300/60'
                    : 'bg-amber-400 text-slate-950 animate-pulse'
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-current" />
              </div>
              <div className="flex items-center space-x-1.5 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 shrink-0 flex items-center gap-1">
                  {isPotmDecided ? (
                    <>
                      <Trophy className="w-3 h-3 text-amber-600 inline" />
                      <span>Banens beste:</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
                      <span>Stem åpen:</span>
                    </>
                  )}
                </span>
                <span className="font-extrabold text-slate-900 truncate">
                  {leader.playerName}
                </span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 text-[10px] font-mono font-black shrink-0">
                  <Star className="w-2.5 h-2.5 fill-slate-950" />
                  {leader.algoRating.toFixed(1)}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0 ml-2">
              <span className="text-[10px] text-slate-500 font-semibold hidden xs:inline">
                {potm.totalVotes} {potm.totalVotes === 1 ? 'stemme' : 'stemmer'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-white group-hover:bg-amber-500 group-hover:text-white text-slate-800 border border-amber-300 transition-all shadow-2xs">
                <Vote className="w-3 h-3 text-amber-500 group-hover:text-white" />
                <span>{isPotmDecided ? 'Se kåring' : 'Stem'}</span>
              </span>
            </div>
          </div>
        )}


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
