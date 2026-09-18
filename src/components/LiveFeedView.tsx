import React, { useState } from 'react';
import { FeedItem, FeedItemType, ScannerState } from '../types.js';
import {
  Radio,
  Flame,
  AlertTriangle,
  Trophy,
  Home,
  RefreshCw,
  Sparkles,
  Filter,
  CheckCircle2,
  Clock,
  MapPin,
  Shield
} from 'lucide-react';

interface LiveFeedViewProps {
  feed: FeedItem[];
  selectedTeamId: string;
  onManualScan: () => void;
  isScanning: boolean;
  scanner: ScannerState;
}

export const LiveFeedView: React.FC<LiveFeedViewProps> = ({
  feed,
  selectedTeamId,
  onManualScan,
  isScanning,
  scanner
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  // Filter feed items
  const filteredFeed = feed.filter((item) => {
    // Filter by team if not 'all'
    if (selectedTeamId !== 'all' && item.teamId && item.teamId !== selectedTeamId) {
      return false;
    }

    // Filter by category
    if (filterType === 'all') return true;
    if (filterType === 'goals' && item.type === 'goal') return true;
    if (filterType === 'cards' && item.type === 'card') return true;
    if (filterType === 'table' && item.type === 'table') return true;
    if (filterType === 'home' && item.isHomeMatch) return true;
    if (filterType === 'sync' && item.type === 'scanner_sync') return true;

    return false;
  });

  return (
    <div id="live-feed-container" className="space-y-4">
      
      {/* Feed Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Feed Status & Source indicators */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-3.5 h-3.5 bg-red-600 rounded-full animate-ping absolute inset-0"></div>
            <div className="w-3.5 h-3.5 bg-red-600 rounded-full relative"></div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-slate-900 text-base tracking-tight">
                Sanntids Live-Feed for Bønes IL Fotball
              </h3>
              <span className="bg-red-100 text-red-700 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-red-200">
                LIVE STRØM
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-2">
              <span>Kilde: NFF fotball.no</span>
              <span>•</span>
              <span className="font-mono text-emerald-600 font-semibold">
                Neste autoskann om {scanner.nextScanSeconds}s
              </span>
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {/* Manual Scan */}
          <button
            id="btn-feed-manual-scan"
            onClick={onManualScan}
            disabled={isScanning}
            className="flex items-center space-x-1.5 px-3 py-2 bg-[#165094] hover:bg-[#0F3A6D] text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Sjekker NFF...' : 'Skann nå'}</span>
          </button>
        </div>

      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/60 p-1.5 rounded-xl text-xs font-semibold">
        <button
          id="feed-filter-all"
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg transition-all ${
            filterType === 'all'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Alle hendelser ({feed.length})
        </button>

        <button
          id="feed-filter-goals"
          onClick={() => setFilterType('goals')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all ${
            filterType === 'goals'
              ? 'bg-white text-red-700 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>⚽ Mål & Resultater</span>
          <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.2 rounded-full ml-1">
            {feed.filter(i => i.type === 'goal').length}
          </span>
        </button>

        <button
          id="feed-filter-cards"
          onClick={() => setFilterType('cards')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all ${
            filterType === 'cards'
              ? 'bg-white text-amber-800 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🟨 Kort & Disiplinær</span>
          <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-full ml-1">
            {feed.filter(i => i.type === 'card').length}
          </span>
        </button>

        <button
          id="feed-filter-table"
          onClick={() => setFilterType('table')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all ${
            filterType === 'table'
              ? 'bg-white text-blue-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🏆 Tabellposisjoner</span>
          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full ml-1">
            {feed.filter(i => i.type === 'table').length}
          </span>
        </button>

        <button
          id="feed-filter-home"
          onClick={() => setFilterType('home')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all ${
            filterType === 'home'
              ? 'bg-white text-red-800 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Home className="w-3.5 h-3.5 text-red-600" />
          <span>Hjemmekamper</span>
          <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.2 rounded-full ml-1 font-mono">
            {feed.filter(i => i.isHomeMatch).length}
          </span>
        </button>
      </div>

      {/* Feed Timeline Stream */}
      <div className="space-y-3">
        {filteredFeed.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            <Radio className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
            <p className="font-semibold">Ingen hendelser i live-feeden for dette filteret.</p>
            <p className="text-xs text-slate-400 mt-1">
              Klikk på «Test live-hendelse» eller «Skann nå» for å hente ferske hendelser.
            </p>
          </div>
        ) : (
          filteredFeed.map((item, idx) => {
            const isFirst = idx === 0;
            const isHome = item.isHomeMatch;

            return (
              <div
                key={item.id}
                id={`feed-item-${item.id}`}
                className={`bg-white rounded-xl border transition-all overflow-hidden p-4 sm:p-5 shadow-xs relative ${
                  isHome
                    ? 'border-red-300 ring-1 ring-red-400/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Home Match Header Pill */}
                {isHome && (
                  <div className="mb-3 inline-flex items-center space-x-1.5 bg-gradient-to-r from-red-600 to-blue-900 text-white px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                    <Home className="w-3 h-3 text-amber-300" />
                    <span>HJEMMEKAMP PÅ BØNESBANEN</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  
                  {/* Event Type Icon & Main Content */}
                  <div className="flex items-start space-x-3.5">
                    
                    {/* Icon Circle */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base font-bold shadow-xs ${
                        item.type === 'goal'
                          ? 'bg-red-500 text-white'
                          : item.type === 'card'
                          ? 'bg-amber-400 text-slate-900'
                          : item.type === 'table'
                          ? 'bg-blue-600 text-white'
                          : item.type === 'fixture'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-white'
                      }`}
                    >
                      {item.type === 'goal' && '⚽'}
                      {item.type === 'card' && '🟨'}
                      {item.type === 'table' && <Trophy className="w-5 h-5" />}
                      {item.type === 'fixture' && <Home className="w-5 h-5" />}
                      {item.type === 'scanner_sync' && <Shield className="w-5 h-5" />}
                    </div>

                    {/* Text Body */}
                    <div className="space-y-1">
                      
                      {/* Meta Tags */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-blue-950 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {item.teamName}
                        </span>

                        {item.badgeText && (
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                            item.source === 'lagleder'
                              ? 'bg-[#3E8A37] text-white'
                              : item.type === 'goal'
                              ? 'bg-red-600 text-white'
                              : item.type === 'card'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {item.badgeText}
                          </span>
                        )}

                        {item.source === 'lagleder' && item.reportedBy && (
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded">
                            Meldt av: {item.reportedBy}
                          </span>
                        )}

                        {item.score && (
                          <span className="font-mono font-black text-sm bg-slate-900 text-amber-400 px-2 py-0.2 rounded shadow-inner">
                            {item.score}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
                        {item.title}
                      </h4>

                      {/* Description */}
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Stat Impact Pill */}
                      {item.impact && (
                        <div className="mt-2 inline-flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg text-xs">
                          <span className="font-bold text-slate-700">
                            {item.impact.type === 'topscorer' && '🔥 Toppscorer-oppdatering:'}
                            {item.impact.type === 'card_warning' && '⚠️ Disiplinærstatus:'}
                            {item.impact.type === 'table_rank' && '🏆 Tabelleffekt:'}
                            {item.impact.type === 'fixture' && '📅 Kampoppsett:'}
                          </span>
                          <span className="text-slate-900 font-medium">
                            {item.impact.detail}
                          </span>
                        </div>
                      )}

                      {/* Venue info */}
                      {item.venue && (
                        <p className="text-[11px] text-slate-500 flex items-center space-x-1 pt-1">
                          <MapPin className="w-3 h-3 text-red-500 inline" />
                          <span className="font-medium">{item.venue}</span>
                        </p>
                      )}

                    </div>

                  </div>

                  {/* Timestamp Right Column */}
                  <div className="text-right shrink-0 text-xs self-start mt-1 sm:mt-0">
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">
                      {item.timestamp}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {item.timeAgo}
                    </p>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
