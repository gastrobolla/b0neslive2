import React, { useState, useEffect } from 'react';
import { PlayerProfile } from '../types.js';
import {
  X,
  Trophy,
  Target,
  Flame,
  Calendar,
  AlertTriangle,
  Shield,
  TrendingUp,
  Award,
  CheckCircle,
  AlertOctagon,
  ChevronRight,
  Activity,
  ArrowUpRight,
  MapPin
} from 'lucide-react';

interface PlayerHistoryModalProps {
  player: PlayerProfile | null;
  onClose: () => void;
  onSelectTeam?: (teamId: string) => void;
}

export const PlayerHistoryModal: React.FC<PlayerHistoryModalProps> = ({
  player,
  onClose,
  onSelectTeam,
}) => {
  const [activeSeasonTab, setActiveSeasonTab] = useState<'all' | 'host' | 'var'>('all');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!player) return null;

  // Extract autumn season stats directly from match history logs where season is 'Høst'
  const autumnLogs = player.matchHistory.filter((log) => log.season === 'Høst');
  const autumnMatchesCount = autumnLogs.length > 0 ? autumnLogs.length : player.autumn.matches;
  const autumnGoalsCount = autumnLogs.length > 0 ? autumnLogs.reduce((sum, l) => sum + (l.goals || 0), 0) : player.autumn.goals;
  const autumnYellowCount = autumnLogs.filter((l) => l.yellowCard).length;
  const autumnRedCount = autumnLogs.filter((l) => l.redCard).length;
  const autumnGoalsPerMatch = autumnMatchesCount > 0 ? (autumnGoalsCount / autumnMatchesCount).toFixed(2) : '0.00';
  const autumnWins = autumnLogs.filter((l) => l.result === 'W').length;
  const autumnDraws = autumnLogs.filter((l) => l.result === 'D').length;
  const autumnLosses = autumnLogs.filter((l) => l.result === 'L').length;
  const autumnAvgRating = autumnLogs.length > 0
    ? (autumnLogs.reduce((sum, l) => sum + l.rating, 0) / autumnLogs.length).toFixed(1)
    : null;

  // Extract spring season stats directly from match history logs where season is 'Vår'
  const springLogs = player.matchHistory.filter((log) => log.season === 'Vår');
  const springMatchesCount = springLogs.length > 0 ? springLogs.length : player.spring.matches;
  const springGoalsCount = springLogs.length > 0 ? springLogs.reduce((sum, l) => sum + (l.goals || 0), 0) : player.spring.goals;
  const springYellowCount = springLogs.filter((l) => l.yellowCard).length;
  const springRedCount = springLogs.filter((l) => l.redCard).length;
  const springGoalsPerMatch = springMatchesCount > 0 ? (springGoalsCount / springMatchesCount).toFixed(2) : '0.00';

  // Overall totals derived from logs
  const totalMatchesCount = autumnMatchesCount + springMatchesCount;
  const totalGoalsCount = autumnGoalsCount + springGoalsCount;
  const totalYellowCount = autumnYellowCount + springYellowCount;
  const totalRedCount = autumnRedCount + springRedCount;
  const totalGoalsPerMatch = totalMatchesCount > 0 ? (totalGoalsCount / totalMatchesCount).toFixed(2) : '0.00';
  const totalDisciplinaryPoints = totalYellowCount * 1 + totalRedCount * 3;

  const filteredLogs = player.matchHistory.filter((log) => {
    if (selectedTeamFilter !== 'all' && log.teamId !== selectedTeamFilter) return false;
    if (activeSeasonTab === 'host') return log.season === 'Høst';
    if (activeSeasonTab === 'var') return log.season === 'Vår';
    return true;
  });

  const isSuspended = player.cardStatus === 'Karantene';
  const isWarning = player.cardStatus.includes('Advarsel');

  // SVG sparkline coordinates for the form curve
  const ratings = [...player.matchHistory].reverse().map((m) => m.rating);
  const minRating = 5.0;
  const maxRating = 10.0;
  const svgWidth = 400;
  const svgHeight = 64;
  const paddingX = 16;
  const paddingY = 8;
  const availableWidth = svgWidth - paddingX * 2;
  const availableHeight = svgHeight - paddingY * 2;

  const points = ratings.map((r, idx) => {
    const x = paddingX + (idx / Math.max(1, ratings.length - 1)) * availableWidth;
    const y = paddingY + availableHeight - ((r - minRating) / (maxRating - minRating)) * availableHeight;
    return { x, y, rating: r };
  });

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div
      id="player-history-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="player-history-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          id="player-modal-header"
          className="relative bg-gradient-to-r from-slate-950 via-[#0B2545] to-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 shrink-0"
        >
          {/* Close button */}
          <button
            id="btn-close-player-modal"
            onClick={onClose}
            aria-label="Lukk spillerprofil"
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-full p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-8">
            <div className="flex items-start sm:items-center space-x-3.5">
              {/* Jersey Number Badge */}
              <div className="relative shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-[#165094] to-[#0A2240] border-2 border-blue-400/40 shadow-inner flex flex-col items-center justify-center text-white">
                <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">Drakt</span>
                <span className="text-xl font-black font-mono leading-none text-amber-300">
                  #{player.jerseyNumber}
                </span>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#3E8A37] text-white">
                    Bønes IL
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-900/60 text-blue-200 border border-blue-700/50">
                    {player.position}
                  </span>
                  {player.fiksId && (
                    <a
                      href={player.fiksUrl || `https://www.fotball.no/fotballdata/person/profil/?fiksId=${player.fiksId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors flex items-center space-x-1 shadow-2xs"
                      title="Åpne offisiell NFF FIKS-profil hos fotball.no"
                    >
                      <span>FIKS: #{player.fiksId}</span>
                      <ArrowUpRight className="w-3 h-3 text-slate-950" />
                    </a>
                  )}
                  {player.teamsPlayedFor && player.teamsPlayedFor.length > 1 && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/40">
                      Spiller på {player.teamsPlayedFor.length} lag
                    </span>
                  )}
                  {player.topScorerRank && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-amber-400 text-slate-950 flex items-center space-x-1">
                      <Trophy className="w-3 h-3 text-slate-950 inline mr-0.5" />
                      <span>#{player.topScorerRank} Toppscorer</span>
                    </span>
                  )}
                  {player.recentGoalStreak ? (
                    <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-red-500/20 text-red-300 border border-red-500/40 flex items-center space-x-0.5">
                      <Flame className="w-3 h-3 text-red-400 inline mr-0.5" />
                      <span>{player.recentGoalStreak} kamper på rad</span>
                    </span>
                  ) : null}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                  {player.name}
                </h2>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 mt-0.5">
                  <span className="font-semibold text-blue-200">{player.teamName}</span>
                  <span>•</span>
                  <span>{player.division}</span>
                  {onSelectTeam && (
                    <button
                      onClick={() => {
                        onSelectTeam(player.teamId);
                        onClose();
                      }}
                      className="inline-flex items-center text-xs text-amber-300 hover:text-amber-200 underline font-semibold ml-1"
                    >
                      <span>Se lagets tabell</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="sm:text-right shrink-0">
              <span
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                  isSuspended
                    ? 'bg-red-600 text-white shadow-xs'
                    : isWarning
                    ? 'bg-amber-400 text-slate-950 font-extrabold shadow-xs'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {isSuspended ? (
                  <>
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>Karantenestatus: Soner</span>
                  </>
                ) : isWarning ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Advarsel: 1 gult fra soning</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Disiplinær: Spilleklar</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">

          {/* Multi-Team Participation Section (when player has played for multiple teams) */}
          {player.teamsPlayedFor && player.teamsPlayedFor.length > 1 && (
            <section id="multi-team-breakdown-section" className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-900/60 rounded-xl p-4 shadow-xs text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                      Multi-lag spiller
                    </span>
                    {player.fiksId && (
                      <span className="text-xs text-blue-200 font-mono">
                        FiksID: #{player.fiksId}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1">
                    Spiller på tvers av flere lag ({player.teamsPlayedFor.length} lag)
                  </h3>
                  <p className="text-xs text-slate-300">
                    Sesongloggen og statistikken under er slått sammen for alle kamper spilleren har spilt for Bønes IL. Klikk på et lag for å filtrere kampene:
                  </p>
                </div>
                {selectedTeamFilter !== 'all' && (
                  <button
                    onClick={() => setSelectedTeamFilter('all')}
                    className="self-start sm:self-auto text-xs px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-colors shrink-0"
                  >
                    Nullstill lagfilter (vis alle)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {player.teamsPlayedFor.map((t) => {
                  const isSelected = selectedTeamFilter === t.teamId;
                  return (
                    <button
                      key={t.teamId}
                      onClick={() => setSelectedTeamFilter(isSelected ? 'all' : t.teamId)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-blue-600/40 border-amber-400 ring-2 ring-amber-400 shadow-md'
                          : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">
                          {t.teamName}
                        </span>
                        {isSelected ? (
                          <span className="text-[10px] font-extrabold bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded">
                            Aktivt filter ✓
                          </span>
                        ) : (
                          <span className="text-[10px] text-blue-300">
                            Vis kun dette ➜
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-200">
                        <span className="font-semibold">{t.matches} {t.matches === 1 ? 'kamp' : 'kamper'}</span>
                        <span>•</span>
                        <span className="font-bold text-amber-300">
                          {t.goals} {t.goals === 1 ? 'mål' : 'mål'}
                        </span>
                        {t.yellowCards > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400">
                              🟨 {t.yellowCards}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-[10px] mt-1 text-slate-400">
                        {t.springMatches} vår / {t.autumnMatches} høst
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          
          {/* Season Breakdown Cards: Vår vs Høst vs Totalt */}
          <section id="season-comparison-section" className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#165094]" />
                <span>Sesongstatistikk 2026: Vår vs. Høst</span>
              </h3>
              <span className="text-[11px] text-slate-400">Offisiell NFF Hordaland registrering</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* Card 1: Vårsesongen 2026 */}
              <div
                id="season-card-spring"
                onClick={() => setActiveSeasonTab('var')}
                className={`bg-slate-50 border rounded-xl p-3.5 flex flex-col justify-between transition-all cursor-pointer select-none ${
                  activeSeasonTab === 'var'
                    ? 'border-emerald-500 ring-2 ring-emerald-400 bg-emerald-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-emerald-300'
                }`}
                title="Klikk for å filtrere sesongloggen for Vår"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md">
                      🌸 Vårsesong 2026
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      activeSeasonTab === 'var' ? 'bg-emerald-200 text-emerald-900 font-bold' : 'text-slate-500'
                    }`}>
                      {activeSeasonTab === 'var' ? 'I logg ✓' : 'Fullført'}
                    </span>
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] text-slate-500 uppercase font-semibold">Spilte kamper</p>
                    <div className="flex items-baseline space-x-1 mt-0.5">
                      <span className="text-2xl font-black font-mono text-slate-900">
                        {springMatchesCount}
                      </span>
                      <span className="text-xs font-bold text-slate-600">kamper</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500 block">Mål i vår:</span>
                      <span className="font-extrabold text-red-600 font-mono text-sm">
                        {springGoalsCount} mål
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Snitt/kamp:</span>
                      <span className="font-bold text-slate-700 font-mono text-sm">
                        {springGoalsPerMatch}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Kort vår:</span>
                  <span className="font-mono font-semibold">
                    🟨 {springYellowCount} &nbsp; 🟥 {springRedCount}
                  </span>
                </div>
              </div>

              {/* Card 2: Høstsesongen 2026 */}
              <div
                id="season-card-autumn"
                onClick={() => setActiveSeasonTab('host')}
                className={`relative border rounded-xl p-3.5 flex flex-col justify-between transition-all cursor-pointer select-none ${
                  activeSeasonTab === 'host'
                    ? 'bg-gradient-to-b from-amber-100/95 via-amber-50/80 to-white border-amber-400 ring-2 ring-amber-400 shadow-md'
                    : 'bg-gradient-to-b from-amber-50/60 via-amber-50/30 to-white border-amber-200/90 hover:border-amber-300 hover:shadow-xs'
                }`}
                title="Klikk for å filtrere sesongloggen for Høst"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-extrabold text-amber-950 bg-amber-200/90 border border-amber-300/90 px-2 py-0.5 rounded-md flex items-center space-x-1">
                      <span>🍂 Høstsesong 2026</span>
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-colors ${
                      activeSeasonTab === 'host'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-amber-800 bg-amber-100/60 border border-amber-200/60'
                    }`}>
                      {activeSeasonTab === 'host' ? 'Aktiv i logg ✓' : 'Aktiv nå'}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-500 uppercase font-semibold">Spilte kamper (sesonglogg)</p>
                      <span className="text-[10px] font-mono text-amber-800 bg-amber-100/80 px-1 py-0.2 rounded font-semibold">
                        {autumnWins}S - {autumnDraws}U - {autumnLosses}T
                      </span>
                    </div>
                    <div className="flex items-baseline space-x-1.5 mt-0.5">
                      <span className="text-2xl font-black font-mono text-slate-900">
                        {autumnMatchesCount}
                      </span>
                      <span className="text-xs font-bold text-slate-600">kamper i høst</span>
                    </div>
                    <p className="text-[10px] text-amber-900/70 truncate mt-0.5 font-medium">
                      Tabell: Høst ({player.autumn.divisionName || player.division})
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-amber-200/80 text-xs">
                    <div>
                      <span className="text-slate-500 block">Mål i høst:</span>
                      <div className="flex items-baseline space-x-1">
                        <span className="font-extrabold text-red-600 font-mono text-sm">
                          {autumnGoalsCount} mål
                        </span>
                        {autumnGoalsCount > 0 && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({autumnGoalsPerMatch}/k)
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Børs / form:</span>
                      <span className="font-bold text-slate-800 font-mono text-sm">
                        {autumnAvgRating ? `⭐ ${autumnAvgRating}` : `${autumnGoalsPerMatch} snitt`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-amber-200/80 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Kort høst:</span>
                  <span className="font-mono font-semibold">
                    🟨 {autumnYellowCount} &nbsp; 🟥 {autumnRedCount}
                  </span>
                </div>
              </div>

              {/* Card 3: Totalt for sesongen 2026 */}
              <div
                id="season-card-total"
                onClick={() => setActiveSeasonTab('all')}
                className={`bg-gradient-to-br from-[#0B2545] to-[#165094] text-white rounded-xl p-3.5 flex flex-col justify-between shadow-xs transition-all cursor-pointer select-none ${
                  activeSeasonTab === 'all' ? 'ring-2 ring-amber-300' : 'hover:opacity-95'
                }`}
                title="Klikk for å vise alle kamper i sesongloggen"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white bg-white/20 border border-white/30 px-2 py-0.5 rounded-md">
                      ⚡ Samlet Sesong 2026
                    </span>
                    <span className="text-[11px] text-blue-200">
                      {activeSeasonTab === 'all' ? 'Alle i logg ✓' : 'Vår + Høst'}
                    </span>
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] text-blue-200 uppercase font-semibold">Totalt spilte kamper</p>
                    <div className="flex items-baseline space-x-1 mt-0.5">
                      <span className="text-3xl font-black font-mono text-amber-300">
                        {totalMatchesCount}
                      </span>
                      <span className="text-xs font-bold text-blue-100">kamper</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/20 text-xs">
                    <div>
                      <span className="text-blue-200 block">Totalt mål:</span>
                      <span className="font-extrabold text-amber-300 font-mono text-sm">
                        {totalGoalsCount} mål
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-200 block">Totalt snitt:</span>
                      <span className="font-bold text-white font-mono text-sm">
                        {totalGoalsPerMatch}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-white/20 flex items-center justify-between text-[11px] text-blue-200">
                  <span>Disiplinærpoeng:</span>
                  <span className="font-mono font-bold text-white">
                    {totalDisciplinaryPoints} p ({totalYellowCount}G / {totalRedCount}R)
                  </span>
                </div>
              </div>

            </div>
          </section>

          {/* Formkurve & Momentum */}
          <section id="player-form-curve-section" className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <TrendingUp className="w-4 h-4 text-[#165094]" />
                  <span>Formkurve & Kampinnsats</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Prestasjonsutvikling og kampbørs i offisielle NFF-oppgjør
                </p>
              </div>

              {/* Form Pills */}
              <div className="flex items-center space-x-1 self-start sm:self-auto">
                <span className="text-xs text-slate-500 mr-1.5 font-medium">Siste 5:</span>
                {player.formSummary.map((res, i) => (
                  <span
                    key={i}
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono font-black ${
                      res === 'W'
                        ? 'bg-emerald-500 text-white'
                        : res === 'D'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-red-500 text-white'
                    }`}
                    title={res === 'W' ? 'Seier' : res === 'D' ? 'Uavgjort' : 'Tap'}
                  >
                    {res}
                  </span>
                ))}
              </div>
            </div>

            {/* Visual Sparkline Graph */}
            {ratings.length > 1 && (
              <div className="bg-white rounded-lg p-3 border border-slate-200/80">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>Formbørs (skala 5 - 10)</span>
                  <span className="font-semibold text-blue-900">
                    Snittvurdering: {(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)} / 10
                  </span>
                </div>

                <div className="w-full overflow-hidden">
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-16 overflow-visible"
                  >
                    {/* Grid lines */}
                    <line
                      x1={paddingX}
                      y1={paddingY}
                      x2={svgWidth - paddingX}
                      y2={paddingY}
                      stroke="#e2e8f0"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={paddingX}
                      y1={svgHeight / 2}
                      x2={svgWidth - paddingX}
                      y2={svgHeight / 2}
                      stroke="#e2e8f0"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={paddingX}
                      y1={svgHeight - paddingY}
                      x2={svgWidth - paddingX}
                      y2={svgHeight - paddingY}
                      stroke="#e2e8f0"
                      strokeDasharray="3 3"
                    />

                    {/* Polyline */}
                    <polyline
                      fill="none"
                      stroke="#165094"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={polylineStr}
                    />

                    {/* Data Points */}
                    {points.map((p, idx) => (
                      <g key={idx}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={p.rating >= 8.5 ? 4.5 : 3.5}
                          className={p.rating >= 8.5 ? 'fill-amber-400 stroke-slate-900' : 'fill-blue-600 stroke-white'}
                          strokeWidth="1.5"
                        />
                      </g>
                    ))}
                  </svg>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>Tidligste kamp</span>
                  <span>Trend: {player.formTrend === 'rising' ? '↗ Stigende form' : player.formTrend === 'declining' ? '↘ Avtagende' : '➡️ Stabil innsats'}</span>
                  <span>Siste kamp</span>
                </div>
              </div>
            )}
          </section>

          {/* Detailed Match History Timeline */}
          <section id="player-match-log-section" className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <Activity className="w-4 h-4 text-[#165094]" />
                  <span>Kamp-for-kamp sesonglogg ({filteredLogs.length} kamper)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {player.teamsPlayedFor && player.teamsPlayedFor.length > 1
                    ? `Offisielle kamper spilt for Bønes IL (${player.teamsPlayedFor.map((t) => t.teamName).join(', ')}) i 2026`
                    : `Offisielle kamper spilt for ${player.teamName} i 2026`}
                </p>
              </div>

              {/* Season and Team Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto text-xs">
                {player.teamsPlayedFor && player.teamsPlayedFor.length > 1 && (
                  <div className="flex items-center space-x-1 bg-blue-50 p-1 rounded-lg border border-blue-200">
                    <button
                      onClick={() => setSelectedTeamFilter('all')}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                        selectedTeamFilter === 'all'
                          ? 'bg-[#165094] text-white shadow-2xs'
                          : 'text-[#165094] hover:bg-blue-100'
                      }`}
                    >
                      Alle lag ({player.matchHistory.length})
                    </button>
                    {player.teamsPlayedFor.map((t) => (
                      <button
                        key={t.teamId}
                        onClick={() => setSelectedTeamFilter(t.teamId)}
                        className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                          selectedTeamFilter === t.teamId
                            ? 'bg-[#165094] text-white shadow-2xs'
                            : 'text-[#165094] hover:bg-blue-100'
                        }`}
                      >
                        {t.teamName.replace('Bønes ', '')} ({t.matches})
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setActiveSeasonTab('all')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      activeSeasonTab === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Alle
                  </button>
                  <button
                    onClick={() => setActiveSeasonTab('host')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      activeSeasonTab === 'host'
                        ? 'bg-amber-100 text-amber-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🍂 Høst
                  </button>
                  <button
                    onClick={() => setActiveSeasonTab('var')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      activeSeasonTab === 'var'
                        ? 'bg-emerald-100 text-emerald-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🌸 Vår
                  </button>
                </div>
              </div>
            </div>

            {/* Match History Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Dato</th>
                      <th className="py-2.5 px-2">Sesong</th>
                      <th className="py-2.5 px-3">Kamp / Lag</th>
                      <th className="py-2.5 px-2 text-center">Res.</th>
                      <th className="py-2.5 px-3 text-center">Spillerbidrag</th>
                      <th className="py-2.5 px-2 text-center">Børs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-slate-500">
                          {log.date}
                        </td>

                        <td className="py-2.5 px-2 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              log.season === 'Høst'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {log.season}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                              {log.isHome ? 'H' : 'B'}
                            </span>
                            <span>{log.opponent}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-[#165094] border border-blue-200">
                              {log.teamName || player.teamName}
                            </span>
                            {log.role && (
                              <span className="text-[10px] font-medium text-slate-500">
                                • {log.role}
                              </span>
                            )}
                            {log.highlight && log.highlight.startsWith('⚽') && (
                              <span className="text-[10px] font-bold text-red-600">
                                • {log.highlight}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-2 text-center font-mono whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${
                              log.result === 'W'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.result === 'D'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {log.score}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5 flex-wrap">
                            {log.goals > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold font-mono text-[11px]">
                                ⚽ {log.goals} {log.goals > 1 ? 'mål' : 'mål'}
                              </span>
                            )}
                            {log.yellowCard && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[11px]">
                                🟨 Gult
                              </span>
                            )}
                            {log.redCard && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-600 text-white font-bold text-[11px]">
                                🟥 Rødt
                              </span>
                            )}
                            {log.goals === 0 && !log.yellowCard && !log.redCard && (
                              <span className="text-slate-500 text-[11px] inline-flex items-center gap-1 font-medium">
                                {(player.position === 'Keeper' || player.position === 'Forsvar') && log.rating >= 7.5 ? (
                                  <span className="text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    🛡️ Solid innsats ({log.minutes} min)
                                  </span>
                                ) : (
                                  <span>{log.minutes} min spilt</span>
                                )}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-2 text-center font-mono font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              log.rating >= 8.5
                                ? 'bg-amber-100 text-amber-900 font-extrabold'
                                : log.rating >= 7.5
                                ? 'bg-blue-50 text-blue-900'
                                : 'text-slate-600'
                            }`}
                          >
                            {log.rating.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center space-x-1.5">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Klubb: Bønes Idrettslag • Kilde: NFF fotball.no & FIKS</span>
          </div>

          <button
            id="btn-close-modal-bottom"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold transition-colors"
          >
            Lukk
          </button>
        </div>

      </div>
    </div>
  );
};
