import { Match, PlayerOfTheMatchData, PlayerOfTheMatchCandidate, DivisionTable } from '../types.js';
import { calculatePlayerPerformanceRating } from './playerRatingEngine.js';
import { getPlayerPositionInMatch } from './positionEngine.js';
import { isOwnGoalEvent } from './derivedStats.js';
import { getMatchLineup, getSquadForTeam } from '../data/bonesSquads.js';

/**
 * Calculates or updates Banens Beste (Player of the Match) for a given match.
 * Combines objective algorithmic performance rating with live spectator votes.
 */
export function calculateMatchPOTM(
  match: Match,
  incomingVotes?: Record<string, number>,
  jurySelectedPlayer?: string,
  juryNotes?: string,
  tables?: DivisionTable[] | Record<string, DivisionTable>
): PlayerOfTheMatchData {
  const existingPOTM = match.playerOfTheMatch;
  const votesMap: Record<string, number> = { ...(incomingVotes || {}) };

  // Carry over existing votes if any
  if (existingPOTM?.candidates) {
    for (const c of existingPOTM.candidates) {
      if (votesMap[c.playerName] === undefined) {
        votesMap[c.playerName] = c.votes || 0;
      }
    }
  }

  // Collect candidate players from events, lineups, and known players
  const candidateMap = new Map<string, PlayerOfTheMatchCandidate>();

  const getOrCreateCandidate = (
    name: string,
    team: string,
    pos?: string,
    num?: number,
    inFiksLineup: boolean = true
  ): PlayerOfTheMatchCandidate => {
    const key = name.trim();
    if (!candidateMap.has(key)) {
      candidateMap.set(key, {
        playerName: key,
        team,
        position: pos || 'Spiller',
        jerseyNumber: num,
        goals: 0,
        ownGoals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        algoRating: 7.0,
        votes: votesMap[key] || 0,
        combinedScore: 7.0,
        isInFiksLineup: inFiksLineup,
        fiksStatus: inFiksLineup ? 'innmeldt' : 'ikke_innmeldt'
      });
    }
    return candidateMap.get(key)!;
  };

  // 1. Extract from lineups if present (Verified FIKS-innmeldt tropp)
  const startersSet = new Set<string>();
  const benchSet = new Set<string>();

  const lineups = [
    { lineup: match.homeLineup, team: match.homeTeam },
    { lineup: match.awayLineup, team: match.awayTeam },
    { lineup: match.lineup, team: match.isHome ? match.homeTeam : match.awayTeam }
  ];

  for (const { lineup, team } of lineups) {
    if (!lineup) continue;
    for (const p of lineup.starters || []) {
      if (!p.name) continue;
      startersSet.add(p.name.trim().toLowerCase());
      const dynPos = getPlayerPositionInMatch(p.name, p.fiksId, match, p.position);
      const c = getOrCreateCandidate(p.name, team, dynPos, p.jerseyNumber || p.number, true);
      c.isStarter = true;
    }
    for (const p of lineup.bench || lineup.subs || []) {
      if (!p.name) continue;
      benchSet.add(p.name.trim().toLowerCase());
      const dynPos = getPlayerPositionInMatch(p.name, p.fiksId, match, p.position);
      const c = getOrCreateCandidate(p.name, team, dynPos, p.jerseyNumber || p.number, true);
      if (c.isStarter === undefined) c.isStarter = false;
    }
  }

  // 2. Extract from events (mål, selvmål, assist, kort)
  if (match.events && match.events.length > 0) {
    for (const ev of match.events) {
      if (ev.player) {
        const dynPos = getPlayerPositionInMatch(ev.player, undefined, match);
        const c = getOrCreateCandidate(ev.player, ev.team, dynPos, undefined, true);
        if (ev.type === 'goal') {
          if (isOwnGoalEvent(ev)) {
            c.ownGoals = (c.ownGoals || 0) + 1;
          } else {
            c.goals += 1;
          }
        }
        if (ev.type === 'yellow_card') c.yellowCards += 1;
        if (ev.type === 'red_card') c.redCards += 1;
      }
      if (ev.assistPlayer) {
        const dynPos = getPlayerPositionInMatch(ev.assistPlayer, undefined, match);
        const c = getOrCreateCandidate(ev.assistPlayer, ev.team, dynPos, undefined, true);
        c.assists += 1;
      }
    }

    // Ensure candidate goals and own goals strictly match events
    for (const c of candidateMap.values()) {
      const pNorm = c.playerName.trim().toLowerCase();
      const pEvents = match.events.filter(e => e.player && e.player.trim().toLowerCase() === pNorm);
      if (pEvents.length > 0) {
        const ogCount = pEvents.filter(isOwnGoalEvent).length;
        const realGoalsCount = pEvents.filter(e => e.type === 'goal' && !isOwnGoalEvent(e)).length;
        c.ownGoals = ogCount;
        c.goals = realGoalsCount;
      }
    }
  }

  // 3. If still empty, pull the real club squad for this team (15-min FIKS synk)
  if (candidateMap.size === 0 && match.teamId) {
    const squadLineup = getMatchLineup(match.teamId);
    const bonesTeam = match.isHome ? match.homeTeam : match.awayTeam;
    if (squadLineup) {
      for (const p of squadLineup.starters || []) {
        if (!p.name) continue;
        startersSet.add(p.name.trim().toLowerCase());
        const dynPos = getPlayerPositionInMatch(p.name, p.fiksId, match, p.position);
        const c = getOrCreateCandidate(p.name, bonesTeam, dynPos, p.jerseyNumber || p.number, true);
        c.isStarter = true;
      }
      for (const p of squadLineup.bench || []) {
        if (!p.name) continue;
        benchSet.add(p.name.trim().toLowerCase());
        const dynPos = getPlayerPositionInMatch(p.name, p.fiksId, match, p.position);
        const c = getOrCreateCandidate(p.name, bonesTeam, dynPos, p.jerseyNumber || p.number, true);
        if (c.isStarter === undefined) c.isStarter = false;
      }
    }
  }

  // Determine winner score differential
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const isMatchPlayed = match.status === 'finished' || (match.status as string) === 'live';

  // Calculate algorithm ratings using Context-Aware Game-State Engine
  const candidates = Array.from(candidateMap.values());
  let totalVotes = 0;

  for (const c of candidates) {
    totalVotes += c.votes;
    const pNorm = c.playerName.trim().toLowerCase();

    // Check if player took part in the match
    const isStarter = c.isStarter ?? startersSet.has(pNorm);
    const hasEvents = (c.goals > 0 || (c.ownGoals || 0) > 0 || c.assists > 0 || c.yellowCards > 0 || c.redCards > 0);
    const wasSubbedIn = (match.events || []).some(
      e => e.subInPlayer && e.subInPlayer.trim().toLowerCase() === pNorm
    );
    const playedInMatch = Boolean(isStarter || hasEvents || wasSubbedIn);

    c.playedInMatch = playedInMatch;
    c.isStarter = isStarter;
    c.isUnusedSub = !playedInMatch && benchSet.has(pNorm);

    // Rule: UPCOMING matches get NO ratings. Unused reserves get NO ratings.
    if (!isMatchPlayed || !playedInMatch) {
      c.algoRating = undefined;
      c.ratingBreakdown = undefined;
      c.tags = c.isUnusedSub ? ['Ubenyttet reserve'] : [];
      c.combinedScore = c.votes > 0 ? parseFloat((c.votes * 1.0).toFixed(2)) : 0;
      continue;
    }

    const perf = calculatePlayerPerformanceRating(
      {
        playerName: c.playerName,
        team: c.team,
        position: c.position,
        jerseyNumber: c.jerseyNumber,
        isStarter,
        goals: c.goals,
        ownGoals: c.ownGoals,
        assists: c.assists,
        yellowCards: c.yellowCards,
        redCards: c.redCards,
      },
      match,
      tables
    );

    c.algoRating = perf.rating;
    c.ratingBreakdown = perf.breakdown;
    c.tags = perf.tags;
  }

  // Incorporate public votes and apply disqualification rules for own goals
  for (const c of candidates) {
    if (!isMatchPlayed || !c.playedInMatch || c.algoRating === undefined) {
      continue;
    }

    const hasOwnGoal = (c.ownGoals || 0) > 0;
    if (hasOwnGoal) {
      c.disqualified = true;
      c.disqualificationReason = (c.ownGoals || 0) > 1 ? `${c.ownGoals} selvmål` : 'Selvmål';
    }

    const voteRatio = totalVotes > 0 ? c.votes / totalVotes : 0;
    const voteBonus = voteRatio * 3.0; // Up to 3.0 points from unanimous public vote

    if (c.disqualified) {
      // Disqualified players cannot be Player of the Match; penalty applied to combinedScore
      c.combinedScore = parseFloat(Math.max(1.0, c.algoRating - 4.5).toFixed(2));
    } else {
      c.combinedScore = parseFloat((c.algoRating * 0.7 + (7.0 + voteBonus) * 0.3).toFixed(2));
    }
  }

  // Sort candidates: eligible players first by combinedScore descending; disqualified players at the very bottom
  candidates.sort((a, b) => {
    // Players who played come before players who didn't play
    if (a.playedInMatch && !b.playedInMatch) return -1;
    if (!a.playedInMatch && b.playedInMatch) return 1;

    if (a.disqualified && !b.disqualified) return 1;
    if (!a.disqualified && b.disqualified) return -1;
    return b.combinedScore - a.combinedScore || b.votes - a.votes || (b.algoRating || 0) - (a.algoRating || 0);
  });

  // Pick winner / leader: Must NEVER be a player who scored an own goal, was absent from FIKS lineup, or did not play
  const eligibleCandidates = candidates.filter(
    (c) => c.playedInMatch && c.algoRating !== undefined && !c.disqualified && (c.ownGoals || 0) === 0 && c.isInFiksLineup !== false
  );
  const eligiblePool = eligibleCandidates.length > 0 ? eligibleCandidates : [];

  const leader = jurySelectedPlayer
    ? eligiblePool.find((c) => c.playerName === jurySelectedPlayer) || eligiblePool[0]
    : eligiblePool[0];

  const status: 'voting_open' | 'decided' =
    match.status === 'finished' ? 'decided' : 'voting_open';

  const defaultSyncText = match.fiksSyncedAt || (match.isOfficialFiks ? 'Synkronisert 15 min før avspark' : 'Synkronisert fra NFF');

  return {
    winnerName: isMatchPlayed ? leader?.playerName : undefined,
    winnerTeam: isMatchPlayed ? leader?.team : undefined,
    winnerRating: isMatchPlayed ? leader?.algoRating : undefined,
    winnerVotes: isMatchPlayed ? leader?.votes : undefined,
    candidates,
    totalVotes,
    status,
    jurySelectedPlayer: jurySelectedPlayer || existingPOTM?.jurySelectedPlayer,
    juryNotes: juryNotes || existingPOTM?.juryNotes,
    lastVoteAt: new Date().toISOString(),
    isFiksOfficial: !!match.isOfficialFiks,
    fiksSyncedAt: defaultSyncText
  };
}
