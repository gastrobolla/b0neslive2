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
import { PlayerHistoryModal } from './components/PlayerHistoryModal.js';
import { LineupModal } from './components/LineupModal.js';
import { SquadRosterTab } from './components/SquadRosterTab.js';
import { PlayerStatsView } from './components/PlayerStatsView.js';
import { NotificationToast } from './components/NotificationToast.js';
import { NotificationModal } from './components/NotificationModal.js';
import { useMatchNotifications } from './hooks/useMatchNotifications.js';
import { OfflineBanner } from './components/OfflineBanner.js';
import { buildPlayerProfile } from './utils/playerHistory.js';
import {
  calculateTopScorersFromSeasonLog,
  calculateCardsFromSeasonLog,
  recalculateAllPlayerData,
} from './utils/playerStatsCalculator.js';
import { getClubData } from './data/bonesData.js';
import { ALL_BONES_PLAYERS } from './data/bonesSquads.js';
import { calculateClubRatingLeaderboards } from './utils/playerRatingEngine.js';
import { ClubConfig, getClubConfig, listClubConfigs } from './config/clubConfig.js';
import { MatchdayHeroBanner } from './components/MatchdayHeroBanner.js';
import { PlayerOfTheMatchModal } from './components/PlayerOfTheMatchModal.js';
import { LaglederModal } from './components/LaglederModal.js';
import { PlayerRatingsModal } from './components/PlayerRatingsModal.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { PWAControls, PWAHeaderInstallButton } from './components/PWAControls.js';
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
  Palette,
  Star,
  Zap,
  Skull
} from 'lucide-react';


const CACHE_KEY = 'bones_club_data_cache_v4';

