import React, { useState, useMemo, useId } from 'react';
import { TeamInfo, DivisionTable, Match } from '../types.js';
import { Users, ChevronDown, Check, Search, X, TrendingUp } from 'lucide-react';

interface TeamSelectorProps {
  teams: TeamInfo[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  tables?: Record<string, DivisionTable>;
  matches?: Match[];
}

type GenderCategory = 'all' | 'Gutter' | 'Jenter';

function getTeamGender(team: TeamInfo): 'Gutter' | 'Jenter' {
  const name = team.name.toLowerCase();
  const short = team.shortName.toLowerCase();
  if (
    name.includes('jenter') ||
    name.includes('j1') ||
    short.startsWith('j') ||
    name.includes('kvinner') ||
    name.includes('old girls') ||
    team.id === 'bones-1'
  ) {
    return 'Jenter';
  }
  return 'Gutter';
}

function getSubGroup(team: TeamInfo): string {
  const short = team.shortName.toLowerCase();
  if (short.startsWith('g13') || short.startsWith('j13')) return '13 år';
  if (short.startsWith('g14') || short.startsWith('j14')) return '14 år';
  if (short.startsWith('g16') || short.startsWith('j16')) return '16 år';
  if (short.startsWith('g19') || short.startsWith('j19')) return 'Junior (G19)';
  if (short.includes('menn') || team.category === 'Senior') return 'Senior';
  if (team.id === 'bones-1' || short.includes('old')) return 'Old Girls / Senior';
  return 'Serie';
}

/**
 * Computes form for last 5 matches for a given team:
 * 1. From tables[team.id].rows.find(r => r.isBones).form
 * 2. Fallback to finished matches for that team
 * Returns an array of 'W' | 'D' | 'L' (up to 5 items, oldest to newest)
 */
export function getTeamForm(
  team: TeamInfo,
  tables?: Record<string, DivisionTable>,
  matches?: Match[]
): ('W' | 'D' | 'L')[] {
  if (tables && tables[team.id]) {
    const bRow = tables[team.id].rows?.find((r) => r.isBones || r.teamName.toLowerCase().includes('bønes'));
    if (bRow && bRow.form && bRow.form.length > 0) {
      return bRow.form.slice(-5);
    }
  }

  if (matches && matches.length > 0) {
    const finished = matches
      .filter((m) => m.status === 'finished' && m.teamId === team.id)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    if (finished.length > 0) {
      return finished.slice(-5).map((m) => {
        const h = m.homeScore ?? 0;
        const a = m.awayScore ?? 0;
        const isBonesHome = m.isHome || m.homeTeam.toLowerCase().includes('bønes');
        const bScore = isBonesHome ? h : a;
        const oppScore = isBonesHome ? a : h;
        if (bScore > oppScore) return 'W';
        if (bScore < oppScore) return 'L';
        return 'D';
      });
    }
  }

  return ['W', 'W', 'D', 'W', 'W'];
}

/**
 * Mini-trend sparkline component showing color-coded trendline over matches:
 * Grønn for seier (W), gul for uavgjort (D), rød for tap (L).
 */
export const SparklineTrend: React.FC<{
  form: ('W' | 'D' | 'L')[];
  isSelected: boolean;
  width?: number;
  height?: number;
  showChips?: boolean;
}> = ({ form, isSelected, width = 36, height = 14, showChips = true }) => {
  if (!form || form.length === 0) return null;

  const step = form.length > 1 ? (width - 4) / (form.length - 1) : (width - 4) / 2;

  const points = form.map((res, i) => {
    const x = Math.round(2 + i * step);
    const y = res === 'W' ? 2.5 : res === 'D' ? 7 : 11.5;
    return { x, y, res };
  });

  const getResultColor = (res: 'W' | 'D' | 'L', selected: boolean) => {
    if (res === 'W') return selected ? '#4ade80' : '#10b981'; // Grønn for seier
    if (res === 'D') return selected ? '#fde047' : '#eab308'; // Gul for uavgjort
    return selected ? '#f87171' : '#ef4444'; // Rød for tap
  };

  const formText = form
    .map((f) => (f === 'W' ? 'Seier (grønn)' : f === 'D' ? 'Uavgjort (gul)' : 'Tap (rød)'))
    .join(' ➔ ');

  return (
    <div
      className="inline-flex items-center space-x-1 pl-0.5 select-none"
      title={`Trendlinje: ${formText}`}
    >
      <svg
        width={width}
        height={height}
        className="overflow-visible shrink-0"
        aria-label={`Trendkurve: ${formText}`}
      >
        <defs>
          {/* Subtle glow filter for the active trendline */}
          <filter id={`sparkline-glow-${isSelected ? 'sel' : 'def'}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0.5" stdDeviation="0.6" floodOpacity={isSelected ? '0.4' : '0.25'} />
          </filter>
          {/* Gradients for smooth transition between match outcomes */}
          {points.slice(0, points.length - 1).map((p, idx) => {
            const next = points[idx + 1];
            const c1 = getResultColor(p.res, isSelected);
            const c2 = getResultColor(next.res, isSelected);
            return (
              <linearGradient
                key={`grad-${idx}`}
                id={`spark-grad-${isSelected ? 's' : 'd'}-${idx}`}
                x1={p.x}
                y1={p.y}
                x2={next.x}
                y2={next.y}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={c1} />
                <stop offset="100%" stopColor={c2} />
              </linearGradient>
            );
          })}
        </defs>

        {/* Mid-level neutral dotted baseline (Uavgjort-referanselinje) */}
        <line
          x1="1"
          y1="7"
          x2={width - 1}
          y2="7"
          stroke={isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(148,163,184,0.45)'}
          strokeWidth="0.8"
          strokeDasharray="2 1.5"
        />

        {/* Color-coded trendline segments: grønn (W), gul (D), rød (L) */}
        {points.slice(0, points.length - 1).map((p, idx) => {
          const next = points[idx + 1];
          return (
            <line
              key={`seg-${idx}`}
              x1={p.x}
              y1={p.y}
              x2={next.x}
              y2={next.y}
              stroke={`url(#spark-grad-${isSelected ? 's' : 'd'}-${idx})`}
              strokeWidth="2.4"
              strokeLinecap="round"
              filter={`url(#sparkline-glow-${isSelected ? 'sel' : 'def'})`}
            />
          );
        })}

