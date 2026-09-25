import React, { useState, useMemo } from 'react';
import { Match, MomentumPoint } from '../types.js';
import { calculateMatchMomentum } from '../utils/momentumEngine.js';
import { Activity, ShieldAlert, Sparkles } from 'lucide-react';

interface AttackMomentumChartProps {
  match: Match;
  className?: string;
  showDetails?: boolean;
}

export const AttackMomentumChart: React.FC<AttackMomentumChartProps> = ({
  match,
  className = '',
  showDetails = true,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<MomentumPoint | null>(null);

  const momentum = useMemo(() => {
    return calculateMatchMomentum(match);
  }, [match]);

  const {
    timeline,
    matchDuration,
    halfTimeMinute,
    homeDominancePct,
    awayDominancePct,
    firstHalfDominance,
    secondHalfDominance,
    clutchPhase,
  } = momentum;

  const isBonesHome = (match.homeTeam || '').toLowerCase().includes('bønes');

  // SVG dimensions
  const height = 150;
  const paddingX = 24;
  const paddingTop = 26;
  const paddingBottom = 22;
  const chartHeight = height - paddingTop - paddingBottom;
  const midY = paddingTop + chartHeight / 2;

  // Bar rendering calculations
  const totalMinutes = matchDuration;

  if (match.status === 'upcoming') {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200/80 p-4 text-center ${className}`}>
        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold mb-1">
          <Activity className="w-4 h-4 text-slate-300" />
          <span>Angrepsmomentum (SofaScore-motor)</span>
        </div>
        <p className="text-xs text-slate-500">
          Momentumkurve og spillovertak aktiveres automatisk når kampen starter.
        </p>
      </div>
    );
  }

  const getX = (min: number) => {
    const widthPercentage = (min - 1) / Math.max(1, totalMinutes - 1);
    return paddingX + widthPercentage * (100 - paddingX * 2);
  };

  const htX = getX(halfTimeMinute);

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all ${className}`}
    >
      {/* Header with SofaScore Dominance Split */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#165094]/10 text-[#165094] flex items-center justify-center font-bold">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black tracking-wide text-slate-900 uppercase">
                Angrepsmomentum
              </h4>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-md">
                Live Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Spillovertak og trykk minutt for minutt
            </p>
          </div>
        </div>

        {/* Team Dominance Split Bar */}
        <div className="flex flex-col sm:items-end min-w-[200px]">
          <div className="flex justify-between w-full text-[11px] font-black mb-1">
            <span className="text-[#165094] truncate max-w-[110px]">
              {match.homeTeam} {homeDominancePct}%
            </span>
            <span className="text-amber-700 truncate max-w-[110px] text-right">
              {awayDominancePct}% {match.awayTeam}
            </span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full flex overflow-hidden shadow-inner">
            <div
              className="bg-[#165094] h-full transition-all duration-500"
              style={{ width: `${homeDominancePct}%` }}
              title={`${match.homeTeam}: ${homeDominancePct}%`}
            />
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${awayDominancePct}%` }}
              title={`${match.awayTeam}: ${awayDominancePct}%`}
            />
          </div>
        </div>
      </div>

      {/* Main SVG Momentum Wave */}
      <div className="p-3 sm:p-4 relative">
        <div className="relative w-full overflow-hidden select-none">
          <svg
            viewBox={`0 0 1000 ${height}`}
            className="w-full h-auto overflow-visible cursor-crosshair touch-none"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              {/* Home Team (Upper) Gradient */}
              <linearGradient id="homeBarGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#165094" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#1e6bbf" stopOpacity="0.95" />
              </linearGradient>

              {/* Away Team (Lower) Gradient */}
              <linearGradient id="awayBarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#d97706" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.95" />
              </linearGradient>
            </defs>

            {/* Background Grid Lines & Half Zones */}
            <rect
              x={getX(1) * 10}
              y={paddingTop}
              width={(htX - getX(1)) * 10}
              height={chartHeight}
              fill="#f8fafc"
              opacity="0.6"
            />
            <rect
              x={htX * 10}
              y={paddingTop}
              width={(getX(totalMinutes) - htX) * 10}
              height={chartHeight}
              fill="#f1f5f9"
              opacity="0.4"
            />

            {/* Zero Baseline (Neutral Momentum) */}
            <line
              x1={getX(1) * 10}
              y1={midY}
              x2={getX(totalMinutes) * 10}
              y2={midY}
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />

            {/* Half-Time Divider Line */}
            <line
              x1={htX * 10}
              y1={paddingTop - 10}
              x2={htX * 10}
              y2={height - paddingBottom + 10}
              stroke="#64748b"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <text
              x={htX * 10}
              y={paddingTop - 14}
              textAnchor="middle"
              className="text-[10px] font-black fill-slate-500 tracking-wider"
            >
              PAUSE ({halfTimeMinute}')
            </text>

            {/* Full-Time Marker */}
            <text
              x={getX(totalMinutes) * 10}
              y={paddingTop - 14}
              textAnchor="end"
              className="text-[10px] font-black fill-slate-500 tracking-wider"
            >
              SLUTT ({totalMinutes}')
            </text>

            {/* Momentum Bars */}
            {timeline.map((point) => {
              const xCenter = getX(point.minute) * 10;
              const barWidth = Math.max(3.5, (1000 / totalMinutes) * 0.72);
              const x = xCenter - barWidth / 2;

              const isHomeAdvantage = point.netMomentum >= 0;
              const normalizedIntensity = Math.abs(point.netMomentum) / 100;
              const barLength = Math.max(2, normalizedIntensity * (chartHeight / 2 - 4));

              const y = isHomeAdvantage ? midY - barLength : midY;

              const isHovered = hoveredPoint?.minute === point.minute;

              return (
                <g
                  key={point.minute}
                  className="transition-all"
                  onMouseEnter={() => setHoveredPoint(point)}
                  onTouchStart={() => setHoveredPoint(point)}
                >
                  {/* Invisible hit test column */}
                  <rect
                    x={xCenter - (1000 / totalMinutes) / 2}
                    y={paddingTop}
                    width={1000 / totalMinutes}
                    height={chartHeight}
                    fill="transparent"
                  />

                  {/* Visual Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barLength}
                    rx={2}
                    fill={isHomeAdvantage ? 'url(#homeBarGradient)' : 'url(#awayBarGradient)'}
                    className={`transition-opacity duration-150 ${
                      isHovered ? 'opacity-100 brightness-110' : 'opacity-85 hover:opacity-100'
                    }`}
                  />

                  {/* Minute Axis Label (every 15 mins) */}
                  {(point.minute === 1 ||
                    point.minute % 15 === 0 ||
                    point.minute === totalMinutes) && (
                    <text
                      x={xCenter}
                      y={height - 6}
                      textAnchor="middle"
                      className="text-[10px] font-bold fill-slate-400"
                    >
                      {point.minute}'
                    </text>
                  )}
                </g>
              );
            })}

            {/* Match Event Pins on the Zero Line */}
            {timeline.map((point) => {
              if (!point.events || point.events.length === 0) return null;

              const xCenter = getX(point.minute) * 10;
              const hasGoal = point.events.some((e) => e.type === 'goal');
              const hasRed = point.events.some((e) => e.type === 'red_card');
              const hasYellow = point.events.some((e) => e.type === 'yellow_card');

              return (
                <g key={`event-pin-${point.minute}`}>
                  {/* Vertical guide marker */}
                  <line
                    x1={xCenter}
                    y1={paddingTop + 2}
                    x2={xCenter}
                    y2={height - paddingBottom - 2}
                    stroke={hasGoal ? '#f59e0b' : hasRed ? '#ef4444' : '#fbbf24'}
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                  />

                  {/* Event Icon Bubble */}
                  <circle
                    cx={xCenter}
                    cy={midY}
                    r={hasGoal ? 7.5 : 5.5}
                    fill={hasGoal ? '#ffffff' : hasRed ? '#ef4444' : '#f59e0b'}
                    stroke={hasGoal ? '#d97706' : '#ffffff'}
                    strokeWidth="1.5"
                    className="drop-shadow-xs"
                  />
                  <text
                    x={xCenter}
                    y={midY + (hasGoal ? 3.5 : 2.5)}
                    textAnchor="middle"
                    className="text-[9px] font-black select-none pointer-events-none"
                    fill={hasGoal ? '#1e293b' : '#ffffff'}
                  >
                    {hasGoal ? '⚽' : hasRed ? '🟥' : '🟨'}
                  </text>
                </g>
              );
            })}

            {/* Hover Indicator Line */}
            {hoveredPoint && (
              <g>
                <line
                  x1={getX(hoveredPoint.minute) * 10}
                  y1={paddingTop - 6}
                  x2={getX(hoveredPoint.minute) * 10}
                  y2={height - paddingBottom + 6}
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                <circle
                  cx={getX(hoveredPoint.minute) * 10}
                  cy={
                    hoveredPoint.netMomentum >= 0
                      ? midY - (Math.abs(hoveredPoint.netMomentum) / 100) * (chartHeight / 2 - 4)
                      : midY + (Math.abs(hoveredPoint.netMomentum) / 100) * (chartHeight / 2 - 4)
                  }
                  r="4"
                  fill="#0f172a"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </g>
            )}
          </svg>
        </div>

        {/* Floating Scrubber Tooltip */}
        {hoveredPoint ? (
          <div className="mt-2.5 bg-slate-900 text-white rounded-xl p-2.5 shadow-lg border border-slate-700 text-xs flex flex-wrap items-center justify-between gap-2 animate-in fade-in duration-100">
            <div className="flex items-center gap-2">
              <span className="font-mono bg-blue-600 text-white px-2 py-0.5 rounded font-black text-xs">
                {hoveredPoint.minute}'
              </span>
              <span className="font-bold text-slate-200">
                Stilling: {hoveredPoint.scoreAtMinute?.home ?? 0} -{' '}
                {hoveredPoint.scoreAtMinute?.away ?? 0}
              </span>
              <span className="text-slate-400">|</span>
              <span
                className={`font-black ${
                  hoveredPoint.netMomentum > 15
                    ? 'text-blue-400'
                    : hoveredPoint.netMomentum < -15
                    ? 'text-amber-400'
                    : 'text-slate-300'
                }`}
              >
                {hoveredPoint.netMomentum > 0
                  ? `${match.homeTeam} +${hoveredPoint.netMomentum}`
                  : hoveredPoint.netMomentum < 0
                  ? `${match.awayTeam} +${Math.abs(hoveredPoint.netMomentum)}`
                  : 'Balansert'}
              </span>
            </div>

            {hoveredPoint.narrative && (
              <span className="text-[11px] text-amber-300 font-semibold italic">
                {hoveredPoint.narrative}
              </span>
            )}
          </div>
        ) : (
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#165094]" />
              <span>{match.homeTeam} overgangstrykk</span>
            </div>
            <span className="text-[10px] text-slate-400 italic">
              Dra fingeren eller mus over grafen for detaljer
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              <span>{match.awayTeam} overgangstrykk</span>
            </div>
          </div>
        )}
      </div>

      {/* Analytical Narrative & Sluttspurt Callout */}
      {showDetails && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
          {/* Half-Time Breakdown */}
          <div className="flex items-center gap-3 text-slate-600">
            <span className="font-bold text-slate-700">Omgangsfordeling:</span>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
              <span className="text-[10px] font-bold text-slate-500">1. omgang:</span>
              <span className="font-mono font-bold text-[#165094]">{firstHalfDominance.home}%</span>
              <span className="text-slate-300">-</span>
              <span className="font-mono font-bold text-amber-700">{firstHalfDominance.away}%</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
              <span className="text-[10px] font-bold text-slate-500">2. omgang:</span>
              <span className="font-mono font-bold text-[#165094]">{secondHalfDominance.home}%</span>
              <span className="text-slate-300">-</span>
              <span className="font-mono font-bold text-amber-700">{secondHalfDominance.away}%</span>
            </div>
          </div>

          {/* Clutch Phase Highlight */}
          {clutchPhase && (
            <div className="flex items-center gap-1.5 text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-lg font-medium text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-bold">{clutchPhase.description}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
