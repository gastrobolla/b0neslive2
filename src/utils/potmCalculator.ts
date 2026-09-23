import { Match, PlayerOfTheMatchData, PlayerOfTheMatchCandidate } from '../types.js';

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
      getOrCreateCandidate(p.name, team, p.position || 'Spiller', p.jerseyNumber || p.number);
    }
  }

  // 2. Extract from events (mål, assist, kort)
  if (match.events && match.events.length > 0) {
    for (const ev of match.events) {
      if (ev.player) {
        const c = getOrCreateCandidate(ev.player, ev.team);
        if (ev.type === 'goal') c.goals += 1;
        if (ev.type === 'yellow_card') c.yellowCards += 1;
        if (ev.type === 'red_card') c.redCards += 1;
      }
      if (ev.assistPlayer) {
        const c = getOrCreateCandidate(ev.assistPlayer, ev.team);
        c.assists += 1;
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

  // Calculate algorithm ratings
  const candidates = Array.from(candidateMap.values());
  let totalVotes = 0;

  for (const c of candidates) {
    totalVotes += c.votes;

    let base = 7.0;
    // Deterministic slight variance based on name char codes so ratings aren't all identical
    const hash = c.playerName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    base += ((hash % 7) - 3) * 0.1;

    // Performance additions
    base += c.goals * 1.15;
    base += c.assists * 0.75;
    base -= c.yellowCards * 0.45;
    base -= c.redCards * 1.5;

    // Team outcome bonus
    const isHome = c.team === match.homeTeam;
    if ((isHome && homeWon) || (!isHome && awayWon)) {
      base += 0.3;
    }

    // Clean sheet bonus for keeper/defenders if 0 goals conceded
    const goalsConceded = isHome ? awayScore : homeScore;
    if (goalsConceded === 0 && match.status !== 'upcoming') {
      if (c.position?.toLowerCase().includes('keep') || c.position?.toLowerCase().includes('forsv')) {
        base += 0.6;
      }
    }

    // Clamp rating to 6.1 - 9.8
    c.algoRating = Math.max(6.1, Math.min(9.8, parseFloat(base.toFixed(1))));
  }

  // Incorporate public votes into combinedScore
  // Formula: combinedScore = algoRating * 0.65 + (publicVoteRatio * 3.5)
  for (const c of candidates) {
    const voteRatio = totalVotes > 0 ? c.votes / totalVotes : 0;
    const voteBonus = voteRatio * 3.0; // Up to 3.0 points from unanimous public vote
    c.combinedScore = parseFloat((c.algoRating * 0.7 + (7.0 + voteBonus) * 0.3).toFixed(2));
  }

  // Sort candidates by combinedScore descending
  candidates.sort((a, b) => b.combinedScore - a.combinedScore || b.votes - a.votes || b.algoRating - a.algoRating);

  // Pick winner / leader
  const leader = jurySelectedPlayer
    ? candidates.find((c) => c.playerName === jurySelectedPlayer) || candidates[0]
    : candidates[0];

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
