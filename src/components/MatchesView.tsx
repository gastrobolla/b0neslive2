import React, { useState, useEffect, useMemo } from 'react';
import { Match, MatchEvent, DivisionTable, TeamInfo } from '../types.js';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Radio,
  Home,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Activity,
  Check,
  Zap,
  Sparkles,
  Share2,
  ExternalLink,
  Copy,
  BarChart2,
  Search,
  X,
  RotateCcw,
  SlidersHorizontal,
  Trophy,
  Percent
} from 'lucide-react';
import { MatchShareModal, copyToClipboard, getMatchShareUrl } from './MatchShareModal.js';
import { MatchDetailModal } from './MatchDetailModal.js';
import { SofascoreMatchCard } from './SofascoreMatchCard.js';
import { ScoutReportModal } from './ScoutReportModal.js';
import { TeamCalendarExportButton } from './TeamCalendarExportButton.js';
import { LaglederModal } from './LaglederModal.js';
import { PlayerOfTheMatchModal } from './PlayerOfTheMatchModal.js';
import { MatchStatsAnalyticsView } from './MatchStatsAnalyticsView.js';

function normalizeDateStr(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // DD.MM.YYYY
  const dotParts = trimmed.split('.');
  if (dotParts.length === 3) {
    const day = dotParts[0].padStart(2, '0');
    const month = dotParts[1].padStart(2, '0');
    let year = dotParts[2];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }
  // DD.MM (assume 2026)
  if (dotParts.length === 2) {
    const day = dotParts[0].padStart(2, '0');
    const month = dotParts[1].padStart(2, '0');
    return `2026-${month}-${day}`;
  }
  return trimmed;
}

interface MatchesViewProps {
  matches: Match[];
  selectedTeamId: string;
  teams?: TeamInfo[];
  tables?: Record<string, DivisionTable>;
  onMatchUpdated?: (updatedMatch: Match) => void;
  onSyncComplete?: () => void;
  onSelectPlayer?: (playerName: string, teamId?: string) => void;
  onViewLineup?: (match: Match) => void;
}

