import React, { useState, useMemo } from 'react';
import * as d3 from 'd3';
import { BonesClubData, PlayerPosition } from '../types.js';
import { buildPlayerProfile } from '../utils/playerHistory.js';
import { TrendingUp, TrendingDown, Star, Sparkles, User, Award, Activity } from 'lucide-react';

interface PlayerRatingEvolutionChartProps {
  data: BonesClubData;
  initialPlayerName?: string;
  selectedTeamId?: string;
  onSelectPlayer?: (name: string, teamId?: string) => void;
}

export const PlayerRatingEvolutionChart: React.FC<PlayerRatingEvolutionChartProps> = ({
  data,
  initialPlayerName,
  selectedTeamId = 'all',
  onSelectPlayer,
}) => {
  // Available players to pick from
  const candidatePlayers = useMemo(() => {
    const list = selectedTeamId === 'all'
      ? data.players
      : data.players.filter((p) => p.teamId === selectedTeamId);
    
    // Sort by matches / goals to put active players first
    return [...list].sort((a, b) => (b.goals || 0) - (a.goals || 0) || (b.matches || 0) - (a.matches || 0));
  }, [data.players, selectedTeamId]);

  // Active player selected in chart
  const [selectedName, setSelectedName] = useState<string>(() => {
    if (initialPlayerName) return initialPlayerName;
    return candidatePlayers.length > 0 ? candidatePlayers[0].name : 'Sunniva Stavrum';
  });
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  // Keep in sync if prop changes
  React.useEffect(() => {
    if (initialPlayerName) {
      setSelectedName(initialPlayerName);
    }
  }, [initialPlayerName]);

  // Find candidate object
  const activeCandidate = useMemo(() => {
    return candidatePlayers.find((p) => p.name.toLowerCase() === selectedName.toLowerCase()) || candidatePlayers[0];
  }, [candidatePlayers, selectedName]);

  // Build profile to retrieve match history with ratings
  const playerProfile = useMemo(() => {
    if (!activeCandidate) return null;
    return buildPlayerProfile(
      activeCandidate.name,
      activeCandidate.teamId || (selectedTeamId !== 'all' ? selectedTeamId : 'menn-1'),
      data,
      activeCandidate.fiksId
    );
  }, [activeCandidate, data, selectedTeamId]);

  // Extract the last 5 matches (or all available if < 5) in chronological order
  const chartData = useMemo(() => {
    if (!playerProfile || !playerProfile.matchHistory || playerProfile.matchHistory.length === 0) {
      return [];
    }

    // playerProfile.matchHistory is sorted latest first. Take top 5, then reverse so chart runs left-to-right
    const last5 = playerProfile.matchHistory.slice(0, 5).reverse();

    return last5.map((m, idx) => {
      // Format short date (e.g. "22. sep")
      let dateLabel = m.date;
      try {
        const d = new Date(m.date);
        dateLabel = d.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
      } catch {
        // keep raw
      }

      return {
        matchIndex: idx + 1,
        opponent: m.opponent.replace(' IL', '').replace(' Fotball', ''),
        fullOpponent: m.opponent,
        date: dateLabel,
        rating: parseFloat(m.rating.toFixed(2)),
        score: m.score,
        result: m.result,
        goals: m.goals,
        highlight: m.highlight,
        isHome: m.isHome,
        teamName: m.teamName,
      };
    });
  }, [playerProfile]);

  // Calculate statistics over these 5 matches
  const statsSummary = useMemo(() => {
    if (chartData.length === 0) {
      return { avg: 7.0, latest: 7.0, trend: 0, peak: 7.0, peakOpp: '' };
    }

    const ratings = chartData.map((d) => d.rating);
    const sum = ratings.reduce((a, b) => a + b, 0);
    const avg = parseFloat((sum / ratings.length).toFixed(2));
    const latest = ratings[ratings.length - 1];
    const first = ratings[0];
    const trend = parseFloat((latest - first).toFixed(2));

    let peak = ratings[0];
    let peakOpp = chartData[0].opponent;
    chartData.forEach((d) => {
      if (d.rating > peak) {
        peak = d.rating;
        peakOpp = d.opponent;
      }
    });

    return { avg, latest, trend, peak, peakOpp };
  }, [chartData]);

  // Get color for rating badge
  const getRatingColor = (rating: number) => {
    if (rating >= 8.2) return 'bg-emerald-600 text-white';
    if (rating >= 7.5) return 'bg-emerald-500 text-white';
    if (rating >= 7.0) return 'bg-blue-600 text-white';
    if (rating >= 6.5) return 'bg-amber-500 text-white';
    return 'bg-rose-500 text-white';
  };

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-xs text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs min-w-[190px] animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
            <span className="font-bold text-slate-300">Kamp #{d.matchIndex}</span>
            <span className="text-[10px] text-slate-400">{d.date}</span>
          </div>
          
          <div className="flex items-center justify-between mb-1.5">
            <div className="font-bold text-white truncate max-w-[130px]">
              {d.isHome ? 'Hjemme mot' : 'Borte mot'} {d.fullOpponent}
            </div>
            <span
              className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                d.result === 'W'
                  ? 'bg-emerald-500 text-slate-950'
                  : d.result === 'D'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-rose-500 text-white'
              }`}
            >
              {d.result === 'W' ? 'Seier' : d.result === 'D' ? 'Uavgjort' : 'Tap'} {d.score}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="text-slate-400 text-[11px]">Kampkarakter:</span>
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${getRatingColor(d.rating)}`}>
              ★ {d.rating.toFixed(1)}
            </span>
          </div>

          {d.goals > 0 && (
            <div className="mt-1 text-[11px] text-amber-300 font-bold flex items-center gap-1">
              <span>⚽</span> {d.goals} mål i kampen
            </div>
          )}

          {d.highlight && (
            <div className="mt-1 text-[10px] text-slate-400 italic truncate">
              {d.highlight}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Top Header & Player Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#165094] flex items-center justify-center font-bold">
              <Activity className="w-4 h-4 text-[#165094]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                <span>Ratingutvikling (Siste 5 kamper)</span>
                <span className="text-[10px] bg-blue-100 text-[#165094] font-bold px-1.5 py-0.2 rounded-md uppercase">
                  Recharts
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Visuell Sofascore-ratingkurve basert på mål, målsjanser, kort og kampbørs
              </p>
            </div>
          </div>
        </div>

        {/* Player Selector Dropdown */}
        <div className="relative min-w-[200px] sm:w-64">
          <select
            value={selectedName}
            onChange={(e) => setSelectedName(e.target.value)}
            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-3 py-2 pr-8 focus:ring-2 focus:ring-[#165094] focus:outline-hidden appearance-none cursor-pointer shadow-2xs"
          >
            {candidatePlayers.slice(0, 40).map((p) => (
              <option key={`picker-${p.name}-${p.teamId}`} value={p.name}>
                {p.name} ({p.teamName.replace('Bønes ', '')})
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
            ▼
          </div>
        </div>
      </div>

      {/* Quick Player Summary Badge & Key Metrics */}
      {activeCandidate && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 text-[10px] font-semibold block">Spiller:</span>
            <button
              onClick={() => onSelectPlayer?.(activeCandidate.name, activeCandidate.teamId)}
              className="font-bold text-slate-900 hover:text-[#165094] transition-colors truncate block text-left cursor-pointer"
              title="Åpne spillerprofil"
            >
              {activeCandidate.name} →
            </button>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] font-semibold block">Siste rating:</span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className={`text-xs font-black px-2 py-0.5 rounded-md ${getRatingColor(statsSummary.latest)}`}>
                ★ {statsSummary.latest.toFixed(1)}
              </span>
              {statsSummary.trend > 0 ? (
                <span className="text-emerald-700 font-bold text-[10px] flex items-center">
                  <TrendingUp className="w-3 h-3 inline mr-0.5" />+{statsSummary.trend}
                </span>
              ) : statsSummary.trend < 0 ? (
                <span className="text-rose-600 font-bold text-[10px] flex items-center">
                  <TrendingDown className="w-3 h-3 inline mr-0.5" />{statsSummary.trend}
                </span>
              ) : null}
            </div>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] font-semibold block">5-kamp snitt:</span>
            <span className="font-black text-slate-900 font-mono text-sm block mt-0.5">
              {statsSummary.avg.toFixed(2)} ★
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] font-semibold block">Toppnotering:</span>
            <span className="font-bold text-emerald-800 text-xs block truncate mt-0.5">
              {statsSummary.peak.toFixed(1)} <span className="text-slate-400 text-[10px]">vs {statsSummary.peakOpp || 'kamp'}</span>
            </span>
          </div>
        </div>
      )}

      {/* Main SVG Rating Graph */}
      <div className="w-full pt-2 relative select-none">
        {chartData.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <User className="w-6 h-6 text-slate-300 mb-1" />
            <span>Ingen spilte kamper registrert for {selectedName} ennå</span>
          </div>
        ) : (
          (() => {
            const svgWidth = 600;
            const svgHeight = 220;
            const chartMargin = { top: 15, right: 35, bottom: 35, left: 35 };
            const innerW = svgWidth - chartMargin.left - chartMargin.right;
            const innerH = svgHeight - chartMargin.top - chartMargin.bottom;

            const n = chartData.length;
            const getX = (idx: number) => {
              if (n === 1) return chartMargin.left + innerW / 2;
              return chartMargin.left + (idx / (n - 1)) * innerW;
            };

            const yScale = d3
              .scaleLinear()
              .domain([5.0, 10.0])
              .range([svgHeight - chartMargin.bottom, chartMargin.top]);

            const areaGen = d3
              .area<typeof chartData[0]>()
              .x((_, idx) => getX(idx))
              .y0(svgHeight - chartMargin.bottom)
              .y1((d) => yScale(d.rating))
              .curve(d3.curveMonotoneX);

            const lineGen = d3
              .line<typeof chartData[0]>()
              .x((_, idx) => getX(idx))
              .y((d) => yScale(d.rating))
              .curve(d3.curveMonotoneX);

            const areaPath = areaGen(chartData) || '';
            const linePath = lineGen(chartData) || '';

            const yTicks = [5.5, 6.5, 7.5, 8.5, 9.5];
            const avgY = yScale(statsSummary.avg);

            return (
              <div className="h-56 w-full relative">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-full overflow-visible"
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <defs>
                    <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#165094" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#165094" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  {yTicks.map((tickVal) => {
                    const yPos = yScale(tickVal);
                    return (
                      <g key={`ygrid-${tickVal}`}>
                        <line
                          x1={chartMargin.left}
                          x2={svgWidth - chartMargin.right}
                          y1={yPos}
                          y2={yPos}
                          stroke="#f1f5f9"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={chartMargin.left - 6}
                          y={yPos + 3}
                          textAnchor="end"
                          fontSize="10"
                          fill="#94a3b8"
                          fontFamily="monospace"
                        >
                          {tickVal.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Average Reference Line */}
                  <line
                    x1={chartMargin.left}
                    x2={svgWidth - chartMargin.right}
                    y1={avgY}
                    y2={avgY}
                    stroke="#94a3b8"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />
                  <text
                    x={svgWidth - chartMargin.right}
                    y={avgY - 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="system-ui, sans-serif"
                  >
                    Snitt {statsSummary.avg.toFixed(1)}
                  </text>

                  {/* X Axis Labels */}
                  {chartData.map((d, idx) => {
                    const xPos = getX(idx);
                    return (
                      <g key={`xaxis-${idx}`}>
                        <text
                          x={xPos}
                          y={svgHeight - chartMargin.bottom + 18}
                          textAnchor="middle"
                          fontSize="11"
                          fill="#475569"
                          fontWeight="600"
                          fontFamily="system-ui, sans-serif"
                        >
                          {d.opponent}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area */}
                  {areaPath && <path d={areaPath} fill="url(#ratingGradient)" stroke="none" />}

                  {/* Line */}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#165094"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Interactive Points */}
                  {chartData.map((d, idx) => {
                    const xPos = getX(idx);
                    const yPos = yScale(d.rating);
                    const isHovered = hoveredPoint?.matchIndex === d.matchIndex;

                    return (
                      <g
                        key={`pt-${idx}`}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPoint(d)}
                      >
                        {isHovered && (
                          <circle
                            cx={xPos}
                            cy={yPos}
                            r={14}
                            fill="#0284c7"
                            fillOpacity={0.25}
                            className="animate-pulse"
                          />
                        )}
                        <circle
                          cx={xPos}
                          cy={yPos}
                          r={isHovered ? 6.5 : 4.5}
                          fill={isHovered ? '#0284c7' : '#165094'}
                          stroke="#ffffff"
                          strokeWidth={2}
                          className="transition-all duration-150"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Tooltip */}
                {hoveredPoint && (
                  <div className="absolute top-2 right-4 z-30 pointer-events-none">
                    <CustomTooltip active={true} payload={[{ payload: hoveredPoint }]} />
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>

      {/* Match-by-match quick dots beneath chart */}
      {chartData.length > 0 && (
        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 flex-wrap gap-1">
          <div className="flex items-center space-x-1">
            <span className="text-slate-400 font-medium">Resultater:</span>
            {chartData.map((m, idx) => (
              <span
                key={`dot-${idx}`}
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black ${
                  m.result === 'W'
                    ? 'bg-emerald-100 text-emerald-800'
                    : m.result === 'D'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
                title={`Kamp #${idx + 1}: ${m.result} vs ${m.fullOpponent} (${m.score}) - Rating: ${m.rating}`}
              >
                {m.result}
              </span>
            ))}
          </div>

          <div className="text-[10px] text-slate-400">
            Hold musepekeren eller trykk på punktene for kampdetaljer
          </div>
        </div>
      )}
    </div>
  );
};
