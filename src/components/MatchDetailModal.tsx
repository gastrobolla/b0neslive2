import React, { useState, useMemo } from 'react';
import { Match, MatchEvent, DivisionTable, Player, MatchLineup, PlayerOfTheMatchCandidate } from '../types.js';
import { BtMatchSummary } from './BtMatchSummary.js';
import { WeatherWidget } from './WeatherWidget.js';
import { ScoutReportView } from './ScoutReportModal.js';
import { PlayerOfTheMatchModal } from './PlayerOfTheMatchModal.js';
import { calculateMatchPOTM } from '../utils/potmCalculator.js';
import { AttackMomentumChart } from './AttackMomentumChart.js';
import {
  resolveTeamLineup,
  calculatePitchCoordinates,
  inferFormationFromStarters,
  ResolvedTeamLineup
} from '../utils/lineupPredictionEngine.js';
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
  Binoculars,
  Navigation,
  PlusCircle,
  Vote,
  Star,
  Share2,
  Code,
  Zap,
  Check,
  Shirt,
  UserCheck,
  ChevronDown
} from 'lucide-react';

import { getVenueDetails, getGoogleMapsUrl, getGoogleMapsEmbedUrl } from '../utils/venueMap.js';
import { AddToCalendarButton } from './AddToCalendarButton.js';
import { HeadToHeadSection } from './HeadToHeadSection.js';

