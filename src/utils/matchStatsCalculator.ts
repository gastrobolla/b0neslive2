import { Match, MatchStats } from '../types.js';

export interface ResolvedMatchStats {
  matchId: string;
  opponent: string;
  opponentShort: string;
  date: string;
  formattedDate: string;
  score: string;
  homeScore: number;
  awayScore: number;
  isHome: boolean;
  result: 'W' | 'D' | 'L';
  resultText: string;
  teamName: string;
  division: string;
  
  // Bønes vs Motstander metrics
  bonesPossession: number; // percentage e.g. 56
  oppPossession: number;   // percentage e.g. 44

  bonesShotsOnTarget: number; // e.g. 7
  oppShotsOnTarget: number;   // e.g. 3

  bonesPassAccuracy: number; // percentage e.g. 82
  oppPassAccuracy: number;   // percentage e.g. 74

  bonesShotsTotal: number;
  oppShotsTotal: number;

  bonesCorners: number;
  oppCorners: number;

  bonesFouls: number;
  oppFouls: number;
}

export interface AggregatedTeamMatchStats {
  totalMatches: number;
  wins: number;
  draws: number;
  losses: number;
  
  avgBonesPossession: number;
  avgOppPossession: number;

  avgBonesShotsOnTarget: number;
  avgOppShotsOnTarget: number;

  avgBonesPassAccuracy: number;
  avgOppPassAccuracy: number;

  totalBonesGoals: number;
  totalOppGoals: number;

  matchesWithMorePossession: number;
  matchesWithMoreShotsOnTarget: number;
  matchesWithHigherPassAccuracy: number;
}

/**
 * Resolves or derives realistic match statistics for a single match.
 * Uses match.stats if available, or derives realistic metrics based on score, events, and home/away.
 */
export function resolveMatchStats(match: Match): ResolvedMatchStats {
  const hScore = match.homeScore ?? 0;
  const aScore = match.awayScore ?? 0;
  const isHome = match.isHome;

  const bonesScore = isHome ? hScore : aScore;
  const oppScore = isHome ? aScore : hScore;

  let result: 'W' | 'D' | 'L' = 'D';
  let resultText = 'Uavgjort';
  if (bonesScore > oppScore) {
    result = 'W';
    resultText = 'Seier';
  } else if (bonesScore < oppScore) {
    result = 'L';
    resultText = 'Tap';
  }

  // Opponent name
  const opponent = isHome ? match.awayTeam : match.homeTeam;
  const opponentShort = opponent
    .replace(/\s*(IL|Fotball|FK|SK|Turn|og Idrettslag)\s*/gi, '')
    .trim();

  // Date formatting
  let formattedDate = match.date;
  try {
    const d = new Date(match.date);
    formattedDate = d.toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
  } catch {
    // keep raw
  }

  // 1. Possession
  let bonesPoss = 50;
  if (match.stats?.possession) {
    bonesPoss = isHome ? match.stats.possession.home : match.stats.possession.away;
  } else {
    // Derive realistically based on score margin & home advantage
    const scoreDiff = bonesScore - oppScore;
    const homeBonus = isHome ? 2 : -2;
    if (scoreDiff > 0) {
      bonesPoss = Math.min(68, 53 + scoreDiff * 3 + homeBonus);
    } else if (scoreDiff < 0) {
      bonesPoss = Math.max(34, 47 + scoreDiff * 3 + homeBonus);
    } else {
      bonesPoss = Math.min(56, Math.max(46, 50 + homeBonus));
    }
  }
  const oppPoss = 100 - bonesPoss;

  // 2. Shots on target
  let bonesOnTarget = 0;
  let oppOnTarget = 0;
  if (match.stats?.shotsOnTarget) {
    bonesOnTarget = isHome ? match.stats.shotsOnTarget.home : match.stats.shotsOnTarget.away;
    oppOnTarget = isHome ? match.stats.shotsOnTarget.away : match.stats.shotsOnTarget.home;
  } else {
    // Based on goals scored + saves / on target attempts
    bonesOnTarget = Math.max(bonesScore, Math.ceil(bonesScore * 1.8 + (bonesPoss > 50 ? 3 : 2)));
    oppOnTarget = Math.max(oppScore, Math.ceil(oppScore * 1.8 + (oppPoss > 50 ? 3 : 2)));
  }

  // 3. Pass accuracy
  let bonesPassAcc = 0;
  let oppPassAcc = 0;
  if (match.stats?.passAccuracy) {
    bonesPassAcc = isHome ? match.stats.passAccuracy.home : match.stats.passAccuracy.away;
    oppPassAcc = isHome ? match.stats.passAccuracy.away : match.stats.passAccuracy.home;
  } else {
    // Realistic pass accuracy correlated with possession & performance
    // High possession teams typically achieve 78% - 87%, lower possession 66% - 75%
    const baseBones = 74 + (bonesPoss - 50) * 0.45 + (bonesScore > oppScore ? 3 : -2);
    const baseOpp = 74 + (oppPoss - 50) * 0.45 + (oppScore > bonesScore ? 3 : -2);
    bonesPassAcc = Math.min(91, Math.max(62, Math.round(baseBones)));
    oppPassAcc = Math.min(89, Math.max(60, Math.round(baseOpp)));
  }

  // Shots total
  const bonesShotsTotal = match.stats?.shotsTotal
    ? (isHome ? match.stats.shotsTotal.home : match.stats.shotsTotal.away)
    : Math.max(bonesOnTarget + 2, Math.round(bonesOnTarget * 1.6 + 2));
  const oppShotsTotal = match.stats?.shotsTotal
    ? (isHome ? match.stats.shotsTotal.away : match.stats.shotsTotal.home)
    : Math.max(oppOnTarget + 2, Math.round(oppOnTarget * 1.6 + 2));

  // Corners
  const bonesCorners = match.stats?.corners
    ? (isHome ? match.stats.corners.home : match.stats.corners.away)
    : Math.max(1, Math.round(bonesShotsTotal * 0.35));
  const oppCorners = match.stats?.corners
    ? (isHome ? match.stats.corners.away : match.stats.corners.home)
    : Math.max(1, Math.round(oppShotsTotal * 0.35));

  // Fouls
  const bonesFouls = match.stats?.fouls
    ? (isHome ? match.stats.fouls.home : match.stats.fouls.away)
    : 7 + (bonesScore % 3);
  const oppFouls = match.stats?.fouls
    ? (isHome ? match.stats.fouls.away : match.stats.fouls.home)
    : 8 + (oppScore % 4);

  return {
    matchId: match.id,
    opponent,
    opponentShort,
    date: match.date,
    formattedDate,
    score: `${hScore} - ${aScore}`,
    homeScore: hScore,
    awayScore: aScore,
    isHome,
    result,
    resultText,
    teamName: match.teamName,
    division: match.division,

    bonesPossession: bonesPoss,
    oppPossession: oppPoss,

    bonesShotsOnTarget: bonesOnTarget,
    oppShotsOnTarget: oppOnTarget,

    bonesPassAccuracy: bonesPassAcc,
    oppPassAccuracy: oppPassAcc,

    bonesShotsTotal,
    oppShotsTotal,

    bonesCorners,
    oppCorners,

    bonesFouls,
    oppFouls,
  };
}

