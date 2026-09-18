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
  BarChart2
} from 'lucide-react';
import { MatchDetailModal } from './MatchDetailModal.js';
import { LaglederModal } from './LaglederModal.js';

interface LivescoreDashboardProps {
  data: BonesClubData;
  onRefreshData?: () => Promise<void>;
  onSelectPlayer?: (playerName: string, teamId?: string) => void;
  onViewLineup?: (match: Match) => void;
}

export const LivescoreDashboard: React.FC<LivescoreDashboardProps> = ({
  data,
  onRefreshData,
  onSelectPlayer,
  onViewLineup,
}) => {
  const [activeStatusTab, setActiveStatusTab] = useState<'all' | 'live' | 'upcoming' | 'finished' | 'home' | 'favorites'>('all');
  const [quickFilter, setQuickFilter] = useState<QuickCategoryFilter>('all');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
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

  // Adaptive Polling
  useEffect(() => {
    const hasLive = liveMatches.length > 0;
    const pollIntervalMs = hasLive ? 15000 : 45000;

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

      {/* Sofascore Status Tabs: Alle, Live, Kommende, Ferdig, Hjemmekamper, Favoritter */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none w-full sm:w-auto">
          <button
            onClick={() => setActiveStatusTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeStatusTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Alle ({totalCounts.all})
          </button>
          <button
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
          <button
            onClick={() => setActiveStatusTab('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeStatusTab === 'upcoming'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Kommende ({totalCounts.upcoming})
          </button>
          <button
            onClick={() => setActiveStatusTab('finished')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeStatusTab === 'finished'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Ferdige ({totalCounts.finished})
          </button>
          <button
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
          <button
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

      {/* SECTION 1: 🔴 LIVE MATCHES HERO (Sofascore Live Center) */}
      {liveMatches.length > 0 && activeStatusTab !== 'finished' && activeStatusTab !== 'upcoming' && (
        <section id="section-live-matches" className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
              </span>
              <h2 className="text-sm font-black uppercase tracking-wider text-red-600">
                PÅGÅENDE KAMPER NÅ ({liveMatches.length})
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">Live oppdatering aktiv</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {liveMatches.map((m) => (
              <SofascoreMatchCard
                key={m.id}
                match={m}
                isFavorite={favoriteTeamIds.includes(m.teamId)}
                onToggleFavorite={(e) => toggleFavorite(m.teamId, e)}
                onOpenDetail={() => handleOpenMatchDetail(m)}
                onOpenLineup={() => onViewLineup && onViewLineup(m)}
              />
            ))}
          </div>
        </section>
      )}

      {/* SECTION 2: MATCHES LIST GROUPED BY DIVISION (Sofascore Style) */}
      {filteredMatches.length === 0 ? (
        activeStatusTab === 'live' && liveMatches.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/90 shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Radio className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Ingen pågående kamper for øyeblikket</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                LIVE kampsenter aktiveres automatisk så snart en Bønes-kamp blåses i gang. NFF oppdateres i sanntid under kampforløpet med mål og hendelser.
              </p>
            </div>
            {data.matches.filter(m => m.status === 'upcoming').sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time))[0] && (
              (() => {
                const nextM = data.matches.filter(m => m.status === 'upcoming').sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time))[0];
                return (
                  <div className="inline-flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium mt-1">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#165094]" />
                      <span>Neste oppgjør:</span>
                    </div>
                    <span className="font-bold text-slate-900">{nextM.teamName} vs {nextM.isHome ? nextM.awayTeam : nextM.homeTeam}</span>
                    <span className="text-slate-400 hidden sm:inline">•</span>
                    <span className="text-slate-600">{nextM.date} kl. {nextM.time}</span>
                    <span className="text-slate-400 hidden sm:inline">•</span>
                    <span className="text-[#165094] font-medium">{nextM.venue}</span>
                  </div>
                );
              })()
            )}
            <div className="pt-2">
              <button
                onClick={() => setActiveStatusTab('all')}
                className="px-4 py-2 bg-[#165094] text-white text-xs font-bold rounded-xl hover:bg-[#0F3A6D] transition-colors cursor-pointer"
              >
                Vis alle kamper
              </button>
            </div>
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
          {Object.entries(matchesByDate).map(([dateStr, matches]) => (
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
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
        onReportSuccess={async (updatedMatch) => {
          setSelectedMatch(updatedMatch);
          if (onRefreshData) await onRefreshData();
        }}
      />
    </div>
  );
};

// Sub-component: Sofascore Match Card
const SofascoreMatchCard: React.FC<{
  match: Match;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onOpenDetail: () => void;
  onOpenLineup?: () => void;
}> = ({ match, isFavorite, onToggleFavorite, onOpenDetail, onOpenLineup }) => {
  const isBonesHome = match.homeTeam.toLowerCase().includes('bønes');
  const isBonesAway = match.awayTeam.toLowerCase().includes('bønes');
  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';
  const isUpcoming = match.status === 'upcoming';

  // Winner calculation
  const homeWon = isFinished && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWon = isFinished && (match.awayScore ?? 0) > (match.homeScore ?? 0);

  const latestEvent = match.events && match.events.length > 0 ? match.events[match.events.length - 1] : null;

  return (
    <div
      onClick={onOpenDetail}
      className={`bg-white rounded-xl border transition-all cursor-pointer hover:shadow-xs overflow-hidden ${
        isLive
          ? 'border-red-200 border-l-4 border-l-red-600 shadow-2xs'
          : 'border-slate-200/90 hover:border-slate-300'
      }`}
    >
      <div className="p-3 sm:p-4">
        {/* Top mini-header */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 border-b border-slate-100 pb-1.5">
          <div className="flex items-center space-x-2 truncate">
            <span className="font-bold text-slate-700 uppercase tracking-wider">{match.date}</span>
            <span>•</span>
            <span className="truncate text-slate-600 font-medium">{match.venue}</span>
            {match.isHome && (
              <span className="bg-blue-50 text-[#165094] border border-blue-200/80 text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0">
                HJEMME
              </span>
            )}
          </div>
          <button
            onClick={onToggleFavorite}
            aria-label={isFavorite ? 'Fjern favoritt' : 'Lagre favoritt'}
            className="p-1 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
          </button>
        </div>

        {/* Sofascore 3-Column Match Row */}
        <div className="grid grid-cols-12 items-center gap-2">
          {/* Status Column */}
          <div className="col-span-3 sm:col-span-2 flex flex-col items-center justify-center text-center pr-2 border-r border-slate-100">
            {isLive && (
              <div className="flex flex-col items-center">
                <span className="relative flex h-2 w-2 mb-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                </span>
                <span className="text-xs font-black text-red-600">
                  {match.currentMinute ? `${match.currentMinute}'` : 'LIVE'}
                </span>
              </div>
            )}
            {isFinished && (
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-slate-500">FT</span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {match.halfTimeScore ? `(${match.halfTimeScore.home}-${match.halfTimeScore.away})` : ''}
                </span>
              </div>
            )}
            {isUpcoming && (
              <div className="flex flex-col items-center">
                <span className="text-xs font-black text-[#165094]">{match.time}</span>
                <span className="text-[10px] text-slate-400 font-medium">Kommende</span>
              </div>
            )}
          </div>

          {/* Teams and Scores Column */}
          <div className="col-span-9 sm:col-span-10 space-y-1.5">
            {/* Home Team */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-slate-100">
                  {isBonesHome ? (
                    <img src="/bones-logo.svg" alt="Bønes IL" className="w-4 h-4 object-contain" />
                  ) : (
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
                <span
                  className={`text-sm truncate ${
                    homeWon
                      ? 'font-black text-slate-900'
                      : isBonesHome
                      ? 'font-extrabold text-[#165094]'
                      : 'font-medium text-slate-700'
                  }`}
                >
                  {match.homeTeam}
                </span>
              </div>
              <span
                className={`font-mono text-base font-black px-2 ${
                  isUpcoming ? 'text-slate-300' : homeWon ? 'text-slate-950' : 'text-slate-700'
                }`}
              >
                {isUpcoming ? '-' : (match.homeScore ?? 0)}
              </span>
            </div>

            {/* Away Team */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-slate-100">
                  {isBonesAway ? (
                    <img src="/bones-logo.svg" alt="Bønes IL" className="w-4 h-4 object-contain" />
                  ) : (
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
                <span
                  className={`text-sm truncate ${
                    awayWon
                      ? 'font-black text-slate-900'
                      : isBonesAway
                      ? 'font-extrabold text-[#165094]'
                      : 'font-medium text-slate-700'
                  }`}
                >
                  {match.awayTeam}
                </span>
              </div>
              <span
                className={`font-mono text-base font-black px-2 ${
                  isUpcoming ? 'text-slate-300' : awayWon ? 'text-slate-950' : 'text-slate-700'
                }`}
              >
                {isUpcoming ? '-' : (match.awayScore ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Latest Goal / Event Pill */}
        {latestEvent && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-amber-800 bg-amber-50/60 -mx-3 -mb-3 sm:-mx-4 sm:-mb-4 px-3 sm:px-4 py-1.5">
            <span className="truncate font-medium">
              {latestEvent.type === 'goal' ? '⚽' : '⚡'} {latestEvent.minute}' {latestEvent.description}
            </span>
            <span className="text-[10px] font-bold text-[#165094] flex items-center gap-0.5 shrink-0 ml-2">
              Detaljer <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
