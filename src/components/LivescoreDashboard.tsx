import React, { useState, useEffect, useMemo } from 'react';
import { Match, QuickCategoryFilter, BonesClubData, DivisionTable } from '../types.js';
import {
  Radio,
  Clock,
  Calendar,
  MapPin,
  RefreshCw,
  Filter,
  CheckCircle2,
  ChevronRight,
  Shield,
  Activity,
  Home,
  WifiOff,
  Sparkles,
  Award,
  Star,
  Search,
  ChevronLeft,
  Share2,
  BarChart2,
  Columns2,
  Layers,
  Trophy
} from 'lucide-react';
import { MatchDetailModal } from './MatchDetailModal.js';
import { LaglederModal } from './LaglederModal.js';
import { SofascoreMatchCard } from './SofascoreMatchCard.js';
import { ScoutReportModal } from './ScoutReportModal.js';
import { DualLiveView } from './DualLiveView.js';
import { PlayerOfTheMatchModal } from './PlayerOfTheMatchModal.js';

interface LivescoreDashboardProps {
  data: BonesClubData;
  onRefreshData?: () => Promise<void>;
  onSelectPlayer?: (playerName: string, teamId?: string) => void;
  onViewLineup?: (match: Match) => void;
  onOpenPOTM?: (match: Match) => void;
}