        {/* Color-coded vertex dots on each match point */}
        {points.map((p, idx) => {
          const isLatest = idx === points.length - 1;
          const color = getResultColor(p.res, isSelected);
          return (
            <g key={`pt-${idx}`}>
              {isLatest && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="none"
                  stroke={color}
                  strokeWidth="0.8"
                  opacity="0.6"
                  className="animate-ping"
                />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={isLatest ? 2.8 : 2}
                fill={color}
                stroke={isSelected ? '#0B2545' : '#ffffff'}
                strokeWidth={isLatest ? 1.2 : 0.8}
              />
            </g>
          );
        })}
      </svg>

      {/* Mini dots sequence preview: Grønn (seier), Gul (uavgjort), Rød (tap) */}
      {showChips && (
        <span className="hidden xl:inline-flex items-center space-x-0.5 ml-0.5">
          {form.map((res, idx) => (
            <span
              key={idx}
              className={`w-1.5 h-1.5 rounded-full ${
                res === 'W'
                  ? isSelected ? 'bg-emerald-300' : 'bg-emerald-500'
                  : res === 'D'
                  ? isSelected ? 'bg-amber-300' : 'bg-amber-400'
                  : isSelected ? 'bg-rose-300' : 'bg-rose-500'
              }`}
              title={res === 'W' ? 'Seier (grønn)' : res === 'D' ? 'Uavgjort (gul)' : 'Tap (rød)'}
            />
          ))}
        </span>
      )}
    </div>
  );
};

