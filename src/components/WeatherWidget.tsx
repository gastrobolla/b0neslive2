import React, { useEffect, useState } from 'react';
import { Match, MatchWeather } from '../types.js';
import { fetchMatchWeather, getDeterministicFallbackWeather } from '../utils/weather.js';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSun,
  Wind,
  Snowflake,
  Droplets,
  Thermometer,
  Gauge,
  Sparkles
} from 'lucide-react';

interface WeatherWidgetProps {
  match: Match;
  variant?: 'compact' | 'detailed' | 'inline';
  mode?: 'preMatch' | 'postMatch';
  className?: string;
  showCardBackground?: boolean;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  match,
  variant = 'compact',
  mode = match.status === 'upcoming' ? 'preMatch' : 'postMatch',
  className = '',
  showCardBackground = true
}) => {
  const [weather, setWeather] = useState<MatchWeather>(() => {
    return match.weather || getDeterministicFallbackWeather(match);
  });
  const [isLoading, setIsLoading] = useState(!match.weather);

  useEffect(() => {
    let isMounted = true;
    if (match.weather) {
      setWeather(match.weather);
      setIsLoading(false);
      return;
    }

    fetchMatchWeather(match)
      .then((data) => {
        if (isMounted && data) {
          setWeather(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [match.id, match.venue, match.date, match.time]);

  // Weather Icon Component
  const renderWeatherIcon = (iconCode: MatchWeather['iconCode'], sizeClass = 'w-4 h-4') => {
    switch (iconCode) {
      case 'clearsky':
        return <Sun className={`${sizeClass} text-amber-500 animate-spin-slow`} />;
      case 'partlycloudy':
        return <CloudSun className={`${sizeClass} text-amber-400`} />;
      case 'cloudy':
      case 'fog':
        return <Cloud className={`${sizeClass} text-slate-400`} />;
      case 'rain':
        return <CloudRain className={`${sizeClass} text-blue-500`} />;
      case 'heavyrain':
        return <CloudRain className={`${sizeClass} text-indigo-600`} />;
      case 'snow':
        return <Snowflake className={`${sizeClass} text-cyan-400`} />;
      case 'wind':
        return <Wind className={`${sizeClass} text-teal-500`} />;
      default:
        return <CloudSun className={`${sizeClass} text-amber-400`} />;
    }
  };

  const getBadgeStyle = (badgeColor: MatchWeather['pitchStatus']['badgeColor']) => {
    switch (badgeColor) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'blue':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'cyan':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'amber':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'rose':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  // 1. COMPACT VARIANT: For SofascoreMatchCard
  if (variant === 'compact') {
    return (
      <div
        id={`match-weather-compact-${match.id}`}
        title={`${weather.venueName}: ${weather.conditionText}, ${weather.temperature}°C. Spilleforhold: ${weather.pitchStatus.badge}`}
        className={`inline-flex items-center space-x-1.5 text-[11px] font-medium transition-all ${className}`}
      >
        <span className="flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200/80 text-slate-700 shrink-0">
          {renderWeatherIcon(weather.iconCode, 'w-3.5 h-3.5')}
          <span className="font-bold">{weather.temperature}°</span>
          {weather.precipitationMm > 0 && (
            <span className="text-[10px] text-blue-600 font-mono">
              {weather.precipitationMm}mm
            </span>
          )}
        </span>

        {/* Predefined pitch message badge */}
        <span
          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border truncate max-w-[140px] sm:max-w-none ${getBadgeStyle(
            weather.pitchStatus.badgeColor
          )}`}
        >
          {weather.pitchStatus.badge}
        </span>
      </div>
    );
  }

  // 2. INLINE VARIANT: For table row or subtle match banner
  if (variant === 'inline') {
    return (
      <div className={`flex items-center space-x-2 text-xs text-slate-600 ${className}`}>
        {renderWeatherIcon(weather.iconCode, 'w-4 h-4')}
        <span className="font-bold text-slate-800">{weather.temperature}°C</span>
        <span className="text-slate-400">•</span>
        <span>{weather.conditionText}</span>
        <span className="text-slate-400">•</span>
        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getBadgeStyle(weather.pitchStatus.badgeColor)}`}>
          {weather.pitchStatus.badge}
        </span>
      </div>
    );
  }

  // 3. DETAILED VARIANT: For 'Før kamp' (MatchDetailModal) and Kampoppsummering (BtMatchSummary)
  const isPostMatch = mode === 'postMatch';
  const displayMessage = isPostMatch
    ? weather.pitchStatus.postMatchSummary
    : weather.pitchStatus.preMatchMessage;

  return (
    <div
      id={`match-weather-detailed-${match.id}`}
      className={`rounded-xl border transition-all ${
        showCardBackground
          ? 'bg-gradient-to-br from-slate-50 via-white to-blue-50/40 border-slate-200/90 shadow-2xs'
          : 'border-white/15 bg-white/5 text-white'
      } p-3.5 sm:p-4 space-y-3 ${className}`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-[#165094] border border-blue-200/60">
            {renderWeatherIcon(weather.iconCode, 'w-4 h-4')}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className={`text-xs font-black uppercase tracking-wider ${showCardBackground ? 'text-slate-800' : 'text-white'}`}>
                {isPostMatch ? 'Vær & Spilleforhold under kampen' : 'Værvarsel & Baneforhold'}
              </h4>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-[#165094]">
                MET / Yr
              </span>
            </div>
            <p className={`text-[11px] truncate ${showCardBackground ? 'text-slate-500' : 'text-blue-200'}`}>
              {weather.venueName} • {match.date} kl. {match.time}
            </p>
          </div>
        </div>

        {/* Pitch Condition Badge */}
        <span
          className={`px-2.5 py-1 rounded-lg text-xs font-black border shadow-2xs ${getBadgeStyle(
            weather.pitchStatus.badgeColor
          )}`}
        >
          {weather.pitchStatus.badge}
        </span>
      </div>

      {/* Main Temperature & Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {/* Temp */}
        <div className={`p-2.5 rounded-lg border flex items-center space-x-2.5 ${
          showCardBackground ? 'bg-white border-slate-200' : 'bg-white/10 border-white/15'
        }`}>
          <Thermometer className="w-4 h-4 text-amber-500 shrink-0" />
          <div>
            <span className={`text-[10px] block font-semibold ${showCardBackground ? 'text-slate-400' : 'text-slate-300'}`}>
              Temperatur
            </span>
            <span className={`font-black text-sm ${showCardBackground ? 'text-slate-900' : 'text-white'}`}>
              {weather.temperature}°C{' '}
              <span className={`text-[10px] font-normal ${showCardBackground ? 'text-slate-400' : 'text-slate-300'}`}>
                (føles {weather.feelsLike}°)
              </span>
            </span>
          </div>
        </div>

        {/* Rain */}
        <div className={`p-2.5 rounded-lg border flex items-center space-x-2.5 ${
          showCardBackground ? 'bg-white border-slate-200' : 'bg-white/10 border-white/15'
        }`}>
          <Droplets className="w-4 h-4 text-blue-500 shrink-0" />
          <div>
            <span className={`text-[10px] block font-semibold ${showCardBackground ? 'text-slate-400' : 'text-slate-300'}`}>
              Nedbør
            </span>
            <span className={`font-black text-sm ${showCardBackground ? 'text-slate-900' : 'text-white'}`}>
              {weather.precipitationMm} mm
            </span>
          </div>
        </div>

        {/* Wind */}
        <div className={`p-2.5 rounded-lg border flex items-center space-x-2.5 ${
          showCardBackground ? 'bg-white border-slate-200' : 'bg-white/10 border-white/15'
        }`}>
          <Wind className="w-4 h-4 text-teal-500 shrink-0" />
          <div>
            <span className={`text-[10px] block font-semibold ${showCardBackground ? 'text-slate-400' : 'text-slate-300'}`}>
              Vindstyrke
            </span>
            <span className={`font-black text-sm ${showCardBackground ? 'text-slate-900' : 'text-white'}`}>
              {weather.windSpeedMs} m/s {weather.windDirection ? `(${weather.windDirection})` : ''}
            </span>
          </div>
        </div>

        {/* Pitch Speed */}
        <div className={`p-2.5 rounded-lg border flex items-center space-x-2.5 ${
          showCardBackground ? 'bg-white border-slate-200' : 'bg-white/10 border-white/15'
        }`}>
          <Gauge className="w-4 h-4 text-emerald-500 shrink-0" />
          <div>
            <span className={`text-[10px] block font-semibold ${showCardBackground ? 'text-slate-400' : 'text-slate-300'}`}>
              Kunstgressbane
            </span>
            <span className={`font-black text-xs truncate block ${showCardBackground ? 'text-slate-900' : 'text-white'}`}>
              {weather.pitchStatus.ballSpeed}
            </span>
          </div>
        </div>
      </div>

      {/* Predefined Condition Message Box */}
      <div
        className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start space-x-2.5 ${
          showCardBackground
            ? 'bg-blue-50/60 border-blue-200/70 text-slate-700'
            : 'bg-blue-950/40 border-blue-500/30 text-blue-100'
        }`}
      >
        <Sparkles className="w-4 h-4 text-[#165094] shrink-0 mt-0.5" />
        <div>
          <span className={`font-bold text-[11px] block uppercase tracking-wider mb-0.5 ${
            showCardBackground ? 'text-[#165094]' : 'text-blue-300'
          }`}>
            {isPostMatch ? 'Banerapport for oppgjøret' : 'Banerapport før avspark'}
          </span>
          <p>{displayMessage}</p>
        </div>
      </div>
    </div>
  );
};
