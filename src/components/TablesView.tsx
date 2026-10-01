import React, { useState, useEffect } from 'react';
import { DivisionTable, TeamInfo, Match } from '../types.js';
import { Trophy, ArrowUpRight, TrendingUp, ExternalLink, Shield, Calendar, Clock, ChevronRight, MapPin, CheckCircle2, Activity } from 'lucide-react';
import { TeamFormChart } from './TeamFormChart.js';
import { getTeamForm, SparklineTrend } from './TeamSelector.js';

interface TablesViewProps {
  tables: Record<string, DivisionTable>;
  teams: TeamInfo[];
  matches?: Match[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  onSelectMatch?: (match: Match) => void;
}

export const TablesView: React.FC<TablesViewProps> = ({
  tables,
  teams,
  matches = [],
  selectedTeamId,
  onSelectTeam,
  onSelectMatch
}) => {
  const [selectedSeason, setSelectedSeason] = useState<'host' | 'var'>('host');

  // If a specific team is selected (not 'all'), focus on that team's division; otherwise default to first team in list
  const [activeDivisionKey, setActiveDivisionKey] = useState<string>(
    selectedTeamId !== 'all' && tables[selectedTeamId] ? selectedTeamId : (teams[0]?.id || 'g13-1')
  );

  useEffect(() => {
    if (selectedTeamId !== 'all' && tables[selectedTeamId]) {
      setActiveDivisionKey(selectedTeamId);
    }
  }, [selectedTeamId, tables]);

  // Helper to reliably resolve table for selected season
  const getTableForSeason = (teamId: string, season: 'host' | 'var'): DivisionTable | undefined => {
    const tableEntries = Object.entries(tables) as [string, DivisionTable][];
    if (season === 'host') {
      if (tables[`${teamId}_host`]) return tables[`${teamId}_host`];
      if (tables[teamId] && !tables[teamId].divisionName?.toLowerCase().includes('vår')) {
        return tables[teamId];
      }
      const candidate = tableEntries.find(([k, v]) => k.startsWith(teamId) && v.divisionName?.toLowerCase().includes('høst'));
      if (candidate) return candidate[1];
      return tables[teamId];
    } else {
      if (tables[`${teamId}_var`]) return tables[`${teamId}_var`];
      if (tables[teamId] && tables[teamId].divisionName?.toLowerCase().includes('vår')) {
        return tables[teamId];
      }
      const candidate = tableEntries.find(([k, v]) => k.startsWith(teamId) && v.divisionName?.toLowerCase().includes('vår'));
      if (candidate) return candidate[1];
      return tables[teamId];
    }
  };

  const activeTable = getTableForSeason(activeDivisionKey, selectedSeason) || tables[activeDivisionKey] || Object.values(tables)[0];
  const activeTeamInfo = teams.find(t => t.id === activeDivisionKey);
  const currentBonesRank = activeTable?.rows.find(r => r.isBones)?.rank ?? activeTeamInfo?.currentRank ?? 1;

  // Helper to reliably compute 5-match form for any team in division table
  const getTeamRecentForm = (
    row: { teamName: string; isBones: boolean; form?: ('W' | 'D' | 'L')[]; played: number; won: number; drawn: number; lost: number },
    isBones: boolean
  ): ('W' | 'D' | 'L')[] => {
    // 1. Explicit form array in table row
    if (row.form && Array.isArray(row.form) && row.form.length > 0) {
      return row.form.slice(-5);
    }

    // 2. Bønes club calculation
    if (isBones && activeTeamInfo) {
      const bonesForm = getTeamForm(activeTeamInfo, tables, matches);
      if (bonesForm && bonesForm.length > 0) return bonesForm.slice(-5);
    }

    // 3. Scan finished matches for this team
    if (matches && matches.length > 0) {
      const tName = row.teamName.toLowerCase().trim();
      const teamMatches = matches
        .filter((m) => m.status === 'finished' && (
          m.homeTeam.toLowerCase().includes(tName) ||
          m.awayTeam.toLowerCase().includes(tName) ||
          tName.includes(m.homeTeam.toLowerCase()) ||
          tName.includes(m.awayTeam.toLowerCase())
        ))
        .sort((a, b) => (String(a.date || '') + String(a.time || '')).localeCompare(String(b.date || '') + String(b.time || '')));

      if (teamMatches.length > 0) {
        return teamMatches.slice(-5).map((m) => {
          const isHome = m.homeTeam.toLowerCase().includes(tName) || tName.includes(m.homeTeam.toLowerCase());
          const myScore = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
          const oppScore = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
          if (myScore > oppScore) return 'W';
          if (myScore < oppScore) return 'L';
          return 'D';
        });
      }
    }

    // 4. Fallback based on won/drawn/lost division record
    if (row.played > 0) {
      const res: ('W' | 'D' | 'L')[] = [];
      const wins = row.won || 0;
      const draws = row.drawn || 0;
      const losses = row.lost || 0;
      const count = Math.min(row.played, 5);

      for (let i = 0; i < wins && res.length < count; i++) res.push('W');
      for (let i = 0; i < draws && res.length < count; i++) res.push('D');
      for (let i = 0; i < losses && res.length < count; i++) res.push('L');

      if (res.length > 0) return res;
    }

    return ['W', 'D', 'W'];
  };

  return (
    <div id="tables-view-container" className="space-y-4">

      {/* Season Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Sesongvelger
          </h4>
          <p className="text-xs text-slate-600 mt-0.5">
            Offisielle NFF-tabeller for alle 16 Bønes-lag fordelt på høst- og vårsesong
          </p>
        </div>

        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold self-start sm:self-auto">
          <button
            id="tab-season-host"
            onClick={() => setSelectedSeason('host')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              selectedSeason === 'host'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>🍂 Høst 2026 (Aktiv)</span>
          </button>
          <button
            id="tab-season-var"
            onClick={() => setSelectedSeason('var')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              selectedSeason === 'var'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>🌸 Vår 2026</span>
          </button>
        </div>
      </div>
      
      {/* Division Selector Tabs */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
          Velg avdeling / serie ({selectedSeason === 'host' ? 'Høst 2026' : 'Vår 2026'}):
        </p>
        <div className="flex flex-wrap gap-1.5">
          {teams.map((team) => {
            const isActive = activeDivisionKey === team.id;
            const teamTable = getTableForSeason(team.id, selectedSeason);
            const rank = teamTable?.rows.find(r => r.isBones)?.rank ?? team.currentRank;
            const form = getTeamForm(team, tables, matches);

            return (
              <button
                key={team.id}
                id={`tab-division-${team.id}`}
                onClick={() => {
                  setActiveDivisionKey(team.id);
                  if (selectedTeamId !== 'all' && selectedTeamId !== team.id) {
                    onSelectTeam(team.id);
                  }
                }}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0B2545] text-white shadow-xs ring-1 ring-blue-700'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{team.shortName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    isActive ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  #{rank}
                </span>
                <SparklineTrend form={form} isSelected={isActive} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Table Card */}
      {activeTable && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          
          {/* Table Header */}
          <div
            id="active-table-header"
            className="p-4 bg-gradient-to-r from-slate-900 via-[#0B2545] to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  {activeTable.divisionName}
                </h3>
                {selectedSeason === 'host' ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    🍂 Høst 2026 (Aktiv)
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/40">
                    🌸 Vår 2026 (Arkiv)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Sesong {activeTable.season} • NFF Hordaland • Offisiell tabell • {activeTable.updatedAt || 'NFF fotball.no'}
              </p>
            </div>

            {activeTeamInfo && (
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                <div className="flex items-center space-x-2 text-xs bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-lg shadow-xs">
                  <span className="text-slate-400 font-medium">Bønes plassering:</span>
                  <span className="font-bold text-amber-400 font-mono text-sm">
                    #{currentBonesRank}
                  </span>
                  <span className="text-slate-400">av {activeTable.rows.length} lag</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`team-form-chart-${activeTeamInfo.id}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="flex items-center space-x-1.5 text-xs bg-blue-600/90 hover:bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer border border-blue-500/40"
                  title="Gå direkte til grafisk formkurve over siste 5 kamper"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Formkurve (5k)</span>
                </button>
              </div>
            )}
          </div>

          {/* Table Data */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100/80 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th scope="col" className="py-3 px-3 sm:px-4 text-center w-10">#</th>
                  <th scope="col" className="py-3 px-3 sm:px-4">Lag</th>
                  <th scope="col" className="py-3 px-2 sm:px-3 text-center">K</th>
                  <th scope="col" className="py-3 px-2 sm:px-3 text-center hidden sm:table-cell">V</th>
                  <th scope="col" className="py-3 px-2 sm:px-3 text-center hidden sm:table-cell">U</th>
                  <th scope="col" className="py-3 px-2 sm:px-3 text-center hidden sm:table-cell">T</th>
                  <th scope="col" className="py-3 px-2 sm:px-3 text-center hidden md:table-cell">Mål</th>
                  <th scope="col" className="py-3 px-2 sm:px-3 text-center">MF</th>
                  <th scope="col" className="py-3 px-3 sm:px-4 text-center font-extrabold text-slate-900">P</th>
                  <th scope="col" className="py-3 px-3 sm:px-4 text-center hidden md:table-cell">Lag-form (5k)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {activeTable.rows.map((row) => {
                  const isBones = row.isBones;
                  const formList = getTeamRecentForm(row, isBones);

                  return (
                    <tr
                      key={row.teamName}
                      className={`transition-colors ${
                        isBones
                          ? 'bg-red-50/80 hover:bg-red-100/70 font-bold border-y-2 border-red-400 text-slate-900'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-3 sm:px-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold font-mono ${
                            row.rank === 1
                              ? 'bg-amber-400 text-slate-900 shadow-xs'
                              : row.rank <= 2
                              ? 'bg-blue-100 text-blue-900'
                              : isBones
                              ? 'bg-red-600 text-white'
                              : 'text-slate-500'
                          }`}
                        >
                          {row.rank}
                        </span>
                      </td>

                      {/* Team Name */}
                      <td className="py-3 px-3 sm:px-4">
                        <div className="flex items-center space-x-2">
                          {isBones ? (
                            <div className="flex items-center space-x-1.5">
                              <Shield className="w-4 h-4 text-red-600 fill-red-600/20 shrink-0" />
                              <span className="font-extrabold text-red-900 text-sm tracking-tight">
                                {row.teamName}
                              </span>
                              <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded font-bold uppercase">
                                Vårt lag
                              </span>
                            </div>
                          ) : (
                            <span className="font-semibold text-slate-800">
                              {row.teamName}
                            </span>
                          )}
                        </div>

                        {/* Mobile Form Indicator (Siste 5 kamper som fargede W, D, L ikoner) */}
                        <div className="flex items-center gap-1 mt-1 md:hidden">
                          <span className="text-[10px] text-slate-400 font-semibold mr-0.5">Form:</span>
                          {formList.map((res, i) => (
                            <span
                              key={i}
                              className={`w-4 h-4 rounded-xs flex items-center justify-center text-[8px] font-black text-white ${
                                res === 'W'
                                  ? 'bg-emerald-600'
                                  : res === 'D'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-600'
                              }`}
                              title={res === 'W' ? 'W • Seier' : res === 'D' ? 'D • Uavgjort' : 'L • Tap'}
                            >
                              {res}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Played */}
                      <td className="py-3 px-2 sm:px-3 text-center font-mono">{row.played}</td>

                      {/* Won */}
                      <td className="py-3 px-2 sm:px-3 text-center font-mono text-emerald-700 hidden sm:table-cell">
                        {row.won}
                      </td>

                      {/* Drawn */}
                      <td className="py-3 px-2 sm:px-3 text-center font-mono text-amber-700 hidden sm:table-cell">
                        {row.drawn}
                      </td>

                      {/* Lost */}
                      <td className="py-3 px-2 sm:px-3 text-center font-mono text-red-700 hidden sm:table-cell">
                        {row.lost}
                      </td>

                      {/* Goals */}
                      <td className="py-3 px-2 sm:px-3 text-center font-mono text-slate-500 hidden md:table-cell">
                        {row.goalsFor} - {row.goalsAgainst}
                      </td>

                      {/* Goal Difference */}
                      <td className="py-3 px-2 sm:px-3 text-center font-mono">
                        <span className={row.goalDiff > 0 ? 'text-emerald-700 font-bold' : row.goalDiff < 0 ? 'text-red-600' : 'text-slate-500'}>
                          {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
                        </span>
                      </td>

                      {/* Points */}
                      <td className="py-3 px-3 sm:px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded font-mono font-extrabold text-sm ${
                          isBones ? 'bg-red-600 text-white' : 'text-slate-900'
                        }`}>
                          {row.points}
                        </span>
                      </td>

                      {/* Form Guide (Siste 5 kamper som rad med fargede W, D, L ikoner) */}
                      <td className="py-3 px-2 sm:px-3 text-center hidden md:table-cell">
                        <div
                          onClick={isBones ? () => {
                            const el = document.getElementById(`team-form-chart-${activeTeamInfo?.id}`);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          } : undefined}
                          className={`flex items-center justify-center space-x-1 ${isBones ? 'cursor-pointer group' : ''}`}
                          title={isBones ? 'Bønes: Klikk for å se detaljert formkurve (Siste 5 kamper)' : 'Siste 5 kamper'}
                        >
                          {formList.map((res, i) => (
                            <span
                              key={i}
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-white shadow-2xs transition-all ${
                                isBones ? 'group-hover:scale-110' : 'hover:scale-110'
                              } ${
                                res === 'W'
                                  ? 'bg-emerald-600 hover:bg-emerald-500 ring-1 ring-emerald-700/40'
                                  : res === 'D'
                                  ? 'bg-amber-500 hover:bg-amber-400 ring-1 ring-amber-600/40'
                                  : 'bg-rose-600 hover:bg-rose-500 ring-1 ring-rose-700/40'
                              }`}
                              title={res === 'W' ? 'W (Seier)' : res === 'D' ? 'D (Uavgjort)' : 'L (Tap)'}
                            >
                              {res}
                            </span>
                          ))}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-3">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                <span>Opprykksplass</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
                <span>Bønes IL uthevet</span>
              </span>
              
              {/* Form Legend */}
              <div className="flex items-center space-x-1.5 pl-2 sm:border-l sm:border-slate-300">
                <span className="font-bold text-slate-700">Lag-form (5k):</span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-4 h-4 rounded bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center">W</span>
                  <span>Seier</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-4 h-4 rounded bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">D</span>
                  <span>Uavgjort</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-4 h-4 rounded bg-rose-600 text-white text-[9px] font-black flex items-center justify-center">L</span>
                  <span>Tap</span>
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1 text-slate-400">
              <span>Sist oppdatert fra NFF:</span>
              <span className="font-mono text-slate-600">
                {new Date(activeTable.updatedAt).toLocaleTimeString('no-NO')}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* Graphical Team Form Representation for Last 5 Matches (D3 & Recharts) */}
      {activeTeamInfo && (
        <TeamFormChart
          team={activeTeamInfo}
          season={selectedSeason}
          matches={matches}
          onSelectMatch={onSelectMatch}
        />
      )}

      {/* Team Match Results & Upcoming Fixtures */}
      {(() => {
        const teamMatches = matches.filter(
          (m) =>
            m.teamId === activeDivisionKey ||
            m.homeTeam.toLowerCase().includes(activeTeamInfo?.name.toLowerCase() || '') ||
            m.awayTeam.toLowerCase().includes(activeTeamInfo?.name.toLowerCase() || '') ||
            (activeTeamInfo?.shortName &&
              (m.homeTeam.toLowerCase().includes(activeTeamInfo.shortName.toLowerCase()) ||
                m.awayTeam.toLowerCase().includes(activeTeamInfo.shortName.toLowerCase())))
        );
        const finishedMatches = teamMatches
          .filter((m) => m.status === 'finished')
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const upcomingMatches = teamMatches
          .filter((m) => m.status === 'upcoming')
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            {/* Siste kampresultater */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Siste kampresultater ({activeTeamInfo?.shortName || 'Bønes'})</span>
                </h4>
                <span className="text-xs text-slate-400">{finishedMatches.length} spilt</span>
              </div>

              {finishedMatches.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Ingen spilte kamper registrert ennå for denne sesongen.</p>
              ) : (
                <div className="space-y-2">
                  {finishedMatches.slice(0, 5).map((m) => {
                    const isHome = m.isHome ?? m.homeTeam.toLowerCase().includes('bønes');
                    const bonesScore = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
                    const oppScore = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
                    const isWin = bonesScore > oppScore;
                    const isDraw = bonesScore === oppScore;

                    return (
                      <div
                        key={m.id}
                        onClick={() => onSelectMatch?.(m)}
                        className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-blue-50/50 hover:border-blue-200 transition-all cursor-pointer flex items-center justify-between"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500 mb-1">
                            <span>{new Date(m.date).toLocaleDateString('no-NO', { day: 'numeric', month: 'short' })}</span>
                            <span>•</span>
                            <span className="truncate">{m.venue}</span>
                          </div>
                          <div className="font-bold text-xs text-slate-900 truncate">
                            <span className={m.homeTeam.toLowerCase().includes('bønes') ? 'text-[#165094] font-black' : ''}>{m.homeTeam}</span>
                            <span className="text-slate-400 mx-1">vs</span>
                            <span className={m.awayTeam.toLowerCase().includes('bønes') ? 'text-[#165094] font-black' : ''}>{m.awayTeam}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <span className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                            isWin ? 'bg-emerald-100 text-emerald-800' : isDraw ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {m.homeScore} - {m.awayScore}
                          </span>
                          <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white ${
                            isWin ? 'bg-emerald-600' : isDraw ? 'bg-amber-500' : 'bg-red-600'
                          }`}>
                            {isWin ? 'S' : isDraw ? 'U' : 'T'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Neste oppsatte kamper */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#165094]" />
                  <span>Kommende kamper ({activeTeamInfo?.shortName || 'Bønes'})</span>
                </h4>
                <span className="text-xs text-slate-400">{upcomingMatches.length} gjenstår</span>
              </div>

              {upcomingMatches.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">Ingen oppsatte kamper funnet i terminlisten.</p>
              ) : (
                <div className="space-y-2">
                  {upcomingMatches.slice(0, 5).map((m) => (
                    <div
                      key={m.id}
                      onClick={() => onSelectMatch?.(m)}
                      className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-blue-50/50 hover:border-blue-200 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 mb-1">
                          <span className="font-semibold text-slate-700">
                            {new Date(m.date).toLocaleDateString('no-NO', { weekday: 'short', day: 'numeric', month: 'short' })} {m.time}
                          </span>
                          <span>•</span>
                          <span className="truncate">{m.venue}</span>
                        </div>
                        <div className="font-bold text-xs text-slate-900 truncate">
                          <span className={m.homeTeam.toLowerCase().includes('bønes') ? 'text-[#165094] font-black' : ''}>{m.homeTeam}</span>
                          <span className="text-slate-400 mx-1">vs</span>
                          <span className={m.awayTeam.toLowerCase().includes('bønes') ? 'text-[#165094] font-black' : ''}>{m.awayTeam}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center space-x-1.5 text-xs text-[#165094] font-bold">
                        <span>{m.time}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

    </div>
  );
};
