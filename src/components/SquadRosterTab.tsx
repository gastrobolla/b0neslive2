import React, { useState, useMemo, useEffect } from 'react';
import { Users, Search, RefreshCw, ChevronRight, CheckCircle2, X, Filter, Star } from 'lucide-react';
import { ALL_BONES_SQUADS, TeamSquad } from '../data/bonesSquads.js';
import { Player, PlayerPosition, TeamInfo, Match, DivisionTable } from '../types.js';
import { getOfficialStatsForPlayer } from '../services/playerStatsApi.js';
import { enrichPlayersWithMostPlayedPosition } from '../utils/positionEngine.js';
import { calculateClubRatingLeaderboards } from '../utils/playerRatingEngine.js';

interface SquadRosterTabProps {
  teams: TeamInfo[];
  matches?: Match[];
  tables?: DivisionTable[] | Record<string, DivisionTable>;
  selectedTeamId: string;
  onSelectTeamId: (teamId: string) => void;
  onSelectPlayer: (playerName: string, teamIdHint?: string) => void;
}

// Generate high-contrast player initials for thumbnail
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Tactical position themes for FotMob/Sofascore style thumbnails
const getPositionTheme = (pos?: PlayerPosition) => {
  switch (pos) {
    case 'Keeper':
      return {
        gradient: 'from-amber-500 to-amber-700',
        border: 'border-amber-400/50',
        textColor: 'text-amber-50',
        badgeBg: 'bg-amber-100 text-amber-900 border-amber-200',
        ringColor: 'ring-amber-500/30',
      };
    case 'Forsvar':
      return {
        gradient: 'from-blue-600 to-indigo-800',
        border: 'border-blue-400/50',
        textColor: 'text-blue-50',
        badgeBg: 'bg-blue-100 text-blue-900 border-blue-200',
        ringColor: 'ring-blue-500/30',
      };
    case 'Midtbane':
      return {
        gradient: 'from-emerald-600 to-teal-800',
        border: 'border-emerald-400/50',
        textColor: 'text-emerald-50',
        badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-200',
        ringColor: 'ring-emerald-500/30',
      };
    case 'Angrep':
      return {
        gradient: 'from-rose-600 to-red-800',
        border: 'border-rose-400/50',
        textColor: 'text-rose-50',
        badgeBg: 'bg-rose-100 text-rose-900 border-rose-200',
        ringColor: 'ring-rose-500/30',
      };
    default:
      return {
        gradient: 'from-slate-600 to-slate-800',
        border: 'border-slate-400/50',
        textColor: 'text-slate-50',
        badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
        ringColor: 'ring-slate-500/30',
      };
  }
};

