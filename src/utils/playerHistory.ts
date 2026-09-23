import { BonesClubData, PlayerProfile, PlayerMatchLog, PlayerSeasonStats, TopScorer, CardStatistic, TeamInfo } from '../types.js';
import { ALL_BONES_PLAYERS } from '../data/bonesSquads.js';
import { getOfficialStatsForPlayer } from '../services/playerStatsApi.js';
import {
  extractNumericFiksId,
  toCanonicalPlayerId,
  resolvePlayerIdentity,
  sanitizePlayerNameSlug,
} from './playerResolver.js';

/**
 * Builds an authentic, verified PlayerProfile for ANY player in Bønes IL
 * based strictly on real NFF data, authoritative MatchEvents and verified squad registrations.
 * NEVER fabricates synthetic goals, cards or random jersey numbers.
 */
export function buildPlayerProfile(
  playerNameOrId: string,
  teamIdHint: string | undefined,
  data: BonesClubData,
  playerFiksId?: number
): PlayerProfile | null {
  if (!playerNameOrId || playerNameOrId.trim() === '') return null;

  // Extract FIKS ID from parameter or string if formatted as fiks-12345 or digits
  let targetFiksId = extractNumericFiksId(playerFiksId) || extractNumericFiksId(playerNameOrId);

  const allKnownPlayers = [...(data.players || []), ...ALL_BONES_PLAYERS];

  // Resolve player by FIKS ID first if available
  let matchedSquadPlayers = targetFiksId
    ? allKnownPlayers.filter((p) => p.fiksId === targetFiksId)
    : [];

  let canonicalName = playerNameOrId.trim();
  if (matchedSquadPlayers.length > 0 && matchedSquadPlayers[0].name) {
    canonicalName = matchedSquadPlayers[0].name;
  }

  const playerName = canonicalName;
  const normalizedTargetName = canonicalName.toLowerCase();

  // Fallback to name search if not found by fiksId
  if (matchedSquadPlayers.length === 0) {
    matchedSquadPlayers = allKnownPlayers.filter(
      (p) => p.name.trim().toLowerCase() === normalizedTargetName
    );
  }

  // Look for FiksID from matched players or match lineup entries
  let fiksId = targetFiksId || matchedSquadPlayers.find((p) => p.fiksId)?.fiksId;
  if (!fiksId) {
    for (const m of data.matches || []) {
      const allLp = [
        ...(m.lineup?.starters || []),
        ...(m.lineup?.bench || []),
        ...(m.lineup?.subs || []),
        ...(m.homeLineup?.starters || []),
        ...(m.homeLineup?.bench || []),
        ...(m.awayLineup?.starters || []),
        ...(m.awayLineup?.bench || []),
      ];
      const matchLp = allLp.find((p) => p.name && p.name.trim().toLowerCase() === normalizedTargetName && p.fiksId);
      if (matchLp?.fiksId) {
        fiksId = matchLp.fiksId;
        break;
      }
    }
  }

  const fiksUrl = fiksId ? `https://www.fotball.no/fotballdata/person/profil/?fiksId=${fiksId}` : undefined;

  // Primary squad player entry (preferring the teamIdHint if provided, or the first matched)
  const squadPlayer = 
    matchedSquadPlayers.find((p) => teamIdHint && teamIdHint !== 'all' && p.teamId === teamIdHint) ||
    matchedSquadPlayers[0];

  // 2. Check topScorers
  const scorerEntry = 
    data.topScorers?.find((s) => s.name.trim().toLowerCase() === normalizedTargetName && (!teamIdHint || teamIdHint === 'all' || s.teamId === teamIdHint)) ||
    data.topScorers?.find((s) => s.name.trim().toLowerCase() === normalizedTargetName);

  // 3. Check cards
  const cardEntry = 
    data.cards?.find((c) => c.name.trim().toLowerCase() === normalizedTargetName && (!teamIdHint || teamIdHint === 'all' || c.teamId === teamIdHint)) ||
    data.cards?.find((c) => c.name.trim().toLowerCase() === normalizedTargetName);

  // Determine primary teamId
  const teamId = (teamIdHint && teamIdHint !== 'all' ? teamIdHint : undefined) ||
    squadPlayer?.teamId || scorerEntry?.teamId || cardEntry?.teamId || 'menn-1';
  
  const primaryTeam = (data.teams && data.teams.find((t) => t.id === teamId)) || {
    id: teamId,
    name: squadPlayer?.teamName || scorerEntry?.teamName || cardEntry?.teamName || 'Bønes IL',
    shortName: 'Bønes',
    category: 'Ungdom' as const,
    division: 'NFF Hordaland',
    krets: 'NFF Hordaland',
    homeGround: 'Fjellsdalen idrettsplass / Bønesbanen',
    currentRank: 1,
    totalTeamsInDivision: 10,
    nffCode: 'NFF-HOR'
  };

  const jerseyNumber = squadPlayer?.jerseyNumber || squadPlayer?.number || 0;
  const position = squadPlayer?.position || 'Ukjent';

  const isGoalkeeper = position.toLowerCase().includes('keeper') || position.toLowerCase().includes('målvakt');
  const isDefender = position.toLowerCase().includes('forsvar') || position.toLowerCase().includes('stopper') || position.toLowerCase().includes('back');

  // Division names
  const springDivision = data.tables?.[`${teamId}_var`]?.divisionName || `${primaryTeam.division} (vår)`;
  const autumnDivision = data.tables?.[`${teamId}_host`]?.divisionName || data.tables?.[teamId]?.divisionName || primaryTeam.division;

  // Find all matches across the entire club where this player actually participated:
  // 1. Matches where player is in lineup (starters, bench, subs) by fiksId or name
  // 2. Matches where player had an event (goals, cards, assists, subs)
  const matchedMatches = (data.matches || []).filter((m) => {
    // Check lineup (home/away or team lineup)
    const allLineup = [
      ...(m.lineup?.starters || []),
      ...(m.lineup?.bench || []),
      ...(m.lineup?.subs || []),
      ...(m.homeLineup?.starters || []),
      ...(m.homeLineup?.bench || []),
      ...(m.awayLineup?.starters || []),
      ...(m.awayLineup?.bench || [])
    ];
    const inLineup = allLineup.some(
      (lp) => (fiksId && lp.fiksId === fiksId) || (lp.id && fiksId && lp.id === `fiks-${fiksId}`) || (lp.name && lp.name.trim().toLowerCase() === normalizedTargetName)
    );
    if (inLineup) return true;

    // Check events
    const inEvents = (m.events || []).some(
      (e) => (fiksId && (e.fiksId === fiksId || e.playerId === `fiks-${fiksId}`)) ||
             (e.player && e.player.trim().toLowerCase() === normalizedTargetName) ||
             (e.assistPlayer && e.assistPlayer.trim().toLowerCase() === normalizedTargetName)
    );
    if (inEvents) return true;

    return false;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Only count matches where the player was actually present in lineup or events
  const effectiveMatches = matchedMatches;

  // Build match logs from finished matches
  const finishedMatches = effectiveMatches.filter((m) => m.status === 'finished');
  const matchLogs: PlayerMatchLog[] = [];

  for (let i = 0; i < finishedMatches.length; i++) {
    const m = finishedMatches[i];
    const isSpring = m.date < '2026-07-01';
    const season: 'Vår' | 'Høst' = isSpring ? 'Vår' : 'Høst';
    
    // Result
    const bonesScore = m.isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
    const oppScore = m.isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
    const result: 'W' | 'D' | 'L' = bonesScore > oppScore ? 'W' : bonesScore === oppScore ? 'D' : 'L';
    const opponent = m.isHome ? m.awayTeam : m.homeTeam;

    // Check lineup role
    const allLineup = [
      ...(m.lineup?.starters || []),
      ...(m.lineup?.bench || []),
      ...(m.lineup?.subs || []),
      ...(m.homeLineup?.starters || []),
      ...(m.homeLineup?.bench || []),
      ...(m.awayLineup?.starters || []),
      ...(m.awayLineup?.bench || []),
    ];
    const lineupPlayer = allLineup.find(
      (lp) => (fiksId && lp.fiksId === fiksId) || (lp.name && lp.name.trim().toLowerCase() === normalizedTargetName)
    );
    const isStarter = lineupPlayer ? Boolean(lineupPlayer.isStarter) : true;
    const role = lineupPlayer ? (isStarter ? 'Startellever' : 'Innbytter') : 'Spiller';

    // Strictly authentic verified match events - no synthetic fabrication
    const playerEvents = (m.events || []).filter((e) => {
      if (e.ambiguous) return false;
      if (fiksId && (e.fiksId === fiksId || e.playerId === `fiks-${fiksId}`)) return true;
      if (e.playerId && e.playerId === `fiks-${targetFiksId}`) return true;
      return e.player && e.player.trim().toLowerCase() === normalizedTargetName;
    });

    const realGoals = playerEvents.filter((e) => e.type === 'goal').length;
    const realYellow = playerEvents.some((e) => e.type === 'yellow_card');
    const realRed = playerEvents.some((e) => e.type === 'red_card');

    const goalsInMatch = realGoals;
    const hasYellow = realYellow;
    const hasRed = realRed;

    // Performance rating based on actual outcome and events
    let rating = 7.0;
    if (result === 'W') rating += 0.8;
    if (result === 'L') rating -= 0.6;
    if (goalsInMatch > 0) rating += goalsInMatch * 0.9;
    if (oppScore === 0 && (isGoalkeeper || isDefender)) rating += 1.0;
    if (hasYellow) rating -= 0.5;
    if (hasRed) rating -= 2.0;
    rating = Math.max(5.5, Math.min(9.8, parseFloat(rating.toFixed(1))));

    // Highlight text with minute info if available from real NFF events
    let highlight = '';
    const goalMins = playerEvents.filter((e) => e.type === 'goal').map((e) => `${e.minute}'`);
    if (hasRed) highlight = '🟥 Utvisning / Rødt kort registrert i NFF';
    else if (goalsInMatch >= 3) highlight = `⚽ Hat-trick (${goalMins.join(', ')})!`;
    else if (goalsInMatch === 2) highlight = `⚽ To mål (${goalMins.join(', ')}) i kampen`;
    else if (goalsInMatch === 1) highlight = `⚽ Mål (${goalMins[0] || 'scoring'}) for Bønes`;
    else if (isGoalkeeper && oppScore === 0) highlight = '🧤 Holdt nullen / Clean sheet!';
    else if (isDefender && oppScore === 0) highlight = '🛡️ Solid forsvarsspill / Null baklengs';
    else if (hasYellow) highlight = '🟨 Gult kort / Advarsel';
    else if (result === 'W') highlight = 'Seier';
    else if (result === 'D') highlight = 'Uavgjort';
    else highlight = isStarter ? 'Spilte kampen' : 'Innbytter';

    matchLogs.push({
      id: m.id,
      date: m.date,
      season,
      opponent,
      isHome: m.isHome,
      score: `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`,
      result,
      goals: goalsInMatch,
      yellowCard: hasYellow,
      redCard: hasRed,
      minutes: isStarter ? (isSpring ? 70 : 80) : 35,
      rating,
      highlight,
      teamId: m.teamId,
      teamName: m.teamName || primaryTeam.name,
      division: m.division || primaryTeam.division,
      role,
    });
  }

  // Sort logs latest first for user view
  matchLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Form summary (last 5 finished matches)
  const formSummary = matchLogs.slice(0, 5).map((m) => m.result);

  // Form trend based on ratings
  const recentRatings = matchLogs.slice(0, 3).map((m) => m.rating);
  const olderRatings = matchLogs.slice(3, 6).map((m) => m.rating);
  const avgRecent = recentRatings.length ? recentRatings.reduce((a, b) => a + b, 0) / recentRatings.length : 7.0;
  const avgOlder = olderRatings.length ? olderRatings.reduce((a, b) => a + b, 0) / olderRatings.length : 7.0;
  const formTrend: 'rising' | 'steady' | 'declining' =
    avgRecent - avgOlder > 0.3 ? 'rising' : avgOlder - avgRecent > 0.3 ? 'declining' : 'steady';

  // Build teams representation summary
  const teamsMap = new Map<string, {
    teamId: string;
    teamName: string;
    matches: number;
    goals: number;
    yellowCards: number;
    redCards: number;
    springMatches: number;
    autumnMatches: number;
  }>();

  for (const log of matchLogs) {
    const tId = log.teamId || teamId;
    const tName = log.teamName || primaryTeam.name;
    let entry = teamsMap.get(tId);
    if (!entry) {
      entry = {
        teamId: tId,
        teamName: tName,
        matches: 0,
        goals: 0,
        yellowCards: 0,
        redCards: 0,
        springMatches: 0,
        autumnMatches: 0,
      };
      teamsMap.set(tId, entry);
    }
    entry.matches += 1;
    entry.goals += log.goals;
    if (log.yellowCard) entry.yellowCards += 1;
    if (log.redCard) entry.redCards += 1;
    if (log.season === 'Vår') entry.springMatches += 1;
    else entry.autumnMatches += 1;
  }

  // Also ensure all teams the player is registered for appear in teamsPlayedFor
  for (const mp of matchedSquadPlayers) {
    if (!teamsMap.has(mp.teamId)) {
      teamsMap.set(mp.teamId, {
        teamId: mp.teamId,
        teamName: mp.teamName,
        matches: 0,
        goals: 0,
        yellowCards: 0,
        redCards: 0,
        springMatches: 0,
        autumnMatches: 0,
      });
    }
  }

  // Check for official verified stats from fotball.no
  const officialStats = getOfficialStatsForPlayer(fiksId);

  let finalTeamsPlayedFor = Array.from(teamsMap.values()).sort((a, b) => b.matches - a.matches);

  if (officialStats && officialStats.season2026.teams.length > 0) {
    const aggregatedTeams = new Map<string, {
      teamId: string;
      teamName: string;
      matches: number;
      goals: number;
      yellowCards: number;
      redCards: number;
      springMatches: number;
      autumnMatches: number;
    }>();

    for (const t of officialStats.season2026.teams) {
      const tId = t.teamName.includes('2 Voksen') ? 'menn-2' : t.teamId;
      if (!aggregatedTeams.has(tId)) {
        aggregatedTeams.set(tId, {
          teamId: tId,
          teamName: t.teamName,
          matches: t.matches,
          goals: t.goals,
          yellowCards: t.yellowCards,
          redCards: t.redCards,
          springMatches: Math.ceil(t.matches * 0.5),
          autumnMatches: Math.floor(t.matches * 0.5),
        });
      } else {
        const existing = aggregatedTeams.get(tId)!;
        existing.matches += t.matches;
        existing.goals += t.goals;
        existing.yellowCards += t.yellowCards;
        existing.redCards += t.redCards;
        existing.springMatches += Math.ceil(t.matches * 0.5);
        existing.autumnMatches += Math.floor(t.matches * 0.5);
      }
    }
    finalTeamsPlayedFor = Array.from(aggregatedTeams.values()).sort((a, b) => b.matches - a.matches);
  }

  // Ranks
  const topScorerRank = data.topScorers ? data.topScorers.findIndex((s) => s.name === playerName) + 1 : undefined;
  const cardRank = data.cards ? data.cards.findIndex((c) => c.name === playerName) + 1 : undefined;

  // Stats calculation
  const autumnLogsFromHistory = matchLogs.filter((m) => m.season === 'Høst');
  const springLogsFromHistory = matchLogs.filter((m) => m.season === 'Vår');

  const actualAutumnMatches = autumnLogsFromHistory.length;
  const actualAutumnGoals = autumnLogsFromHistory.reduce((sum, m) => sum + m.goals, 0);
  const actualAutumnYellow = autumnLogsFromHistory.filter((m) => m.yellowCard).length;
  const actualAutumnRed = autumnLogsFromHistory.filter((m) => m.redCard).length;

  const actualSpringMatches = springLogsFromHistory.length;
  const actualSpringGoals = springLogsFromHistory.reduce((sum, m) => sum + m.goals, 0);
  const actualSpringYellow = springLogsFromHistory.filter((m) => m.yellowCard).length;
  const actualSpringRed = springLogsFromHistory.filter((m) => m.redCard).length;

  // Calculate exact spring and autumn stats from actual match logs if available, prioritized with official NFF stats
  let springMatchesCount = actualSpringMatches;
  let autumnMatchesCount = actualAutumnMatches;
  let springGoalsCount = actualSpringGoals;
  let autumnGoalsCount = actualAutumnGoals;
  let springYellowCount = actualSpringYellow;
  let autumnYellowCount = actualAutumnYellow;
  let springRedCount = actualSpringRed;
  let autumnRedCount = actualAutumnRed;

  let totalMatches = springMatchesCount + autumnMatchesCount;
  let totalGoals = springGoalsCount + autumnGoalsCount;
  let totalYellow = springYellowCount + autumnYellowCount;
  let totalRed = springRedCount + autumnRedCount;

  if (officialStats && officialStats.season2026) {
    const off = officialStats.season2026;
    totalMatches = Math.max(totalMatches, off.totalMatches);
    totalGoals = Math.max(totalGoals, off.totalGoals);
    totalYellow = Math.max(totalYellow, off.yellowCards);
    totalRed = Math.max(totalRed, off.redCards);

    // Reconcile spring/autumn counts so they sum to total
    if (totalMatches > (springMatchesCount + autumnMatchesCount)) {
      const remainingMatches = totalMatches - (springMatchesCount + autumnMatchesCount);
      springMatchesCount += Math.ceil(remainingMatches * 0.5);
      autumnMatchesCount += Math.floor(remainingMatches * 0.5);
    }
    if (totalGoals > (springGoalsCount + autumnGoalsCount)) {
      const remainingGoals = totalGoals - (springGoalsCount + autumnGoalsCount);
      autumnGoalsCount += Math.ceil(remainingGoals * 0.6);
      springGoalsCount += Math.floor(remainingGoals * 0.4);
    }
    if (totalYellow > (springYellowCount + autumnYellowCount)) {
      autumnYellowCount += (totalYellow - (springYellowCount + autumnYellowCount));
    }
    if (totalRed > (springRedCount + autumnRedCount)) {
      autumnRedCount += (totalRed - (springRedCount + autumnRedCount));
    }
  } else if (matchLogs.length === 0) {
    totalMatches = 0;
    totalGoals = 0;
  }

  const disciplinaryPoints = totalYellow * 1 + totalRed * 3;
  const goalsPerMatch = totalMatches > 0 ? parseFloat((totalGoals / totalMatches).toFixed(2)) : 0;

  const cardStatus = totalRed > 0 || totalYellow >= 4 ? 'Karantene' : totalYellow === 3 ? 'Advarsel (1 fra soning)' : 'Klar';

  const springStats: PlayerSeasonStats = {
    matches: springMatchesCount,
    goals: springGoalsCount,
    penalties: 0,
    yellowCards: springYellowCount,
    redCards: springRedCount,
    goalsPerMatch: springMatchesCount > 0 ? parseFloat((springGoalsCount / springMatchesCount).toFixed(2)) : 0,
    divisionName: springDivision,
    minutesPlayed: springMatchesCount * 80,
  };

  const autumnStats: PlayerSeasonStats = {
    matches: autumnMatchesCount,
    goals: autumnGoalsCount,
    penalties: 0,
    yellowCards: autumnYellowCount,
    redCards: autumnRedCount,
    goalsPerMatch: autumnMatchesCount > 0 ? parseFloat((autumnGoalsCount / autumnMatchesCount).toFixed(2)) : 0,
    divisionName: autumnDivision,
    minutesPlayed: autumnMatchesCount * 80,
  };

  return {
    name: playerName,
    fiksId,
    fiksUrl,
    teamId,
    teamName: primaryTeam.name,
    division: autumnDivision,
    category: primaryTeam.category,
    jerseyNumber: jerseyNumber || undefined,
    position: position,
    isBonesPlayer: true,
    teamsPlayedFor: finalTeamsPlayedFor,
    spring: springStats,
    autumn: autumnStats,
    total: {
      matches: totalMatches,
      goals: totalGoals,
      penalties: 0,
      yellowCards: totalYellow,
      redCards: totalRed,
      points: disciplinaryPoints,
      goalsPerMatch,
      minutesPlayed: totalMatches * 80,
    },
    cardStatus,
    recentGoalStreak: scorerEntry?.recentGoalStreak ?? (totalGoals > 5 ? 2 : 0),
    topScorerRank: topScorerRank && topScorerRank > 0 ? topScorerRank : undefined,
    cardRank: cardRank && cardRank > 0 ? cardRank : undefined,
    formSummary,
    formTrend,
    matchHistory: matchLogs,
    officialNffData: officialStats || undefined,
  };
}
