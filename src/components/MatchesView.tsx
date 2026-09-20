import React, { useState, useEffect } from 'react';
import { Match, MatchEvent, DivisionTable } from '../types.js';
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
  Copy
} from 'lucide-react';
import { MatchShareModal, copyToClipboard, getMatchShareUrl } from './MatchShareModal.js';
import { MatchDetailModal } from './MatchDetailModal.js';
import { SofascoreMatchCard } from './SofascoreMatchCard.js';
import { ScoutReportModal } from './ScoutReportModal.js';

interface MatchesViewProps {
  matches: Match[];
  selectedTeamId: string;
  tables?: Record<string, DivisionTable>;
  onMatchUpdated?: (updatedMatch: Match) => void;
  onSyncComplete?: () => void;
  onSelectPlayer?: (playerName: string, teamId?: string) => void;
  onViewLineup?: (match: Match) => void;
}

export const MatchesView: React.FC<MatchesViewProps> = ({
  matches,
  selectedTeamId,
  tables,
  onMatchUpdated,
  onSyncComplete,
  onSelectPlayer,
  onViewLineup,
}) => {
  const [onlyHomeMatches, setOnlyHomeMatches] = useState(false);
  const [seasonFilter, setSeasonFilter] = useState<'all' | 'host' | 'var'>('all');
  const [tab, setTab] = useState<'upcoming' | 'finished'>('upcoming');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [loadingMatchId, setLoadingMatchId] = useState<string | null>(null);
  const [isScrapingAll, setIsScrapingAll] = useState(false);
  const [scrapeSuccessMsg, setScrapeSuccessMsg] = useState<string | null>(null);
  const [localMatches, setLocalMatches] = useState<Match[]>(matches);

  // Share and Detail modal state
  const [shareModalMatch, setShareModalMatch] = useState<Match | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [detailModalMatch, setDetailModalMatch] = useState<Match | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [scoutModalMatch, setScoutModalMatch] = useState<Match | null>(null);
  const [copiedMatchId, setCopiedMatchId] = useState<string | null>(null);

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

  // Filter and sort matches: closest in time first for upcoming, most recent first for finished
  const filteredMatches = localMatches
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
      return true;
    })
    .sort((a, b) => {
      if (tab === 'upcoming') {
        return (a.date + a.time).localeCompare(b.date + b.time);
      }
      if (tab === 'finished') {
        return (b.date + b.time).localeCompare(a.date + a.time);
      }
      return (a.date + a.time).localeCompare(b.date + b.time);
    });

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
            <span>Siste resultater</span>
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
              tab === 'finished' ? 'bg-[#2E6C29] text-green-100' : 'bg-slate-200 text-slate-700'
            }`}>
              {localMatches.filter(m => m.status === 'finished').length}
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

        {/* Home Match Filter Highlight Toggle */}
        <div className="flex items-center space-x-2">
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

      {/* Match Cards List (Standardized Sofascore Design) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {filteredMatches.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            <Calendar className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-60" />
            <p className="font-semibold">Ingen kamper funnet med gjeldende filter.</p>
            <p className="text-xs text-slate-400 mt-1">Prøv å velge "Alle lag" eller nullstill hjemmekamp-filteret.</p>
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
            />
          ))
        )}
      </div>

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
    </div>
  );
};
