import React, { useState, useEffect } from 'react';
import { Match, LaglederReportRequest } from '../types.js';
import {
  X,
  Shield,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  Flame,
  Scale,
  RefreshCw,
  Info
} from 'lucide-react';

interface LaglederModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Match[];
  initialMatch?: Match | null;
  onReportSuccess: (updatedMatch: Match, msg: string) => void;
}

export const LaglederModal: React.FC<LaglederModalProps> = ({
  isOpen,
  onClose,
  matches,
  initialMatch,
  onReportSuccess
}) => {
  const [reporterName, setReporterName] = useState(() => {
    return localStorage.getItem('bones_reporter_name') || '';
  });
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [action, setAction] = useState<'comment' | 'sub' | 'assist_comment' | 'status_change'>('comment');
  const [scoringTeamSide, setScoringTeamSide] = useState<'home' | 'away'>('home');
  const [minute, setMinute] = useState<number>(35);
  const [playerName, setPlayerName] = useState('');
  const [cardType, setCardType] = useState<'yellow' | 'red'>('yellow');
  const [matchStatus, setMatchStatus] = useState<'upcoming' | 'live' | 'finished'>('live');
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set default selected match
  useEffect(() => {
    if (initialMatch) {
      setSelectedMatchId(initialMatch.id);
      setHomeScore(initialMatch.homeScore ?? 0);
      setAwayScore(initialMatch.awayScore ?? 0);
      setMinute(initialMatch.currentMinute ?? 30);
      setMatchStatus(initialMatch.status);
    } else if (matches.length > 0 && !selectedMatchId) {
      // Prefer a live match or today's upcoming match
      const live = matches.find(m => m.status === 'live');
      const upcoming = matches.find(m => m.status === 'upcoming');
      const chosen = live || upcoming || matches[0];
      setSelectedMatchId(chosen.id);
      setHomeScore(chosen.homeScore ?? 0);
      setAwayScore(chosen.awayScore ?? 0);
    }
  }, [initialMatch, matches]);

  const currentMatch = matches.find(m => m.id === selectedMatchId);

  // When match selection changes, update score fields
  const handleMatchChange = (mId: string) => {
    setSelectedMatchId(mId);
    const m = matches.find(item => item.id === mId);
    if (m) {
      setHomeScore(m.homeScore ?? 0);
      setAwayScore(m.awayScore ?? 0);
      setMinute(m.currentMinute ?? 30);
      setMatchStatus(m.status);
    }
  };

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

    // Save reporter name for next time
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
      matchStatus,
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
      onReportSuccess(data.match, data.message || 'Hendelsen er registrert, lagret til database og synlig i tidslinjen!');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Feil ved innsending');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#165094] to-[#0F3A6D] text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <UserCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base">Meld inn hendelser & kommentarer</h3>
                <span className="bg-[#3E8A37] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  Tilleggsdata
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Mål og kort synkroniseres fra NFF. Meld inn kommentarer, bytter og målgivende pasninger her.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Offisiell NFF merknad */}
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start space-x-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#165094]" />
            <div>
              <span className="font-bold">Offisiell NFF-statistikk:</span> Mål og kort registreres automatisk fra NFF for å garantere 100% korrekt statistikk. Du kan bidra med live-kommentarer, spillerbytter og målgivende pasninger.
            </div>
          </div>

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
            <p className="text-[11px] text-slate-400 mt-1">
              Dette navnet vises på hendelsen i live-feeden («Innrapportert av ...»).
            </p>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setAction('comment')}
                className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all ${
                  action === 'comment'
                    ? 'bg-[#165094] text-white border-[#165094] shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>💬 Kommentar</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('sub')}
                className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all ${
                  action === 'sub'
                    ? 'bg-[#3E8A37] text-white border-[#3E8A37] shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>🔄 Bytte</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('assist_comment')}
                className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all ${
                  action === 'assist_comment'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>👟 Assist</span>
              </button>

              <button
                type="button"
                onClick={() => setAction('status_change')}
                className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all ${
                  action === 'status_change'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>⏱️ Status</span>
              </button>
            </div>
          </div>

          {/* Specific Action Inputs */}
          {currentMatch && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              
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
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-left truncate ${
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
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-left truncate ${
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Kampminutt
                  </label>
                  <div className="flex items-center space-x-1.5">
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

                {/* Match status selector */}
                {action === 'status_change' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
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
                )}
              </div>

              {/* Player Name */}
              {action !== 'status_change' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    {action === 'sub' ? 'Spiller inn / ut' : action === 'assist_comment' ? 'Målgivende pasning (spiller)' : 'Spiller(e) involvert (valgfritt)'}
                  </label>
                  <input
                    type="text"
                    placeholder={action === 'sub' ? 'F.eks. Magnus Nybø inn for Henrik Olsen' : action === 'assist_comment' ? 'F.eks. Sander Lie' : 'F.eks. Thea Karlsen'}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                  />
                </div>
              )}

              {/* Description / comment */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  {action === 'assist_comment' ? 'Kommentar til målet (valgfritt)' : 'Kommentar / Beskrivelse'}
                </label>
                <input
                  type="text"
                  placeholder={action === 'assist_comment' ? 'F.eks. Flott gjennombruddspasning i bakrom' : 'F.eks. Kjempesjanse Bønes etter corner!'}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                />
              </div>

            </div>
          )}

          {/* Footer with actions */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-200">
            <div className="flex items-center space-x-1 text-[11px] text-slate-400">
              <Info className="w-3.5 h-3.5" />
              <span>Lagres direkte i klubbdatabasen med fast kamp-ID.</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100"
              >
                Avbryt
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-[#165094] hover:bg-[#0F3A6D] text-white rounded-xl text-xs font-extrabold flex items-center space-x-2 shadow-xs transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Lagrer...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-emerald-300" />
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
