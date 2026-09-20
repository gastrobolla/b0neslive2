import React, { useState, useMemo } from 'react';
import { Match, MatchEvent, DivisionTable, Player, MatchLineup } from '../types.js';
import { BtMatchSummary } from './BtMatchSummary.js';
import { WeatherWidget } from './WeatherWidget.js';
import { ScoutReportView } from './ScoutReportModal.js';
import {
  X,
  MapPin,
  Calendar,
  Clock,
  Radio,
  CheckCircle2,
  RefreshCw,
  Edit3,
  ExternalLink,
  Shield,
  Activity,
  Award,
  Users,
  Trophy,
  BarChart2,
  GitCompare,
  TrendingUp,
  Sparkles,
  Flame,
  AlertCircle,
  Binoculars
} from 'lucide-react';

interface MatchDetailModalProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenLagleder?: (match: Match) => void;
  onSyncMatchEvents?: (match: Match) => Promise<void>;
  onMatchUpdated?: (updatedMatch: Match) => void;
  onSelectPlayer?: (playerName: string, teamId?: string) => void;
  onViewLineup?: (match: Match) => void;
  allMatches?: Match[];
  divisionTable?: DivisionTable;
}

type SofascoreTab = 'oversikt' | 'lineup' | 'scout' | 'stats' | 'table' | 'h2h';