export const SquadRosterTab: React.FC<SquadRosterTabProps> = ({
  matches,
  tables,
  selectedTeamId,
  onSelectTeamId,
  onSelectPlayer,
}) => {
  const [squads, setSquads] = useState<TeamSquad[]>(ALL_BONES_SQUADS);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'all' | 'team'>('all');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Derived algorithmic rating lookup with position weights & opponent table strength
  const playerRatingsMap = useMemo(() => {
    if (!matches || matches.length === 0) return new Map<string, number>();
    const leaderboards = calculateClubRatingLeaderboards(matches, [], tables);
    const map = new Map<string, number>();
    for (const item of leaderboards.allSeasonRanked) {
      if (item.seasonAvgRating > 0) {
        map.set(item.name.toLowerCase().trim(), item.seasonAvgRating);
        if (item.fiksId) map.set(`fiks-${item.fiksId}`, item.seasonAvgRating);
      }
    }
    return map;
  }, [matches, tables]);

  // Load latest squads from server API on mount if available
  useEffect(() => {
    fetch('/api/bones/squads')
      .then((res) => {
        const ct = res.headers.get('content-type') || '';
        return res.ok && ct.includes('application/json') ? res.json() : null;
      })
      .then((json) => {
        if (json && json.success && Array.isArray(json.squads) && json.squads.length > 0) {
          setSquads(json.squads);
        }
      })
      .catch(() => {
        // Fallback already in initial state
      });
  }, []);

  // Handle manual live sync from NFF fotball.no
  const handleSyncFromNff = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch('/api/bones/squads/sync', { method: 'POST' });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.includes('application/json')) {
        setSyncStatus('Kunne ikke hente oppdaterte lister');
        return;
      }
      const data = await res.json();
      if (data.success && data.squads) {
        setSquads(data.squads);
        setSyncStatus(`✓ ${data.playerCount || 315} ekte spillere synkronisert fra NFF`);
      } else {
        setSyncStatus('Kunne ikke hente oppdaterte lister');
      }
    } catch {
      setSyncStatus('Nettverksfeil ved synkronisering');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  // Enrich all squads with dynamically calculated most-played positions across real match lineups
  const effectiveSquads = useMemo(() => {
    if (!matches || matches.length === 0) return squads;
    return squads.map((sq) => ({
      ...sq,
      players: enrichPlayersWithMostPlayedPosition(sq.players, matches),
    }));
  }, [squads, matches]);

  // Currently active squad (defaults to menn-1 if not found)
  const currentSquad = useMemo(() => {
    return (
      effectiveSquads.find((s) => s.teamId === selectedTeamId) ||
      effectiveSquads.find((s) => s.teamId === 'menn-1') ||
      effectiveSquads[0]
    );
  }, [effectiveSquads, selectedTeamId]);

  // Total player count across all 16 real teams
  const totalClubPlayers = useMemo(() => {
    return effectiveSquads.reduce((acc, s) => acc + s.players.length, 0);
  }, [effectiveSquads]);

  // Clean, unified player search and filter
  const isSearching = searchQuery.trim().length > 0;

  const filteredPlayers = useMemo(() => {
    let list: (Player & { squadName?: string; squadId?: string })[] = [];
    const q = searchQuery.trim().toLowerCase();

    // Determine candidate pool based on search scope
    if (isSearching) {
      if (searchScope === 'all') {
        // Search across all 16 squads in Bønes IL
        list = effectiveSquads.flatMap((squad) =>
          squad.players.map((p) => ({
            ...p,
            squadName: squad.shortName,
            squadId: squad.teamId,
          }))
        );
      } else {
        // Search within current squad
        list = currentSquad.players.map((p) => ({
          ...p,
          squadName: currentSquad.shortName,
          squadId: currentSquad.teamId,
        }));
      }

      // Filter by text (name, team name, or jersey number)
      list = list.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q);
        const teamMatch = p.squadName?.toLowerCase().includes(q);
        const numberMatch =
          p.jerseyNumber?.toString() === q ||
          (q.startsWith('#') && p.jerseyNumber?.toString() === q.slice(1));
        const posMatch = p.position?.toLowerCase().includes(q);

        return nameMatch || teamMatch || numberMatch || posMatch;
      });
    } else {
      // Normal squad view
      list = currentSquad.players.map((p) => ({
        ...p,
        squadName: currentSquad.shortName,
        squadId: currentSquad.teamId,
      }));
    }

    // Filter by position tab
    if (selectedPosition !== 'all') {
      list = list.filter((p) => p.position === selectedPosition);
    }

    return list;
  }, [effectiveSquads, currentSquad, searchQuery, searchScope, selectedPosition, isSearching]);

  // Group by position for structured viewing
  const groupedPlayers = useMemo(() => {
    const groups: { [key in PlayerPosition]?: (Player & { squadName?: string; squadId?: string })[] } = {
      Keeper: [],
      Forsvar: [],
      Midtbane: [],
      Angrep: [],
    };

    filteredPlayers.forEach((player) => {
      const pos = (player.position || 'Midtbane') as PlayerPosition;
      if (groups[pos]) {
        groups[pos]!.push(player);
      } else {
        groups.Midtbane!.push(player);
      }
    });

    return groups;
  }, [filteredPlayers]);

  const positions: { key: string; label: string }[] = [
    { key: 'all', label: 'Alle' },
    { key: 'Keeper', label: 'Keepere' },
    { key: 'Forsvar', label: 'Forsvar' },
    { key: 'Midtbane', label: 'Midtbane' },
    { key: 'Angrep', label: 'Angrep' },
  ];

  return (
    <div id="squad-roster-tab" className="space-y-4 max-w-4xl mx-auto pb-10 px-1 sm:px-0">
      {/* Team Selector & Header Banner */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Users className="w-5 h-5 text-[#165094]" />
              <h3 className="text-base font-bold text-slate-900">
                Spillerlister & Lagtropper
              </h3>
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {totalClubPlayers} spillere i 16 lag
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Offisiell NFF FIKS-tropp for alle Bønes IL-lag registrert hos fotball.no
            </p>
          </div>

          {/* Quick Team selector dropdown */}
          <div className="relative min-w-[240px]">
            <select
              id="team-squad-picker"
              value={currentSquad.teamId}
              onChange={(e) => {
                onSelectTeamId(e.target.value);
                // Reset search when switching team so user sees the new squad cleanly
                setSearchQuery('');
              }}
              className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-300 text-slate-900 text-sm font-semibold rounded-xl px-3.5 py-2.5 pr-8 focus:ring-2 focus:ring-[#165094] focus:outline-hidden appearance-none cursor-pointer transition-colors shadow-2xs"
            >
              <optgroup label="Senior (A-lag & Kvinner)">
                <option value="menn-1">Bønes Menn 1 (5. div. menn)</option>
                <option value="bones-1">Bønes 1 (Kvinner / Old girls)</option>
              </optgroup>
              <optgroup label="Junior (G19)">
                <option value="g19-1">Bønes G19-1 (1. div)</option>
                <option value="g19-2">Bønes G19-2 (3. div)</option>
              </optgroup>
              <optgroup label="Gutter Ungdom (G16 - G13)">
                <option value="g16-1">Bønes G16-1 (1. div)</option>
                <option value="g16-2">Bønes G16-2 (2. div)</option>
                <option value="g16-3">Bønes G16-3 (3. div)</option>
                <option value="g14-1">Bønes G14-1</option>
                <option value="g14-2">Bønes G14-2</option>
                <option value="g13-1">Bønes G13-1</option>
                <option value="g13-2">Bønes G13-2</option>
                <option value="g13-3">Bønes G13-3</option>
              </optgroup>
              <optgroup label="Jenter Ungdom (J16 - J13)">
                <option value="j16-1">Bønes J16-1 (2. div)</option>
                <option value="j14-1">Bønes J14-1</option>
                <option value="j13-1">Bønes J13-1</option>
                <option value="j13-2">Bønes J13-2</option>
              </optgroup>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">
              ▼
            </div>
          </div>
        </div>

        {/* Sync action & squad quick info */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncFromNff}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors border border-slate-200 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#165094]' : 'text-slate-500'}`} />
              {isSyncing ? 'Synkroniserer...' : 'Oppdater fra NFF'}
            </button>
            {syncStatus && (
              <span className="text-xs font-semibold text-emerald-700">
                {syncStatus}
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            <span className="text-slate-400">Valgt lag:</span> <strong className="text-slate-800">{currentSquad.teamName}</strong> ({currentSquad.players.length} spillere)
          </div>
        </div>
      </div>

      {/* Prominent Cross-Team Search & Scope Controls */}
      <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-200 space-y-3">
        {/* Search input field */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-player-input"
            type="text"
            placeholder={
              searchScope === 'all'
                ? 'Søk etter navn, draktnr eller lag (f.eks. Henrik, G14, #10)...'
                : `Søk spillere i ${currentSquad.shortName}...`
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#165094] focus:border-[#165094] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
              title="Tøm søk"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Scope selector tabs & position filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
          {/* Search scope toggle */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setSearchScope('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                searchScope === 'all'
                  ? 'bg-[#165094] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Alle 16 Bønes-lag
            </button>
            <button
              onClick={() => setSearchScope('team')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                searchScope === 'team'
                  ? 'bg-[#165094] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kun {currentSquad.shortName}
            </button>
          </div>

          {/* Position filter buttons */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-0.5 scrollbar-none">
            {positions.map((pos) => (
              <button
                key={pos.key}
                onClick={() => setSelectedPosition(pos.key)}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                  selectedPosition === pos.key
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Results Summary Banner */}
        {isSearching && (
          <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200/60 px-3 py-2 rounded-xl text-xs">
            <span className="font-semibold text-blue-950">
              Viser {filteredPlayers.length} treff {searchScope === 'all' ? 'på tvers av alle 16 Bønes-lag' : `i ${currentSquad.teamName}`} for «{searchQuery}»
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-blue-700 hover:text-blue-900 font-bold underline ml-2 shrink-0 cursor-pointer"
            >
              Nullstill
            </button>
          </div>
        )}
      </div>

      {/* Simplified, Compact Roster List with Profile Picture Thumbnails */}
      {filteredPlayers.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-slate-800">Ingen spillere funnet</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Vi fant ingen spillere som matcher søket «{searchQuery}». Prøv et annet navn, draktnummer eller nullstill filteret.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedPosition('all');
              }}
              className="px-4 py-2 bg-[#165094] hover:bg-[#12427a] text-white font-bold text-xs rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              Vis alle spillere
            </button>
            {searchScope === 'team' && (
              <button
                onClick={() => setSearchScope('all')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Søk i alle 16 lag
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {(['Keeper', 'Forsvar', 'Midtbane', 'Angrep'] as PlayerPosition[]).map((pos) => {
            const playersInPos = groupedPlayers[pos] || [];
            if (playersInPos.length === 0) return null;

            const theme = getPositionTheme(pos);

            return (
              <div
                key={pos}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
              >
                {/* Clean Section Header */}
                <div className="bg-slate-50/90 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${theme.gradient.replace('from-', 'bg-').split(' ')[0]}`} />
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-700">
                      {pos === 'Keeper'
                        ? 'Keepere'
                        : pos === 'Forsvar'
                        ? 'Forsvarsspillere'
                        : pos === 'Midtbane'
                        ? 'Midtbanespillere'
                        : 'Angrepsspillere'}{' '}
                      <span className="text-slate-400 font-normal">({playersInPos.length})</span>
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                    Trykk for spillerkort
                  </span>
                </div>

                {/* Compact, Vertical Player Items (No horizontal scrolling on phones) */}
                <div className="divide-y divide-slate-100 w-full overflow-x-hidden">
                  {playersInPos.map((player, pIdx) => {
                    const initials = getInitials(player.name);
                    const official = player.fiksId ? getOfficialStatsForPlayer(player.fiksId) : null;
                    const multiTeams = official?.season2026?.teams;
                    const hasMultiTeams = multiTeams && multiTeams.length > 1;
                    const teamSpecificOfficial = multiTeams?.find((t) => t.teamId === (player.squadId || player.teamId));
                    const displayMatches = Math.max(player.matches || 0, teamSpecificOfficial?.matches || 0, (official?.season2026?.totalMatches && !hasMultiTeams ? official.season2026.totalMatches : 0));
                    const displayGoals = Math.max(player.goals || 0, teamSpecificOfficial?.goals || 0, (official?.season2026?.totalGoals && !hasMultiTeams ? official.season2026.totalGoals : 0));
                    const displayYellow = Math.max(player.yellowCards || 0, teamSpecificOfficial?.yellowCards || 0);

                    return (
                      <div
                        key={`${player.id || player.name}-${player.squadId || 'team'}-${pIdx}`}
                        onClick={() => onSelectPlayer(player.name, player.squadId || player.teamId)}
                        className="w-full px-3.5 py-3 flex items-center justify-between hover:bg-blue-50/50 active:bg-blue-100/60 transition-colors cursor-pointer group"
                      >
                        {/* Left: Profile Picture Thumbnail + Player Details */}
                        <div className="flex items-center space-x-3 min-w-0 pr-2">
                          {/* Modern Player Thumbnail Avatar */}
                          <div className="relative shrink-0">
                            <div
                              className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center font-black text-xs ${theme.textColor} shadow-xs border ${theme.border} tracking-wider group-hover:scale-105 transition-transform`}
                            >
                              {initials}
                            </div>

                            {/* Small jersey number badge */}
                            {player.jerseyNumber ? (
                              <span className="absolute -bottom-1 -left-1 bg-slate-900 text-white font-mono font-black text-[9px] px-1 py-0.2 rounded-md border border-slate-700 shadow-2xs">
                                #{player.jerseyNumber}
                              </span>
                            ) : null}

                            {/* Captain badge overlay */}
                            {player.role === 'Kaptein' && (
                              <span
                                title="Kaptein"
                                className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-amber-200 shadow-xs"
                              >
                                C
                              </span>
                            )}
                            {player.role === 'Visekaptein' && (
                              <span
                                title="Visekaptein"
                                className="absolute -top-1 -right-1 bg-slate-200 text-slate-800 font-black text-[8px] w-4 h-4 rounded-full flex items-center justify-center border border-slate-300 shadow-xs"
                              >
                                VC
                              </span>
                            )}
                          </div>

                          {/* Text info: Name, position, team */}
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              <span className="font-black text-slate-900 text-sm truncate group-hover:text-[#165094] transition-colors">
                                {player.name}
                              </span>

                              {hasMultiTeams && (
                                <span className="bg-purple-100 text-purple-900 font-bold text-[9px] px-1.5 py-0.2 rounded-md border border-purple-200 shrink-0">
                                  Flere lag
                                </span>
                              )}
                            </div>

                            {/* Compact meta row: position & team tag */}
                            <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-0.5 truncate">
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${theme.badgeBg}`}>
                                {player.position}
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-slate-700 truncate">
                                {player.squadName ? player.squadName : currentSquad.shortName}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Key Stats Summary + Chevron */}
                        <div className="flex items-center space-x-2.5 shrink-0">
                          {/* Season Quick Stats */}
                          <div className="text-right flex flex-col items-end">
                            {(() => {
                              const playerRating =
                                playerRatingsMap.get(player.name.toLowerCase().trim()) ||
                                (player.fiksId ? playerRatingsMap.get(`fiks-${player.fiksId}`) : undefined);

                              return playerRating && playerRating > 0 ? (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono font-black mb-0.5 shadow-2xs"
                                  title={`Sesongbørs: ${playerRating.toFixed(2)}`}
                                >
                                  <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-400 shrink-0" />
                                  <span>{playerRating.toFixed(2)}</span>
                                </span>
                              ) : null;
                            })()}

                            {displayGoals > 0 ? (
                              <div>
                                <span className="text-xs font-black font-mono text-rose-600 block leading-tight">
                                  {displayGoals} ⚽
                                </span>
                                {displayMatches > 0 && (
                                  <span className="text-[10px] font-mono text-slate-400 block leading-none mt-0.5">
                                    {displayMatches} k
                                  </span>
                                )}
                              </div>
                            ) : displayMatches > 0 ? (
                              <span className="text-xs font-bold font-mono text-slate-600 block leading-tight">
                                {displayMatches} <span className="text-[10px] font-sans font-normal text-slate-400">kamper</span>
                              </span>
                            ) : null}

                            {displayYellow > 0 && (
                              <span className="text-[10px] font-mono font-bold text-amber-700 block mt-0.5">
                                {displayYellow}🟨
                              </span>
                            )}
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