interface MatchDetailModalProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenLagleder?: (match: Match) => void;
  onSyncMatchEvents?: (match: Match) => Promise<void>;
  onMatchUpdated?: (updatedMatch: Match) => void;
  onSelectPlayer?: (playerName: string, teamId?: string) => void;
  onViewLineup?: (match: Match) => void;
  onSelectMatch?: (match: Match) => void;
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
  onSelectMatch,
  allMatches = [],
  divisionTable,
}) => {
  const [activeTab, setActiveTab] = useState<SofascoreTab>('oversikt');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const [localMatch, setLocalMatch] = useState<Match | null>(match);
  const [isPotmModalOpen, setIsPotmModalOpen] = useState(false);
  const [isSyncingLineup, setIsSyncingLineup] = useState(false);
  const [lineupSyncMsg, setLineupSyncMsg] = useState<{ text: string; success: boolean } | null>(null);
  const [selectedLineupTeam, setSelectedLineupTeam] = useState<'home' | 'away'>('home');
  const [lineupViewMode, setLineupViewMode] = useState<'pitch' | 'table'>('pitch');
  const [lineupFilter, setLineupFilter] = useState<'performance' | 'club' | 'age' | 'number'>('performance');
  const [lineupPitchMode, setLineupPitchMode] = useState<'dual' | 'home' | 'away'>('dual');
  const [lineupCopied, setLineupCopied] = useState(false);
  const [showEmbedCode, setShowEmbedCode] = useState(false);

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
  const opponentName = currentMatch ? (isBonesHome ? currentMatch.awayTeam : currentMatch.homeTeam) : '';
  const events = currentMatch?.events || [];

  // Algorithmic POTM and Game-State Player Ratings
  const potm = useMemo(() => {
    if (!currentMatch) return null;
    return currentMatch.playerOfTheMatch || calculateMatchPOTM(currentMatch);
  }, [currentMatch]);

  const candidateMap = useMemo(() => {
    const map = new Map<string, PlayerOfTheMatchCandidate>();
    if (potm?.candidates) {
      for (const c of potm.candidates) {
        map.set(c.playerName.trim().toLowerCase(), c);
      }
    }
    return map;
  }, [potm]);

  const [showVenueMapEmbed, setShowVenueMapEmbed] = useState(false);

  const venueLocation = useMemo(() => {
    if (!currentMatch?.venue) return null;
    return getVenueDetails(currentMatch.venue, opponentName);
  }, [currentMatch?.venue, opponentName]);

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
      .sort((a, b) => (String(b.date || '') + String(b.time || '')).localeCompare(String(a.date || '') + String(a.time || '')))
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
      .sort((a, b) => (String(b.date || '') + String(b.time || '')).localeCompare(String(a.date || '') + String(a.time || '')))
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

  // Lineup details & FIKS identification
  const fiksId = currentMatch
    ? currentMatch.fiksId || (currentMatch.id.startsWith('nff-') ? currentMatch.id.replace('nff-', '') : currentMatch.id)
    : '';

  // Resolved lineups using official FIKS confirmation or previous match prediction in same formation
  const resolvedHome: ResolvedTeamLineup = useMemo(
    () => resolveTeamLineup('home', currentMatch, allMatches),
    [currentMatch, allMatches]
  );
  const resolvedAway: ResolvedTeamLineup = useMemo(
    () => resolveTeamLineup('away', currentMatch, allMatches),
    [currentMatch, allMatches]
  );

  const isConfirmedLineups = resolvedHome.isConfirmed || resolvedAway.isConfirmed;

  const activeLineupData =
    selectedLineupTeam === 'home' ? resolvedHome : resolvedAway;

  const starters = activeLineupData?.starters || [];
  const bench = activeLineupData?.bench || [];
  const formation = activeLineupData?.formation || '4-3-3';
  const coach = activeLineupData?.coach || '';

  const hasOfficialFiksLineup = isConfirmedLineups;

  const keepers = starters.filter((p) => p.position === 'Keeper');
  const defenders = starters.filter((p) => p.position === 'Forsvar');
  const midfielders = starters.filter((p) => p.position === 'Midtbane');
  const forwards = starters.filter((p) => p.position === 'Angrep');

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

  return (
    <div
      id="match-detail-modal-overlay"
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="match-detail-modal-content"
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bønes IL Club Colors Discreet Accent Line (Blå & Rød) */}
        <div
          id="bones-modal-accent-line"
          className="h-1 w-full bg-gradient-to-r from-[#165094] via-[#dc2626] to-[#165094]"
          title="Bønes IL klubbfarger: Kongeblå & Rød"
        />

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
          <div className="flex items-center space-x-2">
            <AddToCalendarButton match={currentMatch} variant="compact" />
            <button
              id="match-detail-modal-close"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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
            <AddToCalendarButton match={currentMatch} variant="compact" />
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                  {match.status === 'upcoming' ? 'Kampoppsett & Før avspark' : `Kampforløp & Hendelser (${events.length})`}
                </h4>
                <div className="flex items-center gap-2">
                  {onOpenLagleder && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenLagleder(match);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-[#165094] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>+ Hendelse / assist / bytte</span>
                    </button>
                  )}
                  <span className="text-[11px] text-slate-400">
                    {match.status === 'upcoming' ? `Avspark kl. ${match.time}` : 'Minutt for minutt'}
                  </span>
                </div>
              </div>

              {/* Banens Beste Spotlight & Live Voting Banner */}
              {(() => {
                const potm = currentMatch?.playerOfTheMatch || (currentMatch ? calculateMatchPOTM(currentMatch) : null);
                const candidates = Array.isArray(potm?.candidates) ? potm.candidates : [];
                const leader = candidates.find((c) => c && c.playerName && c.playerName === potm?.winnerName) || candidates[0];
                const totalVotes = potm?.totalVotes || 0;
                const leaderRating = leader ? Number(leader.algoRating ?? (leader as any)?.rating ?? 0) : 0;

                return (
                  <div className="bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-amber-500/10 border border-amber-300/70 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
                        <Trophy className="w-5 h-5 text-slate-950" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-full">
                            {currentMatch?.status === 'finished' ? 'Kåret til Banens Beste' : 'Leder kåringen av Banens Beste'}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            • {totalVotes} {totalVotes === 1 ? 'stemme' : 'stemmer'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <h4 className="font-black text-slate-900 text-base sm:text-lg truncate">
                            {leader?.playerName || 'Ikke avgjort'}
                          </h4>
                          {leader && (
                            <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded-md shadow-2xs font-mono">
                              <Star className="w-3 h-3 fill-slate-950" />
                              {(isNaN(leaderRating) ? 0 : leaderRating).toFixed(1)}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600">
                          {leader?.team || (isBonesHome ? currentMatch?.homeTeam : currentMatch?.awayTeam) || 'Bønes IL'} • Avgjøres av kampscore og publikumsstemmer
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPotmModalOpen(true)}
                      className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                    >
                      <Vote className="w-4 h-4 text-slate-950" />
                      <span>Stem på Banens Beste</span>
                    </button>
                  </div>
                );
              })()}


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
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-slate-400 font-semibold block">Spillested</span>
                          <span className="font-bold text-slate-800 block truncate">{match.venue}</span>
                          {venueLocation?.address && (
                            <span className="text-[10px] text-slate-500 block truncate">{venueLocation.address}</span>
                          )}
                          <a
                            href={getGoogleMapsUrl(match.venue, opponentName)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-[#165094] hover:underline font-bold mt-1"
                          >
                            <Navigation className="w-3 h-3 text-[#165094]" />
                            <span>Vis i Google Maps</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </a>
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
              ) : (
                <div className="space-y-4">
                  {/* SofaScore-Style Synthetic Attack Momentum Graph */}
                  <AttackMomentumChart match={currentMatch} />

                  {events.length === 0 ? (
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

                          {/* Linked Assist Player */}
                          {ev.assistPlayer && (
                            <div className="text-xs font-semibold text-[#165094] flex items-center gap-1 mt-0.5">
                              <span>👟</span>
                              <span>Målgivende: <strong>{ev.assistPlayer}</strong></span>
                            </div>
                          )}

                          {/* Linked Substitution */}
                          {(ev.subOutPlayer || ev.subInPlayer) && (
                            <div className="text-xs font-semibold text-slate-700 flex items-center gap-2 mt-0.5">
                              {ev.subOutPlayer && (
                                <span className="text-red-600 font-bold">🔻 Ut: {ev.subOutPlayer}</span>
                              )}
                              {ev.subOutPlayer && ev.subInPlayer && (
                                <span className="text-slate-300">•</span>
                              )}
                              {ev.subInPlayer && (
                                <span className="text-emerald-700 font-bold">🔺 Inn: {ev.subInPlayer}</span>
                              )}
                            </div>
                          )}

                          {/* Linked Event / Situation Tag */}
                          {ev.linkedEventId && (
                            <div className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 font-medium">
                              <span>🔗 Knyttet til kampsituasjon</span>
                            </div>
                          )}

                          <p className="text-xs text-slate-500 mt-0.5">{ev.description}</p>
                        </div>
                      </div>
                    );
                  })}
                    </div>
                  )}
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

              {/* Match Venue, Map and Referee Info Card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-600 space-y-3 mt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-slate-400 font-medium block">Bane / Arena:</span>
                    <span className="font-bold text-slate-800 text-sm block">{match.venue}</span>
                    {venueLocation?.address && (
                      <span className="text-[11px] text-slate-500 block mt-0.5">{venueLocation.address}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowVenueMapEmbed(!showVenueMapEmbed)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-slate-700 shadow-2xs transition-colors cursor-pointer"
                    >
                      {showVenueMapEmbed ? 'Skjul kart' : 'Vis kart'}
                    </button>
                    <a
                      href={getGoogleMapsUrl(match.venue, opponentName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-[#165094] hover:bg-[#0F3A6D] text-white rounded-lg shadow-2xs transition-colors"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Veibeskrivelse</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                    </a>
                  </div>
                </div>

                {showVenueMapEmbed && (
                  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-inner mt-2">
                    <iframe
                      title={`Kart over ${match.venue}`}
                      src={getGoogleMapsEmbedUrl(match.venue, opponentName)}
                      className="w-full h-48 border-0"
                      loading="lazy"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 text-[11px]">
                  {match.referee && (
                    <div>
                      <span className="text-slate-400 font-medium block">Hoveddommer:</span>
                      <span className="font-bold text-slate-800">{match.referee}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 font-medium block">NFF FIKS Kamp-ID:</span>
                    <span className="font-mono font-bold text-[#165094]">
                      {match.fiksId || match.id.replace('nff-', '')}
                    </span>
                  </div>
                  {match.season && (
                    <div>
                      <span className="text-slate-400 font-medium block">Sesong:</span>
                      <span className="font-bold text-slate-800">{match.season}</span>
                    </div>
                  )}
                </div>
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
                      ) : currentMatch.fiksSyncFailedAt15 ? (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center space-x-1">
                          <span>⚠️ Synk 15 min feilet – prøver igjen ved kampstart</span>
                        </span>
                      ) : (
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          Standard: Synkes 15 min før kamp &amp; ved kampstart
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">
                      FIKS Kamp-ID: <strong className="font-mono text-[#165094] font-bold">{fiksId}</strong> • Hentes direkte fra NFF fotball.no
                      {hasOfficialFiksLineup ? ' • Unike ratings kun for aktive spillere (ubenyttede har ingen rating)' : ''}
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

              {/* SOFASCORE TOP CONTROL BAR (Confirmed/Predicted status, Filters, Actions) */}
              <div className="bg-slate-900 text-white rounded-2xl p-3 sm:p-4 border border-slate-800 shadow-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  {/* Status Dropdown / Pill */}
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-xs transition-colors ${
                        isConfirmedLineups
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 ring-1 ring-emerald-500/20'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 ring-1 ring-amber-500/20'
                      }`}
                      title={
                        isConfirmedLineups
                          ? 'Startoppstillingen er bekreftet i det offisielle NFF FIKS kampskjemaet.'
                          : 'Startoppstillingen er forventet basert på forrige kamp i samme formasjon.'
                      }
                    >
                      {isConfirmedLineups ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Confirmed lineups</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                          <span>Predicted lineups</span>
                        </>
                      )}
                    </span>

                    {/* Mode toggle: Dual Pitch vs Single vs Table */}
                    <div className="hidden sm:inline-flex items-center space-x-1 bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60 text-xs">
                      <button
                        onClick={() => setLineupPitchMode('dual')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          lineupPitchMode === 'dual'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        Bane (Begge lag)
                      </button>
                      <button
                        onClick={() => setLineupPitchMode('table')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          lineupPitchMode === 'table'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        Kampskjema
                      </button>
                    </div>
                  </div>

                  {/* Sofascore Filter Pills (Performance, Club, Age, Height/Number) */}
                  <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto py-0.5 no-scrollbar">
                    <button
                      onClick={() => setLineupFilter('performance')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        lineupFilter === 'performance'
                          ? 'bg-white text-slate-900 shadow-md font-black'
                          : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60'
                      }`}
                    >
                      Performance
                    </button>
                    <button
                      onClick={() => setLineupFilter('club')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        lineupFilter === 'club'
                          ? 'bg-white text-slate-900 shadow-md font-black'
                          : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60'
                      }`}
                    >
                      Club
                    </button>
                    <button
                      onClick={() => setLineupFilter('age')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        lineupFilter === 'age'
                          ? 'bg-white text-slate-900 shadow-md font-black'
                          : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60'
                      }`}
                    >
                      Age / Pos
                    </button>
                    <button
                      onClick={() => setLineupFilter('number')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        lineupFilter === 'number'
                          ? 'bg-white text-slate-900 shadow-md font-black'
                          : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60'
                      }`}
                    >
                      Draktnr
                    </button>
                  </div>

                  {/* Actions: Share Lineups & Embed Code */}
                  <div className="flex items-center space-x-1.5 ml-auto">
                    <button
                      onClick={async () => {
                        const hNames = resolvedHome.starters.map((s) => s.name).join(', ');
                        const aNames = resolvedAway.starters.map((s) => s.name).join(', ');
                        const shareTxt = `⚽ ${currentMatch.homeTeam} vs ${currentMatch.awayTeam}\nFormasjon: ${resolvedHome.formation} vs ${resolvedAway.formation}\n\n🏠 ${currentMatch.homeTeam} (${resolvedHome.formation}):\n${hNames}\n\n✈️ ${currentMatch.awayTeam} (${resolvedAway.formation}):\n${aNames}\n\n${resolvedHome.sourceDescription}`;
                        try {
                          await navigator.clipboard.writeText(shareTxt);
                          setLineupCopied(true);
                          setTimeout(() => setLineupCopied(false), 3000);
                        } catch {
                          // fallback
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-xs ${
                        lineupCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      {lineupCopied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{lineupCopied ? 'Kopiert!' : 'Share lineups'}</span>
                    </button>

                    <button
                      onClick={() => setShowEmbedCode(!showEmbedCode)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                      title="Vis kilde & embed-kode"
                    >
                      <Code className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Subtext info for Predicted vs Confirmed */}
                <div className="text-[11px] text-slate-400 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800/80 flex items-start space-x-2">
                  <span className="text-sm shrink-0">
                    {isConfirmedLineups ? '🛡️' : '⚡'}
                  </span>
                  <div className="leading-snug">
                    <strong className="text-slate-200">
                      {isConfirmedLineups ? 'Offisiell startoppstilling:' : 'Forventet startoppstilling:'}
                    </strong>{' '}
                    <span>
                      {isConfirmedLineups
                        ? 'Bekreftet og innmeldt i NFF FIKS kampskjema.'
                        : (resolvedHome.sourceDescription || 'Beregnet ut fra forrige startoppstilling i samme formasjon. Oppdateres automatisk så snart troppen er offisielt registrert hos NFF.')}
                    </span>
                  </div>
                </div>

                {/* Embed code snippet toggle */}
                {showEmbedCode && (
                  <div className="p-3 bg-slate-950 rounded-xl border border-blue-500/40 text-xs font-mono space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-slate-400 text-[10px] font-sans">
                      <span>Integrasjonskode for kampsenter / iframe</span>
                      <button
                        onClick={() => setShowEmbedCode(false)}
                        className="text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        Lukk
                      </button>
                    </div>
                    <code className="block bg-slate-900 text-blue-300 p-2 rounded border border-slate-800 break-all select-all">
                      {`<iframe src="${window.location.origin}/match/${currentMatch.id}/lineup" width="100%" height="480" frameborder="0"></iframe>`}
                    </code>
                  </div>
                )}
              </div>

              {/* TEAMS SUB-HEADER: FORMATION & TEAM KIT DISPLAY */}
              <div className="flex items-center justify-between px-2 pt-1 text-slate-800">
                {/* Home Team & Formation */}
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#165094] to-[#0B2545] text-white flex items-center justify-center font-black text-xs shadow-md border-2 border-amber-400/40">
                    {isBonesHome ? 'B' : currentMatch.homeTeam.substring(0, 1)}
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base leading-tight text-slate-900">
                      {currentMatch.homeTeam}
                    </h3>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span className="font-mono text-xs font-extrabold text-[#165094] bg-blue-50 border border-blue-200 px-2 py-0.2 rounded-md">
                        {resolvedHome.formation}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {resolvedHome.starters.length} start • {resolvedHome.bench.length} reserver
                      </span>
                    </div>
                  </div>
                </div>

                {/* Away Team & Formation */}
                <div className="flex items-center space-x-2.5 text-right">
                  <div>
                    <h3 className="font-black text-sm sm:text-base leading-tight text-slate-900">
                      {currentMatch.awayTeam}
                    </h3>
                    <div className="flex items-center justify-end space-x-1.5 mt-0.5">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {resolvedAway.starters.length} start • {resolvedAway.bench.length} reserver
                      </span>
                      <span className="font-mono text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.2 rounded-md">
                        {resolvedAway.formation}
                      </span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center font-black text-xs shadow-md border-2 border-white">
                    {isBonesAway ? 'B' : currentMatch.awayTeam.substring(0, 1)}
                  </div>
                </div>
              </div>

              {/* SOFASCORE DUAL-TEAM HORIZONTAL FOOTBALL PITCH */}
              {lineupPitchMode !== 'table' && (
                <div className="relative w-full overflow-x-auto rounded-2xl border-2 border-emerald-950/80 shadow-2xl bg-slate-950 p-1 sm:p-2">
                  <div className="relative min-w-[580px] w-full min-h-[380px] sm:min-h-[440px] rounded-xl overflow-hidden shadow-inner select-none bg-gradient-to-br from-[#064e3b] via-[#043e30] to-[#022c22]">
                    {/* Realistic Stadium Pitch Stripes */}
                    <div className="absolute inset-0 opacity-15 pointer-events-none flex">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div
                          key={`stripe-${i}`}
                          className={`flex-1 h-full ${i % 2 === 0 ? 'bg-white/10' : 'bg-transparent'}`}
                        />
                      ))}
                    </div>

                    {/* Outer Boundary Line */}
                    <div className="absolute inset-3 border-2 border-white/35 rounded-sm pointer-events-none" />

                    {/* Halfway Line */}
                    <div className="absolute top-3 bottom-3 left-1/2 w-0.5 bg-white/35 -translate-x-1/2 pointer-events-none" />

                    {/* Center Circle & Spot */}
                    <div className="absolute top-1/2 left-1/2 w-24 h-24 border-2 border-white/35 rounded-full -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                      <div className="w-2 h-2 bg-white/50 rounded-full" />
                    </div>

                    {/* Left Penalty Box (Home Goal Area) */}
                    <div className="absolute top-[18%] bottom-[18%] left-3 w-[16%] border-r-2 border-t-2 border-b-2 border-white/35 rounded-r-xs pointer-events-none" />
                    <div className="absolute top-[34%] bottom-[34%] left-3 w-[6%] border-r-2 border-t-2 border-b-2 border-white/30 pointer-events-none" />
                    <div className="absolute top-1/2 left-[19%] w-8 h-16 border-r-2 border-white/25 rounded-r-full -translate-y-1/2 pointer-events-none" />

                    {/* Right Penalty Box (Away Goal Area) */}
                    <div className="absolute top-[18%] bottom-[18%] right-3 w-[16%] border-l-2 border-t-2 border-b-2 border-white/35 rounded-l-xs pointer-events-none" />
                    <div className="absolute top-[34%] bottom-[34%] right-3 w-[6%] border-l-2 border-t-2 border-b-2 border-white/30 pointer-events-none" />
                    <div className="absolute top-1/2 right-[19%] w-8 h-16 border-l-2 border-white/25 rounded-l-full -translate-y-1/2 pointer-events-none" />

                    {/* HOME TEAM PLAYERS (Left half, attacking right) */}
                    {(() => {
                      const slots = calculatePitchCoordinates(resolvedHome.formation, 'home', resolvedHome.starters.length);
                      return resolvedHome.starters.map((p, idx) => {
                        const slot = slots[idx] || { x: 20, y: 50, role: 'MID' };
                        const cand = p?.name ? candidateMap.get(p.name.trim().toLowerCase()) : undefined;
                        const isCaptain = p.role === 'Kaptein';
                        return (
                          <div
                            key={`home-starter-${p.id || p.name}-${idx}`}
                            style={{
                              position: 'absolute',
                              left: `${slot.x}%`,
                              top: `${slot.y}%`,
                              transform: 'translate(-50%, -50%)',
                              zIndex: 20,
                            }}
                          >
                            <SofascorePlayerPin
                              player={p}
                              isKeeper={slot.role === 'GK' || p.position === 'Keeper'}
                              candidate={cand}
                              filter={lineupFilter}
                              teamSide="home"
                              isCaptain={isCaptain}
                              isMatchPlayed={currentMatch.status === 'finished' || (currentMatch.status as string) === 'live'}
                              onClick={() => onSelectPlayer && onSelectPlayer(p.name, currentMatch.teamId)}
                            />
                          </div>
                        );
                      });
                    })()}

                    {/* AWAY TEAM PLAYERS (Right half, attacking left) */}
                    {(() => {
                      const slots = calculatePitchCoordinates(resolvedAway.formation, 'away', resolvedAway.starters.length);
                      return resolvedAway.starters.map((p, idx) => {
                        const slot = slots[idx] || { x: 80, y: 50, role: 'MID' };
                        const cand = p?.name ? candidateMap.get(p.name.trim().toLowerCase()) : undefined;
                        const isCaptain = p.role === 'Kaptein';
                        return (
                          <div
                            key={`away-starter-${p.id || p.name}-${idx}`}
                            style={{
                              position: 'absolute',
                              left: `${slot.x}%`,
                              top: `${slot.y}%`,
                              transform: 'translate(-50%, -50%)',
                              zIndex: 20,
                            }}
                          >
                            <SofascorePlayerPin
                              player={p}
                              isKeeper={slot.role === 'GK' || p.position === 'Keeper'}
                              candidate={cand}
                              filter={lineupFilter}
                              teamSide="away"
                              isCaptain={isCaptain}
                              isMatchPlayed={currentMatch.status === 'finished' || (currentMatch.status as string) === 'live'}
                              onClick={() => onSelectPlayer && onSelectPlayer(p.name, currentMatch.teamId)}
                            />
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* MANAGERS / TRENERTEAM ROW (Sofascore style) */}
              <div className="bg-slate-900 text-white rounded-2xl p-3.5 border border-slate-800 shadow-md">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 text-center mb-2.5">
                  Managers / Trenere
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-800">
                  {/* Home Manager */}
                  <div className="pr-3 flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-950 border border-blue-500/40 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                      👔
                    </div>
                    <div className="truncate">
                      <div className="text-[10px] font-bold text-blue-300 uppercase">
                        {currentMatch.homeTeam}
                      </div>
                      <div className="font-bold text-xs text-white truncate">
                        {resolvedHome.coach || (isBonesHome ? 'Bønes Trenerteam' : `${currentMatch.homeTeam} Trenerteam`)}
                      </div>
                    </div>
                  </div>

                  {/* Away Manager */}
                  <div className="pl-3 flex items-center justify-end space-x-2.5 text-right">
                    <div className="truncate">
                      <div className="text-[10px] font-bold text-amber-300 uppercase">
                        {currentMatch.awayTeam}
                      </div>
                      <div className="font-bold text-xs text-white truncate">
                        {resolvedAway.coach || (isBonesAway ? 'Bønes Trenerteam' : `${currentMatch.awayTeam} Trenerteam`)}
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-amber-950 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                      👔
                    </div>
                  </div>
                </div>
              </div>

              {/* BENCH / RESERVER SEKSJON (Side-by-side) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-1">
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Reserver & Innbyttere
                  </h5>
                  <span className="text-[11px] text-slate-400">
                    {resolvedHome.bench.length} på {currentMatch.homeTeam} • {resolvedAway.bench.length} på {currentMatch.awayTeam}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Home Bench */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs divide-y divide-slate-100">
                    <div className="bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 flex justify-between items-center">
                      <span>{currentMatch.homeTeam} ({resolvedHome.bench.length})</span>
                      <span className="text-[10px] text-slate-400">Hjemmebenk</span>
                    </div>
                    {resolvedHome.bench.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 italic text-center">
                        Ingen innbyttere registrert i kampskjema
                      </div>
                    ) : (
                      resolvedHome.bench.map((p, idx) => {
                        const pNum = (p as any).jerseyNumber ?? p.number ?? '?';
                        const cand = candidateMap.get(p.name.trim().toLowerCase());
                        return (
                          <div
                            key={`h-bench-${p.id || p.name}-${idx}`}
                            onClick={() => onSelectPlayer && onSelectPlayer(p.name, currentMatch.teamId)}
                            className="px-3 py-2 flex items-center justify-between hover:bg-blue-50/60 cursor-pointer transition-colors group"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 group-hover:bg-[#165094] group-hover:text-white flex items-center justify-center font-bold text-[10px] shrink-0 transition-colors">
                                {pNum}
                              </span>
                              <div className="truncate">
                                <span className="font-bold text-xs text-slate-800 group-hover:text-[#165094] truncate block">
                                  {p.name}
                                </span>
                                <span className="text-[10px] text-slate-400">{p.position || 'Innbytter'}</span>
                              </div>
                            </div>
                            {cand && cand.algoRating !== undefined && !cand.isUnusedSub ? (
                              <span className="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                                ★ {cand.algoRating.toFixed(1)}
                              </span>
                            ) : cand?.isUnusedSub ? (
                              <span className="text-[10px] text-slate-400 font-medium italic">Ubenyttet</span>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Away Bench */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs divide-y divide-slate-100">
                    <div className="bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 flex justify-between items-center">
                      <span>{currentMatch.awayTeam} ({resolvedAway.bench.length})</span>
                      <span className="text-[10px] text-slate-400">Bortebenk</span>
                    </div>
                    {resolvedAway.bench.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 italic text-center">
                        Ingen innbyttere registrert i kampskjema
                      </div>
                    ) : (
                      resolvedAway.bench.map((p, idx) => {
                        const pNum = (p as any).jerseyNumber ?? p.number ?? '?';
                        const cand = candidateMap.get(p.name.trim().toLowerCase());
                        return (
                          <div
                            key={`a-bench-${p.id || p.name}-${idx}`}
                            onClick={() => onSelectPlayer && onSelectPlayer(p.name, currentMatch.teamId)}
                            className="px-3 py-2 flex items-center justify-between hover:bg-amber-50/60 cursor-pointer transition-colors group"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center font-bold text-[10px] shrink-0 transition-colors">
                                {pNum}
                              </span>
                              <div className="truncate">
                                <span className="font-bold text-xs text-slate-800 group-hover:text-amber-800 truncate block">
                                  {p.name}
                                </span>
                                <span className="text-[10px] text-slate-400">{p.position || 'Innbytter'}</span>
                              </div>
                            </div>
                            {cand && cand.algoRating !== undefined && !cand.isUnusedSub ? (
                              <span className="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                                ★ {cand.algoRating.toFixed(1)}
                              </span>
                            ) : cand?.isUnusedSub ? (
                              <span className="text-[10px] text-slate-400 font-medium italic">Ubenyttet</span>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
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

              {/* SofaScore-Style Synthetic Attack Momentum Graph */}
              <AttackMomentumChart match={currentMatch} />

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

              {/* Innbyrdes oppgjør (H2H) over de siste 3 sesongene */}
              <div className="pt-2">
                <HeadToHeadSection
                  opponentName={opponentName}
                  bonesTeamName={isBonesHome ? currentMatch?.homeTeam : currentMatch?.awayTeam}
                  allMatches={allMatches}
                  onSelectMatch={onSelectMatch || ((m) => setLocalMatch(m))}
                />
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

      {/* Player of the Match Modal */}
      {currentMatch && (
        <PlayerOfTheMatchModal
          isOpen={isPotmModalOpen}
          onClose={() => setIsPotmModalOpen(false)}
          match={currentMatch}
          onVoteSuccess={(updated) => {
            setLocalMatch(updated);
            onMatchUpdated?.(updated);
          }}
        />
      )}
    </div>
  );
};


// Sub-component: Sofascore pitch pin with rating badge and filter states
const SofascorePlayerPin: React.FC<{
  player: Player;
  isKeeper?: boolean;
  candidate?: PlayerOfTheMatchCandidate;
  filter?: 'performance' | 'club' | 'age' | 'number';
  teamSide?: 'home' | 'away';
  isCaptain?: boolean;
  isMatchPlayed?: boolean;
  onClick: () => void;
}> = ({ player, isKeeper, candidate, filter = 'performance', teamSide = 'home', isCaptain = false, isMatchPlayed = false, onClick }) => {
  if (!player) return null;
  const pNum = (player as any).jerseyNumber ?? player.number ?? '?';
  const hasValidRating = isMatchPlayed && typeof candidate?.algoRating === 'number' && !isNaN(candidate.algoRating) && !candidate.isUnusedSub;
  const ratingNum = hasValidRating ? candidate!.algoRating! : undefined;
  const ratingStr = ratingNum !== undefined ? ratingNum.toFixed(1) : undefined;

  // Performance tier color coding matching Sofascore
  let ratingBadgeStyle = 'bg-blue-600 text-white font-bold';
  if (ratingNum !== undefined) {
    if (ratingNum >= 8.5) {
      ratingBadgeStyle = 'bg-amber-400 text-slate-950 font-black ring-1 ring-amber-300';
    } else if (ratingNum >= 7.5) {
      ratingBadgeStyle = 'bg-emerald-600 text-white font-black';
    } else if (ratingNum <= 6.2) {
      ratingBadgeStyle = 'bg-orange-600 text-white font-medium';
    }
  }

  const tagText = candidate?.tags?.[0];
  const isAway = teamSide === 'away';
  const surname = player.name ? player.name.split(' ').slice(-1)[0] : 'Spiller';
  const initial = player.name ? player.name.charAt(0) : '';

  // Avatar styling based on teamSide and role
  const avatarRing = isKeeper
    ? 'border-amber-400 bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950'
    : isAway
    ? 'border-white bg-gradient-to-b from-amber-500 to-amber-700 text-white'
    : 'border-white bg-gradient-to-b from-[#165094] to-[#0a2b57] text-white';

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center group cursor-pointer focus:outline-hidden min-w-[58px] px-1 py-0.5 rounded-lg active:scale-95 transition-transform"
      title={`${player.name} (#${pNum})${ratingStr ? ` - Børs: ${ratingStr}/10` : ''}${tagText ? ` • ${tagText}` : ''}`}
    >
      <div className="relative">
        {/* Sofascore Circular Player Avatar Badge */}
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex flex-col items-center justify-center font-black text-xs shadow-lg border-2 ${avatarRing} group-hover:scale-105 group-hover:ring-2 group-hover:ring-amber-300 transition-all relative overflow-hidden`}
        >
          {/* Subtle kit/collar accent */}
          <div className="absolute top-0 inset-x-2 h-1 bg-white/25 rounded-b-xs" />
          <span className="font-mono text-xs leading-none drop-shadow-xs">{pNum}</span>
          <span className="text-[8px] font-bold opacity-80 uppercase leading-none mt-0.5">
            {isKeeper ? 'GK' : initial}
          </span>
        </div>

        {/* Dynamic Badge: Rating / Filter info - Only show performance rating if genuine rating exists */}
        {filter === 'performance' && ratingStr && (
          <span
            className={`absolute -bottom-1 -right-2 text-[9px] px-1.5 py-0.2 rounded-full shadow-md border border-white font-mono leading-tight ${ratingBadgeStyle}`}
          >
            {ratingStr}
          </span>
        )}

        {filter === 'club' && (
          <span
            className={`absolute -bottom-1 -right-2 text-[8px] px-1.5 py-0.2 rounded-full shadow-md border border-white font-black leading-tight ${
              isAway ? 'bg-amber-600 text-white' : 'bg-[#165094] text-white'
            }`}
          >
            {isAway ? 'AWAY' : 'BØNES'}
          </span>
        )}

        {filter === 'age' && (
          <span className="absolute -bottom-1 -right-2 text-[8px] px-1.5 py-0.2 rounded-full shadow-md border border-white font-black leading-tight bg-slate-800 text-blue-200">
            {player.position ? player.position.substring(0, 3) : 'SP'}
          </span>
        )}

        {filter === 'number' && (
          <span className="absolute -bottom-1 -right-2 text-[8px] px-1.5 py-0.2 rounded-full shadow-md border border-white font-black leading-tight bg-slate-900 text-amber-300">
            #{pNum}
          </span>
        )}
      </div>

      {/* Name and Captain Pill */}
      <span className="text-[10px] font-bold text-white drop-shadow-md mt-1.5 max-w-[72px] truncate text-center bg-slate-950/80 border border-white/10 px-1.5 py-0.5 rounded-md flex items-center justify-center space-x-0.5">
        <span className="truncate">{surname}</span>
        {isCaptain && <span className="text-amber-400 font-black shrink-0 text-[9px]">(c)</span>}
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
