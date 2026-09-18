import React, { useState, useMemo, useEffect } from 'react';
import { Users, Search, RefreshCw, ChevronRight, ExternalLink, CheckCircle2 } from 'lucide-react';
import { ALL_BONES_SQUADS, TeamSquad } from '../data/bonesSquads.js';
import { Player, PlayerPosition, TeamInfo } from '../types.js';

interface SquadRosterTabProps {
  teams: TeamInfo[];
  selectedTeamId: string;
  onSelectTeamId: (teamId: string) => void;
  onSelectPlayer: (playerName: string, teamIdHint?: string) => void;
}

export const SquadRosterTab: React.FC<SquadRosterTabProps> = ({
  selectedTeamId,
  onSelectTeamId,
  onSelectPlayer,
}) => {
  const [squads, setSquads] = useState<TeamSquad[]>(ALL_BONES_SQUADS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Load latest squads from server API on mount if available
  useEffect(() => {
    fetch('/api/bones/squads')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.squads) && json.squads.length > 0) {
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

  // Currently active squad (defaults to menn-1 if not found)
  const currentSquad = useMemo(() => {
    return (
      squads.find((s) => s.teamId === selectedTeamId) ||
      squads.find((s) => s.teamId === 'menn-1') ||
      squads[0]
    );
  }, [squads, selectedTeamId]);

  // Total player count across all 16 real teams
  const totalClubPlayers = useMemo(() => {
    return squads.reduce((acc, s) => acc + s.players.length, 0);
  }, [squads]);

  // Filtered players (by squad, position, and search query)
  const filteredPlayers = useMemo(() => {
    let list: (Player & { squadName?: string })[] = [];

    if (searchQuery.trim().length > 1) {
      // Search across ALL 16 squads if user is searching
      const q = searchQuery.toLowerCase();
      list = squads.flatMap((squad) =>
        squad.players
          .filter((p) => p.name.toLowerCase().includes(q) || squad.teamName.toLowerCase().includes(q))
          .map((p) => ({ ...p, squadName: squad.shortName }))
      );
    } else {
      // Normal squad view
      list = currentSquad.players;
    }

    if (selectedPosition !== 'all') {
      list = list.filter((p) => p.position === selectedPosition);
    }

    return list;
  }, [squads, currentSquad, searchQuery, selectedPosition]);

  // Group by position
  const groupedPlayers = useMemo(() => {
    const groups: { [key in PlayerPosition]?: (Player & { squadName?: string })[] } = {
      Keeper: [],
      Forsvar: [],
      Midtbane: [],
      Angrep: [],
    };

    filteredPlayers.forEach((player) => {
      if (groups[player.position]) {
        groups[player.position]!.push(player);
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
    <div id="squad-roster-tab" className="space-y-4 max-w-4xl mx-auto pb-8">
      {/* Mobile-friendly team selector banner */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">
                Spillerlister & Lagtropper
              </h3>
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Ekte NFF-data ({totalClubPlayers} spillere)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Offisielle spillerlister og tropper for alle 16 Bønes IL-lag registrert hos NFF fotball.no
            </p>
          </div>

          {/* Team picker dropdown container */}
          <div className="relative min-w-[260px]">
            <select
              id="team-squad-picker"
              value={currentSquad.teamId}
              onChange={(e) => onSelectTeamId(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/90 focus:bg-white border border-slate-300 text-slate-900 text-sm font-semibold rounded-xl px-3.5 py-2.5 pr-9 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden appearance-none cursor-pointer transition-colors shadow-2xs"
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

        {/* Sync button and status */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 pb-1 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncFromNff}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors border border-slate-200 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
              {isSyncing ? 'Synkroniserer NFF...' : 'Synk fra NFF'}
            </button>
            {syncStatus && (
              <span className="text-xs font-semibold text-emerald-700 animate-fade-in">
                {syncStatus}
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-400">
            Kilde: NFF fotball.no • FIKS ID {currentSquad.fiksId || 'Offisiell'}
          </div>
        </div>

        {/* Squad Meta Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
            <span className="text-slate-500 block text-[11px]">Lag:</span>
            <span className="font-bold text-slate-900 truncate block">
              {currentSquad.teamName}
            </span>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
            <span className="text-slate-500 block text-[11px]">Trener / Kontaktperson:</span>
            <span className="font-bold text-slate-900 truncate block" title={currentSquad.coach}>
              {currentSquad.coach}
            </span>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
            <span className="text-slate-500 block text-[11px]">Standard Formasjon:</span>
            <span className="font-bold text-emerald-800">
              {currentSquad.formation}
            </span>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
            <span className="text-slate-500 block text-[11px]">Spillere i tropp:</span>
            <span className="font-bold text-slate-900">
              {currentSquad.players.length} ekte spillere
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="search-player-input"
            type="text"
            placeholder="Søk blant 315 ekte Bønes-spillere (f.eks. Philip, Henrik, Alexander)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded"
            >
              Nullstill
            </button>
          )}
        </div>

        {/* Position filters */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {positions.map((pos) => (
            <button
              key={pos.key}
              onClick={() => setSelectedPosition(pos.key)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-colors shrink-0 ${
                selectedPosition === pos.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </div>

      {/* Roster List by Positions */}
      {filteredPlayers.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-sm text-slate-800">Ingen spillere funnet</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Vi fant ingen spillere som matcher søket «{searchQuery}». Prøv et annet navn eller nullstill filteret.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedPosition('all');
            }}
            className="mt-4 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs rounded-xl transition-colors shadow-2xs"
          >
            Vis hele troppen
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {(['Keeper', 'Forsvar', 'Midtbane', 'Angrep'] as PlayerPosition[]).map((pos) => {
            const playersInPos = groupedPlayers[pos] || [];
            if (playersInPos.length === 0) return null;

            return (
              <div key={pos} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      {pos === 'Keeper'
                        ? 'Keepere'
                        : pos === 'Forsvar'
                        ? 'Forsvarsspillere'
                        : pos === 'Midtbane'
                        ? 'Midtbanespillere'
                        : 'Angrepsspillere'}{' '}
                      ({playersInPos.length})
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Trykk for spillerkort
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {playersInPos.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => onSelectPlayer(player.name, player.teamId)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 active:bg-slate-100 transition-colors text-left focus:outline-hidden group"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${
                            player.position === 'Keeper'
                              ? 'bg-amber-50 text-amber-900 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                          }`}
                        >
                          {player.jerseyNumber}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm truncate group-hover:text-emerald-700 transition-colors">
                              {player.name}
                            </span>
                            {player.role === 'Kaptein' && (
                              <span className="bg-amber-100 text-amber-900 font-bold text-[10px] px-1.5 py-0.2 rounded border border-amber-300 shrink-0">
                                C
                              </span>
                            )}
                            {player.role === 'Visekaptein' && (
                              <span className="bg-slate-100 text-slate-700 font-semibold text-[10px] px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                                VC
                              </span>
                            )}
                            {player.fiksId && (
                              <span
                                title="Verifisert NFF spiller"
                                className="bg-slate-100 text-slate-600 font-mono text-[10px] px-1.5 py-0.2 rounded border border-slate-200 shrink-0"
                              >
                                FIKS {player.fiksId}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                            <span>{player.position}</span>
                            {player.squadName && (
                              <>
                                <span>•</span>
                                <span className="font-medium text-emerald-700">
                                  {player.squadName}
                                </span>
                              </>
                            )}
                            <span>•</span>
                            <span className="text-slate-400">Bønes IL</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        {player.fiksId && (
                          <a
                            href={`https://www.fotball.no/fotballdata/person/profil/?fiksId=${player.fiksId}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Åpne spillerprofil på fotball.no"
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors hidden sm:inline-flex"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
