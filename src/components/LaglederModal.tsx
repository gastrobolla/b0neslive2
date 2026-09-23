import React, { useState, useEffect } from 'react';
import { Match, LaglederReportRequest, Player, MatchEvent } from '../types.js';
import {
  X,
  Send,
  AlertCircle,
  Clock,
  UserCheck,
  Flame,
  RefreshCw,
  Info,
  ChevronDown,
  PlusCircle,
  Link as LinkIcon,
  Shield,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface LaglederModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Match[];
  initialMatch?: Match | null;
  players?: Player[];
  onReportSuccess: (updatedMatch: Match, msg: string) => void;
}

export const LaglederModal: React.FC<LaglederModalProps> = ({
  isOpen,
  onClose,
  matches,
  initialMatch,
  players = [],
  onReportSuccess
}) => {
  const [reporterName, setReporterName] = useState(() => {
    return localStorage.getItem('bones_reporter_name') || '';
  });
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [action, setAction] = useState<
    'goal' | 'assist_comment' | 'sub' | 'card' | 'status_change' | 'comment'
  >('goal');
  const [scoringTeamSide, setScoringTeamSide] = useState<'home' | 'away'>('home');
  const [minute, setMinute] = useState<number>(35);

  // Goal fields
  const [playerName, setPlayerName] = useState('');
  const [assistPlayerName, setAssistPlayerName] = useState('');
  const [goalType, setGoalType] = useState<'regular' | 'penalty' | 'own_goal' | 'freekick' | 'header'>('regular');

  // Assist linking field: connects to existing goal in match
  const [targetGoalId, setTargetGoalId] = useState<string>('');

  // Substitution fields: links to player out and player in
  const [subOutPlayer, setSubOutPlayer] = useState('');
  const [subInPlayer, setSubInPlayer] = useState('');

  // Card fields: links to recipient, type, reason and optional event
  const [cardType, setCardType] = useState<'yellow' | 'red'>('yellow');
  const [cardReason, setCardReason] = useState('Felling / Sabotasje');
  const [targetEventId, setTargetEventId] = useState<string>('');

  // Status fields
  const [matchStatus, setMatchStatus] = useState<'upcoming' | 'live' | 'finished'>('live');
  const [matchPeriod, setMatchPeriod] = useState<'1st_half' | 'halftime' | '2nd_half' | 'extra_time' | 'fulltime'>('2nd_half');

  // Comment & description
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set default selected match
  useEffect(() => {
    if (initialMatch) {
      setSelectedMatchId(initialMatch.id);
      setMinute(initialMatch.currentMinute || 35);
      setMatchStatus(initialMatch.status);
    } else if (matches.length > 0 && !selectedMatchId) {
      const live = matches.find((m) => m.status === 'live');
      const upcoming = matches.find((m) => m.status === 'upcoming');
      const chosen = live || upcoming || matches[0];
      setSelectedMatchId(chosen.id);
      setMinute(chosen.currentMinute || 30);
      setMatchStatus(chosen.status);
    }
  }, [initialMatch, matches]);

  const currentMatch = matches.find((m) => m.id === selectedMatchId);

  // When match selection changes, update defaults
  const handleMatchChange = (mId: string) => {
    setSelectedMatchId(mId);
    const m = matches.find((item) => item.id === mId);
    if (m) {
      setMinute(m.currentMinute || 35);
      setMatchStatus(m.status);
    }
    // Reset linked IDs
    setTargetGoalId('');
    setTargetEventId('');
    setPlayerName('');
    setAssistPlayerName('');
    setSubOutPlayer('');
    setSubInPlayer('');
  };

  // Derive existing goals from current match
  const existingGoals = React.useMemo(() => {
    if (!currentMatch?.events) return [];
    return currentMatch.events.filter((e) => e.type === 'goal');
  }, [currentMatch?.events]);

  // Derive existing cards from current match
  const existingCards = React.useMemo(() => {
    if (!currentMatch?.events) return [];
    return currentMatch.events.filter((e) => e.type === 'yellow_card' || e.type === 'red_card');
  }, [currentMatch?.events]);

  // When action is 'assist_comment' and goals exist, default targetGoalId to latest goal
  useEffect(() => {
    if (action === 'assist_comment' && existingGoals.length > 0 && !targetGoalId) {
      setTargetGoalId(existingGoals[existingGoals.length - 1].id);
    }
  }, [action, existingGoals, targetGoalId]);

  // Target team lineup & squad players for autocompletion and linking
  const isSelectedTeamHome = scoringTeamSide === 'home';
  const targetLineup = React.useMemo(() => {
    if (!currentMatch) return undefined;
    return isSelectedTeamHome
      ? (currentMatch.homeLineup || (currentMatch.isHome ? currentMatch.lineup : undefined))
      : (currentMatch.awayLineup || (!currentMatch.isHome ? currentMatch.lineup : undefined));
  }, [currentMatch, isSelectedTeamHome]);

  const availablePlayers = React.useMemo(() => {
    if (!currentMatch) return [];
    const names = new Set<string>();

    // Lineup starters & subs
    if (targetLineup) {
      targetLineup.starters?.forEach((p) => names.add(p.name));
      targetLineup.subs?.forEach((p) => names.add(p.name));
    }

    // Squad registry players for Bønes IL
    if (players && players.length > 0) {
      players
        .filter(
          (p) =>
            p.teamId === currentMatch.teamId ||
            p.teamsPlayedFor?.some((t) => t.teamId === currentMatch.teamId)
        )
        .forEach((p) => names.add(p.name));
    }

    return Array.from(names).sort((a, b) => a.localeCompare(b, 'no'));
  }, [currentMatch, targetLineup, players]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!reporterName.trim()) {
      setErrorMsg('Vennligst oppgi ditt navn og rolle (f.eks. «Trener Morten» eller «Lagleder Kari G14»).');
      return;
    }

    if (!selectedMatchId || !currentMatch) {
      setErrorMsg('Vennligst velg hvilken kamp hendelsen gjelder.');
      return;
    }

    // Validation per action
    if (action === 'goal') {
      if (!playerName.trim()) {
        setErrorMsg('Vennligst angi eller velg målscorer (spiller).');
        return;
      }
    } else if (action === 'assist_comment') {
      const assistPlayer = assistPlayerName.trim() || playerName.trim();
      if (!assistPlayer) {
        setErrorMsg('Vennligst angi eller velg hvilken spiller som hadde målgivende pasning (assist).');
        return;
      }
    } else if (action === 'sub') {
      if (!subOutPlayer.trim() && !subInPlayer.trim()) {
        setErrorMsg('Vennligst angi minst én av spillerne for byttet (spiller ut eller spiller inn).');
        return;
      }
    } else if (action === 'card') {
      if (!playerName.trim()) {
        setErrorMsg('Vennligst angi eller velg spiller som mottar kortet.');
        return;
      }
    }

    // Save reporter name
    localStorage.setItem('bones_reporter_name', reporterName.trim());
    setIsSubmitting(true);

    const team = scoringTeamSide === 'home' ? currentMatch.homeTeam : currentMatch.awayTeam;

    const payload: LaglederReportRequest = {
      matchId: selectedMatchId,
      reporterName: reporterName.trim(),
      action,
      team,
      minute: Number(minute) || 0,
      player: playerName.trim() || undefined,
      assistPlayer: assistPlayerName.trim() || undefined,
      goalType: action === 'goal' ? goalType : undefined,
      targetGoalId: action === 'assist_comment' ? (targetGoalId || undefined) : undefined,
      subOutPlayer: action === 'sub' ? (subOutPlayer.trim() || undefined) : undefined,
      subInPlayer: action === 'sub' ? (subInPlayer.trim() || undefined) : undefined,
      cardType: action === 'card' ? cardType : undefined,
      cardReason: action === 'card' ? cardReason : undefined,
      targetEventId: targetEventId || undefined,
      matchStatus,
      matchPeriod,
      description: description.trim() || undefined
    };

    try {
      const res = await fetch(`/api/bones/match/${selectedMatchId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Kunne ikke registrere hendelse');
      }

      const data = await res.json();
      onReportSuccess(
        data.match,
        data.message || 'Hendelsen er registrert, knyttet og lagret til klubbdatabasen!'
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Feil ved innsending');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Header with Bønes IL Club Colors Accent Line */}
        <div className="relative bg-gradient-to-r from-[#0c1e38] via-[#165094] to-[#0c1e38] text-white p-5 flex items-center justify-between shrink-0">
          {/* Accent Line along top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#165094] via-[#dc2626] to-[#165094]" />

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
              <UserCheck className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base">Registrer kamphendelse</h3>
                <span className="bg-[#dc2626] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Live Oppdatering
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                Knytt mål, målgivende pasninger, bytter, kort og status direkte til spillere og situasjoner.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Reporter info */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Ditt navn & rolle i Bønes IL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="F.eks. Trener Morten (G14) eller Lagleder Trude"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-[#165094] focus:border-[#165094] outline-hidden"
            />
          </div>

          {/* Match selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Velg kamp <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedMatchId}
              onChange={(e) => handleMatchChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-[#165094] focus:border-[#165094] outline-hidden bg-white"
            >
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.teamName}: {m.homeTeam} vs {m.awayTeam} ({m.date} kl. {m.time}) - {m.status === 'live' ? 'PÅGÅR NÅ' : m.status === 'finished' ? 'Ferdig' : 'Kommende'}
                </option>
              ))}
            </select>
          </div>

          {/* Action Selector Pills */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Hva vil du melde inn?
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              <button
                type="button"
                onClick={() => setAction('goal')}
                className={`py-2 px-2 rounded-xl border text-xs font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  action === 'goal'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-400/40'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">⚽</span>
                <span>Mål</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('assist_comment')}
                className={`py-2 px-2 rounded-xl border text-xs font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  action === 'assist_comment'
                    ? 'bg-[#165094] text-white border-[#165094] shadow-xs ring-2 ring-blue-400/40'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">👟</span>
                <span>Assist</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('sub')}
                className={`py-2 px-2 rounded-xl border text-xs font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  action === 'sub'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-400/40'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">🔄</span>
                <span>Bytte</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('card')}
                className={`py-2 px-2 rounded-xl border text-xs font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  action === 'card'
                    ? 'bg-red-600 text-white border-red-600 shadow-xs ring-2 ring-red-400/40'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">🟨🟥</span>
                <span>Kort</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('status_change')}
                className={`py-2 px-2 rounded-xl border text-xs font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  action === 'status_change'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-400/40'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">⏱️</span>
                <span>Status</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('comment')}
                className={`py-2 px-2 rounded-xl border text-xs font-extrabold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  action === 'comment'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-400/40'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">💬</span>
                <span>Notat</span>
              </button>
            </div>
          </div>

          {currentMatch && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
              
              {/* Team side selector (Home vs Away) */}
              {action !== 'status_change' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Hvilket lag gjelder hendelsen?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setScoringTeamSide('home')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-left truncate cursor-pointer ${
                        scoringTeamSide === 'home'
                          ? 'bg-white border-[#165094] text-[#165094] shadow-xs ring-1 ring-[#165094]'
                          : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                    >
                      {currentMatch.homeTeam} (Hjemme)
                    </button>
                    <button
                      type="button"
                      onClick={() => setScoringTeamSide('away')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-left truncate cursor-pointer ${
                        scoringTeamSide === 'away'
                          ? 'bg-white border-[#165094] text-[#165094] shadow-xs ring-1 ring-[#165094]'
                          : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-white'
                      }`}
                    >
                      {currentMatch.awayTeam} (Borte)
                    </button>
                  </div>
                </div>
              )}

              {/* Minute */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Kampminutt
                </label>
                <div className="flex items-center space-x-1.5 max-w-[140px]">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={minute}
                    onChange={(e) => setMinute(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono font-bold bg-white"
                  />
                  <span className="text-xs text-slate-500 font-bold">'</span>
                </div>
              </div>

              {/* ACTION 1: GOAL (MÅL) */}
              {action === 'goal' && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Målscorer (Spiller) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="F.eks. Henrik Sølvberg"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold bg-white"
                    />
                    {availablePlayers.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <span className="text-[10px] text-slate-400 mr-1 self-center">Hurtigvelg spiller:</span>
                        {availablePlayers.slice(0, 7).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPlayerName(p)}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200/80 hover:bg-[#165094] hover:text-white transition-colors cursor-pointer"
                          >
                            {p.split(' ')[0]} {p.split(' ')[1]?.[0]}.
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Målgivende pasning (Assist) (valgfritt)
                    </label>
                    <input
                      type="text"
                      placeholder="F.eks. Sander Lie eller Ingen assist"
                      value={assistPlayerName}
                      onChange={(e) => setAssistPlayerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Type scoring
                    </label>
                    <select
                      value={goalType}
                      onChange={(e) => setGoalType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                    >
                      <option value="regular">Normalt spillemål</option>
                      <option value="penalty">Straffespark</option>
                      <option value="freekick">Direkte frispark</option>
                      <option value="header">Headingsmål</option>
                      <option value="own_goal">Selvmål</option>
                    </select>
                  </div>
                </div>
              )}

              {/* ACTION 2: ASSIST (KNYTTET TIL MÅL) */}
              {action === 'assist_comment' && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-[#165094]" />
                      <span>Knytt assist til mål i kampen <span className="text-red-500">*</span></span>
                    </label>
                    {existingGoals.length > 0 ? (
                      <select
                        value={targetGoalId}
                        onChange={(e) => setTargetGoalId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-blue-300 bg-blue-50/50 text-xs font-bold text-[#165094]"
                      >
                        {existingGoals.map((g) => (
                          <option key={g.id} value={g.id}>
                            ⚽ {g.minute}' {g.team}: {g.player || 'Mål'} {g.assistPlayer ? `(Assist: ${g.assistPlayer})` : '(Ingen assist ennå)'}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                        Ingen mål er registrert i kampen ennå. Assisten vil registreres som en målgivende hendelse.
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Målgivende spiller (Assist) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="F.eks. Sander Lie"
                      value={assistPlayerName || playerName}
                      onChange={(e) => {
                        setAssistPlayerName(e.target.value);
                        setPlayerName(e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold bg-white"
                    />
                    {availablePlayers.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <span className="text-[10px] text-slate-400 mr-1 self-center">Velg spiller:</span>
                        {availablePlayers.slice(0, 7).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setAssistPlayerName(p);
                              setPlayerName(p);
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200/80 hover:bg-[#165094] hover:text-white transition-colors cursor-pointer"
                          >
                            {p.split(' ')[0]} {p.split(' ')[1]?.[0]}.
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ACTION 3: BYTTE (SUBSTITUTION - SPILLER UT & INN) */}
              {action === 'sub' && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-red-600 uppercase mb-1 flex items-center gap-1">
                        <span>🔻 Spiller ut (av banen)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="F.eks. Henrik Olsen"
                        value={subOutPlayer}
                        onChange={(e) => setSubOutPlayer(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-red-200 bg-red-50/40 text-xs font-semibold"
                      />
                      {availablePlayers.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {availablePlayers.slice(0, 4).map((p) => (
                            <button
                              key={`out-${p}`}
                              type="button"
                              onClick={() => setSubOutPlayer(p)}
                              className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors cursor-pointer"
                            >
                              {p.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-emerald-700 uppercase mb-1 flex items-center gap-1">
                        <span>🔺 Spiller inn (på banen)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="F.eks. Magnus Nybø"
                        value={subInPlayer}
                        onChange={(e) => {
                          setSubInPlayer(e.target.value);
                          setPlayerName(e.target.value);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/40 text-xs font-semibold"
                      />
                      {availablePlayers.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {availablePlayers.slice(4, 8).map((p) => (
                            <button
                              key={`in-${p}`}
                              type="button"
                              onClick={() => {
                                setSubInPlayer(p);
                                setPlayerName(p);
                              }}
                              className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors cursor-pointer"
                            >
                              {p.split(' ')[0]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION 4: CARD (KORT KNYTTET TIL SPILLER OG ÅRSAK) */}
              {action === 'card' && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Korttype
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCardType('yellow')}
                          className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                            cardType === 'yellow'
                              ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs ring-1 ring-amber-400'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          🟨 Gult kort
                        </button>
                        <button
                          type="button"
                          onClick={() => setCardType('red')}
                          className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                            cardType === 'red'
                              ? 'bg-red-600 text-white border-red-700 shadow-xs ring-1 ring-red-400'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          🟥 Rødt kort
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Årsak / Disiplinærsak
                      </label>
                      <select
                        value={cardReason}
                        onChange={(e) => setCardReason(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                      >
                        <option value="Felling / Sabotasje">Felling / Sabotasje</option>
                        <option value="Hands">Hands</option>
                        <option value="Usportslig opptreden">Usportslig opptreden</option>
                        <option value="Protest / Munnbruk mot dommer">Protest / Munnbruk mot dommer</option>
                        <option value="Fratagelse av klar målsjanse">Fratagelse av klar målsjanse</option>
                        <option value="To gule kort">To gule kort</option>
                        <option value="Stygg takling">Stygg takling</option>
                        <option value="Annet">Annet</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Kortmottaker (Spiller) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="F.eks. Mathias Holm"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold bg-white"
                    />
                    {availablePlayers.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <span className="text-[10px] text-slate-400 mr-1 self-center">Hurtigvelg:</span>
                        {availablePlayers.slice(0, 6).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPlayerName(p)}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200/80 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {existingGoals.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                        <LinkIcon className="w-3 h-3 text-slate-400" />
                        <span>Knytt kort til målsituasjon (valgfritt)</span>
                      </label>
                      <select
                        value={targetEventId}
                        onChange={(e) => setTargetEventId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        <option value="">Ikke knyttet til mål (uavhengig situasjon)</option>
                        {existingGoals.map((g) => (
                          <option key={g.id} value={g.id}>
                            Knyttet til målet i {g.minute}'. min ({g.player || 'mål'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* ACTION 5: STATUS CHANGE */}
              {action === 'status_change' && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Ny kampstatus
                      </label>
                      <select
                        value={matchStatus}
                        onChange={(e) => setMatchStatus(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                      >
                        <option value="upcoming">Ikke startet</option>
                        <option value="live">Pågår nå (Live)</option>
                        <option value="finished">Ferdigspilt</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Omgang / Periode
                      </label>
                      <select
                        value={matchPeriod}
                        onChange={(e) => setMatchPeriod(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                      >
                        <option value="1st_half">1. omgang</option>
                        <option value="halftime">Pause</option>
                        <option value="2nd_half">2. omgang</option>
                        <option value="extra_time">Ekstraomganger</option>
                        <option value="fulltime">Fulltid</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION 6: COMMENT / NOTE (CAN BE LINKED TO GOAL OR CARD) */}
              {action === 'comment' && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Knytt kommentar til spiller (valgfritt)
                    </label>
                    <input
                      type="text"
                      placeholder="F.eks. Keeper Thea Karlsen"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                    />
                  </div>

                  {(existingGoals.length > 0 || existingCards.length > 0) && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                        <LinkIcon className="w-3.5 h-3.5 text-[#165094]" />
                        <span>Knytt til mål eller kort i kampen (valgfritt)</span>
                      </label>
                      <select
                        value={targetEventId}
                        onChange={(e) => setTargetEventId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        <option value="">Generell kampkommentar</option>
                        {existingGoals.map((g) => (
                          <option key={g.id} value={g.id}>
                            ⚽ Mål i {g.minute}'. minutt ({g.player || 'mål'} for {g.team})
                          </option>
                        ))}
                        {existingCards.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.type === 'red_card' ? '🟥 Rødt kort' : '🟨 Gult kort'} i {c.minute}'. minutt ({c.player})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Description / comment input */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Beskrivelse / Tilleggskommentar (valgfritt)
                </label>
                <input
                  type="text"
                  placeholder={
                    action === 'goal'
                      ? 'F.eks. Skudd i vinkelen fra 20 meter!'
                      : action === 'assist_comment'
                      ? 'F.eks. Nydelig stikker gjennom forsvaret'
                      : action === 'sub'
                      ? 'F.eks. Taktisk formasjonsendring'
                      : action === 'card'
                      ? 'F.eks. Protest etter hands-situasjon'
                      : 'F.eks. Stor sjanse etter hjørnespark!'
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                />
              </div>

            </div>
          )}

          {/* Footer with actions */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-200 shrink-0">
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Knyttes og lagres til kampens tidslinje.</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Avbryt
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-[#165094] hover:bg-[#0F3A6D] text-white rounded-xl text-xs font-black flex items-center space-x-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Lagrer...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-amber-300" />
                    <span>Meld inn hendelse</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
