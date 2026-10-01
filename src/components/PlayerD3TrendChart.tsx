import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { BonesClubData, Player } from '../types.js';
import { buildPlayerProfile } from '../utils/playerHistory.js';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Star,
  Award,
  Sparkles,
  Calendar,
  Layers,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface PlayerD3TrendChartProps {
  data: BonesClubData;
  initialPlayerName?: string;
  selectedTeamId?: string;
  onSelectPlayer?: (name: string, teamId?: string) => void;
}

interface MatchPointData {
  index: number;
  id: string;
  date: string;
  formattedDate: string;
  opponent: string;
  opponentShort: string;
  rating: number;
  score: string;
  result: 'W' | 'D' | 'L';
  goals: number;
  highlight?: string;
  isHome: boolean;
  teamName?: string;
}

export const PlayerD3TrendChart: React.FC<PlayerD3TrendChartProps> = ({
  data,
  initialPlayerName,
  selectedTeamId = 'all',
  onSelectPlayer,
}) => {
  // Available players sorted by activity (goals / matches)
  const candidatePlayers = useMemo(() => {
    const list =
      selectedTeamId === 'all'
        ? data.players
        : data.players.filter((p) => p.teamId === selectedTeamId);

    // Remove duplicate names and sort
    const uniqueMap = new Map<string, Player>();
    for (const p of list) {
      const key = p.name.trim().toLowerCase();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, p);
      }
    }

    return Array.from(uniqueMap.values()).sort(
      (a, b) =>
        (b.goals || 0) - (a.goals || 0) || (b.matches || 0) - (a.matches || 0)
    );
  }, [data.players, selectedTeamId]);

  // Selected player name
  const [selectedName, setSelectedName] = useState<string>(() => {
    if (initialPlayerName) return initialPlayerName;
    return candidatePlayers.length > 0 ? candidatePlayers[0].name : 'Sunniva Stavrum';
  });

  // Time range filter (5, 10, or all)
  const [matchLimit, setMatchLimit] = useState<number | 'all'>(5);

  // Sync when initialPlayerName prop changes
  useEffect(() => {
    if (initialPlayerName) {
      setSelectedName(initialPlayerName);
    }
  }, [initialPlayerName]);

  // Find candidate object
  const activeCandidate = useMemo(() => {
    return (
      candidatePlayers.find(
        (p) => p.name.toLowerCase() === selectedName.toLowerCase()
      ) || candidatePlayers[0]
    );
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

  // Extract matches in chronological order for D3 rendering
  const chartData = useMemo<MatchPointData[]>(() => {
    if (
      !playerProfile ||
      !playerProfile.matchHistory ||
      playerProfile.matchHistory.length === 0
    ) {
      return [];
    }

    // playerProfile.matchHistory is sorted latest first.
    let sliced = [...playerProfile.matchHistory];
    if (matchLimit !== 'all') {
      sliced = sliced.slice(0, matchLimit);
    }

    // Reverse to chronological order (left to right)
    const chronological = sliced.reverse();

    return chronological.map((m, idx) => {
      let formattedDate = m.date;
      try {
        const d = new Date(m.date);
        formattedDate = d.toLocaleDateString('no-NO', {
          day: 'numeric',
          month: 'short',
        });
      } catch {
        // keep raw
      }

      const oppShort = m.opponent
        .replace(/\s*(IL|Fotball|FK|SK|Turn|og Idrettslag)\s*/gi, '')
        .trim();

      return {
        index: idx,
        id: m.id,
        date: m.date,
        formattedDate,
        opponent: m.opponent,
        opponentShort: oppShort,
        rating: parseFloat(m.rating.toFixed(2)),
        score: m.score,
        result: m.result,
        goals: m.goals,
        highlight: m.highlight,
        isHome: m.isHome,
        teamName: m.teamName,
      };
    });
  }, [playerProfile, matchLimit]);

  // State for hovered point in D3
  const [hoveredPoint, setHoveredPoint] = useState<MatchPointData | null>(null);

  // SVG and container refs
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(650);

  // Observe container resize for responsive D3 rendering
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Summary statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return {
        avgRating: 0,
        latestRating: 0,
        maxRating: 0,
        diff: 0,
        isTrendingUp: true,
      };
    }

    const ratings = chartData.map((d) => d.rating);
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const latest = ratings[ratings.length - 1];
    const prev = ratings.length > 1 ? ratings[ratings.length - 2] : latest;
    const diff = latest - prev;
    const max = Math.max(...ratings);

    return {
      avgRating: parseFloat(avg.toFixed(2)),
      latestRating: latest,
      maxRating: max,
      diff: parseFloat(diff.toFixed(2)),
      isTrendingUp: diff >= 0,
    };
  }, [chartData]);

  // Set default hovered point to the latest match
  useEffect(() => {
    if (chartData.length > 0) {
      setHoveredPoint(chartData[chartData.length - 1]);
    } else {
      setHoveredPoint(null);
    }
  }, [chartData]);

  // D3 Chart Rendering
  useEffect(() => {
    if (!svgRef.current || chartData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const width = containerWidth;
    const height = 280;
    const margin = { top: 25, right: 35, bottom: 45, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    if (innerWidth <= 0 || innerHeight <= 0) return;

    // Create defs for gradients and shadow filters
    const defs = svg.append('defs');

    // Area Gradient
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'd3-rating-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#165094')
      .attr('stop-opacity', 0.35);

    gradient
      .append('stop')
      .attr('offset', '70%')
      .attr('stop-color', '#165094')
      .attr('stop-opacity', 0.08);

    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#165094')
      .attr('stop-opacity', 0.0);

    // Drop shadow filter for points
    const filter = defs
      .append('filter')
      .attr('id', 'd3-glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    filter
      .append('feDropShadow')
      .attr('dx', '0')
      .attr('dy', '2')
      .attr('stdDeviation', '3')
      .attr('flood-color', '#165094')
      .attr('flood-opacity', '0.25');

    // Main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const minRating = Math.min(...chartData.map((d) => d.rating));
    const maxRating = Math.max(...chartData.map((d) => d.rating));
    const yDomainMin = Math.max(5.0, Math.floor((minRating - 0.6) * 2) / 2);
    const yDomainMax = Math.min(10.0, Math.ceil((maxRating + 0.6) * 2) / 2);

    const xScale = d3
      .scalePoint<number>()
      .domain(chartData.map((d) => d.index))
      .range([0, innerWidth])
      .padding(0.2);

    const yScale = d3
      .scaleLinear()
      .domain([yDomainMin, yDomainMax])
      .range([innerHeight, 0])
      .nice();

    // D3 Generators
    const areaGenerator = d3
      .area<MatchPointData>()
      .x((d) => xScale(d.index) ?? 0)
      .y0(innerHeight)
      .y1((d) => yScale(d.rating))
      .curve(d3.curveMonotoneX);

    const lineGenerator = d3
      .line<MatchPointData>()
      .x((d) => xScale(d.index) ?? 0)
      .y((d) => yScale(d.rating))
      .curve(d3.curveMonotoneX);

    // Horizontal Grid Lines
    const yTicks = yScale.ticks(5);
    g.append('g')
      .attr('class', 'grid-lines')
      .selectAll('line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#E2E8F0')
      .attr('stroke-dasharray', '3 3')
      .attr('stroke-width', 1);

    // Average line (Snittlinje)
    if (stats.avgRating > 0) {
      const avgY = yScale(stats.avgRating);
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', avgY)
        .attr('y2', avgY)
        .attr('stroke', '#165094')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '5 4')
        .attr('opacity', 0.65);

      // Label on right edge
      g.append('rect')
        .attr('x', innerWidth - 58)
        .attr('y', avgY - 11)
        .attr('width', 58)
        .attr('height', 20)
        .attr('rx', 4)
        .attr('fill', '#165094')
        .attr('opacity', 0.9);

      g.append('text')
        .attr('x', innerWidth - 29)
        .attr('y', avgY + 3)
        .attr('text-anchor', 'middle')
        .attr('fill', '#FFFFFF')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text(`Snitt ${stats.avgRating}`);
    }

    // Render Area
    g.append('path')
      .datum(chartData)
      .attr('fill', 'url(#d3-rating-area-gradient)')
      .attr('d', areaGenerator);

    // Render Line
    g.append('path')
      .datum(chartData)
      .attr('fill', 'none')
      .attr('stroke', '#165094')
      .attr('stroke-width', 3)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', lineGenerator);

    // Render Nodes (Points)
    const pointsGroup = g.append('g').attr('class', 'points-group');

    chartData.forEach((d) => {
      const cx = xScale(d.index) ?? 0;
      const cy = yScale(d.rating);

      const node = pointsGroup
        .append('g')
        .attr('class', `point-node point-node-${d.index}`)
        .attr('cursor', 'pointer');

      // Result color
      const resultColor =
        d.result === 'W'
          ? '#10B981' // Green
          : d.result === 'D'
          ? '#F59E0B' // Amber
          : '#EF4444'; // Red

      // Outer ring
      node
        .append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', hoveredPoint?.id === d.id ? 8 : 6)
        .attr('fill', '#FFFFFF')
        .attr('stroke', resultColor)
        .attr('stroke-width', hoveredPoint?.id === d.id ? 3 : 2.5)
        .attr('filter', 'url(#d3-glow)')
        .transition()
        .duration(200);

      // Inner dot
      node
        .append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', 3)
        .attr('fill', '#165094');

      // Value label on hover or if latest
      if (hoveredPoint?.id === d.id || d.index === chartData.length - 1) {
        node
          .append('text')
          .attr('cx', cx)
          .attr('cy', cy - 13)
          .attr('x', cx)
          .attr('y', cy - 13)
          .attr('text-anchor', 'middle')
          .attr('fill', '#1E293B')
          .attr('font-size', '11px')
          .attr('font-weight', '800')
          .text(d.rating.toFixed(1));
      }
    });

    // X Axis Labels (Dates & Opponents)
    const xAxisGroup = g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight + 12})`);

    chartData.forEach((d) => {
      const xPos = xScale(d.index) ?? 0;
      const textGroup = xAxisGroup.append('g').attr('transform', `translate(${xPos},0)`);

      // Opponent text
      textGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('fill', '#1E293B')
        .attr('font-size', '11px')
        .attr('font-weight', '700')
        .text(d.opponentShort);

      // Date text
      textGroup
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('y', 15)
        .attr('fill', '#64748B')
        .attr('font-size', '10px')
        .text(d.formattedDate);
    });

    // Y Axis Labels
    const yAxisGroup = g
      .append('g')
      .attr('class', 'y-axis')
      .attr('transform', 'translate(-10,0)');

    yTicks.forEach((tick) => {
      yAxisGroup
        .append('text')
        .attr('x', 0)
        .attr('y', yScale(tick) + 3.5)
        .attr('text-anchor', 'end')
        .attr('fill', '#64748B')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .text(tick.toFixed(1));
    });

    // Interactive Hover Overlay
    const overlay = g
      .append('rect')
      .attr('class', 'overlay')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair');

    // Pointer event handling
    overlay.on('mousemove touchmove', (event) => {
      const [pointerX] = d3.pointer(event);

      // Find nearest point
      let closestPoint = chartData[0];
      let minDistance = Infinity;

      chartData.forEach((d) => {
        const xPos = xScale(d.index) ?? 0;
        const dist = Math.abs(xPos - pointerX);
        if (dist < minDistance) {
          minDistance = dist;
          closestPoint = d;
        }
      });

      if (closestPoint) {
        setHoveredPoint(closestPoint);
      }
    });
  }, [chartData, containerWidth, hoveredPoint?.id, stats.avgRating]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-[#165094] flex items-center justify-center text-white shadow-2xs">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>D3 Formutvikling & Ratingkurve</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-[#165094] border border-blue-200">
                    D3.js Vector
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Sofascore-kalibrert karakterutvikling over tid basert på offisielle kampdata
                </p>
              </div>
            </div>
          </div>

          {/* Controls: Player Dropdown & Match Count Range */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Player Selector */}
            <div className="relative">
              <select
                value={selectedName}
                onChange={(e) => {
                  setSelectedName(e.target.value);
                  if (onSelectPlayer) {
                    const found = candidatePlayers.find((p) => p.name === e.target.value);
                    onSelectPlayer(e.target.value, found?.teamId);
                  }
                }}
                className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 pr-8 shadow-2xs hover:border-[#165094] focus:outline-none focus:ring-2 focus:ring-[#165094]/20 transition-all cursor-pointer"
              >
                {candidatePlayers.map((p) => (
                  <option key={`${p.id}-${p.name}`} value={p.name}>
                    {p.name} ({p.teamName || p.position || 'Spiller'})
                  </option>
                ))}
              </select>
            </div>

            {/* Match Limit Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600">
              <button
                onClick={() => setMatchLimit(5)}
                className={`px-2.5 py-1.5 rounded-md transition-all ${
                  matchLimit === 5
                    ? 'bg-[#165094] text-white shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Siste 5
              </button>
              <button
                onClick={() => setMatchLimit(10)}
                className={`px-2.5 py-1.5 rounded-md transition-all ${
                  matchLimit === 10
                    ? 'bg-[#165094] text-white shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Siste 10
              </button>
              <button
                onClick={() => setMatchLimit('all')}
                className={`px-2.5 py-1.5 rounded-md transition-all ${
                  matchLimit === 'all'
                    ? 'bg-[#165094] text-white shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Sesong
              </button>
            </div>
          </div>
        </div>

        {/* Player KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200/60">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Siste rating</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-xl font-black text-slate-900 font-mono">
                {stats.latestRating > 0 ? stats.latestRating.toFixed(1) : '-'}
              </span>
              <span className="text-xs text-amber-500 font-bold">★</span>
              {stats.diff !== 0 && (
                <span
                  className={`text-[11px] font-bold flex items-center ${
                    stats.isTrendingUp ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {stats.isTrendingUp ? (
                    <TrendingUp className="w-3 h-3 mr-0.5 inline" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-0.5 inline" />
                  )}
                  {stats.diff > 0 ? `+${stats.diff}` : stats.diff}
                </span>
              )}
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Gjennomsnitt</span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-xl font-black text-[#165094] font-mono">
                {stats.avgRating > 0 ? stats.avgRating.toFixed(2) : '-'}
              </span>
              <span className="text-xs text-slate-400">/ 10</span>
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Toppnotering</span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-xl font-black text-emerald-600 font-mono">
                {stats.maxRating > 0 ? stats.maxRating.toFixed(1) : '-'}
              </span>
              <Award className="w-3.5 h-3.5 text-emerald-500" />
            </div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-500 block">Kamper vurdert</span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-xl font-black text-slate-900 font-mono">
                {chartData.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">kamper</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main D3 Graphic Canvas */}
      <div className="p-4 sm:p-5" ref={containerRef}>
        {chartData.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Activity className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
            <p className="text-sm font-semibold text-slate-600">
              Ingen ratede kamper registrert for {selectedName} ennå
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Rating genereres automatisk fra NFF-kamphendelser og startoppstillinger.
            </p>
          </div>
        ) : (
          <div>
            {/* SVG Render Target */}
            <div className="w-full flex justify-center">
              <svg
                ref={svgRef}
                width={containerWidth}
                height={280}
                className="overflow-visible select-none"
              />
            </div>

            {/* Interactive Inspector Card for Selected/Hovered Point */}
            {hoveredPoint && (
              <div className="mt-3 bg-gradient-to-r from-blue-50/60 to-slate-50 p-3.5 rounded-xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm text-white shadow-2xs ${
                      hoveredPoint.result === 'W'
                        ? 'bg-emerald-600'
                        : hoveredPoint.result === 'D'
                        ? 'bg-amber-500'
                        : 'bg-rose-600'
                    }`}
                  >
                    {hoveredPoint.result === 'W'
                      ? 'S'
                      : hoveredPoint.result === 'D'
                      ? 'U'
                      : 'T'}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>vs {hoveredPoint.opponent}</span>
                      <span className="text-slate-400 font-normal">
                        ({hoveredPoint.isHome ? 'Hjemme' : 'Borte'})
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] flex items-center gap-2 mt-0.5">
                      <span>Dato: {hoveredPoint.formattedDate}</span>
                      <span>•</span>
                      <span>Sluttresultat: {hoveredPoint.score}</span>
                      {hoveredPoint.goals > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">
                            ⚽ {hoveredPoint.goals} {hoveredPoint.goals === 1 ? 'mål' : 'mål'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
                      Sofascore Rating
                    </span>
                    <span className="text-lg font-black text-[#165094] font-mono">
                      {hoveredPoint.rating.toFixed(1)} ★
                    </span>
                  </div>

                  {hoveredPoint.highlight && (
                    <div className="max-w-[200px] text-right text-[11px] font-medium text-slate-600 border-l border-slate-200 pl-3 hidden md:block truncate">
                      {hoveredPoint.highlight}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Result timeline indicator bar */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-700">Resultatnøkkel:</span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span className="text-[11px]">Seier</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                  <span className="text-[11px]">Uavgjort</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                  <span className="text-[11px]">Tap</span>
                </span>
              </div>

              <div className="text-[11px] text-slate-400">
                Hold pekeren over et punkt på grafen for å inspisere kampdetaljer
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
