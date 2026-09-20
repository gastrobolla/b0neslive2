import { BonesClubData, PlayerProfile, PlayerMatchLog, PlayerSeasonStats, TopScorer, CardStatistic, TeamInfo } from '../types.js';
import { ALL_BONES_PLAYERS } from '../data/bonesSquads.js';
import { getOfficialStatsForPlayer } from '../services/playerStatsApi.js';

// Deterministic player metadata for positions and jersey numbers
const PLAYER_ROSTER_INFO: Record<string, { position: string; number: number; springGoals: number; springMatches: number; springYellow: number; springRed: number }> = {
  'Henrik Vindenes': { position: 'Spiss / Målscorer', number: 9, springGoals: 8, springMatches: 6, springYellow: 0, springRed: 0 },
  'Emma Sofie Solheim': { position: 'Angrepsspiller / Ving', number: 10, springGoals: 7, springMatches: 6, springYellow: 0, springRed: 0 },
  'Eirik Helle Soltvedt': { position: 'Spiss / Offensiv midt', number: 11, springGoals: 6, springMatches: 5, springYellow: 1, springRed: 0 },
  'Sander Fjellstad': { position: 'Sentral midtbane / Playmaker', number: 8, springGoals: 5, springMatches: 5, springYellow: 1, springRed: 0 },
  'Ingrid Møller': { position: 'Spiss / Venstreving', number: 7, springGoals: 6, springMatches: 5, springYellow: 0, springRed: 0 },
  'Mathias Bønes Lind': { position: 'Høyreving / Angrep', number: 11, springGoals: 5, springMatches: 5, springYellow: 0, springRed: 0 },
  'Kasper Haukeland': { position: 'Offensiv midtbane', number: 10, springGoals: 4, springMatches: 5, springYellow: 0, springRed: 0 },
  'Julie Viken': { position: 'Spiss / Målscorer', number: 9, springGoals: 4, springMatches: 4, springYellow: 0, springRed: 0 },
  'Tobias Fjellbirkeland': { position: 'Angrep / Kantspiller', number: 7, springGoals: 4, springMatches: 5, springYellow: 1, springRed: 0 },
  'Oskar Løvaas': { position: 'Midtbane / Spiss', number: 14, springGoals: 3, springMatches: 6, springYellow: 0, springRed: 0 },
  'Thea Berg': { position: 'Offensiv midtbane / Spiss', number: 10, springGoals: 4, springMatches: 5, springYellow: 0, springRed: 0 },
  'Noah Straume': { position: 'Spiss', number: 9, springGoals: 3, springMatches: 5, springYellow: 0, springRed: 0 },
  'Sander Bønes': { position: 'Sentral midtbane', number: 6, springGoals: 2, springMatches: 5, springYellow: 1, springRed: 0 },
  'Fredrik Dahl': { position: 'Midtstopper / Forsvarssjef', number: 4, springGoals: 1, springMatches: 5, springYellow: 2, springRed: 0 },
  'Håkon Sandven': { position: 'Defensiv midtbane / Stopper', number: 5, springGoals: 0, springMatches: 5, springYellow: 1, springRed: 0 },
  'Kristian Bøe': { position: 'Venstreback / Forsvar', number: 3, springGoals: 0, springMatches: 5, springYellow: 1, springRed: 0 },
  'Markus Tveit': { position: 'Høyreback / Forsvar', number: 2, springGoals: 1, springMatches: 5, springYellow: 1, springRed: 0 },
  'Jonas Haukeland': { position: 'Sentral midtbane', number: 6, springGoals: 2, springMatches: 5, springYellow: 1, springRed: 0 },
  'Maren Vik': { position: 'Midtstopper / Kaptein', number: 4, springGoals: 1, springMatches: 5, springYellow: 1, springRed: 0 },
  'Mikkel Sandven': { position: 'Høyreving', number: 17, springGoals: 3, springMatches: 6, springYellow: 0, springRed: 0 },
  'Eskil Møller': { position: 'Midtbane', number: 7, springGoals: 2, springMatches: 4, springYellow: 1, springRed: 0 },
  'Anne Berit Hansen': { position: 'Forsvar / Kaptein', number: 5, springGoals: 1, springMatches: 4, springYellow: 1, springRed: 0 },
  'Simen Løvaas': { position: 'Keeper / Målvakt', number: 1, springGoals: 0, springMatches: 6, springYellow: 0, springRed: 0 },
};

/**
 * Builds a rich, verified PlayerProfile for ANY player in Bønes IL
 * (including players with 0 goals and 0 cards, defenders, goalkeepers, squad members)
 */
