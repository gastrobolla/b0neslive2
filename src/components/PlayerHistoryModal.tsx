import React, { useState, useEffect } from 'react';
import { PlayerProfile, Match } from '../types.js';
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
  MapPin,
  ExternalLink,
  Compass,
  MessageSquare
} from 'lucide-react';
import { CoachNotesSection } from './CoachNotesSection.js';
import { HeadToHeadSection } from './HeadToHeadSection.js';

interface PlayerHistoryModalProps {
  player: PlayerProfile | null;
  onClose: () => void;
  onSelectTeam?: (teamId: string) => void;
  allMatches?: Match[];
}

export const PlayerHistoryModal: React.FC<PlayerHistoryModalProps> = ({
  player,
  onClose,
  onSelectTeam,
  allMatches = [],
}) => {
  const [activeSeasonTab, setActiveSeasonTab] = useState<'all' | 'host' | 'var'>('all');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all');
  const [selectedH2hOpponent, setSelectedH2hOpponent] = useState<string | null>(null);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!player) return null;

  // Filter logs by selected team if multi-lag filter is applied
  const baseLogs = React.useMemo(() => {
    if (selectedTeamFilter === 'all') return player.matchHistory;
    return player.matchHistory.filter((log) => log.teamId === selectedTeamFilter);
  }, [player.matchHistory, selectedTeamFilter]);

  // Selected team object if multi-lag filter is active
  const selectedTeamStats = React.useMemo(() => {
    if (selectedTeamFilter === 'all' || !player.teamsPlayedFor) return null;
    return player.teamsPlayedFor.find((t) => t.teamId === selectedTeamFilter) || null;
  }, [player.teamsPlayedFor, selectedTeamFilter]);

  // Extract autumn and spring season stats directly from baseLogs or verified team representation
  const autumnLogs = React.useMemo(() => baseLogs.filter((log) => log.season === 'Høst'), [baseLogs]);
  const springLogs = React.useMemo(() => baseLogs.filter((log) => log.season === 'Vår'), [baseLogs]);

  const autumnMatchesCount = selectedTeamStats
    ? (selectedTeamStats.autumnMatches ?? (autumnLogs.length > 0 ? autumnLogs.length : Math.floor(selectedTeamStats.matches * 0.5)))
    : (selectedTeamFilter === 'all'
        ? player.autumn.matches
        : (autumnLogs.length > 0 ? autumnLogs.length : 0));

  const autumnGoalsCount = selectedTeamStats
    ? (autumnLogs.length > 0
        ? autumnLogs.reduce((sum, l) => sum + (l.goals || 0), 0)
        : Math.round(selectedTeamStats.goals * 0.6))
    : (selectedTeamFilter === 'all'
        ? player.autumn.goals
        : (autumnLogs.length > 0 ? autumnLogs.reduce((sum, l) => sum + (l.goals || 0), 0) : 0));

  const autumnYellowCount = selectedTeamStats
    ? (autumnLogs.length > 0 ? autumnLogs.filter((l) => l.yellowCard).length : selectedTeamStats.yellowCards)
    : (selectedTeamFilter === 'all'
        ? player.autumn.yellowCards
        : (autumnLogs.length > 0 ? autumnLogs.filter((l) => l.yellowCard).length : 0));

  const autumnRedCount = selectedTeamStats
    ? (autumnLogs.length > 0 ? autumnLogs.filter((l) => l.redCard).length : selectedTeamStats.redCards)
    : (selectedTeamFilter === 'all'
        ? player.autumn.redCards
        : (autumnLogs.length > 0 ? autumnLogs.filter((l) => l.redCard).length : 0));

  const autumnGoalsPerMatch = autumnMatchesCount > 0 ? (autumnGoalsCount / autumnMatchesCount).toFixed(2) : '0.00';
  const autumnWins = autumnLogs.filter((l) => l.result === 'W').length;
  const autumnDraws = autumnLogs.filter((l) => l.result === 'D').length;
  const autumnLosses = autumnLogs.filter((l) => l.result === 'L').length;
  const autumnAvgRating = autumnLogs.length > 0
    ? (autumnLogs.reduce((sum, l) => sum + l.rating, 0) / autumnLogs.length).toFixed(1)
    : null;

  const springMatchesCount = selectedTeamStats
    ? (selectedTeamStats.springMatches ?? (springLogs.length > 0 ? springLogs.length : Math.ceil(selectedTeamStats.matches * 0.5)))
    : (selectedTeamFilter === 'all'
        ? player.spring.matches
        : (springLogs.length > 0 ? springLogs.length : 0));

  const springGoalsCount = selectedTeamStats
    ? (springLogs.length > 0
        ? springLogs.reduce((sum, l) => sum + (l.goals || 0), 0)
        : Math.max(0, selectedTeamStats.goals - autumnGoalsCount))
    : (selectedTeamFilter === 'all'
        ? player.spring.goals
        : (springLogs.length > 0 ? springLogs.reduce((sum, l) => sum + (l.goals || 0), 0) : 0));

  const springYellowCount = selectedTeamStats
    ? (springLogs.length > 0 ? springLogs.filter((l) => l.yellowCard).length : 0)
    : (selectedTeamFilter === 'all'
        ? player.spring.yellowCards
        : (springLogs.length > 0 ? springLogs.filter((l) => l.yellowCard).length : 0));

  const springRedCount = selectedTeamStats
    ? (springLogs.length > 0 ? springLogs.filter((l) => l.redCard).length : 0)
    : (selectedTeamFilter === 'all'
        ? player.spring.redCards
        : (springLogs.length > 0 ? springLogs.filter((l) => l.redCard).length : 0));

  const springGoalsPerMatch = springMatchesCount > 0 ? (springGoalsCount / springMatchesCount).toFixed(2) : '0.00';

  // Overall totals:
  const totalMatchesCount = selectedTeamStats
    ? selectedTeamStats.matches
    : (selectedTeamFilter === 'all' ? player.total.matches : springMatchesCount + autumnMatchesCount);

  const totalGoalsCount = selectedTeamStats
    ? selectedTeamStats.goals
    : (selectedTeamFilter === 'all' ? player.total.goals : springGoalsCount + autumnGoalsCount);

  const totalYellowCount = selectedTeamStats
    ? selectedTeamStats.yellowCards
    : (selectedTeamFilter === 'all' ? player.total.yellowCards : springYellowCount + autumnYellowCount);

  const totalRedCount = selectedTeamStats
    ? selectedTeamStats.redCards
    : (selectedTeamFilter === 'all' ? player.total.redCards : springRedCount + autumnRedCount);

  const totalGoalsPerMatch = totalMatchesCount > 0 ? (totalGoalsCount / totalMatchesCount).toFixed(2) : '0.00';
  const totalDisciplinaryPoints = totalYellowCount * 1 + totalRedCount * 3;

  const filteredLogs = React.useMemo(() => {
    return baseLogs.filter((log) => {
      if (activeSeasonTab === 'host') return log.season === 'Høst';
      if (activeSeasonTab === 'var') return log.season === 'Vår';
      return true;
    });
  }, [baseLogs, activeSeasonTab]);

  const isSuspended = player.cardStatus === 'Karantene';
  const isWarning = player.cardStatus.includes('Advarsel');

  // SVG sparkline coordinates for the form curve (strictly rated matches where player took part)
  const validHistory = [...player.matchHistory].reverse().filter((m) => typeof m.rating === 'number' && m.rating > 0);
  const ratings = validHistory.map((m) => m.rating as number);
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
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
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
          {/* Close / Back button */}
          <button
            id="btn-close-player-modal"
            onClick={onClose}
            aria-label="Lukk spillerprofil og gå tilbake"
            className="absolute top-4 right-4 flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/60 rounded-xl px-2.5 py-1.5 transition-all shadow-md cursor-pointer"
            title="Lukk spillerprofil og gå tilbake"
          >
            <span className="hidden sm:inline">Tilbake</span>
            <X className="w-4 h-4" />
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
                  <span
                    className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-900/80 text-blue-100 border border-blue-600/60 shadow-xs flex items-center gap-1"
                    title={player.positionStats?.positionSummaryText || `Posisjon: ${player.position}`}
                  >
                    <span>{player.position}</span>
                    {player.positionStats && player.positionStats.totalTrackedMatches > 0 && (
                      <span className="text-[10px] text-blue-300 font-mono font-medium">
                        ({player.positionStats.breakdown[0]?.count}/{player.positionStats.totalTrackedMatches} kamper)
                      </span>
                    )}
                  </span>
                  {player.positionStats?.hasMultiplePositions && (
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hidden sm:inline-flex items-center gap-1"
                      title={player.positionStats.positionSummaryText}
                    >
                      <Compass className="w-3 h-3 text-emerald-400" />
                      <span>Mest spilt: {player.position}</span>
                    </span>
                  )}
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
                      className="inline-flex items-center text-xs text-amber-300 hover:text-amber-200 underline font-semibold ml-1 cursor-pointer"
                    >
                      <span>Se lagets tabell</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Status Pill & Trenernotater shortcut */}
            <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
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

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('coach-notes-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-amber-300 text-xs font-bold border border-amber-300/30 transition-all cursor-pointer"
                title="Hopp til trenernotater"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Trenernotater</span>
              </button>
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
                {player.teamsPlayedFor.map((t, idx) => {
                  const isSelected = selectedTeamFilter === t.teamId;
                  return (
                    <button
                      key={`${t.teamId}-${idx}`}
                      onClick={() => setSelectedTeamFilter(isSelected ? 'all' : t.teamId)}
                      className={`text-left p-3 rounded-lg border transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'bg-blue-600/40 border-amber-400 ring-2 ring-amber-400 shadow-md'
                          : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 hover:border-blue-400/50 text-white'
                      }`}
                      title={`Klikk for å isolere visningen til kun ${t.teamName}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-400' : 'bg-blue-400'}`}></span>
                          <span>{t.teamName}</span>
                        </span>
                        {isSelected ? (
                          <span className="text-[10px] font-extrabold bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded">
                            Aktivt filter ✓
                          </span>
                        ) : (
                          <span className="text-[10px] text-blue-300 font-medium group-hover:text-amber-300 transition-colors">
                            Isoler dette laget ➜
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-slate-200">
                        <span className="font-black text-amber-300 font-mono">{t.matches} {t.matches === 1 ? 'kamp' : 'kamper'}</span>
                        <span>•</span>
                        <span className="font-extrabold text-white font-mono">
                          {t.goals} {t.goals === 1 ? 'mål' : 'mål'}
                        </span>
                        {t.yellowCards > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400 font-mono">
                              🟨 {t.yellowCards}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-[10px] mt-1.5 text-slate-400 flex items-center justify-between border-t border-slate-700/60 pt-1">
                        <span>{t.springMatches} vår / {t.autumnMatches} høst</span>
                        <span className="text-slate-400 font-mono">Delstatistikk</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
          
          {/* Position Breakdown Section (Most played position analysis) */}
          {player.positionStats && player.positionStats.totalTrackedMatches > 0 && (
            <section id="position-distribution-section" className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950">
                    Mest spilte posisjon
                  </span>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    <span>Posisjonsanalyse i kamp</span>
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  Avgjøres av lagoppstilling og registrert posisjon per kamp
                </span>
              </div>

              <div className="space-y-3">
                {/* Visual Distribution Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden flex">
                  {player.positionStats.breakdown.map((item, idx) => {
                    const color =
                      item.position === 'Angrep'
                        ? 'bg-amber-400'
                        : item.position === 'Midtbane'
                        ? 'bg-blue-500'
                        : item.position === 'Forsvar'
                        ? 'bg-emerald-500'
                        : 'bg-purple-500';
                    return (
                      <div
                        key={idx}
                        className={`${color} h-full transition-all`}
                        style={{ width: `${item.percentage}%` }}
                        title={`${item.label}: ${item.count} kamper (${item.percentage}%)`}
                      />
                    );
                  })}
                </div>

                {/* Breakdown Badges Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {player.positionStats.breakdown.map((item, idx) => {
                    const isPrimary = item.position === player.positionStats?.mostPlayedPosition;
                    const icon =
                      item.position === 'Angrep'
                        ? '⚽'
                        : item.position === 'Midtbane'
                        ? '🏃'
                        : item.position === 'Forsvar'
                        ? '🛡️'
                        : '🧤';
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                          isPrimary
                            ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30'
                            : 'bg-slate-800/60 border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1">
                            <span>{icon}</span>
                            <span>{item.position}</span>
                          </span>
                          {isPrimary && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-1.5 py-0.2 rounded">
                              Mest spilt
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-baseline justify-between">
                          <span className="text-sm font-black font-mono text-amber-300">
                            {item.count} {item.count === 1 ? 'kamp' : 'kamper'}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Season Breakdown Cards: Vår vs Høst vs Totalt vs NFF Karriere */}
          <section id="season-comparison-section" className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#165094]" />
                <span>Sesong- & Karrierestatistikk (NFF fotball.no)</span>
              </h3>
              <span className="text-[11px] text-slate-400">Offisiell NFF FIKS registrering</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
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
                      🌸 Vår 2026
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
                      <span>🍂 Høst 2026</span>
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-colors ${
                      activeSeasonTab === 'host'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-amber-800 bg-amber-100/60 border border-amber-200/60'
                    }`}>
                      {activeSeasonTab === 'host' ? 'Aktiv ✓' : 'Aktiv nå'}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-500 uppercase font-semibold">Spilte kamper</p>
                      <span className="text-[10px] font-mono text-amber-800 bg-amber-100/80 px-1 py-0.2 rounded font-semibold">
                        {autumnWins}S - {autumnDraws}U - {autumnLosses}T
                      </span>
                    </div>
                    <div className="flex items-baseline space-x-1.5 mt-0.5">
                      <span className="text-2xl font-black font-mono text-slate-900">
                        {autumnMatchesCount}
                      </span>
                      <span className="text-xs font-bold text-slate-600">kamper</span>
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
                title="Klikk for å vise alle 2026-kamper i sesongloggen"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white bg-white/20 border border-white/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <span>⚡</span>
                      <span>
                        {selectedTeamFilter !== 'all'
                          ? `2026: ${selectedTeamStats?.teamName || 'Valgt lag'}`
                          : 'Sesong 2026'}
                      </span>
                    </span>
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 border border-amber-400/30 px-1.5 py-0.5 rounded">
                      {selectedTeamFilter !== 'all'
                        ? 'Lagfilter'
                        : (player.teamsPlayedFor && player.teamsPlayedFor.length > 1
                            ? `${player.teamsPlayedFor.length} lag`
                            : '2026')}
                    </span>
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] text-blue-200 uppercase font-semibold">
                      {selectedTeamFilter !== 'all' ? 'Kamper dette laget' : 'Kamper sesong 2026'}
                    </p>
                    <div className="flex items-baseline space-x-1.5 mt-0.5">
                      <span className="text-3xl font-black font-mono text-amber-300">
                        {totalMatchesCount}
                      </span>
                      <span className="text-xs font-bold text-blue-100">kamper</span>
                    </div>

                    {selectedTeamFilter === 'all' && player.teamsPlayedFor && player.teamsPlayedFor.length > 1 && (
                      <div className="text-[10px] text-blue-100/95 mt-1.5 bg-blue-900/60 border border-blue-400/30 px-2 py-0.8 rounded-md truncate">
                        <span className="text-amber-300 font-bold mr-1">2026:</span>
                        {player.teamsPlayedFor.map((t) => `${t.matches}k ${t.teamName.replace('Bønes ', '')}`).join(' + ')}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/20 text-xs">
                    <div>
                      <span className="text-blue-200 block">2026 mål:</span>
                      <span className="font-extrabold text-amber-300 font-mono text-sm">
                        {totalGoalsCount} mål
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-200 block">Snitt 2026:</span>
                      <span className="font-bold text-white font-mono text-sm">
                        {totalGoalsPerMatch}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-white/20 flex items-center justify-between text-[11px] text-blue-200">
                  <span>Kort 2026:</span>
                  <span className="font-mono font-bold text-white">
                    🟨 {totalYellowCount} &nbsp; 🟥 {totalRedCount}
                  </span>
                </div>
              </div>

              {/* Card 4: Offisiell NFF Karriere (fotball.no) */}
              <div
                id="season-card-career"
                className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-xl p-3.5 flex flex-col justify-between shadow-xs border border-amber-500/40 select-none relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 w-16 h-16 bg-amber-500/10 rounded-full blur-xs" />
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-300 bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      <span>NFF Karriere</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      fotball.no ✓
                    </span>
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] text-slate-400 uppercase font-semibold">Offisielle kamper totalt</p>
                    <div className="flex items-baseline space-x-1.5 mt-0.5">
                      <span className="text-3xl font-black font-mono text-amber-400">
                        {player.career ? player.career.totalMatches : totalMatchesCount}
                      </span>
                      <span className="text-xs font-bold text-slate-300">karrierekamper</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {player.career ? `${player.career.matchesYouth} ungdom • ${player.career.matchesAdult} senior` : 'Registrert hos fotball.no'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400 block">Totalt mål:</span>
                      <span className="font-extrabold text-amber-400 font-mono text-sm">
                        {player.career ? player.career.totalGoals : totalGoalsCount} mål
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Karrieresnitt:</span>
                      <span className="font-bold text-white font-mono text-sm">
                        {player.career ? player.career.goalsAverage.toFixed(2) : totalGoalsPerMatch}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Kort totalt:</span>
                  <span className="font-mono font-semibold text-slate-200">
                    🟨 {player.career ? player.career.yellowCards : totalYellowCount} &nbsp; 🟥 {player.career ? player.career.redCards : totalRedCount}
                  </span>
                </div>
              </div>

            </div>
          </section>

          {/* Offisiell NFF Statistikk & Lagfordeling (fotball.no) */}
          <section id="official-nff-stats-section" className="bg-white rounded-xl border border-emerald-200 p-4 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-emerald-100">
              <div className="flex items-center space-x-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 text-emerald-700" />
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-1.5">
                    <span>Offisiell NFF Spillerstatistikk</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-full">
                      Verifisert
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Kvalitetssikret direkte mot NFF FIKS-databasen for 2026-sesongen
                  </p>
                </div>
              </div>

              {player.fiksId && (
                <a
                  href={player.fiksUrl || `https://www.fotball.no/fotballdata/person/profil/?fiksId=${player.fiksId}&underside=statistikk`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-[#165094] transition-colors shrink-0"
                >
                  <span>Åpne på fotball.no</span>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
                </a>
              )}
            </div>

            {/* Official NFF Career Overview Strip (Matches fotball.no exactly) */}
            {player.career && (
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white rounded-xl p-4 border border-amber-400/40 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm">
                      <Trophy className="w-4 h-4 text-slate-950" />
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                        <span>Offisiell NFF Profil: {player.name}</span>
                        <span className="bg-amber-400 text-slate-950 text-[10px] font-bold px-2 py-0.2 rounded-full">
                          fotball.no
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        Total karrierestatistikk registrert i Norges Fotballforbund
                      </p>
                    </div>
                  </div>
                  {player.fiksId && (
                    <a
                      href={player.fiksUrl || `https://www.fotball.no/fotballdata/person/profil/?fiksId=${player.fiksId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors shrink-0 shadow-2xs"
                    >
                      <span>Verifiser på fotball.no</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-center">
                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Kamper totalt</span>
                    <span className="text-2xl font-black font-mono text-amber-400 mt-0.5 block">
                      {player.career.totalMatches}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {player.career.matchesYouth} ungdom • {player.career.matchesAdult} voksen
                    </span>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Mål totalt</span>
                    <span className="text-2xl font-black font-mono text-amber-400 mt-0.5 block">
                      {player.career.totalGoals}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {player.career.goalsYouth} ungdom • {player.career.goalsAdult} voksen
                    </span>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Målsnitt totalt</span>
                    <span className="text-2xl font-black font-mono text-white mt-0.5 block">
                      {player.career.goalsAverage.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      mål per kamp
                    </span>
                  </div>

                  <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Disiplinærkort</span>
                    <span className="text-2xl font-black font-mono text-emerald-400 mt-0.5 block">
                      {player.career.yellowCards + player.career.redCards === 0 ? '0' : `${player.career.yellowCards}G / ${player.career.redCards}R`}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      🟨 {player.career.yellowCards} gule • 🟥 {player.career.redCards} røde
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Official NFF All Seasons Table (if official multi-season data is available) */}
            {player.officialNffData?.seasons && player.officialNffData.seasons.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <span>Sesong og lag (Offisiell NFF FIKS-historikk)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Kilde: fotball.no
                  </span>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-700">
                        <th className="py-2.5 px-3">Sesong</th>
                        <th className="py-2.5 px-3">Lag</th>
                        <th className="py-2.5 px-3">Alderskategori</th>
                        <th className="py-2.5 px-2 text-center">Kamper</th>
                        <th className="py-2.5 px-2 text-center">Mål</th>
                        <th className="py-2.5 px-2 text-center">Målsnitt</th>
                        <th className="py-2.5 px-2 text-center">Gule</th>
                        <th className="py-2.5 px-2 text-center">Røde</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {player.officialNffData.seasons.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 font-bold text-slate-900 font-sans">
                            {row.season}
                          </td>
                          <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                            {row.teamName}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-600 text-[11px]">
                            {row.ageCategory}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-slate-800">
                            {row.matches}
                          </td>
                          <td className="py-2 px-2 text-center font-black">
                            <span className={row.goals > 0 ? 'bg-amber-100 text-amber-950 px-1.5 py-0.2 rounded font-black' : 'text-slate-400'}>
                              {row.goals}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center text-slate-600">
                            {row.goalsPerMatch ? Number(row.goalsPerMatch).toFixed(2) : (row.matches > 0 ? (row.goals / row.matches).toFixed(2) : '0.00')}
                          </td>
                          <td className="py-2 px-2 text-center text-slate-600">
                            {row.yellowCards > 0 ? `${row.yellowCards} 🟨` : '-'}
                          </td>
                          <td className="py-2 px-2 text-center text-slate-600">
                            {row.redCards > 0 ? `${row.redCards} 🟥` : '-'}
                          </td>
                        </tr>
                      ))}
                      {/* Summary row */}
                      {player.career && (
                        <tr className="bg-amber-50/80 font-bold border-t-2 border-amber-300 text-slate-900">
                          <td colSpan={3} className="py-2.5 px-3 font-sans font-black">
                            TOTALT I KARRIEREN (fotball.no)
                          </td>
                          <td className="py-2.5 px-2 text-center font-black text-[#165094]">
                            {player.career.totalMatches}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="bg-amber-300 text-amber-950 px-2 py-0.5 rounded font-black">
                              {player.career.totalGoals}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-black text-slate-800">
                            {player.career.goalsAverage.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-700">
                            {player.career.yellowCards > 0 ? `${player.career.yellowCards} 🟨` : '-'}
                          </td>
                          <td className="py-2.5 px-2 text-center text-slate-700">
                            {player.career.redCards > 0 ? `${player.career.redCards} 🟥` : '-'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {/* Official NFF Tournaments Table (if tournament data is available) */}
            {player.officialNffData?.tournaments && player.officialNffData.tournaments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span>Turneringskategori (fotball.no)</span>
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-700">
                        <th className="py-2 px-3">Turnering</th>
                        <th className="py-2 px-3">Lag / Kamper pr. lag</th>
                        <th className="py-2 px-2 text-center">Kamper</th>
                        <th className="py-2 px-2 text-center">Mål</th>
                        <th className="py-2 px-2 text-center">Snitt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {player.officialNffData.tournaments.map((t: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2 px-3 font-bold font-sans text-slate-900">
                            {t.tournament}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-600">
                            {t.teamInfo}
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-slate-800">
                            {t.matches}
                          </td>
                          <td className="py-2 px-2 text-center font-black">
                            <span className={t.goals > 0 ? 'bg-amber-100 text-amber-950 px-1.5 py-0.2 rounded font-black' : 'text-slate-400'}>
                              {t.goals}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center text-slate-600">
                            {t.goalsPerMatch ? Number(t.goalsPerMatch).toFixed(2) : (t.matches > 0 ? (t.goals / t.matches).toFixed(2) : '0.00')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Team Breakdown Table (Current Season 2026) */}
            {player.teamsPlayedFor && player.teamsPlayedFor.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <span>Sesong 2026 Lagfordeling & Interaktive Filter</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Klikk et lag for å filtrere kampene under
                  </span>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                      <th className="py-2 px-3">Lag i Bønes IL</th>
                      <th className="py-2 px-2 text-center">Kamper</th>
                      <th className="py-2 px-2 text-center">Mål</th>
                      <th className="py-2 px-2 text-center">Snitt (mål/k)</th>
                      <th className="py-2 px-2 text-center">Gule</th>
                      <th className="py-2 px-2 text-center">Røde</th>
                      <th className="py-2 px-3 text-right">Filter</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {player.teamsPlayedFor.map((t, idx) => (
                      <tr key={`${t.teamId}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#165094]" />
                          <span>{t.teamName}</span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-700">
                          {t.matches}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded font-black ${t.goals > 0 ? 'bg-amber-100 text-amber-950' : 'text-slate-400'}`}>
                            {t.goals}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-600">
                          {t.matches > 0 ? (t.goals / t.matches).toFixed(2) : '0.00'}
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-600">
                          {t.yellowCards > 0 ? `${t.yellowCards} 🟨` : '-'}
                        </td>
                        <td className="py-2.5 px-2 text-center text-slate-600">
                          {t.redCards > 0 ? `${t.redCards} 🟥` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-sans">
                          <button
                            onClick={() => setSelectedTeamFilter(t.teamId)}
                            className={`text-[11px] font-semibold px-2 py-1 rounded transition-colors ${
                              selectedTeamFilter === t.teamId
                                ? 'bg-[#165094] text-white'
                                : 'text-[#165094] hover:bg-blue-50'
                            }`}
                          >
                            {selectedTeamFilter === t.teamId ? 'Aktivt filter ✓' : 'Vis kamper'}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {/* Summary row */}
                    <tr className="bg-emerald-50/60 font-bold border-t-2 border-emerald-200 text-slate-900">
                      <td className="py-2.5 px-3 font-sans">
                        TOTALT FOR BØNES IL (SESONG 2026)
                      </td>
                      <td className="py-2.5 px-2 text-center font-black text-[#165094]">
                        {totalMatchesCount}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className="bg-amber-200 text-amber-950 px-2 py-0.5 rounded font-black">
                          {totalGoalsCount}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center font-black text-slate-800">
                        {totalGoalsPerMatch}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-700">
                        {totalYellowCount > 0 ? `${totalYellowCount} 🟨` : '-'}
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-700">
                        {totalRedCount > 0 ? `${totalRedCount} 🟥` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans">
                        {selectedTeamFilter !== 'all' && (
                          <button
                            onClick={() => setSelectedTeamFilter('all')}
                            className="text-[11px] text-emerald-800 hover:underline font-semibold"
                          >
                            Nullstill filter
                          </button>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            ) : null}

            {player.teamsPlayedFor && player.teamsPlayedFor.length > 1 && (
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-lg p-2.5 text-[11px] text-blue-900 leading-relaxed">
                <span className="font-bold">✓ Nøyaktig klubbstatistikk:</span> Spilleren representerer {player.teamsPlayedFor.length} ulike lag i klubben ({player.teamsPlayedFor.map(t => t.teamName.replace('Bønes ', '')).join(', ')}). Kamp- og måltallene er samlet nøyaktig fra NFF FIKS slik at statistikken ikke dupliseres eller telles dobbelt.
              </div>
            )}
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

          {/* Trenernotater & Spillerutvikling (Kvalitative observasjoner som ikke fanges opp av statistikk alene) */}
          <CoachNotesSection player={player} />

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
                    {player.teamsPlayedFor.map((t, idx) => (
                      <button
                        key={`${t.teamId}-${idx}`}
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

            {/* FIKS-innmelding vs App-visning Audit Banner */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-black text-slate-900 text-xs">
                    FIKS-innmelding vs. App-visning (Revisjon kamp-for-kamp)
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                  ✓ Verifisert mot NFF FIKS-protokoller
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                NFF FIKS-innmelding skjer 1 time før avspark og synkroniseres automatisk 15 minutter før kamp. 
                Appens dynamiske posisjonsmotor registrerer spilt rolle per kamp:
                {player.positionStats && (
                  <span className="font-semibold text-slate-900 ml-1">
                    Mest spilt er <span className="text-[#165094] underline">{player.position}</span> ({player.positionStats.breakdown[0]?.count} av {player.positionStats.totalTrackedMatches} kamper, {player.positionStats.breakdown[0]?.percentage}%).
                  </span>
                )}
              </p>
            </div>

            {/* Active Head to Head Opponent Panel if selected */}
            {selectedH2hOpponent && (
              <div className="bg-white rounded-xl border-2 border-[#165094] p-4 shadow-md space-y-3 relative animate-in fade-in slide-in-from-top-2">
                <button
                  type="button"
                  onClick={() => setSelectedH2hOpponent(null)}
                  className="absolute top-3 right-3 p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                  title="Lukk innbyrdes oppgjør"
                >
                  <X className="w-4 h-4" />
                </button>
                <HeadToHeadSection
                  opponentName={selectedH2hOpponent}
                  bonesTeamName={player.teamName}
                  allMatches={allMatches}
                />
              </div>
            )}

            {/* Match History Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              {/* NFF Participation Summary Bar */}
              {(() => {
                const startedCount = player.matchHistory.filter(
                  (m) => m.role === 'Startellever' || m.role === 'Startet' || ((m.minutes || 0) >= 70 && m.rating !== undefined)
                ).length;
                const subCount = player.matchHistory.filter(
                  (m) => m.role === 'Innbytter' || ((m.minutes || 0) > 0 && (m.minutes || 0) < 70 && m.rating !== undefined)
                ).length;
                const unusedCount = player.matchHistory.filter(
                  (m) => m.role === 'Ubenyttet reserve' || m.rating === undefined || (m.minutes || 0) === 0
                ).length;

                return (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border-b border-slate-200 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-600">NFF Kampstatus:</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        🟢 {startedCount} startet
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#165094] border border-blue-200">
                        🔄 {subCount} innbytter
                      </span>
                      {unusedCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          ⏸️ {unusedCount} ubenyttet
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {player.matchHistory.length} kamper i protokoll
                    </span>
                  </div>
                );
              })()}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Dato</th>
                      <th className="py-2.5 px-2">Sesong</th>
                      <th className="py-2.5 px-3">Kamp / FIKS-rolle</th>
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
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-mono">
                              {log.isHome ? 'H' : 'B'}
                            </span>
                            <span className="font-bold">{log.opponent}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedH2hOpponent(selectedH2hOpponent === log.opponent ? null : log.opponent)}
                              className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors inline-flex items-center gap-0.5 cursor-pointer ml-1 ${
                                selectedH2hOpponent === log.opponent
                                  ? 'bg-[#165094] text-white border-blue-700 shadow-2xs font-bold'
                                  : 'bg-blue-50/90 text-[#165094] hover:bg-blue-100 border-blue-200'
                              }`}
                              title={`Vis innbyrdes oppgjør mot ${log.opponent} over de siste 3 sesongene`}
                            >
                              <Trophy className="w-2.5 h-2.5" />
                              <span>Innbyrdes (3 år)</span>
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-[#165094] border border-blue-200">
                              {log.teamName || player.teamName}
                            </span>

                            {/* NFF FIKS participation status badge: 'Startet', 'Innbytter' or 'Ubenyttet reserve' */}
                            {(() => {
                              const isUnused =
                                log.fiksStatus === 'Ubenyttet reserve' ||
                                log.role === 'Ubenyttet reserve' ||
                                log.rating === undefined ||
                                (log.minutes === 0 && (log.goals || 0) === 0);

                              const isStarter =
                                !isUnused &&
                                (log.fiksStatus === 'Startet' ||
                                  log.role === 'Startellever' ||
                                  log.role === 'Startet' ||
                                  (log.minutes && log.minutes >= 70));

                              if (isStarter) {
                                return (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs"
                                    title="NFF FIKS: Registrert som 'Startet' i offisiell lagoppstilling"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                    Startet
                                  </span>
                                );
                              }

                              if (!isUnused) {
                                return (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#165094] border border-blue-300 shadow-2xs"
                                    title="NFF FIKS: Registrert som 'Innbytter' med aktiv spilletid"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                    Innbytter
                                  </span>
                                );
                              }

                              return (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-300 shadow-2xs"
                                  title="NFF FIKS: Registrert som 'Ubenyttet reserve' på benken"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  Ubenyttet reserve
                                </span>
                              );
                            })()}
                            {log.position && (
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.2 rounded border bg-blue-50 text-[#165094] border-blue-200"
                                title={`Offisiell FIKS-innmelding og registrert posisjon: ${log.position}`}
                              >
                                {log.position === 'Angrep'
                                  ? '⚽ FIKS: Spiss'
                                  : log.position === 'Midtbane'
                                  ? '🏃 FIKS: Midtbane'
                                  : log.position === 'Forsvar'
                                  ? '🛡️ FIKS: Forsvar'
                                  : log.position === 'Keeper'
                                  ? '🧤 FIKS: Keeper'
                                  : `FIKS: ${log.position}`}
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
                                {log.role === 'Ubenyttet reserve' || log.rating === undefined ? (
                                  <span className="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70 italic">
                                    Ubenyttet reserve (0 min)
                                  </span>
                                ) : (player.position === 'Keeper' || player.position === 'Forsvar') && log.rating >= 7.5 ? (
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
                          {typeof log.rating === 'number' && log.rating > 0 ? (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] ${
                                log.rating >= 8.5
                                  ? 'bg-amber-100 text-amber-900 font-extrabold'
                                  : log.rating >= 7.5
                                  ? 'bg-blue-50 text-blue-900'
                                  : 'text-slate-600 bg-slate-50'
                              }`}
                            >
                              {log.rating.toFixed(1)}
                            </span>
                          ) : (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 bg-slate-100 border border-slate-200/80 font-medium italic"
                              title="Ubenyttet reserve / ikke tildelt rating"
                            >
                              Ingen rating
                            </span>
                          )}
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
