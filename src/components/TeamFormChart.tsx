import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell
} from 'recharts';
import * as d3 from 'd3';
import { TeamInfo, Match } from '../types.js';
import {
  TrendingUp,
  Activity,
  Trophy,
  Flame,
  CheckCircle2,
  Calendar,
  Shield,
  BarChart3,
  LineChart as LineChartIcon,
  ChevronRight,
  Target,
  Sparkles
} from 'lucide-react';

interface TeamFormChartProps {
  team: TeamInfo;
  season: 'host' | 'var';
  matches: Match[];
  onSelectMatch?: (match: Match) => void;
  className?: string;
}

export interface FormMatchItem {
  match: Match;
  matchIndex: number;
  matchLabel: string;
  dateStr: string;
  opponent: string;
  isHome: boolean;
  venue: string;
  bonesScore: number;
  oppScore: number;
  result: 'W' | 'D' | 'L';
  resultText: string;
  points: number;
  cumulativePoints: number;
  goalDiff: number;
  cumulativeGoalDiff: number;
}

export const TeamFormChart: React.FC<TeamFormChartProps> = ({
  team,
  season,
  matches,
  onSelectMatch,
  className = ''
}) => {
  const [chartType, setChartType] = useState<'points' | 'goals'>('points');
  const [activeHoverMatch, setActiveHoverMatch] = useState<FormMatchItem | null>(null);

  // Extract and process last 5 matches for this team
  const formItems = useMemo<FormMatchItem[]>(() => {
    if (!matches || matches.length === 0) return [];

    // Filter matches involving this team
    const teamMatches = matches.filter((m) => {
      const matchTeamId = m.teamId?.toLowerCase();
      const targetTeamId = team.id.toLowerCase();
      const homeName = m.homeTeam.toLowerCase();
      const awayName = m.awayTeam.toLowerCase();
      const teamFullName = team.name.toLowerCase();
      const teamShort = team.shortName.toLowerCase();

      return (
        matchTeamId === targetTeamId ||
        homeName.includes(teamFullName) ||
        awayName.includes(teamFullName) ||
        (teamShort && (homeName.includes(teamShort) || awayName.includes(teamShort)))
      );
    });

    // Finished matches only
    const finishedMatches = teamMatches.filter((m) => m.status === 'finished');

    // Season filter: Høst matches (from July onwards) or Vår matches (before July)
    const seasonMatches = finishedMatches.filter((m) => {
      if (!m.date) return true;
      const matchDate = new Date(m.date);
      if (isNaN(matchDate.getTime())) return true;
      const month = matchDate.getMonth(); // 0-indexed: Jan=0, Jul=6, Aug=7
      if (season === 'host') {
        return month >= 6; // July through December
      } else {
        return month < 6; // January through June
      }
    });

    // If season filter yielded matches, use them; otherwise fallback to recent finished matches
    const pool = seasonMatches.length >= 2 ? seasonMatches : finishedMatches;

    // Sort descending by date to take the 5 most recent
    const sortedDesc = [...pool].sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.time || '12:00'}`).getTime();
      const timeB = new Date(`${b.date}T${b.time || '12:00'}`).getTime();
      return timeB - timeA;
    });

    const last5Desc = sortedDesc.slice(0, 5);

    // Reverse to chronological order (earliest to latest) for timeline progression
    const last5Chrono = [...last5Desc].reverse();

    let runningPoints = 0;
    let runningGoalDiff = 0;

    return last5Chrono.map((m, idx) => {
      const homeIsBones =
        m.isHome ??
        (m.homeTeam.toLowerCase().includes('bønes') ||
          (team.shortName && m.homeTeam.toLowerCase().includes(team.shortName.toLowerCase())));

      const bonesScore = homeIsBones ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
      const oppScore = homeIsBones ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
      const opponent = homeIsBones ? m.awayTeam : m.homeTeam;

      let result: 'W' | 'D' | 'L' = 'D';
      let resultText = 'Uavgjort';
      let points = 1;

      if (bonesScore > oppScore) {
        result = 'W';
        resultText = 'Seier';
        points = 3;
      } else if (bonesScore < oppScore) {
        result = 'L';
        resultText = 'Tap';
        points = 0;
      }

      runningPoints += points;
      const goalDiff = bonesScore - oppScore;
      runningGoalDiff += goalDiff;

      const dateObj = new Date(m.date);
      const dateStr = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' })
        : m.date;

      return {
        match: m,
        matchIndex: idx + 1,
        matchLabel: `K${idx + 1}`,
        dateStr,
        opponent,
        isHome: homeIsBones,
        venue: m.venue || (homeIsBones ? 'Fjellsdalen' : 'Borte'),
        bonesScore,
        oppScore,
        result,
        resultText,
        points,
        cumulativePoints: runningPoints,
        goalDiff,
        cumulativeGoalDiff: runningGoalDiff
      };
    });
  }, [matches, team, season]);

  // Aggregate stats across the 5 matches
  const stats = useMemo(() => {
    if (formItems.length === 0) {
      return {
        totalPoints: 0,
        maxPoints: 0,
        pointsPercent: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        avgPoints: 0,
        formStatus: 'Ingen kamper spilt ennå',
        streakText: 'Avventer sesongstart'
      };
    }

    const wins = formItems.filter((i) => i.result === 'W').length;
    const draws = formItems.filter((i) => i.result === 'D').length;
    const losses = formItems.filter((i) => i.result === 'L').length;
    const totalPoints = formItems[formItems.length - 1]?.cumulativePoints ?? 0;
    const maxPoints = formItems.length * 3;
    const pointsPercent = Math.round((totalPoints / maxPoints) * 100);
    const goalsFor = formItems.reduce((acc, curr) => acc + curr.bonesScore, 0);
    const goalsAgainst = formItems.reduce((acc, curr) => acc + curr.oppScore, 0);
    const goalDiff = goalsFor - goalsAgainst;
    const avgPoints = (totalPoints / formItems.length).toFixed(1);

    // Evaluate form status with dynamic description
    let formStatus = 'Stabil form';
    if (totalPoints >= 13) {
      formStatus = 'Kanonform 🔥 (Uslåelig poengfangst)';
    } else if (totalPoints >= 10) {
      formStatus = 'Sterk form 💪 (Solid poengfangst)';
    } else if (totalPoints >= 7) {
      formStatus = 'Middels form ⚖️ (Blandede resultater)';
    } else if (totalPoints >= 4) {
      formStatus = 'Ujevn form ⚠️ (Trenger trepoengere)';
    } else {
      formStatus = 'Formsvikt 📉 (På jakt etter revansj)';
    }

    // Determine current streak from newest match backwards
    const recent = [...formItems].reverse();
    let streakCount = 0;
    const firstResult = recent[0]?.result;
    for (const item of recent) {
      if (item.result === firstResult) {
        streakCount++;
      } else {
        break;
      }
    }

    let streakText = '';
    if (firstResult === 'W') {
      streakText = streakCount > 1 ? `${streakCount} seire på rad!` : 'Seier i siste kamp!';
    } else if (firstResult === 'D') {
      streakText = `${streakCount} uavgjort på rad`;
    } else if (firstResult === 'L') {
      streakText = streakCount > 1 ? `${streakCount} tap på rad` : 'Tap i siste kamp';
    }

    // Check unbeaten streak
    let unbeatenCount = 0;
    for (const item of recent) {
      if (item.result === 'W' || item.result === 'D') {
        unbeatenCount++;
      } else {
        break;
      }
    }
    if (unbeatenCount >= 3) {
      streakText = `Uslått i ${unbeatenCount} kamper på rad!`;
    }

    return {
      totalPoints,
      maxPoints,
      pointsPercent,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDiff,
      avgPoints,
      formStatus,
      streakText
    };
  }, [formItems]);

  // Use D3 color interpolator to calculate dynamic accent color based on form points
  const formAccentColor = useMemo(() => {
    const ratio = stats.maxPoints > 0 ? stats.totalPoints / stats.maxPoints : 0.5;
    // Interpolate between crimson red (0%), amber (50%), and vibrant emerald (100%)
    if (ratio < 0.5) {
      return d3.interpolateRgb('#dc2626', '#d97706')(ratio * 2);
    } else {
      return d3.interpolateRgb('#d97706', '#059669')((ratio - 0.5) * 2);
    }
  }, [stats.totalPoints, stats.maxPoints]);

  if (formItems.length === 0) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 p-6 text-center ${className}`}>
        <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <h4 className="font-bold text-slate-700 text-sm">Ingen formdata tilgjengelig</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Det er ikke registrert nok spilte kamper for {team.name} i {season === 'host' ? 'høstsesongen' : 'vårsesongen'} til å beregne formkurve.
        </p>
      </div>
    );
  }

  // Custom Dot for AreaChart
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const item = payload as FormMatchItem;
    if (!item) return null;

    let fill = '#059669'; // win
    let letter = 'S';
    if (item.result === 'D') {
      fill = '#d97706';
      letter = 'U';
    } else if (item.result === 'L') {
      fill = '#dc2626';
      letter = 'T';
    }

    const isHovered = activeHoverMatch?.match.id === item.match.id;

    return (
      <g
        key={`dot-${item.matchIndex}`}
        className="cursor-pointer transition-transform duration-150"
        onClick={() => onSelectMatch?.(item.match)}
      >
        {/* Outer glowing halo on hover */}
        {isHovered && (
          <circle cx={cx} cy={cy} r={16} fill={fill} fillOpacity={0.25} className="animate-pulse" />
        )}
        <circle
          cx={cx}
          cy={cy}
          r={isHovered ? 11 : 9}
          fill={fill}
          stroke="#ffffff"
          strokeWidth={2.5}
        />
        <text
          x={cx}
          y={cy + 3.5}
          textAnchor="middle"
          fill="#ffffff"
          fontSize={10}
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
          pointerEvents="none"
        >
          {letter}
        </text>
      </g>
    );
  };

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item: FormMatchItem = payload[0].payload;
    if (!item) return null;

    const isWin = item.result === 'W';
    const isDraw = item.result === 'D';

    return (
      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700/80 text-xs min-w-[210px] pointer-events-none">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
          <span className="font-bold text-slate-300">
            {item.matchLabel} • {item.dateStr}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
              isWin
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : isDraw
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}
          >
            {item.resultText} (+{item.points}p)
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between font-bold text-sm">
            <span className="text-blue-300">Bønes</span>
            <span className="font-mono text-white bg-slate-800 px-2 py-0.5 rounded">
              {item.bonesScore} - {item.oppScore}
            </span>
            <span className="text-slate-300 truncate max-w-[90px] text-right">{item.opponent}</span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
            <span>Arena: {item.isHome ? 'Hjemmebanen' : 'Bortebane'}</span>
            <span className="truncate max-w-[100px]">{item.venue}</span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800 pt-1.5 mt-1 font-mono">
            <span>Akkumulerte formpoeng:</span>
            <span className="font-bold text-amber-400">
              {item.cumulativePoints} / {item.matchIndex * 3}p
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      id={`team-form-chart-${team.id}`}
      className={`bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden ${className}`}
    >
      {/* Header with Title and Mode Switcher */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-[#0B2545] to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white shadow-xs"
              style={{ backgroundColor: formAccentColor }}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <span>Formkurve – Siste 5 kamper</span>
                <span className="text-xs font-semibold text-slate-300">({team.shortName})</span>
              </h3>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 mt-0.5">
                <span>{season === 'host' ? 'Høstsesong 2026' : 'Vårsesong 2026'}</span>
                <span>•</span>
                <span>{stats.formStatus}</span>
              </p>
            </div>
          </div>
        </div>

        {/* View toggle & Form points summary */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Quick Points Pill */}
          <div className="px-3 py-1 bg-slate-800/90 border border-slate-700/80 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs">
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-amber-400 font-mono text-sm">{stats.totalPoints}</span>
            <span className="text-slate-400">/ {stats.maxPoints} p</span>
            <span className="text-[10px] text-slate-400 font-normal">({stats.pointsPercent}%)</span>
          </div>

          {/* Interactive Chart Mode Tabs */}
          <div className="inline-flex p-0.5 bg-slate-800 rounded-lg border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setChartType('points')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                chartType === 'points'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
              title="Vis poengutvikling"
            >
              <LineChartIcon className="w-3 h-3" />
              <span>Poengkurve</span>
            </button>
            <button
              onClick={() => setChartType('goals')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                chartType === 'goals'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
              title="Vis målscore og målforskjell"
            >
              <BarChart3 className="w-3 h-3" />
              <span>Mål & MF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-50/50 to-white">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2 px-1">
          <div className="flex items-center gap-3">
            {chartType === 'points' ? (
              <>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-3 h-1 bg-blue-600 rounded-full inline-block"></span>
                  <span>Akkumulert poengtrend (0 - 15p)</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span> Seier (3p)
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block ml-1"></span> Uavgjort (1p)
                  <span className="w-2 h-2 rounded-full bg-red-600 inline-block ml-1"></span> Tap (0p)
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 bg-blue-600 rounded-xs inline-block"></span>
                  <span>Bønes mål</span>
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-xs inline-block"></span>
                  <span>Innsluppet</span>
                </span>
                <span className="flex items-center gap-1.5 font-medium hidden sm:inline-flex">
                  <span className="w-3 h-0.5 bg-amber-500 inline-block"></span>
                  <span>Målforskjell</span>
                </span>
              </>
            )}
          </div>

          <span className="text-[11px] text-slate-400 italic">
            Klikk på en kamp for lagoppstilling
          </span>
        </div>

        {/* Chart Box */}
        <div className="h-[210px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'points' ? (
              <AreaChart
                data={formItems}
                margin={{ top: 18, right: 16, left: -20, bottom: 0 }}
                onMouseMove={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length) {
                    setActiveHoverMatch(state.activePayload[0].payload);
                  }
                }}
                onMouseLeave={() => setActiveHoverMatch(null)}
              >
                <defs>
                  <linearGradient id={`formGradient-${team.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#165094" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#165094" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.8} />
                <XAxis
                  dataKey="matchLabel"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fontSize: 11, fontWeight: 600, fill: '#475569' }}
                  tickFormatter={(val, idx) => {
                    const item = formItems[idx];
                    return item ? `${val} (${item.dateStr})` : val;
                  }}
                />
                <YAxis
                  domain={[0, 15]}
                  ticks={[0, 3, 6, 9, 12, 15]}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={15}
                  stroke="#10b981"
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                  label={{ value: 'Maks 15p', position: 'insideTopRight', fill: '#059669', fontSize: 10 }}
                />
                <ReferenceLine
                  y={7.5}
                  stroke="#94a3b8"
                  strokeDasharray="2 2"
                  strokeOpacity={0.4}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativePoints"
                  stroke="#165094"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill={`url(#formGradient-${team.id})`}
                  dot={renderCustomDot}
                  activeDot={{ r: 12, fill: '#0B2545', stroke: '#ffffff', strokeWidth: 3 }}
                />
              </AreaChart>
            ) : (
              <ComposedChart
                data={formItems}
                margin={{ top: 15, right: 16, left: -20, bottom: 0 }}
                onMouseMove={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length) {
                    setActiveHoverMatch(state.activePayload[0].payload);
                  }
                }}
                onMouseLeave={() => setActiveHoverMatch(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.8} />
                <XAxis
                  dataKey="matchLabel"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fontSize: 11, fontWeight: 600, fill: '#475569' }}
                  tickFormatter={(val, idx) => {
                    const item = formItems[idx];
                    return item ? `${val} (${item.dateStr})` : val;
                  }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Bar
                  dataKey="bonesScore"
                  name="Bønes mål"
                  fill="#165094"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                >
                  {formItems.map((entry, index) => (
                    <Cell
                      key={`cell-bones-${index}`}
                      fill={entry.result === 'W' ? '#059669' : '#165094'}
                    />
                  ))}
                </Bar>
                <Bar
                  dataKey="oppScore"
                  name="Innsluppet"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
                <Line
                  type="monotone"
                  dataKey="goalDiff"
                  name="Målforskjell"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#d97706', stroke: '#fff', strokeWidth: 2 }}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive 5-Match Cards Strip */}
      <div className="border-t border-slate-100 bg-slate-50/70 p-3 sm:p-4">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Kamper kronologisk (K1 til K5):</span>
          <span className="text-slate-400 font-normal">
            Resultatrekke: {formItems.map((i) => (i.result === 'W' ? 'S' : i.result === 'D' ? 'U' : 'T')).join(' - ')}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {formItems.map((item) => {
            const isWin = item.result === 'W';
            const isDraw = item.result === 'D';
            const isHovered = activeHoverMatch?.match.id === item.match.id;

            return (
              <div
                key={item.match.id}
                onClick={() => onSelectMatch?.(item.match)}
                onMouseEnter={() => setActiveHoverMatch(item)}
                onMouseLeave={() => setActiveHoverMatch(null)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                  isHovered
                    ? 'bg-blue-50 border-blue-400 shadow-xs ring-1 ring-blue-300'
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                    <span className="font-extrabold text-slate-700">{item.matchLabel}</span>
                    <span>{item.dateStr}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 truncate" title={item.opponent}>
                    <span className="text-slate-400 font-medium mr-1">{item.isHome ? 'H:' : 'B:'}</span>
                    {item.opponent}
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-slate-100">
                  <span className="font-mono font-extrabold text-xs text-slate-900">
                    {item.bonesScore} - {item.oppScore}
                  </span>
                  <span
                    className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-extrabold text-white shadow-2xs ${
                      isWin ? 'bg-emerald-600' : isDraw ? 'bg-amber-500' : 'bg-red-600'
                    }`}
                    title={isWin ? 'Seier (+3p)' : isDraw ? 'Uavgjort (+1p)' : 'Tap (0p)'}
                  >
                    {isWin ? 'S' : isDraw ? 'U' : 'T'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Performance Summary Grid */}
      <div className="border-t border-slate-200 bg-white p-3.5 sm:p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-slate-500 block text-[11px] font-medium">Poengfangst</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-extrabold text-slate-900 font-mono">
              {stats.totalPoints} / {stats.maxPoints}
            </span>
            <span className="text-[11px] text-slate-500">({stats.avgPoints} p/k)</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {stats.wins}V - {stats.draws}U - {stats.losses}T
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-slate-500 block text-[11px] font-medium">Målscore</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-extrabold text-emerald-700 font-mono">
              {stats.goalsFor} mål
            </span>
            <span className="text-[11px] text-slate-500">
              ({(stats.goalsFor / formItems.length).toFixed(1)} snitt)
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            I snitt {(stats.goalsFor / formItems.length).toFixed(1)} mål per kamp
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-slate-500 block text-[11px] font-medium">Innslupne mål</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-extrabold text-slate-800 font-mono">
              {stats.goalsAgainst} mål
            </span>
            <span className="text-[11px] text-slate-500">
              ({(stats.goalsAgainst / formItems.length).toFixed(1)} snitt)
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            {stats.goalDiff > 0 ? (
              <span className="text-emerald-600 font-semibold">Netto MF: +{stats.goalDiff}</span>
            ) : stats.goalDiff < 0 ? (
              <span className="text-rose-600 font-semibold">Netto MF: {stats.goalDiff}</span>
            ) : (
              <span className="text-slate-500 font-semibold">Netto MF: 0</span>
            )}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
          <span className="text-slate-500 block text-[11px] font-medium">Nåværende trend</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Flame className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs font-bold text-slate-900 truncate">
              {stats.streakText || 'Avventer'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block truncate">
            {stats.formStatus}
          </span>
        </div>
      </div>
    </div>
  );
};
