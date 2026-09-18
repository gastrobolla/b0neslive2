import React from 'react';
import { Radio, MapPin, Award, AlertCircle, Clock } from 'lucide-react';
import { Match } from '../types.js';

interface LiveTickerBannerProps {
  liveMatch?: Match;
}

export const LiveTickerBanner: React.FC<LiveTickerBannerProps> = ({ liveMatch }) => {
  if (!liveMatch) return null;

  const latestEvent = liveMatch.events && liveMatch.events.length > 0
    ? liveMatch.events[liveMatch.events.length - 1]
    : null;

  return (
    <section id="live-match-banner" className="bg-gradient-to-r from-red-900 via-slate-900 to-blue-950 border-b border-red-800/40 text-white py-3 px-4 shadow-inner">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* Left: Live indicator and Match details */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center space-x-2 bg-red-600/90 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">
            <Radio className="w-3.5 h-3.5" />
            <span>PÅGÅR NÅ: {liveMatch.currentMinute}' MIN</span>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <span className="font-semibold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {liveMatch.division}
            </span>
            <span className="hidden sm:inline flex items-center text-slate-400">
              <MapPin className="w-3 h-3 text-red-400 mr-1 inline" />
              {liveMatch.venue}
            </span>
          </div>
        </div>

        {/* Center: Live Scoreboard */}
        <div className="flex items-center justify-center space-x-4 bg-slate-900/80 px-4 py-1.5 rounded-xl border border-slate-700/80 shadow-sm">
          <div className="text-right">
            <span className={`font-bold text-sm sm:text-base ${liveMatch.isHome ? 'text-red-400' : 'text-slate-200'}`}>
              {liveMatch.homeTeam}
            </span>
            {liveMatch.isHome && (
              <span className="ml-1.5 text-[10px] bg-red-950 text-red-300 border border-red-800 px-1 py-0.2 rounded font-semibold">
                HJEMME
              </span>
            )}
          </div>

          <div className="px-3 py-1 bg-black/60 rounded-lg text-lg sm:text-xl font-mono font-black text-amber-400 tracking-wider">
            {liveMatch.homeScore} - {liveMatch.awayScore}
          </div>

          <div className="text-left">
            <span className={`font-bold text-sm sm:text-base ${!liveMatch.isHome ? 'text-red-400' : 'text-slate-200'}`}>
              {liveMatch.awayTeam}
            </span>
            {!liveMatch.isHome && (
              <span className="ml-1.5 text-[10px] bg-red-950 text-red-300 border border-red-800 px-1 py-0.2 rounded font-semibold">
                HJEMME
              </span>
            )}
          </div>
        </div>

        {/* Right: Latest Match Event Ticker */}
        {latestEvent && (
          <div className="w-full md:w-auto text-xs flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 max-w-md truncate">
            <span className="font-mono font-bold text-amber-400 shrink-0">{latestEvent.minute}'</span>
            <span className="font-semibold text-white shrink-0">
              {latestEvent.type === 'goal' ? '⚽ Mål!' : latestEvent.type === 'yellow_card' ? '🟨 Gult kort' : '🔄 Bytte'}
            </span>
            <span className="truncate text-slate-300">{latestEvent.description}</span>
          </div>
        )}

      </div>
    </section>
  );
};
