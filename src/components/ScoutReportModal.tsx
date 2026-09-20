import React, { useState, useEffect } from 'react';
import { Match, OpponentScoutReport, ScoutKeyPlayer, ScoutRecentMatch } from '../types.js';
import {
  X,
  Binoculars,
  TrendingUp,
  Shield,
  Award,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Flame,
  Zap,
  Target,
  Users,
  Activity,
  Calendar,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface ScoutReportProps {
  match?: Match | null;
  opponentName?: string;
  opponentFiksId?: number;
  teamId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ScoutReportView: React.FC<{
  match?: Match | null;
  opponentName?: string;
  opponentFiksId?: number;
  teamId?: string;
  onClose?: () => void;
}> = ({ match, opponentName, opponentFiksId, teamId, onClose }) => {
  const [report, setReport] = useState<OpponentScoutReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Derive initial opponent name
  const resolvedOpponent = opponentName || (match
    ? (match.homeTeam.toLowerCase().includes('bønes') ? match.awayTeam : match.homeTeam)
    : 'Motstander');

  const resolvedTeamId = teamId || match?.teamId || '';

  const fetchScoutReport = async (force: boolean = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (match?.id) params.set('matchId', match.id);
      if (match?.fiksId) params.set('matchFiksId', String(match.fiksId));
      if (opponentFiksId || match?.opponentFiksId) {
        params.set('opponentFiksId', String(opponentFiksId || match?.opponentFiksId));
      }
      params.set('opponent', resolvedOpponent);
      if (resolvedTeamId) params.set('teamId', resolvedTeamId);
      if (match?.division) params.set('division', match.division);
      if (force) params.set('force', 'true');

      const res = await fetch(`/api/bones/scout?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Kunne ikke hente speiderrapport (status ${res.status})`);
      }
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
      } else {
        throw new Error(data.error || 'Ingen data mottatt fra speidertjenesten.');
      }
    } catch (err: any) {
      setError(err.message || 'Feil ved innhenting av speiderrapport.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScoutReport(false);
  }, [match?.id, resolvedOpponent, opponentFiksId, resolvedTeamId, match?.division]);

  const handleCopySummary = () => {
    if (!report) return;
    const text = `🔍 SPEIDERRAPPORT: ${report.opponentTeamName}
NFF FIKS: #${report.opponentFiksId} | Divisjon: ${report.division}
Plassering: #${report.currentRank} (${report.points}p på ${report.played} kamper)
Målstatistikk: ${report.goalsFor} scoret (${report.goalsPerMatch}/kamp), ${report.goalsAgainst} innsluppet
Form: ${report.form.join(' - ')} (${report.formStreakDescription})
Nøkkelspiller: ${report.topScorerName || 'Flere profiler'} (${report.topScorerGoals || 0} mål)
Taktisk vurdering: ${report.tacticalAnalysis.playStyle}
Trenerens råd: ${report.tacticalAnalysis.coachAdviceForBones}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="relative mb-4">
          <div className="w-12 h-12 rounded-full border-3 border-indigo-200 border-t-indigo-600 animate-spin"></div>
          <Binoculars className="w-6 h-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Innhenter speiderrapport...</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Analyserer NFF FIKS-data, nylig form, målstatistikk og nøkkelspillere for {resolvedOpponent}...
        </p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6 text-center">
        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Kunne ikke laste speiderrapport</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">{error || 'Ukjent feil oppstod.'}</p>
        <button
          type="button"
          onClick={() => fetchScoutReport(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#165094] text-white hover:bg-[#0F3A6D] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Prøv igjen</span>
        </button>
      </div>
    );
  }

  const threatColors = {
    'Meget høy': 'bg-red-500 text-white border-red-600',
    'Høy': 'bg-orange-500 text-white border-orange-600',
    'Moderat': 'bg-amber-500 text-white border-amber-600',
    'Lav': 'bg-emerald-500 text-white border-emerald-600'
  };

  const getFormBadgeColor = (res: 'W' | 'D' | 'L') => {
    if (res === 'W') return 'bg-emerald-600 text-white';
    if (res === 'D') return 'bg-amber-500 text-white';
    return 'bg-red-600 text-white';
  };

  const getFormLabel = (res: 'W' | 'D' | 'L') => {
    if (res === 'W') return 'V';
    if (res === 'D') return 'U';
    return 'T';
  };

  return (
    <div className="space-y-5">
      {/* Opponent Identity Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
          <Binoculars className="w-48 h-48 text-white" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {report.targetTeamCategory && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-black bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 tracking-wide">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span>KUN {report.targetTeamCategory.toUpperCase()}</span>
                </span>
              )}

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                <Binoculars className="w-3 h-3" />
                <span>NFF SPEIDERRAPPORT</span>
              </span>

              {report.opponentFiksId && (
                <a
                  href={`https://www.fotball.no/fotballdata/lag/hjem/?fiksId=${report.opponentFiksId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Åpne lagside hos fotball.no"
                >
                  <span>FIKS-ID: #{report.opponentFiksId}</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              )}

              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                  threatColors[report.tacticalAnalysis.threatLevel] || 'bg-slate-700 text-white'
                }`}
              >
                Trussel: {report.tacticalAnalysis.threatLevel}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{report.opponentTeamName}</span>
            </h2>

            <p className="text-xs text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-emerald-300">Fokus: {report.targetTeamCategory || report.ageGroup}</span>
              <span>•</span>
              <span className="font-semibold text-indigo-300">{report.division}</span>
              {report.bonesTeamName && (
                <>
                  <span>•</span>
                  <span>Bønes-lag: <strong className="text-white">{report.bonesTeamName}</strong></span>
                </>
              )}
              <span>•</span>
              <span>
                Tabell: <strong className="text-white">#{report.currentRank}</strong> av {report.totalTeams} lag
              </span>
              <span>•</span>
              <span>
                Poeng: <strong className="text-white">{report.points}p</strong> ({report.won}V - {report.drawn}U - {report.lost}T)
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors border border-white/10"
              title="Kopier speidersammendrag"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Kopiert!' : 'Kopier'}</span>
            </button>

            <button
              type="button"
              onClick={() => fetchScoutReport(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              title="Oppdater fersk data fra NFF"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Henter...' : 'Oppdater'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat KPI Metric Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Goals Scored */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Scorede mål</span>
            <Target className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{report.goalsFor}</span>
            <span className="text-xs font-bold text-emerald-700">({report.goalsPerMatch}/k)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Målforskjell: {report.goalDiff > 0 ? `+${report.goalDiff}` : report.goalDiff}</p>
        </div>

        {/* Goals Conceded */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Innslupne</span>
            <Shield className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{report.goalsAgainst}</span>
            <span className="text-xs font-bold text-slate-500">({report.goalsConcededPerMatch}/k)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{report.cleanSheets} kamper holdt nullen</p>
        </div>

        {/* Win Rate */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Seiersrate</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{report.winRatePercent}%</span>
            <span className="text-xs font-bold text-slate-500">{report.won} av {report.played}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{report.points} poeng sanket</p>
        </div>

        {/* Form Streak */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
            <span>Nylig form</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-center gap-1 my-0.5">
            {report.form.slice(-5).map((res, i) => (
              <span
                key={i}
                className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black ${getFormBadgeColor(
                  res
                )}`}
                title={res === 'W' ? 'Seier' : res === 'D' ? 'Uavgjort' : 'Tap'}
              >
                {getFormLabel(res)}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 truncate font-medium">{report.formStreakDescription}</p>
        </div>
      </div>

      {/* Two Column Layout: Recent Matches & Key Players */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Siste kamper (Form) */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">Siste spilte kamper</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">NFF kamprapporter</span>
          </div>

          <div className="space-y-2">
            {report.recentMatches.map((m, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-black shrink-0 ${getFormBadgeColor(
                      m.result
                    )}`}
                  >
                    {getFormLabel(m.result)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {m.isHome ? 'Hjemme mot' : 'Borte mot'} {m.opponent}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {m.date} • {m.competition || 'Serie'}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-mono font-black text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 shrink-0 ml-2">
                  {m.score}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Nøkkelspillere (Key Players) */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">Nøkkelspillere & Trusler</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">{report.keyPlayers.length} identifisert</span>
          </div>

          <div className="space-y-2">
            {report.keyPlayers.map((p, idx) => (
              <div
                key={p.id || idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    {p.jerseyNumber || (idx + 1)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 truncate">{p.name}</span>
                      {p.fiksId && (
                        <span className="text-[10px] font-mono text-slate-400">#{p.fiksId}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-medium text-indigo-600">{p.position}</span>
                      {p.role && <span>• {p.role}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {p.goals > 0 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                      ⚽ {p.goals} mål
                    </span>
                  )}

                  {p.threatLevel && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        p.threatLevel === 'Ekstrem'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : p.threatLevel === 'Høy'
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {p.threatLevel}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tactical Speider-Analyse & Coach Tips */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Taktisk Speider-vurdering & Styrker</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Bønes IL Analyseteam</span>
        </div>

        {/* Playstyle */}
        <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Spillestil & Taktiske trekk</span>
          </div>
          <p className="text-xs text-indigo-950 font-medium leading-relaxed">
            {report.tacticalAnalysis.playStyle}
          </p>
        </div>

        {/* Strengths & Weaknesses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Strengths */}
          <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100 space-y-1.5">
            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Styrker å passe seg for</span>
            </span>
            <ul className="space-y-1">
              {report.tacticalAnalysis.strengths.map((s, i) => (
                <li key={i} className="text-xs text-emerald-950 flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold shrink-0">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100 space-y-1.5">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Svakheter vi kan utnytte</span>
            </span>
            <ul className="space-y-1">
              {report.tacticalAnalysis.weaknesses.map((w, i) => (
                <li key={i} className="text-xs text-amber-950 flex items-start gap-1.5">
                  <span className="text-amber-500 font-bold shrink-0">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Tactical Rating Progress Bars */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-700">Kapasitetsvurdering</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>Angrepskraft</span>
                <span className="font-mono font-bold text-slate-900">{report.tacticalAnalysis.attackRating}/100</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${report.tacticalAnalysis.attackRating}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>Forsvar</span>
                <span className="font-mono font-bold text-slate-900">{report.tacticalAnalysis.defenseRating}/100</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all"
                  style={{ width: `${report.tacticalAnalysis.defenseRating}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>Fart / Tempo</span>
                <span className="font-mono font-bold text-slate-900">{report.tacticalAnalysis.paceRating}/100</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{ width: `${report.tacticalAnalysis.paceRating}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>Fysikk</span>
                <span className="font-mono font-bold text-slate-900">{report.tacticalAnalysis.physicalRating}/100</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all"
                  style={{ width: `${report.tacticalAnalysis.physicalRating}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Coach Advice */}
        <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#165094] flex items-center justify-center shrink-0">
            <Award className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              Råd til Bønes IL-trenerne
            </span>
            <p className="text-xs text-slate-200 mt-0.5 leading-relaxed font-medium">
              {report.tacticalAnalysis.coachAdviceForBones}
            </p>
          </div>
        </div>
      </div>

      {/* Head-to-Head History */}
      {report.headToHead.previousMeetings.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">Innbyrdes oppgjør (Bønes vs {report.opponentTeamName})</h3>
            </div>
            <span className="text-xs font-bold text-slate-600">
              {report.headToHead.bonesWins}V - {report.headToHead.draws}U - {report.headToHead.opponentWins}T for Bønes
            </span>
          </div>

          <div className="space-y-2">
            {report.headToHead.previousMeetings.map((hm, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black ${
                      hm.resultForBones === 'W'
                        ? 'bg-emerald-600 text-white'
                        : hm.resultForBones === 'D'
                        ? 'bg-amber-500 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {hm.resultForBones === 'W' ? 'V' : hm.resultForBones === 'D' ? 'U' : 'T'}
                  </span>
                  <div>
                    <span className="font-bold text-slate-800">
                      {hm.homeTeam} vs {hm.awayTeam}
                    </span>
                    <span className="text-[11px] text-slate-400 block">{hm.date} • {hm.venue || 'Bane'}</span>
                  </div>
                </div>
                <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {hm.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
        <span>Kilde: {report.source}</span>
        <span>Sist analysert: {report.scoutedAt}</span>
      </div>
    </div>
  );
};

export const ScoutReportModal: React.FC<ScoutReportProps> = ({
  match,
  opponentName,
  opponentFiksId,
  teamId,
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-slate-50 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar with close button */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200/80 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Binoculars className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 leading-none">Speider & Motstanderanalyse</h2>
              <span className="text-[11px] text-slate-400 font-medium">Bønes IL NFF FIKS Etterretning</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Lukk speiderrapport"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <ScoutReportView
            match={match}
            opponentName={opponentName}
            opponentFiksId={opponentFiksId}
            teamId={teamId}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};
