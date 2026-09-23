import React, { useState, useMemo } from 'react';
import { Match, PlayerOfTheMatchData, PlayerOfTheMatchCandidate } from '../types.js';
import { calculateMatchPOTM } from '../utils/potmCalculator.js';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LabelList
} from 'recharts';
import {
  Trophy,
  Star,
  X,
  Vote,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Shield,
  UserCheck,
  Award,
  Flame,
  ChevronRight,
  BarChart3
} from 'lucide-react';

interface CustomVoteTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomVoteTooltip: React.FC<CustomVoteTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-xs text-white p-2.5 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-1.5 min-w-[170px] z-50">
        <div className="flex items-center gap-1.5 font-bold text-amber-300 border-b border-slate-700/80 pb-1">
          <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300 shrink-0" />
          <span className="truncate">{data.fullName}</span>
        </div>
        <div className="text-[11px] text-slate-300 flex items-center justify-between gap-3">
          <span>Stemmer:</span>
          <span className="font-mono font-bold text-white">
            {data.votes} {data.votes === 1 ? 'stemme' : 'stemmer'} ({data.percentage}%)
          </span>
        </div>
        <div className="text-[11px] text-slate-300 flex items-center justify-between gap-3">
          <span>Algorating:</span>
          <span className="font-mono font-bold text-amber-400">
            {data.algoRating.toFixed(1)} / 10
          </span>
        </div>
        {data.isWinner && (
          <div className="text-[10px] font-bold text-amber-400 pt-0.5 border-t border-slate-700/60 flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>Leder Banens Beste</span>
          </div>
        )}
        {data.hasUserVoted && (
          <div className="text-[10px] font-bold text-emerald-400 pt-0.5 border-t border-slate-700/60 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Din stemme</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

interface PlayerOfTheMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  onVoteSuccess?: (updatedMatch: Match) => void;
}

export const PlayerOfTheMatchModal: React.FC<PlayerOfTheMatchModalProps> = ({
  isOpen,
  onClose,
  match,
  onVoteSuccess
}) => {
  const [potmData, setPotmData] = useState<PlayerOfTheMatchData>(() => {
    return match.playerOfTheMatch || calculateMatchPOTM(match);
  });

  const [hasVotedPlayer, setHasVotedPlayer] = useState<string | null>(() => {
    return localStorage.getItem(`bones_potm_vote_${match.id}`) || null;
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Lagleder jury mode toggle
  const [isJuryMode, setIsJuryMode] = useState<boolean>(false);
  const [jurySelectedPlayer, setJurySelectedPlayer] = useState<string>('');
  const [juryNotes, setJuryNotes] = useState<string>('');

  if (!isOpen) return null;

  const totalVotes = potmData.totalVotes || 0;
  const winner = potmData.candidates.find((c) => c.playerName === potmData.winnerName) || potmData.candidates[0];

  const chartData = useMemo(() => {
    return [...potmData.candidates]
      .sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        return b.algoRating - a.algoRating;
      })
      .map((c) => {
        const nameParts = c.playerName.trim().split(/\s+/);
        const shortName = nameParts.length > 1
          ? `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.`
          : nameParts[0];

        const pct = totalVotes > 0 ? Math.round((c.votes / totalVotes) * 100) : 0;
        const isWinner = potmData.winnerName === c.playerName;
        const hasUserVoted = hasVotedPlayer === c.playerName;

        return {
          name: shortName,
          fullName: c.playerName,
          votes: c.votes,
          percentage: pct,
          algoRating: c.algoRating,
          isWinner,
          hasUserVoted,
          team: c.team,
          jerseyNumber: c.jerseyNumber
        };
      });
  }, [potmData.candidates, potmData.winnerName, totalVotes, hasVotedPlayer]);

  const handleCastVote = async (candidate: PlayerOfTheMatchCandidate) => {
    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      // Send vote to backend
      const res = await fetch(`/api/bones/match/${match.id}/vote-potm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: candidate.playerName,
          team: candidate.team
        })
      });

      let updatedPotm: PlayerOfTheMatchData;

      if (res.ok) {
        const data = await res.json();
        updatedPotm = data.playerOfTheMatch || data.match?.playerOfTheMatch;
        if (data.match && onVoteSuccess) {
          onVoteSuccess(data.match);
        }
      } else {
        // Local calculation fallback if offline/mock
        const newVotes: Record<string, number> = {};
        potmData.candidates.forEach((c) => {
          newVotes[c.playerName] = (c.votes || 0) + (c.playerName === candidate.playerName ? 1 : 0);
        });
        updatedPotm = calculateMatchPOTM(match, newVotes);
      }

      setPotmData(updatedPotm);
      setHasVotedPlayer(candidate.playerName);
      localStorage.setItem(`bones_potm_vote_${match.id}`, candidate.playerName);
      setFeedbackMsg(`Din stemme er registrert på ${candidate.playerName}! Takk for at du stemte.`);
    } catch (err) {
      // Local fallback
      const newVotes: Record<string, number> = {};
      potmData.candidates.forEach((c) => {
        newVotes[c.playerName] = (c.votes || 0) + (c.playerName === candidate.playerName ? 1 : 0);
      });
      const updatedPotm = calculateMatchPOTM(match, newVotes);
      setPotmData(updatedPotm);
      setHasVotedPlayer(candidate.playerName);
      localStorage.setItem(`bones_potm_vote_${match.id}`, candidate.playerName);
      setFeedbackMsg(`Din stemme er registrert på ${candidate.playerName}!`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJurySubmit = async () => {
    if (!jurySelectedPlayer) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/bones/match/${match.id}/vote-potm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          juryPlayer: jurySelectedPlayer,
          juryNotes: juryNotes.trim() || undefined
        })
      });

      let updatedPotm: PlayerOfTheMatchData;
      if (res.ok) {
        const data = await res.json();
        updatedPotm = data.playerOfTheMatch || data.match?.playerOfTheMatch;
        if (data.match && onVoteSuccess) {
          onVoteSuccess(data.match);
        }
      } else {
        updatedPotm = calculateMatchPOTM(match, undefined, jurySelectedPlayer, juryNotes);
      }

      setPotmData(updatedPotm);
      setFeedbackMsg(`Juryens valg av Banens Beste (${jurySelectedPlayer}) ble lagret!`);
      setIsJuryMode(false);
    } catch (err) {
      const updatedPotm = calculateMatchPOTM(match, undefined, jurySelectedPlayer, juryNotes);
      setPotmData(updatedPotm);
      setFeedbackMsg(`Juryens valg av Banens Beste (${jurySelectedPlayer}) ble lagret!`);
      setIsJuryMode(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bønes IL Club Accent Top Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#165094] via-[#dc2626] to-[#165094]" />

        {/* Header */}
        <div className="relative bg-gradient-to-r from-[#0c1e38] via-[#165094] to-[#0c1e38] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-base tracking-tight">Banens Beste (Player of the Match)</h3>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-slate-950" />
                  Live Kåring
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                {match.homeTeam} vs {match.awayTeam} • {match.status === 'finished' ? 'Kampen er ferdigspilt' : 'Stemmer telles live'}
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

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* Explanation Banner */}
          <div className="p-3.5 bg-gradient-to-r from-amber-50 to-blue-50 border border-amber-200/80 rounded-xl text-xs text-slate-700 flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-900">
                Hvordan kåres Banens Beste?
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Resultatet avgjøres av <strong>objektiv kampscore</strong> (mål, målgivende, disiplin og prestasjoner) kombinert med <strong>publikumsstemmer</strong> fra tilskuere og supportere.
              </p>
            </div>
          </div>

          {/* Feedback message */}
          {feedbackMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{feedbackMsg}</span>
            </div>
          )}

          {/* Current Leader / Winner Spotlight Card */}
          {winner && (
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#0B2545] to-[#134E5E] text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-700">
              {/* Background Glow */}
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-300 text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-amber-400/30">
                  <Star className="w-3.5 h-3.5 fill-amber-300" />
                  {match.status === 'finished' ? 'Banens Beste' : 'Gjeldende leder'}
                </span>
                <span className="text-[11px] text-slate-300 font-medium">
                  {totalVotes} {totalVotes === 1 ? 'publikumsstemme' : 'publikumsstemmer'} registrert
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      {winner.playerName}
                    </h4>
                    {winner.jerseyNumber && (
                      <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded text-amber-200 font-bold">
                        #{winner.jerseyNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-blue-200 font-semibold">
                    {winner.team} • {winner.position || 'Spiller'}
                  </p>
                  {(winner.goals > 0 || winner.assists > 0) && (
                    <div className="flex items-center gap-2 text-xs text-amber-200 font-bold mt-1">
                      {winner.goals > 0 && <span>⚽ {winner.goals} mål</span>}
                      {winner.assists > 0 && <span>👟 {winner.assists} assist</span>}
                    </div>
                  )}
                </div>

                {/* Rating Badge */}
                <div className="flex flex-col items-center justify-center bg-amber-400 text-slate-950 px-3.5 py-2 rounded-xl shadow-lg shrink-0 ring-4 ring-amber-400/20">
                  <span className="text-[10px] font-black uppercase tracking-wider">Score</span>
                  <span className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
                    {winner.algoRating.toFixed(1)}
                  </span>
                  <span className="text-[9px] font-bold text-slate-800">av 10.0</span>
                </div>
              </div>
            </div>
          )}

          {/* Live Stemmefordeling (Recharts Horizontal Bar Chart) */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-[#165094]/10 text-[#165094] flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <span>Live stemmefordeling</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-full border border-amber-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Sanntid
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Stolpediagram som viser stemmefordeling blant de nominerte
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-black text-slate-800">
                  {totalVotes} {totalVotes === 1 ? 'stemme' : 'stemmer'}
                </span>
                <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                  Publikum
                </span>
              </div>
            </div>

            {/* Recharts BarChart container */}
            <div className="w-full" style={{ height: Math.max(140, chartData.length * 34) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 2, right: 45, left: 10, bottom: 2 }}
                >
                  <XAxis type="number" hide domain={[0, totalVotes > 0 ? 'dataMax + 1' : 5]} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#1e293b', fontWeight: 700 }}
                    width={85}
                  />
                  <Tooltip content={<CustomVoteTooltip />} cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }} />
                  <Bar dataKey="votes" radius={[0, 6, 6, 0]} barSize={16}>
                    {chartData.map((entry, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={entry.isWinner ? '#f59e0b' : entry.hasUserVoted ? '#059669' : '#3b82f6'}
                      />
                    ))}
                    <LabelList
                      dataKey="votes"
                      position="right"
                      formatter={(val: any) => {
                        const count = Number(val) || 0;
                        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                        return `${count} (${pct}%)`;
                      }}
                      style={{ fontSize: '10px', fontWeight: 700, fill: '#475569' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Mini Legend / Guide */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 text-[10px] text-slate-500 font-medium">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-2xs" />
                  <span className="font-semibold text-slate-700">Leder / Banens Beste</span>
                </div>
                {hasVotedPlayer && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block shadow-2xs" />
                    <span className="font-semibold text-slate-700">Din stemme</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-2xs" />
                  <span className="font-semibold text-slate-700">Nominerte</span>
                </div>
              </div>
              {totalVotes === 0 && (
                <span className="text-amber-700 italic">
                  Avgi den første stemmen for å oppdatere diagrammet!
                </span>
              )}
            </div>
          </div>

          {/* Voting candidates list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Vote className="w-3.5 h-3.5 text-[#165094]" />
                <span>Kandidater & Stemmer ({potmData.candidates.length})</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">
                {hasVotedPlayer ? 'Du har avgitt stemme' : 'Trykk på en spiller for å stemme'}
              </span>
            </div>

            <div className="space-y-2">
              {potmData.candidates.map((c, index) => {
                const isSelected = hasVotedPlayer === c.playerName;
                const votePercentage = totalVotes > 0 ? Math.round((c.votes / totalVotes) * 100) : 0;

                return (
                  <div
                    key={c.playerName}
                    className={`p-3 rounded-xl border transition-all flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-300 ring-2 ring-[#165094]/30'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                            index === 0
                              ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {index === 0 ? '👑' : c.jerseyNumber || index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-slate-900 truncate">
                              {c.playerName}
                            </span>
                            {c.team.toLowerCase().includes('bønes') && (
                              <span className="text-[9px] bg-[#165094] text-white px-1.5 py-0.2 rounded font-bold">
                                Bønes
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                            <span>{c.position || 'Spiller'}</span>
                            {c.goals > 0 && <span className="text-amber-700 font-bold">• ⚽ {c.goals} mål</span>}
                            {c.assists > 0 && <span className="text-blue-700 font-bold">• 👟 {c.assists} assist</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        {/* Rating pill */}
                        <div className="text-right">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 font-mono text-xs font-bold text-slate-800">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                            <span>{c.algoRating.toFixed(1)}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                            {c.votes} {c.votes === 1 ? 'stemme' : 'stemmer'} ({votePercentage}%)
                          </div>
                        </div>

                        {/* Vote Button */}
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleCastVote(c)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-[#165094] text-white hover:bg-[#0c1e38] shadow-xs'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              <span>Stemt</span>
                            </>
                          ) : (
                            <>
                              <Vote className="w-3.5 h-3.5 text-amber-300" />
                              <span>Stem</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Voting progress bar */}
                    {totalVotes > 0 && (
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            index === 0 ? 'bg-amber-400' : isSelected ? 'bg-[#165094]' : 'bg-slate-300'
                          }`}
                          style={{ width: `${votePercentage}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Jury / Lagleder official selection accordion */}
          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsJuryMode(!isJuryMode)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>{isJuryMode ? 'Skjul jury/trener-valg' : 'Trener/Jury: Sett offisielt juryvalg'}</span>
              <ChevronRight className={`w-3 h-3 transition-transform ${isJuryMode ? 'rotate-90' : ''}`} />
            </button>

            {isJuryMode && (
              <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Offisiell jury/trenerkåring
                  </label>
                  <select
                    value={jurySelectedPlayer}
                    onChange={(e) => setJurySelectedPlayer(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="">Velg spiller...</option>
                    {potmData.candidates.map((c) => (
                      <option key={c.playerName} value={c.playerName}>
                        {c.playerName} ({c.team}) - Rating {c.algoRating.toFixed(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Jurybegrunnelse (valgfritt)
                  </label>
                  <input
                    type="text"
                    placeholder="F.eks. Strålende defensiv struktur og matchvinnende assist"
                    value={juryNotes}
                    onChange={(e) => setJuryNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <button
                  type="button"
                  disabled={!jurySelectedPlayer || isSubmitting}
                  onClick={handleJurySubmit}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Bekreft juryens kåring av Banens Beste
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            Live oppdatering ved nye stemmer.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Lukk
          </button>
        </div>

      </div>
    </div>
  );
};
