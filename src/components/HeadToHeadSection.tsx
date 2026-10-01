import React, { useMemo, useState } from 'react';
import { Match } from '../types.js';
import { Trophy, Calendar, MapPin, TrendingUp, Shield, Activity, ChevronRight, CheckCircle2 } from 'lucide-react';

interface HeadToHeadSectionProps {
  opponentName: string;
  bonesTeamName?: string;
  allMatches?: Match[];
  onSelectMatch?: (match: Match) => void;
  compact?: boolean;
}

export interface H2HMatchRecord {
  id: string;
  date: string;
  season: string; // '2026 Høst', '2026 Vår', '2025', '2024'
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  bonesIsHome: boolean;
  bonesScore: number;
  oppScore: number;
  result: 'W' | 'D' | 'L'; // from Bønes perspective
  division?: string;
  venue?: string;
  scorers?: string[];
  fiksId?: number | string;
}

/**
 * Normalizes club / team name to match opponent encounters across cohorts and seasons
 */
export function extractClubStem(name: string): string {
  if (!name) return '';
  return name
    .replace(/\b(1|2|3|4|5|6|7|8|9|G13|G14|G15|G16|G17|G19|J13|J14|J15|J16|J17|J19|Menn|Kvinner|IL|FK|SK|Fotball|A|B)\b/gi, '')
    .trim()
    .toLowerCase();
}