export default function App() {
  const [clubId, setClubId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return (params.get('club') || params.get('clubId') || 'bones').toLowerCase();
    }
    return 'bones';
  });

  const [data, setData] = useState<BonesClubData | null>(() => {
    try {
      const cacheKey = `club_data_cache_${clubId}_v4`;
      localStorage.removeItem('bones_club_data_cache');
      const cached = localStorage.getItem(cacheKey) || (clubId === 'bones' ? localStorage.getItem(CACHE_KEY) : null);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.matches) && Array.isArray(parsed.teams) && parsed.teams.length > 0) {
          return recalculateAllPlayerData(parsed, { reason: 'data_fetched' });
        }
      }
    } catch {
      // Ignore localStorage error
    }
    return null;
  });

  const activeClub: ClubConfig = useMemo(() => {
    return data?.clubConfig || getClubConfig(clubId);
  }, [data?.clubConfig, clubId]);
  const [loading, setLoading] = useState(() => !data);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [showFullTeamSelector, setShowFullTeamSelector] = useState(false);
  const [activeTab, setActiveTab] = useState<'livescore' | 'feed' | 'matches' | 'tables' | 'playerstats' | 'scorers' | 'cards' | 'squads' | 'nff'>('livescore');
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

  // Player Ratings Leaderboards Modal state (Beste spiller, Formspiller & Bønes-mareritt)
  const [isRatingsModalOpen, setIsRatingsModalOpen] = useState<boolean>(false);
  const [ratingsModalTab, setRatingsModalTab] = useState<'season' | 'form' | 'nightmare'>('season');

  const handleOpenRatingsModal = (tab: 'season' | 'form' | 'nightmare' = 'season') => {
    setRatingsModalTab(tab);
    setIsRatingsModalOpen(true);
  };

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
      const res = await fetch(`/api/data?clubId=${clubId}`);
      const contentType = res.headers.get('content-type') || '';

      // If server returned non-200 or returned HTML (e.g. warmup.html during server spinup)
      if (!res.ok || !contentType.includes('application/json')) {
        console.warn(`[API] /api/data?clubId=${clubId} returned non-JSON response (status: ${res.status}, type: ${contentType})`);

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
        const freshData = recalculateAllPlayerData(json, { reason: 'data_fetched' });
        setData(freshData);
        setFetchError(null);
        try {
          const cacheKey = `club_data_cache_${clubId}_v4`;
          localStorage.setItem(cacheKey, JSON.stringify(freshData));
        } catch {
          // LocalStorage quota
        }
        return true;
      }
      return false;
    } catch (err: any) {
      console.warn(`[API] Failed to fetch club data for ${clubId}:`, err?.message || err);
      if (retryCount < 5) {
        const delay = Math.min(1000 * Math.pow(1.5, retryCount), 4000);
        setTimeout(() => {
          fetchData(retryCount + 1);
        }, delay);
      } else if (!data) {
        const fallback = recalculateAllPlayerData(getClubData(), { reason: 'data_fetched' });
        setData(fallback);
        setFetchError('Tilkoblingsfeil mot server. Viser lokal klubbdatabase.');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Trigger on-demand real scrape from fotball.no and club website
  const handleRealScrape = async () => {
    setIsRealScraping(true);
    try {
      const res = await fetch(`/api/scrape?clubId=${clubId}`, { method: 'POST' });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const result = await res.json();
        const freshData = recalculateAllPlayerData(result.data, { reason: 'data_fetched' });
        setData(freshData);
        showToast(`Fersk scraping fullført for ${activeClub.name}! Tabeller og kamper er lagret til databasen.`);
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
      const res = await fetch(`/api/scan?clubId=${clubId}`, { method: 'POST' });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const result = await res.json();
        const freshData = recalculateAllPlayerData(result.data, { reason: 'data_fetched' });
        setData(freshData);
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
      const res = await fetch(`/api/scanner-toggle?clubId=${clubId}`, { method: 'POST' });
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
        const res = await fetch(`/api/data/check?clubId=${clubId}`);
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
  }, [clubId]);

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

  // Algorithmic ratings leaderboards for season best and recent form
  // MUST be called before any early returns to respect the Rules of Hooks
  const ratingLeaderboards = useMemo(() => {
    if (!data?.matches) return { bestPlayer: undefined, formPlayer: undefined, topSeasonPlayers: [], topFormPlayers: [] };
    const playersPool = data.players && data.players.length > 0 ? data.players : ALL_BONES_PLAYERS;
    return calculateClubRatingLeaderboards(data.matches, playersPool, data.tables);
  }, [data?.matches, data?.players, data?.tables]);

  // Mobile-first navigation hub category (Kamper, Lag & Tabell, Spillere, NFF)
  // MUST be called before any early returns to respect the Rules of Hooks
  const currentMainCategory = useMemo<'kamper' | 'lag' | 'spillere' | 'nff'>(() => {
    if (activeTab === 'livescore' || activeTab === 'matches' || activeTab === 'feed') return 'kamper';
    if (activeTab === 'tables' || activeTab === 'squads') return 'lag';
    if (activeTab === 'playerstats' || activeTab === 'scorers' || activeTab === 'cards') return 'spillere';
    return 'nff';
  }, [activeTab]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 px-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-blue-900 flex items-center justify-center animate-pulse">
          <Shield className="w-7 h-7 text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold tracking-tight">{activeClub.name} Fotball Live</h2>
          <p className="text-xs text-slate-400 mt-1">Laster persistent klubbdatabase for {activeClub.name}...</p>
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

  const bestSeasonPlayer = (selectedTeamId !== 'all'
    ? ratingLeaderboards.allSeasonRanked.find(p => p.teamId === selectedTeamId)
    : null) || ratingLeaderboards.bestPlayer;
  const bestFormPlayer = (selectedTeamId !== 'all'
    ? ratingLeaderboards.allFormRanked.find(p => p.teamId === selectedTeamId)
    : null) || ratingLeaderboards.formPlayer;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#f4f5f8] text-slate-900 selection:bg-[#165094] selection:text-white theme-matchday">
      
      {/* PWA Lifecycle Controls (Offline Banner, Update Toast, iOS Guide) */}
      <PWAControls />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Bar */}
      <Navbar
        clubConfig={activeClub}
        onSyncNff={handleRealScrape}
        isSyncing={isRealScraping || isScanning}
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
        <ErrorBoundary fallbackTitle="Feil under visning av kampsenteret" onReset={() => setActiveTab('tables')}>
        
        {/* FotMob Club Profile Header */}
        <section id="fotmob-club-header" className="relative overflow-hidden bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
          {/* Dynamic Club Accent Strip */}
          <div
            id="club-header-accent-strip"
            className="absolute top-0 left-0 right-0 h-1"
            style={{
              background: `linear-gradient(to right, ${activeClub.branding?.primaryColor || '#165094'}, ${activeClub.branding?.secondaryColor || '#dc2626'}, ${activeClub.branding?.primaryColor || '#165094'})`
            }}
            title={`${activeClub.name} klubbfarger`}
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Club Crest and Titles */}
            <div className="flex items-center space-x-3.5">
              <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-slate-50 border border-slate-200/90 p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                <img
                  src={activeClub.branding?.logoUrl || '/bones-logo.svg'}
                  alt={activeClub.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/bones-logo.png';
                  }}
                />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {activeClub.name}
                  </h1>
                  {liveMatch && (
                    <span className="flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                      <span>LIVE KAMPER</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5 flex flex-wrap items-center gap-x-2">
                  <span>{activeClub.branding?.homeGrounds?.join(' & ') || 'Hjemmebane'}</span>
                  <span>•</span>
                  <span>Stiftet {activeClub.branding?.foundedYear || 1995}</span>
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

            {/* Header Action Chips */}
            <div className="flex items-center flex-wrap gap-2 shrink-0 self-start sm:self-center">
              {/* Multi-Club Switcher */}
              {listClubConfigs().length > 1 && (
                <div className="relative">
                  <select
                    id="club-selector-dropdown"
                    value={activeClub.id}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setClubId(newId);
                      setSelectedTeamId('all');
                      if (typeof window !== 'undefined') {
                        const url = new URL(window.location.href);
                        url.searchParams.set('club', newId);
                        window.history.pushState({}, '', url.toString());
                      }
                    }}
                    className="flex items-center px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer border border-slate-300"
                    title="Bytt klubb"
                  >
                    {listClubConfigs().map((c) => (
                      <option key={c.id} value={c.id}>
                        ⚽ {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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

              <PWAHeaderInstallButton />

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
            {/* 1. Beste Spiller (Sesongens gjennomsnittsrating) */}
            <div
              id="stat-card-best-player"
              onClick={() => handleOpenRatingsModal('season')}
              className="p-2.5 rounded-xl bg-slate-50/90 hover:bg-amber-50/70 cursor-pointer transition-colors border border-slate-100 hover:border-amber-200 group"
              title="Klikk for å åpne den fullstendige sesongbørsen"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                  <span>Beste spiller</span>
                </span>
                {bestSeasonPlayer && (
                  <div className="flex items-center gap-1">
                    {bestSeasonPlayer.isLive && (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-red-600 text-white animate-pulse">
                        LIVE
                      </span>
                    )}
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                      ★ {(bestSeasonPlayer.seasonAvgRating ?? 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-sm font-black text-slate-900 flex items-center space-x-1.5 mt-0.5 truncate">
                <span className="truncate group-hover:text-amber-800 transition-colors">
                  {bestSeasonPlayer ? bestSeasonPlayer.name : 'Ingen data'}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5 flex items-center justify-between">
                <div className="flex items-center space-x-1 truncate">
                  <span className="font-semibold text-slate-700">{bestSeasonPlayer ? bestSeasonPlayer.position : ''}</span>
                  {bestSeasonPlayer && <span>•</span>}
                  <span>{bestSeasonPlayer ? `${bestSeasonPlayer.matches} kamper` : 'Sesongsnitt'}</span>
                </div>
                <span className="text-[9px] font-bold text-amber-700 group-hover:underline ml-1 shrink-0">
                  Se liste →
                </span>
              </div>
            </div>

            {/* 2. Toppscorer */}
            <div
              onClick={() => setActiveTab('scorers')}
              className="p-2.5 rounded-xl bg-slate-50/90 hover:bg-amber-50/60 cursor-pointer transition-colors border border-slate-100"
            >
              <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Toppscorer</span>
              </span>
              <div className="text-sm font-black text-slate-900 flex items-center space-x-1.5 mt-0.5 truncate">
                <span className="truncate">
                  {clubTopScorer ? `${clubTopScorer.name}` : 'Ingen'}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                {clubTopScorer ? `${clubTopScorer.goals} mål i serien` : '0 mål'}
              </div>
            </div>

            {/* 3. Kortregister */}
            <div
              onClick={() => setActiveTab('cards')}
              className="p-2.5 rounded-xl bg-slate-50/90 hover:bg-yellow-50/60 cursor-pointer transition-colors border border-slate-100"
            >
              <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
                <span>Kortregister</span>
              </span>
              <div className="text-sm font-black text-slate-900 flex items-center space-x-1.5 mt-0.5 truncate">
                <span className="truncate">
                  {mostCarded ? `${mostCarded.name}` : 'Ingen'}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                {mostCarded ? `${mostCarded.yellowCards} gule kort` : 'Ingen kort'}
              </div>
            </div>

            {/* 4. Formspiller (Siste 3 matcher gjennomsnittsrating) */}
            <div
              id="stat-card-form-player"
              onClick={() => handleOpenRatingsModal('form')}
              className="p-2.5 rounded-xl bg-slate-50/90 hover:bg-orange-50/70 cursor-pointer transition-colors border border-slate-100 hover:border-orange-200 group"
              title="Klikk for å åpne det fullstendige formbarometeret"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-orange-500 fill-orange-400 shrink-0" />
                  <span>Formspiller</span>
                </span>
                {bestFormPlayer && (
                  <div className="flex items-center gap-1">
                    {bestFormPlayer.isLive && (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-red-600 text-white animate-pulse">
                        LIVE
                      </span>
                    )}
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-orange-100 text-orange-950 border border-orange-300 font-mono">
                      🔥 {(bestFormPlayer.last3AvgRating ?? 0).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-sm font-black text-slate-900 flex items-center space-x-1.5 mt-0.5 truncate">
                <span className="truncate group-hover:text-orange-800 transition-colors">
                  {bestFormPlayer ? bestFormPlayer.name : 'Ingen data'}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 truncate mt-0.5 flex items-center justify-between">
                <div className="flex items-center space-x-1 truncate">
                  <span className="font-semibold text-slate-700">{bestFormPlayer ? bestFormPlayer.position : ''}</span>
                  {bestFormPlayer && <span>•</span>}
                  <span>
                    {bestFormPlayer
                      ? bestFormPlayer.isLive
                        ? 'Spiller live nå!'
                        : `Siste ${Math.min(3, bestFormPlayer.matches)} matcher`
                      : 'Siste 3'}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-orange-700 group-hover:underline ml-1 shrink-0">
                  Se liste →
                </span>
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

        {/* Navigation Tabs: Mobile-First Main Categories + Subcategories */}
        <section id="navigation-tabs" className="bg-white rounded-2xl p-1.5 sm:p-2 border border-slate-200/90 shadow-2xs space-y-2">
          {/* Main 4 Primary Hubs (Kamper, Lag & Tabell, Spillere, NFF) */}
          <div className="grid grid-cols-4 gap-1 sm:gap-1.5 bg-slate-100/90 p-1 rounded-xl">
            {/* 1. Kamper */}
            <button
              id="main-hub-kamper"
              onClick={() => {
                if (currentMainCategory !== 'kamper') setActiveTab('livescore');
              }}
              className={`flex flex-col sm:flex-row items-center justify-center space-y-0.5 sm:space-y-0 sm:space-x-2 py-2 sm:py-2.5 px-1 sm:px-3 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer relative ${
                currentMainCategory === 'kamper'
                  ? 'bg-[#165094] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <div className="relative flex items-center">
                <Radio className={`w-4 h-4 ${data.matches.some(m => m.status === 'live') ? 'text-red-400 animate-pulse' : ''}`} />
                {data.matches.some(m => m.status === 'live') && (
                  <span className="absolute -top-1 -right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                )}
              </div>
              <span className="truncate">Kamper</span>
            </button>

            {/* 2. Lag & Tabell */}
            <button
              id="main-hub-lag"
              onClick={() => {
                if (currentMainCategory !== 'lag') setActiveTab('tables');
              }}
              className={`flex flex-col sm:flex-row items-center justify-center space-y-0.5 sm:space-y-0 sm:space-x-2 py-2 sm:py-2.5 px-1 sm:px-3 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                currentMainCategory === 'lag'
                  ? 'bg-[#165094] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span className="truncate">Lag & Tabell</span>
            </button>

            {/* 3. Spillere */}
            <button
              id="main-hub-spillere"
              onClick={() => {
                if (currentMainCategory !== 'spillere') setActiveTab('playerstats');
              }}
              className={`flex flex-col sm:flex-row items-center justify-center space-y-0.5 sm:space-y-0 sm:space-x-2 py-2 sm:py-2.5 px-1 sm:px-3 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                currentMainCategory === 'spillere'
                  ? 'bg-[#165094] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="truncate">Spillere</span>
            </button>

            {/* 4. NFF Hub */}
            <button
              id="main-hub-nff"
              onClick={() => {
                if (currentMainCategory !== 'nff') setActiveTab('nff');
              }}
              className={`flex flex-col sm:flex-row items-center justify-center space-y-0.5 sm:space-y-0 sm:space-x-2 py-2 sm:py-2.5 px-1 sm:px-3 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                currentMainCategory === 'nff'
                  ? 'bg-[#165094] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span className="truncate">NFF Hub</span>
            </button>
          </div>

          {/* Subcategory Pills for Active Hub */}
          <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none pt-1 px-0.5 pb-0.5">
            {/* SUB-TABS: KAMPER */}
            {currentMainCategory === 'kamper' && (
              <>
                <button
                  id="sub-tab-livescore"
                  onClick={() => setActiveTab('livescore')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'livescore'
                      ? 'bg-blue-50 text-[#165094] border border-blue-200 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Radio className={`w-3.5 h-3.5 ${data.matches.some(m => m.status === 'live') ? 'text-red-500 animate-pulse' : ''}`} />
                  <span>Kamper & Livescore</span>
                  {data.matches.some(m => m.status === 'live') && (
                    <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                      {data.matches.filter(m => m.status === 'live').length} LIVE
                    </span>
                  )}
                </button>

                <button
                  id="sub-tab-matches"
                  onClick={() => setActiveTab('matches')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'matches'
                      ? 'bg-blue-50 text-[#165094] border border-blue-200 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Terminliste</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    activeTab === 'matches' ? 'bg-[#165094] text-white' : 'bg-slate-200/80 text-slate-700'
                  }`}>
                    {data.matches.length}
                  </span>
                </button>

                <button
                  id="sub-tab-feed"
                  onClick={() => setActiveTab('feed')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'feed'
                      ? 'bg-blue-50 text-[#165094] border border-blue-200 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Live Feed / Nyheter</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    activeTab === 'feed' ? 'bg-[#165094] text-white' : 'bg-slate-200/80 text-slate-700'
                  }`}>
                    {data.feed?.length || 0}
                  </span>
                </button>
              </>
            )}

            {/* SUB-TABS: LAG & TABELL */}
            {currentMainCategory === 'lag' && (
              <>
                <button
                  id="sub-tab-tables"
                  onClick={() => setActiveTab('tables')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'tables'
                      ? 'bg-blue-50 text-[#165094] border border-blue-200 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Serietabell</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    activeTab === 'tables' ? 'bg-[#165094] text-white' : 'bg-slate-200/80 text-slate-700'
                  }`}>
                    {Object.keys(data.tables).length}
                  </span>
                </button>

                <button
                  id="sub-tab-squads"
                  onClick={() => setActiveTab('squads')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'squads'
                      ? 'bg-blue-50 text-[#165094] border border-blue-200 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tropp & Spillere</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    activeTab === 'squads' ? 'bg-[#165094] text-white' : 'bg-slate-200/80 text-slate-700'
                  }`}>
                    {data.teams.length} lag
                  </span>
                </button>
              </>
            )}

            {/* SUB-TABS: SPILLERE */}
            {currentMainCategory === 'spillere' && (
              <>
                <button
                  id="sub-tab-playerstats"
                  onClick={() => setActiveTab('playerstats')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'playerstats'
                      ? 'bg-blue-50 text-[#165094] border border-blue-200 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Award className="w-3.5 h-3.5 text-[#165094]" />
                  <span>Spillerstatistikk</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    activeTab === 'playerstats' ? 'bg-[#165094] text-white' : 'bg-slate-200/80 text-slate-700'
                  }`}>
                    315
                  </span>
                </button>

                <button
                  id="sub-tab-scorers"
                  onClick={() => setActiveTab('scorers')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'scorers'
                      ? 'bg-blue-50 text-[#165094] border border-blue-200 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Toppscorere</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    activeTab === 'scorers' ? 'bg-[#165094] text-white' : 'bg-slate-200/80 text-slate-700'
                  }`}>
                    {derivedTopScorers.length}
                  </span>
                </button>

                <button
                  id="sub-tab-cards"
                  onClick={() => setActiveTab('cards')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === 'cards'
                      ? 'bg-blue-50 text-[#165094] border border-blue-200 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5 text-yellow-600" />
                  <span>Kort & Soning</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    activeTab === 'cards' ? 'bg-[#165094] text-white' : 'bg-slate-200/80 text-slate-700'
                  }`}>
                    {derivedCards.length}
                  </span>
                </button>

                <button
                  id="sub-tab-ratings"
                  onClick={() => handleOpenRatingsModal('season')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 shadow-2xs"
                  title="Åpne rangeringslister for Beste Spiller og Formspiller"
                >
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  <span>Børs & Form</span>
                </button>

                <button
                  id="sub-tab-nightmares"
                  onClick={() => handleOpenRatingsModal('nightmare')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 shadow-2xs"
                  title={`Se motstandere og måltyver som har scoret mot ${activeClub.shortName}`}
                >
                  <Skull className="w-3.5 h-3.5 text-purple-600" />
                  <span>{activeClub.shortName}-mareritt</span>
                </button>
              </>
            )}

            {/* SUB-TABS: NFF */}
            {currentMainCategory === 'nff' && (
              <div className="flex items-center space-x-2 text-xs font-medium text-slate-600 py-0.5 px-1">
                <span className="font-bold text-[#165094] flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  NFF FIKS Integrasjon:
                </span>
                <span>Offisiell kampdata, serietabeller og troppsregistreringer fra fotball.no</span>
              </div>
            )}
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
            matches={data.matches}
            tables={data.tables}
            selectedTeamId={selectedTeamId === 'all' || selectedTeamId === 'herrer-a' ? 'menn-1' : selectedTeamId}
            onSelectTeamId={(id) => setSelectedTeamId(id)}
            onSelectPlayer={handleSelectPlayer}
          />
        )}

        {activeTab === 'scorers' && (
          <TopScorersView
            topScorers={derivedTopScorers}
            matches={data.matches}
            tables={data.tables}
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

        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer id="app-footer" className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-red-500" />
            <span className="font-bold text-white">{activeClub.name} Fotball</span>
            <span>•</span>
            <span>Hjemmebane: {activeClub.branding?.homeGrounds?.join(' / ') || 'Hjemmebane'}</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <span>Kilder: fotball.no & NFF Hordaland</span>
          </div>
        </div>
      </footer>

      {/* Modals and Overlays wrapped in ErrorBoundary */}
      <ErrorBoundary fallbackTitle="Kunne ikke vise vinduet" onReset={() => {
        setIsLineupModalOpen(false);
        setIsRatingsModalOpen(false);
        setIsPotmModalOpen(false);
        setIsLaglederModalOpen(false);
        setSelectedPlayerName(null);
      }}>
        {/* Match Lineup / Lagoppstilling Modal */}
        <LineupModal
          match={lineupMatch}
          isOpen={isLineupModalOpen}
          onClose={() => setIsLineupModalOpen(false)}
          onSelectPlayer={handleSelectPlayer}
          allMatches={data.matches}
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
                const nextMatches = prev.matches.map((m) => (m.id === updated.id ? updated : m));
                const nextData: BonesClubData = {
                  ...prev,
                  matches: nextMatches,
                };
                return recalculateAllPlayerData(nextData, {
                  finishedMatchId: updated.id,
                  reason: updated.status === 'finished' ? 'match_finished' : 'manual',
                });
              });
              showToast(msg);
            }}
          />
        )}

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

        {/* Player Ratings Leaderboards Modal (Beste spiller, Formspiller & Bønes-mareritt) */}
        <PlayerRatingsModal
          isOpen={isRatingsModalOpen}
          onClose={() => setIsRatingsModalOpen(false)}
          initialTab={ratingsModalTab}
          initialTeamId={selectedTeamId}
          matches={data.matches}
          players={data.players && data.players.length > 0 ? data.players : ALL_BONES_PLAYERS}
          teams={data.teams}
          tables={data.tables}
          onSelectPlayer={(name, teamId) => {
            handleSelectPlayer(name, teamId);
          }}
        />

        {/* Player History Modal - Always on top when opened from any view or modal */}
        {activePlayerProfile && (
          <PlayerHistoryModal
            player={activePlayerProfile}
            allMatches={data.matches}
            onClose={() => setSelectedPlayerName(null)}
            onSelectTeam={(teamId) => {
              setSelectedPlayerName(null);
              setIsRatingsModalOpen(false);
              setIsLineupModalOpen(false);
              setSelectedTeamId(teamId);
              setActiveTab('tables');
            }}
          />
        )}
      </ErrorBoundary>

      {/* Floating Goal / Match Event Toast */}
      <NotificationToast
        notification={activeToast}
        onDismiss={dismissToast}
        onOpenMatch={(matchId) => {
          const m = data.matches.find(x => x.id === matchId);
          if (m) handleViewLineup(m);
        }}
      />

    </div>
  );
}

