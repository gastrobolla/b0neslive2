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

      {/* Match Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMatches.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            <Calendar className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-60" />
            <p className="font-semibold">Ingen kamper funnet med gjeldende filter.</p>
            <p className="text-xs text-slate-400 mt-1">Prøv å velge "Alle lag" eller nullstill hjemmekamp-filteret.</p>
          </div>
        ) : (
          filteredMatches.map((match) => {
            const isLive = match.status === 'live';
            const isHome = match.isHome;
            const isExpanded = expandedMatchId === match.id;
            const hasEvents = match.events && match.events.length > 0;
            const isLoadingEvents = loadingMatchId === match.id;

            return (
              <div
                key={match.id}
                id={`match-card-${match.id}`}
                className={`relative rounded-xl transition-all overflow-hidden border ${
                  isLive
                    ? 'bg-white border-[#165094] ring-2 ring-[#165094]/30 shadow-md'
                    : isHome
                    ? 'bg-gradient-to-b from-[#F0F6FC] to-white border-[#165094]/30 ring-1 ring-[#165094]/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                
                {/* Home Match Top Highlight Banner */}
                {isHome && (
                  <div className="bg-gradient-to-r from-[#165094] to-[#0F3A6D] text-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Home className="w-3.5 h-3.5 text-emerald-300" />
                      <span>HJEMMEKAMP</span>
                    </div>
                    <span className="text-[10px] font-medium bg-black/30 px-2 py-0.2 rounded truncate max-w-[200px]">
                      {match.venue}
                    </span>
                  </div>
                )}

                <div className="p-4 space-y-3">
                  
                  {/* Division & Round Meta */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-600 font-medium">
                      <span className="font-bold text-[#165094]">{match.teamName}</span>
                      <span>•</span>
                      <span className="text-slate-500">{match.division}</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {match.division?.toLowerCase().includes('høst') && (
                        <span className="bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded text-[10px] border border-amber-300/60">
                          🍂 Høst
                        </span>
                      )}
                      {match.division?.toLowerCase().includes('vår') && (
                        <span className="bg-emerald-100 text-emerald-900 font-bold px-1.5 py-0.5 rounded text-[10px] border border-emerald-300/60">
                          🌸 Vår
                        </span>
                      )}
                      <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[11px]">
                        {match.round}
                      </span>
                      {isLive && (
                        <span className="bg-[#165094] text-white font-extrabold px-2 py-0.5 rounded text-[11px] flex items-center space-x-1 animate-pulse">
                          <Radio className="w-3 h-3 text-emerald-300" />
                          <span>LIVE {match.currentMinute}'</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Match Teams & Score */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                    
                    {/* Home Team */}
                    <div className="flex-1 text-center sm:text-left">
                      <p className={`font-bold text-sm sm:text-base ${
                        match.homeTeam.includes('Bønes') ? 'text-[#165094]' : 'text-slate-800'
                      }`}>
                        {match.homeTeam}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {match.homeTeam.includes('Bønes') ? 'Bønes IL (Hjemme)' : 'Hjemmelag'}
                      </p>
                    </div>

                    {/* Score or VS */}
                    <div className="px-4 py-1.5 text-center">
                      {match.status === 'upcoming' ? (
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-mono font-bold text-slate-400">VS</span>
                          <span className="text-[11px] font-semibold text-[#165094] bg-[#F0F6FC] px-2 py-0.5 rounded mt-0.5">
                            {match.time}
                          </span>
                        </div>
                      ) : (
                        <div className="bg-[#0B2545] text-white px-3 py-1 rounded-lg font-mono font-extrabold text-base tracking-wider shadow-inner">
                          {match.homeScore} - {match.awayScore}
                        </div>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="flex-1 text-center sm:text-right">
                      <p className={`font-bold text-sm sm:text-base ${
                        match.awayTeam.includes('Bønes') ? 'text-[#165094]' : 'text-slate-800'
                      }`}>
                        {match.awayTeam}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {match.awayTeam.includes('Bønes') ? 'Bønes IL (Borte)' : 'Bortelag'}
                      </p>
                    </div>

                  </div>

                  {/* Venue & Date Footer */}
                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 border-t border-slate-100">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-700">
                        {new Date(match.date).toLocaleDateString('no-NO', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                      <span>kl. {match.time}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <MapPin className={`w-3.5 h-3.5 ${isHome ? 'text-[#165094]' : 'text-slate-400'}`} />
                      <span className={`font-medium ${isHome ? 'font-bold text-[#165094]' : 'text-slate-600'}`}>
                        {match.venue}
                      </span>
                    </div>
                  </div>

                  {/* Referee info if present */}
                  {match.referee && (
                    <p className="text-[11px] text-slate-400 italic">
                      Dommer: {match.referee}
                    </p>
                  )}

                  {/* Kamphendelser Section (under kamper som er listet opp) */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200/80">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        onClick={() => setExpandedMatchId(isExpanded ? null : match.id)}
                        className="flex items-center space-x-1.5 text-xs font-bold text-[#165094] hover:text-[#0F3A6D] transition-colors"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>Kamphendelser ({match.events?.length || 0})</span>
                        {match.events && match.events.length > 0 && (
                          <span className="flex items-center space-x-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            <span>⚽ {match.events.filter(e => e.type === 'goal').length}</span>
                            <span>•</span>
                            <span>🟨 {match.events.filter(e => e.type === 'yellow_card' || e.type === 'red_card').length}</span>
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <div className="flex items-center space-x-1.5">
                        {/* Del kamp (Web Share API & direktelenke) */}
                        <button
                          id={`btn-share-match-${match.id}`}
                          onClick={() => {
                            setShareModalMatch(match);
                            setIsShareModalOpen(true);
                          }}
                          className="flex items-center space-x-1 px-2.5 py-1.2 rounded-lg text-xs font-bold bg-[#F0F6FC] hover:bg-blue-100 text-[#165094] border border-[#165094]/30 shadow-2xs transition-all active:scale-95 cursor-pointer"
                          title="Del kampinformasjon eller kopier direktelenke"
                        >
                          <Share2 className="w-3.5 h-3.5 text-[#165094]" />
                          <span>Del</span>
                        </button>

                        {/* Hurtigkopier direktelenke */}
                        <button
                          id={`btn-quickcopy-match-${match.id}`}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const url = getMatchShareUrl(match);
                            const success = await copyToClipboard(url);
                            if (success) {
                              setCopiedMatchId(match.id);
                              setTimeout(() => setCopiedMatchId(null), 2500);
                            }
                          }}
                          className={`p-1.5 rounded-lg border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                            copiedMatchId === match.id
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                          title={copiedMatchId === match.id ? 'Direktelenke kopiert!' : 'Kopier direktelenke til utklippstavle'}
                        >
                          {copiedMatchId === match.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </button>

                        {onViewLineup && (
                          <button
                            onClick={() => onViewLineup(match)}
                            className="flex items-center space-x-1 px-2.5 py-1.2 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs transition-all active:scale-95 cursor-pointer"
                            title="Se lagoppstilling og taktikk for Bønes"
                          >
                            <span>⚽ Oppstilling</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleScrapeMatchEvents(match)}
                          disabled={isLoadingEvents}
                          className="flex items-center space-x-1.5 px-3 py-1.2 rounded-lg text-xs font-bold bg-blue-50/80 hover:bg-blue-100 text-[#165094] border border-blue-200 shadow-2xs transition-all active:scale-95"
                          title="Henter scoringer og kort fra fotball.no og oppdaterer toppscorere og disiplinærtabeller"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEvents ? 'animate-spin text-[#165094]' : 'text-blue-600'}`} />
                          <span>{isLoadingEvents ? 'Synker...' : 'NFF-synk'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Expandable or Default Events List */}
                    {isExpanded && (
                      <div className="mt-2.5 bg-slate-50/90 rounded-xl p-3 border border-slate-200 space-y-2.5">
                        {match.lastUpdatedSource && (
                          <div className="flex items-center justify-between text-[10px] text-slate-500 bg-white/80 px-2.5 py-1 rounded-md border border-slate-200/70">
                            <span>Kilde: <strong className="text-slate-800 font-semibold">{match.lastUpdatedSource === 'lagleder' ? 'Innrapportert hendelse' : 'Offisiell NFF fotball.no'}</strong></span>
                            {match.lastUpdatedAt && <span>Synket: {match.lastUpdatedAt}</span>}
                          </div>
                        )}

                        {hasEvents ? (
                          <div className="space-y-1.5">
                            {match.events!.map((ev) => (
                              <div
                                key={ev.id}
                                className="flex items-start justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs hover:border-blue-200 transition-colors"
                              >
                                <div className="flex items-start space-x-2">
                                  <span className="font-mono font-bold text-slate-800 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                                    {ev.minute}'
                                  </span>
                                  <span>
                                    {ev.type === 'goal'
                                      ? '⚽'
                                      : ev.type === 'yellow_card'
                                      ? '🟨'
                                      : ev.type === 'red_card'
                                      ? '🟥'
                                      : '🔄'}
                                  </span>
                                  <div>
                                    <div className="flex items-center space-x-1.5">
                                      {ev.player ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectPlayer?.(ev.player!, match.teamId);
                                          }}
                                          className="font-bold text-[#165094] hover:text-[#0B2545] hover:underline text-left cursor-pointer transition-colors"
                                          title="Klikk for å åpne spillerprofil & statistikk"
                                        >
                                          {ev.player}
                                        </button>
                                      ) : (
                                        <p className="font-semibold text-slate-800">
                                          {ev.team}
                                        </p>
                                      )}
                                      {ev.source === 'lagleder' ? (
                                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded">
                                          ⭐ Lagleder {ev.reportedBy ? `(${ev.reportedBy})` : ''}
                                        </span>
                                      ) : (
                                        <span className="text-[9px] bg-blue-50 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                                          NFF
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      {ev.description}
                                    </p>
                                  </div>
                                </div>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                  ev.team.includes('Bønes')
                                    ? 'bg-blue-100 text-[#165094]'
                                    : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {ev.team}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-3 text-xs text-slate-500 space-y-2">
                            <p>Ingen kamphendelser registrert i kampskjemaet hos NFF ennå.</p>
                            <div className="flex items-center justify-center">
                              <button
                                onClick={() => handleScrapeMatchEvents(match)}
                                className="text-xs font-bold text-[#165094] hover:underline inline-flex items-center space-x-1"
                              >
                                <RefreshCw className="w-3 h-3 text-[#165094]" />
                                <span>Kjør NFF-sjekk for denne kampen</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })
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
