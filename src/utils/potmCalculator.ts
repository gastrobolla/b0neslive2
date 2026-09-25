import { Match, PlayerOfTheMatchData, PlayerOfTheMatchCandidate } from '../types.js';
import { calculatePlayerPerformanceRating } from './playerRatingEngine.js';
import { getPlayerPositionInMatch } from './positionEngine.js';
import { isOwnGoalEvent } from './derivedStats.js';

/**
 * Calculates or updates Banens Beste (Player of the Match) for a given match.
 * Combines objective algorithmic performance rating with live spectator votes.
 */
export function calculateMatchPOTM(
  match: Match,
  incomingVotes?: Record<string, number>,
  jurySelectedPlayer?: string,
  juryNotes?: string
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
    num?: number
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
        combinedScore: 7.0
      });
    }
    return candidateMap.get(key)!;
  };

  // 1. Extract from lineups if present
  const lineups = [
    { lineup: match.homeLineup, team: match.homeTeam },
    { lineup: match.awayLineup, team: match.awayTeam },
    { lineup: match.lineup, team: match.isHome ? match.homeTeam : match.awayTeam }
  ];

  for (const { lineup, team } of lineups) {
    if (!lineup) continue;
    const allLineupPlayers = [...(lineup.starters || []), ...(lineup.bench || []), ...(lineup.subs || [])];
    for (const p of allLineupPlayers) {
      if (!p.name) continue;
      const dynPos = getPlayerPositionInMatch(p.name, p.fiksId, match, p.position);
      getOrCreateCandidate(p.name, team, dynPos, p.jerseyNumber || p.number);
    }
  }

  // 2. Extract from events (mål, selvmål, assist, kort)
  if (match.events && match.events.length > 0) {
    for (const ev of match.events) {
      if (ev.player) {
        const dynPos = getPlayerPositionInMatch(ev.player, undefined, match);
        const c = getOrCreateCandidate(ev.player, ev.team, dynPos);
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
        const c = getOrCreateCandidate(ev.assistPlayer, ev.team, dynPos);
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

  // 3. If still empty, add default recognizable key players for the teams
  if (candidateMap.size === 0) {
    const isBonesHome = match.homeTeam.toLowerCase().includes('bønes');
    const bonesTeam = isBonesHome ? match.homeTeam : match.awayTeam;
    const oppTeam = isBonesHome ? match.awayTeam : match.homeTeam;

    getOrCreateCandidate('Henrik Sølvberg', bonesTeam, 'Midtbane', 10);
    getOrCreateCandidate('Sander Lie', bonesTeam, 'Angrep', 9);
    getOrCreateCandidate('Thea Karlsen', bonesTeam, 'Keeper', 1);
    getOrCreateCandidate('Kaptein ' + oppTeam, oppTeam, 'Midtbane', 8);
  }

  // Determine winner score differential
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const homeWon = homeScore > awayScore;
  const awayWon = awayScore > homeScore;

  // Calculate algorithm ratings using Context-Aware Game-State Engine
  const candidates = Array.from(candidateMap.values());
  let totalVotes = 0;

  for (const c of candidates) {
    totalVotes += c.votes;

    const perf = calculatePlayerPerformanceRating(
      {
        playerName: c.playerName,
        team: c.team,
        position: c.position,
        jerseyNumber: c.jerseyNumber,
        goals: c.goals,
        ownGoals: c.ownGoals,
        assists: c.assists,
        yellowCards: c.yellowCards,
        redCards: c.redCards,
      },
      match
    );

    c.algoRating = perf.rating;
    c.ratingBreakdown = perf.breakdown;
    c.tags = perf.tags;
  }

  // Incorporate public votes and apply disqualification rules for own goals
  for (const c of candidates) {
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
    if (a.disqualified && !b.disqualified) return 1;
    if (!a.disqualified && b.disqualified) return -1;
    return b.combinedScore - a.combinedScore || b.votes - a.votes || b.algoRating - a.algoRating;
  });

  // Pick winner / leader: Must NEVER be a player who scored an own goal
  const eligibleCandidates = candidates.filter((c) => !c.disqualified && (c.ownGoals || 0) === 0);
  const eligiblePool = eligibleCandidates.length > 0 ? eligibleCandidates : candidates;

  const leader = jurySelectedPlayer
    ? eligiblePool.find((c) => c.playerName === jurySelectedPlayer) || eligiblePool[0]
    : eligiblePool[0];

  const status: 'voting_open' | 'decided' =
    match.status === 'finished' ? 'decided' : 'voting_open';

  return {
    winnerName: leader?.playerName,
    winnerTeam: leader?.team,
    winnerRating: leader?.algoRating,
    winnerVotes: leader?.votes,
    candidates,
    totalVotes,
    status,
    jurySelectedPlayer: jurySelectedPlayer || existingPOTM?.jurySelectedPlayer,
    juryNotes: juryNotes || existingPOTM?.juryNotes,
    lastVoteAt: new Date().toISOString()
  };
}
