import React, { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, CloudSun, Wind, Snowflake, Droplets, RefreshCw } from 'lucide-react';
import { MatchWeather } from '../types.js';
import { fetchMatchWeather, getDeterministicFallbackWeather } from '../utils/weather.js';

export const ClubWeatherBadge: React.FC = () => {
  const [weather, setWeather] = useState<MatchWeather>(() => {
    // Provide an immediate realistic baseline for Bønes/Bergen
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:00`;
    return getDeterministicFallbackWeather({
      id: 'bones-current',
      teamId: 'menn-1',
      teamName: 'Bønes IL',
      opponent: 'Klubbhuset',
      homeTeam: 'Bønes',
      awayTeam: 'Bønes',
      date: dateStr,
      time: timeStr,
      venue: 'Fjellsdalen idrettsplass (Bønes)',
      status: 'upcoming',
      isHome: true,
      events: []
    });
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Fetch real live weather from Open-Meteo for Bønes
  const refreshWeather = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const dummyMatch = {
        id: 'bones-current-live',
        teamId: 'menn-1',
        teamName: 'Bønes IL',
        opponent: 'Klubbhuset',
        homeTeam: 'Bønes',
        awayTeam: 'Bønes',
        date: now.toISOString().split('T')[0],
        time: `${String(now.getHours()).padStart(2, '0')}:00`,
        venue: 'Fjellsdalen idrettsplass (Bønes)',
        status: 'upcoming' as const,
        isHome: true,
        events: []
      };
      const fetched = await fetchMatchWeather(dummyMatch);
      if (fetched) {
        setWeather(fetched);
      }
    } catch {
      // Keep existing fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshWeather();
    // Re-check weather every 10 minutes
    const timer = setInterval(refreshWeather, 600000);
    return () => clearInterval(timer);
  }, []);

  const renderIcon = () => {
    const sizeClass = 'w-4 h-4 shrink-0';
    switch (weather.iconCode) {
      case 'clearsky':
        return <Sun className={`${sizeClass} text-amber-400`} />;
      case 'partlycloudy':
        return <CloudSun className={`${sizeClass} text-amber-300`} />;
      case 'cloudy':
      case 'fog':
        return <Cloud className={`${sizeClass} text-slate-300`} />;
      case 'rain':
        return <CloudRain className={`${sizeClass} text-blue-400`} />;
      case 'heavyrain':
        return <CloudRain className={`${sizeClass} text-indigo-400`} />;
      case 'snow':
        return <Snowflake className={`${sizeClass} text-cyan-300`} />;
      case 'wind':
        return <Wind className={`${sizeClass} text-teal-300`} />;
      default:
        return <CloudSun className={`${sizeClass} text-amber-300`} />;
    }
  };

  return (
    <div className="relative">
      <div
        id="club-weather-widget"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip((prev) => !prev)}
        className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-750 text-white border border-slate-700/80 text-xs transition-colors cursor-pointer select-none"
        title="Været på Bønes (Fjellsdalen idrettsplass)"
      >
        {renderIcon()}
        <span className="font-extrabold font-mono text-xs text-amber-300">
          {weather.temperature}°C
        </span>
        <span className="text-[11px] text-slate-300 hidden xl:inline">
          Bønes
        </span>
        {weather.precipitationMm > 0 && (
          <span className="text-[10px] text-blue-300 font-mono hidden md:inline">
            ({weather.precipitationMm}mm)
          </span>
        )}
      </div>

      {/* Expanded Hover Tooltip */}
      {showTooltip && (
        <div
          id="club-weather-dropdown"
          className="absolute right-0 mt-1.5 w-64 bg-slate-900 border border-slate-750 rounded-xl shadow-xl p-3 text-white text-xs z-50 animate-fadeIn"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-1.5">
              {renderIcon()}
              <div>
                <span className="font-bold text-white block leading-tight">Været på Bønes</span>
                <span className="text-[10px] text-slate-400">Fjellsdalen idrettsplass</span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                refreshWeather();
              }}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              title="Oppdater vær"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 my-2.5 pt-1">
            <div className="bg-slate-800/60 p-2 rounded-lg">
              <span className="text-[10px] text-slate-400 block">Tilstand</span>
              <span className="font-semibold text-slate-200">{weather.conditionText}</span>
            </div>
            <div className="bg-slate-800/60 p-2 rounded-lg">
              <span className="text-[10px] text-slate-400 block">Føles som</span>
              <span className="font-semibold text-slate-200">{weather.feelsLike}°C</span>
            </div>
            <div className="bg-slate-800/60 p-2 rounded-lg">
              <span className="text-[10px] text-slate-400 block">Nedbør</span>
              <span className="font-semibold text-blue-300 flex items-center gap-1">
                <Droplets className="w-3 h-3" />
                {weather.precipitationMm} mm
              </span>
            </div>
            <div className="bg-slate-800/60 p-2 rounded-lg">
              <span className="text-[10px] text-slate-400 block">Vind</span>
              <span className="font-semibold text-slate-200 flex items-center gap-1">
                <Wind className="w-3 h-3 text-teal-400" />
                {weather.windSpeedMs} m/s
              </span>
            </div>
          </div>

          <div className="bg-blue-950/60 border border-blue-800/50 rounded-lg p-2 text-[11px] text-blue-200">
            <span className="font-bold text-blue-300 block mb-0.5">Baneforhold kunstgress:</span>
            <span>{weather.pitchStatus.ballSpeed} • {weather.pitchStatus.badge}</span>
          </div>
        </div>
      )}
    </div>
  );
};