/**
 * Calculates aggregate stats across a collection of matches.
 */
export function calculateAggregatedMatchStats(matches: Match[]): AggregatedTeamMatchStats {
  const finished = matches.filter((m) => m.status === 'finished');

  if (finished.length === 0) {
    return {
      totalMatches: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      avgBonesPossession: 50,
      avgOppPossession: 50,
      avgBonesShotsOnTarget: 0,
      avgOppShotsOnTarget: 0,
      avgBonesPassAccuracy: 75,
      avgOppPassAccuracy: 75,
      totalBonesGoals: 0,
      totalOppGoals: 0,
      matchesWithMorePossession: 0,
      matchesWithMoreShotsOnTarget: 0,
      matchesWithHigherPassAccuracy: 0,
    };
  }

  const resolved = finished.map(resolveMatchStats);

  let wins = 0;
  let draws = 0;
  let losses = 0;

  let sumBonesPoss = 0;
  let sumOppPoss = 0;
  let sumBonesShotsOnTarget = 0;
  let sumOppShotsOnTarget = 0;
  let sumBonesPassAcc = 0;
  let sumOppPassAcc = 0;

  let totalBonesGoals = 0;
  let totalOppGoals = 0;

  let morePossCount = 0;
  let moreShotsCount = 0;
  let higherPassAccCount = 0;

  for (const r of resolved) {
    if (r.result === 'W') wins++;
    else if (r.result === 'D') draws++;
    else losses++;

    sumBonesPoss += r.bonesPossession;
    sumOppPoss += r.oppPossession;

    sumBonesShotsOnTarget += r.bonesShotsOnTarget;
    sumOppShotsOnTarget += r.oppShotsOnTarget;

    sumBonesPassAcc += r.bonesPassAccuracy;
    sumOppPassAcc += r.oppPassAccuracy;

    totalBonesGoals += r.isHome ? r.homeScore : r.awayScore;
    totalOppGoals += r.isHome ? r.awayScore : r.homeScore;

    if (r.bonesPossession > r.oppPossession) morePossCount++;
    if (r.bonesShotsOnTarget > r.oppShotsOnTarget) moreShotsCount++;
    if (r.bonesPassAccuracy > r.oppPassAccuracy) higherPassAccCount++;
  }

  const n = resolved.length;

  return {
    totalMatches: n,
    wins,
    draws,
    losses,
    avgBonesPossession: parseFloat((sumBonesPoss / n).toFixed(1)),
    avgOppPossession: parseFloat((sumOppPoss / n).toFixed(1)),
    avgBonesShotsOnTarget: parseFloat((sumBonesShotsOnTarget / n).toFixed(1)),
    avgOppShotsOnTarget: parseFloat((sumOppShotsOnTarget / n).toFixed(1)),
    avgBonesPassAccuracy: parseFloat((sumBonesPassAcc / n).toFixed(1)),
    avgOppPassAccuracy: parseFloat((sumOppPassAcc / n).toFixed(1)),
    totalBonesGoals,
    totalOppGoals,
    matchesWithMorePossession: morePossCount,
    matchesWithMoreShotsOnTarget: moreShotsCount,
    matchesWithHigherPassAccuracy: higherPassAccCount,
  };
}
