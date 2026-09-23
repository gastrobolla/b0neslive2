import React, { useState, useEffect, useMemo } from 'react';
import { BonesClubData, Match } from './types.js';
import { Navbar } from './components/Navbar.js';
import { LiveTickerBanner } from './components/LiveTickerBanner.js';
import { TeamSelector, SparklineTrend, getTeamForm } from './components/TeamSelector.js';
import { MatchesView } from './components/MatchesView.js';
import { TablesView } from './components/TablesView.js';
import { TopScorersView } from './components/TopScorersView.js';
import { CardsView } from './components/CardsView.js';
import { LiveFeedView } from './components/LiveFeedView.js';
import { LivescoreDashboard } from './components/LivescoreDashboard.js';
import { NffHubView } from './components/NffHubView.js';
import { ScannerStatusDrawer } from './components/ScannerStatusDrawer.js';
import { AiAnalysisModal } from './components/AiAnalysisModal.js';
import { PlayerHistoryModal } from './components/PlayerHistoryModal.js';
import { LineupModal } from './components/LineupModal.js';
import { SquadRosterTab } from './components/SquadRosterTab.js';
import { PlayerStatsView } from './components/PlayerStatsView.js';
import { NotificationToast } from './components/NotificationToast.js';
import { NotificationModal } from './components/NotificationModal.js';
import { useMatchNotifications } from './hooks/useMatchNotifications.js';
import { OfflineBanner } from './components/OfflineBanner.js';
import { buildPlayerProfile } from './utils/playerHistory.js';
import { calculateTopScorersFromSeasonLog, calculateCardsFromSeasonLog } from './utils/playerStatsCalculator.js';
import { getClubData } from './data/bonesData.js';
import { MatchdayHeroBanner } from './components/MatchdayHeroBanner.js';
import { PlayerOfTheMatchModal } from './components/PlayerOfTheMatchModal.js';
import { LaglederModal } from './components/LaglederModal.js';
import {
  Calendar,
  Trophy,
  Flame,
  Scale,
  Shield,
  Home,
  CheckCircle2,
  AlertTriangle,
  Radio,
  RefreshCw,
  ExternalLink,
  MapPin,
  Clock,
  Activity,
  Database,
  Users,
  Bell,
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Filter,
  Palette
} from 'lucide-react';