export const HeadToHeadSection: React.FC<HeadToHeadSectionProps> = ({
  opponentName,
  bonesTeamName = 'Bønes',
  allMatches = [],
  onSelectMatch,
  compact = false,
}) => {
  const [selectedSeasonFilter, setSelectedSeasonFilter] = useState<string>('all');

  // Extract clean stem for fuzzy club matchup
  const oppClean = opponentName.trim();
  const oppStem = extractClubStem(opponentName);

  // Compute all head-to-head matches between Bønes and this opponent over the last 3 seasons (2024 - 2026)
  const h2hHistory = useMemo(() => {
    const list: H2HMatchRecord[] = [];
    const seenIds = new Set<string>();

    for (const m of allMatches) {
      if (!m.homeTeam || !m.awayTeam) continue;
      const hNorm = m.homeTeam.trim().toLowerCase();
      const aNorm = m.awayTeam.trim().toLowerCase();

      const homeIsBones = hNorm.includes('bønes');
      const awayIsBones = aNorm.includes('bønes');

      // Must be a match where Bønes played
      if (!homeIsBones && !awayIsBones) continue;

      const oppInMatch = homeIsBones ? m.awayTeam : m.homeTeam;
      const oppInMatchNorm = oppInMatch.trim().toLowerCase();

      // Check if match is against this opponent
      const isDirectMatch =
        oppInMatchNorm.includes(oppClean.toLowerCase()) ||
        oppClean.toLowerCase().includes(oppInMatchNorm) ||
        (oppStem.length >= 3 && oppInMatchNorm.includes(oppStem));

      if (!isDirectMatch) continue;

      // Extract year from date
      const year = m.date ? m.date.slice(0, 4) : '2026';
      // Only keep matches from the last 3 seasons: 2024, 2025, 2026
      if (year !== '2026' && year !== '2025' && year !== '2024') continue;

      const matchId = m.id || `${m.homeTeam}-${m.awayTeam}-${m.date}`;
      if (seenIds.has(matchId)) continue;
      seenIds.add(matchId);

      const bonesScore = homeIsBones ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
      const oppScore = homeIsBones ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
      const result: 'W' | 'D' | 'L' =
        bonesScore > oppScore ? 'W' : bonesScore === oppScore ? 'D' : 'L';

      // Determine season label (e.g. 2026 Høst, 2026 Vår, 2025, 2024)
      let seasonLabel = year;
      if (year === '2026') {
        const isSpring = m.date && m.date < '2026-07-01';
        seasonLabel = isSpring ? '2026 Vår' : '2026 Høst';
      }

      // Extract Bønes scorers if events present
      const bonesScorers = (m.events || [])
        .filter((e) => e.type === 'goal' && (homeIsBones ? e.team?.toLowerCase().includes('bønes') : !e.team?.toLowerCase().includes('bønes')))
        .map((e) => `${e.player || 'Mål'} (${e.minute ? `${e.minute}'` : ''})`);

      list.push({
        id: matchId,
        date: m.date || '2026',
        season: seasonLabel,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.homeScore ?? 0,
        awayScore: m.awayScore ?? 0,
        bonesIsHome: homeIsBones,
        bonesScore,
        oppScore,
        result,
        division: m.division,
        venue: m.venue || m.pitch,
        scorers: bonesScorers,
        fiksId: m.fiksId,
      });
    }

    // Sort latest match first
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [allMatches, oppClean, oppStem]);

  // Aggregate stats across the 3 seasons
  const stats = useMemo(() => {
    const total = h2hHistory.length;
    const wins = h2hHistory.filter((m) => m.result === 'W').length;
    const draws = h2hHistory.filter((m) => m.result === 'D').length;
    const losses = h2hHistory.filter((m) => m.result === 'L').length;
    const bonesGoals = h2hHistory.reduce((acc, m) => acc + m.bonesScore, 0);
    const oppGoals = h2hHistory.reduce((acc, m) => acc + m.oppScore, 0);
    const goalDiff = bonesGoals - oppGoals;
    const points = wins * 3 + draws * 1;
    const ppg = total > 0 ? (points / total).toFixed(2) : '0.00';
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    return { total, wins, draws, losses, bonesGoals, oppGoals, goalDiff, ppg, winRate };
  }, [h2hHistory]);

  // Distinct seasons available
  const availableSeasons = useMemo(() => {
    return ['all', ...Array.from(new Set(h2hHistory.map((m) => m.season)))];
  }, [h2hHistory]);

  const filteredMatches = useMemo(() => {
    if (selectedSeasonFilter === 'all') return h2hHistory;
    return h2hHistory.filter((m) => m.season === selectedSeasonFilter);
  }, [h2hHistory, selectedSeasonFilter]);

  return (
    <div id="head-to-head-section" className="space-y-3.5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#165094] shrink-0" />
          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-[#165094]" />
            <span>Innbyrdes oppgjør: Bønes mot {opponentName}</span>
          </h4>
        </div>
        <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#165094] border border-blue-200">
          Siste 3 sesonger (2024–2026)
        </span>
      </div>

      {h2hHistory.length === 0 ? (
        <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
          <Shield className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">Ingen tidligere oppgjør registrert</p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            Det er ikke registrert innbyrdes kamper mellom Bønes og {opponentName} i NFF-protokollene for de siste 3 sesongene.
          </p>
        </div>
      ) : (
        <>
          {/* Key Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* 1. Kamper & Utfall */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Oppgjør (3 sesonger)
              </span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-xl font-black font-mono text-slate-900">{stats.total}</span>
                <span className="text-xs text-slate-500 font-medium">kamper</span>
              </div>
              <div className="flex items-center gap-1 mt-1.5 text-[11px] font-mono font-bold">
                <span className="text-emerald-700">{stats.wins}S</span>
                <span className="text-slate-400">•</span>
                <span className="text-amber-700">{stats.draws}U</span>
                <span className="text-slate-400">•</span>
                <span className="text-rose-700">{stats.losses}T</span>
              </div>
            </div>

            {/* 2. Seiersprosent & Poengsnitt */}
            <div className="p-3 bg-white rounded-xl border border-emerald-200/80 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Bønes Seiersprosent
              </span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-xl font-black font-mono text-emerald-700">
                  {stats.winRate}%
                </span>
                <span className="text-[11px] font-semibold text-emerald-800">seier</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Snitt: <strong className="font-mono text-slate-800">{stats.ppg}</strong> poeng/kamp
              </div>
            </div>

            {/* 3. Mål & Målforskjell */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Målscore (Bønes - Motst.)
              </span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-xl font-black font-mono text-slate-900">
                  {stats.bonesGoals} - {stats.oppGoals}
                </span>
              </div>
              <div className="text-[11px] font-mono font-bold mt-1">
                <span
                  className={
                    stats.goalDiff > 0
                      ? 'text-emerald-700'
                      : stats.goalDiff < 0
                      ? 'text-rose-700'
                      : 'text-slate-600'
                  }
                >
                  {stats.goalDiff > 0 ? `+${stats.goalDiff}` : stats.goalDiff} målforskjell
                </span>
              </div>
            </div>

            {/* 4. Formrekke */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Siste innbyrdes form
              </span>
              <div className="flex items-center gap-1 mt-2">
                {h2hHistory.slice(0, 5).map((m, idx) => (
                  <span
                    key={idx}
                    className={`w-6 h-6 rounded-md text-[10px] font-black flex items-center justify-center font-mono ${
                      m.result === 'W'
                        ? 'bg-emerald-600 text-white'
                        : m.result === 'D'
                        ? 'bg-amber-400 text-amber-950'
                        : 'bg-rose-600 text-white'
                    }`}
                    title={`${m.date}: ${m.homeTeam} ${m.homeScore}-${m.awayScore} ${m.awayTeam} (${m.result === 'W' ? 'Bønes-seier' : m.result === 'D' ? 'Uavgjort' : 'Tap'})`}
                  >
                    {m.result === 'W' ? 'S' : m.result === 'D' ? 'U' : 'T'}
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-slate-400 mt-1">Siste til venstre ➜</span>
            </div>
          </div>

          {/* Season Filter Switcher */}
          {availableSeasons.length > 2 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Sesong:</span>
              {availableSeasons.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSeasonFilter(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedSeasonFilter === s
                      ? 'bg-[#165094] text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {s === 'all' ? `Alle (${h2hHistory.length})` : s}
                </button>
              ))}
            </div>
          )}

          {/* Detailed Matches Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-2.5 px-3">Sesong & Dato</th>
                    <th className="py-2.5 px-3">Oppgjør</th>
                    <th className="py-2.5 px-3 text-center">Bane</th>
                    <th className="py-2.5 px-3 text-center">Resultat</th>
                    <th className="py-2.5 px-3 text-right">Utfall</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredMatches.map((m) => {
                    const isBonesWinner = m.result === 'W';
                    const isDraw = m.result === 'D';

                    return (
                      <tr
                        key={m.id}
                        onClick={() => {
                          const origMatch = allMatches.find((om) => om.id === m.id);
                          if (origMatch && onSelectMatch) onSelectMatch(origMatch);
                        }}
                        className={`hover:bg-slate-50 transition-colors ${
                          onSelectMatch ? 'cursor-pointer' : ''
                        }`}
                      >
                        {/* Season & Date */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-mono text-[11px] text-slate-900 font-bold">
                              {m.date}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">
                              {m.season}
                            </span>
                          </div>
                        </td>

                        {/* Matchup */}
                        <td className="py-2.5 px-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5 font-bold text-slate-900">
                              <span
                                className={
                                  m.bonesIsHome
                                    ? 'text-[#165094] font-black'
                                    : 'text-slate-800'
                                }
                              >
                                {m.homeTeam}
                              </span>
                              <span className="text-slate-400 font-normal">vs</span>
                              <span
                                className={
                                  !m.bonesIsHome
                                    ? 'text-[#165094] font-black'
                                    : 'text-slate-800'
                                }
                              >
                                {m.awayTeam}
                              </span>
                            </div>
                            {m.division && (
                              <span className="text-[10px] text-slate-400 block truncate">
                                {m.division}
                              </span>
                            )}
                            {m.scorers && m.scorers.length > 0 && (
                              <span className="text-[10px] text-emerald-800 block truncate">
                                ⚽ {m.scorers.slice(0, 3).join(', ')}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Venue / Location */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap text-slate-500">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-mono">
                            {m.bonesIsHome ? 'Hjemme' : 'Borte'}
                          </span>
                        </td>

                        {/* Score */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono font-black text-sm">
                          <span
                            className={`px-2 py-0.5 rounded ${
                              isBonesWinner
                                ? 'bg-emerald-100 text-emerald-950 font-black'
                                : isDraw
                                ? 'bg-amber-100 text-amber-950'
                                : 'bg-rose-100 text-rose-950'
                            }`}
                          >
                            {m.homeScore} - {m.awayScore}
                          </span>
                        </td>

                        {/* Outcome Badge */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              isBonesWinner
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : isDraw
                                ? 'bg-amber-400 text-amber-950 font-black'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            {isBonesWinner ? 'Seier' : isDraw ? 'Uavgjort' : 'Tap'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
