import React, { useState } from 'react';
import { Match, DivisionTable } from '../types.js';
import { calculateWinProbability, WinProbabilityResult } from '../utils/winProbabilityCalculator.js';
import { Percent, TrendingUp, Info, ChevronDown, ChevronUp, Shield, Trophy, Activity, Sparkles } from 'lucide-react';

interface WinProbabilityBadgeProps {
  match: Match;
  allMatches?: Match[];
  tables?: Record<string, DivisionTable>;
  probability?: WinProbabilityResult;
  variant?: 'compact' | 'detailed';
  className?: string;
}

export const WinProbabilityBadge: React.FC<WinProbabilityBadgeProps> = ({
  match,
  allMatches = [],
  tables,
  probability,
  variant = 'compact',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const prob = probability || calculateWinProbability(match, allMatches, tables);

  const isBonesHome = match.homeTeam.toLowerCase().includes('bønes');
  const opponentName = isBonesHome ? match.awayTeam : match.homeTeam;

  const isBonesFavorite = prob.favorite === 'bones';
  const isOppFavorite = prob.favorite === 'opponent';

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
      className={`rounded-lg bg-slate-50 border border-slate-200/90 text-xs select-none transition-all ${className}`}
    >
      {/* Probability Header Bar */}
      <div className="p-2.5 sm:px-3 sm:py-2">
        <div className="flex items-center justify-between text-[11px] mb-1.5 gap-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <span className="w-4 h-4 rounded-md bg-[#165094]/10 text-[#165094] flex items-center justify-center font-mono text-[10px]">
              %
            </span>
            <span>Vinnersjanse (AI & Form)</span>
            {isBonesFavorite && (
              <span className="text-[10px] font-extrabold text-blue-700 bg-blue-100/80 px-1.5 py-0.2 rounded">
                Bønes favoritt
              </span>
            )}
            {isOppFavorite && (
              <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100/80 px-1.5 py-0.2 rounded">
                {opponentName} favoritt
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Se statistisk grunnlag"
          >
            <span>{isExpanded ? 'Skjul detaljer' : 'Statistisk grunnlag'}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* 3-Way Probability Bar (Sofascore / Opta Style) */}
        <div className="space-y-1">
          <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
            {/* Bønes Segment */}
            <div
              style={{ width: `${prob.bonesWinProb}%` }}
              className="h-full bg-[#165094] transition-all duration-500 hover:brightness-110 relative group"
              title={`Bønes IL seier: ${prob.bonesWinProb}%`}
            />
            {/* Draw Segment */}
            <div
              style={{ width: `${prob.drawProb}%` }}
              className="h-full bg-slate-400 transition-all duration-500 hover:brightness-110 relative group"
              title={`Uavgjort: ${prob.drawProb}%`}
            />
            {/* Opponent Segment */}
            <div
              style={{ width: `${prob.oppWinProb}%` }}
              className="h-full bg-rose-600 transition-all duration-500 hover:brightness-110 relative group"
              title={`${opponentName} seier: ${prob.oppWinProb}%`}
            />
          </div>

          {/* Probability Numbers Row */}
          <div className="flex items-center justify-between text-[11px] font-mono font-bold">
            <span className="text-[#165094] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#165094] inline-block" />
              <span>Bønes {prob.bonesWinProb}%</span>
            </span>

            <span className="text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
              <span>Uavgjort {prob.drawProb}%</span>
            </span>

            <span className="text-rose-700 flex items-center gap-1 truncate max-w-[140px] text-right">
              <span className="w-2 h-2 rounded-full bg-rose-600 inline-block shrink-0" />
              <span className="truncate">{opponentName} {prob.oppWinProb}%</span>
            </span>
          </div>

          {/* Quick H2H and Form indicator */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100/90 gap-1">
            <span className="flex items-center gap-1 truncate text-slate-600">
              <Activity className="w-2.5 h-2.5 text-[#165094] shrink-0" />
              <span className="truncate">Form: <strong className="font-semibold text-slate-800">{prob.factors.bonesFormStreak || 'N/A'}</strong> ({prob.factors.formSummary})</span>
            </span>
            <span className="flex items-center gap-1 shrink-0 text-slate-600">
              <Trophy className="w-2.5 h-2.5 text-amber-500 shrink-0" />
              <span>H2H: <strong className="font-semibold text-slate-800">{prob.factors.h2hMatchesCount > 0 ? `${prob.factors.h2hBonesWins}S-${prob.factors.h2hDraws}U-${prob.factors.h2hOpponentWins}T` : '0 møter'}</strong></span>
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Factor Breakdown */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-2 border-t border-slate-200/80 bg-white space-y-2 text-[11px] animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Form Factor */}
            <div className="p-2 rounded-md bg-slate-50 border border-slate-100 space-y-0.5">
              <div className="flex items-center justify-between text-slate-500 font-semibold">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-blue-600" />
                  <span>Siste 5 kamper:</span>
                </span>
                <span className="font-mono text-slate-800 font-bold">{prob.factors.bonesFormStreak || 'N/A'}</span>
              </div>
              <p className="text-slate-700 font-medium">
                {prob.factors.formSummary}
              </p>
            </div>

            {/* H2H Factor */}
            <div className="p-2 rounded-md bg-slate-50 border border-slate-100 space-y-0.5">
              <div className="flex items-center justify-between text-slate-500 font-semibold">
                <span className="flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-500" />
                  <span>Innbyrdes (H2H):</span>
                </span>
                <span className="font-mono text-slate-800 font-bold">
                  {prob.factors.h2hMatchesCount} kamper
                </span>
              </div>
              <p className="text-slate-700 font-medium">
                {prob.factors.h2hSummary}
              </p>
            </div>
          </div>

          {/* Context Footer Note */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
            <span>🏟️ {prob.factors.homeAdvantageText}</span>
            <span className="italic">
              Datatillit: {prob.confidence === 'high' ? 'Høy' : prob.confidence === 'medium' ? 'Middels' : 'Estimert'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