export default function App() {
  const [data, setData] = useState<BonesClubData | null>(() => {
    try {
      const cached = localStorage.getItem('bones_club_data_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.matches) && Array.isArray(parsed.teams) && parsed.teams.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore localStorage error
    }
    return null;
  });
  const [loading, setLoading] = useState(() => !data);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [showFullTeamSelector, setShowFullTeamSelector] = useState(false);
  const [activeTab, setActiveTab] = useState<'livescore' | 'feed' | 'matches' | 'tables' | 'playerstats' | 'scorers' | 'cards' | 'squads' | 'nff'>('livescore');
  const [isScannerDrawerOpen, setIsScannerDrawerOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isRealScraping, setIsRealScraping] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Match notifications engine (browser notifications + Web Audio synthesize chime + toasts)
  const {
    settings: notifSettings,
    updateSettings: updateNotifSettings,
    notifications,
    unreadCount,
    markAllAsRead,
    clearHistory: clearNotifHistory,
    activeToast,
    dismissToast,
    testNotification,
    requestPermission: requestNotifPermission,
  } = useMatchNotifications(data?.matches || []);

  // Lineup modal state
  const [lineupMatch, setLineupMatch] = useState<Match | null>(null);
  const [isLineupModalOpen, setIsLineupModalOpen] = useState<boolean>(false);

  const handleViewLineup = (match: Match) => {
    setLineupMatch(match);
    setIsLineupModalOpen(true);
  };

  // Player history modal state
  const [selectedPlayerName, setSelectedPlayerName] = useState<string | null>(null);
  const [selectedPlayerTeamId, setSelectedPlayerTeamId] = useState<string | undefined>(undefined);

  const activePlayerProfile = useMemo(() => {
    if (!selectedPlayerName || !data) return null;
    return buildPlayerProfile(selectedPlayerName, selectedPlayerTeamId, data);
  }, [selectedPlayerName, selectedPlayerTeamId, data]);

  const handleSelectPlayer = (playerName: string, teamId?: string) => {
    setSelectedPlayerName(playerName);
    setSelectedPlayerTeamId(teamId);
  };

  // Player of the match modal state
  const [potmModalMatch, setPotmModalMatch] = useState<Match | null>(null);
  const [isPotmModalOpen, setIsPotmModalOpen] = useState(false);

  // Lagleder live reporter modal state
  const [isLaglederModalOpen, setIsLaglederModalOpen] = useState(false);
  const [laglederMatch, setLaglederMatch] = useState<Match | null>(null);

  const handleOpenPOTM = (match: Match) => {
    setPotmModalMatch(match);
    setIsPotmModalOpen(true);
  };

  // Show temporary toast message
  const showToast = (msg: string) => {

    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Fetch full data from backend with safe content-type verification and auto-retry
  const fetchData = async (retryCount = 0): Promise<boolean> => {
    try {
      const res = await fetch('/api/bones/data');
      const contentType = res.headers.get('content-type') || '';

      // If server returned non-200 or returned HTML (e.g. warmup.html during server spinup)
      if (!res.ok || !contentType.includes('application/json')) {
        console.warn(`[API] /api/bones/data returned non-JSON response (status: ${res.status}, type: ${contentType})`);

        // Auto-retry up to 5 times while server is warming up
        if (retryCount < 5) {
          const delay = Math.min(1000 * Math.pow(1.5, retryCount), 4000);
          setTimeout(() => {
            fetchData(retryCount + 1);
          }, delay);
          return false;
        }

        // Retries exhausted: fallback to bundled club database if no data present
        if (!data) {
          const fallback = getClubData();
          setData(fallback);
          setFetchError('Klarte ikke å koble til sanntidsserver. Viser lokal klubbdatabase.');
        }
        return false;
      }

      const json: BonesClubData = await res.json();
      if (json && Array.isArray(json.matches)) {
        setData(json);
        setFetchError(null);
        try {
          localStorage.setItem('bones_club_data_cache', JSON.stringify(json));
        } catch {
          // LocalStorage quota
        }
        return true;
      }
      return false;
    } catch (err: any) {
      console.warn('[API] Failed to fetch Bønes club data:', err?.message || err);
      if (retryCount < 5) {
        const delay = Math.min(1000 * Math.pow(1.5, retryCount), 4000);
        setTimeout(() => {
          fetchData(retryCount + 1);
        }, delay);
      } else if (!data) {
        const fallback = getClubData();
        setData(fallback);
        setFetchError('Tilkoblingsfeil mot server. Viser lokal klubbdatabase.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Trigger on-demand real scrape from fotball.no and bonesil.no
  const handleRealScrape = async () => {
    setIsRealScraping(true);
    try {
      const res = await fetch('/api/bones/scrape-real', { method: 'POST' });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const result = await res.json();
        setData(result.data);
        showToast('Fersk scraping fullført! Alle 16 Bønes-lag, tabeller og kamper er lagret til databasen.');
      } else {
        showToast('Kunne ikke fullføre scraping akkurat nå.');
      }
    } catch (err) {
      showToast('Nettverksfeil under scraping.');
    } finally {
      setIsRealScraping(false);
    }
  };

  // Trigger manual scan
  const handleManualScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/bones/scan', { method: 'POST' });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const result = await res.json();
        setData(result.data);
        showToast('NFF-kontroll fullført! Resultater og tabeller er oppdatert.');
      } else {
        showToast('Kunne ikke fullføre manuell skanning akkurat nå.');
      }
    } catch (err) {
      showToast('Kunne ikke fullføre manuell skanning akkurat nå.');
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle auto-scan
  const handleToggleAutoScan = async () => {
    try {
      const res = await fetch('/api/bones/scanner-toggle', { method: 'POST' });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const result = await res.json();
        fetchData();
        showToast(`Autoskanner satt til ${result.autoScanEnabled ? 'PÅ' : 'AV'}.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle URL deep linking (tab and match params) on initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const matchParam = params.get('match');
      const tabParam = params.get('tab');
      if (matchParam) {
        setActiveTab('matches');
      } else if (tabParam && ['livescore', 'feed', 'matches', 'tables', 'playerstats', 'scorers', 'cards', 'squads', 'nff'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  // Real data polling: Fetches real updates from FIKS every 3 minutes (180,000ms)
  useEffect(() => {
    fetchData();

    let lastKnownVersion = 0;

    const checkInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/bones/data/check');
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.includes('application/json')) {
          const check = await res.json();
          // If data version increased or active match window is ongoing, pull full data
          if (check.dataVersion !== lastKnownVersion || check.activeMatchWindow) {
            lastKnownVersion = check.dataVersion;
            fetchData();
          }
        }
      } catch (err) {
        // Fallback fetch
        fetchData();
      }
    }, 180000); // 3 minutes (180,000 ms) as specified for real FIKS live updates

    return () => clearInterval(checkInterval);
  }, []);

  // Derive scorers and cards directly from the season log matches (single source of truth)
  // MUST be called before any early returns to respect the Rules of Hooks
  const derivedTopScorers = useMemo(() => {
    if (!data) return [];
    return calculateTopScorersFromSeasonLog(data);
  }, [data]);

  const derivedCards = useMemo(() => {
    if (!data) return [];
    return calculateCardsFromSeasonLog(data);
  }, [data]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 px-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-blue-900 flex items-center justify-center animate-pulse">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold tracking-tight">Bønes IL Fotball Live</h2>
          <p className="text-xs text-slate-400 mt-1">Laster persistent klubbdatabase for alle 16 lag...</p>
        </div>
        <RefreshCw className="w-5 h-5 text-red-500 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 px-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Kunne ikke koble til serveren</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-md">
            Sanntidsserveren starter opp eller svarte med ugyldig format. Klikk nedenfor for å prøve igjen eller åpne lokal database.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setLoading(true);
              fetchData(0);
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-md flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Prøv igjen nå</span>
          </button>
          <button
            onClick={() => {
              const fallback = getClubData();
              setData(fallback);
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg cursor-pointer transition-colors border border-slate-700"
          >
            Bruk lokal database
          </button>
        </div>
      </div>
    );
  }

  // Ongoing live match
  const liveMatch = data.matches.find(m => m.status === 'live');

  const clubTopScorer = derivedTopScorers[0] || data.topScorers[0];
  const mostCarded = derivedCards[0] || data.cards[0];
  const upcomingHomeCount = data.matches.filter(m => m.isHome && m.status !== 'finished').length;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#f4f5f8] text-slate-900 selection:bg-[#165094] selection:text-white theme-matchday">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Bar */}
      <Navbar
        scanner={data.scanner}
        onSyncNff={handleRealScrape}
        isSyncing={isRealScraping || isScanning}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenScannerDrawer={() => setIsScannerDrawerOpen(true)}
        onOpenNotifications={() => {
          setIsNotificationModalOpen(true);
          markAllAsRead();
        }}
        unreadNotificationCount={unreadCount}
        hasLiveMatch={Boolean(liveMatch)}
      />


      {/* Network & Offline Status Banner */}
      <OfflineBanner
        isRealData={true}
        lastUpdated={data.lastRealScraped}
        isScrapingNow={isRealScraping}
        onRefresh={handleRealScrape}
      />

      {/* Live Match Ticker Banner (Always visible if live match is active) */}
      <LiveTickerBanner liveMatch={liveMatch} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
        
        {/* FotMob Club Profile Header */}
        <section id="fotmob-club-header" className="relative overflow-hidden bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
          {/* Bønes ILs lagfarger: diskré aksentlinje (Kongeblå & Rød) */}
          <div
            id="bones-club-header-accent-strip"
            className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#165094] via-[#dc2626] to-[#165094]"
            title="Bønes IL klubbfarger: Kongeblå & Rød"
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Club Crest and Titles */}
            <div className="flex items-center space-x-3.5">
              <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-slate-50 border border-slate-200/90 p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                <img
                  src="/bones-logo.svg"
                  alt="Bønes IL"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/bones-logo.png';
                  }}
                />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Bønes IL
                  </h1>
                  {/* Bønes IL Club Colors Sub-badge */}
                  <span
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                    title="Bønes IL offisielle klubbfarger"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#165094]"></span>
                    <span className="w-2 h-2 rounded-full bg-[#dc2626]"></span>
                    <span className="font-semibold text-slate-600">Blå & Rød</span>
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#165094] border border-blue-200">
                    16 lag
                  </span>
                  {liveMatch ? (
                    <span className="flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                      <span>LIVE KAMPER</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      NFF Hordaland
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5 flex flex-wrap items-center gap-x-2">
                  <span>Fjellsdalen & Bønesbanen</span>
                  <span>•</span>
                  <span>Stiftet 1995</span>
                  {data.lastRealScraped && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                        <span>Sist synket: {data.lastRealScraped.split(' ')[1] || data.lastRealScraped}</span>
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* FotMob Header Action Chips */}
            <div className="flex items-center flex-wrap gap-2 shrink-0 self-start sm:self-center">
              <div
                id="badge-matchday-design"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-900 to-[#165094] text-white text-xs font-bold shadow-2xs border border-blue-800"
                title="Design: Matchday Fjellsdalen"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Matchday Fjellsdalen</span>
              </div>

              <button
                id="btn-fotmob-notifications"
                onClick={() => {
                  setIsNotificationModalOpen(true);
                  markAllAsRead();
                }}

                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
                title="Mål- og kampstartvarsler"
              >
                <Bell className="w-3.5 h-3.5 text-slate-700" />
                <span>Varsler</span>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full font-mono">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                id="btn-fotmob-ai-rapport"
                onClick={() => setIsAiModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
                title="Åpne AI Kampsenter Analyse"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>AI-analyse</span>
              </button>

              <button
                id="btn-fotmob-sync"
                onClick={handleRealScrape}
                disabled={isRealScraping}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isRealScraping
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-[#165094] hover:bg-[#12427a] text-white shadow-xs'
                }`}
                title="Hent ferskeste data fra fotball.no"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRealScraping ? 'animate-spin' : ''}`} />
                <span>{isRealScraping ? 'Synker...' : 'Oppdater'}</span>
              </button>
            </div>
          </div>

          {/* FotMob Subtle Stats Strip */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div
              onClick={() => setActiveTab('livescore')}
              className="p-2.5 rounded-xl bg-slate-50/90 hover:bg-blue-50/60 cursor-pointer transition-colors border border-slate-100"
            >
              <span className="text-[11px] text-slate-500 font-medium">Kommende kamper</span>
              <div className="text-sm font-black text-slate-900 flex items-center space-x-1.5 mt-0.5">
                <Home className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{upcomingHomeCount} hjemmekamper</span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('scorers')}
              className="p-2.5 rounded-xl bg-slate-50/90 hover:bg-amber-50/60 cursor-pointer transition-colors border border-slate-100"
            >
              <span className="text-[11px] text-slate-500 font-medium">Toppscorer</span>
              <div className="text-sm font-black text-slate-900 flex items-center space-x-1.5 mt-0.5 truncate">
                <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">
                  {clubTopScorer ? `${clubTopScorer.name} (${clubTopScorer.goals} mål)` : 'Ingen'}
                </span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('cards')}
              className="p-2.5 rounded-xl bg-slate-50/90 hover:bg-yellow-50/60 cursor-pointer transition-colors border border-slate-100"
            >
              <span className="text-[11px] text-slate-500 font-medium">Kortregister</span>
              <div className="text-sm font-black text-slate-900 flex items-center space-x-1.5 mt-0.5 truncate">
                <Scale className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
                <span className="truncate">
                  {mostCarded ? `${mostCarded.name} (${mostCarded.yellowCards}🟨)` : 'Ingen'}
                </span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('tables')}
              className="p-2.5 rounded-xl bg-slate-50/90 hover:bg-indigo-50/60 cursor-pointer transition-colors border border-slate-100"
            >
              <span className="text-[11px] text-slate-500 font-medium">Serier i NFF</span>
              <div className="text-sm font-black text-slate-900 flex items-center space-x-1.5 mt-0.5">
                <Trophy className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{Object.keys(data.tables).length} tabeller</span>
              </div>
            </div>
          </div>
        </section>

        {/* FotMob Clean Team Filter Bar */}
        <section id="fotmob-team-filter-bar" className="bg-white rounded-xl p-2.5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 shrink-0 hidden sm:inline">
                Lag:
              </span>
              
              {/* Alle 16 lag Pill */}
              <button
                id="team-pill-quick-all"
                onClick={() => setSelectedTeamId('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedTeamId === 'all'
                    ? 'bg-[#165094] text-white selected-pill-glow font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Alle lag ({data.teams.length})
              </button>

              {/* Popular Team Quick Pills */}
              {data.teams.slice(0, 8).map((team) => {
                const isSelected = selectedTeamId === team.id;
                const prev = team.previousRank;
                const trend = team.rankTrend || (prev !== undefined ? (team.currentRank < prev ? 'up' : team.currentRank > prev ? 'down' : 'same') : undefined);
                const diff = prev !== undefined && prev !== team.currentRank ? Math.abs(prev - team.currentRank) : 0;
                const form = getTeamForm(team, data.tables, data.matches);
                return (
                  <button
                    key={team.id}
                    id={`team-pill-quick-${team.id}`}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1.5 ${
                      isSelected
                        ? 'bg-[#165094] text-white font-bold selected-pill-glow'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium'
                    }`}
                  >
                    <span>{team.shortName}</span>
                    <span className={`text-[10px] font-mono px-1 py-0.5 rounded flex items-center space-x-0.5 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/90 text-slate-700'
                    }`}>
                      <span>#{team.currentRank}</span>
                      {trend === 'up' && (
                        <span
                          className={`font-black text-[9px] leading-none ${isSelected ? 'text-emerald-300' : 'text-emerald-600'}`}
                          title={`Opp ${diff} plass${diff > 1 ? 'er' : ''} på tabellen (fra #${prev} til #${team.currentRank})`}
                        >
                          ▲
                        </span>
                      )}
                      {trend === 'down' && (
                        <span
                          className={`font-black text-[9px] leading-none ${isSelected ? 'text-rose-300' : 'text-rose-600'}`}
                          title={`Ned ${diff} plass${diff > 1 ? 'er' : ''} på tabellen (fra #${prev} til #${team.currentRank})`}
                        >
                          ▼
                        </span>
                      )}
                    </span>
                    <SparklineTrend form={form} isSelected={isSelected} />
                  </button>
                );
              })}

              {/* Toggle full team picker */}
              <button
                id="btn-toggle-full-team-picker"
                onClick={() => setShowFullTeamSelector(!showFullTeamSelector)}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-[#165094] whitespace-nowrap cursor-pointer transition-colors border border-slate-200"
              >
                <span>{showFullTeamSelector ? 'Skjul alle lag' : `Flere lag (${data.teams.length})`}</span>
                {showFullTeamSelector ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Active filter badge reset */}
            {selectedTeamId !== 'all' && (
              <button
                onClick={() => setSelectedTeamId('all')}
                className="flex items-center space-x-1 text-xs font-bold text-red-600 hover:text-red-700 px-2 py-1 rounded-md bg-red-50 hover:bg-red-100 shrink-0 cursor-pointer transition-colors"
                title="Vis alle lag"
              >
                <span>Nullstill filter</span>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Expandable full categorized team selector */}
          {showFullTeamSelector && (
            <div className="mt-3 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
              <TeamSelector
                teams={data.teams}
                selectedTeamId={selectedTeamId}
                onSelectTeam={(id) => {
                  setSelectedTeamId(id);
                }}
                tables={data.tables}
                matches={data.matches}
              />
            </div>
          )}
        </section>

        {/* FotMob Navigation Tabs */}
        <section id="navigation-tabs" className="bg-white rounded-xl p-1 border border-slate-200/90 shadow-2xs overflow-x-auto scrollbar-none">
          <div className="flex items-center space-x-1 min-w-max">
            
            {/* Tab 1: Kamper / Livescore */}
            <button
              id="main-tab-livescore"
              onClick={() => setActiveTab('livescore')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'livescore'
                  ? 'bg-[#165094] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Radio className={`w-4 h-4 ${data.matches.some(m => m.status === 'live') ? 'text-red-400 animate-pulse' : ''}`} />
              <span>Kamper</span>
              {data.matches.some(m => m.status === 'live') && (
                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                  {data.matches.filter(m => m.status === 'live').length} LIVE
                </span>
              )}
            </button>

            {/* Tab 2: Terminliste */}
            <button
              id="main-tab-matches"
              onClick={() => setActiveTab('matches')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'matches'
                  ? 'bg-[#165094] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Terminliste</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'matches' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {data.matches.length}
              </span>
            </button>

            {/* Tab 3: Tabell */}
            <button
              id="main-tab-tables"
              onClick={() => setActiveTab('tables')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'tables'
                  ? 'bg-[#165094] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Tabell</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'tables' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {Object.keys(data.tables).length}
              </span>
            </button>

            {/* Tab 4: Toppscorere */}
            <button
              id="main-tab-scorers"
              onClick={() => setActiveTab('scorers')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'scorers'
                  ? 'bg-[#165094] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Toppscorere</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'scorers' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {derivedTopScorers.length}
              </span>
            </button>

            {/* Tab 5: Kort & Soning */}
            <button
              id="main-tab-cards"
              onClick={() => setActiveTab('cards')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'cards'
                  ? 'bg-[#165094] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>Kort & Soning</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'cards' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {derivedCards.length}
              </span>
            </button>

            {/* Tab 6: Spillerstatistikk */}
            <button
              id="main-tab-playerstats"
              onClick={() => setActiveTab('playerstats')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'playerstats'
                  ? 'bg-[#165094] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Spillerstatistikk</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'playerstats' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                315
              </span>
            </button>

            {/* Tab 7: Tropp */}
            <button
              id="main-tab-squads"
              onClick={() => setActiveTab('squads')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'squads'
                  ? 'bg-[#165094] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Tropp</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'squads' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {data.teams.length}
              </span>
            </button>

            {/* Tab 8: Siste nytt */}
            <button
              id="main-tab-feed"
              onClick={() => setActiveTab('feed')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'feed'
                  ? 'bg-[#165094] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Siste nytt</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                activeTab === 'feed' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {data.feed?.length || 0}
              </span>
            </button>

            {/* Tab 9: NFF Hub */}
            <button
              id="main-tab-nff"
              onClick={() => setActiveTab('nff')}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'nff'
                  ? 'bg-[#165094] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>NFF Hub</span>
            </button>

          </div>
        </section>

        {/* Matchday Fjellsdalen Arena Hero (Permanent og eneste design) */}
        <MatchdayHeroBanner
          matches={data.matches}
          onOpenMatch={(m) => handleViewLineup(m)}
          onOpenPOTM={(m) => handleOpenPOTM(m)}
        />

        {/* View Panes */}
        {activeTab === 'livescore' && (
          <LivescoreDashboard
            data={data}
            onRefreshData={fetchData}
            onSelectPlayer={handleSelectPlayer}
            onViewLineup={handleViewLineup}
            onOpenPOTM={(m) => handleOpenPOTM(m)}
          />
        )}


        {activeTab === 'feed' && (
          <LiveFeedView
            feed={data.feed || []}
            matches={data.matches || []}
            selectedTeamId={selectedTeamId}
            onManualScan={handleManualScan}
            isScanning={isScanning}
            scanner={data.scanner}
            onOpenPOTM={(m) => handleOpenPOTM(m)}
          />
        )}

        {activeTab === 'matches' && (
          <MatchesView
            matches={data.matches}
            selectedTeamId={selectedTeamId}
            teams={data.teams}
            tables={data.tables}
            onSyncComplete={fetchData}
            onSelectPlayer={handleSelectPlayer}
            onViewLineup={handleViewLineup}
            onMatchUpdated={(updatedMatch) => {
              setData(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  matches: prev.matches.map(m => m.id === updatedMatch.id ? updatedMatch : m)
                };
              });
            }}
          />
        )}

        {activeTab === 'tables' && (
          <TablesView
            tables={data.tables}
            teams={data.teams}
            matches={data.matches}
            selectedTeamId={selectedTeamId}
            onSelectTeam={(id) => setSelectedTeamId(id)}
            onSelectMatch={(match) => handleViewLineup(match)}
          />
        )}

        {activeTab === 'playerstats' && (
          <PlayerStatsView
            data={data}
            selectedTeamId={selectedTeamId}
            onSelectTeam={(id) => setSelectedTeamId(id)}
            onSelectPlayer={handleSelectPlayer}
          />
        )}

        {activeTab === 'squads' && (
          <SquadRosterTab
            teams={data.teams}
            selectedTeamId={selectedTeamId === 'all' || selectedTeamId === 'herrer-a' ? 'menn-1' : selectedTeamId}
            onSelectTeamId={(id) => setSelectedTeamId(id)}
            onSelectPlayer={handleSelectPlayer}
          />
        )}

        {activeTab === 'scorers' && (
          <TopScorersView
            topScorers={derivedTopScorers}
            matches={data.matches}
            teams={data.teams}
            selectedTeamId={selectedTeamId}
            onSelectPlayer={handleSelectPlayer}
            onSyncRealData={handleRealScrape}
            isSyncing={isRealScraping}
          />
        )}

        {activeTab === 'cards' && (
          <CardsView
            cards={derivedCards}
            matches={data.matches}
            teams={data.teams}
            selectedTeamId={selectedTeamId}
            onSelectPlayer={handleSelectPlayer}
            onSyncRealData={handleRealScrape}
            isSyncing={isRealScraping}
          />
        )}

        {activeTab === 'nff' && (
          <NffHubView
            teams={data.teams}
            selectedTeamId={selectedTeamId}
            onSelectTeam={(id) => setSelectedTeamId(id)}
            onRealScrape={handleRealScrape}
            isRealScraping={isRealScraping}
            lastRealScraped={data.lastRealScraped}
            dailyScrapeSchedule={data.dailyScrapeSchedule}
          />
        )}

      </main>

      {/* Footer */}
      <footer id="app-footer" className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-red-500" />
            <span className="font-bold text-white">Bønes Idrettslag Fotball</span>
            <span>•</span>
            <span>Hjemmebane: Fjellsdalen idrettsplass / Bønesbanen</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping"></span>
              <span>Sanntidsskanner operativ</span>
            </span>
            <span>Kilder: fotball.no & NFF Hordaland</span>
          </div>
        </div>
      </footer>

      {/* Scanner Status Drawer */}
      <ScannerStatusDrawer
        isOpen={isScannerDrawerOpen}
        onClose={() => setIsScannerDrawerOpen(false)}
        scanner={data.scanner}
        onManualScan={handleManualScan}
        isScanning={isScanning}
        onToggleAutoScan={handleToggleAutoScan}
      />

      {/* AI Analysis Modal */}
      <AiAnalysisModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />

      {/* Player History Modal */}
      {activePlayerProfile && (
        <PlayerHistoryModal
          player={activePlayerProfile}
          onClose={() => setSelectedPlayerName(null)}
          onSelectTeam={(teamId) => {
            setSelectedTeamId(teamId);
            setActiveTab('tables');
          }}
        />
      )}

      {/* Match Lineup / Lagoppstilling Modal */}
      <LineupModal
        match={lineupMatch}
        isOpen={isLineupModalOpen}
        onClose={() => setIsLineupModalOpen(false)}
        onSelectPlayer={handleSelectPlayer}
      />

      {/* Floating Goal / Match Event Toast */}
      <NotificationToast
        notification={activeToast}
        onDismiss={dismissToast}
        onOpenMatch={(matchId) => {
          const m = data.matches.find(x => x.id === matchId);
          if (m) handleViewLineup(m);
        }}
      />

      {/* Realtime Notification Settings & Alerts Modal */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        settings={notifSettings}
        onUpdateSettings={updateNotifSettings}
        notifications={notifications}
        onClearHistory={clearNotifHistory}
        onTestNotification={testNotification}
        onRequestPermission={requestNotifPermission}
        onOpenMatch={(matchId) => {
          const m = data.matches.find(x => x.id === matchId);
          if (m) handleViewLineup(m);
        }}
      />

      {/* Player of the Match Modal (Algorating + Publikum live-stemmer) */}
      {potmModalMatch && (
        <PlayerOfTheMatchModal
          isOpen={isPotmModalOpen}
          onClose={() => {
            setIsPotmModalOpen(false);
            setPotmModalMatch(null);
          }}
          match={potmModalMatch}
          onVoteSuccess={(updated) => {
            setData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                matches: prev.matches.map((m) => (m.id === updated.id ? updated : m))
              };
            });
            showToast(`Stemme registrert på Banens Beste i ${updated.homeTeam} vs ${updated.awayTeam}!`);
          }}
        />
      )}

      {/* Lagleder Modal for Match Events */}
      {isLaglederModalOpen && (
        <LaglederModal
          isOpen={isLaglederModalOpen}
          onClose={() => {
            setIsLaglederModalOpen(false);
            setLaglederMatch(null);
          }}
          matches={data.matches}
          initialMatch={laglederMatch || undefined}
          players={data.teams.flatMap((t) => t.players)}
          onReportSuccess={(updated, msg) => {
            setData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                matches: prev.matches.map((m) => (m.id === updated.id ? updated : m))
              };
            });
            showToast(msg);
          }}
        />
      )}

    </div>
  );
}

