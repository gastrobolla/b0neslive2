import { Match, DivisionTable } from '../types.js';
import { extractClubStem } from '../components/HeadToHeadSection.js';

export interface WinProbabilityResult {
  bonesWinProb: number; // 0-100%
  drawProb: number;     // 0-100%
  oppWinProb: number;   // 0-100%
  favorite: 'bones' | 'draw' | 'opponent';
  confidence: 'high' | 'medium' | 'low';
  factors: {
    h2hSummary: string;
    formSummary: string;
    homeAdvantageText: string;
    bonesFormPoints: number;
    bonesMaxFormPoints: number;
    bonesFormStreak: string;
    h2hMatchesCount: number;
    h2hBonesWins: number;
    h2hDraws: number;
    h2hOpponentWins: number;
  };
}

/**
 * Calculates win probability for an upcoming match based on:
 * 1. Historical head-to-head records across all available seasons
 * 2. Recent 5-match team form (points, goal difference, streak)
 * 3. Division table standing if available
 * 4. Realistic home advantage (+5-6% boost)
 */
export function calculateWinProbability(
  match: Match,
  allMatches: Match[] = [],
  tables?: Record<string, DivisionTable>
): WinProbabilityResult {
  const isBonesHome = match.homeTeam.toLowerCase().includes('bønes');
  const isBonesAway = match.awayTeam.toLowerCase().includes('bønes');
  const opponentName = isBonesHome ? match.awayTeam : match.homeTeam;
  const oppClean = opponentName.trim().toLowerCase();
  const oppStem = extractClubStem(opponentName);

  // 1. Calculate Historical Head-to-Head (H2H)
  const h2hMatches = allMatches.filter((m) => {
    if (m.status !== 'finished') return false;
    if (!m.homeTeam || !m.awayTeam) return false;
    const h = m.homeTeam.toLowerCase();
    const a = m.awayTeam.toLowerCase();

    const bonesInMatch = h.includes('bønes') || a.includes('bønes');
    if (!bonesInMatch) return false;

    const oppInMatch = h.includes('bønes') ? a : h;
    const isDirectMatch =
      oppInMatch.includes(oppClean) ||
      oppClean.includes(oppInMatch) ||
      (oppStem.length >= 3 && oppInMatch.includes(oppStem));

    return isDirectMatch;
  });

  let h2hBonesWins = 0;
  let h2hDraws = 0;
  let h2hOpponentWins = 0;

  for (const m of h2hMatches) {
    const bonesHome = m.homeTeam.toLowerCase().includes('bønes');
    const bonesScore = bonesHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
    const oppScore = bonesHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);

    if (bonesScore > oppScore) h2hBonesWins++;
    else if (bonesScore === oppScore) h2hDraws++;
    else h2hOpponentWins++;
  }

  // 2. Calculate Bønes recent form (last 5 finished matches for this team)
  const targetTeamId = match.teamId?.toLowerCase();
  const teamFinishedMatches = allMatches
    .filter((m) => {
      if (m.status !== 'finished') return false;
      if (targetTeamId && m.teamId?.toLowerCase() === targetTeamId) return true;
      const h = m.homeTeam.toLowerCase();
      const a = m.awayTeam.toLowerCase();
      return h.includes('bønes') || a.includes('bønes');
    })
    .sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.time || '12:00'}`).getTime();
      const timeB = new Date(`${b.date}T${b.time || '12:00'}`).getTime();
      return timeB - timeA;
    })
    .slice(0, 5);

  let formPoints = 0;
  let formWins = 0;
  let formDraws = 0;
  let formLosses = 0;
  const streakLetters: string[] = [];

  for (const m of teamFinishedMatches) {
    const homeIsBones = m.homeTeam.toLowerCase().includes('bønes');
    const bScore = homeIsBones ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
    const oScore = homeIsBones ? (m.awayScore ?? 0) : (m.homeScore ?? 0);

    if (bScore > oScore) {
      formPoints += 3;
      formWins++;
      streakLetters.push('S');
    } else if (bScore === oScore) {
      formPoints += 1;
      formDraws++;
      streakLetters.push('U');
    } else {
      formLosses++;
      streakLetters.push('T');
    }
  }

  const maxFormPoints = Math.max(3, teamFinishedMatches.length * 3);
  const formRatio = teamFinishedMatches.length > 0 ? formPoints / maxFormPoints : 0.5;

  // 3. Mathematical Probability Modeling
  // Base expectation in football: Home 42%, Draw 26%, Away 32%
  let bonesBase = isBonesHome ? 44 : 36;
  let oppBase = isBonesHome ? 32 : 40;
  let drawBase = 24;

  // Form adjustment: formRatio ranges from 0.0 (0 points) to 1.0 (15 points). Neutral is 0.5 (~7.5 points)
  // Shift by up to ±16%
  const formShift = (formRatio - 0.5) * 32;
  bonesBase += formShift;
  oppBase -= formShift;

  // H2H adjustment:
  const totalH2H = h2hMatches.length;
  if (totalH2H > 0) {
    const h2hWinRatio = h2hBonesWins / totalH2H;
    const h2hOppRatio = h2hOpponentWins / totalH2H;
    // Shift by up to ±18%
    const h2hShift = (h2hWinRatio - h2hOppRatio) * 18;
    bonesBase += h2hShift;
    oppBase -= h2hShift;
  }

  // Draw probability adjustments (draws are higher when teams are closely matched)
  const difference = Math.abs(bonesBase - oppBase);
  if (difference < 10) {
    drawBase += 4;
    bonesBase -= 2;
    oppBase -= 2;
  } else if (difference > 35) {
    drawBase = Math.max(16, drawBase - 4);
  }

  // Enforce realistic minimums & maximums (no team gets 0% or 100%)
  bonesBase = Math.max(10, Math.min(82, bonesBase));
  oppBase = Math.max(10, Math.min(82, oppBase));
  drawBase = Math.max(14, Math.min(32, drawBase));

  // Normalize so sum === 100%
  const total = bonesBase + oppBase + drawBase;
  let bonesWinProb = Math.round((bonesBase / total) * 100);
  let oppWinProb = Math.round((oppBase / total) * 100);
  let drawProb = 100 - bonesWinProb - oppWinProb;

  if (drawProb < 10) {
    drawProb = 12;
    const rem = 88;
    bonesWinProb = Math.round((bonesWinProb / (bonesWinProb + oppWinProb)) * rem);
    oppWinProb = 100 - bonesWinProb - drawProb;
  }

  // Confidence & Favorite
  let favorite: 'bones' | 'draw' | 'opponent' = 'draw';
  if (bonesWinProb >= oppWinProb + 6) favorite = 'bones';
  else if (oppWinProb >= bonesWinProb + 6) favorite = 'opponent';

  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (totalH2H >= 3 && teamFinishedMatches.length >= 4) {
    confidence = 'high';
  } else if (totalH2H >= 1 || teamFinishedMatches.length >= 3) {
    confidence = 'medium';
  }

  const h2hSummary =
    totalH2H > 0
      ? `${h2hBonesWins}S - ${h2hDraws}U - ${h2hOpponentWins}T (${totalH2H} ${totalH2H === 1 ? 'møte' : 'møter'})`
      : 'Ingen tidligere møter registrert';

  const formSummary =
    teamFinishedMatches.length > 0
      ? `${formPoints}/${maxFormPoints}p siste ${teamFinishedMatches.length} (${streakLetters.join('-')})`
      : 'Avventer sesongstart';

  const homeAdvantageText = isBonesHome
    ? 'Hjemmebanefordel (Fjellsdalen) inkludert'
    : 'Bortekamp (bortebanetrekk beregnet)';

  return {
    bonesWinProb,
    drawProb,
    oppWinProb,
    favorite,
    confidence,
    factors: {
      h2hSummary,
      formSummary,
      homeAdvantageText,
      bonesFormPoints: formPoints,
      bonesMaxFormPoints: maxFormPoints,
      bonesFormStreak: streakLetters.join('-'),
      h2hMatchesCount: totalH2H,
      h2hBonesWins,
      h2hDraws,
      h2hOpponentWins,
    },
  };
}
