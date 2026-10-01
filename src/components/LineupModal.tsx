import React, { useState, useMemo } from 'react';
import {
  X,
  Shield,
  Users,
  User,
  Award,
  Zap,
  Check,
  Share2,
  Code,
  Calendar,
  Clock,
  Radio,
  ExternalLink
} from 'lucide-react';
import { Match, MatchLineup, Player, PlayerOfTheMatchCandidate } from '../types.js';
import {
  resolveTeamLineup,
  calculatePitchCoordinates,
  ResolvedTeamLineup
} from '../utils/lineupPredictionEngine.js';
import { calculateMatchPOTM } from '../utils/potmCalculator.js';

interface LineupModalProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectPlayer: (playerName: string, teamIdHint?: string) => void;
  allMatches?: Match[];
}

export const LineupModal: React.FC<LineupModalProps> = ({
  match,
  isOpen,
  onClose,
  onSelectPlayer,
  allMatches = [],
}) => {
  const [lineupFilter, setLineupFilter] = useState<'performance' | 'club' | 'age' | 'number'>('performance');
  const [lineupPitchMode, setLineupPitchMode] = useState<'dual' | 'table'>('dual');
  const [lineupCopied, setLineupCopied] = useState(false);
  const [showEmbedCode, setShowEmbedCode] = useState(false);

  // Compute POTM and candidate ratings for performance tier badges
  const potm = useMemo(() => {
    if (!match) return null;
    return match.playerOfTheMatch || calculateMatchPOTM(match);
  }, [match]);

  const candidateMap = useMemo(() => {
    const map = new Map<string, PlayerOfTheMatchCandidate>();
    if (potm?.candidates) {
      for (const c of potm.candidates) {
        if (c?.playerName) {
          map.set(c.playerName.trim().toLowerCase(), c);
        }
      }
    }
    return map;
  }, [potm]);

  // Resolved lineups using official FIKS confirmation or previous match prediction in same formation
  const resolvedHome: ResolvedTeamLineup = useMemo(() => {
    if (!match) {
      return {
        teamName: '',
        isHome: true,
        isConfirmed: false,
        isPredicted: true,
        formation: '4-3-3',
        starters: [],
        bench: [],
        coach: '',
        sourceDescription: '',
      };
    }
    return resolveTeamLineup('home', match, allMatches);
  }, [match, allMatches]);

  const resolvedAway: ResolvedTeamLineup = useMemo(() => {
    if (!match) {
      return {
        teamName: '',
        isHome: false,
        isConfirmed: false,
        isPredicted: true,
        formation: '4-3-3',
        starters: [],
        bench: [],
        coach: '',
        sourceDescription: '',
      };
    }
    return resolveTeamLineup('away', match, allMatches);
  }, [match, allMatches]);

  if (!isOpen || !match) return null;

  const isConfirmedLineups = resolvedHome.isConfirmed || resolvedAway.isConfirmed;
  const isBonesHome = match.homeTeam.toLowerCase().includes('bønes');
  const isBonesAway = match.awayTeam.toLowerCase().includes('bønes');

  return (
    <div
      id="lineup-modal-backdrop"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="lineup-modal-container"
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Target element: div#lineup-modal-container > div:nth-of-type(1) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#165094] to-[#0B2545] flex items-center justify-center border-2 border-amber-400 text-white font-black text-sm shadow-md">
              ⚽
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  {resolvedHome.formation} vs {resolvedAway.formation}
                </span>
                <span className="text-xs text-slate-300">Sofascore Matchcenter</span>
              </div>
              <h3 className="font-bold text-base text-white leading-tight mt-0.5">
                {match.homeTeam} – {match.awayTeam}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="close-lineup-modal-btn"
              onClick={onClose}
              aria-label="Lukk lagoppstilling"
              className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 active:bg-slate-600 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content - Sofascore Matchcenter Lineups */}
        <div className="overflow-y-auto p-3 sm:p-5 space-y-4 text-slate-900 flex-1">
          {/* SOFASCORE TOP CONTROL BAR (Confirmed/Predicted status, Filters, Actions) */}
          <div className="bg-slate-900 text-white rounded-2xl p-3 sm:p-4 border border-slate-800 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Status Dropdown / Pill */}
              <div className="flex items-center space-x-2">
                <span
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-xs transition-colors ${
                    isConfirmedLineups
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 ring-1 ring-emerald-500/20'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 ring-1 ring-amber-500/20'
                  }`}
                  title={
                    isConfirmedLineups
                      ? 'Startoppstillingen er bekreftet i det offisielle NFF FIKS kampskjemaet.'
                      : 'Startoppstillingen er forventet basert på forrige kamp i samme formasjon.'
                  }
                >
                  {isConfirmedLineups ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Confirmed lineups</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                      <span>Predicted lineups</span>
                    </>
                  )}
                </span>

                {/* Mode toggle: Dual Pitch vs Table */}
                <div className="hidden sm:inline-flex items-center space-x-1 bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/60 text-xs">
                  <button
                    onClick={() => setLineupPitchMode('dual')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      lineupPitchMode === 'dual'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Bane (Begge lag)
                  </button>
                  <button
                    onClick={() => setLineupPitchMode('table')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      lineupPitchMode === 'table'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Kampskjema
                  </button>
                </div>
              </div>

              {/* Sofascore Filter Pills (Performance, Club, Age, Height/Number) */}
              <div className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto py-0.5 no-scrollbar">
                <button
                  onClick={() => setLineupFilter('performance')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    lineupFilter === 'performance'
                      ? 'bg-white text-slate-900 shadow-md font-black'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60'
                  }`}
                >
                  Performance
                </button>
                <button
                  onClick={() => setLineupFilter('club')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    lineupFilter === 'club'
                      ? 'bg-white text-slate-900 shadow-md font-black'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60'
                  }`}
                >
                  Club
                </button>
                <button
                  onClick={() => setLineupFilter('age')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    lineupFilter === 'age'
                      ? 'bg-white text-slate-900 shadow-md font-black'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60'
                  }`}
                >
                  Age / Pos
                </button>
                <button
                  onClick={() => setLineupFilter('number')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    lineupFilter === 'number'
                      ? 'bg-white text-slate-900 shadow-md font-black'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/60'
                  }`}
                >
                  Draktnr
                </button>
              </div>

              {/* Actions: Share Lineups & Embed Code */}
              <div className="flex items-center space-x-1.5 ml-auto">
                <button
                  onClick={async () => {
                    const hNames = resolvedHome.starters.map((s) => s.name).join(', ');
                    const aNames = resolvedAway.starters.map((s) => s.name).join(', ');
                    const shareTxt = `⚽ ${match.homeTeam} vs ${match.awayTeam}\nFormasjon: ${resolvedHome.formation} vs ${resolvedAway.formation}\n\n🏠 ${match.homeTeam} (${resolvedHome.formation}):\n${hNames}\n\n✈️ ${match.awayTeam} (${resolvedAway.formation}):\n${aNames}\n\n${resolvedHome.sourceDescription}`;
                    try {
                      await navigator.clipboard.writeText(shareTxt);
                      setLineupCopied(true);
                      setTimeout(() => setLineupCopied(false), 3000);
                    } catch {
                      // fallback
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-xs ${
                    lineupCopied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {lineupCopied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{lineupCopied ? 'Kopiert!' : 'Share lineups'}</span>
                </button>

                <button
                  onClick={() => setShowEmbedCode(!showEmbedCode)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                  title="Vis kilde & embed-kode"
                >
                  <Code className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Subtext info for Predicted vs Confirmed */}
            <div className="text-[11px] text-slate-400 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800/80 flex items-start space-x-2">
              <span className="text-sm shrink-0">
                {isConfirmedLineups ? '🛡️' : '⚡'}
              </span>
              <div className="leading-snug">
                <strong className="text-slate-200">
                  {isConfirmedLineups ? 'Offisiell startoppstilling:' : 'Forventet startoppstilling:'}
                </strong>{' '}
                <span>
                  {isConfirmedLineups
                    ? 'Bekreftet og innmeldt i NFF FIKS kampskjema.'
                    : (resolvedHome.sourceDescription || 'Beregnet ut fra forrige startoppstilling i samme formasjon. Oppdateres automatisk så snart troppen er offisielt registrert hos NFF.')}
                </span>
              </div>
            </div>

            {/* Embed code snippet toggle */}
            {showEmbedCode && (
              <div className="p-3 bg-slate-950 rounded-xl border border-blue-500/40 text-xs font-mono space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-slate-400 text-[10px] font-sans">
                  <span>Integrasjonskode for kampsenter / iframe</span>
                  <button
                    onClick={() => setShowEmbedCode(false)}
                    className="text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    Lukk
                  </button>
                </div>
                <code className="block bg-slate-900 text-blue-300 p-2 rounded border border-slate-800 break-all select-all">
                  {`<iframe src="${window.location.origin}/match/${match.id}/lineup" width="100%" height="480" frameborder="0"></iframe>`}
                </code>
              </div>
            )}
          </div>

          {/* TEAMS SUB-HEADER: FORMATION & TEAM KIT DISPLAY */}
          <div className="flex items-center justify-between px-2 pt-1 text-slate-800">
            {/* Home Team & Formation */}
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#165094] to-[#0B2545] text-white flex items-center justify-center font-black text-xs shadow-md border-2 border-amber-400/40">
                {isBonesHome ? 'B' : match.homeTeam.substring(0, 1)}
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base leading-tight text-slate-900">
                  {match.homeTeam}
                </h3>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="font-mono text-xs font-extrabold text-[#165094] bg-blue-50 border border-blue-200 px-2 py-0.2 rounded-md">
                    {resolvedHome.formation}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {resolvedHome.starters.length} start • {resolvedHome.bench.length} reserver
                  </span>
                </div>
              </div>
            </div>

            {/* Away Team & Formation */}
            <div className="flex items-center space-x-2.5 text-right">
              <div>
                <h3 className="font-black text-sm sm:text-base leading-tight text-slate-900">
                  {match.awayTeam}
                </h3>
                <div className="flex items-center justify-end space-x-1.5 mt-0.5">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {resolvedAway.starters.length} start • {resolvedAway.bench.length} reserver
                  </span>
                  <span className="font-mono text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.2 rounded-md">
                    {resolvedAway.formation}
                  </span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white flex items-center justify-center font-black text-xs shadow-md border-2 border-white">
                {isBonesAway ? 'B' : match.awayTeam.substring(0, 1)}
              </div>
            </div>
          </div>

          {/* SOFASCORE DUAL-TEAM HORIZONTAL FOOTBALL PITCH */}
          {lineupPitchMode !== 'table' && (
            <div className="relative w-full overflow-x-auto rounded-2xl border-2 border-emerald-950/80 shadow-2xl bg-slate-950 p-1 sm:p-2">
              <div className="relative min-w-[580px] w-full min-h-[380px] sm:min-h-[440px] rounded-xl overflow-hidden shadow-inner select-none bg-gradient-to-br from-[#064e3b] via-[#043e30] to-[#022c22]">
                {/* Realistic Stadium Pitch Stripes */}
                <div className="absolute inset-0 opacity-15 pointer-events-none flex">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={`stripe-${i}`}
                      className={`flex-1 h-full ${i % 2 === 0 ? 'bg-white/10' : 'bg-transparent'}`}
                    />
                  ))}
                </div>

                {/* Outer Boundary Line */}
                <div className="absolute inset-3 border-2 border-white/35 rounded-sm pointer-events-none" />

                {/* Halfway Line */}
                <div className="absolute top-3 bottom-3 left-1/2 w-0.5 bg-white/35 -translate-x-1/2 pointer-events-none" />

                {/* Center Circle & Spot */}
                <div className="absolute top-1/2 left-1/2 w-24 h-24 border-2 border-white/35 rounded-full -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                  <div className="w-2 h-2 bg-white/50 rounded-full" />
                </div>

                {/* Left Penalty Box (Home Goal Area) */}
                <div className="absolute top-[18%] bottom-[18%] left-3 w-[16%] border-r-2 border-t-2 border-b-2 border-white/35 rounded-r-xs pointer-events-none" />
                <div className="absolute top-[34%] bottom-[34%] left-3 w-[6%] border-r-2 border-t-2 border-b-2 border-white/30 pointer-events-none" />
                <div className="absolute top-1/2 left-[19%] w-8 h-16 border-r-2 border-white/25 rounded-r-full -translate-y-1/2 pointer-events-none" />

                {/* Right Penalty Box (Away Goal Area) */}
                <div className="absolute top-[18%] bottom-[18%] right-3 w-[16%] border-l-2 border-t-2 border-b-2 border-white/35 rounded-l-xs pointer-events-none" />
                <div className="absolute top-[34%] bottom-[34%] right-3 w-[6%] border-l-2 border-t-2 border-b-2 border-white/30 pointer-events-none" />
                <div className="absolute top-1/2 right-[19%] w-8 h-16 border-l-2 border-white/25 rounded-l-full -translate-y-1/2 pointer-events-none" />

                {/* HOME TEAM PLAYERS (Left half, attacking right) */}
                {(() => {
                  const slots = calculatePitchCoordinates(resolvedHome.formation, 'home', resolvedHome.starters.length);
                  return resolvedHome.starters.map((p, idx) => {
                    const slot = slots[idx] || { x: 20, y: 50, role: 'MID' };
                    const cand = candidateMap.get(p.name.trim().toLowerCase());
                    const isCaptain = p.role === 'Kaptein';
                    return (
                      <div
                        key={`home-starter-${p.id || p.name}-${idx}`}
                        style={{
                          position: 'absolute',
                          left: `${slot.x}%`,
                          top: `${slot.y}%`,
                          transform: 'translate(-50%, -50%)',
                          zIndex: 20,
                        }}
                      >
                        <PitchPin
                          player={p}
                          isKeeper={slot.role === 'GK' || p.position === 'Keeper'}
                          candidate={cand}
                          filter={lineupFilter}
                          teamSide="home"
                          isCaptain={isCaptain}
                          isMatchPlayed={match.status === 'finished' || (match.status as string) === 'live'}
                          onClick={() => onSelectPlayer(p.name, match.teamId)}
                        />
                      </div>
                    );
                  });
                })()}

                {/* AWAY TEAM PLAYERS (Right half, attacking left) */}
                {(() => {
                  const slots = calculatePitchCoordinates(resolvedAway.formation, 'away', resolvedAway.starters.length);
                  return resolvedAway.starters.map((p, idx) => {
                    const slot = slots[idx] || { x: 80, y: 50, role: 'MID' };
                    const cand = candidateMap.get(p.name.trim().toLowerCase());
                    const isCaptain = p.role === 'Kaptein';
                    return (
                      <div
                        key={`away-starter-${p.id || p.name}-${idx}`}
                        style={{
                          position: 'absolute',
                          left: `${slot.x}%`,
                          top: `${slot.y}%`,
                          transform: 'translate(-50%, -50%)',
                          zIndex: 20,
                        }}
                      >
                        <PitchPin
                          player={p}
                          isKeeper={slot.role === 'GK' || p.position === 'Keeper'}
                          candidate={cand}
                          filter={lineupFilter}
                          teamSide="away"
                          isCaptain={isCaptain}
                          isMatchPlayed={match.status === 'finished' || (match.status as string) === 'live'}
                          onClick={() => onSelectPlayer(p.name, match.teamId)}
                        />
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* MANAGERS / TRENERTEAM ROW (Sofascore style) */}
          <div className="bg-slate-900 text-white rounded-2xl p-3.5 border border-slate-800 shadow-md">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 text-center mb-2.5">
              Managers / Trenere
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-800">
              {/* Home Manager */}
              <div className="pr-3 flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-full bg-blue-950 border border-blue-500/40 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                  👔
                </div>
                <div className="truncate">
                  <div className="text-[10px] font-bold text-blue-300 uppercase">
                    {match.homeTeam}
                  </div>
                  <div className="font-bold text-xs text-white truncate">
                    {resolvedHome.coach || (isBonesHome ? 'Bønes Trenerteam' : `${match.homeTeam} Trenerteam`)}
                  </div>
                </div>
              </div>

              {/* Away Manager */}
              <div className="pl-3 flex items-center justify-end space-x-2.5 text-right">
                <div className="truncate">
                  <div className="text-[10px] font-bold text-amber-300 uppercase">
                    {match.awayTeam}
                  </div>
                  <div className="font-bold text-xs text-white truncate">
                    {resolvedAway.coach || (isBonesAway ? 'Bønes Trenerteam' : `${match.awayTeam} Trenerteam`)}
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-amber-950 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                  👔
                </div>
              </div>
            </div>
          </div>

          {/* BENCH / RESERVER SEKSJON (Side-by-side) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between px-1">
              <h5 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Reserver & Innbyttere
              </h5>
              <span className="text-[11px] text-slate-400">
                {resolvedHome.bench.length} på {match.homeTeam} • {resolvedAway.bench.length} på {match.awayTeam}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Home Bench */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs divide-y divide-slate-100">
                <div className="bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 flex justify-between items-center">
                  <span>{match.homeTeam} ({resolvedHome.bench.length})</span>
                  <span className="text-[10px] text-slate-400">Hjemmebenk</span>
                </div>
                {resolvedHome.bench.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400 italic text-center">
                    Ingen innbyttere registrert i kampskjema
                  </div>
                ) : (
                  resolvedHome.bench.map((p, idx) => {
                    const pNum = (p as any).jerseyNumber ?? p.number ?? '?';
                    const cand = candidateMap.get(p.name.trim().toLowerCase());
                    return (
                      <div
                        key={`h-bench-${p.id || p.name}-${idx}`}
                        onClick={() => onSelectPlayer(p.name, match.teamId)}
                        className="px-3 py-2 flex items-center justify-between hover:bg-blue-50/60 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 group-hover:bg-[#165094] group-hover:text-white flex items-center justify-center font-bold text-[10px] shrink-0 transition-colors">
                            {pNum}
                          </span>
                          <div className="truncate">
                            <span className="font-bold text-xs text-slate-800 group-hover:text-[#165094] truncate block">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-slate-400">{p.position || 'Innbytter'}</span>
                          </div>
                        </div>
                        {cand && cand.algoRating !== undefined && !cand.isUnusedSub ? (
                          <span className="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                            ★ {cand.algoRating.toFixed(1)}
                          </span>
                        ) : cand?.isUnusedSub ? (
                          <span className="text-[10px] text-slate-400 font-medium italic">Ubenyttet</span>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Away Bench */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs divide-y divide-slate-100">
                <div className="bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 flex justify-between items-center">
                  <span>{match.awayTeam} ({resolvedAway.bench.length})</span>
                  <span className="text-[10px] text-slate-400">Bortebenk</span>
                </div>
                {resolvedAway.bench.length === 0 ? (
                  <div className="p-3 text-xs text-slate-400 italic text-center">
                    Ingen innbyttere registrert i kampskjema
                  </div>
                ) : (
                  resolvedAway.bench.map((p, idx) => {
                    const pNum = (p as any).jerseyNumber ?? p.number ?? '?';
                    const cand = candidateMap.get(p.name.trim().toLowerCase());
                    return (
                      <div
                        key={`a-bench-${p.id || p.name}-${idx}`}
                        onClick={() => onSelectPlayer(p.name, match.teamId)}
                        className="px-3 py-2 flex items-center justify-between hover:bg-amber-50/60 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center font-bold text-[10px] shrink-0 transition-colors">
                            {pNum}
                          </span>
                          <div className="truncate">
                            <span className="font-bold text-xs text-slate-800 group-hover:text-amber-800 truncate block">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-slate-400">{p.position || 'Innbytter'}</span>
                          </div>
                        </div>
                        {cand && cand.algoRating !== undefined && !cand.isUnusedSub ? (
                          <span className="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                            ★ {cand.algoRating.toFixed(1)}
                          </span>
                        ) : cand?.isUnusedSub ? (
                          <span className="text-[10px] text-slate-400 font-medium italic">Ubenyttet</span>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Klikk på enhver spiller for å åpne spillerprofil og formkurve
          </span>
          <button
            id="close-lineup-bottom-btn"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors shadow-xs active:scale-98 cursor-pointer ml-auto"
          >
            Lukk oppstilling
          </button>
        </div>
      </div>
    </div>
  );
};

// Sub-component: Sofascore pitch pin with rating badge and filter states
const PitchPin: React.FC<{
  player: Player;
  isKeeper?: boolean;
  candidate?: PlayerOfTheMatchCandidate;
  filter?: 'performance' | 'club' | 'age' | 'number';
  teamSide?: 'home' | 'away';
  isCaptain?: boolean;
  isMatchPlayed?: boolean;
  onClick: () => void;
}> = ({ player, isKeeper, candidate, filter = 'performance', teamSide = 'home', isCaptain = false, isMatchPlayed = false, onClick }) => {
  if (!player) return null;
  const pNum = (player as any).jerseyNumber ?? player.number ?? '?';
  const hasValidRating = isMatchPlayed && typeof candidate?.algoRating === 'number' && !isNaN(candidate.algoRating) && !candidate.isUnusedSub;
  const ratingNum = hasValidRating ? candidate!.algoRating! : undefined;
  const ratingStr = ratingNum !== undefined ? ratingNum.toFixed(1) : undefined;

  // Performance tier color coding matching Sofascore
  let ratingBadgeStyle = 'bg-blue-600 text-white font-bold';
  if (ratingNum !== undefined) {
    if (ratingNum >= 8.5) {
      ratingBadgeStyle = 'bg-amber-400 text-slate-950 font-black ring-1 ring-amber-300';
    } else if (ratingNum >= 7.5) {
      ratingBadgeStyle = 'bg-emerald-600 text-white font-black';
    } else if (ratingNum <= 6.2) {
      ratingBadgeStyle = 'bg-orange-600 text-white font-medium';
    }
  }

  const tagText = candidate?.tags?.[0];
  const isAway = teamSide === 'away';
  const surname = player.name ? player.name.split(' ').slice(-1)[0] : 'Spiller';
  const initial = player.name ? player.name.charAt(0) : '';

  // Avatar styling based on teamSide and role
  const avatarRing = isKeeper
    ? 'border-amber-400 bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950'
    : isAway
    ? 'border-white bg-gradient-to-b from-amber-500 to-amber-700 text-white'
    : 'border-white bg-gradient-to-b from-[#165094] to-[#0a2b57] text-white';

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center group cursor-pointer focus:outline-hidden min-w-[58px] px-1 py-0.5 rounded-lg active:scale-95 transition-transform"
      title={`${player.name} (#${pNum})${ratingStr ? ` - Børs: ${ratingStr}/10` : ''}${tagText ? ` • ${tagText}` : ''}`}
    >
      <div className="relative">
        {/* Sofascore Circular Player Avatar Badge */}
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex flex-col items-center justify-center font-black text-xs shadow-lg border-2 ${avatarRing} group-hover:scale-105 group-hover:ring-2 group-hover:ring-amber-300 transition-all relative overflow-hidden`}
        >
          {/* Subtle kit/collar accent */}
          <div className="absolute top-0 inset-x-2 h-1 bg-white/25 rounded-b-xs" />
          <span className="font-mono text-xs leading-none drop-shadow-xs">{pNum}</span>
          <span className="text-[8px] font-bold opacity-80 uppercase leading-none mt-0.5">
            {isKeeper ? 'GK' : initial}
          </span>
        </div>

        {/* Dynamic Badge: Rating / Filter info - Only show performance rating if genuine rating exists */}
        {filter === 'performance' && ratingStr && (
          <span
            className={`absolute -bottom-1 -right-2 text-[9px] px-1.5 py-0.2 rounded-full shadow-md border border-white font-mono leading-tight ${ratingBadgeStyle}`}
          >
            {ratingStr}
          </span>
        )}

        {filter === 'club' && (
          <span
            className={`absolute -bottom-1 -right-2 text-[8px] px-1.5 py-0.2 rounded-full shadow-md border border-white font-black leading-tight ${
              isAway ? 'bg-amber-600 text-white' : 'bg-[#165094] text-white'
            }`}
          >
            {isAway ? 'AWAY' : 'BØNES'}
          </span>
        )}

        {filter === 'age' && (
          <span className="absolute -bottom-1 -right-2 text-[8px] px-1.5 py-0.2 rounded-full shadow-md border border-white font-black leading-tight bg-slate-800 text-blue-200">
            {player.position ? player.position.substring(0, 3) : 'SP'}
          </span>
        )}

        {filter === 'number' && (
          <span className="absolute -bottom-1 -right-2 text-[8px] px-1.5 py-0.2 rounded-full shadow-md border border-white font-black leading-tight bg-slate-900 text-amber-300">
            #{pNum}
          </span>
        )}
      </div>

      {/* Name and Captain Pill */}
      <span className="text-[10px] font-bold text-white drop-shadow-md mt-1.5 max-w-[72px] truncate text-center bg-slate-950/80 border border-white/10 px-1.5 py-0.5 rounded-md flex items-center justify-center space-x-0.5">
        <span className="truncate">{surname}</span>
        {isCaptain && <span className="text-amber-400 font-black shrink-0 text-[9px]">(c)</span>}
      </span>
    </button>
  );
};