export const LivescoreDashboard: React.FC<LivescoreDashboardProps> = ({
  data,
  onRefreshData,
  onSelectPlayer,
  onViewLineup,
  onOpenPOTM,
}) => {
  const [activeStatusTab, setActiveStatusTab] = useState<'all' | 'live' | 'upcoming' | 'finished' | 'home' | 'favorites' | 'potm'>('all');
  const [quickFilter, setQuickFilter] = useState<QuickCategoryFilter>('all');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [potmMatch, setPotmMatch] = useState<Match | null>(null);
  const [isPotmOpen, setIsPotmOpen] = useState(false);

  
  // Favorites stored in localStorage
  const [favoriteTeamIds, setFavoriteTeamIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('bones_sofascore_favorites');
      return saved ? JSON.parse(saved) : ['g14-1', 'menn-1'];
    } catch {
      return ['g14-1', 'menn-1'];
    }
  });

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isLaglederModalOpen, setIsLaglederModalOpen] = useState<boolean>(false);
  const [laglederMatch, setLaglederMatch] = useState<Match | null>(null);
  const [scoutMatch, setScoutMatch] = useState<Match | null>(null);

  // Simultaneous matches detection (matches on same date and time)
  const concurrentSlots = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of data.matches) {
      const key = `${m.date} ${m.time}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries())
      .filter(([_, list]) => list.length >= 2)
      .map(([slotKey, matches]) => ({
        slotKey,
        date: matches[0].date,
        time: matches[0].time,
        matches,
      }))
      .sort((a, b) => a.slotKey.localeCompare(b.slotKey));
  }, [data.matches]);

  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [dualViewMode, setDualViewMode] = useState<'dual' | 'cards'>('dual');
  const [dualMatch1Override, setDualMatch1Override] = useState<Match | null>(null);
  const [dualMatch2Override, setDualMatch2Override] = useState<Match | null>(null);

  // Polling and "seconds ago" timer
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Tick seconds ago timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFavorite = (teamId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavoriteTeamIds((prev) => {
      const next = prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId];
      try {
        localStorage.setItem('bones_sofascore_favorites', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Tab counter totals matching current search, category and team filters
  const totalCounts = useMemo(() => {
    const base = data.matches.filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchString = `${m.homeTeam} ${m.awayTeam} ${m.division} ${m.venue} ${m.teamName}`.toLowerCase();
        if (!matchString.includes(q)) return false;
      }
      if (quickFilter === 'gutter') {
        const cat = (m.category || '').toLowerCase();
        const isGutt = cat.includes('ungdom') && (m.teamName.toLowerCase().includes('g') || m.teamId.startsWith('g'));
        if (!isGutt) return false;
      } else if (quickFilter === 'jenter') {
        const isJente = m.teamName.toLowerCase().includes('j') || m.teamId.startsWith('j');
        if (!isJente) return false;
      } else if (quickFilter === 'senior') {
        const cat = (m.category || '').toLowerCase();
        const isSenior = cat === 'senior' || m.teamId.includes('menn') || m.teamId.includes('bones-1');
        if (!isSenior) return false;
      }
      if (selectedTeamId !== 'all' && m.teamId !== selectedTeamId) return false;
      return true;
    });

    return {
      all: base.length,
      live: base.filter((m) => m.status === 'live').length,
      upcoming: base.filter((m) => m.status === 'upcoming').length,
      finished: base.filter((m) => m.status === 'finished').length,
      home: base.filter((m) => m.isHome).length,
      favorites: base.filter((m) => favoriteTeamIds.includes(m.teamId)).length,
      potm: base.filter((m) => m.status === 'finished' || m.status === 'live').length,
    };
  }, [data.matches, searchQuery, quickFilter, selectedTeamId, favoriteTeamIds]);

  // Filter and sort matches: sorted strictly on kampdato (NOT on team)
  const filteredMatches = useMemo(() => {
    const list = data.matches.filter((m) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchString = `${m.homeTeam} ${m.awayTeam} ${m.division} ${m.venue} ${m.teamName}`.toLowerCase();
        if (!matchString.includes(q)) return false;
      }

      // Category filter
      if (quickFilter === 'gutter') {
        const cat = (m.category || '').toLowerCase();
        const isGutt = cat.includes('ungdom') && (m.teamName.toLowerCase().includes('g') || m.teamId.startsWith('g'));
        if (!isGutt) return false;
      } else if (quickFilter === 'jenter') {
        const isJente = m.teamName.toLowerCase().includes('j') || m.teamId.startsWith('j');
        if (!isJente) return false;
      } else if (quickFilter === 'senior') {
        const cat = (m.category || '').toLowerCase();
        const isSenior = cat === 'senior' || m.teamId.includes('menn') || m.teamId.includes('bones-1');
        if (!isSenior) return false;
      }

      // Specific team filter
      if (selectedTeamId !== 'all' && m.teamId !== selectedTeamId) {
        return false;
      }

      // Status tab filter
      if (activeStatusTab === 'live' && m.status !== 'live') return false;
      if (activeStatusTab === 'upcoming' && m.status !== 'upcoming') return false;
      if (activeStatusTab === 'finished' && m.status !== 'finished') return false;
      if (activeStatusTab === 'home' && !m.isHome) return false;
      if (activeStatusTab === 'favorites' && !favoriteTeamIds.includes(m.teamId)) return false;
      if (activeStatusTab === 'potm' && m.status !== 'finished' && m.status !== 'live') return false;

      return true;
    });

    // Sortering på KAMPFØLGE / DATO (ikke lag):
    // For kommende kamper: kamper som kommer nærmest i tid skal vises først (stigende dato + tid)
    // For ferdige kamper: nyligst spilte kamper vises først (synkende dato + tid)
    return list.sort((a, b) => {
      if (activeStatusTab === 'upcoming') {
        return (a.date + a.time).localeCompare(b.date + b.time);
      }
      if (activeStatusTab === 'finished') {
        return (b.date + b.time).localeCompare(a.date + a.time);
      }

      // For 'all', 'home', 'favorites', 'live':
      // 1. Live kamper øverst
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (b.status === 'live' && a.status !== 'live') return 1;

      // 2. Begge er kommende: nærmest i tid først
      if (a.status === 'upcoming' && b.status === 'upcoming') {
        return (a.date + a.time).localeCompare(b.date + b.time);
      }
      // 3. Begge er ferdige: nyligst spilte først
      if (a.status === 'finished' && b.status === 'finished') {
        return (b.date + b.time).localeCompare(a.date + a.time);
      }
      // 4. Kommende kamper før ferdigspilte kamper
      if (a.status === 'upcoming' && b.status === 'finished') return -1;
      if (a.status === 'finished' && b.status === 'upcoming') return 1;

      return (a.date + a.time).localeCompare(b.date + b.time);
    });
  }, [data.matches, searchQuery, quickFilter, selectedTeamId, activeStatusTab, favoriteTeamIds]);

  // Group into categories
  const liveMatches = useMemo(() => {
    return data.matches.filter((m) => m.status === 'live');
  }, [data.matches]);

  const upcomingMatches = useMemo(() => {
    return filteredMatches
      .filter((m) => m.status === 'upcoming')
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [filteredMatches]);

  const finishedMatches = useMemo(() => {
    return filteredMatches
      .filter((m) => m.status === 'finished')
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [filteredMatches]);

  const favoriteMatches = useMemo(() => {
    return data.matches.filter((m) => favoriteTeamIds.includes(m.teamId));
  }, [data.matches, favoriteTeamIds]);

  const homeMatchesCount = useMemo(() => {
    return data.matches.filter((m) => m.isHome).length;
  }, [data.matches]);

  // Real data polling: Fetches real updates from FIKS every 3 minutes (180,000ms) when live, or 3 mins standard
  useEffect(() => {
    // 3 minutes (180,000 ms) as specified for real FIKS live updates
    const pollIntervalMs = 180000;

    const interval = setInterval(async () => {
      if (onRefreshData && navigator.onLine) {
        try {
          await onRefreshData();
          setSecondsAgo(0);
        } catch {
          // silently handle network stutter
        }
      }
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [liveMatches.length, onRefreshData]);

  const handleManualRefresh = async () => {
    if (!onRefreshData || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefreshData();
      setSecondsAgo(0);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenMatchDetail = (m: Match) => {
    setSelectedMatch(m);
    setIsDetailModalOpen(true);
  };

  const handleOpenLagleder = (m: Match) => {
    setLaglederMatch(m);
    setIsLaglederModalOpen(true);
  };

  const handleSyncMatchEvents = async (m: Match) => {
    const res = await fetch(`/api/bones/match/${m.id}/events`, { method: 'POST' });
    if (res.ok) {
      const result = await res.json();
      if (result.match) {
        setSelectedMatch(result.match);
      }
      if (onRefreshData) await onRefreshData();
    }
  };

  // Format date header for FotMob style group headers
  const formatDateHeader = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    try {
      const d = new Date(`${dateStr}T12:00:00`);
      const weekday = d.toLocaleDateString('no-NO', { weekday: 'long' });
      const dayMonth = d.toLocaleDateString('no-NO', { day: 'numeric', month: 'long' });
      const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);

      if (dateStr === today) return `I dag • ${capitalizedWeekday} ${dayMonth}`;
      if (dateStr === tomorrow) return `I morgen • ${capitalizedWeekday} ${dayMonth}`;
      if (dateStr === yesterday) return `I går • ${capitalizedWeekday} ${dayMonth}`;

      return `${capitalizedWeekday} ${dayMonth}`;
    } catch {
      return dateStr;
    }
  };

  // Group matches strictly by date (kampdato) - FotMob style (NOT grouped by team)
  const matchesByDate = useMemo(() => {
    const groups: Record<string, Match[]> = {};
    filteredMatches.forEach((m) => {
      const dateKey = m.date;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(m);
    });
    // Ensure kickoff time ordering inside each match day
    Object.values(groups).forEach((list) => {
      list.sort((a, b) => a.time.localeCompare(b.time));
    });
    return groups;
  }, [filteredMatches]);

  return (
    <div id="livescore-dashboard" className="space-y-4 pb-12">
      {/* Offline banner */}
      {isOffline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 rounded-xl font-medium text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>Frakoblet internett. Viser lagrede data fra enheten.</span>
          </div>
        </div>
      )}

      {/* FotMob Clean Search & Quick Filter Bar */}
      <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Søk lag (f.eks. G14, Senior), motstander eller bane..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:border-[#165094] focus:ring-1 focus:ring-[#165094] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 font-semibold px-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Refresh Action */}
          <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
            <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
              {secondsAgo < 5 ? 'Synket' : `${secondsAgo}s siden`}
            </span>
            <button
              id="livescore-refresh-btn"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
              title="Oppdater kampsenter"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#165094]' : ''}`} />
              <span>{isRefreshing ? 'Oppdaterer...' : 'Oppdater'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sofascore Status Tabs: Live står først, Alle flyttes til etter Favoritter */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none w-full sm:w-auto">
          {/* 1. Live står først */}
          <button
            id="tab-status-live"
            onClick={() => setActiveStatusTab('live')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center space-x-1.5 ${
              activeStatusTab === 'live'
                ? liveMatches.length > 0 ? 'bg-red-600 text-white shadow-xs' : 'bg-slate-900 text-white shadow-xs'
                : liveMatches.length > 0 ? 'text-red-600 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {liveMatches.length > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
            <span>Live ({totalCounts.live})</span>
          </button>

          {/* 2. Kommende */}
          <button
            id="tab-status-upcoming"
            onClick={() => setActiveStatusTab('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeStatusTab === 'upcoming'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Kommende ({totalCounts.upcoming})
          </button>

          {/* 3. Ferdige */}
          <button
            id="tab-status-finished"
            onClick={() => setActiveStatusTab('finished')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeStatusTab === 'finished'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Ferdige ({totalCounts.finished})
          </button>

          {/* 4. Hjemmekamper */}
          <button
            id="tab-status-home"
            onClick={() => setActiveStatusTab('home')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center space-x-1 ${
              activeStatusTab === 'home'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Hjemmekamper ({totalCounts.home})</span>
          </button>

          {/* 5. Favoritter */}
          <button
            id="tab-status-favorites"
            onClick={() => setActiveStatusTab('favorites')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center space-x-1 ${
              activeStatusTab === 'favorites'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>Favoritter ({totalCounts.favorites})</span>
          </button>

          {/* Banens Beste (POTM Spillerbørs & Kåring) */}
          <button
            id="tab-status-potm"
            onClick={() => setActiveStatusTab('potm')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center space-x-1.5 ${
              activeStatusTab === 'potm'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-xs'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-600" />
            <span>Banens Beste ({totalCounts.potm})</span>
          </button>

          {/* 6. Alle flyttes til etter Favoritter & Banens Beste */}
          <button
            id="tab-status-all"
            onClick={() => setActiveStatusTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeStatusTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Alle ({totalCounts.all})
          </button>
        </div>

        {/* Category filters (Gutter, Jenter, Senior) */}
        <div className="flex items-center space-x-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-between sm:justify-end">
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-[11px] font-bold">
            <button
              onClick={() => setQuickFilter('all')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                quickFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setQuickFilter('gutter')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                quickFilter === 'gutter' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Gutter
            </button>
            <button
              onClick={() => setQuickFilter('jenter')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                quickFilter === 'jenter' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Jenter
            </button>
            <button
              onClick={() => setQuickFilter('senior')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                quickFilter === 'senior' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Senior
            </button>
          </div>

          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:ring-1 focus:ring-[#165094]"
          >
            <option value="all">Alle 16 lag</option>
            {data.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SECTION 1: 🔴 LIVE MATCHES HERO (Sofascore Live Center & DualView) */}
      {liveMatches.length > 0 && activeStatusTab !== 'finished' && activeStatusTab !== 'upcoming' && (
        <section id="section-live-matches" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </span>
              <h2 className="text-sm font-black uppercase tracking-wider text-red-600">
                PÅGÅENDE KAMPER NÅ ({liveMatches.length})
              </h2>
              {liveMatches.length >= 2 && (
                <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  ⚡ Samtidige kamper
                </span>
              )}
            </div>

            {liveMatches.length >= 2 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setDualViewMode(dualViewMode === 'dual' ? 'cards' : 'dual')}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 flex items-center space-x-1.5 cursor-pointer shadow-2xs transition-all"
                >
                  <Columns2 className="w-3.5 h-3.5 text-[#165094]" />
                  <span>{dualViewMode === 'dual' ? 'Bytt til enkeltkort' : 'Vis i DualView'}</span>
                </button>
              </div>
            )}
          </div>

          {/* If 2 or more live matches and DualView is active */}
          {liveMatches.length >= 2 && dualViewMode === 'dual' ? (
            <DualLiveView
              match1={dualMatch1Override || liveMatches[0]}
              match2={dualMatch2Override || liveMatches[1]}
              allConcurrentMatches={liveMatches}
              onSelectMatch1={(m) => setDualMatch1Override(m)}
              onSelectMatch2={(m) => setDualMatch2Override(m)}
              onOpenDetail={(m) => handleOpenMatchDetail(m)}
              onOpenLineup={(m) => onViewLineup && onViewLineup(m)}
              onOpenLagleder={(m) => handleOpenLagleder(m)}
              onOpenPOTM={(m) => {
                if (onOpenPOTM) onOpenPOTM(m);
                else {
                  setPotmMatch(m);
                  setIsPotmOpen(true);
                }
              }}
              favoriteTeamIds={favoriteTeamIds}
              onToggleFavorite={(teamId, e) => toggleFavorite(teamId, e)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {liveMatches.map((m) => (
                <SofascoreMatchCard
                  key={m.id}
                  match={m}
                  isFavorite={favoriteTeamIds.includes(m.teamId)}
                  onToggleFavorite={(e) => toggleFavorite(m.teamId, e)}
                  onOpenDetail={() => handleOpenMatchDetail(m)}
                  onOpenLineup={() => onViewLineup && onViewLineup(m)}
                  onOpenScout={(matchToScout) => setScoutMatch(matchToScout)}
                  onOpenReport={(matchToReport) => handleOpenLagleder(matchToReport)}
                  onOpenPOTM={(matchToVote) => {
                    if (onOpenPOTM) onOpenPOTM(matchToVote);
                    else {
                      setPotmMatch(matchToVote);
                      setIsPotmOpen(true);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* SECTION 2: MATCHES LIST GROUPED BY DIVISION OR LIVE DUALVIEW */}
      {filteredMatches.length === 0 ? (
        activeStatusTab === 'live' && liveMatches.length === 0 ? (
          <div className="space-y-4">
            {/* Live Center Status Box */}
            <div className="bg-white rounded-2xl p-6 text-center border border-slate-200/90 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Ingen kamper spilles akkurat nå
              </h3>
              <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
                Her i Live-kampsenteret aktiveres sanntidsoppdateringer automatisk når kamper starter.
                Nedenfor vises alle <strong>samtidige kamper</strong> med felles avspark, klare for <strong>DualView</strong>.
              </p>
            </div>

            {/* Samtidige kamper og DualView seksjon ("Om Det er flere kamper som er samtidig, så kan de listes opp og man viser en dualview på liveview") */}
            {concurrentSlots.length > 0 && (
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#165094]"></span>
                      <h4 className="text-sm font-black text-slate-900 tracking-tight">
                        Samtidige kamper (Parallellkamper)
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#165094]">
                        {concurrentSlots.length} tidspunkter funnet
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Velg et kamptidspunkt under for å liste opp kampene og se dem side-om-side i DualView.
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveStatusTab('all')}
                    className="self-start sm:self-auto px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Vis alle kamper
                  </button>
                </div>

                {/* Slot Selector Pills */}
                <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none pb-1">
                  {concurrentSlots.slice(0, 10).map((slot, idx) => {
                    const isSelected = selectedSlotIndex === idx;
                    return (
                      <button
                        key={slot.slotKey}
                        onClick={() => {
                          setSelectedSlotIndex(idx);
                          setDualMatch1Override(null);
                          setDualMatch2Override(null);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center space-x-1.5 ${
                          isSelected
                            ? 'bg-[#165094] text-white shadow-xs ring-2 ring-[#165094]/40'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{slot.date} kl. {slot.time}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {slot.matches.length} kamper
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Current Slot Info & Matches Listing */}
                {(() => {
                  const currentSlot = concurrentSlots[selectedSlotIndex] || concurrentSlots[0];
                  if (!currentSlot) return null;
                  const dualM1 = dualMatch1Override || currentSlot.matches[0];
                  const dualM2 = dualMatch2Override || currentSlot.matches[1];

                  return (
                    <div className="space-y-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/90 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                            <Layers className="w-3.5 h-3.5 text-[#165094]" />
                            <span>Avspark {currentSlot.date} kl. {currentSlot.time} ({currentSlot.matches.length} samtidige kamper):</span>
                          </span>
                          <span className="text-[11px] text-[#165094] font-bold">DualView klargjort</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {currentSlot.matches.map((m, idx) => {
                            const isBeingCompared = m.id === dualM1?.id || m.id === dualM2?.id;
                            return (
                              <div
                                key={m.id}
                                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                                  isBeingCompared
                                    ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300'
                                    : 'bg-white border-slate-200'
                                }`}
                              >
                                <div className="truncate pr-2">
                                  <div className="font-bold text-slate-900 truncate">{m.teamName}</div>
                                  <div className="text-slate-600 font-medium truncate">vs {m.isHome ? m.awayTeam : m.homeTeam}</div>
                                  <div className="text-[10px] text-slate-400 truncate">{m.division} • {m.venue}</div>
                                </div>
                                <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded shrink-0 ${
                                  isBeingCompared ? 'bg-[#165094] text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {isBeingCompared ? 'I DualView' : `Kamp ${idx + 1}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* DualView Split Component */}
                      {dualM1 && dualM2 && (
                        <DualLiveView
                          match1={dualM1}
                          match2={dualM2}
                          allConcurrentMatches={currentSlot.matches}
                          onSelectMatch1={(m) => setDualMatch1Override(m)}
                          onSelectMatch2={(m) => setDualMatch2Override(m)}
                          onOpenDetail={(m) => handleOpenMatchDetail(m)}
                          onOpenLineup={(m) => onViewLineup && onViewLineup(m)}
                          onOpenLagleder={(m) => handleOpenLagleder(m)}
                          onOpenPOTM={(m) => {
                            if (onOpenPOTM) onOpenPOTM(m);
                            else {
                              setPotmMatch(m);
                              setIsPotmOpen(true);
                            }
                          }}
                          favoriteTeamIds={favoriteTeamIds}
                          onToggleFavorite={(teamId, e) => toggleFavorite(teamId, e)}
                        />
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">Ingen kamper funnet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Ingen kamper matcher filterkombinasjonen eller søket ditt. Prøv å velge «Alle» eller nullstille filteret.
            </p>
            <button
              onClick={() => {
                setActiveStatusTab('all');
                setQuickFilter('all');
                setSelectedTeamId('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 bg-[#165094] text-white text-xs font-bold rounded-xl hover:bg-[#0F3A6D] transition-colors cursor-pointer"
            >
              Vis alle kamper
            </button>
          </div>
        )
      ) : (
        <div className="space-y-6">
          {Object.entries(matchesByDate).map(([dateStr, matches]: [string, Match[]]) => (
            <div key={dateStr} className="space-y-2.5">
              {/* FotMob Match Day Header (Sortert på kampdato) */}
              <div className="flex items-center justify-between px-1 border-b border-slate-200/80 pb-1.5 pt-1">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-3.5 h-3.5 text-[#165094]" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    {formatDateHeader(dateStr)}
                  </h3>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                    {matches.length} {matches.length === 1 ? 'kamp' : 'kamper'}
                  </span>
                </div>
              </div>

              {/* Match rows on this date */}
              <div className="space-y-2">
                {matches.map((m) => (
                  <SofascoreMatchCard
                    key={m.id}
                    match={m}
                    isFavorite={favoriteTeamIds.includes(m.teamId)}
                    onToggleFavorite={(e) => toggleFavorite(m.teamId, e)}
                    onOpenDetail={() => handleOpenMatchDetail(m)}
                    onOpenLineup={() => onViewLineup && onViewLineup(m)}
                    onOpenScout={(matchToScout) => setScoutMatch(matchToScout)}
                    onOpenReport={(matchToReport) => handleOpenLagleder(matchToReport)}
                    onOpenPOTM={(matchToVote) => {
                      if (onOpenPOTM) onOpenPOTM(matchToVote);
                      else {
                        setPotmMatch(matchToVote);
                        setIsPotmOpen(true);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Player of the Match Modal */}
      {potmMatch && (
        <PlayerOfTheMatchModal
          isOpen={isPotmOpen}
          onClose={() => {
            setIsPotmOpen(false);
            setPotmMatch(null);
          }}
          match={potmMatch}
          onVoteSuccess={async (updatedMatch) => {
            setSelectedMatch(updatedMatch);
            if (onRefreshData) await onRefreshData();
          }}
        />
      )}

      {/* Speider Modal */}
      <ScoutReportModal
        match={scoutMatch}
        isOpen={!!scoutMatch}
        onClose={() => setScoutMatch(null)}
      />

      {/* Match Detail Modal with Full Sofascore Tabs */}
      <MatchDetailModal
        match={selectedMatch}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onOpenLagleder={handleOpenLagleder}
        onSyncMatchEvents={handleSyncMatchEvents}
        onSelectPlayer={onSelectPlayer}
        onViewLineup={onViewLineup}
        allMatches={data.matches}
        divisionTable={selectedMatch ? data.tables[selectedMatch.teamId] : undefined}
      />

      {/* Lagleder Modal */}
      <LaglederModal
        isOpen={isLaglederModalOpen}
        onClose={() => setIsLaglederModalOpen(false)}
        matches={data.matches}
        initialMatch={laglederMatch}
        players={data.players}
        onReportSuccess={async (updatedMatch) => {
          setSelectedMatch(updatedMatch);
          if (onRefreshData) await onRefreshData();
        }}
      />
    </div>
  );
};

