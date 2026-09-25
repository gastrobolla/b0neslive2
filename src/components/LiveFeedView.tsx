import React, { useState, useMemo } from 'react';
import { FeedItem, ScannerState, Match } from '../types.js';
import {
  Radio,
  Flame,
  AlertTriangle,
  Trophy,
  Home,
  RefreshCw,
  Sparkles,
  Filter,
  CheckCircle2,
  Clock,
  MapPin,
  Shield,
  Star,
  Vote,
  ChevronRight,
  Award
} from 'lucide-react';
import { calculateMatchPOTM } from '../utils/potmCalculator.js';

interface LiveFeedViewProps {
  feed: FeedItem[];
  selectedTeamId: string;
  onManualScan: () => void;
  isScanning: boolean;
  scanner: ScannerState;
  matches?: Match[];
  onOpenPOTM?: (match: Match) => void;
}

export const LiveFeedView: React.FC<LiveFeedViewProps> = ({
  feed,
  selectedTeamId,
  onManualScan,
  isScanning,
  scanner,
  matches = [],
  onOpenPOTM
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  // Merge finished matches as POTM feed items if not already present
  const allFeedItems = useMemo(() => {
    const items: FeedItem[] = [...feed];
    const existingMatchIds = new Set<string>();

    for (const item of items) {
      if (item.matchId) existingMatchIds.add(item.matchId);
      if (item.id.startsWith('feed_potm_')) {
        const id = item.id.replace('feed_potm_', '');
        existingMatchIds.add(id);
      }
    }

    if (matches && matches.length > 0) {
      const finishedMatches = matches.filter((m) => m.status === 'finished');
      for (const match of finishedMatches) {
        if (existingMatchIds.has(match.id)) continue;

        const potm = match.playerOfTheMatch || calculateMatchPOTM(match);
        const winner = potm?.candidates?.find((c) => c.playerName === potm.winnerName) || potm?.candidates?.[0];

        if (winner) {
          items.push({
            id: `feed_potm_${match.id}`,
            timestamp: match.date ? `${match.date}T${match.time || '18:00'}:00Z` : new Date().toISOString(),
            timeAgo: 'Ferdigspilt',
            type: 'potm',
            teamId: match.teamId,
            teamName: match.teamName,
            title: `Kampslutt & Banens Beste: ${match.homeTeam} ${match.homeScore ?? 0} - ${match.awayScore ?? 0} ${match.awayTeam}`,
            description: `Kampen er ferdigspilt på ${match.venue}. ${winner.playerName} ble kåret til Banens Beste!`,
            badgeText: 'Banens Beste',
            isHomeMatch: match.isHome,
            venue: match.venue,
            score: `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`,
            player: winner.playerName,
            matchId: match.id,
            match,
            potmWinner: {
              name: winner.playerName,
              rating: winner.algoRating,
              votes: winner.votes || 0,
              team: winner.team,
              position: winner.position,
              totalVotes: potm.totalVotes,
              combinedScore: winner.combinedScore
            },
            impact: {
              type: 'potm',
              detail: `Banens Beste: ${winner.playerName} (★ ${(winner.algoRating ?? (winner as any).rating ?? 0).toFixed(1)})`
            }
          });
        }
      }
    }

    // Sort descending by timestamp
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [feed, matches]);

  // Compute latest POTM awards for the spotlight header
  const latestPOTMAwards = useMemo(() => {
    const list: { match: Match; winnerName: string; rating: number; votes: number; totalVotes: number; team: string }[] = [];
    const seen = new Set<string>();

    const targetMatches = matches.filter(
      (m) => m.status === 'finished' && (selectedTeamId === 'all' || m.teamId === selectedTeamId)
    );

    for (const match of targetMatches) {
      if (seen.has(match.id)) continue;
      seen.add(match.id);

      const potm = match.playerOfTheMatch || calculateMatchPOTM(match);
      const winner = potm?.candidates?.find((c) => c.playerName === potm.winnerName) || potm?.candidates?.[0];

      if (winner) {
        list.push({
          match,
          winnerName: winner.playerName,
          rating: winner.algoRating,
          votes: winner.votes || 0,
          totalVotes: potm.totalVotes || 0,
          team: winner.team || match.teamName
        });
      }
      if (list.length >= 3) break;
    }

    return list;
  }, [matches, selectedTeamId]);

  // Filter feed items
  const filteredFeed = allFeedItems.filter((item) => {
    // Filter by team if not 'all'
    if (selectedTeamId !== 'all' && item.teamId && item.teamId !== selectedTeamId) {
      return false;
    }

    // Filter by category
    if (filterType === 'all') return true;
    if (filterType === 'potm' && (item.type === 'potm' || item.impact?.type === 'potm' || Boolean(item.potmWinner))) return true;
    if (filterType === 'goals' && item.type === 'goal') return true;
    if (filterType === 'cards' && item.type === 'card') return true;
    if (filterType === 'table' && item.type === 'table') return true;
    if (filterType === 'home' && item.isHomeMatch) return true;
    if (filterType === 'sync' && item.type === 'scanner_sync') return true;

    return false;
  });

  const potmCount = allFeedItems.filter((i) => {
    if (selectedTeamId !== 'all' && i.teamId && i.teamId !== selectedTeamId) return false;
    return i.type === 'potm' || i.impact?.type === 'potm' || Boolean(i.potmWinner);
  }).length;

  return (
    <div id="live-feed-container" className="space-y-4">
      {/* Feed Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Feed Status & Source indicators */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-3.5 h-3.5 bg-red-600 rounded-full animate-ping absolute inset-0"></div>
            <div className="w-3.5 h-3.5 bg-red-600 rounded-full relative"></div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-slate-900 text-base tracking-tight">
                Sanntids Live-Feed for Bønes IL Fotball
              </h3>
              <span className="bg-red-100 text-red-700 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-red-200">
                LIVE STRØM
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-2">
              <span>Kilde: NFF fotball.no</span>
              <span>•</span>
              <span className="font-mono text-emerald-600 font-semibold">
                Neste autoskann om {scanner.nextScanSeconds}s
              </span>
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {/* Manual Scan */}
          <button
            id="btn-feed-manual-scan"
            onClick={onManualScan}
            disabled={isScanning}
            className="flex items-center space-x-1.5 px-3 py-2 bg-[#165094] hover:bg-[#0F3A6D] text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Sjekker NFF...' : 'Skann nå'}</span>
          </button>
        </div>
      </div>

      {/* Spotlight: Siste kårede 'Banens Beste' */}
      {latestPOTMAwards.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-orange-400/10 border border-amber-300 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs">
                <Trophy className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-950">
                Siste kårede «Banens Beste» i nyhetsfeeden
              </h4>
            </div>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full">
              Offisiell avstemning fullført
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {latestPOTMAwards.map((item) => (
              <div
                key={item.match.id}
                onClick={() => onOpenPOTM && onOpenPOTM(item.match)}
                className="bg-white/90 hover:bg-white p-3 rounded-xl border border-amber-200 hover:border-amber-400 transition-all cursor-pointer shadow-2xs group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span className="font-bold text-slate-700 truncate">{item.match.teamName}</span>
                    <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.2 rounded">
                      {item.match.homeScore ?? 0} - {item.match.awayScore ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-2xs">
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-950 truncate group-hover:text-[#165094] transition-colors">
                        {item.winnerName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium truncate">
                        {item.team}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-mono font-black">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    {(item.rating ?? 0).toFixed(1)}
                  </span>
                  <span className="text-slate-500 font-semibold">
                    {item.votes} stemmer
                  </span>
                  <span className="text-[#165094] font-bold group-hover:underline flex items-center">
                    Børs <ChevronRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/60 p-1.5 rounded-xl text-xs font-semibold">
        <button
          id="feed-filter-all"
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            filterType === 'all'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Alle hendelser ({allFeedItems.length})
        </button>

        <button
          id="feed-filter-potm"
          onClick={() => setFilterType('potm')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            filterType === 'potm'
              ? 'bg-amber-400 text-slate-950 shadow-xs font-black'
              : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
          }`}
        >
          <Star className="w-3.5 h-3.5 fill-current" />
          <span>Banens Beste</span>
          <span className="text-[10px] bg-slate-900 text-amber-400 px-1.5 py-0.2 rounded-full ml-1 font-mono font-black">
            {potmCount}
          </span>
        </button>

        <button
          id="feed-filter-goals"
          onClick={() => setFilterType('goals')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            filterType === 'goals'
              ? 'bg-white text-red-700 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>⚽ Mål & Resultater</span>
          <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.2 rounded-full ml-1">
            {allFeedItems.filter((i) => i.type === 'goal').length}
          </span>
        </button>

        <button
          id="feed-filter-cards"
          onClick={() => setFilterType('cards')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            filterType === 'cards'
              ? 'bg-white text-amber-800 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🟨 Kort & Disiplinær</span>
          <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-full ml-1">
            {allFeedItems.filter((i) => i.type === 'card').length}
          </span>
        </button>

        <button
          id="feed-filter-table"
          onClick={() => setFilterType('table')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            filterType === 'table'
              ? 'bg-white text-blue-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🏆 Tabellposisjoner</span>
          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full ml-1">
            {allFeedItems.filter((i) => i.type === 'table').length}
          </span>
        </button>

        <button
          id="feed-filter-home"
          onClick={() => setFilterType('home')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            filterType === 'home'
              ? 'bg-white text-red-800 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Home className="w-3.5 h-3.5 text-red-600" />
          <span>Hjemmekamper</span>
          <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.2 rounded-full ml-1 font-mono">
            {allFeedItems.filter((i) => i.isHomeMatch).length}
          </span>
        </button>
      </div>

      {/* Feed Timeline Stream */}
      <div className="space-y-3">
        {filteredFeed.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            <Radio className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
            <p className="font-semibold">Ingen hendelser i live-feeden for dette filteret.</p>
            <p className="text-xs text-slate-400 mt-1">
              Klikk på «Skann nå» eller velg et annet filter for å se hendelser.
            </p>
          </div>
        ) : (
          filteredFeed.map((item) => {
            const isHome = item.isHomeMatch;

            // Resolve target match and POTM winner data if applicable
            const targetMatch =
              item.match ||
              matches.find(
                (m) =>
                  m.id === item.matchId ||
                  (item.teamId && m.teamId === item.teamId && m.status === 'finished')
              );

            const isMatchFinished = targetMatch?.status === 'finished' || item.type === 'potm';
            const potmData =
              targetMatch?.playerOfTheMatch ||
              (targetMatch && targetMatch.status === 'finished' ? calculateMatchPOTM(targetMatch) : undefined);

            const potmLeader =
              potmData?.candidates?.find((c) => c.playerName === potmData.winnerName) || potmData?.candidates?.[0];

            const potmWinner =
              item.potmWinner ||
              (potmData && potmLeader
                ? {
                    name: potmLeader.playerName,
                    rating: potmLeader.algoRating,
                    votes: potmLeader.votes,
                    team: potmLeader.team,
                    position: potmLeader.position,
                    totalVotes: potmData.totalVotes,
                    combinedScore: potmLeader.combinedScore
                  }
                : undefined);

            const isPOTMItem = item.type === 'potm' || item.impact?.type === 'potm';

            return (
              <div
                key={item.id}
                id={`feed-item-${item.id}`}
                className={`bg-white rounded-xl border transition-all overflow-hidden p-4 sm:p-5 shadow-xs relative ${
                  isPOTMItem
                    ? 'border-amber-300 ring-1 ring-amber-400/40 bg-gradient-to-b from-amber-50/20 to-white'
                    : isHome
                    ? 'border-red-300 ring-1 ring-red-400/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Home Match Header Pill */}
                {isHome && (
                  <div className="mb-3 inline-flex items-center space-x-1.5 bg-gradient-to-r from-red-600 to-blue-900 text-white px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
                    <Home className="w-3 h-3 text-amber-300" />
                    <span>HJEMMEKAMP PÅ BØNESBANEN</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  {/* Event Type Icon & Main Content */}
                  <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                    {/* Icon Circle */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base font-bold shadow-xs ${
                        isPOTMItem
                          ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 ring-2 ring-amber-300/80 shadow-amber-200'
                          : item.type === 'goal'
                          ? 'bg-red-500 text-white'
                          : item.type === 'card'
                          ? 'bg-amber-400 text-slate-900'
                          : item.type === 'table'
                          ? 'bg-blue-600 text-white'
                          : item.type === 'fixture'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-white'
                      }`}
                    >
                      {isPOTMItem && <Trophy className="w-5 h-5 text-slate-950" />}
                      {!isPOTMItem && item.type === 'goal' && '⚽'}
                      {!isPOTMItem && item.type === 'card' && '🟨'}
                      {!isPOTMItem && item.type === 'table' && <Trophy className="w-5 h-5" />}
                      {!isPOTMItem && item.type === 'fixture' && <Home className="w-5 h-5" />}
                      {!isPOTMItem && item.type === 'scanner_sync' && <Shield className="w-5 h-5" />}
                    </div>

                    {/* Text Body */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Meta Tags */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-blue-950 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {item.teamName}
                        </span>

                        {isPOTMItem ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 flex items-center gap-1 shadow-2xs">
                            <Star className="w-3 h-3 fill-slate-950" />
                            <span>Banens Beste Avgjort</span>
                          </span>
                        ) : (
                          item.badgeText && (
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                                item.source === 'lagleder'
                                  ? 'bg-[#3E8A37] text-white'
                                  : item.type === 'goal'
                                  ? 'bg-red-600 text-white'
                                  : item.type === 'card'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {item.badgeText}
                            </span>
                          )
                        )}

                        {item.source === 'lagleder' && item.reportedBy && (
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded">
                            Meldt av: {item.reportedBy}
                          </span>
                        )}

                        {item.score && (
                          <span className="font-mono font-black text-sm bg-slate-900 text-amber-400 px-2 py-0.2 rounded shadow-inner">
                            {item.score}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug">
                        {item.title}
                      </h4>

                      {/* Description */}
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {item.description}
                      </p>

                      {/* DEDICATED BANENS BESTE STATUS CARD (Displayed when match is finished) */}
                      {isMatchFinished && potmWinner && (
                        <div className="mt-3 p-3.5 bg-gradient-to-r from-amber-50 via-amber-100/70 to-amber-50 border border-amber-300/90 rounded-xl shadow-2xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-200 flex items-center justify-center shrink-0 shadow-xs border border-amber-400/60">
                                <Trophy className="w-5 h-5 text-amber-900" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-1.5 py-0.5 rounded">
                                    <Star className="w-3 h-3 fill-amber-600 text-amber-600" />
                                    <span>Vinner av Banens Beste:</span>
                                  </span>
                                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-mono font-black shadow-2xs">
                                    <Star className="w-3 h-3 fill-slate-950" />
                                    {(potmWinner.rating ?? 0).toFixed(1)} Børs-score
                                  </span>
                                </div>
                                <h5 className="font-black text-slate-950 text-sm sm:text-base truncate mt-0.5">
                                  {potmWinner.name}
                                </h5>
                                <p className="text-xs text-slate-600 font-medium truncate">
                                  {potmWinner.team || item.teamName}{' '}
                                  {potmWinner.position ? `• ${potmWinner.position}` : ''}
                                  {potmWinner.votes !== undefined && (
                                    <span className="ml-1.5 text-amber-900 font-bold">
                                      • Vant med {potmWinner.votes} {potmWinner.votes === 1 ? 'stemme' : 'stemmer'}
                                      {potmWinner.totalVotes && potmWinner.totalVotes > 0
                                        ? ` (${Math.round((potmWinner.votes / potmWinner.totalVotes) * 100)}% av stemmene)`
                                        : ''}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Button to open POTM modal */}
                            {onOpenPOTM && targetMatch && (
                              <button
                                type="button"
                                onClick={() => onOpenPOTM(targetMatch)}
                                className="self-start sm:self-center px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-black transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer shrink-0 border border-amber-500/40 hover:scale-102"
                                title="Se stemmefordeling og full spillerbørs"
                              >
                                <Vote className="w-3.5 h-3.5" />
                                <span>Se kåring & stemmer</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Stat Impact Pill (non-POTM) */}
                      {item.impact && item.impact.type !== 'potm' && (
                        <div className="mt-2 inline-flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg text-xs">
                          <span className="font-bold text-slate-700">
                            {item.impact.type === 'topscorer' && '🔥 Toppscorer-oppdatering:'}
                            {item.impact.type === 'card_warning' && '⚠️ Disiplinærstatus:'}
                            {item.impact.type === 'table_rank' && '🏆 Tabelleffekt:'}
                            {item.impact.type === 'fixture' && '📅 Kampoppsett:'}
                          </span>
                          <span className="text-slate-900 font-medium">
                            {item.impact.detail}
                          </span>
                        </div>
                      )}

                      {/* Venue info */}
                      {item.venue && (
                        <p className="text-[11px] text-slate-500 flex items-center space-x-1 pt-1">
                          <MapPin className="w-3 h-3 text-red-500 inline" />
                          <span className="font-medium">{item.venue}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Timestamp Right Column */}
                  <div className="text-right shrink-0 text-xs self-start mt-1 sm:mt-0">
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">
                      {item.timestamp.includes('T') ? item.timestamp.split('T')[1].substring(0, 5) : item.timestamp}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">{item.timeAgo}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