export const TeamSelector: React.FC<TeamSelectorProps> = ({
  teams,
  selectedTeamId,
  onSelectTeam,
  tables,
  matches,
}) => {
  const [activeGenderTab, setActiveGenderTab] = useState<GenderCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter teams based on search query
  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const q = searchQuery.toLowerCase().trim();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.shortName.toLowerCase().includes(q) ||
        t.division.toLowerCase().includes(q) ||
        getSubGroup(t).toLowerCase().includes(q)
    );
  }, [teams, searchQuery]);

  const boysTeams = useMemo(() => {
    return filteredTeams.filter((t) => getTeamGender(t) === 'Gutter');
  }, [filteredTeams]);

  const girlsTeams = useMemo(() => {
    return filteredTeams.filter((t) => getTeamGender(t) === 'Jenter');
  }, [filteredTeams]);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  return (
    <div id="team-selector-container" className="space-y-3">
      {/* Category Tab Selector & Search Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
        {/* Gender category buttons */}
        <div className="flex items-center space-x-1.5 bg-slate-100/90 p-1 rounded-lg shrink-0 overflow-x-auto scrollbar-none">
          {/* Alle */}
          <button
            id="cat-tab-all"
            onClick={() => setActiveGenderTab('all')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeGenderTab === 'all'
                ? 'bg-[#165094] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Alle lag</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeGenderTab === 'all'
                  ? 'bg-[#0F3A6D] text-blue-100'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {teams.length}
            </span>
          </button>

          {/* Gutter */}
          <button
            id="cat-tab-gutter"
            onClick={() => setActiveGenderTab('Gutter')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeGenderTab === 'Gutter'
                ? 'bg-[#165094] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>🏃‍♂️ Gutter & Herrer</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeGenderTab === 'Gutter'
                  ? 'bg-[#0F3A6D] text-blue-100'
                  : 'bg-blue-100 text-[#165094]'
              }`}
            >
              {teams.filter((t) => getTeamGender(t) === 'Gutter').length}
            </span>
          </button>

          {/* Jenter */}
          <button
            id="cat-tab-jenter"
            onClick={() => setActiveGenderTab('Jenter')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeGenderTab === 'Jenter'
                ? 'bg-[#3E8A37] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>🏃‍♀️ Jenter & Damer</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeGenderTab === 'Jenter'
                  ? 'bg-[#2E6C29] text-green-100'
                  : 'bg-emerald-100 text-[#3E8A37]'
              }`}
            >
              {teams.filter((t) => getTeamGender(t) === 'Jenter').length}
            </span>
          </button>
        </div>

        {/* Search Field & Clear/Reset Button */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          {/* Quick Search Input for all 16 teams */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="team-filter-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Søk lag (f.eks. G14, Damer, 6. div)..."
              className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#165094] focus:ring-1 focus:ring-[#165094] transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Tøm søk"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Reset button to show all 16 teams */}
          <button
            id="team-pill-all"
            onClick={() => {
              setSearchQuery('');
              onSelectTeam('all');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap cursor-pointer shrink-0 ${
              selectedTeamId === 'all'
                ? 'bg-[#165094] text-white border-[#165094] shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
            }`}
          >
            {selectedTeamId === 'all' && <Check className="w-3 h-3 inline mr-1" />}
            <span>Hele klubben</span>
          </button>
        </div>
      </div>

      {/* No search results feedback */}
      {filteredTeams.length === 0 && (
        <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-200/80">
          <p className="text-xs text-slate-600 font-medium">
            Ingen Bønes-lag matchet &ldquo;<span className="font-bold text-slate-900">{searchQuery}</span>&rdquo;
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-2 text-xs text-[#165094] font-bold hover:underline cursor-pointer"
          >
            Vis alle lag igjen
          </button>
        </div>
      )}

      {/* Categorized Lists */}
      <div className="space-y-3">
        {/* Gutter Section */}
        {(activeGenderTab === 'all' || activeGenderTab === 'Gutter') && boysTeams.length > 0 && (
          <div id="category-section-gutter" className="rounded-lg bg-slate-50/70 p-2.5 border border-slate-200/70">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#165094]"></span>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#165094]">
                  Gutter & Menn ({boysTeams.length} lag)
                </h4>
              </div>
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                Ungdom (13-16 år), Junior (G19) og Senior 6. div
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {boysTeams.map((team) => {
                const isSelected = selectedTeamId === team.id;
                const sub = getSubGroup(team);
                const prev = team.previousRank;
                const trend =
                  team.rankTrend ||
                  (prev !== undefined
                    ? team.currentRank < prev
                      ? 'up'
                      : team.currentRank > prev
                      ? 'down'
                      : 'same'
                    : undefined);
                const diff =
                  prev !== undefined && prev !== team.currentRank
                    ? Math.abs(prev - team.currentRank)
                    : 0;
                const form = getTeamForm(team, tables, matches);

                return (
                  <button
                    key={team.id}
                    id={`team-pill-${team.id}`}
                    onClick={() => onSelectTeam(team.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#165094] text-white shadow-md font-bold selected-pill-glow ring-2 ring-blue-400/40'
                        : 'bg-white text-slate-700 hover:bg-[#F0F6FC] hover:border-[#165094]/50 border border-slate-200 shadow-2xs'
                    }`}
                  >
                    <span className="font-semibold">{team.shortName}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold flex items-center space-x-0.5 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                      title={`Tabellplassering #${team.currentRank} i ${team.division}${
                        prev ? ` (forrige: #${prev})` : ''
                      }`}
                    >
                      <span>#{team.currentRank}</span>
                      {trend === 'up' && (
                        <span
                          className={`font-black text-[9px] leading-none ${
                            isSelected ? 'text-emerald-300' : 'text-emerald-600'
                          }`}
                          title={`Opp ${diff} plass${diff > 1 ? 'er' : ''}`}
                        >
                          ▲
                        </span>
                      )}
                      {trend === 'down' && (
                        <span
                          className={`font-black text-[9px] leading-none ${
                            isSelected ? 'text-rose-300' : 'text-rose-600'
                          }`}
                          title={`Ned ${diff} plass${diff > 1 ? 'er' : ''}`}
                        >
                          ▼
                        </span>
                      )}
                    </span>

                    {/* Sparkline mini trend graph */}
                    <SparklineTrend form={form} isSelected={isSelected} />

                    <span
                      className={`text-[9px] hidden sm:inline ${
                        isSelected ? 'text-blue-200' : 'text-slate-400'
                      }`}
                    >
                      {sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Jenter Section */}
        {(activeGenderTab === 'all' || activeGenderTab === 'Jenter') && girlsTeams.length > 0 && (
          <div id="category-section-jenter" className="rounded-lg bg-emerald-50/40 p-2.5 border border-emerald-200/60">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#3E8A37]"></span>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#3E8A37]">
                  Jenter & Kvinner ({girlsTeams.length} lag)
                </h4>
              </div>
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                Ungdom (J13-J16) og Senior Old Girls
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {girlsTeams.map((team) => {
                const isSelected = selectedTeamId === team.id;
                const sub = getSubGroup(team);
                const prev = team.previousRank;
                const trend =
                  team.rankTrend ||
                  (prev !== undefined
                    ? team.currentRank < prev
                      ? 'up'
                      : team.currentRank > prev
                      ? 'down'
                      : 'same'
                    : undefined);
                const diff =
                  prev !== undefined && prev !== team.currentRank
                    ? Math.abs(prev - team.currentRank)
                    : 0;
                const form = getTeamForm(team, tables, matches);

                return (
                  <button
                    key={team.id}
                    id={`team-pill-${team.id}`}
                    onClick={() => onSelectTeam(team.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#3E8A37] text-white shadow-md font-bold selected-pill-glow ring-2 ring-emerald-400/40'
                        : 'bg-white text-slate-700 hover:bg-emerald-50/70 hover:border-[#3E8A37]/50 border border-slate-200 shadow-2xs'
                    }`}
                  >
                    <span className="font-semibold">{team.shortName}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold flex items-center space-x-0.5 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                      title={`Tabellplassering #${team.currentRank} i ${team.division}${
                        prev ? ` (forrige: #${prev})` : ''
                      }`}
                    >
                      <span>#{team.currentRank}</span>
                      {trend === 'up' && (
                        <span
                          className={`font-black text-[9px] leading-none ${
                            isSelected ? 'text-emerald-300' : 'text-emerald-700'
                          }`}
                          title={`Opp ${diff} plass${diff > 1 ? 'er' : ''}`}
                        >
                          ▲
                        </span>
                      )}
                      {trend === 'down' && (
                        <span
                          className={`font-black text-[9px] leading-none ${
                            isSelected ? 'text-rose-300' : 'text-rose-600'
                          }`}
                          title={`Ned ${diff} plass${diff > 1 ? 'er' : ''}`}
                        >
                          ▼
                        </span>
                      )}
                    </span>

                    {/* Sparkline mini trend graph */}
                    <SparklineTrend form={form} isSelected={isSelected} />

                    <span
                      className={`text-[9px] hidden sm:inline ${
                        isSelected ? 'text-green-100' : 'text-slate-400'
                      }`}
                    >
                      {sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Team Info Banner */}
      {selectedTeam && selectedTeamId !== 'all' && (
        <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-900">{selectedTeam.name}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">{selectedTeam.division}</span>
            <span className="text-slate-400 hidden sm:inline">•</span>
            <span className="text-[#165094] font-semibold hidden sm:inline">
              Hjemmebane: {selectedTeam.homeGround}
            </span>
          </div>
          <button
            onClick={() => onSelectTeam('all')}
            className="text-[11px] font-bold text-[#165094] hover:underline cursor-pointer"
          >
            Vis alle lag
          </button>
        </div>
      )}
    </div>
  );
};

