import React, { useState, useMemo } from 'react';
import { BonesClubData, TeamInfo, PlayerPosition } from '../types.js';
import { calculateAllPlayerStats, EnrichedPlayerStat } from '../utils/playerStatsCalculator.js';
import {
  Flame,
  Award,
  Search,
  Users,
  Trophy,
  Filter,
  Shield,
  ChevronRight,
  TrendingUp,
  Sparkles,
  ArrowUpDown,
  ExternalLink,
  Target,
  Scale,
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

  // Compute stats for all 315 Bønes players
  const allPlayerStats = useMemo(() => {
    return calculateAllPlayerStats(data);
  }, [data]);

  // Filter players
  const filteredPlayers = useMemo(() => {
    return allPlayerStats.filter((p) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchStr = `${p.name} ${p.teamName} ${p.position}`.toLowerCase();
        if (!matchStr.includes(q)) return false;
      }

      // Team filter
      if (selectedTeamId !== 'all' && p.teamId !== selectedTeamId) {
        return false;
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
  }, [allPlayerStats, searchQuery, selectedTeamId, selectedCategory, selectedPosition]);

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

  // Podiums: Leaders across the club
  const topGoalscorer = useMemo(() => {
    return [...allPlayerStats].sort((a, b) => b.goals - a.goals)[0];
  }, [allPlayerStats]);

  const topAssistKing = useMemo(() => {
    return [...allPlayerStats].sort((a, b) => b.assists - a.assists)[0];
  }, [allPlayerStats]);

  const topPointsLeader = useMemo(() => {
    return [...allPlayerStats].sort((a, b) => b.points - a.points)[0];
  }, [allPlayerStats]);

  const topCarded = useMemo(() => {
    return [...allPlayerStats].sort((a, b) => b.yellowCards + b.redCards * 3 - (a.yellowCards + a.redCards * 3))[0];
  }, [allPlayerStats]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div id="player-stats-view" className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0B2545] via-[#103867] to-[#165094] rounded-2xl p-5 text-white shadow-md border border-[#165094]/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                Offisiell NFF Spillerstatistikk
              </span>
              <span className="text-xs text-blue-200 font-bold">
                Alle 16 Bønes-lag
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Spillerstatistikk for Bønes IL
            </h2>
            <p className="text-xs text-blue-200/80 max-w-2xl leading-relaxed">
              Komplett oversikt over kamper, mål, målgivende (assists), kort og målpoeng for alle {allPlayerStats.length} spillere i klubben. Trykk på en spiller for detaljert sesonghistorikk og formgraf.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-center">
              <span className="text-xs text-blue-200 block">Totalt mål</span>
              <span className="text-lg font-black text-amber-300 font-mono">
                {allPlayerStats.reduce((acc, p) => acc + p.goals, 0)}
              </span>
            </div>
            <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-center">
              <span className="text-xs text-blue-200 block">Målgivende</span>
              <span className="text-lg font-black text-emerald-300 font-mono">
                {allPlayerStats.reduce((acc, p) => acc + p.assists, 0)}
              </span>
            </div>
            <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-center">
              <span className="text-xs text-blue-200 block">Gule kort</span>
              <span className="text-lg font-black text-amber-200 font-mono">
                {allPlayerStats.reduce((acc, p) => acc + p.yellowCards, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Featured Leader Cards: Toppscorer, Assists-konge, Målpoeng-leder, Fair Play */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Toppscorer */}
        {topGoalscorer && (
          <div
            onClick={() => onSelectPlayer(topGoalscorer.name, topGoalscorer.teamId)}
            className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs hover:shadow-md hover:border-amber-400 transition-all cursor-pointer relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>🥇 TOPPSCORER</span>
              </span>
              <Flame className="w-5 h-5 text-amber-500" />
            </div>
            <div className="mt-3">
              <h4 className="text-base font-black text-slate-900 group-hover:text-[#165094] transition-colors truncate">
                {topGoalscorer.name}
              </h4>
              <p className="text-xs text-slate-500 truncate">{topGoalscorer.teamName}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-baseline justify-between">
              <span className="text-xs text-slate-500">Mål / Kamper</span>
              <div className="flex items-baseline space-x-1">
                <span className="text-xl font-black font-mono text-amber-600">
                  {topGoalscorer.goals} mål
                </span>
                <span className="text-xs text-slate-400">({topGoalscorer.matches} k)</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Assists-konge */}
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
              <p className="text-xs text-slate-500 truncate">{topAssistKing.teamName}</p>
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
              <p className="text-xs text-slate-500 truncate">{topPointsLeader.teamName}</p>
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
              placeholder="Søk blant alle 315 Bønes-spillere (navn, lag eller posisjon)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#165094]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
              >
                Nullstill
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold shrink-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedCategory === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Alle kategorier
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

          {/* Team Dropdown */}
          <select
            value={selectedTeamId}
            onChange={(e) => onSelectTeam(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:ring-2 focus:ring-[#165094]"
          >
            <option value="all">Alle 16 Bønes-lag</option>
            {data.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Position Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-1 scrollbar-none text-xs font-semibold">
          <span className="text-slate-400 text-[11px] mr-1 uppercase tracking-wider font-bold">
            Posisjon:
          </span>
          {(['all', 'Keeper', 'Forsvar', 'Midtbane', 'Angrep'] as (string)[]).map((pos) => (
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
          <span className="ml-auto text-xs text-slate-400">
            Viser {sortedPlayers.length} spillere
          </span>
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
                  className="py-3 px-3 text-center cursor-pointer hover:text-slate-900 transition-colors"
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
                    <span>🎯 Målgivende</span>
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
                    <span>⭐ Poeng (M+A)</span>
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
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sortedPlayers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Ingen spillere matcher søket eller filterkombinasjonen.
                  </td>
                </tr>
              ) : (
                sortedPlayers.map((p, idx) => (
                  <tr
                    key={p.id}
                    onClick={() => onSelectPlayer(p.name, p.teamId)}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                  >
                    {/* Player & Team */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 group-hover:bg-[#165094] group-hover:text-white transition-colors">
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
                          </div>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {p.teamName}
                          </span>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
