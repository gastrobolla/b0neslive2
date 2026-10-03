import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Flame,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Award,
  Users,
  Skull,
  Crosshair,
  AlertTriangle,
  Info,
  Calculator,
  ShieldCheck
} from 'lucide-react';
import { Match, Player, Team, PlayerPosition, DivisionTable } from '../types.js';
import {
  calculateClubRatingLeaderboards,
  LeaderboardPlayerRating,
  OpponentNightmareRating,
} from '../utils/playerRatingEngine.js';

interface PlayerRatingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'season' | 'form' | 'nightmare';
  initialTeamId?: string;
  matches: Match[];
  players?: Player[];
  teams?: Team[];
  tables?: DivisionTable[] | Record<string, DivisionTable>;
  onSelectPlayer: (playerName: string, teamId?: string) => void;
}

export const PlayerRatingsModal: React.FC<PlayerRatingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'season',
  initialTeamId = 'all',
  matches,
  players = [],
  teams = [],
  tables,
  onSelectPlayer,
}) => {
  const [activeTab, setActiveTab] = useState<'season' | 'form' | 'nightmare'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(initialTeamId || 'all');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [minMatches, setMinMatches] = useState<number>(1);
  const [showRatingExplanation, setShowRatingExplanation] = useState<boolean>(true);

  // Sync initial tab and team when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (initialTeamId) {
        setSelectedTeamId(initialTeamId);
      }
    }
  }, [isOpen, initialTab, initialTeamId]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute club leaderboards
  const leaderboards = useMemo(() => {
    return calculateClubRatingLeaderboards(matches, players, tables);
  }, [matches, players, tables]);

  // Filter and sort the Bønes player lists (Season & Form)
  const currentBonesList = useMemo(() => {
    const baseList =
      activeTab === 'season'
        ? leaderboards.allSeasonRanked
        : leaderboards.allFormRanked;

    const filtered = baseList.filter((p) => {
      // Matches filter
      if (p.matches < minMatches) return false;

      // Team filter
      if (selectedTeamId !== 'all' && p.teamId !== selectedTeamId) {
        return false;
      }

      // Position filter
      if (selectedPosition !== 'all' && p.position !== selectedPosition) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesTeam = p.teamName.toLowerCase().includes(query);
        const matchesPos = p.position.toLowerCase().includes(query);
        if (!matchesName && !matchesTeam && !matchesPos) return false;
      }

      return true;
    });

    // Enforce strict descending sort by last3AvgRating on the Form tab (highest to lowest value)
    if (activeTab === 'form') {
      return [...filtered].sort((a, b) => {
        const valA = Number(a.last3AvgRating) || 0;
        const valB = Number(b.last3AvgRating) || 0;
        const diff = valB - valA;
        if (Math.abs(diff) >= 0.0001) return diff;
        const diffSeason = (Number(b.seasonAvgRating) || 0) - (Number(a.seasonAvgRating) || 0);
        if (Math.abs(diffSeason) >= 0.0001) return diffSeason;
        return (b.matches || 0) - (a.matches || 0);
      });
    }

    return filtered;
  }, [
    activeTab,
    leaderboards,
    selectedTeamId,
    selectedPosition,
    searchQuery,
    minMatches,
  ]);

  // Filter and sort the Bønes Nightmare (Opponent) list
  const currentNightmares = useMemo(() => {
    return leaderboards.bonesNightmares.filter((n) => {
      // Position filter
      if (selectedPosition !== 'all' && n.position !== selectedPosition) {
        return false;
      }

      // Search query (player, opponent club, or Bønes team faced)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = n.name.toLowerCase().includes(query);
        const matchesOpp = n.opponentTeam.toLowerCase().includes(query);
        const matchesBones = n.bonesTeamFaced.toLowerCase().includes(query);
        const matchesPos = n.position.toLowerCase().includes(query);
        if (!matchesName && !matchesOpp && !matchesBones && !matchesPos) return false;
      }

      return true;
    });
  }, [leaderboards.bonesNightmares, selectedPosition, searchQuery]);

  if (!isOpen) return null;

  // Position badge colors
  const getPosBadgeColor = (pos: PlayerPosition) => {
    switch (pos) {
      case 'Keeper':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Forsvar':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Midtbane':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Angrep':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Rating badge color for Bønes players
  const getRatingBadgeClass = (rating: number) => {
    if (rating >= 8.2) return 'bg-emerald-600 text-white shadow-emerald-200';
    if (rating >= 7.8) return 'bg-emerald-500 text-white shadow-emerald-100';
    if (rating >= 7.4) return 'bg-blue-600 text-white shadow-blue-100';
    if (rating >= 7.0) return 'bg-sky-600 text-white shadow-sky-100';
    return 'bg-slate-600 text-white';
  };

  // Nightmare rating badge color
  const getNightmareBadgeClass = (rating: number) => {
    if (rating >= 9.5) return 'bg-purple-900 text-purple-100 border border-purple-600 shadow-purple-900/30';
    if (rating >= 8.5) return 'bg-rose-800 text-rose-100 border border-rose-600 shadow-rose-900/30';
    if (rating >= 7.8) return 'bg-slate-800 text-slate-100 border border-slate-700';
    return 'bg-slate-700 text-white';
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={`p-4 sm:p-6 text-white relative shrink-0 transition-colors ${
            activeTab === 'season'
              ? 'bg-gradient-to-r from-[#0f3460] via-[#165094] to-[#1a65be]'
              : activeTab === 'form'
              ? 'bg-gradient-to-r from-orange-700 via-amber-600 to-amber-700'
              : 'bg-gradient-to-r from-purple-950 via-slate-900 to-rose-950'
          }`}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 transition-colors cursor-pointer"
            aria-label="Lukk"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 text-xs font-bold tracking-wider uppercase opacity-90">
            {activeTab === 'season' ? (
              <>
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Bønes IL Spillerbørs • Sesong</span>
              </>
            ) : activeTab === 'form' ? (
              <>
                <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                <span>Bønes IL Formbarometer • Siste 3 kamper</span>
              </>
            ) : (
              <>
                <Skull className="w-3.5 h-3.5 text-purple-400" />
                <span>Bønes-mareritt • Verste motstandere</span>
              </>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black mt-1 flex items-center gap-2">
            {activeTab === 'season'
              ? 'Sesongbørs: Beste Spiller'
              : activeTab === 'form'
              ? 'Formbarometer: I fyr og flamme'
              : 'Bønes-mareritt: Topp Motstandere'}
            <span className="text-xs sm:text-sm font-semibold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
              {activeTab === 'season'
                ? 'Kun Bønes-spillere'
                : activeTab === 'form'
                ? 'Kun Bønes-spillere'
                : 'Motstandere mot Bønes'}
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-2xl leading-relaxed">
            {activeTab === 'season'
              ? 'Offisiell sesongbørs for Bønes IL (kun Bønes-spillere). Karakterene beregnes dynamisk ut fra posisjon på banen, kamputfall, holdt nullen, mål, målgivende og avgjørende involveringer.'
              : activeTab === 'form'
              ? 'Formbarometer basert på snittkarakter over de tre siste spilte kampene for Bønes-spillere. Viser hvem som er i fyr og flamme akkurat nå!'
              : '«Bønes-mareritt» – Motstanderne som har skapt mest hodebry og herjet mot Bønes-lagene denne sesongen med toppkarakterer, hat-tricks og avgjørende scoringer.'}
          </p>

          {/* Quick Tab Switcher */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <button
              id="tab-btn-season-ratings"
              onClick={() => setActiveTab('season')}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeTab === 'season'
                  ? 'bg-white text-[#165094] shadow-md font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              <span>Beste spiller (Sesong)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-900 font-mono">
                {leaderboards.allSeasonRanked.length}
              </span>
            </button>

            <button
              id="tab-btn-form-ratings"
              onClick={() => setActiveTab('form')}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeTab === 'form'
                  ? 'bg-white text-orange-700 shadow-md font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Flame className="w-4 h-4 text-orange-500 fill-orange-400" />
              <span>Formspiller (Siste 3)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-950 font-mono">
                {leaderboards.allFormRanked.length}
              </span>
            </button>

            <button
              id="tab-btn-nightmare-ratings"
              onClick={() => setActiveTab('nightmare')}
              className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeTab === 'nightmare'
                  ? 'bg-white text-purple-950 shadow-md font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Skull className="w-4 h-4 text-purple-400" />
              <span>Bønes-mareritt</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-200 text-purple-950 font-mono">
                {leaderboards.bonesNightmares.length}
              </span>
            </button>
          </div>
        </div>

        {/* Filters and Search Strip */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-5 sm:py-3 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeTab === 'nightmare'
                  ? 'Søk etter motstander, klubb eller Bønes-lag...'
                  : 'Søk etter Bønes-spiller eller lag...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#165094] focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter controls */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 sm:pb-0">
            {/* Team Dropdown (Bønes tabs only) */}
            {activeTab !== 'nightmare' && (
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-[#165094] cursor-pointer"
              >
                <option value="all">Alle 16 Bønes-lag</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.shortName || t.name}
                  </option>
                ))}
              </select>
            )}

            {/* Position Pills */}
            {(['all', 'Keeper', 'Forsvar', 'Midtbane', 'Angrep'] as const).map(
              (pos) => (
                <button
                  key={pos}
                  onClick={() => setSelectedPosition(pos)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                    selectedPosition === pos
                      ? 'bg-[#165094] text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {pos === 'all'
                    ? 'Alle pos.'
                    : pos === 'Keeper'
                    ? '🧤 KEE'
                    : pos === 'Forsvar'
                    ? '🛡️ FOR'
                    : pos === 'Midtbane'
                    ? '⚙️ MID'
                    : '⚡ ANG'}
                </button>
              )
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {/* Explanatory Infobox: Slik beregnes ratingen */}
          <div className="rounded-2xl border border-blue-200/90 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white shadow-xs overflow-hidden transition-all">
            <div
              onClick={() => setShowRatingExplanation((prev) => !prev)}
              className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer hover:bg-blue-100/40 transition-colors select-none"
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#165094] text-white flex items-center justify-center shadow-xs shrink-0">
                  <Calculator className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                      Slik beregnes spillerbørsen & formbarometeret
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#165094] border border-blue-200 hidden sm:inline-block">
                      Karakterskala 1–10
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
                    Forstå forskjellen på <strong>Beste spiller</strong> (sesongsnitt) og <strong>Formspiller</strong> (siste 3 kamper)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRatingExplanation((prev) => !prev);
                }}
                className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-white/80 hover:bg-white border border-blue-200 px-2.5 py-1 rounded-lg transition-all shadow-2xs shrink-0 cursor-pointer"
              >
                <span>{showRatingExplanation ? 'Skjul' : 'Vis forklaring'}</span>
                {showRatingExplanation ? (
                  <ChevronUp className="w-3.5 h-3.5 text-blue-700" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-blue-700" />
                )}
              </button>
            </div>

            {showRatingExplanation && (
              <div className="px-3.5 pb-4 sm:px-5 sm:pb-5 pt-1 border-t border-blue-100/80 space-y-3.5 text-xs text-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  
                  {/* Card 1: Beste spiller (Sesong) */}
                  <div className="p-3.5 rounded-xl bg-white border border-blue-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[#165094] flex items-center gap-1.5 text-xs sm:text-sm">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                        <span>Beste spiller (Hele sesongen)</span>
                      </span>
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-mono">
                        Aritmetisk snitt
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      <strong>Utregning:</strong> Gjennomsnittet av alle børskarakterer spilleren har fått i offisielle kamper gjennom <strong>hele 2026-sesongen (vår og høst samlet)</strong>.
                    </p>
                    <ul className="text-[11px] text-slate-600 space-y-1 pl-4 list-disc marker:text-blue-500">
                      <li>
                        <strong>Gjennomsnitt vs. sum:</strong> Børskarakterer (1–10) måles som gjennomsnitt slik at spillere vurderes etter faktisk prestasjonsnivå per kamp, ikke bare antall oppmøter.
                      </li>
                      <li>
                        <strong>Minstekrav ({minMatches} kamper):</strong> For å kvalifisere til toppen kreves det spilte kamper for å unngå at 1 enkelt toppkamp overskygger stabil klasse over 10–15 kamper.
                      </li>
                      <li>
                        <strong>Hva premieres:</strong> Høy stabilitet, matchavgjørende bidrag og klasse over hele året.
                      </li>
                    </ul>
                  </div>

                  {/* Card 2: Formspiller (Siste 3 kamper) */}
                  <div className="p-3.5 rounded-xl bg-white border border-orange-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-orange-900 flex items-center gap-1.5 text-xs sm:text-sm">
                        <Flame className="w-4 h-4 text-orange-500 fill-orange-400" />
                        <span>Formspiller (Siste 3 kamper)</span>
                      </span>
                      <span className="text-[10px] font-bold bg-orange-50 text-orange-900 border border-orange-200 px-2 py-0.5 rounded-full font-mono">
                        Snittkarakter siste 3 kamper
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      <strong>Utregning:</strong> Viser hvem som er <em>«i fyr og flamme»</em> akkurat nå, rangert strengt etter <strong>høyeste snittkarakter over spillerens 3 siste spilte kamper</strong> (sortert fra høyest til lavest formverdi).
                    </p>
                    <ul className="text-[11px] text-slate-600 space-y-1 pl-4 list-disc marker:text-orange-500">
                      <li>
                        <strong>Streng sortering:</strong> 1. plass har klubbens høyeste 3-kampssnitt, 2. plass har nest høyeste snitt, osv. F.eks. 9.35 &gt; 9.30 &gt; 9.13 &gt; 9.10.
                      </li>
                      <li>
                        <strong>Kun aktive kamper:</strong> Snittet beregnes utelukkende fra oppgjør hvor spilleren faktisk deltok på banen (startet eller ble byttet inn). Ubenyttede reserver utelates.
                      </li>
                      <li>
                        <strong>Raske formendringer:</strong> Fanger opp plutselige formtopper og målrike perioder basert på de ferskeste kampene.
                      </li>
                    </ul>
                  </div>

                </div>

                {/* Rating factors summary bar */}
                <div className="p-3 bg-blue-900/5 rounded-xl border border-blue-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <ShieldCheck className="w-4 h-4 text-[#165094]" />
                    <span>Hva påvirker kampkarakteren (1–10)?</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                    <span>Basis: <strong>6.70</strong></span>
                    <span>•</span>
                    <span>Mål (+1.00)</span>
                    <span>•</span>
                    <span>Assist (+0.50)</span>
                    <span>•</span>
                    <span>Clean Sheet forsvar/keeper (+0.70)</span>
                    <span>•</span>
                    <span>Topp 3-motstand (+0.45)</span>
                    <span>•</span>
                    <span>Kort/selvmål (trekk)</span>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* =========================================
              VIEW 1 & 2: BØNES PLAYERS (Season & Form)
             ========================================= */}
          {activeTab !== 'nightmare' && (
            <>
              {/* Formspiller Quick Summary Bar (Høyeste snittrating 3 siste matcher) */}
              {activeTab === 'form' && currentBonesList.length >= 3 && !searchQuery && (
                <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-orange-200/80 pb-2">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <Flame className="w-4 h-4 text-orange-600 fill-orange-500 shrink-0" />
                      <span className="text-xs font-black text-orange-950 uppercase tracking-wider">
                        Formspiller • Høyeste snittrating 3 siste matcher
                      </span>
                      {selectedTeamId !== 'all' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-300">
                          {teams.find((t) => t.id === selectedTeamId)?.shortName || 'Valgt lag'}
                        </span>
                      )}
                      {selectedPosition !== 'all' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-300">
                          {selectedPosition}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-bold text-orange-800 bg-orange-100/70 border border-orange-200 px-2 py-0.5 rounded">
                      Sortert synkende: #1 &gt; #2 &gt; #3 (Høyest til lavest)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold text-orange-950">
                    {/* Rank 1 */}
                    <div
                      onClick={() => onSelectPlayer(currentBonesList[0].name, currentBonesList[0].teamId)}
                      className="bg-amber-100/80 hover:bg-amber-100 text-amber-950 p-2.5 rounded-lg border border-amber-300 flex items-center justify-between cursor-pointer transition-all hover:shadow-xs group"
                      title="Klikk for å åpne spillerprofil"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-lg shrink-0">🥇</span>
                        <div className="truncate">
                          <span className="font-black group-hover:text-amber-900 block truncate text-xs">
                            #1 {currentBonesList[0].name}
                          </span>
                          <span className="text-[10px] text-amber-800/80 font-normal block truncate">
                            {currentBonesList[0].position} • {currentBonesList[0].teamName}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-black text-xs sm:text-sm text-amber-950 shrink-0 ml-1.5 bg-white/80 px-2 py-0.5 rounded border border-amber-300 shadow-2xs">
                        🔥 {(currentBonesList[0].last3AvgRating ?? 0).toFixed(2)}
                      </span>
                    </div>

                    {/* Rank 2 */}
                    <div
                      onClick={() => onSelectPlayer(currentBonesList[1].name, currentBonesList[1].teamId)}
                      className="bg-slate-100 hover:bg-slate-200/80 text-slate-900 p-2.5 rounded-lg border border-slate-300 flex items-center justify-between cursor-pointer transition-all hover:shadow-xs group"
                      title="Klikk for å åpne spillerprofil"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-lg shrink-0">🥈</span>
                        <div className="truncate">
                          <span className="font-black group-hover:text-slate-950 block truncate text-xs">
                            #2 {currentBonesList[1].name}
                          </span>
                          <span className="text-[10px] text-slate-600 font-normal block truncate">
                            {currentBonesList[1].position} • {currentBonesList[1].teamName}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-black text-xs sm:text-sm text-slate-900 shrink-0 ml-1.5 bg-white/80 px-2 py-0.5 rounded border border-slate-300 shadow-2xs">
                        🔥 {(currentBonesList[1].last3AvgRating ?? 0).toFixed(2)}
                      </span>
                    </div>

                    {/* Rank 3 */}
                    <div
                      onClick={() => onSelectPlayer(currentBonesList[2].name, currentBonesList[2].teamId)}
                      className="bg-orange-100/70 hover:bg-orange-100 text-orange-950 p-2.5 rounded-lg border border-orange-300 flex items-center justify-between cursor-pointer transition-all hover:shadow-xs group"
                      title="Klikk for å åpne spillerprofil"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-lg shrink-0">🥉</span>
                        <div className="truncate">
                          <span className="font-black group-hover:text-orange-900 block truncate text-xs">
                            #3 {currentBonesList[2].name}
                          </span>
                          <span className="text-[10px] text-orange-800/80 font-normal block truncate">
                            {currentBonesList[2].position} • {currentBonesList[2].teamName}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-black text-xs sm:text-sm text-orange-950 shrink-0 ml-1.5 bg-white/80 px-2 py-0.5 rounded border border-orange-300 shadow-2xs">
                        🔥 {(currentBonesList[2].last3AvgRating ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Top 3 Podium: Rendered if no search filter is active and we have >= 3 players */}
              {!searchQuery && currentBonesList.length >= 3 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 pb-2">
                  {/* Gold #1 (Highest Rating) */}
                  <div
                    onClick={() => onSelectPlayer(currentBonesList[0].name, currentBonesList[0].teamId)}
                    className="bg-gradient-to-b from-amber-50/90 via-amber-50/40 to-yellow-50/20 border-2 border-amber-300 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:shadow-lg transition-all cursor-pointer group hover:border-amber-400 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-full bg-amber-400 text-amber-950 text-xs font-black flex items-center justify-center shadow-xs">
                        👑 1
                      </span>
                      <span
                        className={`text-sm font-black px-2.5 py-0.5 rounded-full ${getRatingBadgeClass(
                          activeTab === 'season'
                            ? currentBonesList[0].seasonAvgRating
                            : currentBonesList[0].last3AvgRating
                        )}`}
                      >
                        {activeTab === 'season'
                          ? `★ ${(currentBonesList[0].seasonAvgRating ?? 0).toFixed(2)}`
                          : `🔥 ${(currentBonesList[0].last3AvgRating ?? 0).toFixed(2)}`}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                        {activeTab === 'season' ? '1. plass • Sesongens beste' : '1. plass • Klubbens høyeste form'}
                      </div>
                      <h4 className="text-base font-black text-slate-900 group-hover:text-amber-800 transition-colors truncate">
                        {currentBonesList[0].name}
                      </h4>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5 truncate">
                        <span className="font-bold text-slate-800">{currentBonesList[0].position}</span>
                        <span>•</span>
                        <span className="truncate">{currentBonesList[0].teamName}</span>
                      </div>
                    </div>
                    <div className="mt-2.5 text-[11px] text-amber-900 font-semibold truncate bg-amber-100/60 border border-amber-200/80 rounded px-2.5 py-1 flex items-center justify-between">
                      <span>{currentBonesList[0].primaryTag || `${currentBonesList[0].matches} kamper spilt`}</span>
                      <span className="font-mono font-bold text-[10px]">{currentBonesList[0].matches}k</span>
                    </div>
                  </div>

                  {/* Silver #2 (Second Highest Rating) */}
                  <div
                    onClick={() => onSelectPlayer(currentBonesList[1].name, currentBonesList[1].teamId)}
                    className="bg-gradient-to-b from-slate-50 to-slate-100/60 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group hover:border-slate-300 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-7 h-7 rounded-full bg-slate-300 text-slate-800 text-xs font-black flex items-center justify-center shadow-2xs">
                        🥈 2
                      </span>
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-full ${getRatingBadgeClass(
                          activeTab === 'season'
                            ? currentBonesList[1].seasonAvgRating
                            : currentBonesList[1].last3AvgRating
                        )}`}
                      >
                        {activeTab === 'season'
                          ? `★ ${(currentBonesList[1].seasonAvgRating ?? 0).toFixed(2)}`
                          : `🔥 ${(currentBonesList[1].last3AvgRating ?? 0).toFixed(2)}`}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        {activeTab === 'season' ? '2. plass • Sesongsnitt' : '2. plass • Nest høyeste form'}
                      </div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-[#165094] transition-colors truncate">
                        {currentBonesList[1].name}
                      </h4>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                        <span className="font-semibold text-slate-700">{currentBonesList[1].position}</span>
                        <span>•</span>
                        <span className="truncate">{currentBonesList[1].teamName}</span>
                      </div>
                    </div>
                    <div className="mt-2.5 text-[10px] text-slate-500 font-medium truncate bg-white/70 border border-slate-200/60 rounded px-2 py-1 flex items-center justify-between">
                      <span>{currentBonesList[1].primaryTag || `${currentBonesList[1].matches} kamper spilt`}</span>
                      <span className="font-mono font-bold">{currentBonesList[1].matches}k</span>
                    </div>
                  </div>

                  {/* Bronze #3 (Third Highest Rating) */}
                  <div
                    onClick={() => onSelectPlayer(currentBonesList[2].name, currentBonesList[2].teamId)}
                    className="bg-gradient-to-b from-amber-50/30 to-orange-50/20 border border-amber-200/80 rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer group hover:border-amber-300 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-7 h-7 rounded-full bg-amber-600 text-white text-xs font-black flex items-center justify-center shadow-2xs">
                        🥉 3
                      </span>
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-full ${getRatingBadgeClass(
                          activeTab === 'season'
                            ? currentBonesList[2].seasonAvgRating
                            : currentBonesList[2].last3AvgRating
                        )}`}
                      >
                        {activeTab === 'season'
                          ? `★ ${(currentBonesList[2].seasonAvgRating ?? 0).toFixed(2)}`
                          : `🔥 ${(currentBonesList[2].last3AvgRating ?? 0).toFixed(2)}`}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                        {activeTab === 'season' ? '3. plass • Sesongsnitt' : '3. plass • 3. høyeste form'}
                      </div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-amber-700 transition-colors truncate">
                        {currentBonesList[2].name}
                      </h4>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                        <span className="font-semibold text-slate-700">{currentBonesList[2].position}</span>
                        <span>•</span>
                        <span className="truncate">{currentBonesList[2].teamName}</span>
                      </div>
                    </div>
                    <div className="mt-2.5 text-[10px] text-slate-500 font-medium truncate bg-white/70 border border-slate-200/60 rounded px-2 py-1 flex items-center justify-between">
                      <span>{currentBonesList[2].primaryTag || `${currentBonesList[2].matches} kamper spilt`}</span>
                      <span className="font-mono font-bold">{currentBonesList[2].matches}k</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Full Ranked Table for Bønes Players */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-6 sm:col-span-5">Spiller & Lag</div>
                  <div className="col-span-3 sm:col-span-2 text-center">
                    {activeTab === 'season' ? 'Kamper' : 'Siste 3 matcher'}
                  </div>
                  <div className="hidden sm:block sm:col-span-2 text-center">
                    {activeTab === 'season' ? 'Høyeste' : 'Formtrend'}
                  </div>
                  <div className="col-span-2 text-right pr-2">Rating</div>
                </div>

                {currentBonesList.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Ingen spillere funnet</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Prøv å endre søk eller tilbakestille filtrene.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {currentBonesList.map((player, index) => {
                      const rank = index + 1;
                      const isTop3 = rank <= 3;
                      const ratingValue =
                        activeTab === 'season'
                          ? player.seasonAvgRating
                          : player.last3AvgRating;

                      return (
                        <div
                          key={`${player.name}-${player.teamId}-${index}`}
                          onClick={() => onSelectPlayer(player.name, player.teamId)}
                          className="px-3 sm:px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-slate-50 transition-colors cursor-pointer group"
                        >
                          {/* Rank */}
                          <div className="col-span-1 text-center">
                            {rank === 1 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs shadow-2xs">
                                1
                              </span>
                            ) : rank === 2 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-black text-xs shadow-2xs">
                                2
                              </span>
                            ) : rank === 3 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-white font-black text-xs shadow-2xs">
                                3
                              </span>
                            ) : (
                              <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-slate-700">
                                {rank}
                              </span>
                            )}
                          </div>

                          {/* Player Info */}
                          <div className="col-span-6 sm:col-span-5 flex items-center space-x-2.5 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border ${getPosBadgeColor(
                                player.position
                              )}`}
                            >
                              {player.jerseyNumber ? player.jerseyNumber : player.position.slice(0, 3).toUpperCase()}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-sm font-black text-slate-900 group-hover:text-[#165094] transition-colors truncate">
                                  {player.name}
                                </span>
                                {player.isLive && (
                                  <span className="bg-red-600 text-white font-black text-[9px] px-1.5 py-0.2 rounded-md animate-pulse shrink-0">
                                    LIVE
                                  </span>
                                )}
                                {isTop3 && (
                                  <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-0.5 truncate">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getPosBadgeColor(
                                    player.position
                                  )}`}
                                >
                                  {player.position}
                                </span>
                                <span>•</span>
                                <span className="truncate">{player.teamName}</span>
                              </div>
                            </div>
                          </div>

                          {/* Matches / Recent Ratings */}
                          <div className="col-span-3 sm:col-span-2 text-center">
                            {activeTab === 'season' ? (
                              <span className="text-xs font-semibold text-slate-600 font-mono">
                                {player.matches} {player.matches === 1 ? 'kamp' : 'kamper'}
                              </span>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                {player.recentRatings && player.recentRatings.length > 0 ? (
                                  player.recentRatings.map((r, rIdx) => (
                                    <span
                                      key={rIdx}
                                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                        r >= 8.0
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : r >= 7.3
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}
                                      title={`Kamp ${rIdx + 1}: ${(r ?? 0).toFixed(1)}`}
                                    >
                                      {(r ?? 0).toFixed(1)}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-slate-400">-</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Highest Rating / Trend */}
                          <div className="hidden sm:block sm:col-span-2 text-center">
                            {activeTab === 'season' ? (
                              <div className="text-xs font-semibold text-slate-700">
                                <span className="text-slate-400 text-[10px] mr-1">Topp:</span>
                                <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {(player.highestRating ?? 0).toFixed(1)}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center space-x-1 text-xs font-semibold">
                                {player.trend === 'up' ? (
                                  <span className="inline-flex items-center text-emerald-600 font-mono font-bold">
                                    <TrendingUp className="w-3.5 h-3.5 mr-0.5 text-emerald-500" />
                                    +{player.ratingDiff?.toFixed(2)}
                                  </span>
                                ) : player.trend === 'down' ? (
                                  <span className="inline-flex items-center text-rose-600 font-mono font-bold">
                                    <TrendingDown className="w-3.5 h-3.5 mr-0.5 text-rose-500" />
                                    {player.ratingDiff?.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-slate-400 font-mono">
                                    <Minus className="w-3.5 h-3.5 mr-0.5" />
                                    Stabil
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Final Rating Badge */}
                          <div className="col-span-2 flex items-center justify-end space-x-1.5 pr-1">
                            <span
                              className={`font-mono text-xs sm:text-sm font-black px-2.5 py-1 rounded-lg shadow-xs flex items-center space-x-1 ${getRatingBadgeClass(
                                ratingValue ?? 0
                              )}`}
                            >
                              {activeTab === 'season' ? (
                                <Star className="w-3 h-3 text-amber-300 fill-amber-300 mr-0.5 hidden sm:inline" />
                              ) : (
                                <Flame className="w-3 h-3 text-amber-300 fill-amber-300 mr-0.5 hidden sm:inline" />
                              )}
                              <span>{(ratingValue ?? 0).toFixed(2)}</span>
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#165094] transition-colors" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* =========================================
              VIEW 3: BØNES-MARERITT (Worst Opponents)
             ========================================= */}
          {activeTab === 'nightmare' && (
            <>
              {/* Nightmare Top 3 Podium */}
              {!searchQuery && selectedPosition === 'all' && currentNightmares.length >= 3 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 pb-2">
                  {/* Silver #2 Nightmare */}
                  <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-white rounded-xl p-3.5 flex flex-col justify-between shadow-md relative order-2 sm:order-1">
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-200 text-xs font-black flex items-center justify-center">
                        💀 2
                      </span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${getNightmareBadgeClass(currentNightmares[1].highestRating ?? currentNightmares[1].rating ?? 0)}`}>
                        ★ {(currentNightmares[1].highestRating ?? currentNightmares[1].rating ?? 0).toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider truncate">
                        {currentNightmares[1].opponentTeam}
                      </div>
                      <h4 className="text-sm font-black text-white truncate">
                        {currentNightmares[1].name}
                      </h4>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        mot <span className="text-slate-200 font-semibold">{currentNightmares[1].bonesTeamFaced}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] bg-slate-800/80 border border-slate-700/80 rounded px-2 py-1">
                      <span className="text-amber-400 font-bold">⚽ {currentNightmares[1].totalGoalsAgainstBones ?? currentNightmares[1].goalsAgainstBones ?? 0} mål</span>
                      <span className="text-slate-400 font-mono">{currentNightmares[1].bestMatchDate}</span>
                    </div>
                  </div>

                  {/* Gold #1 Nightmare */}
                  <div className="bg-gradient-to-b from-purple-950 via-slate-950 to-rose-950 border-2 border-purple-500/80 text-white rounded-xl p-4 flex flex-col justify-between shadow-xl relative order-1 sm:order-2">
                    <div className="flex items-center justify-between">
                      <span className="w-7 h-7 rounded-full bg-rose-600 text-white text-xs font-black flex items-center justify-center shadow-md animate-pulse">
                        👑 1
                      </span>
                      <span className={`text-sm font-black px-2.5 py-0.5 rounded-full ${getNightmareBadgeClass(currentNightmares[0].highestRating ?? currentNightmares[0].rating ?? 0)}`}>
                        ★ {(currentNightmares[0].highestRating ?? currentNightmares[0].rating ?? 0).toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="text-[10px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1">
                        <Skull className="w-3 h-3 text-rose-400" />
                        <span>Klubbens største mareritt</span>
                      </div>
                      <h4 className="text-base font-black text-white truncate mt-0.5">
                        {currentNightmares[0].name}
                      </h4>
                      <div className="text-xs text-purple-200/90 mt-0.5 truncate">
                        <span className="font-bold text-white">{currentNightmares[0].opponentTeam}</span>
                        <span> • herjet mot </span>
                        <span className="font-semibold text-rose-200">{currentNightmares[0].bonesTeamFaced}</span>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] bg-purple-900/60 border border-purple-700/60 rounded px-2.5 py-1">
                      <span className="text-rose-300 font-black">⚽ {currentNightmares[0].totalGoalsAgainstBones ?? currentNightmares[0].goalsAgainstBones ?? 0} mål mot Bønes</span>
                      <span className="text-purple-300 font-mono text-[10px]">{currentNightmares[0].bestMatchScore}</span>
                    </div>
                  </div>

                  {/* Bronze #3 Nightmare */}
                  <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 text-white rounded-xl p-3.5 flex flex-col justify-between shadow-md relative order-3">
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-200 text-xs font-black flex items-center justify-center">
                        💀 3
                      </span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${getNightmareBadgeClass(currentNightmares[2].highestRating ?? currentNightmares[2].rating ?? 0)}`}>
                        ★ {(currentNightmares[2].highestRating ?? currentNightmares[2].rating ?? 0).toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-2.5">
                      <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider truncate">
                        {currentNightmares[2].opponentTeam}
                      </div>
                      <h4 className="text-sm font-black text-white truncate">
                        {currentNightmares[2].name}
                      </h4>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        mot <span className="text-slate-200 font-semibold">{currentNightmares[2].bonesTeamFaced}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] bg-slate-800/80 border border-slate-700/80 rounded px-2 py-1">
                      <span className="text-amber-400 font-bold">⚽ {currentNightmares[2].totalGoalsAgainstBones ?? currentNightmares[2].goalsAgainstBones ?? 0} mål</span>
                      <span className="text-slate-400 font-mono">{currentNightmares[2].bestMatchDate}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Full Nightmare Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1 text-center">#</div>
                  <div className="col-span-6 sm:col-span-5">Motstander & Klubb</div>
                  <div className="col-span-3 sm:col-span-3 text-center sm:text-left">Møtte Bønes-lag</div>
                  <div className="hidden sm:block sm:col-span-1 text-center">Mål</div>
                  <div className="col-span-2 text-right pr-2">Rating</div>
                </div>

                {currentNightmares.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Skull className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Ingen motstandere funnet</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Prøv å endre søkeordene.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {currentNightmares.map((opp, index) => {
                      const rank = index + 1;
                      const isTop3 = rank <= 3;

                      return (
                        <div
                          key={`${opp.name}-${opp.opponentTeam}-${index}`}
                          className="px-3 sm:px-4 py-3 grid grid-cols-12 gap-2 items-center hover:bg-purple-50/40 transition-colors"
                        >
                          {/* Rank */}
                          <div className="col-span-1 text-center">
                            {rank === 1 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-600 text-white font-black text-xs shadow-2xs">
                                1
                              </span>
                            ) : rank === 2 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-white font-black text-xs shadow-2xs">
                                2
                              </span>
                            ) : rank === 3 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-800 text-white font-black text-xs shadow-2xs">
                                3
                              </span>
                            ) : (
                              <span className="text-xs font-mono font-bold text-slate-400">
                                {rank}
                              </span>
                            )}
                          </div>

                          {/* Opponent Info */}
                          <div className="col-span-6 sm:col-span-5 flex items-center space-x-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-900 border border-purple-200 flex items-center justify-center font-black text-xs shrink-0">
                              <Skull className="w-4 h-4 text-purple-700" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-sm font-black text-slate-900 truncate">
                                  {opp.name}
                                </span>
                                {isTop3 && (
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-0.5 truncate">
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                  {opp.opponentTeam}
                                </span>
                                <span className="text-[10px] text-rose-700 font-semibold sm:hidden">
                                  • ⚽ {opp.totalGoalsAgainstBones} mål
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Bønes Team Faced & Date */}
                          <div className="col-span-3 sm:col-span-3 text-center sm:text-left">
                            <div className="text-xs font-bold text-slate-800 truncate">
                              {opp.bonesTeamFaced}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              {opp.bestMatchDate} {opp.bestMatchScore ? `(${opp.bestMatchScore})` : ''}
                            </div>
                          </div>

                          {/* Goals Against Bønes (Desktop) */}
                          <div className="hidden sm:block sm:col-span-1 text-center">
                            {(opp.totalGoalsAgainstBones ?? opp.goalsAgainstBones ?? 0) > 0 ? (
                              <span className="font-mono text-xs font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full inline-flex items-center">
                                ⚽ {opp.totalGoalsAgainstBones ?? opp.goalsAgainstBones ?? 0}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">-</span>
                            )}
                          </div>

                          {/* Final Rating Badge */}
                          <div className="col-span-2 flex items-center justify-end space-x-1.5 pr-1">
                            <span
                              className={`font-mono text-xs sm:text-sm font-black px-2.5 py-1 rounded-lg shadow-xs flex items-center space-x-1 ${getNightmareBadgeClass(
                                opp.highestRating ?? opp.rating ?? 0
                              )}`}
                            >
                              <Skull className="w-3 h-3 text-purple-300 mr-0.5 hidden sm:inline" />
                              <span>{(opp.highestRating ?? opp.rating ?? 0).toFixed(2)}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 sm:px-5 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">Viser:</span>
            <span>
              {activeTab === 'nightmare'
                ? `${currentNightmares.length} motstandere mot Bønes`
                : `${currentBonesList.length} Bønes-spillere`}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#165094] hover:bg-[#113a6b] text-white font-bold rounded-lg transition-colors cursor-pointer text-xs"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
};