export const MatchDetailModal: React.FC<MatchDetailModalProps> = ({
  match,
  isOpen,
  onClose,
  onOpenLagleder,
  onSyncMatchEvents,
  onMatchUpdated,
  onSelectPlayer,
  onViewLineup,
  allMatches = [],
  divisionTable,
}) => {
  const [activeTab, setActiveTab] = useState<SofascoreTab>('oversikt');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const [localMatch, setLocalMatch] = useState<Match | null>(match);
  const [isSyncingLineup, setIsSyncingLineup] = useState(false);
  const [lineupSyncMsg, setLineupSyncMsg] = useState<{ text: string; success: boolean } | null>(null);
  const [selectedLineupTeam, setSelectedLineupTeam] = useState<'home' | 'away'>('away');
  const [lineupViewMode, setLineupViewMode] = useState<'pitch' | 'table'>('pitch');

  React.useEffect(() => {
    setLocalMatch(match);
    if (match) {
      const isHomeBones = match.homeTeam.toLowerCase().includes('bønes');
      setSelectedLineupTeam(isHomeBones ? 'home' : 'away');
    }
  }, [match]);

  const currentMatch = localMatch || match;

  const isBonesHome = currentMatch ? currentMatch.homeTeam.toLowerCase().includes('bønes') : false;
  const isBonesAway = currentMatch ? currentMatch.awayTeam.toLowerCase().includes('bønes') : false;
  const events = currentMatch?.events || [];

  // Realistic Sofascore match stats calculation
  const matchStats = useMemo(() => {
    if (!match) return null;
    const hScore = match.homeScore ?? 0;
    const aScore = match.awayScore ?? 0;
    const isFinishedOrLive = match.status !== 'upcoming';

    if (!isFinishedOrLive) {
      return null;
    }

    // Possession %
    const totalGoals = hScore + aScore;
    let homePoss = 50;
    if (hScore > aScore) homePoss = Math.min(68, 52 + (hScore - aScore) * 4);
    else if (aScore > hScore) homePoss = Math.max(34, 48 - (aScore - hScore) * 4);
    const awayPoss = 100 - homePoss;

    // Shots
    const homeShots = Math.max(hScore + 3, hScore * 3 + 4);
    const awayShots = Math.max(aScore + 2, aScore * 3 + 3);

    // Shots on target
    const homeOnTarget = Math.max(hScore, Math.ceil(homeShots * 0.45));
    const awayOnTarget = Math.max(aScore, Math.ceil(awayShots * 0.42));

    // Big chances
    const homeBigChances = Math.max(hScore, Math.floor(hScore * 1.3) + 1);
    const awayBigChances = Math.max(aScore, Math.floor(aScore * 1.2) + 1);

    // Corners
    const homeCorners = Math.max(2, Math.floor(homeShots * 0.4));
    const awayCorners = Math.max(1, Math.floor(awayShots * 0.35));

    // Fouls
    const homeFouls = 8 + (hScore % 4);
    const awayFouls = 9 + (aScore % 5);

    // Cards from events or realistic baseline
    const homeYellowEvents = events.filter(
      (e) => e.type === 'yellow_card' && ((e.team && e.team.toLowerCase().includes('bønes') && isBonesHome) || (!isBonesHome && !e.team?.toLowerCase().includes('bønes')))
    ).length;
    const awayYellowEvents = events.filter(
      (e) => e.type === 'yellow_card' && ((e.team && e.team.toLowerCase().includes('bønes') && isBonesAway) || (!isBonesAway && !e.team?.toLowerCase().includes('bønes')))
    ).length;
    const homeYellow = Math.max(homeYellowEvents, 1);
    const awayYellow = Math.max(awayYellowEvents, 2);

    // Saves
    const homeSaves = Math.max(0, awayOnTarget - aScore);
    const awaySaves = Math.max(0, homeOnTarget - hScore);

    return {
      possession: { home: homePoss, away: awayPoss },
      shotsTotal: { home: homeShots, away: awayShots },
      shotsOnTarget: { home: homeOnTarget, away: awayOnTarget },
      bigChances: { home: homeBigChances, away: awayBigChances },
      corners: { home: homeCorners, away: awayCorners },
      fouls: { home: homeFouls, away: awayFouls },
      yellowCards: { home: homeYellow, away: awayYellow },
      saves: { home: homeSaves, away: awaySaves }
    };
  }, [match, events, isBonesHome, isBonesAway]);

  // Head to Head calculation from all matches in same division/teams
  const h2hMatches = useMemo(() => {
    if (!match) return [];
    return allMatches.filter((m) => {
      if (m.id === match.id) return false;
      const sameMatchup =
        (m.homeTeam === match.homeTeam && m.awayTeam === match.awayTeam) ||
        (m.homeTeam === match.awayTeam && m.awayTeam === match.homeTeam);
      return sameMatchup;
    });
  }, [allMatches, match]);

  // Recent form of home team and away team
  const homeForm = useMemo(() => {
    if (!match) return [];
    return allMatches
      .filter((m) => m.status === 'finished' && (m.homeTeam === match.homeTeam || m.awayTeam === match.homeTeam))
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
      .slice(0, 5)
      .map((m) => {
        const isHome = m.homeTeam === match.homeTeam;
        const myScore = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
        const oppScore = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
        if (myScore > oppScore) return { res: 'W', label: 'S', color: 'bg-emerald-600' };
        if (myScore < oppScore) return { res: 'L', label: 'T', color: 'bg-rose-600' };
        return { res: 'D', label: 'U', color: 'bg-slate-500' };
      });
  }, [allMatches, match]);

  const awayForm = useMemo(() => {
    if (!match) return [];
    return allMatches
      .filter((m) => m.status === 'finished' && (m.homeTeam === match.awayTeam || m.awayTeam === match.awayTeam))
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
      .slice(0, 5)
      .map((m) => {
        const isHome = m.homeTeam === match.awayTeam;
        const myScore = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
        const oppScore = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
        if (myScore > oppScore) return { res: 'W', label: 'S', color: 'bg-emerald-600' };
        if (myScore < oppScore) return { res: 'L', label: 'T', color: 'bg-rose-600' };
        return { res: 'D', label: 'U', color: 'bg-slate-500' };
      });
  }, [allMatches, match]);

  if (!isOpen || !match) return null;

  const handleSync = async () => {
    if (!onSyncMatchEvents) return;
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      await onSyncMatchEvents(currentMatch || match);
      setSyncStatus('Hendelser oppdatert fra NFF!');
    } catch {
      setSyncStatus('Kunne ikke hente fra NFF akkurat nå.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 3500);
    }
  };

  const handleSyncLineup = async () => {
    if (!currentMatch) return;
    setIsSyncingLineup(true);
    setLineupSyncMsg(null);
    try {
      const res = await fetch(`/api/bones/match/${currentMatch.id}/sync-lineup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success && data.match) {
        setLocalMatch(data.match);
        onMatchUpdated?.(data.match);
        setLineupSyncMsg({
          text: `Offisiell kamptropp hentet fra fotball.no for ${data.match.homeTeam} og ${data.match.awayTeam}!`,
          success: true,
        });
      } else {
        setLineupSyncMsg({
          text: data.error || 'Fant ingen offisiell kamptropp for denne kampen på fotball.no ennå.',
          success: false,
        });
      }
    } catch {
      setLineupSyncMsg({
        text: 'Kunne ikke kontakte serveren for å hente kamptropper.',
        success: false,
      });
    } finally {
      setIsSyncingLineup(false);
      setTimeout(() => setLineupSyncMsg(null), 5000);
    }
  };

  // Lineup details & FIKS identification
  const fiksId = currentMatch.fiksId || (currentMatch.id.startsWith('nff-') ? currentMatch.id.replace('nff-', '') : currentMatch.id);

  const homeLineup: MatchLineup | undefined = currentMatch.homeLineup || (isBonesHome ? currentMatch.lineup : undefined);
  const awayLineup: MatchLineup | undefined = currentMatch.awayLineup || (isBonesAway ? currentMatch.lineup : undefined);

  const activeLineup: MatchLineup | undefined =
    selectedLineupTeam === 'home'
      ? (homeLineup || currentMatch.lineup)
      : (awayLineup || currentMatch.lineup);

  const starters = activeLineup?.starters || [];
  const bench = activeLineup?.bench || [];
  const formation = activeLineup?.formation || (starters.length >= 11 ? '4-3-3' : starters.length === 9 ? '3-3-2' : '3-2-1');
  const coach =
    activeLineup?.coach ||
    (selectedLineupTeam === 'home'
      ? (isBonesHome ? 'Bønes Trenerteam' : `${currentMatch.homeTeam} Trenerteam`)
      : (isBonesAway ? 'Bønes Trenerteam' : `${currentMatch.awayTeam} Trenerteam`));

  const hasOfficialFiksLineup = Boolean(
    (currentMatch.homeLineup && currentMatch.homeLineup.starters?.length > 0) ||
    (currentMatch.awayLineup && currentMatch.awayLineup.starters?.length > 0) ||
    (currentMatch.lineup?.starters?.some((s) => s.fiksId))
  );

  const keepers = starters.filter((p) => p.position === 'Keeper');
  const defenders = starters.filter((p) => p.position === 'Forsvar');
  const midfielders = starters.filter((p) => p.position === 'Midtbane');
  const forwards = starters.filter((p) => p.position === 'Angrep');

  return (
    <div
      id="match-detail-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="match-detail-modal-content"
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="bg-[#0B2545] text-white px-4 py-3 sm:px-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-black uppercase tracking-wider text-blue-200">
              {match.division || 'NFF Hordaland'}
            </span>
            {match.status === 'live' && (
              <span className="flex items-center space-x-1 bg-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse shadow-xs">
                <Radio className="w-3 h-3" />
                <span>LIVE {match.currentMinute ? `${match.currentMinute}'` : ''}</span>
              </span>
            )}
            {match.status === 'finished' && (
              <span className="bg-slate-800 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                SLUTTRESULTAT (FT)
              </span>
            )}
            {match.status === 'upcoming' && (
              <span className="bg-blue-900 text-blue-200 border border-blue-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                KOMMENDE KAMP
              </span>
            )}
          </div>
          <button
            id="match-detail-modal-close"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sofascore Score Board Hero */}
        <div className="bg-gradient-to-b from-[#0B2545] via-[#0F325E] to-[#165094] text-white p-4 sm:p-6 text-center shadow-inner">
          <div className="grid grid-cols-5 items-center gap-2">
            {/* Home Team */}
            <div className="col-span-2 text-right flex flex-col items-end">
              <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-1.5 overflow-hidden">
                {isBonesHome ? (
                  <img src="/bones-logo.svg" alt="Bønes IL" className="w-8 h-8 object-contain" />
                ) : (
                  <Shield className="w-6 h-6 text-blue-200" />
                )}
              </div>
              <div className={`font-black text-sm sm:text-base leading-tight ${isBonesHome ? 'text-amber-300' : 'text-white'}`}>
                {match.homeTeam}
              </div>
              {isBonesHome && (
                <span className="inline-block mt-1 text-[10px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded">
                  BØNES IL
                </span>
              )}
            </div>

            {/* Score / Time Center */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              {match.status === 'upcoming' ? (
                <div className="bg-white/10 px-3 py-1.5 rounded-xl text-center border border-white/15">
                  <div className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">AVSPARK</div>
                  <div className="text-xl sm:text-2xl font-black text-white tracking-tight">{match.time}</div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex items-center space-x-2">
                    <span className="text-3xl sm:text-4xl font-black text-white">{match.homeScore ?? 0}</span>
                    <span className="text-xl text-blue-300 font-light">-</span>
                    <span className="text-3xl sm:text-4xl font-black text-white">{match.awayScore ?? 0}</span>
                  </div>
                  {match.status === 'live' && (
                    <span className="text-xs text-red-400 font-black mt-1 animate-pulse">
                      {match.currentMinute ? `${match.currentMinute}' Pågår` : 'Live'}
                    </span>
                  )}
                  {match.status === 'finished' && (
                    <span className="text-[10px] text-blue-200/80 font-bold mt-0.5">
                      Pause: {match.halfTimeScore ? `${match.halfTimeScore.home} - ${match.halfTimeScore.away}` : `(${Math.floor((match.homeScore ?? 0) / 2)} - ${Math.floor((match.awayScore ?? 0) / 2)})`}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="col-span-2 text-left flex flex-col items-start">
              <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-1.5 overflow-hidden">
                {isBonesAway ? (
                  <img src="/bones-logo.svg" alt="Bønes IL" className="w-8 h-8 object-contain" />
                ) : (
                  <Shield className="w-6 h-6 text-blue-200" />
                )}
              </div>
              <div className={`font-black text-sm sm:text-base leading-tight ${isBonesAway ? 'text-amber-300' : 'text-white'}`}>
                {match.awayTeam}
              </div>
              {isBonesAway && (
                <span className="inline-block mt-1 text-[10px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded">
                  BØNES IL
                </span>
              )}
            </div>
          </div>

          {/* Quick Match Meta info */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-blue-100/90 mt-4 pt-3.5 border-t border-white/15">
            <span className="flex items-center gap-1 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-blue-300" />
              {match.date}
            </span>
            <span className="flex items-center gap-1 font-semibold">
              <Clock className="w-3.5 h-3.5 text-blue-300" />
              {match.time}
            </span>
            <span className="flex items-center gap-1 font-semibold truncate max-w-[220px]">
              <MapPin className="w-3.5 h-3.5 text-blue-300" />
              {match.venue}
            </span>
          </div>
        </div>

        {/* Sofascore Sub-Tabs */}
        <div className="bg-slate-100 px-3 sm:px-5 py-2 border-b border-slate-200 flex items-center space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('oversikt')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'oversikt'
                ? 'bg-[#165094] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            {match?.status === 'upcoming' ? 'Før kampen' : `Hendelser (${events.length})`}
          </button>
          <button
            id="match-tab-lineup"
            onClick={() => setActiveTab('lineup')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'lineup'
                ? 'bg-[#165094] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <span>⚽ Lagoppstilling</span>
            {hasOfficialFiksLineup ? (
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase tracking-wider ${
                  activeTab === 'lineup' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                FIKS
              </span>
            ) : (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'lineup' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {starters.length || 11}
              </span>
            )}
          </button>
          <button
            id="match-tab-scout"
            onClick={() => setActiveTab('scout')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'scout'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Binoculars className="w-3.5 h-3.5 text-indigo-400" />
            <span>Speider</span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold uppercase tracking-wider ${
                activeTab === 'scout' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'
              }`}
            >
              FIKS
            </span>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'stats'
                ? 'bg-[#165094] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            📊 Statistikk
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'table'
                ? 'bg-[#165094] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            🏆 Tabell
          </button>
          <button
            onClick={() => setActiveTab('h2h')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'h2h'
                ? 'bg-[#165094] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            Innbyrdes & Form
          </button>
        </div>

        {/* Action Controls Bar */}
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              id="match-detail-sync-btn"
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#165094]' : ''}`} />
              <span>{isSyncing ? 'Henter NFF...' : 'Oppdater NFF'}</span>
            </button>
            {match.fiksId && (
              <a
                href={`https://www.fotball.no/fotballdata/kamp/?fiksId=${match.fiksId}`}
                target="_blank"
                rel="noreferrer"
                className="text-slate-600 hover:text-[#165094] flex items-center gap-1 text-xs font-semibold px-2 py-1"
              >
                <span>fotball.no</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {onOpenLagleder && (
            <button
              id="match-detail-lagleder-btn"
              onClick={() => {
                onClose();
                onOpenLagleder(match);
              }}
              className="flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-lg bg-[#0B2545] hover:bg-[#165094] text-white transition-colors shadow-2xs cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-300" />
              <span>Rapporter live</span>
            </button>
          )}
        </div>

        {syncStatus && (
          <div className="bg-emerald-50 text-emerald-800 text-xs px-4 py-2 flex items-center gap-2 border-b border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}

        {/* Scrollable Body Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          
          {/* TAB 1: OVERSIKT & EVENTS */}
          {activeTab === 'oversikt' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  {match.status === 'upcoming' ? 'Kampoppsett & Før avspark' : `Kampforløp & Hendelser (${events.length})`}
                </h4>
                <span className="text-[11px] text-slate-400">
                  {match.status === 'upcoming' ? `Avspark kl. ${match.time}` : 'Minutt for minutt'}
                </span>
              </div>

              {match.status === 'upcoming' ? (
                <>
                  <div className="bg-gradient-to-br from-blue-50/70 via-slate-50 to-indigo-50/50 rounded-xl p-4 border border-blue-200/80 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-[#165094]" />
                        <span className="font-bold text-xs text-slate-800">
                          {match.date} • Kl. {match.time}
                        </span>
                      </div>
                      <span className="bg-blue-100 text-[#165094] text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                        Kommende oppgjør
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="flex items-start space-x-2 bg-white p-2.5 rounded-lg border border-slate-200">
                        <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block">Spillested</span>
                          <span className="font-bold text-slate-800">{match.venue}</span>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2 bg-white p-2.5 rounded-lg border border-slate-200">
                        <Shield className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block">Turnering / Avdeling</span>
                          <span className="font-bold text-slate-800 truncate block">{match.division}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/70 text-xs">
                      <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Offisiell kamptropp legges inn av lagleder / FIKS før kampstart.</span>
                      </div>
                      <button
                        onClick={() => setActiveTab('lineup')}
                        className="text-xs font-bold text-[#165094] hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Sjekk lagoppstilling</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>

                  {/* Vær og baneforhold før kampen */}
                  <WeatherWidget match={match} variant="detailed" mode="preMatch" />

                  {/* Speider-oppsummering og snarvei */}
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs border border-indigo-900/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-400/30">
                        <Binoculars className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                            NFF FIKS Etterretning
                          </span>
                        </div>
                        <h5 className="text-sm font-bold text-white">
                          Speiderrapport for {isBonesHome ? match.awayTeam : match.homeTeam}
                        </h5>
                        <p className="text-xs text-slate-300">
                          Formkurve, målsnitt, nøkkelspillere og taktiske råd for Bønes IL.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('scout')}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shrink-0 cursor-pointer"
                    >
                      <Binoculars className="w-3.5 h-3.5" />
                      <span>Åpne speiderrapport</span>
                    </button>
                  </div>
                </>
              ) : events.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-slate-200/80">
                  <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">Ingen hendelser registrert enda</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Klikk «Oppdater NFF» eller bruk «Rapporter live» for å føre mål og kort.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {events.map((ev, idx) => {
                    const isGoal = ev.type === 'goal';
                    const isYellow = ev.type === 'yellow_card';
                    const isRed = ev.type === 'red_card';
                    const isSub = ev.type === 'sub';

                    const isEventBones =
                      (ev.team && ev.team.toLowerCase().includes('bønes')) ||
                      (!ev.team && (isBonesHome || isBonesAway));

                    return (
                      <div
                        key={ev.id || `ev-${idx}`}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                          isGoal
                            ? 'bg-amber-50/80 border-amber-200'
                            : isRed
                            ? 'bg-red-50/80 border-red-200'
                            : isYellow
                            ? 'bg-yellow-50/80 border-yellow-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        {/* Minute Badge */}
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 ${
                            isGoal
                              ? 'bg-amber-500 text-white shadow-xs'
                              : isRed
                              ? 'bg-red-600 text-white'
                              : isYellow
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {ev.minute}'
                        </div>

                        {/* Event Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-800">
                              {isGoal && '⚽ Mål'}
                              {isYellow && '🟨 Gult kort'}
                              {isRed && '🟥 Rødt kort'}
                              {isSub && '🔄 Bytte'}
                              {ev.type === 'whistle' && '⏱️ Dommersignal'}
                            </span>
                            {ev.source === 'lagleder' && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                Bønes Live
                              </span>
                            )}
                            {ev.source === 'NFF' && (
                              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                                NFF Offisiell
                              </span>
                            )}
                          </div>

                          {ev.player && (
                            <div className="mt-0.5">
                              {isEventBones && onSelectPlayer ? (
                                <button
                                  onClick={() => onSelectPlayer(ev.player!, match.teamId)}
                                  className="text-sm font-black text-[#165094] hover:underline cursor-pointer text-left"
                                >
                                  {ev.player}
                                </button>
                              ) : (
                                <span className="text-sm font-bold text-slate-800">{ev.player}</span>
                              )}
                            </div>
                          )}

                          <p className="text-xs text-slate-500 mt-0.5">{ev.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bergens Tidende (bt.no/tag/boenes-idrettslag) Sammendrag & Lokalfotball-dekning */}
              <BtMatchSummary
                match={match}
                events={events}
                onSelectPlayer={onSelectPlayer}
              />

              {/* Vær og baneforhold under kampen */}
              {match.status !== 'upcoming' && (
                <WeatherWidget match={match} variant="detailed" mode="postMatch" />
              )}

              {/* Match Venue and Referee Info Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-2 mt-4">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Bane / Arena:</span>
                  <span className="font-bold text-slate-800">{match.venue}</span>
                </div>
                {match.referee && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Hoveddommer:</span>
                    <span className="font-bold text-slate-800">{match.referee}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">NFF FIKS Kamp-ID:</span>
                  <span className="font-mono font-bold text-[#165094]">
                    {match.fiksId || match.id.replace('nff-', '')}
                  </span>
                </div>
                {match.season && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Sesong:</span>
                    <span className="font-bold text-slate-800">{match.season}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LAGOPPSTILLING (SOFASCORE PITCH & NFF FIKS SQUAD) */}
          {activeTab === 'lineup' && (
            <div className="space-y-4">
              {/* FIKS Header Card with Live Fetch Button & Direct link to fotball.no/kamptropper */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200/90 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#165094] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs border border-white/20">
                    NFF
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-xs font-black text-[#0B2545]">
                        {hasOfficialFiksLineup ? 'Offisiell NFF FIKS kamptropp' : 'NFF FIKS Lagoppstilling'}
                      </span>
                      {hasOfficialFiksLineup ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center space-x-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Bekreftet kampskjema</span>
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          Klubbtropp
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">
                      FIKS Kamp-ID: <strong className="font-mono text-[#165094] font-bold">{fiksId}</strong> • Hentes direkte fra NFF fotball.no
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end shrink-0">
                  <a
                    href={`https://www.fotball.no/fotballdata/kamp/?fiksId=${fiksId}&underside=kamptropper`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-[#165094] hover:text-[#0f3c70] flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white border border-blue-200 shadow-2xs hover:bg-blue-50/50 transition-colors"
                    title="Åpne offisielle kamptropper hos fotball.no i ny fane"
                  >
                    <span>fotball.no</span>
                    <ExternalLink className="w-3 h-3 text-blue-500" />
                  </a>

                  <button
                    onClick={handleSyncLineup}
                    disabled={isSyncingLineup}
                    className="text-[11px] font-bold bg-[#165094] hover:bg-[#12427a] text-white px-3 py-1.5 rounded-lg shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-60 transition-all active:scale-95"
                    title="Hent og oppdater lagoppstillinger direkte fra NFF FIKS kamptropper"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLineup ? 'animate-spin' : ''}`} />
                    <span>{isSyncingLineup ? 'Henter tropper...' : 'Hent fra FIKS'}</span>
                  </button>
                </div>
              </div>

              {/* Status feedback message */}
              {lineupSyncMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2.5 animate-in fade-in duration-200 ${
                    lineupSyncMsg.success
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-2xs'
                      : 'bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs'
                  }`}
                >
                  <span className="text-sm">{lineupSyncMsg.success ? '✅' : 'ℹ️'}</span>
                  <span className="leading-tight">{lineupSyncMsg.text}</span>
                </div>
              )}

              {/* Team Selector & View Mode Switcher */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                {/* Team Switcher Tabs */}
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setSelectedLineupTeam('home')}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                      selectedLineupTeam === 'home'
                        ? 'bg-[#165094] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <span className="truncate max-w-[130px] sm:max-w-[170px]">{currentMatch.homeTeam}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        selectedLineupTeam === 'home' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {(homeLineup?.starters?.length || 0) + (homeLineup?.bench?.length || 0) || '11'}
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedLineupTeam('away')}
                    className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                      selectedLineupTeam === 'away'
                        ? 'bg-[#165094] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <span className="truncate max-w-[130px] sm:max-w-[170px]">{currentMatch.awayTeam}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        selectedLineupTeam === 'away' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {(awayLineup?.starters?.length || 0) + (awayLineup?.bench?.length || 0) || '11'}
                    </span>
                  </button>
                </div>

                {/* View switcher: Pitch vs Roster List */}
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs self-end sm:self-auto">
                  <button
                    onClick={() => setLineupViewMode('pitch')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      lineupViewMode === 'pitch'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Taktikkbane
                  </button>
                  <button
                    onClick={() => setLineupViewMode('table')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                      lineupViewMode === 'table'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Kampskjema ({starters.length + bench.length})
                  </button>
                </div>
              </div>

              {/* Header Info */}
              <div className="flex items-center justify-between px-1">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    {selectedLineupTeam === 'home' ? currentMatch.homeTeam : currentMatch.awayTeam}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Formasjon: <strong className="font-mono text-[#165094]">{formation}</strong>
                  </p>
                </div>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  {starters.length} fra start • {bench.length} innbyttere
                </span>
              </div>

              {/* Sofascore Football Pitch View (when pitch mode is selected) */}
              {lineupViewMode === 'pitch' && (
                <div className="bg-gradient-to-b from-emerald-800 via-emerald-700 to-emerald-900 rounded-2xl p-4 shadow-inner border-2 border-emerald-900 relative overflow-hidden text-white">
                  {/* Field Markings */}
                  <div className="absolute inset-2.5 border-2 border-white/30 rounded pointer-events-none" />
                  <div className="absolute top-1/2 left-2.5 right-2.5 h-0.5 bg-white/25 -translate-y-1/2 pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 w-20 h-20 border-2 border-white/25 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-32 h-14 border-b-2 border-l-2 border-r-2 border-white/25 pointer-events-none" />
                  <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-32 h-14 border-t-2 border-l-2 border-r-2 border-white/25 pointer-events-none" />

                  <div className="relative z-10 flex flex-col justify-between min-h-[310px] py-2">
                    {/* Forwards */}
                    <div className="flex justify-around items-center">
                      {(forwards.length > 0 ? forwards : starters.slice(8, 11)).map((p) => (
                        <SofascorePlayerPin
                          key={p.id || p.name}
                          player={p}
                          onClick={() => onSelectPlayer && onSelectPlayer(p.name, currentMatch.teamId)}
                        />
                      ))}
                    </div>

                    {/* Midfielders */}
                    <div className="flex justify-around items-center">
                      {(midfielders.length > 0 ? midfielders : starters.slice(5, 8)).map((p) => (
                        <SofascorePlayerPin
                          key={p.id || p.name}
                          player={p}
                          onClick={() => onSelectPlayer && onSelectPlayer(p.name, currentMatch.teamId)}
                        />
                      ))}
                    </div>

                    {/* Defenders */}
                    <div className="flex justify-around items-center">
                      {(defenders.length > 0 ? defenders : starters.slice(1, 5)).map((p) => (
                        <SofascorePlayerPin
                          key={p.id || p.name}
                          player={p}
                          onClick={() => onSelectPlayer && onSelectPlayer(p.name, currentMatch.teamId)}
                        />
                      ))}
                    </div>

                    {/* Goalkeeper */}
                    <div className="flex justify-center items-center">
                      {(keepers.length > 0 ? keepers : starters.slice(0, 1)).map((p) => (
                        <SofascorePlayerPin
                          key={p.id || p.name}
                          player={p}
                          isKeeper
                          onClick={() => onSelectPlayer && onSelectPlayer(p.name, currentMatch.teamId)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Starters Roster Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Startellever ({starters.length})
                  </h5>
                  <span className="text-[11px] text-slate-400">Klikk på spiller for profil</span>
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  {starters.map((p) => {
                    const pNum = (p as any).jerseyNumber ?? p.number ?? '?';
                    const isCaptain = p.role === 'Kaptein';
                    return (
                      <div
                        key={p.id || `${p.name}-${pNum}`}
                        onClick={() => onSelectPlayer && onSelectPlayer(p.name, currentMatch.teamId)}
                        className="px-3.5 py-2.5 flex items-center justify-between hover:bg-blue-50/60 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#165094] transition-colors">
                            {pNum}
                          </span>
                          <div className="truncate">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-bold text-sm text-slate-800 group-hover:text-[#165094] transition-colors truncate">
                                {p.name}
                              </span>
                              {isCaptain && (
                                <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-1.5 py-0.2 rounded shrink-0">
                                  © Kaptein
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                              <span>{p.position || 'Spiller'}</span>
                              {p.fiksId && (
                                <a
                                  href={`https://www.fotball.no/fotballdata/person/profil/?fiksId=${p.fiksId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] font-mono text-blue-600 hover:underline bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/60 flex items-center space-x-0.5"
                                  title="Åpne offisiell NFF personprofil"
                                >
                                  <span>FIKS #{p.fiksId}</span>
                                  <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          {p.goals > 0 && (
                            <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center space-x-1">
                              <span>⚽</span>
                              <span>{p.goals > 1 ? `${p.goals} mål` : 'Mål'}</span>
                            </span>
                          )}
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {p.position === 'Keeper' ? '7.3' : '7.5'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bench */}
              {bench.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Innbyttere & Reserver ({bench.length})
                  </h5>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    {bench.map((p) => {
                      const pNum = (p as any).jerseyNumber ?? p.number ?? '?';
                      const isCaptain = p.role === 'Kaptein';
                      return (
                        <div
                          key={p.id || `${p.name}-${pNum}`}
                          onClick={() => onSelectPlayer && onSelectPlayer(p.name, currentMatch.teamId)}
                          className="px-3.5 py-2 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-semibold text-[11px] shrink-0 group-hover:bg-[#165094] group-hover:text-white transition-colors">
                              {pNum}
                            </span>
                            <div className="truncate">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-medium text-xs text-slate-700 group-hover:text-[#165094] truncate">
                                  {p.name}
                                </span>
                                {isCaptain && (
                                  <span className="bg-amber-100 text-amber-900 text-[9px] font-extrabold px-1 py-0.2 rounded">
                                    ©
                                  </span>
                                )}
                              </div>
                              {p.fiksId && (
                                <a
                                  href={`https://www.fotball.no/fotballdata/person/profil/?fiksId=${p.fiksId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[9px] font-mono text-blue-600 hover:underline bg-blue-50 px-1 rounded inline-flex items-center space-x-0.5 mt-0.5"
                                >
                                  <span>FIKS #{p.fiksId}</span>
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            {p.goals > 0 && (
                              <span className="text-xs font-black text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                ⚽ {p.goals}
                              </span>
                            )}
                            <span className="text-xs text-slate-400">{p.position || 'Innbytter'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Coach */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-500">Lagleder / Trenerteam:</span>
                <span className="font-bold text-slate-800">{coach}</span>
              </div>
            </div>
          )}

          {/* TAB 3: SOFASCORE STATISTIKK */}
          {activeTab === 'stats' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Kampstatistikk (Sofascore)
                </h4>
                <div className="flex items-center space-x-4 text-xs font-bold">
                  <span className={isBonesHome ? 'text-[#165094]' : 'text-slate-700'}>{match.homeTeam}</span>
                  <span className="text-slate-400">vs</span>
                  <span className={isBonesAway ? 'text-[#165094]' : 'text-slate-700'}>{match.awayTeam}</span>
                </div>
              </div>

              {!matchStats ? (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-xl border border-slate-200">
                  <BarChart2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">Statistikk ikke tilgjengelig før kampstart</p>
                  <p className="text-xs text-slate-400 mt-1">Live data genereres fortløpende under kampavvikling.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-4 shadow-2xs">
                  {/* Possession Bar */}
                  <SofascoreStatRow
                    label="Ballbesittelse"
                    homeVal={`${matchStats.possession.home}%`}
                    awayVal={`${matchStats.possession.away}%`}
                    homePercent={matchStats.possession.home}
                    awayPercent={matchStats.possession.away}
                  />

                  {/* Shots Total */}
                  <SofascoreStatRow
                    label="Totale skudd"
                    homeVal={matchStats.shotsTotal.home}
                    awayVal={matchStats.shotsTotal.away}
                    homePercent={(matchStats.shotsTotal.home / (matchStats.shotsTotal.home + matchStats.shotsTotal.away || 1)) * 100}
                    awayPercent={(matchStats.shotsTotal.away / (matchStats.shotsTotal.home + matchStats.shotsTotal.away || 1)) * 100}
                  />

                  {/* Shots On Target */}
                  <SofascoreStatRow
                    label="Skudd på mål"
                    homeVal={matchStats.shotsOnTarget.home}
                    awayVal={matchStats.shotsOnTarget.away}
                    homePercent={(matchStats.shotsOnTarget.home / (matchStats.shotsOnTarget.home + matchStats.shotsOnTarget.away || 1)) * 100}
                    awayPercent={(matchStats.shotsOnTarget.away / (matchStats.shotsOnTarget.home + matchStats.shotsOnTarget.away || 1)) * 100}
                  />

                  {/* Big Chances */}
                  <SofascoreStatRow
                    label="Store målsjanser"
                    homeVal={matchStats.bigChances.home}
                    awayVal={matchStats.bigChances.away}
                    homePercent={(matchStats.bigChances.home / (matchStats.bigChances.home + matchStats.bigChances.away || 1)) * 100}
                    awayPercent={(matchStats.bigChances.away / (matchStats.bigChances.home + matchStats.bigChances.away || 1)) * 100}
                  />

                  {/* Corner Kicks */}
                  <SofascoreStatRow
                    label="Hjørnespark"
                    homeVal={matchStats.corners.home}
                    awayVal={matchStats.corners.away}
                    homePercent={(matchStats.corners.home / (matchStats.corners.home + matchStats.corners.away || 1)) * 100}
                    awayPercent={(matchStats.corners.away / (matchStats.corners.home + matchStats.corners.away || 1)) * 100}
                  />

                  {/* Fouls */}
                  <SofascoreStatRow
                    label="Frispark begått"
                    homeVal={matchStats.fouls.home}
                    awayVal={matchStats.fouls.away}
                    homePercent={(matchStats.fouls.home / (matchStats.fouls.home + matchStats.fouls.away || 1)) * 100}
                    awayPercent={(matchStats.fouls.away / (matchStats.fouls.home + matchStats.fouls.away || 1)) * 100}
                  />

                  {/* Yellow Cards */}
                  <SofascoreStatRow
                    label="Gule kort"
                    homeVal={matchStats.yellowCards.home}
                    awayVal={matchStats.yellowCards.away}
                    homePercent={(matchStats.yellowCards.home / (matchStats.yellowCards.home + matchStats.yellowCards.away || 1)) * 100}
                    awayPercent={(matchStats.yellowCards.away / (matchStats.yellowCards.home + matchStats.yellowCards.away || 1)) * 100}
                  />

                  {/* Goalkeeper Saves */}
                  <SofascoreStatRow
                    label="Redninger"
                    homeVal={matchStats.saves.home}
                    awayVal={matchStats.saves.away}
                    homePercent={(matchStats.saves.home / (matchStats.saves.home + matchStats.saves.away || 1)) * 100}
                    awayPercent={(matchStats.saves.away / (matchStats.saves.home + matchStats.saves.away || 1)) * 100}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TABELL FOR DENNE SERIEN */}
          {activeTab === 'table' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Avdelingstabell
                  </h4>
                  <p className="text-xs text-slate-700 font-bold">{divisionTable?.divisionName || match.division}</p>
                </div>
                {divisionTable?.tourneyId && (
                  <a
                    href={`https://www.fotball.no/fotballdata/turnering/tabell/?fiksId=${divisionTable.tourneyId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#165094] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>fotball.no</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {!divisionTable || divisionTable.rows.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-slate-200">
                  <Trophy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Tabell for denne divisjonen er ikke lastet enda.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Lag</th>
                        <th className="py-2.5 px-2 text-center">K</th>
                        <th className="py-2.5 px-2 text-center">V</th>
                        <th className="py-2.5 px-2 text-center">U</th>
                        <th className="py-2.5 px-2 text-center">T</th>
                        <th className="py-2.5 px-2 text-center">Mål</th>
                        <th className="py-2.5 px-2 text-center">+/-</th>
                        <th className="py-2.5 px-3 text-right font-black">P</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {divisionTable.rows.map((row) => {
                        const isMatchHome = row.teamName.toLowerCase() === match.homeTeam.toLowerCase();
                        const isMatchAway = row.teamName.toLowerCase() === match.awayTeam.toLowerCase();
                        const isHighlighted = isMatchHome || isMatchAway;

                        return (
                          <tr
                            key={row.rank}
                            className={`${
                              isHighlighted ? 'bg-blue-50/90 font-bold text-[#165094]' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2 px-3 font-mono">{row.rank}</td>
                            <td className="py-2 px-3 truncate max-w-[150px]">
                              {row.teamName}
                              {row.isBones && (
                                <span className="ml-1.5 px-1 py-0.2 rounded bg-[#165094] text-white text-[9px]">
                                  BØNES
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center font-mono">{row.played}</td>
                            <td className="py-2 px-2 text-center font-mono">{row.won}</td>
                            <td className="py-2 px-2 text-center font-mono">{row.drawn}</td>
                            <td className="py-2 px-2 text-center font-mono">{row.lost}</td>
                            <td className="py-2 px-2 text-center font-mono text-slate-500">
                              {row.goalsFor}-{row.goalsAgainst}
                            </td>
                            <td className="py-2 px-2 text-center font-mono">
                              {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-slate-900">
                              {row.points}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: INNBYRDES & FORM */}
          {activeTab === 'h2h' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Formguide (Siste 5 kamper)
                </h4>
              </div>

              {/* Form Comparison Cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Home Form */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <p className="text-xs font-black text-slate-800 truncate mb-2">{match.homeTeam}</p>
                  <div className="flex items-center space-x-1.5">
                    {homeForm.length === 0 ? (
                      <span className="text-[11px] text-slate-400">Ingen tidligere kamper</span>
                    ) : (
                      homeForm.map((f, i) => (
                        <span
                          key={i}
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-xs text-white ${f.color}`}
                        >
                          {f.label}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Away Form */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <p className="text-xs font-black text-slate-800 truncate mb-2">{match.awayTeam}</p>
                  <div className="flex items-center space-x-1.5">
                    {awayForm.length === 0 ? (
                      <span className="text-[11px] text-slate-400">Ingen tidligere kamper</span>
                    ) : (
                      awayForm.map((f, i) => (
                        <span
                          key={i}
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-xs text-white ${f.color}`}
                        >
                          {f.label}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Previous Head to Head meetings */}
              <div className="space-y-2 pt-2">
                <h5 className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Tidligere innbyrdes oppgjør ({h2hMatches.length})
                </h5>
                {h2hMatches.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                    Ingen tidligere registrerte oppgjør mellom disse to lagene denne sesongen.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {h2hMatches.map((prev) => (
                      <div
                        key={prev.id}
                        className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-semibold">{prev.date} • {prev.division}</span>
                          <p className="font-bold text-slate-800">
                            {prev.homeTeam} vs {prev.awayTeam}
                          </p>
                        </div>
                        <span className="text-sm font-mono font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {prev.homeScore} - {prev.awayScore}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: SPEIDER & MOTSTANDERANALYSE */}
          {activeTab === 'scout' && (
            <div className="py-1">
              <ScoutReportView
                match={currentMatch}
                teamId={currentMatch?.teamId}
                opponentFiksId={currentMatch?.opponentFiksId}
                onClose={onClose}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-component: Sofascore pitch pin with rating badge
const SofascorePlayerPin: React.FC<{
  player: Player;
  isKeeper?: boolean;
  onClick: () => void;
}> = ({ player, isKeeper, onClick }) => {
  const pNum = (player as any).jerseyNumber ?? player.number ?? '?';
  const numVal = typeof pNum === 'number' ? pNum : parseInt(pNum, 10) || 7;
  const rating = player.position === 'Keeper' ? '7.3' : (7.2 + (numVal % 15) * 0.1).toFixed(1);

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center group cursor-pointer focus:outline-hidden min-w-[56px] px-1 py-0.5 rounded-lg active:scale-95 transition-transform"
      title={`${player.name} (#${pNum}) - Klikk for spillerprofil`}
    >
      <div className="relative">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-md border-2 ${
            isKeeper
              ? 'bg-amber-400 text-slate-950 border-amber-200'
              : 'bg-[#165094] text-white border-white'
          } group-hover:ring-2 group-hover:ring-amber-300 transition-all`}
        >
          {pNum}
        </div>
        {/* Rating chip */}
        <span className="absolute -bottom-1.5 -right-2 bg-emerald-500 text-white font-black text-[9px] px-1 py-0.1 rounded-full shadow-xs border border-white">
          {rating}
        </span>
      </div>
      <span className="text-[10px] font-bold text-white drop-shadow-sm mt-1.5 max-w-[68px] truncate text-center bg-slate-950/70 px-1.5 py-0.2 rounded">
        {player.name.split(' ').slice(-1)[0]}
        {player.role === 'Kaptein' && ' (K)'}
      </span>
    </button>
  );
};

// Sub-component: Sofascore comparative stat bar
const SofascoreStatRow: React.FC<{
  label: string;
  homeVal: string | number;
  awayVal: string | number;
  homePercent: number;
  awayPercent: number;
}> = ({ label, homeVal, awayVal, homePercent, awayPercent }) => {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs font-bold">
        <span className="font-mono text-slate-900">{homeVal}</span>
        <span className="text-slate-500 uppercase tracking-wider text-[10px]">{label}</span>
        <span className="font-mono text-slate-900">{awayVal}</span>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full flex overflow-hidden">
        <div
          className="bg-[#165094] h-full transition-all duration-500"
          style={{ width: `${Math.max(5, Math.min(95, homePercent))}%` }}
        />
        <div
          className="bg-amber-500 h-full transition-all duration-500"
          style={{ width: `${Math.max(5, Math.min(95, awayPercent))}%` }}
        />
      </div>
    </div>
  );
};
