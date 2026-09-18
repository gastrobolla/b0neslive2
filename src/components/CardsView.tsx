import React, { useState, useMemo } from 'react';
import { CardStatistic, TeamInfo, Match } from '../types.js';
import { calculateCardsFromSeasonLog } from '../utils/playerStatsCalculator.js';
import { AlertTriangle, ShieldAlert, CheckCircle, Scale, AlertOctagon, User, TrendingUp, Sparkles, RefreshCw, CheckCircle2, Calendar } from 'lucide-react';

interface CardsViewProps {
  cards: CardStatistic[];
  teams: TeamInfo[];
  selectedTeamId: string;
  onSelectPlayer?: (playerName: string, teamId?: string) => void;
  onSyncRealData?: () => void;
  isSyncing?: boolean;
  matches?: Match[];
}

export const CardsView: React.FC<CardsViewProps> = ({
  cards,
  teams,
  selectedTeamId,
  onSelectPlayer,
  onSyncRealData,
  isSyncing,
  matches,
}) => {
  const [localTeamFilter, setLocalTeamFilter] = useState<string>(selectedTeamId);
  const [seasonFilter, setSeasonFilter] = useState<'all' | 'Vår' | 'Høst'>('all');

  const activeTeamFilter = selectedTeamId !== 'all' ? selectedTeamId : localTeamFilter;

  // Derive cards directly from season log matches if available
  const effectiveCards = useMemo(() => {
    if (matches && matches.length > 0) {
      return calculateCardsFromSeasonLog({ matches, cards, teams: [], tables: {}, stats: {} } as any, seasonFilter, activeTeamFilter);
    }
    return cards
      .filter((c) => activeTeamFilter === 'all' || c.teamId === activeTeamFilter)
      .sort((a, b) => b.points - a.points || b.yellowCards - a.yellowCards);
  }, [matches, cards, seasonFilter, activeTeamFilter]);

  const filteredCards = effectiveCards;

  const suspendedCount = filteredCards.filter(c => c.status === 'Karantene').length;
  const warningCount = filteredCards.filter(c => c.status.includes('Advarsel')).length;
  const totalYellows = filteredCards.reduce((acc, c) => acc + c.yellowCards, 0);
  const totalReds = filteredCards.reduce((acc, c) => acc + c.redCards, 0);

  return (
    <div id="cards-view-container" className="space-y-4">
      
      {/* Real NFF sync & info banner */}
      <div className="bg-gradient-to-r from-amber-50 via-slate-50 to-blue-50 border border-amber-200/80 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700 shadow-2xs">
        <div className="flex items-start sm:items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <strong className="text-slate-900 font-extrabold text-sm">Offisielt NFF Disiplinærregister</strong>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono font-bold text-[10px]">
                {cards.length} spillere med kort
              </span>
            </div>
            <p className="text-slate-600 text-[11px] mt-0.5">
              Karantener og advarsler beregnet fra faktiske gule og røde kort i NFF fotball.no kamphendelser.
            </p>
          </div>
        </div>

        {onSyncRealData && (
          <button
            id="sync-real-cards-btn"
            onClick={onSyncRealData}
            disabled={isSyncing}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#165094] hover:bg-[#0F3A6D] text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 shrink-0 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synkroniserer NFF...' : 'Oppdater fra NFF'}</span>
          </button>
        )}
      </div>

      {/* Fair Play & Suspension Warning Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Gule kort totalt</p>
            <p className="text-2xl font-mono font-black text-amber-500 mt-1">{totalYellows}</p>
          </div>
          <div className="w-10 h-14 bg-amber-400 rounded border border-amber-500 shadow-xs flex items-center justify-center font-bold text-white text-xs">
            🟨
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Røde kort totalt</p>
            <p className="text-2xl font-mono font-black text-red-600 mt-1">{totalReds}</p>
          </div>
          <div className="w-10 h-14 bg-red-600 rounded border border-red-700 shadow-xs flex items-center justify-center font-bold text-white text-xs">
            🟥
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/50 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-900">Fare for karantene</p>
            <p className="text-xs text-amber-700 mt-0.5">1 gult kort unna</p>
            <p className="text-2xl font-mono font-black text-amber-800 mt-1">{warningCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/50 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-red-900">Aktive karantener</p>
            <p className="text-xs text-red-700 mt-0.5">Soner neste kamp</p>
            <p className="text-2xl font-mono font-black text-red-700 mt-1">{suspendedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Disciplinary Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-amber-400" />
              <h3 className="font-extrabold text-base tracking-tight">
                Disiplinærregister & Kortstatistikk (Bønes IL)
              </h3>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Offisiell registrering av advarsler, utvisninger og soningsstatus iht. NFF-reglement for alle 16 avdelinger (Høstsesongen 2026)
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
                  id="select-card-team-filter"
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
                <th scope="col" className="py-3 px-3">Lag</th>
                <th scope="col" className="py-3 px-3 text-center">Kamper</th>
                <th scope="col" className="py-3 px-3 text-center">🟨 Gule</th>
                <th scope="col" className="py-3 px-3 text-center">🟥 Røde</th>
                <th scope="col" className="py-3 px-3 text-center font-extrabold">Kortpoeng</th>
                <th scope="col" className="py-3 px-4 text-center">Soningsstatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredCards.map((card, idx) => {
                const isSuspended = card.status === 'Karantene';
                const isWarning = card.status.includes('Advarsel');

                return (
                  <tr
                    key={`card-row-${card.id || card.name}-${idx}`}
                    className={`hover:bg-blue-50/40 transition-colors ${
                      isSuspended ? 'bg-red-50/50' : isWarning ? 'bg-amber-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center font-mono text-slate-500">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => onSelectPlayer?.(card.name, card.teamId)}
                        className="flex items-center space-x-2 text-left group hover:opacity-90 transition-opacity focus:outline-hidden"
                        title={`Vis spillerprofil og formkurve for ${card.name}`}
                      >
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-[10px] font-bold font-mono shrink-0 group-hover:bg-[#165094] group-hover:text-white transition-colors">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-900 text-sm group-hover:text-[#165094] group-hover:underline">
                          {card.name}
                        </span>
                        <TrendingUp className="w-3 h-3 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                        {card.teamName}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center font-mono">
                      {card.matches}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-amber-600">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
                        {card.yellowCards}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-red-600">
                      {card.redCards > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">
                          {card.redCards}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-extrabold text-slate-900">
                      {card.points}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          isSuspended
                            ? 'bg-red-600 text-white'
                            : isWarning
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isSuspended ? (
                          <>
                            <AlertOctagon className="w-3 h-3 mr-1" />
                            <span>Karantene</span>
                          </>
                        ) : isWarning ? (
                          <>
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            <span>1 fra soning</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            <span>Spilleklar</span>
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* NFF Rule note */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
          <p>
            ℹ️ <span className="font-semibold">NFF Hordaland reglement:</span> 4 gule kort i seriespill gir automatisk 1 kamps karantene i seniorfotball. Direkte rødt kort gir minst 1 kamps karantene, avventer disiplinærutvalgets rapport.
          </p>
        </div>

      </div>

    </div>
  );
};
