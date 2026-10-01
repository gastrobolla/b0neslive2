import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { BonesClubData, Match, DivisionTable, Team } from '../types.js';
import {
  BarChart2,
  TrendingUp,
  Shield,
  ShieldAlert,
  Flame,
  Layers,
  ChevronDown,
  ChevronUp,
  Trophy,
  Activity,
  CheckCircle2,
  SlidersHorizontal,
  Info,
} from 'lucide-react';

interface ClubGoalsD3WidgetProps {
  data: BonesClubData;
  onSelectTeam?: (teamId: string) => void;
  defaultExpanded?: boolean;
}

interface TeamGoalData {
  teamId: string;
  teamName: string;
  shortName: string;
  category: 'senior' | 'gutter' | 'jenter' | 'annen';
  categoryLabel: string;
  played: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  ratio: number;
  avgScored: number;
  avgConceded: number;
  standingRank?: number;
}

export interface ChartItem {
  key: string;
  label: string;
  shortLabel: string;
  subLabel: string;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  played: number;
  avgScored: number;
  avgConceded: number;
}

export const ClubGoalsD3Widget: React.FC<ClubGoalsD3WidgetProps> = ({
  data,
  onSelectTeam,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [viewMode, setViewMode] = useState<'teams' | 'categories' | 'diff'>('teams');
  const [sortBy, setSortBy] = useState<'goals' | 'diff' | 'conceded' | 'alpha'>('goals');
  const [hoveredItem, setHoveredItem] = useState<{
    label: string;
    subLabel: string;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    played: number;
    avgScored: number;
    avgConceded: number;
    category?: string;
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(640);

  // ResizeObserver for responsive D3 drawing
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute goal stats per Bønes team from tables & matches
  const teamGoalStats = useMemo<TeamGoalData[]>(() => {
    const teams = data.teams || [];
    const tablesList: DivisionTable[] = Array.isArray(data.tables)
      ? data.tables
      : data.tables && typeof data.tables === 'object'
      ? Object.values(data.tables)
      : [];
    const matches = data.matches || [];

    // Helper to determine category
    const getCat = (tName: string, tCat?: string): { cat: 'senior' | 'gutter' | 'jenter' | 'annen'; label: string } => {
      const lower = tName.toLowerCase();
      const catLower = (tCat || '').toLowerCase();
      if (lower.includes('damer') || lower.includes('kvinner') || catLower.includes('damer') || catLower.includes('kvinner')) {
        return { cat: 'senior', label: 'Senior Damer' };
      }
      if (lower.includes('menn') || catLower.includes('menn') || catLower.includes('senior')) {
        return { cat: 'senior', label: 'Senior Herrer' };
      }
      if (lower.includes('j') || catLower.includes('jenter')) {
        return { cat: 'jenter', label: 'Jenter Ungdom' };
      }
      if (lower.includes('g') || catLower.includes('gutter')) {
        return { cat: 'gutter', label: 'Gutter Ungdom' };
      }
      return { cat: 'annen', label: 'Bønes IL' };
    };

    const results: TeamGoalData[] = [];

    for (const team of teams) {
      const { cat, label } = getCat(team.name, team.category);
      let goalsFor = 0;
      let goalsAgainst = 0;
      let played = 0;
      let standingRank: number | undefined = undefined;

      // 1. Try finding official table entry (by direct key or array search)
      const directTable = (!Array.isArray(data.tables) && data.tables)
        ? (data.tables[team.id] || data.tables[`${team.id}_host`] || data.tables[`${team.id}_var`])
        : undefined;

      const table = directTable || tablesList.find((t) => t.teamId === team.id || t.teamId === `${team.id}_host` || t.teamId === `${team.id}_var`);

      if (table && table.rows) {
        const bonesRow = table.rows.find(
          (r) => r.isBones || r.teamName.toLowerCase().includes('bønes') || r.teamName.toLowerCase().includes('bones')
        );
        if (bonesRow) {
          goalsFor = bonesRow.goalsFor;
          goalsAgainst = bonesRow.goalsAgainst;
          played = bonesRow.played;
          standingRank = bonesRow.rank;
        }
      }

      // 2. Reconcile with matches if table has 0 or missing
      if (played === 0) {
        const teamMatches = matches.filter(
          (m) =>
            m.teamId === team.id &&
            (m.status === 'finished' || m.status === 'live') &&
            m.homeScore !== null &&
            m.homeScore !== undefined &&
            m.awayScore !== null &&
            m.awayScore !== undefined
        );

        for (const m of teamMatches) {
          const isHome = m.isHome || (m.homeTeam || '').toLowerCase().includes('bønes');
          const scored = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
          const conceded = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
          goalsFor += scored;
          goalsAgainst += conceded;
          played++;
        }
      }

      // Format short name for chart labels (e.g. "Gutter 14-1" -> "G14-1", "Menn 1" -> "Menn 1")
      let short = team.name
        .replace(/Bønes\s*/i, '')
        .replace(/Gutter\s*/i, 'G')
        .replace(/Jenter\s*/i, 'J')
        .trim();
      if (!short) short = team.name;

      const goalDiff = goalsFor - goalsAgainst;
      const ratio = goalsAgainst > 0 ? parseFloat((goalsFor / goalsAgainst).toFixed(2)) : goalsFor;
      const avgScored = played > 0 ? parseFloat((goalsFor / played).toFixed(1)) : 0;
      const avgConceded = played > 0 ? parseFloat((goalsAgainst / played).toFixed(1)) : 0;

      results.push({
        teamId: team.id,
        teamName: team.name,
        shortName: short,
        category: cat,
        categoryLabel: label,
        played,
        goalsFor,
        goalsAgainst,
        goalDiff,
        ratio,
        avgScored,
        avgConceded,
        standingRank,
      });
    }

    return results;
  }, [data.teams, data.tables, data.matches]);

  // Club Overall Totals
  const clubTotals = useMemo(() => {
    const totalGoalsFor = teamGoalStats.reduce((acc, t) => acc + t.goalsFor, 0);
    const totalGoalsAgainst = teamGoalStats.reduce((acc, t) => acc + t.goalsAgainst, 0);
    const totalGoalDiff = totalGoalsFor - totalGoalsAgainst;
    const totalPlayed = teamGoalStats.reduce((acc, t) => acc + t.played, 0);
    const avgScoredPerMatch = totalPlayed > 0 ? parseFloat((totalGoalsFor / totalPlayed).toFixed(1)) : 0;
    const avgConcededPerMatch = totalPlayed > 0 ? parseFloat((totalGoalsAgainst / totalPlayed).toFixed(1)) : 0;

    const topScorerTeam = [...teamGoalStats].sort((a, b) => b.goalsFor - a.goalsFor)[0];
    const bestDefenseTeam = [...teamGoalStats]
      .filter((t) => t.played >= 3)
      .sort((a, b) => a.avgConceded - b.avgConceded)[0];

    return {
      totalGoalsFor,
      totalGoalsAgainst,
      totalGoalDiff,
      totalPlayed,
      avgScoredPerMatch,
      avgConcededPerMatch,
      topScorerTeam,
      bestDefenseTeam,
    };
  }, [teamGoalStats]);

  // Aggregated data by category for category view mode
  const categoryStats = useMemo(() => {
    const map = new Map<
      string,
      { label: string; goalsFor: number; goalsAgainst: number; goalDiff: number; played: number }
    >();

    const categories: Array<{ id: 'senior' | 'gutter' | 'jenter'; label: string }> = [
      { id: 'senior', label: 'Senior (Herrer & Damer)' },
      { id: 'gutter', label: 'Gutter (Ungdom & Barn)' },
      { id: 'jenter', label: 'Jenter (Ungdom & Barn)' },
    ];

    categories.forEach((c) => {
      map.set(c.id, { label: c.label, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, played: 0 });
    });

    teamGoalStats.forEach((t) => {
      const target = map.get(t.category);
      if (target) {
        target.goalsFor += t.goalsFor;
        target.goalsAgainst += t.goalsAgainst;
        target.goalDiff += t.goalDiff;
        target.played += t.played;
      }
    });

    return categories.map((c) => {
      const st = map.get(c.id)!;
      return {
        id: c.id,
        label: c.label,
        goalsFor: st.goalsFor,
        goalsAgainst: st.goalsAgainst,
        goalDiff: st.goalDiff,
        played: st.played,
        avgScored: st.played > 0 ? parseFloat((st.goalsFor / st.played).toFixed(1)) : 0,
        avgConceded: st.played > 0 ? parseFloat((st.goalsAgainst / st.played).toFixed(1)) : 0,
      };
    });
  }, [teamGoalStats]);

  // Active chart items according to view mode and sorting
  const chartItems = useMemo<ChartItem[]>(() => {
    if (viewMode === 'categories') {
      return categoryStats.map((c) => ({
        key: c.id,
        label: c.label,
        shortLabel: c.id === 'senior' ? 'Senior' : c.id === 'gutter' ? 'Gutter' : 'Jenter',
        subLabel: `${c.played} kamper totalt`,
        goalsFor: c.goalsFor,
        goalsAgainst: c.goalsAgainst,
        goalDiff: c.goalDiff,
        played: c.played,
        avgScored: c.avgScored,
        avgConceded: c.avgConceded,
      }));
    }

    // Teams mode
    let list = [...teamGoalStats];
    if (sortBy === 'goals') {
      list.sort((a, b) => b.goalsFor - a.goalsFor);
    } else if (sortBy === 'diff') {
      list.sort((a, b) => b.goalDiff - a.goalDiff);
    } else if (sortBy === 'conceded') {
      list.sort((a, b) => a.goalsAgainst - b.goalsAgainst);
    } else {
      list.sort((a, b) => a.shortName.localeCompare(b.shortName));
    }

    return list.map((t) => ({
      key: t.teamId,
      label: t.teamName,
      shortLabel: t.shortName,
      subLabel: `${t.categoryLabel} • ${t.played} kamper`,
      goalsFor: t.goalsFor,
      goalsAgainst: t.goalsAgainst,
      goalDiff: t.goalDiff,
      played: t.played,
      avgScored: t.avgScored,
      avgConceded: t.avgConceded,
    }));
  }, [viewMode, sortBy, teamGoalStats, categoryStats]);

  // D3 Chart Rendering
  useEffect(() => {
    if (!svgRef.current || !isExpanded || chartItems.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous canvas

    const isSmall = containerWidth < 500;
    const isMobile = containerWidth < 400;
    const margin = {
      top: 30,
      right: isSmall ? 15 : 25,
      bottom: isSmall ? 65 : 55,
      left: isSmall ? 35 : 45,
    };

    const height = isSmall ? 290 : 320;
    const width = containerWidth;
    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);

    if (innerWidth <= 0 || innerHeight <= 0) return;

    // Define gradients
    const defs = svg.append('defs');

    // Scored goals gradient (Bønes Navy to Bright Blue)
    const scoredGrad = defs
      .append('linearGradient')
      .attr('id', 'd3-bar-goals-scored')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    scoredGrad.append('stop').attr('offset', '0%').attr('stop-color', '#2563eb');
    scoredGrad.append('stop').attr('offset', '100%').attr('stop-color', '#165094');

    // Conceded goals gradient (Rose / Crimson)
    const concededGrad = defs
      .append('linearGradient')
      .attr('id', 'd3-bar-goals-conceded')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    concededGrad.append('stop').attr('offset', '0%').attr('stop-color', '#f43f5e');
    concededGrad.append('stop').attr('offset', '100%').attr('stop-color', '#be123c');

    // Positive diff gradient (Emerald)
    const diffPosGrad = defs
      .append('linearGradient')
      .attr('id', 'd3-bar-diff-pos')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    diffPosGrad.append('stop').attr('offset', '0%').attr('stop-color', '#10b981');
    diffPosGrad.append('stop').attr('offset', '100%').attr('stop-color', '#059669');

    // Negative diff gradient (Red)
    const diffNegGrad = defs
      .append('linearGradient')
      .attr('id', 'd3-bar-diff-neg')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    diffNegGrad.append('stop').attr('offset', '0%').attr('stop-color', '#ef4444');
    diffNegGrad.append('stop').attr('offset', '100%').attr('stop-color', '#b91c1c');

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale: Groups per item
    const x0 = d3
      .scaleBand()
      .domain(chartItems.map((d) => d.shortLabel))
      .rangeRound([0, innerWidth])
      .paddingInner(0.24)
      .paddingOuter(0.12);

    if (viewMode === 'diff') {
      // Diverging bar chart for Goal Difference
      const minDiff = Math.min(0, ...chartItems.map((d) => d.goalDiff));
      const maxDiff = Math.max(0, ...chartItems.map((d) => d.goalDiff));
      const absMax = Math.max(Math.abs(minDiff), Math.abs(maxDiff), 5);

      const yDiff = d3
        .scaleLinear()
        .domain([-absMax, absMax])
        .range([innerHeight, 0])
        .nice();

      // Zero baseline line
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yDiff(0))
        .attr('y2', yDiff(0))
        .attr('stroke', '#64748b')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3,3');

      // Gridlines
      const yAxisGrid = d3
        .axisLeft(yDiff)
        .ticks(5)
        .tickSize(-innerWidth)
        .tickFormat(() => '');

      g.append('g')
        .attr('class', 'grid text-slate-200 opacity-60')
        .call(yAxisGrid)
        .selectAll('line')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-dasharray', '2,2');

      // Bars
      g.selectAll('.diff-bar')
        .data(chartItems)
        .enter()
        .append('rect')
        .attr('class', 'diff-bar transition-all cursor-pointer')
        .attr('x', (d: ChartItem) => x0(d.shortLabel) ?? 0)
        .attr('width', x0.bandwidth())
        .attr('y', (d: ChartItem) => (d.goalDiff >= 0 ? yDiff(d.goalDiff) : yDiff(0)))
        .attr('height', (d: ChartItem) => Math.abs(yDiff(d.goalDiff) - yDiff(0)))
        .attr('fill', (d: ChartItem) => (d.goalDiff >= 0 ? 'url(#d3-bar-diff-pos)' : 'url(#d3-bar-diff-neg)'))
        .attr('rx', 3)
        .attr('ry', 3)
        .on('mouseenter', (event: MouseEvent, d: ChartItem) => {
          const [px, py] = d3.pointer(event, containerRef.current);
          setHoveredItem({
            label: d.label,
            subLabel: d.subLabel,
            goalsFor: d.goalsFor,
            goalsAgainst: d.goalsAgainst,
            goalDiff: d.goalDiff,
            played: d.played,
            avgScored: d.avgScored,
            avgConceded: d.avgConceded,
            x: px,
            y: py,
          });
        })
        .on('mouseleave', () => setHoveredItem(null));

      // Labels on bars
      g.selectAll('.diff-label')
        .data(chartItems)
        .enter()
        .append('text')
        .attr('class', 'diff-label text-[10px] font-bold fill-slate-700 pointer-events-none text-anchor-middle')
        .attr('text-anchor', 'middle')
        .attr('x', (d: ChartItem) => (x0(d.shortLabel) ?? 0) + x0.bandwidth() / 2)
        .attr('y', (d: ChartItem) => (d.goalDiff >= 0 ? yDiff(d.goalDiff) - 4 : yDiff(d.goalDiff) + 12))
        .text((d: ChartItem) => (d.goalDiff > 0 ? `+${d.goalDiff}` : `${d.goalDiff}`));

      // Y Axis
      const yAxis = d3.axisLeft(yDiff).ticks(5);
      g.append('g')
        .attr('class', 'y-axis text-slate-500 text-[10px] font-medium')
        .call(yAxis)
        .call((group) => group.select('.domain').attr('stroke', '#cbd5e1'));
    } else {
      // Grouped Side-by-Side Bar Chart (Scored vs Conceded)
      const maxVal = Math.max(
        ...chartItems.map((d) => Math.max(d.goalsFor, d.goalsAgainst)),
        10
      );

      const y = d3
        .scaleLinear()
        .domain([0, Math.ceil(maxVal * 1.15)])
        .range([innerHeight, 0])
        .nice();

      // Sub-scale for the two bars in each group
      const x1 = d3
        .scaleBand()
        .domain(['goalsFor', 'goalsAgainst'])
        .rangeRound([0, x0.bandwidth()])
        .padding(0.08);

      // Light horizontal gridlines
      const yAxisGrid = d3
        .axisLeft(y)
        .ticks(5)
        .tickSize(-innerWidth)
        .tickFormat(() => '');

      g.append('g')
        .attr('class', 'grid')
        .call(yAxisGrid)
        .selectAll('line')
        .attr('stroke', '#e2e8f0')
        .attr('stroke-dasharray', '2,2');

      // Groups for each item
      const itemGroups = g
        .selectAll('.team-group')
        .data(chartItems)
        .enter()
        .append('g')
        .attr('class', 'team-group')
        .attr('transform', (d: ChartItem) => `translate(${x0(d.shortLabel) ?? 0},0)`);

      // 1. Scored Goals Bar (Navy/Blue)
      itemGroups
        .append('rect')
        .attr('class', 'bar-scored cursor-pointer transition-opacity hover:opacity-90')
        .attr('x', x1('goalsFor') ?? 0)
        .attr('y', (d: ChartItem) => y(d.goalsFor))
        .attr('width', x1.bandwidth())
        .attr('height', (d: ChartItem) => Math.max(2, innerHeight - y(d.goalsFor)))
        .attr('fill', 'url(#d3-bar-goals-scored)')
        .attr('rx', 3)
        .attr('ry', 3)
        .on('mouseenter', (event: MouseEvent, d: ChartItem) => {
          const [px, py] = d3.pointer(event, containerRef.current);
          setHoveredItem({
            label: d.label,
            subLabel: d.subLabel,
            goalsFor: d.goalsFor,
            goalsAgainst: d.goalsAgainst,
            goalDiff: d.goalDiff,
            played: d.played,
            avgScored: d.avgScored,
            avgConceded: d.avgConceded,
            x: px,
            y: py,
          });
        })
        .on('mouseleave', () => setHoveredItem(null));

      // 2. Conceded Goals Bar (Rose/Red)
      itemGroups
        .append('rect')
        .attr('class', 'bar-conceded cursor-pointer transition-opacity hover:opacity-90')
        .attr('x', x1('goalsAgainst') ?? 0)
        .attr('y', (d: ChartItem) => y(d.goalsAgainst))
        .attr('width', x1.bandwidth())
        .attr('height', (d: ChartItem) => Math.max(2, innerHeight - y(d.goalsAgainst)))
        .attr('fill', 'url(#d3-bar-goals-conceded)')
        .attr('rx', 3)
        .attr('ry', 3)
        .on('mouseenter', (event: MouseEvent, d: ChartItem) => {
          const [px, py] = d3.pointer(event, containerRef.current);
          setHoveredItem({
            label: d.label,
            subLabel: d.subLabel,
            goalsFor: d.goalsFor,
            goalsAgainst: d.goalsAgainst,
            goalDiff: d.goalDiff,
            played: d.played,
            avgScored: d.avgScored,
            avgConceded: d.avgConceded,
            x: px,
            y: py,
          });
        })
        .on('mouseleave', () => setHoveredItem(null));

      // Value annotations on top of bars if space permits
      if (!isMobile) {
        itemGroups
          .append('text')
          .attr('class', 'text-[9px] font-bold fill-blue-900 pointer-events-none')
          .attr('text-anchor', 'middle')
          .attr('x', (x1('goalsFor') ?? 0) + x1.bandwidth() / 2)
          .attr('y', (d: ChartItem) => y(d.goalsFor) - 3)
          .text((d: ChartItem) => (d.goalsFor > 0 ? d.goalsFor : ''));

        itemGroups
          .append('text')
          .attr('class', 'text-[9px] font-bold fill-rose-800 pointer-events-none')
          .attr('text-anchor', 'middle')
          .attr('x', (x1('goalsAgainst') ?? 0) + x1.bandwidth() / 2)
          .attr('y', (d: ChartItem) => y(d.goalsAgainst) - 3)
          .text((d: ChartItem) => (d.goalsAgainst > 0 ? d.goalsAgainst : ''));
      }

      // Y Axis
      const yAxis = d3.axisLeft(y).ticks(5);
      g.append('g')
        .attr('class', 'y-axis text-slate-500 text-[10px] font-medium')
        .call(yAxis)
        .call((group) => group.select('.domain').attr('stroke', '#cbd5e1'));
    }

    // X Axis with label rotation if many items
    const xAxis = d3.axisBottom(x0);
    const xAxisGroup = g
      .append('g')
      .attr('class', 'x-axis text-slate-600 text-[10px] font-bold')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis);

    xAxisGroup.select('.domain').attr('stroke', '#cbd5e1');

    if (chartItems.length > 5 || isSmall) {
      xAxisGroup
        .selectAll('text')
        .attr('transform', 'rotate(-32)')
        .attr('text-anchor', 'end')
        .attr('dx', '-4px')
        .attr('dy', '4px')
        .attr('class', 'text-[10px] font-semibold text-slate-700 cursor-pointer');
    }
  }, [containerWidth, chartItems, viewMode, isExpanded]);

  return (
    <div
      id="club-goals-d3-widget"
      className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all"
    >
      {/* Header bar with Summary and Collapse Toggle */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-[#165094] to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 shrink-0">
            <BarChart2 className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                Klubbens Målstatistikk 2026
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 font-semibold uppercase tracking-wider">
                D3.js
              </span>
            </div>
            <p className="text-xs text-blue-100/90 font-medium">
              Samlet oversikt over målscore og baklengsmål på tvers av Bønes-lagene
            </p>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center space-x-2 self-end sm:self-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition-colors cursor-pointer border border-white/20"
          >
            <span>{isExpanded ? 'Skjul graf' : 'Vis graf'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-50/80 border-b border-slate-200">
        {/* 1. Scorede mål */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-blue-600" />
              Scorede mål
            </span>
            <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded-full">
              Bønes
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {clubTotals.totalGoalsFor}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Snitt {clubTotals.avgScoredPerMatch} mål / kamp
          </div>
        </div>

        {/* 2. Innslepne mål */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              Innslepne mål
            </span>
            <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded-full">
              Baklengs
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {clubTotals.totalGoalsAgainst}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Snitt {clubTotals.avgConcededPerMatch} mål / kamp
          </div>
        </div>

        {/* 3. Målforskjell */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              Målforskjell
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                clubTotals.totalGoalDiff >= 0
                  ? 'text-emerald-700 bg-emerald-50'
                  : 'text-rose-700 bg-rose-50'
              }`}
            >
              Netto
            </span>
          </div>
          <div
            className={`text-xl sm:text-2xl font-black tracking-tight ${
              clubTotals.totalGoalDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {clubTotals.totalGoalDiff > 0 ? `+${clubTotals.totalGoalDiff}` : clubTotals.totalGoalDiff}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            {clubTotals.totalPlayed} kamper registrert
          </div>
        </div>

        {/* 4. Toppscorerlag */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span className="flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              Mestscorende lag
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-full">
              Topp
            </span>
          </div>
          <div className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate">
            {clubTotals.topScorerTeam ? clubTotals.topScorerTeam.shortName : 'Bønes'}
          </div>
          <div className="text-[11px] text-amber-700 font-bold mt-0.5 flex items-center gap-1">
            <span>{clubTotals.topScorerTeam?.goalsFor || 0} mål scoret</span>
            <span className="text-slate-400 font-normal">({clubTotals.topScorerTeam?.played || 0} k)</span>
          </div>
        </div>
      </div>

      {/* Main Chart Body (Collapsible) */}
      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-3.5">
          {/* Controls Bar: View Modes & Sort Options */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
            {/* View Mode Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[11px] font-bold text-slate-500 mr-1 hidden sm:inline">Visning:</span>
              <button
                onClick={() => setViewMode('teams')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'teams'
                    ? 'bg-[#165094] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Per Bønes-lag
              </button>
              <button
                onClick={() => setViewMode('categories')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'categories'
                    ? 'bg-[#165094] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Kategorier
              </button>
              <button
                onClick={() => setViewMode('diff')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'diff'
                    ? 'bg-[#165094] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Netto målforskjell
              </button>
            </div>

            {/* Sortering & Legend */}
            <div className="flex items-center justify-between sm:justify-end space-x-3 text-xs">
              {viewMode !== 'categories' && (
                <div className="flex items-center space-x-1.5 text-slate-500">
                  <span className="text-[11px] font-semibold">Sorter:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-1 px-2 rounded-lg border-0 cursor-pointer focus:ring-1 focus:ring-[#165094]"
                  >
                    <option value="goals">Flest scoret</option>
                    <option value="diff">Målforskjell</option>
                    <option value="conceded">Færrest baklengs</option>
                    <option value="alpha">Alfabetisk</option>
                  </select>
                </div>
              )}

              {/* Chart Legend */}
              <div className="flex items-center space-x-2 text-[11px] font-bold">
                {viewMode === 'diff' ? (
                  <>
                    <span className="flex items-center gap-1 text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Plussmål
                    </span>
                    <span className="flex items-center gap-1 text-rose-700">
                      <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span> Minusmål
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1 text-[#165094]">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-600"></span> Scoret
                    </span>
                    <span className="flex items-center gap-1 text-rose-600">
                      <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span> Baklengs
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* D3 Canvas Container */}
          <div ref={containerRef} className="relative w-full overflow-hidden">
            <svg
              ref={svgRef}
              className="w-full h-auto block select-none"
              style={{ minHeight: '270px' }}
            ></svg>

            {/* Hover Tooltip Popup */}
            {hoveredItem && (
              <div
                className="absolute z-20 pointer-events-none bg-slate-950/95 text-white p-2.5 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1 transform -translate-x-1/2 -translate-y-full"
                style={{
                  left: `${Math.max(80, Math.min(containerWidth - 80, hoveredItem.x))}px`,
                  top: `${Math.max(10, hoveredItem.y - 12)}px`,
                }}
              >
                <div className="font-bold text-white flex items-center justify-between gap-3">
                  <span>{hoveredItem.label}</span>
                  <span className="text-[10px] text-blue-300 font-mono">
                    {hoveredItem.played} kamper
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {hoveredItem.subLabel}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-1 text-[11px] border-t border-slate-800">
                  <div className="text-blue-300">
                    Scoret: <span className="font-bold text-white">{hoveredItem.goalsFor}</span>
                  </div>
                  <div className="text-rose-300">
                    Baklengs: <span className="font-bold text-white">{hoveredItem.goalsAgainst}</span>
                  </div>
                  <div className="text-emerald-300">
                    Diff:{' '}
                    <span className="font-bold text-white">
                      {hoveredItem.goalDiff > 0 ? `+${hoveredItem.goalDiff}` : hoveredItem.goalDiff}
                    </span>
                  </div>
                  <div className="text-amber-300">
                    Snitt: <span className="font-bold text-white">{hoveredItem.avgScored} / kamp</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              Tallene er aggregerte fra offisielle NFF-serietabeller og spilte kamper for sesongen 2026.
            </span>
            <span className="text-slate-400">
              Hold pekeren over søylene for detaljert kampsnitt.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
