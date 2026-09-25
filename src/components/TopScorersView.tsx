import React, { useState, useMemo } from 'react';
import { TopScorer, TeamInfo, Match } from '../types.js';
import { calculateTopScorersFromSeasonLog } from '../utils/playerStatsCalculator.js';
import { Flame, Award, Crosshair, Target, ChevronDown, User, TrendingUp, Sparkles, RefreshCw, CheckCircle2, Calendar } from 'lucide-react';

interface TopScorersViewProps {
  topScorers: TopScorer[];
  teams: TeamInfo[];
  selectedTeamId: string;
  onSelectPlayer?: (playerName: string, teamId?: string) => void;
  onSyncRealData?: () => void;
  isSyncing?: boolean;
  matches?: Match[];
}

export const TopScorersView: React.FC<TopScorersViewProps> = ({
  topScorers,
  teams,
  selectedTeamId,
  onSelectPlayer,
  onSyncRealData,
  isSyncing,
  matches,
}) => {
  const [localTeamFilter, setLocalTeamFilter] = useState<string>(selectedTeamId);
  const [seasonFilter, setSeasonFilter] = useState<'all' | 'Vår' | 'Høst'>('all');

  // Sync if selectedTeamId changes from parent
  const activeTeamFilter = selectedTeamId !== 'all' ? selectedTeamId : localTeamFilter;

  // Derive scorers directly from season log matches if available
  const effectiveScorers = useMemo(() => {
    if (matches && matches.length > 0) {
      return calculateTopScorersFromSeasonLog({ matches, topScorers, teams: [], tables: {}, stats: {} } as any, seasonFilter, activeTeamFilter);
    }
    return topScorers
      .filter((s) => activeTeamFilter === 'all' || s.teamId === activeTeamFilter)
      .sort((a, b) => b.goals - a.goals);
  }, [matches, topScorers, seasonFilter, activeTeamFilter]);

  const filteredScorers = effectiveScorers;

  return (
    <div id="topscorers-view-container" className="space-y-4">
      
      {/* Real NFF sync & info banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-blue-50 to-amber-50 border border-emerald-200/80 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700 shadow-2xs">
        <div className="flex items-start sm:items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <strong className="text-slate-900 font-extrabold text-sm">100% Ekte Bønes-spillere</strong>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px]">
                {topScorers.length} målscorere
              </span>
            </div>
            <p className="text-slate-600 text-[11px] mt-0.5">
              Utledet direkte fra NFF fotball.no kamphendelser for alle 16 Bønes-lag. Klikk på en spiller for å se kampstatistikk og formkurve.
            </p>
          </div>
        </div>
      </div>

      {/* Top 3 Featured Podiums (if viewing all or enough scorers) */}
      {filteredScorers.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {filteredScorers.slice(0, 3).map((scorer, idx) => {
            const isLeader = idx === 0;
            return (
              <div
                key={`podium-${scorer.id || scorer.name}-${idx}`}
                id={`scorer-podium-${scorer.id || idx}`}
                onClick={() => onSelectPlayer?.(scorer.name, scorer.teamId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectPlayer?.(scorer.name, scorer.teamId);
                  }
                }}
                className={`p-4 rounded-xl border relative overflow-hidden flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md ${
                  isLeader
                    ? 'bg-gradient-to-br from-amber-500/10 via-amber-100/30 to-white border-amber-300 ring-2 ring-amber-400/40 shadow-sm'
                    : 'bg-white border-slate-200 shadow-xs hover:border-blue-300'
                }`}
                title={`Klikk for å se sesonghistorikk og formkurve for ${scorer.name}`}
              >
                {/* Badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                      idx === 0
                        ? 'bg-amber-400 text-slate-900 shadow-xs'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-800'
                        : 'bg-amber-700/20 text-amber-900'
                    }`}
                  >
                    <span>#{idx + 1}</span>
                    {idx === 0 && <Award className="w-3 h-3 text-slate-900 ml-0.5" />}
                  </span>

                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {scorer.teamName}
                  </span>
                </div>

                <div className="my-3">
                  <div className="flex items-center space-x-1.5 group">
                    <h4 className="font-extrabold text-slate-900 text-base leading-tight group-hover:text-[#165094] group-hover:underline">
                      {scorer.name}
                    </h4>
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600 opacity-70 group-hover:opacity-100" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                    <Target className="w-3 h-3 text-red-500" />
                    <span>{scorer.matches} kamper</span>
                    <span>•</span>
                    <span>{(scorer.goalsPerMatch ?? (scorer.matches ? scorer.goals / scorer.matches : 0)).toFixed(2)} mål/kamp</span>
                  </p>
                </div>

                {/* Big Goal Display */}
                <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-blue-800 font-semibold group-hover:underline flex items-center space-x-1">
                    <span>Se spillerhistorikk & form</span>
                    <span>→</span>
                  </span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl sm:text-3xl font-mono font-black text-red-700">
                      {scorer.goals}
                    </span>
                    <span className="text-xs font-bold text-slate-600">mål</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Main Leaderboard Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-red-400" />
              <h3 className="font-extrabold text-base tracking-tight">
                Toppscorerliste for Bønes IL
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Registrerte mål i offisielle NFF-kamper for alle 16 avdelinger (Høstsesongen 2026)
            </p>
          </div>

          {/* Quick filters: Season & Team */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Season Filter Buttons */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => setSeasonFilter('all')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  seasonFilter === 'all'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Sesong: Alle
              </button>
              <button
                type="button"
                onClick={() => setSeasonFilter('Vår')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  seasonFilter === 'Vår'
                    ? 'bg-emerald-400 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                🌸 Vår
              </button>
              <button
                type="button"
                onClick={() => setSeasonFilter('Høst')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  seasonFilter === 'Høst'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                🍂 Høst
              </button>
            </div>

            {selectedTeamId === 'all' && (
              <div className="flex items-center space-x-1.5 text-xs">
                <select
                  id="select-scorer-team-filter"
                  value={localTeamFilter}
                  onChange={(e) => setLocalTeamFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">Alle 16 lag</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.shortName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th scope="col" className="py-3 px-4 text-center w-12">#</th>
                <th scope="col" className="py-3 px-4">Spiller (klikk for profil)</th>
                <th scope="col" className="py-3 px-3">Lag / Avdeling</th>
                <th scope="col" className="py-3 px-3 text-center">Kamper</th>
                <th scope="col" className="py-3 px-3 text-center hidden sm:table-cell">Straffer</th>
                <th scope="col" className="py-3 px-3 text-center hidden md:table-cell">Snitt/kamp</th>
                <th scope="col" className="py-3 px-4 text-center font-extrabold text-slate-900">Mål</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredScorers.map((scorer, index) => {
                const isLeader = index === 0;

                return (
                  <tr
                    key={`scorer-row-${scorer.id || scorer.name}-${index}`}
                    className={`hover:bg-blue-50/40 transition-colors ${
                      isLeader ? 'bg-amber-50/40 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold font-mono ${
                          index === 0
                            ? 'bg-amber-400 text-slate-900'
                            : index === 1
                            ? 'bg-slate-300 text-slate-800'
                            : index === 2
                            ? 'bg-amber-700/20 text-amber-900'
                            : 'text-slate-500'
                        }`}
                      >
                        {index + 1}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => onSelectPlayer?.(scorer.name, scorer.teamId)}
                        className="flex items-center space-x-2 text-left group hover:opacity-90 transition-opacity focus:outline-hidden"
                        title={`Vis spillerprofil og formkurve for ${scorer.name}`}
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center text-[10px] font-bold font-mono shrink-0 group-hover:bg-[#165094] group-hover:text-white transition-colors">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-900 text-sm group-hover:text-[#165094] group-hover:underline">
                          {scorer.name}
                        </span>
                        {isLeader && (
                          <span className="text-[10px] bg-amber-200 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded font-extrabold">
                            Gullstøvel
                          </span>
                        )}
                        <TrendingUp className="w-3 h-3 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-block bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded text-xs font-semibold">
                        {scorer.teamName}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      {scorer.matches}
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-slate-500 hidden sm:table-cell">
                      {scorer.penalties > 0 ? scorer.penalties : '-'}
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-slate-600 hidden md:table-cell">
                      {(scorer.goalsPerMatch ?? (scorer.matches ? scorer.goals / scorer.matches : 0)).toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-3 py-1 rounded-lg bg-red-600 text-white font-mono font-extrabold text-sm shadow-xs">
                        {scorer.goals}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};

