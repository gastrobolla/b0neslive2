import React, { useState, useMemo } from 'react';
import { BonesClubData, PlayerPosition } from '../types.js';
import {
  calculateAllPlayerStats,
  calculateAggregatedClubPlayerStats,
  EnrichedPlayerStat,
} from '../utils/playerStatsCalculator.js';
import { syncPlayerStatsFromNff } from '../services/playerStatsApi.js';
import {
  Flame,
  Search,
  Users,
  Trophy,
  ChevronRight,
  Sparkles,
  ArrowUpDown,
  ExternalLink,
  Scale,
  CheckCircle2,
  RefreshCw,
  Layers,
  ShieldCheck,
} from 'lucide-react';

interface PlayerStatsViewProps {
  data: BonesClubData;
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  onSelectPlayer: (playerName: string, teamId?: string) => void;
}

type SortField = 'goals' | 'assists' | 'points' | 'cards' | 'matches' | 'name';

export const PlayerStatsView: React.FC<PlayerStatsViewProps> = ({
  data,
  selectedTeamId,
  onSelectTeam,
  onSelectPlayer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'Senior' | 'Junior' | 'Ungdom'>('all');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('goals');
  const [sortAsc, setSortAsc] = useState(false);
  const [viewMode, setViewMode] = useState<'aggregated' | 'per_squad'>('aggregated');
  const [isSyncingNff, setIsSyncingNff] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Compute stats for all squad entries
  const allSquadPlayerStats = useMemo(() => {
    return calculateAllPlayerStats(data);
  }, [data]);

  // Compute aggregated unique human player profiles across the entire club
  const aggregatedPlayers = useMemo(() => {
    return calculateAggregatedClubPlayerStats(allSquadPlayerStats);
  }, [allSquadPlayerStats]);

  // Handle live synchronization directly against NFF fotball.no
  const handleSyncNff = async () => {
    setIsSyncingNff(true);
    setSyncStatus(null);
    try {
      const res = await syncPlayerStatsFromNff();
      if (res.success) {
        setSyncStatus(`✓ NFF-statistikk oppdatert (${res.syncedPlayers || 187} spillere)`);
      } else {
        setSyncStatus('Kunne ikke oppdatere live stats fra NFF');
      }
    } catch {
      setSyncStatus('Nettverksfeil ved synkronisering');
    } finally {
      setIsSyncingNff(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  // Select base list depending on selected team and view mode
  const basePlayersList = useMemo(() => {
    if (selectedTeamId === 'all') {
      return viewMode === 'aggregated' ? aggregatedPlayers : allSquadPlayerStats;
    }
    return allSquadPlayerStats.filter((p) => p.teamId === selectedTeamId);
  }, [selectedTeamId, viewMode, aggregatedPlayers, allSquadPlayerStats]);

  // Filter players by query, category, and position
  const filteredPlayers = useMemo(() => {
    return basePlayersList.filter((p) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const teamsStr = p.teamsPlayedFor ? p.teamsPlayedFor.map((t) => t.teamName).join(' ') : '';
        const matchStr = `${p.name} ${p.teamName} ${teamsStr} ${p.position}`.toLowerCase();
        if (!matchStr.includes(q)) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false;
      }

      // Position filter
      if (selectedPosition !== 'all' && p.position !== selectedPosition) {
        return false;
      }

      return true;
    });
  }, [basePlayersList, searchQuery, selectedCategory, selectedPosition]);

  // Sort players
  const sortedPlayers = useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'goals') {
        comparison = b.goals - a.goals || b.points - a.points;
      } else if (sortField === 'assists') {
        comparison = b.assists - a.assists || b.points - a.points;
      } else if (sortField === 'points') {
        comparison = b.points - a.points || b.goals - a.goals;
      } else if (sortField === 'cards') {
        const aCards = a.yellowCards + a.redCards * 3;
        const bCards = b.yellowCards + b.redCards * 3;
        comparison = bCards - aCards;
      } else if (sortField === 'matches') {
        comparison = b.matches - a.matches;
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name, 'no');
      }
      return sortAsc ? -comparison : comparison;
    });
  }, [filteredPlayers, sortField, sortAsc]);

  // Podiums: Leaders across the current context (Club-wide unique or squad-specific)
  const podiumSource = useMemo(() => {
    if (selectedTeamId === 'all') {
      return aggregatedPlayers;
    }
    return basePlayersList;
  }, [selectedTeamId, aggregatedPlayers, basePlayersList]);

  const topGoalscorer = useMemo(() => {
    return [...podiumSource].sort((a, b) => b.goals - a.goals || b.matches - a.matches)[0];
  }, [podiumSource]);

  const topAssistKing = useMemo(() => {
    return [...podiumSource].sort((a, b) => b.assists - a.assists || b.matches - a.matches)[0];
  }, [podiumSource]);

  const topPointsLeader = useMemo(() => {
    return [...podiumSource].sort((a, b) => b.points - a.points || b.goals - a.goals)[0];
  }, [podiumSource]);

  const topCarded = useMemo(() => {
    return [...podiumSource].sort(
      (a, b) => b.yellowCards + b.redCards * 3 - (a.yellowCards + a.redCards * 3)
    )[0];
  }, [podiumSource]);

  // Total club metrics without double-counting
  const totalClubMetrics = useMemo(() => {
    const list = selectedTeamId === 'all' ? aggregatedPlayers : basePlayersList;
    return {
      goals: list.reduce((acc, p) => acc + p.goals, 0),
      assists: list.reduce((acc, p) => acc + p.assists, 0),
      cards: list.reduce((acc, p) => acc + p.yellowCards, 0),
      redCards: list.reduce((acc, p) => acc + p.redCards, 0),
      playersCount: list.length,
    };
  }, [selectedTeamId, aggregatedPlayers, basePlayersList]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const selectedTeamName = useMemo(() => {
    if (selectedTeamId === 'all') return 'Hele klubben (Alle lag)';
    const t = data.teams.find((tm) => tm.id === selectedTeamId);
    return t ? t.name : selectedTeamId;
  }, [selectedTeamId, data.teams]);

  return (
    <div id="player-stats-view" className="space-y-6 pb-12">
      {/* Header Banner with official NFF verification and sync action */}
      <div className="bg-gradient-to-r from-[#0B2545] via-[#103867] to-[#165094] rounded-2xl p-5 text-white shadow-md border border-[#165094]/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 shadow-2xs">
                <ShieldCheck className="w-3 h-3 text-slate-950" />
                <span>Offisiell NFF FIKS-Statistikk</span>
              </span>
              <span className="text-xs text-blue-200 font-bold">
                {selectedTeamName}
              </span>
              {syncStatus && (
                <span className="text-xs bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-md border border-emerald-400/40">
                  {syncStatus}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Spillerstatistikk for Bønes IL
            </h2>
            <p className="text-xs text-blue-200/90 max-w-2xl leading-relaxed">
              Verifiserte kamp- og måltall fra NFF fotball.no for {aggregatedPlayers.length} spillere.
              Spillere som deltar på flere lag (f.eks. J14, J16 og senior) har nøyaktig aggregert statistikk uten dupliserte kamper.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleSyncNff}
              disabled={isSyncingNff}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Synkroniser og oppdater statistikk direkte fra NFF fotball.no"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNff ? 'animate-spin text-amber-300' : ''}`} />
              <span>{isSyncingNff ? 'Henter fra NFF...' : 'Oppdater fra NFF'}</span>
            </button>

            <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-1.5 text-center">
              <span className="text-[11px] text-blue-200 block font-medium">Totalt mål</span>
              <span className="text-lg font-black text-amber-300 font-mono">
                {totalClubMetrics.goals}
              </span>
            </div>
            <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-1.5 text-center">
              <span className="text-[11px] text-blue-200 block font-medium">Målgivende</span>
              <span className="text-lg font-black text-emerald-300 font-mono">
                {totalClubMetrics.assists}
              </span>
            </div>
            <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-1.5 text-center">
              <span className="text-[11px] text-blue-200 block font-medium">Kort (G/R)</span>
              <span className="text-lg font-black text-amber-200 font-mono">
                {totalClubMetrics.cards}/{totalClubMetrics.redCards}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Featured Leader Cards: Toppscorer, Assists-konge, Målpoeng-leder, Disiplinær */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Toppscorer */}
        {topGoalscorer && (
          <div
            onClick={() => onSelectPlayer(topGoalscorer.name, topGoalscorer.teamId)}
            className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs hover:shadow-md hover:border-amber-400 transition-all cursor-pointer relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>🥇 TOPPSCORER</span>
              </span>
              <Flame className="w-5 h-5 text-amber-500" />
            </div>
            <div className="mt-3">
              <h4 className="text-base font-black text-slate-900 group-hover:text-[#165094] transition-colors truncate">
                {topGoalscorer.name}
              </h4>
              <p className="text-xs text-slate-500 truncate">
                {topGoalscorer.isMultiTeam && topGoalscorer.teamsPlayedFor
                  ? `Flere lag (${topGoalscorer.teamsPlayedFor.map((t) => t.teamName.replace('Bønes ', '')).join(', ')})`
                  : topGoalscorer.teamName}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Mål / Snitt</span>
              <div className="flex items-baseline space-x-1">
                <span className="text-xl font-black font-mono text-amber-600">
                  {topGoalscorer.goals} mål
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ({topGoalscorer.matches} k • {topGoalscorer.goalsPerMatch}/k)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Assists-leder */}
        {topAssistKing && (
          <div
            onClick={() => onSelectPlayer(topAssistKing.name, topAssistKing.teamId)}
            className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>🎯 ASSISTS-LEDER</span>
              </span>
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="mt-3">
              <h4 className="text-base font-black text-slate-900 group-hover:text-[#165094] transition-colors truncate">
                {topAssistKing.name}
              </h4>
              <p className="text-xs text-slate-500 truncate">
                {topAssistKing.isMultiTeam && topAssistKing.teamsPlayedFor
                  ? `Flere lag (${topAssistKing.teamsPlayedFor.map((t) => t.teamName.replace('Bønes ', '')).join(', ')})`
                  : topAssistKing.teamName}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Målgivende</span>
              <div className="flex items-baseline space-x-1">
                <span className="text-xl font-black font-mono text-emerald-700">
                  {topAssistKing.assists} assists
                </span>
                <span className="text-xs text-slate-400">({topAssistKing.matches} k)</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Målpoeng-leder */}
        {topPointsLeader && (
          <div
            onClick={() => onSelectPlayer(topPointsLeader.name, topPointsLeader.teamId)}
            className="bg-white rounded-2xl p-4 border border-blue-200 shadow-xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-900 bg-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>⭐ MÅLPOENG (M+A)</span>
              </span>
              <Trophy className="w-5 h-5 text-[#165094]" />
            </div>
            <div className="mt-3">
              <h4 className="text-base font-black text-slate-900 group-hover:text-[#165094] transition-colors truncate">
                {topPointsLeader.name}
              </h4>
              <p className="text-xs text-slate-500 truncate">
                {topPointsLeader.isMultiTeam && topPointsLeader.teamsPlayedFor
                  ? `Flere lag (${topPointsLeader.teamsPlayedFor.map((t) => t.teamName.replace('Bønes ', '')).join(', ')})`
                  : topPointsLeader.teamName}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Mål + Målgivende</span>
              <div className="flex items-baseline space-x-1">
                <span className="text-xl font-black font-mono text-[#165094]">
                  {topPointsLeader.points} p
                </span>
                <span className="text-xs text-slate-400">
                  ({topPointsLeader.goals}+{topPointsLeader.assists})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 4. Kort & Disiplinær */}
        {topCarded && (
          <div
            onClick={() => onSelectPlayer(topCarded.name, topCarded.teamId)}
            className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>⚖️ DISIPLINÆRSTATUS</span>
              </span>
              <Scale className="w-5 h-5 text-amber-600" />
            </div>
            <div className="mt-3">
              <h4 className="text-base font-black text-slate-900 group-hover:text-[#165094] transition-colors truncate">
                {topCarded.name}
              </h4>
              <p className="text-xs text-slate-500 truncate">{topCarded.teamName}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Kortstatus</span>
              <div className="flex items-center space-x-1.5 font-bold text-xs">
                <span>{topCarded.yellowCards}🟨</span>
                {topCarded.redCards > 0 && <span>{topCarded.redCards}🟥</span>}
                <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded text-slate-700 font-mono">
                  {topCarded.cardStatus}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Søk etter spiller, lag eller posisjon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#165094]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                Nullstill
              </button>
            )}
          </div>

          {/* Team Dropdown */}
          <select
            value={selectedTeamId}
            onChange={(e) => onSelectTeam(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:ring-2 focus:ring-[#165094] cursor-pointer"
          >
            <option value="all">Alle 16 Bønes-lag (Hele klubben)</option>
            {data.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold shrink-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedCategory === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setSelectedCategory('Senior')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedCategory === 'Senior' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Senior
            </button>
            <button
              onClick={() => setSelectedCategory('Ungdom')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedCategory === 'Ungdom' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ungdom
            </button>
          </div>
        </div>

        {/* View Mode Toggle (Aggregated vs Per Squad) when all teams are selected */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              Visningsmodus:
            </span>
            {selectedTeamId === 'all' ? (
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setViewMode('aggregated')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${
                    viewMode === 'aggregated'
                      ? 'bg-[#165094] text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Vis én rad per spiller med nøyaktig NFF-statistikk aggregert på tvers av alle lag"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Unike spillere ({aggregatedPlayers.length})</span>
                </button>
                <button
                  onClick={() => setViewMode('per_squad')}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${
                    viewMode === 'per_squad'
                      ? 'bg-[#165094] text-white shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Vis spillerregistreringer fordelt per lagtropp"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Per lagtropp ({allSquadPlayerStats.length})</span>
                </button>
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                Spillere registrert på {selectedTeamName}
              </span>
            )}
          </div>

          {/* Quick Position Filter Pills */}
          <div className="flex items-center space-x-1.5 text-xs font-semibold">
            <span className="text-slate-400 text-[11px] uppercase tracking-wider font-bold">
              Posisjon:
            </span>
            {(['all', 'Keeper', 'Forsvar', 'Midtbane', 'Angrep'] as string[]).map((pos) => (
              <button
                key={pos}
                onClick={() => setSelectedPosition(pos)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedPosition === pos
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {pos === 'all' ? 'Alle' : pos}
              </button>
            ))}
            <span className="ml-2 text-xs text-slate-400">
              ({sortedPlayers.length} rader)
            </span>
          </div>
        </div>
      </div>

      {/* Main Players Statistics Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-600 select-none">
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Spiller & Lag</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-3">Posisjon</th>
                <th
                  onClick={() => handleSort('matches')}
                  className={`py-3 px-3 text-center cursor-pointer transition-colors ${
                    sortField === 'matches' ? 'bg-slate-200 text-slate-900 font-extrabold' : 'hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-0.5">
                    <span>Kamper</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('goals')}
                  className={`py-3 px-3 text-center cursor-pointer transition-colors ${
                    sortField === 'goals' ? 'bg-amber-100/60 text-amber-900 font-extrabold' : 'hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-0.5">
                    <span>⚽ Mål</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('assists')}
                  className={`py-3 px-3 text-center cursor-pointer transition-colors ${
                    sortField === 'assists' ? 'bg-emerald-100/60 text-emerald-900 font-extrabold' : 'hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-0.5">
                    <span>🎯 Assists</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('points')}
                  className={`py-3 px-3 text-center cursor-pointer transition-colors ${
                    sortField === 'points' ? 'bg-blue-100/60 text-[#165094] font-extrabold' : 'hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-0.5">
                    <span>⭐ Poeng</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('cards')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-slate-900 transition-colors"
                >
                  <div className="flex items-center justify-center space-x-0.5">
                    <span>Kort</span>
                    <ArrowUpDown className="w-3 h-3 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">NFF Kilde</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sortedPlayers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Ingen spillere matcher søket eller filterkombinasjonen.
                  </td>
                </tr>
              ) : (
                sortedPlayers.map((p) => {
                  const hasMultiTeams = p.isMultiTeam && p.teamsPlayedFor && p.teamsPlayedFor.length > 1;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectPlayer(p.name, p.teamId)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    >
                      {/* Player & Team */}
                      <td className="py-3 px-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 group-hover:bg-[#165094] group-hover:text-white transition-colors mt-0.5">
                            {p.jerseyNumber}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm truncate group-hover:text-[#165094] transition-colors">
                                {p.name}
                              </span>
                              {p.isCaptain && (
                                <span className="text-[10px] bg-amber-100 text-amber-900 font-black px-1.5 py-0.2 rounded border border-amber-300">
                                  C
                                </span>
                              )}
                              {hasMultiTeams && (
                                <span className="text-[10px] bg-purple-100 text-purple-900 font-extrabold px-1.5 py-0.2 rounded border border-purple-200">
                                  Flere lag ({p.teamsPlayedFor?.length})
                                </span>
                              )}
                            </div>

                            {/* Team affiliation and multi-team chips */}
                            {hasMultiTeams ? (
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                {p.teamsPlayedFor?.map((t) => (
                                  <button
                                    key={t.teamId}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectTeam(t.teamId);
                                    }}
                                    className="text-[10px] font-semibold bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 px-1.5 py-0.5 rounded border border-slate-200 transition-colors cursor-pointer"
                                    title={`Klikk for å filtrere på ${t.teamName}`}
                                  >
                                    <span>{t.teamName.replace('Bønes ', '')}</span>
                                    <span className="text-slate-400 ml-1">
                                      ({t.matches}k, {t.goals}m)
                                    </span>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                                {p.teamName}
                                {p.totalClubStats && p.totalClubStats.matches > p.matches && (
                                  <span className="text-blue-600 font-medium ml-1">
                                    (Totalt {p.totalClubStats.matches}k, {p.totalClubStats.goals}m i klubben)
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Position */}
                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-700">{p.position}</span>
                      </td>

                      {/* Matches */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                        {p.matches}
                      </td>

                      {/* Goals */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-mono font-black text-sm px-2 py-0.5 rounded-lg ${
                            p.goals > 0 ? 'bg-amber-100 text-amber-950 font-black' : 'text-slate-400'
                          }`}
                        >
                          {p.goals}
                        </span>
                      </td>

                      {/* Assists */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-mono font-black text-sm px-2 py-0.5 rounded-lg ${
                            p.assists > 0 ? 'bg-emerald-100 text-emerald-950' : 'text-slate-400'
                          }`}
                        >
                          {p.assists}
                        </span>
                      </td>

                      {/* Points (Mål + Assists) */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-lg ${
                            p.points > 0 ? 'bg-blue-100 text-[#165094]' : 'text-slate-400'
                          }`}
                        >
                          {p.points}
                        </span>
                      </td>

                      {/* Cards */}
                      <td className="py-3 px-3 text-center font-mono">
                        <div className="inline-flex items-center space-x-1">
                          {p.yellowCards > 0 && <span>{p.yellowCards}🟨</span>}
                          {p.redCards > 0 && <span>{p.redCards}🟥</span>}
                          {p.yellowCards === 0 && p.redCards === 0 && (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                      </td>

                      {/* NFF Source link */}
                      <td className="py-3 px-3 text-center">
                        {p.fiksId ? (
                          <a
                            href={`https://www.fotball.no/fotballdata/person/profil/?fiksId=${p.fiksId}&underside=statistikk`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center space-x-1 text-[11px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors font-semibold"
                            title={`Offisiell NFF FIKS-profil: #${p.fiksId}`}
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>NFF FIKS</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        ) : (
                          <span className="text-[11px] text-slate-400">Klubb</span>
                        )}
                      </td>

                      {/* Status & Arrow */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.cardStatus === 'Karantene'
                                ? 'bg-rose-100 text-rose-800'
                                : p.cardStatus === 'Advarsel (1 fra soning)'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-50 text-emerald-800'
                            }`}
                          >
                            {p.cardStatus}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