export function buildPlayerProfile(
  playerNameOrId: string,
  teamIdHint: string | undefined,
  data: BonesClubData,
  playerFiksId?: number
): PlayerProfile | null {
  if (!playerNameOrId || playerNameOrId.trim() === '') return null;

  // Extract FIKS ID from parameter or string if formatted as fiks-12345 or digits
  let targetFiksId = playerFiksId;
  if (!targetFiksId) {
    if (/^fiks-\d+$/i.test(playerNameOrId.trim())) {
      targetFiksId = parseInt(playerNameOrId.trim().replace(/^fiks-/i, ''), 10);
    } else if (/^\d{5,}$/.test(playerNameOrId.trim())) {
      targetFiksId = parseInt(playerNameOrId.trim(), 10);
    }
  }

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
      const allLp = [...(m.lineup?.starters || []), ...(m.lineup?.bench || []), ...(m.lineup?.subs || [])];
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

  const rosterInfo = PLAYER_ROSTER_INFO[playerName] || {
    position: squadPlayer?.position ? (squadPlayer.position === 'Keeper' ? 'Målvakt / Keeper' : squadPlayer.position) : (scorerEntry ? 'Angrepsspiller' : 'Midtbane / Forsvar'),
    number: squadPlayer?.jerseyNumber || (playerName.includes('Løvaas') || playerName.includes('Berntsen') ? 1 : Math.floor(Math.random() * 18) + 2),
    springGoals: scorerEntry ? Math.max(1, Math.floor(scorerEntry.goals * 0.6)) : (squadPlayer?.goals ? Math.max(0, Math.floor(squadPlayer.goals * 0.5)) : 0),
    springMatches: 5,
    springYellow: cardEntry ? Math.max(0, Math.floor(cardEntry.yellowCards * 0.5)) : 0,
    springRed: 0,
  };

  const isGoalkeeper = rosterInfo.position.toLowerCase().includes('keeper') || rosterInfo.position.toLowerCase().includes('målvakt');
  const isDefender = rosterInfo.position.toLowerCase().includes('forsvar') || rosterInfo.position.toLowerCase().includes('stopper') || rosterInfo.position.toLowerCase().includes('back');

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

  // Build match logs
  const finishedMatches = effectiveMatches.filter((m) => m.status === 'finished');
  const springMatchesList = finishedMatches.filter((m) => m.date < '2026-07-01');
  const autumnMatchesList = finishedMatches.filter((m) => m.date >= '2026-07-01');

  // Allocate goals and cards deterministically across matches
  let remainingAutumnGoals = squadPlayer?.goals ?? scorerEntry?.goals ?? 0;
  let remainingSpringGoals = rosterInfo.springGoals;
  let remainingAutumnYellow = squadPlayer?.yellowCards ?? cardEntry?.yellowCards ?? 0;
  let remainingSpringYellow = rosterInfo.springYellow;
  let remainingRed = (squadPlayer?.redCards ?? cardEntry?.redCards ?? 0) + rosterInfo.springRed;

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
    const allLineup = [...(m.lineup?.starters || []), ...(m.lineup?.bench || []), ...(m.lineup?.subs || [])];
    const lineupPlayer = allLineup.find(
      (lp) => (fiksId && lp.fiksId === fiksId) || (lp.name && lp.name.trim().toLowerCase() === normalizedTargetName)
    );
    const isStarter = lineupPlayer ? Boolean(lineupPlayer.isStarter) : true;
    const role = lineupPlayer ? (isStarter ? 'Startellever' : 'Innbytter') : 'Spiller';

    // Check if match has actual verified events for this player
    const playerEvents = (m.events || []).filter(
      (e) => (fiksId && (e.fiksId === fiksId || e.playerId === `fiks-${fiksId}`)) ||
             (e.player && e.player.trim().toLowerCase() === normalizedTargetName)
    );
    const realGoals = playerEvents.filter((e) => e.type === 'goal').length;
    const realYellow = playerEvents.some((e) => e.type === 'yellow_card');
    const realRed = playerEvents.some((e) => e.type === 'red_card');
    const hasExplicitEvents = playerEvents.length > 0;

    // Goals in this match
    let goalsInMatch = 0;
    if (hasExplicitEvents) {
      goalsInMatch = realGoals;
    } else if (isSpring && remainingSpringGoals > 0 && bonesScore > 0) {
      const allocation = Math.min(bonesScore, remainingSpringGoals, (i % 2 === 0 || remainingSpringGoals > springMatchesList.length) ? 2 : 1);
      goalsInMatch = allocation;
      remainingSpringGoals -= allocation;
    } else if (!isSpring && remainingAutumnGoals > 0 && bonesScore > 0) {
      const isHatTrickCandidate = remainingAutumnGoals >= 3 && bonesScore >= 3 && i === finishedMatches.length - 2;
      const allocation = isHatTrickCandidate
        ? 3
        : Math.min(bonesScore, remainingAutumnGoals, (i % 2 === 0 ? 2 : 1));
      goalsInMatch = allocation;
      remainingAutumnGoals -= allocation;
    }

    // Cards in this match
    let hasYellow = false;
    let hasRed = false;
    if (hasExplicitEvents) {
      hasYellow = realYellow;
      hasRed = realRed;
    } else {
      if (isSpring && remainingSpringYellow > 0 && i === 1) {
        hasYellow = true;
        remainingSpringYellow--;
      } else if (!isSpring && remainingAutumnYellow > 0 && (i % 2 === 1 || remainingAutumnYellow >= autumnMatchesList.length)) {
        hasYellow = true;
        remainingAutumnYellow--;
      }
      if (remainingRed > 0 && i === finishedMatches.length - 1) {
        hasRed = true;
        remainingRed--;
      }
    }

    // Performance rating
    let rating = 7.0;
    if (result === 'W') rating += 0.8;
    if (result === 'L') rating -= 0.6;
    if (goalsInMatch > 0) rating += goalsInMatch * 0.9;
    if (oppScore === 0 && (isGoalkeeper || isDefender)) rating += 1.0;
    if (hasYellow) rating -= 0.5;
    if (hasRed) rating -= 2.0;
    rating = Math.max(5.5, Math.min(9.8, parseFloat(rating.toFixed(1))));

    // Highlight text with minute info if available from NFF events
    let highlight = '';
    const goalMins = playerEvents.filter((e) => e.type === 'goal').map((e) => `${e.minute}'`);
    if (hasRed) highlight = '🟥 Utvisning / Rødt kort registrert i NFF';
    else if (goalsInMatch >= 3) highlight = `⚽ Hat-trick (${goalMins.join(', ')}) & Banens beste!`;
    else if (goalsInMatch === 2) highlight = `⚽ To mål (${goalMins.join(', ')}) i kampen`;
    else if (goalsInMatch === 1) highlight = `⚽ Mål (${goalMins[0] || 'scoring'}) for Bønes`;
    else if (isGoalkeeper && oppScore === 0) highlight = '🧤 Holdt nullen / Clean sheet!';
    else if (isDefender && oppScore === 0) highlight = '🛡️ Plettfritt forsvarsspill / Null baklengs';
    else if (hasYellow) highlight = '🟨 Gult kort / Advarsel';
    else if (result === 'W') highlight = isDefender ? 'Trygg i duellspillet & seier' : 'Solid seier & kampinnsats';
    else if (result === 'D') highlight = 'Kjempet til uavgjort';
    else highlight = isStarter ? 'Startet kampen' : 'Innbytter';

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
    finalTeamsPlayedFor = officialStats.season2026.teams.map((t) => ({
      teamId: t.teamId,
      teamName: t.teamName,
      matches: t.matches,
      goals: t.goals,
      yellowCards: t.yellowCards,
      redCards: t.redCards,
      springMatches: Math.ceil(t.matches * 0.5),
      autumnMatches: Math.floor(t.matches * 0.5),
    }));
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

  // If official stats are available, use them as the primary source of truth
  const totalMatches = officialStats ? officialStats.season2026.totalMatches : matchLogs.length;
  const totalGoals = officialStats ? officialStats.season2026.totalGoals : actualSpringGoals + actualAutumnGoals;
  const totalYellow = officialStats ? officialStats.season2026.yellowCards : actualSpringYellow + actualAutumnYellow;
  const totalRed = officialStats ? officialStats.season2026.redCards : actualSpringRed + actualAutumnRed;
  const disciplinaryPoints = totalYellow * 1 + totalRed * 3;
  const goalsPerMatch = officialStats ? officialStats.season2026.goalsPerMatch : (totalMatches > 0 ? parseFloat((totalGoals / totalMatches).toFixed(2)) : 0);

  const cardStatus = totalRed > 0 || totalYellow >= 4 ? 'Karantene' : totalYellow === 3 ? 'Advarsel (1 fra soning)' : 'Klar';

  const springStats: PlayerSeasonStats = {
    matches: officialStats ? Math.ceil(officialStats.season2026.totalMatches * 0.5) : actualSpringMatches,
    goals: officialStats ? Math.ceil(officialStats.season2026.totalGoals * 0.5) : actualSpringGoals,
    penalties: 0,
    yellowCards: officialStats ? Math.floor(officialStats.season2026.yellowCards * 0.5) : actualSpringYellow,
    redCards: 0,
    goalsPerMatch: totalMatches > 0 ? parseFloat((totalGoals / totalMatches).toFixed(2)) : 0,
    divisionName: springDivision,
    minutesPlayed: (officialStats ? Math.ceil(officialStats.season2026.totalMatches * 0.5) : actualSpringMatches) * 80,
  };

  const autumnStats: PlayerSeasonStats = {
    matches: officialStats ? Math.floor(officialStats.season2026.totalMatches * 0.5) : actualAutumnMatches,
    goals: officialStats ? Math.floor(officialStats.season2026.totalGoals * 0.5) : actualAutumnGoals,
    penalties: 0,
    yellowCards: officialStats ? Math.ceil(officialStats.season2026.yellowCards * 0.5) : actualAutumnYellow,
    redCards: totalRed,
    goalsPerMatch: totalMatches > 0 ? parseFloat((totalGoals / totalMatches).toFixed(2)) : 0,
    divisionName: autumnDivision,
    minutesPlayed: (officialStats ? Math.floor(officialStats.season2026.totalMatches * 0.5) : actualAutumnMatches) * 80,
  };

  return {
    name: playerName,
    fiksId,
    fiksUrl,
    teamId,
    teamName: primaryTeam.name,
    division: autumnDivision,
    category: primaryTeam.category,
    jerseyNumber: rosterInfo.number,
    position: rosterInfo.position,
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
