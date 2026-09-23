import React, { useState, useEffect } from 'react';
import { Match } from '../types.js';
import {
  Calendar,
  Clock,
  MapPin,
  Flame,
  Radio,
  Trophy,
  CloudRain,
  Navigation,
  Star,
  Sparkles,
  ChevronRight,
  Vote
} from 'lucide-react';
import { getGoogleMapsUrl } from '../utils/venueMap.js';

interface MatchdayHeroBannerProps {
  matches: Match[];
  onOpenMatch: (match: Match) => void;
  onOpenPOTM: (match: Match) => void;
  onOpenDesignSwitcher?: () => void;
}

export const MatchdayHeroBanner: React.FC<MatchdayHeroBannerProps> = ({
  matches,
  onOpenMatch,
  onOpenPOTM,
  onOpenDesignSwitcher
}) => {
  // Find live match or the next upcoming home match at Fjellsdalen
  const liveMatch = matches.find((m) => m.status === 'live');
  const nextMatch =
    liveMatch ||
    matches
      .filter((m) => m.status === 'upcoming' && (m.venue?.toLowerCase().includes('fjellsdalen') || m.isHome))
      .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime())[0] ||
    matches.find((m) => m.status === 'upcoming') ||
    matches[0];

  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    if (!nextMatch || nextMatch.status === 'live') return;

    const targetDate = new Date(`${nextMatch.date}T${nextMatch.time || '18:00'}`);

    const updateTimer = () => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nextMatch]);

  if (!nextMatch) return null;

  const isLive = nextMatch.status === 'live';
  const mapsUrl = getGoogleMapsUrl(nextMatch.venue || 'Fjellsdalen idrettsplass');

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c1e38] via-[#165094] to-[#081528] text-white shadow-xl border border-blue-900/60 p-4 sm:p-6 mb-4">
      {/* Background Decorative Pitch Lines */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-2 border-white" />
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white" />
      </div>

      {/* Top Meta Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center space-x-2">
          {isLive ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-black uppercase tracking-wider animate-pulse shadow-md">
              <Radio className="w-3.5 h-3.5" />
              Kamp i gang på Fjellsdalen ({nextMatch.currentMinute ? `${nextMatch.currentMinute}'` : 'LIVE'})
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-blue-200 text-xs font-black uppercase tracking-wider backdrop-blur-xs border border-white/20">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Matchday Fjellsdalen
            </span>
          )}
          <span className="text-xs text-blue-200 font-medium">
            {nextMatch.division}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenDesignSwitcher ? (
            <button
              onClick={onOpenDesignSwitcher}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer flex items-center gap-1"
              title="UX-design"
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Matchday Design</span>
            </button>
          ) : (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/10 text-blue-100 border border-white/20 flex items-center gap-1.5 shadow-2xs">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Matchday Design</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Match Fixture Row */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Teams & Score / Time */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center space-x-3 text-xs text-blue-200">
            <span className="flex items-center gap-1 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              {nextMatch.date}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Kl. {nextMatch.time}
            </span>
            <span>•</span>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-300 hover:text-white underline decoration-dotted font-semibold"
            >
              <MapPin className="w-3.5 h-3.5 text-red-400" />
              <span>{nextMatch.venue || 'Fjellsdalen idrettsplass'}</span>
            </a>
          </div>

          <div className="flex items-center justify-between sm:justify-start sm:space-x-6 py-2">
            {/* Home Team */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white p-1.5 shadow-md flex items-center justify-center shrink-0 border border-white/20">
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
                <h3 className="font-black text-lg sm:text-2xl text-white tracking-tight leading-tight">
                  {nextMatch.homeTeam}
                </h3>
                <span className="text-[11px] text-blue-200 font-medium">Hjemmelag</span>
              </div>
            </div>

            {/* VS or Live Score */}
            <div className="px-3 py-1 bg-black/30 rounded-xl border border-white/10 text-center shrink-0">
              {isLive || nextMatch.status === 'finished' ? (
                <div className="font-mono text-2xl sm:text-3xl font-black text-amber-400">
                  {nextMatch.homeScore ?? 0} - {nextMatch.awayScore ?? 0}
                </div>
              ) : (
                <div className="text-xs font-black uppercase text-blue-200 tracking-wider">
                  VS
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="flex items-center space-x-3 text-right sm:text-left">
              <div className="order-2 sm:order-1">
                <h3 className="font-black text-lg sm:text-2xl text-white tracking-tight leading-tight">
                  {nextMatch.awayTeam}
                </h3>
                <span className="text-[11px] text-blue-200 font-medium">Bortelag</span>
              </div>
              <div className="order-1 sm:order-2 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/10 p-1.5 shadow-md flex items-center justify-center shrink-0 border border-white/20">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Countdown Box / Banens beste CTA */}
        <div className="lg:col-span-5 bg-black/25 rounded-xl p-3.5 sm:p-4 border border-white/10 backdrop-blur-xs flex flex-col justify-between space-y-3">
          {!isLive && nextMatch.status === 'upcoming' ? (
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 block mb-2">
                ⏳ Nedtelling til avspark
              </span>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white/10 rounded-lg p-2">
                  <span className="block text-xl sm:text-2xl font-black text-white">{timeLeft.days}</span>
                  <span className="text-[9px] uppercase font-bold text-blue-200">Dager</span>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <span className="block text-xl sm:text-2xl font-black text-white">{timeLeft.hours}</span>
                  <span className="text-[9px] uppercase font-bold text-blue-200">Timer</span>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <span className="block text-xl sm:text-2xl font-black text-white">{timeLeft.minutes}</span>
                  <span className="text-[9px] uppercase font-bold text-blue-200">Min</span>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <span className="block text-xl sm:text-2xl font-black text-amber-400">{timeLeft.seconds}</span>
                  <span className="text-[9px] uppercase font-bold text-blue-200">Sek</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-300" />
                Live kåring av Banens Beste
              </span>
              <p className="text-xs text-blue-100">
                Publikum på tribunen og følgere i appen kan nå stemme live på sine favorittspillere!
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onOpenMatch(nextMatch)}
              className="flex-1 py-2 px-3 bg-white text-[#165094] hover:bg-blue-50 font-black rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm"
            >
              <span>Se kampsenter</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onOpenPOTM(nextMatch)}
              className="py-2 px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-sm shrink-0"
              title="Stem på Banens Beste"
            >
              <Vote className="w-3.5 h-3.5 text-slate-950" />
              <span>Stem Banens Beste</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
