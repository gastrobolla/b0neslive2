import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Match, TeamInfo } from '../types.js';
import {
  resolveMatchStats,
  calculateAggregatedMatchStats,
  ResolvedMatchStats,
} from '../utils/matchStatsCalculator.js';
import {
  PieChart as PieIcon,
  Crosshair,
  Share2,
  Activity,
  Flame,
  CheckCircle2,
  TrendingUp,
  Sliders,
  Calendar,
  Layers,
  ChevronDown,
  Info,
  MapPin,
  ExternalLink,
} from 'lucide-react';

interface MatchStatsAnalyticsViewProps {
  matches: Match[];
  selectedTeamId?: string;
  teams?: TeamInfo[];
  onSelectMatch?: (match: Match) => void;
}

// Custom Tooltip for Recharts
const CustomBarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 min-w-[200px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold">
          <span className="text-blue-300">vs {data.shortOpponent}</span>
          <span className="text-slate-400 font-normal">{data.date}</span>
        </div>

        <div className="flex items-center justify-between font-mono font-semibold pt-0.5">
          <span className="text-slate-300">Sluttresultat:</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[11px] ${
              data.result === 'W'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : data.result === 'D'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'bg-rose-950 text-rose-300 border border-rose-800'
            }`}
          >
            {data.score} ({data.result === 'W' ? 'Seier' : data.result === 'D' ? 'Uavgjort' : 'Tap'})
          </span>
        </div>

        <div className="pt-1.5 space-y-1 text-[11px] border-t border-slate-800">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#165094] inline-block"></span>
              Ballbesittelse:
            </span>
            <span className="font-mono font-bold">
              {data.bonesPossession}% - {data.oppPossession}%
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              Skudd på mål:
            </span>
            <span className="font-mono font-bold">
              {data.bonesShotsOnTarget} - {data.oppShotsOnTarget}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
              Pasningssikkerhet:
            </span>
            <span className="font-mono font-bold">
              {data.bonesPassAccuracy}% - {data.oppPassAccuracy}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const MatchStatsAnalyticsView: React.FC<MatchStatsAnalyticsViewProps> = ({
  matches,
  selectedTeamId = 'all',
  teams = [],
  onSelectMatch,
}) => {
  // Season filter
  const [seasonFilter, setSeasonFilter] = useState<'all' | 'host' | 'var'>('all');
  
  // Metric toggle for charts
  const [activeMetric, setActiveMetric] = useState<
    'all' | 'possession' | 'shotsOnTarget' | 'passAccuracy'
  >('possession');

  // Selected single match for deep-dive
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  // Filter finished matches
  const finishedMatches = useMemo(() => {
    return matches.filter((m) => {
      if (m.status !== 'finished') return false;

      // Team filter
      if (selectedTeamId !== 'all' && m.teamId !== selectedTeamId) {
        return false;
      }

      // Season filter
      if (seasonFilter === 'host') {
        const isAutumn = m.season === 'Høst' || (m.date && m.date >= '2026-07-01');
        if (!isAutumn) return false;
      } else if (seasonFilter === 'var') {
        const isSpring = m.season === 'Vår' || (m.date && m.date < '2026-07-01');
        if (!isSpring) return false;
      }

      return true;
    }).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [matches, selectedTeamId, seasonFilter]);

  // Resolved statistics for all filtered finished matches
  const resolvedList = useMemo<ResolvedMatchStats[]>(() => {
    return finishedMatches.map(resolveMatchStats);
  }, [finishedMatches]);

  // Aggregated summary stats
  const aggregatedStats = useMemo(() => {
    return calculateAggregatedMatchStats(finishedMatches);
  }, [finishedMatches]);

  // Active deep dive match object
  const activeDeepDiveMatch = useMemo<ResolvedMatchStats | null>(() => {
    if (resolvedList.length === 0) return null;
    if (selectedMatchId) {
      const found = resolvedList.find((r) => r.matchId === selectedMatchId);
      if (found) return found;
    }
    // Default to the latest match
    return resolvedList[resolvedList.length - 1];
  }, [resolvedList, selectedMatchId]);

  // Format data for Recharts BarChart
  const barChartData = useMemo(() => {
    return resolvedList.map((m, idx) => ({
      index: idx + 1,
      matchId: m.matchId,
      name: `${m.opponentShort} (${m.formattedDate})`,
      shortOpponent: m.opponentShort,
      date: m.formattedDate,
      score: m.score,
      result: m.result,
      isHome: m.isHome,

      // Possession
      bonesPossession: m.bonesPossession,
      oppPossession: m.oppPossession,

      // Shots on target
      bonesShotsOnTarget: m.bonesShotsOnTarget,
      oppShotsOnTarget: m.oppShotsOnTarget,

      // Pass accuracy
      bonesPassAccuracy: m.bonesPassAccuracy,
      oppPassAccuracy: m.oppPassAccuracy,

      // Goals
      bonesGoals: m.isHome ? m.homeScore : m.awayScore,
      oppGoals: m.isHome ? m.awayScore : m.homeScore,
    }));
  }, [resolvedList]);

  return (
    <div className="space-y-5">
      {/* Top Filter & Header Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#165094] to-[#0B2545] flex items-center justify-center text-white shadow-xs">
              <Crosshair className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Kampstatistikk & Nøkkeltall</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-[#165094] border border-blue-200">
                  Recharts Analytics
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Visualisering av ballbesittelse, skudd på mål og pasningssikkerhet for Bønes-kamper
              </p>
            </div>
          </div>
        </div>

        {/* Season & View Mode Switches */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Season Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-bold text-slate-600">
            <button
              onClick={() => setSeasonFilter('all')}
              className={`px-2.5 py-1.5 rounded-md transition-all ${
                seasonFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Hele sesongen
            </button>
            <button
              onClick={() => setSeasonFilter('host')}
              className={`px-2.5 py-1.5 rounded-md transition-all ${
                seasonFilter === 'host'
                  ? 'bg-[#0B2545] text-white shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Høst
            </button>
            <button
              onClick={() => setSeasonFilter('var')}
              className={`px-2.5 py-1.5 rounded-md transition-all ${
                seasonFilter === 'var'
                  ? 'bg-[#165094] text-white shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Vår
            </button>
          </div>
        </div>
      </div>

      {/* 3 Core Aggregated KPI Cards: Possession, Shots on Target, Pass Accuracy */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* 1. Ballbesittelse Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Ballbesittelse (Snitt)
            </span>
            <div className="w-6 h-6 rounded-md bg-blue-50 text-[#165094] flex items-center justify-center">
              <PieIcon className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-[#165094] font-mono">
                {aggregatedStats.avgBonesPossession}%
              </span>
              <span className="text-xs text-slate-500 ml-1.5 font-semibold">Bønes IL</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-slate-400 font-mono">
                {aggregatedStats.avgOppPossession}%
              </span>
              <span className="text-xs text-slate-400 ml-1">Motstander</span>
            </div>
          </div>

          {/* Dual Bar Progress Indicator */}
          <div className="mt-3 h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${aggregatedStats.avgBonesPossession}%` }}
              className="bg-[#165094] h-full transition-all duration-500 rounded-l-full"
            />
            <div
              style={{ width: `${aggregatedStats.avgOppPossession}%` }}
              className="bg-slate-300 h-full transition-all duration-500 rounded-r-full"
            />
          </div>

          <div className="mt-2.5 text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              Dominans: {aggregatedStats.matchesWithMorePossession} av {aggregatedStats.totalMatches} kamper
            </span>
            <span className="text-emerald-600 font-bold">
              {aggregatedStats.avgBonesPossession > 50 ? '+ Overtak' : 'Jevnt'}
            </span>
          </div>
        </div>

        {/* 2. Skudd på Mål Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Skudd på Mål (Snitt / kamp)
            </span>
            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Crosshair className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-emerald-600 font-mono">
                {aggregatedStats.avgBonesShotsOnTarget}
              </span>
              <span className="text-xs text-slate-500 ml-1.5 font-semibold">Bønes IL</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-slate-400 font-mono">
                {aggregatedStats.avgOppShotsOnTarget}
              </span>
              <span className="text-xs text-slate-400 ml-1">Motstander</span>
            </div>
          </div>

          {/* Dual Bar Progress */}
          {(() => {
            const total = aggregatedStats.avgBonesShotsOnTarget + aggregatedStats.avgOppShotsOnTarget;
            const pct = total > 0 ? (aggregatedStats.avgBonesShotsOnTarget / total) * 100 : 50;
            return (
              <div className="mt-3 h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${pct}%` }}
                  className="bg-emerald-500 h-full transition-all duration-500 rounded-l-full"
                />
                <div
                  style={{ width: `${100 - pct}%` }}
                  className="bg-slate-300 h-full transition-all duration-500 rounded-r-full"
                />
              </div>
            );
          })()}

          <div className="mt-2.5 text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              Flest skudd: {aggregatedStats.matchesWithMoreShotsOnTarget} av {aggregatedStats.totalMatches} kamper
            </span>
            <span className="text-emerald-600 font-bold">
              {aggregatedStats.totalBonesGoals} mål totalt
            </span>
          </div>
        </div>

        {/* 3. Pasningssikkerhet Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pasningssikkerhet (Snitt)
            </span>
            <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Share2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-black text-blue-600 font-mono">
                {aggregatedStats.avgBonesPassAccuracy}%
              </span>
              <span className="text-xs text-slate-500 ml-1.5 font-semibold">Bønes IL</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-slate-400 font-mono">
                {aggregatedStats.avgOppPassAccuracy}%
              </span>
              <span className="text-xs text-slate-400 ml-1">Motstander</span>
            </div>
          </div>

          {/* Dual Bar Progress */}
          <div className="mt-3 h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${aggregatedStats.avgBonesPassAccuracy}%` }}
              className="bg-blue-600 h-full transition-all duration-500 rounded-l-full"
            />
            <div
              style={{ width: `${aggregatedStats.avgOppPassAccuracy}%` }}
              className="bg-slate-300 h-full transition-all duration-500 rounded-r-full"
            />
          </div>

          <div className="mt-2.5 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Presisjon: Pasningssikkerhet i åpent spill</span>
            <span className="text-blue-600 font-bold">
              +{parseFloat((aggregatedStats.avgBonesPassAccuracy - aggregatedStats.avgOppPassAccuracy).toFixed(1))}% diff
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Recharts Section */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Kamp-for-kamp Statistikkfordeling</span>
              <span className="text-xs text-slate-500 font-normal">
                ({resolvedList.length} ferdigspilte kamper)
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Klikk på en stolpe eller velg en kamp for dypdykk
            </p>
          </div>

          {/* Metric Selector Pills */}
          <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveMetric('possession')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeMetric === 'possession'
                  ? 'bg-[#165094] text-white shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Ballbesittelse (%)
            </button>
            <button
              onClick={() => setActiveMetric('shotsOnTarget')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeMetric === 'shotsOnTarget'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Skudd på Mål
            </button>
            <button
              onClick={() => setActiveMetric('passAccuracy')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeMetric === 'passAccuracy'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Pasningssikkerhet (%)
            </button>
          </div>
        </div>

        {/* Recharts BarChart */}
        {barChartData.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            Ingen ferdigspilte kamper matcher det valgte filteret.
          </div>
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                margin={{ top: 20, right: 20, left: -10, bottom: 25 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const matchId = e.activePayload[0].payload.matchId;
                    setSelectedMatchId(matchId);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis
                  dataKey="shortOpponent"
                  tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={45}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  domain={
                    activeMetric === 'possession' || activeMetric === 'passAccuracy'
                      ? [0, 100]
                      : [0, 'dataMax + 2']
                  }
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '10px', fontSize: '12px', fontWeight: 'bold' }}
                />

                {/* Bars for Active Metric */}
                {activeMetric === 'possession' && (
                  <>
                    <Bar
                      dataKey="bonesPossession"
                      name="Bønes IL Besittelse (%)"
                      fill="#165094"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="oppPossession"
                      name="Motstander Besittelse (%)"
                      fill="#CBD5E1"
                      radius={[4, 4, 0, 0]}
                    />
                  </>
                )}

                {activeMetric === 'shotsOnTarget' && (
                  <>
                    <Bar
                      dataKey="bonesShotsOnTarget"
                      name="Bønes IL Skudd på Mål"
                      fill="#10B981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="oppShotsOnTarget"
                      name="Motstander Skudd på Mål"
                      fill="#94A3B8"
                      radius={[4, 4, 0, 0]}
                    />
                  </>
                )}

                {activeMetric === 'passAccuracy' && (
                  <>
                    <Bar
                      dataKey="bonesPassAccuracy"
                      name="Bønes IL Pasningssikkerhet (%)"
                      fill="#2563EB"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="oppPassAccuracy"
                      name="Motstander Pasningssikkerhet (%)"
                      fill="#CBD5E1"
                      radius={[4, 4, 0, 0]}
                    />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Deep-Dive Match Inspection Card */}
      {activeDeepDiveMatch && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs text-sm ${
                  activeDeepDiveMatch.result === 'W'
                    ? 'bg-emerald-600'
                    : activeDeepDiveMatch.result === 'D'
                    ? 'bg-amber-500'
                    : 'bg-rose-600'
                }`}
              >
                {activeDeepDiveMatch.result === 'W'
                  ? 'S'
                  : activeDeepDiveMatch.result === 'D'
                  ? 'U'
                  : 'T'}
              </span>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-base font-black text-slate-900">
                    Bønes IL vs {activeDeepDiveMatch.opponent}
                  </h4>
                  <span className="text-xs bg-white font-bold px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                    {activeDeepDiveMatch.score}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeDeepDiveMatch.formattedDate} • {activeDeepDiveMatch.teamName} •{' '}
                  {activeDeepDiveMatch.isHome ? 'Hjemmekamp' : 'Bortekamp'}
                </p>
              </div>
            </div>

            {/* Match Selector Dropdown */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                Velg kamp:
              </span>
              <select
                value={activeDeepDiveMatch.matchId}
                onChange={(e) => setSelectedMatchId(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#165094]/20"
              >
                {resolvedList.map((r) => (
                  <option key={r.matchId} value={r.matchId}>
                    vs {r.opponentShort} ({r.formattedDate} • {r.score})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparative Stat Bars for Selected Match */}
          <div className="p-4 sm:p-5 space-y-4">
            {/* 1. Ballbesittelse */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#165094] font-mono text-sm">
                  {activeDeepDiveMatch.bonesPossession}%
                </span>
                <span className="text-slate-600 uppercase text-[11px] tracking-wider">
                  Ballbesittelse
                </span>
                <span className="text-slate-500 font-mono text-sm">
                  {activeDeepDiveMatch.oppPossession}%
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${activeDeepDiveMatch.bonesPossession}%` }}
                  className="bg-[#165094] h-full transition-all duration-300 rounded-l-full"
                />
                <div
                  style={{ width: `${activeDeepDiveMatch.oppPossession}%` }}
                  className="bg-slate-300 h-full transition-all duration-300 rounded-r-full"
                />
              </div>
            </div>

            {/* 2. Skudd på mål */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-600 font-mono text-sm">
                  {activeDeepDiveMatch.bonesShotsOnTarget}
                </span>
                <span className="text-slate-600 uppercase text-[11px] tracking-wider">
                  Skudd på Mål
                </span>
                <span className="text-slate-500 font-mono text-sm">
                  {activeDeepDiveMatch.oppShotsOnTarget}
                </span>
              </div>
              {(() => {
                const total =
                  activeDeepDiveMatch.bonesShotsOnTarget + activeDeepDiveMatch.oppShotsOnTarget;
                const pct =
                  total > 0
                    ? (activeDeepDiveMatch.bonesShotsOnTarget / total) * 100
                    : 50;
                return (
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{ width: `${pct}%` }}
                      className="bg-emerald-500 h-full transition-all duration-300 rounded-l-full"
                    />
                    <div
                      style={{ width: `${100 - pct}%` }}
                      className="bg-slate-300 h-full transition-all duration-300 rounded-r-full"
                    />
                  </div>
                );
              })()}
            </div>

            {/* 3. Pasningssikkerhet */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-blue-600 font-mono text-sm">
                  {activeDeepDiveMatch.bonesPassAccuracy}%
                </span>
                <span className="text-slate-600 uppercase text-[11px] tracking-wider">
                  Pasningssikkerhet
                </span>
                <span className="text-slate-500 font-mono text-sm">
                  {activeDeepDiveMatch.oppPassAccuracy}%
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${activeDeepDiveMatch.bonesPassAccuracy}%` }}
                  className="bg-blue-600 h-full transition-all duration-300 rounded-l-full"
                />
                <div
                  style={{ width: `${activeDeepDiveMatch.oppPassAccuracy}%` }}
                  className="bg-slate-300 h-full transition-all duration-300 rounded-r-full"
                />
              </div>
            </div>

            {/* Supplementary row: Shots total, corners, fouls */}
            <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-100 text-center text-xs">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-500 block font-semibold">Skudd totalt</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {activeDeepDiveMatch.bonesShotsTotal} - {activeDeepDiveMatch.oppShotsTotal}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-500 block font-semibold">Hjørnespark</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {activeDeepDiveMatch.bonesCorners} - {activeDeepDiveMatch.oppCorners}
                </span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-500 block font-semibold">Frispark / Fouls</span>
                <span className="font-mono font-bold text-slate-800 text-sm">
                  {activeDeepDiveMatch.bonesFouls} - {activeDeepDiveMatch.oppFouls}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