export const MatchesView: React.FC<MatchesViewProps> = ({
  matches,
  selectedTeamId,
  teams = [],
  tables,
  onMatchUpdated,
  onSyncComplete,
  onSelectPlayer,
  onViewLineup,
}) => {
  const [onlyHomeMatches, setOnlyHomeMatches] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState<'all' | 'host' | 'var'>('all');
  const [tab, setTab] = useState<'upcoming' | 'finished' | 'stats'>('upcoming');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [loadingMatchId, setLoadingMatchId] = useState<string | null>(null);
  const [isScrapingAll, setIsScrapingAll] = useState(false);
  const [scrapeSuccessMsg, setScrapeSuccessMsg] = useState<string | null>(null);
  const [localMatches, setLocalMatches] = useState<Match[]>(matches);

  // Search by opponent and date range filter states
  const [searchOpponent, setSearchOpponent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Share and Detail modal state
  const [shareModalMatch, setShareModalMatch] = useState<Match | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [detailModalMatch, setDetailModalMatch] = useState<Match | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [laglederMatch, setLaglederMatch] = useState<Match | null>(null);
  const [isLaglederOpen, setIsLaglederOpen] = useState(false);
  const [scoutModalMatch, setScoutModalMatch] = useState<Match | null>(null);
  const [copiedMatchId, setCopiedMatchId] = useState<string | null>(null);
  const [potmMatch, setPotmMatch] = useState<Match | null>(null);
  const [isPotmOpen, setIsPotmOpen] = useState(false);

  // Keep localMatches synced when prop matches change
  React.useEffect(() => {
    setLocalMatches(matches);
  }, [matches]);

  // Deep linking: if URL has ?match=<id> or hash #match-card-<id>, navigate to and highlight that match
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const matchIdFromUrl = params.get('match') || window.location.hash.replace('#match-card-', '');
    if (matchIdFromUrl && localMatches.length > 0) {
      const targetMatch = localMatches.find(m => m.id === matchIdFromUrl);
      if (targetMatch) {
        if (targetMatch.status === 'finished') {
          setTab('finished');
        } else {
          setTab('upcoming');
        }
        setExpandedMatchId(targetMatch.id);
        setTimeout(() => {
          const el = document.getElementById(`match-card-${targetMatch.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-4', 'ring-[#165094]', 'ring-offset-2');
            setTimeout(() => {
              el.classList.remove('ring-4', 'ring-[#165094]', 'ring-offset-2');
            }, 3500);
          }
        }, 350);
      }
    }
  }, [localMatches]);

  // Quick preset helper for dates
  const setQuickDatePreset = (preset: 'next7' | 'next30' | 'spring' | 'autumn' | 'all') => {
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (preset === 'next7') {
      const d7 = new Date(today);
      d7.setDate(d7.getDate() + 7);
      setStartDate(todayStr);
      setEndDate(d7.toISOString().split('T')[0]);
    } else if (preset === 'next30') {
      const d30 = new Date(today);
      d30.setDate(d30.getDate() + 30);
      setStartDate(todayStr);
      setEndDate(d30.toISOString().split('T')[0]);
    } else if (preset === 'spring') {
      setStartDate('2026-03-01');
      setEndDate('2026-06-30');
    } else if (preset === 'autumn') {
      setStartDate('2026-08-01');
      setEndDate('2026-11-30');
    }
  };

  const handleResetFilters = () => {
    setSearchOpponent('');
    setStartDate('');
    setEndDate('');
    setOnlyHomeMatches(false);
    setSeasonFilter('all');
  };

  // Filter and sort matches: closest in time first for upcoming, most recent first for finished
  const filteredMatches = useMemo(() => {
    return localMatches
      .filter((m) => {
        if (selectedTeamId !== 'all' && m.teamId !== selectedTeamId) {
          return false;
        }
        if (tab === 'upcoming' && m.status === 'finished') {
          return false;
        }
        if (tab === 'finished' && m.status !== 'finished') {
          return false;
        }
        if (onlyHomeMatches && !m.isHome) {
          return false;
        }
        if (seasonFilter === 'host') {
          const isAutumn = (m.division && m.division.toLowerCase().includes('høst')) || m.season === 'Høst 2026';
          if (!isAutumn) return false;
        }
        if (seasonFilter === 'var') {
          const isSpring = (m.division && m.division.toLowerCase().includes('vår')) || m.season === 'Vår 2026';
          if (!isSpring) return false;
        }

        // Search by opponent name (case-insensitive substring match)
        if (searchOpponent.trim()) {
          const query = searchOpponent.trim().toLowerCase();
          const isBonesHome = m.homeTeam?.toLowerCase().includes('bønes');
          const opponent = (isBonesHome ? m.awayTeam : m.homeTeam) || '';
          const homeName = m.homeTeam || '';
          const awayName = m.awayTeam || '';
          const oppNameField = m.opponentName || '';
          const venueName = m.venue || '';

          const matchesSearch =
            opponent.toLowerCase().includes(query) ||
            homeName.toLowerCase().includes(query) ||
            awayName.toLowerCase().includes(query) ||
            oppNameField.toLowerCase().includes(query) ||
            venueName.toLowerCase().includes(query);

          if (!matchesSearch) return false;
        }

        // Date range filter
        const mDate = normalizeDateStr(m.date);
        if (startDate && mDate) {
          if (mDate < startDate) return false;
        }
        if (endDate && mDate) {
          if (mDate > endDate) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aKey = (a.date || '') + (a.time || '');
        const bKey = (b.date || '') + (b.time || '');
        if (tab === 'upcoming') {
          return aKey.localeCompare(bKey);
        }
        if (tab === 'finished') {
          return bKey.localeCompare(aKey);
        }
        return aKey.localeCompare(bKey);
      });
  }, [localMatches, selectedTeamId, tab, onlyHomeMatches, seasonFilter, searchOpponent, startDate, endDate]);

  const totalHomeUpcoming = localMatches.filter(m => m.isHome && m.status !== 'finished').length;

  // Single match events scrape handler
  const handleScrapeMatchEvents = async (match: Match) => {
    setLoadingMatchId(match.id);
    try {
      const res = await fetch(`/api/bones/match/${match.id}/events`, { method: 'POST' });
      if (!res.ok) {
        throw new Error(`Nettverksfeil (${res.status})`);
      }
      const data = await res.json();
      if (data.success && data.events) {
        const updated = { ...match, events: data.events };
        setLocalMatches(prev => prev.map(m => m.id === match.id ? updated : m));
        setExpandedMatchId(match.id);
        setScrapeSuccessMsg(`Kamphendelser oppdatert for ${match.homeTeam} vs ${match.awayTeam}! Målscorere og kort synkronisert.`);
        if (onMatchUpdated) onMatchUpdated(updated);
        if (onSyncComplete) onSyncComplete();
      }
    } catch (err: any) {
      console.error('Kunne ikke hente kamphendelser:', err);
    } finally {
      setLoadingMatchId(null);
      setTimeout(() => setScrapeSuccessMsg(null), 4000);
    }
  };

  // Scrape all events
  const handleScrapeAllEvents = async () => {
    setIsScrapingAll(true);
    try {
      const res = await fetch('/api/bones/matches/scrape-all-events', { method: 'POST' });
      if (!res.ok) {
        throw new Error(`Nettverksfeil (${res.status})`);
      }
      const data = await res.json();
      if (data.success && data.matches) {
        setLocalMatches(data.matches);
        setScrapeSuccessMsg(`Autoskannet ${data.updatedCount} kamper for hendelser! Målscorere og kort er oppdatert.`);
        if (onSyncComplete) onSyncComplete();
      }
    } catch (err: any) {
      console.error('Feil ved skanning av alle hendelser:', err);
    } finally {
      setIsScrapingAll(false);
      setTimeout(() => setScrapeSuccessMsg(null), 4500);
    }
  };

  return (
    <div id="matches-view-container" className="space-y-4">
      
      {/* Daily Autoscrape Info Banner */}
      <div className="bg-gradient-to-r from-[#0B2545] to-[#165094] rounded-xl p-3.5 sm:p-4 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-emerald-300">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm">Daglig Autoscrape & Live Hendelser</span>
              <span className="bg-[#3E8A37] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                AKTIV
              </span>
            </div>
            <p className="text-xs text-blue-100/80 mt-0.5">
              Autoscrapes daglig kl. 06:00 fra fotball.no, og fortløpende under aktive kamper for scoringer, kort og bytter.
            </p>
          </div>
        </div>

        <button
          onClick={handleScrapeAllEvents}
          disabled={isScrapingAll}
          className="flex items-center justify-center space-x-2 px-3.5 py-2 rounded-lg bg-white text-[#165094] hover:bg-blue-50 text-xs font-bold transition-all shadow-xs self-start sm:self-auto flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScrapingAll ? 'animate-spin' : ''}`} />
          <span>{isScrapingAll ? 'Skanner NFF...' : 'Autoskann alle kamphendelser'}</span>
        </button>
      </div>

      {/* Success alert */}
      {scrapeSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{scrapeSuccessMsg}</span>
        </div>
      )}

      {/* View Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
        
        {/* Tab switcher: Kommende vs Ferdigspilte */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
          <button
            id="tab-upcoming-matches"
            onClick={() => setTab('upcoming')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              tab === 'upcoming'
                ? 'bg-[#165094] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Framtidige kamper</span>
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
              tab === 'upcoming' ? 'bg-[#0F3A6D] text-blue-100' : 'bg-slate-200 text-slate-700'
            }`}>
              {localMatches.filter(m => m.status !== 'finished').length}
            </span>
          </button>

          <button
            id="tab-finished-matches"
            onClick={() => setTab('finished')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              tab === 'finished'
                ? 'bg-[#3E8A37] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Fullførte kamper</span>
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
              tab === 'finished' ? 'bg-[#2E6C29] text-green-100' : 'bg-slate-200 text-slate-700'
            }`}>
              {localMatches.filter(m => m.status === 'finished').length}
            </span>
          </button>

          <button
            id="tab-stats-matches"
            onClick={() => setTab('stats')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              tab === 'stats'
                ? 'bg-[#165094] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Kampstatistikk</span>
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
              tab === 'stats' ? 'bg-[#0F3A6D] text-blue-100' : 'bg-slate-200 text-slate-700'
            }`}>
              Recharts
            </span>
          </button>
        </div>

        {/* Season selector */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
          <button
            id="filter-season-all"
            onClick={() => setSeasonFilter('all')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              seasonFilter === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Alle sesonger
          </button>
          <button
            id="filter-season-host"
            onClick={() => setSeasonFilter('host')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              seasonFilter === 'host'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🍂 Høst 2026
          </button>
          <button
            id="filter-season-var"
            onClick={() => setSeasonFilter('var')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              seasonFilter === 'var'
                ? 'bg-[#0B2545] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🌸 Vår 2026
          </button>
        </div>

        {/* Actions cluster: Calendar export & Home Match Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <TeamCalendarExportButton
            matches={localMatches}
            selectedTeamId={selectedTeamId}
            teams={teams}
            seasonFilter={seasonFilter}
          />

          <button
            id="toggle-home-only"
            onClick={() => setOnlyHomeMatches(!onlyHomeMatches)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              onlyHomeMatches
                ? 'bg-[#165094] text-white border-[#0F3A6D] shadow-xs'
                : 'bg-[#F0F6FC] text-[#165094] border-[#165094]/30 hover:bg-blue-100/60'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Vis bare hjemmekamper</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              onlyHomeMatches ? 'bg-[#0F3A6D] text-blue-100' : 'bg-blue-200/80 text-[#165094]'
            }`}>
              {totalHomeUpcoming}
            </span>
          </button>
        </div>

      </div>

      {/* Search & Date Range Filter Section */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Opponent Search Input */}
          <div className="relative flex-1">
            <label htmlFor="search-opponent-input" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Søk etter motstander
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                id="search-opponent-input"
                type="text"
                value={searchOpponent}
                onChange={(e) => setSearchOpponent(e.target.value)}
                placeholder="Skriv motstander (f.eks. Askøy, Baune, Fana, Stord, Gneist)..."
                className="w-full pl-9 pr-9 py-2 text-xs rounded-lg border border-slate-200 focus:border-[#165094] focus:ring-2 focus:ring-[#165094]/20 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800"
              />
              {searchOpponent && (
                <button
                  type="button"
                  onClick={() => setSearchOpponent('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
                  title="Tøm søk"
                  aria-label="Tøm søk"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Date Range: Fra dato & Til dato */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
            <div className="flex-1 sm:flex-initial">
              <label htmlFor="filter-start-date" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Fra dato
              </label>
              <div className="relative">
                <input
                  id="filter-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full sm:w-36 px-2.5 py-2 text-xs rounded-lg border border-slate-200 focus:border-[#165094] focus:ring-2 focus:ring-[#165094]/20 outline-none text-slate-800 font-medium"
                />
              </div>
            </div>

            <div className="flex-1 sm:flex-initial">
              <label htmlFor="filter-end-date" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Til dato
              </label>
              <div className="relative">
                <input
                  id="filter-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full sm:w-36 px-2.5 py-2 text-xs rounded-lg border border-slate-200 focus:border-[#165094] focus:ring-2 focus:ring-[#165094]/20 outline-none text-slate-800 font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Date presets & Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Dato-snarveier:</span>
            </span>
            <button
              type="button"
              onClick={() => setQuickDatePreset('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all border cursor-pointer ${
                !startDate && !endDate
                  ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Alle datoer
            </button>
            <button
              type="button"
              onClick={() => setQuickDatePreset('next7')}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer"
            >
              Neste 7 dager
            </button>
            <button
              type="button"
              onClick={() => setQuickDatePreset('next30')}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer"
            >
              Neste 30 dager
            </button>
            <button
              type="button"
              onClick={() => setQuickDatePreset('spring')}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer"
            >
              🌸 Vår 2026
            </button>
            <button
              type="button"
              onClick={() => setQuickDatePreset('autumn')}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer"
            >
              🍂 Høst 2026
            </button>
          </div>

          {/* Active Filter Clear & Result Count */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              Viser {filteredMatches.length} av {localMatches.length} kamper
            </span>
            {(searchOpponent || startDate || endDate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                title="Nullstill søk og datofilter"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Nullstill filtre</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Badges */}
        {(searchOpponent || startDate || endDate) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
            <span className="text-slate-400 font-semibold">Aktive filtre:</span>
            {searchOpponent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[#165094] border border-blue-200 font-semibold">
                <span>Motstander: "{searchOpponent}"</span>
                <button
                  type="button"
                  onClick={() => setSearchOpponent('')}
                  className="hover:text-blue-900 cursor-pointer"
                  aria-label="Fjern motstandersøk"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(startDate || endDate) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[#165094] border border-blue-200 font-semibold">
                <Calendar className="w-3 h-3" />
                <span>
                  {startDate && endDate
                    ? `${startDate} til ${endDate}`
                    : startDate
                    ? `Fra ${startDate}`
                    : `Til ${endDate}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="hover:text-blue-900 cursor-pointer"
                  aria-label="Fjern datofilter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Upcoming Win Probability & Form Overview Strip */}
      {tab === 'upcoming' && filteredMatches.length > 0 && (
        <div className="bg-gradient-to-r from-[#0B2545] via-[#165094] to-indigo-900 rounded-xl p-3 sm:p-4 text-white shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-300 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-blue-200">
                    Vinnersjanse & Formindikator
                  </span>
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.2 rounded">
                    FORM & H2H
                  </span>
                </div>
                <p className="text-xs text-blue-100/90 mt-0.5">
                  Beregnet sannsynlighet for hver enkelt kamp basert på siste 5 formkamper, historisk innbyrdes oppgjør (H2H) og tabellposisjon.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-[11px] font-mono font-bold bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 shrink-0">
              <span className="flex items-center gap-1 text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>Bønes favoritt</span>
              </span>
              <span className="text-white/40">•</span>
              <span className="flex items-center gap-1 text-slate-200">
                <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                <span>Uavgjort</span>
              </span>
              <span className="text-white/40">•</span>
              <span className="flex items-center gap-1 text-rose-300">
                <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                <span>Motstander</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Match Content: Either Match Stats Analytics or Match Cards List */}
      {tab === 'stats' ? (
        <MatchStatsAnalyticsView
          matches={localMatches}
          selectedTeamId={selectedTeamId}
          teams={teams}
          onSelectMatch={(match) => {
            setDetailModalMatch(match);
            setIsDetailModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {filteredMatches.length === 0 ? (
            <div className="col-span-full bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
              <Calendar className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-60" />
              <p className="font-semibold">Ingen kamper funnet med gjeldende søk eller filter.</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchOpponent || startDate || endDate
                  ? `Søket etter "${searchOpponent || ''}" ${startDate || endDate ? `i valgt tidsrom` : ''} ga 0 treff.`
                  : 'Prøv å velge "Alle lag" eller nullstill hjemmekamp-filteret.'}
              </p>
              {(searchOpponent || startDate || endDate) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#165094] text-white text-xs font-bold rounded-lg shadow-xs hover:bg-[#0F3A6D] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Tilbakestill søk og filter</span>
                </button>
              )}
            </div>
          ) : (
            filteredMatches.map((match) => (
              <SofascoreMatchCard
                key={match.id}
                match={match}
                isFavorite={false}
                onToggleFavorite={(e) => {
                  e.stopPropagation();
                }}
                onOpenDetail={() => {
                  setDetailModalMatch(match);
                  setIsDetailModalOpen(true);
                }}
                onOpenLineup={() => onViewLineup && onViewLineup(match)}
                onOpenScout={(m) => setScoutModalMatch(m)}
                onOpenReport={(m) => {
                  setLaglederMatch(m);
                  setIsLaglederOpen(true);
                }}
                onOpenPOTM={(m) => {
                  setPotmMatch(m);
                  setIsPotmOpen(true);
                }}
                allMatches={localMatches}
                tables={tables}
                showWinProbability={true}
              />
            ))
          )}
        </div>
      )}

      {/* Del Modal */}
      <MatchShareModal
        match={shareModalMatch}
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareModalMatch(null);
        }}
        onViewDetails={(match) => {
          setDetailModalMatch(match);
          setIsDetailModalOpen(true);
        }}
      />

      {/* Speider Modal */}
      <ScoutReportModal
        match={scoutModalMatch}
        isOpen={!!scoutModalMatch}
        onClose={() => setScoutModalMatch(null)}
      />

      {/* Match Detail Modal */}
      <MatchDetailModal
        match={detailModalMatch}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailModalMatch(null);
        }}
        onOpenLagleder={(m) => {
          setLaglederMatch(m);
          setIsLaglederOpen(true);
        }}
        onSyncMatchEvents={handleScrapeMatchEvents}
        onMatchUpdated={(updated) => {
          setDetailModalMatch(updated);
          setLocalMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          onMatchUpdated?.(updated);
        }}
        onSelectPlayer={onSelectPlayer}
        onViewLineup={onViewLineup}
        allMatches={localMatches}
        divisionTable={detailModalMatch && tables ? tables[detailModalMatch.teamId] : undefined}
      />

      {/* Lagleder Modal */}
      <LaglederModal
        isOpen={isLaglederOpen}
        onClose={() => {
          setIsLaglederOpen(false);
          setLaglederMatch(null);
        }}
        matches={localMatches}
        initialMatch={laglederMatch}
        onReportSuccess={async (updatedMatch) => {
          setLocalMatches((prev) => prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m)));
          if (detailModalMatch?.id === updatedMatch.id) {
            setDetailModalMatch(updatedMatch);
          }
          onMatchUpdated?.(updatedMatch);
          onSyncComplete?.();
        }}
      />

      {/* Player of the Match Modal */}
      {potmMatch && (
        <PlayerOfTheMatchModal
          isOpen={isPotmOpen}
          onClose={() => {
            setIsPotmOpen(false);
            setPotmMatch(null);
          }}
          match={potmMatch}
          onVoteSuccess={(updatedMatch) => {
            setLocalMatches((prev) => prev.map((m) => (m.id === updatedMatch.id ? updatedMatch : m)));
            if (detailModalMatch?.id === updatedMatch.id) {
              setDetailModalMatch(updatedMatch);
            }
            onMatchUpdated?.(updatedMatch);
          }}
        />
      )}
    </div>
  );
};
