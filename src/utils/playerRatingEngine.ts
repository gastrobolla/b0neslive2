import { Match, MatchEvent, Player, PlayerPosition, PlayerRatingBreakdown } from '../types.js';
import { normalizePosition, getPlayerPositionInMatch } from './positionEngine.js';
import { isOwnGoalEvent } from './derivedStats.js';

export interface PlayerRatingInput {
  playerName: string;
  team: string;
  position?: string;
  jerseyNumber?: number;
  isStarter?: boolean;
  goals?: number;
  ownGoals?: number;
  assists?: number;
  yellowCards?: number;
  redCards?: number;
}

export interface PlayerRatingResult {
  rating: number; // 3.5 to 9.8
  breakdown: PlayerRatingBreakdown;
  tags: string[];
  summary: string;
}

/**
 * Context-Aware Algorithmic Player Rating Engine for Grassroots & Semi-Pro Football.
 * 
 * Accurately models the player's dynamic position in the match:
 * - Keeper: Evaluated on clean sheets, saving tight leads under pressure, goals conceded.
 * - Defender: Evaluated on defensive containment, clean sheets, clutch blocks in final 15 min.
 * - Midfielder: Evaluated on two-way play, assists, controlling tempo, ball recovery.
 * - Forward/Spiss: Evaluated on offensive impact, goals, braces, late match-winning strikes.
 * - Own Goals: Heavy penalties, caps rating, removes clean sheet/clutch bonuses, and prevents POTM.
 */
export function calculatePlayerPerformanceRating(
  player: PlayerRatingInput,
  match: Match
): PlayerRatingResult {
  const normName = player.playerName.trim().toLowerCase();
  const isHome = (player.team || '').toLowerCase().includes(match.homeTeam.toLowerCase());
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  const teamScore = isHome ? homeScore : awayScore;
  const oppScore = isHome ? awayScore : homeScore;

  const result: 'W' | 'D' | 'L' =
    teamScore > oppScore ? 'W' : teamScore < oppScore ? 'L' : 'D';

  // Dynamic position normalization
  const normPos = normalizePosition(player.position);
  const isKeeper = normPos === 'Keeper';
  const isDefender = normPos === 'Forsvar';
  const isMidfielder = normPos === 'Midtbane';
  const isForward = normPos === 'Angrep';

  // Match duration and crunch-time detection
  const div = (match.division || '').toLowerCase();
  const duration = div.includes('13') || div.includes('14') ? 70 : div.includes('15') || div.includes('16') ? 80 : 90;
  const clutchStartMinute = duration - 15; // Final 15 minutes of match

  // Chronological event processing
  const allEvents = [...(match.events || [])].sort((a, b) => (a.minute || 0) - (b.minute || 0));

  // Find player-specific events
  const playerEvents = allEvents.filter(
    (e) => e.player && e.player.trim().toLowerCase() === normName
  );
  const playerAssists = allEvents.filter(
    (e) => e.assistPlayer && e.assistPlayer.trim().toLowerCase() === normName
  );

  const ownGoalsCount = player.ownGoals !== undefined
    ? player.ownGoals
    : playerEvents.filter(isOwnGoalEvent).length;

  const regularGoalsCount = playerEvents.filter((e) => e.type === 'goal' && !isOwnGoalEvent(e)).length;
  const realGoals = player.goals !== undefined ? Math.max(0, player.goals - ownGoalsCount) : regularGoalsCount;
  const realAssists = player.assists !== undefined ? player.assists : playerAssists.length;
  const hasYellow = player.yellowCards !== undefined ? player.yellowCards > 0 : playerEvents.some((e) => e.type === 'yellow_card');
  const hasRed = player.redCards !== undefined ? player.redCards > 0 : playerEvents.some((e) => e.type === 'red_card');

  // Track running score throughout match
  let runningHome = 0;
  let runningAway = 0;
  let opponentEarlyGoalMinute: number | null = null;
  let opponentLastGoalMinute: number | null = null;
  let opponentGoalsInClutch = 0;
  let teamLeadAtClutchStart = 0;

  for (const ev of allEvents) {
    const min = ev.minute || 0;
    const isEvHome = (ev.team || '').toLowerCase().includes(match.homeTeam.toLowerCase());

    if (ev.type === 'goal') {
      const isSelv = isOwnGoalEvent(ev);
      // In football, an own goal is awarded to the opponent on the scoreboard
      const goalGoesToHome = isSelv ? !isEvHome : isEvHome;

      if (goalGoesToHome) runningHome++;
      else runningAway++;

      const isOppGoal = isHome ? !goalGoesToHome : goalGoesToHome;
      if (isOppGoal) {
        opponentLastGoalMinute = min;
        if (min <= 30 && opponentEarlyGoalMinute === null) {
          opponentEarlyGoalMinute = min;
        }
        if (min >= clutchStartMinute) {
          opponentGoalsInClutch++;
        }
      }
    }

    if (min <= clutchStartMinute) {
      teamLeadAtClutchStart = isHome ? (runningHome - runningAway) : (runningAway - runningHome);
    }
  }

  // Position-calibrated baseline rating
  let base = 6.8;
  const tags: string[] = [];

  // Team outcome baseline adjustment
  if (result === 'W') {
    base += isKeeper || isDefender ? 0.35 : 0.45;
  } else if (result === 'D') {
    base += isKeeper || isDefender ? (oppScore <= 1 ? 0.30 : 0.15) : 0.10;
  } else {
    // Loss
    if (oppScore >= 4) {
      base -= isKeeper ? 0.60 : isDefender ? 0.50 : 0.30;
    } else {
      base -= 0.30;
    }
  }

  let clutchBonus = 0;
  let cleanSheetBonus = 0;
  let anchorBonus = 0;
  let goalImpact = 0;
  let assistImpact = 0;
  let disciplinePenalty = 0;

  // 1. CLUTCH DEFENSE / HOLDING THE LEAD IN FINAL 15 MINUTES (Holding a 2-1 or 1-0 lead)
  const defendedTightLead = (teamLeadAtClutchStart === 1 || (teamLeadAtClutchStart === 2 && teamScore - oppScore <= 2)) && result === 'W';
  if (defendedTightLead && opponentGoalsInClutch === 0 && match.status !== 'upcoming') {
    if (isKeeper) {
      clutchBonus += 0.95;
      tags.push('🧤 Matchvinner i buret under sluttpress');
    } else if (isDefender) {
      clutchBonus += 0.85;
      tags.push(`🛡️ Herdet forsvaret under sluttpress (${teamScore}-${oppScore})`);
    } else if (isMidfielder) {
      clutchBonus += 0.55;
      tags.push('💪 Vant krigen på midtbanen i sluttminuttene');
    } else {
      clutchBonus += 0.30;
      tags.push('⚡ Taktisk oppofrelse og press i sluttfasen');
    }
  } else if (result === 'D' && oppScore <= 1 && opponentGoalsInClutch === 0 && match.status === 'finished') {
    if (isKeeper) {
      clutchBonus += 0.50;
      tags.push('🧤 Sikret poengdeling med sterkt keeperspill');
    } else if (isDefender) {
      clutchBonus += 0.45;
      tags.push('🛡️ Sikret poeng med oppofrende forsvarsspill');
    }
  }

  // 2. DEFENSIVE RESILIENCE & ANCHOR STABILIZATION
  if (
    opponentEarlyGoalMinute !== null &&
    (opponentLastGoalMinute === null || opponentLastGoalMinute <= 35) &&
    oppScore <= 2 &&
    (result === 'W' || result === 'D') &&
    match.status !== 'upcoming'
  ) {
    if (isKeeper) {
      anchorBonus += 0.60;
      tags.push('🧤 Stengte buret etter tidlig baklengs');
    } else if (isDefender) {
      anchorBonus += 0.55;
      tags.push('⚓ Stabiliserte forsvaret etter tidlig baklengs');
    } else if (isMidfielder) {
      anchorBonus += 0.35;
      tags.push('🧠 Roet ned spillet og gjenvant kontroll');
    }
  }

  // 3. CLEAN SHEET & DEFENSIVE ACCOUNTABILITY
  if (oppScore === 0 && match.status !== 'upcoming') {
    const margin = teamScore - oppScore;
    if (margin <= 1) {
      // 1-0 or 0-0 tight clean sheet
      if (isKeeper) {
        cleanSheetBonus += 1.35;
        tags.push('🧤 Helteinnsats / Holdt nullen i 1-0 seier');
      } else if (isDefender) {
        cleanSheetBonus += 1.15;
        tags.push('🛡️ Ugjennomtrengelig / Clean Sheet');
      } else if (isMidfielder) {
        cleanSheetBonus += 0.45;
        tags.push('🔒 Defensivt skjold foran fireren');
      }
    } else if (margin <= 3) {
      // 2-0 or 3-0 solid win
      if (isKeeper) {
        cleanSheetBonus += 1.05;
        tags.push('🧤 Holdt nullen');
      } else if (isDefender) {
        cleanSheetBonus += 0.90;
        tags.push('🛡️ Solid bakre firer / Null baklengs');
      } else if (isMidfielder) {
        cleanSheetBonus += 0.30;
      }
    } else {
      // Blowout clean sheet (4-0+)
      if (isKeeper) cleanSheetBonus += 0.65;
      else if (isDefender) cleanSheetBonus += 0.55;
    }
  } else if (oppScore >= 3 && match.status !== 'upcoming') {
    // Heavy defensive concessions impact Keepers & Defenders
    if (isKeeper) cleanSheetBonus -= 0.45;
    else if (isDefender) cleanSheetBonus -= 0.35;
  }

  // 4. GOAL IMPACT (Position-specific value)
  if (realGoals > 0) {
    for (let i = 0; i < realGoals; i++) {
      const gEvent = playerEvents.filter((e) => e.type === 'goal' && !isOwnGoalEvent(e))[i];
      const gMin = gEvent?.minute;

      if (gMin !== undefined && gMin >= clutchStartMinute && result === 'W' && teamScore - oppScore <= 1) {
        // Late match-winner!
        goalImpact += 1.55;
        tags.push(`⚽ Sent matchvinnermål (${gMin}')!`);
      } else if (isDefender) {
        // Defender goal is high value
        goalImpact += 1.40;
        tags.push('🛡️⚽ Scoring fra forsvarsspiller!');
      } else if (isKeeper) {
        goalImpact += 2.00;
        tags.push('🧤⚽ Mål fra målvakt!');
      } else if (isMidfielder) {
        goalImpact += 1.25;
        tags.push('🎯 Målfarlig midtbane');
      } else if (realGoals >= 3) {
        goalImpact += 1.20;
      } else {
        goalImpact += 1.15;
      }
    }
    if (realGoals >= 3 && !tags.some((t) => t.includes('Hat-trick'))) {
      tags.push('🎩 Hat-trick!');
    } else if (realGoals === 2 && !tags.some((t) => t.includes('Dobbeltscorer'))) {
      tags.push('⚽ Dobbeltscorer!');
    } else if (realGoals === 1 && !tags.some((t) => t.includes('mål') || t.includes('Scoring'))) {
      tags.push('⚽ Målscorer');
    }
  }

  // 5. ASSISTS IMPACT (Position-specific value)
  if (realAssists > 0) {
    const assistMultiplier = isDefender ? 0.85 : isMidfielder ? 0.80 : 0.65;
    assistImpact += realAssists * assistMultiplier;
    tags.push(realAssists > 1 ? `👟 ${realAssists} målgivende pasninger` : '👟 Målgivende pasning');
  }

  // 6. CARD DISCIPLINE & DEFENSIVE ERRORS (INCLUDING OWN GOALS)
  if (ownGoalsCount > 0) {
    // Scoring into one's own net completely cancels defensive bonuses
    cleanSheetBonus = 0;
    clutchBonus = 0;
    anchorBonus = 0;

    if (ownGoalsCount >= 2) {
      // 2 or more own goals is a historic nightmare disaster (cannot be anywhere near POTM)
      disciplinePenalty -= 4.2;
      tags.push(`⚠️ ${ownGoalsCount} selvmål (Marerittkamp)`);
    } else {
      disciplinePenalty -= 2.4;
      tags.push('⚠️ Uheldig selvmål');
    }
  }

  if (hasRed) {
    disciplinePenalty -= 1.80;
    tags.push('🟥 Rødt kort');
  } else if (hasYellow) {
    const yellowInClutch = playerEvents.some(
      (e) => e.type === 'yellow_card' && (e.minute || 0) >= clutchStartMinute
    );
    if (yellowInClutch && defendedTightLead) {
      disciplinePenalty -= 0.60;
      tags.push('🟨 Gult kort under sluttpress');
    } else {
      disciplinePenalty -= 0.45;
      tags.push('🟨 Gult kort');
    }
  } else if (defendedTightLead && (isDefender || isKeeper) && ownGoalsCount === 0) {
    clutchBonus += 0.20;
  }

  // 7. Micro-variance hash based on player name for realistic granularity
  const nameHash = player.playerName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const microVariance = ((nameHash % 7) - 3) * 0.04;

  const rawRating =
    base +
    clutchBonus +
    cleanSheetBonus +
    anchorBonus +
    goalImpact +
    assistImpact +
    disciplinePenalty +
    microVariance;

  // Realistic Sofascore boundaries with strict caps for own goals / red cards
  let maxBoundary = 9.8;
  let minBoundary = 5.0;

  if (ownGoalsCount >= 2) {
    maxBoundary = 4.8;
    minBoundary = 3.5;
  } else if (ownGoalsCount === 1) {
    maxBoundary = result === 'W' ? 6.2 : 5.4;
    minBoundary = 4.0;
  } else if (hasRed) {
    maxBoundary = 6.0;
    minBoundary = 4.5;
  }

  const finalRating = Math.max(minBoundary, Math.min(maxBoundary, parseFloat(rawRating.toFixed(1))));

  const breakdown: PlayerRatingBreakdown = {
    base: parseFloat(base.toFixed(2)),
    clutchDefense: clutchBonus > 0 ? parseFloat(clutchBonus.toFixed(2)) : undefined,
    cleanSheet: cleanSheetBonus !== 0 ? parseFloat(cleanSheetBonus.toFixed(2)) : undefined,
    anchorStabilization: anchorBonus > 0 ? parseFloat(anchorBonus.toFixed(2)) : undefined,
    goalImpact: goalImpact > 0 ? parseFloat(goalImpact.toFixed(2)) : undefined,
    assistImpact: assistImpact > 0 ? parseFloat(assistImpact.toFixed(2)) : undefined,
    disciplinePenalty: disciplinePenalty !== 0 ? parseFloat(disciplinePenalty.toFixed(2)) : undefined,
    tags,
  };

  // Position-appropriate default tag if none triggered
  let defaultTag = 'Solid kamp';
  if (isKeeper) defaultTag = finalRating >= 7.8 ? 'Klasse i buret' : 'Trygt keeperspill';
  else if (isDefender) defaultTag = finalRating >= 7.8 ? 'Dominerende forsvarsspill' : 'Trygg i duellene';
  else if (isMidfielder) defaultTag = finalRating >= 7.8 ? 'Dirigerte spillet' : 'God innsats på midten';
  else if (isForward) defaultTag = finalRating >= 7.8 ? 'Kampavgjørende på topp' : 'Aktiv i angrepsspillet';

  let primaryTag = tags[0] || (finalRating >= 8.0 ? 'Fremragende innsats' : defaultTag);
  if (ownGoalsCount >= 2) {
    primaryTag = `⚠️ ${ownGoalsCount} selvmål (Marerittkamp)`;
  } else if (ownGoalsCount === 1 && finalRating <= 6.2) {
    primaryTag = '⚠️ Selvmål preget kampen';
  }

  return {
    rating: finalRating,
    breakdown,
    tags,
    summary: primaryTag,
  };
}

export interface LeaderboardPlayerRating {
  name: string;
  fiksId?: number;
  teamId: string;
  teamName: string;
  position: PlayerPosition;
  matches: number;
  seasonAvgRating: number;
  last3AvgRating: number;
  recentRatings: number[];
  highestRating: number;
  primaryTag?: string;
  trend?: 'up' | 'down' | 'same';
  ratingDiff?: number;
  jerseyNumber?: number;
}

export interface OpponentNightmareRating {
  name: string;
  fiksId?: number;
  opponentTeam: string;
  bonesTeamFaced: string;
  position: PlayerPosition;
  rating: number;
  highestRating: number;
  goalsAgainstBones: number;
  totalGoalsAgainstBones: number;
  assistsAgainstBones: number;
  totalAssistsAgainstBones: number;
  matchesCount: number;
  bestMatchDate: string;
  bestMatchScore: string;
  summaryTag: string;
}

/**
 * Checks if a club or team name belongs to Bønes IL
 */
export function isBonesClub(teamName?: string): boolean {
  if (!teamName) return false;
  const t = teamName.toLowerCase();
  return t.includes('bønes') || t.includes('bones');
}

/**
 * Calculates season-wide player rating leaderboards:
 * 1. "Beste spiller": Highest average rating across the season (STRICTLY BØNES PLAYERS ONLY)
 * 2. "Formspiller": Highest average rating over the last 3 matches (STRICTLY BØNES PLAYERS ONLY)
 * 3. "Bønes-mareritt" / "Verste motstander": Opponents who performed exceptionally against Bønes
 */
export function calculateClubRatingLeaderboards(
  matches: Match[],
  players: Player[]
): {
  bestPlayer: LeaderboardPlayerRating | null;
  formPlayer: LeaderboardPlayerRating | null;
  allSeasonRanked: LeaderboardPlayerRating[];
  allFormRanked: LeaderboardPlayerRating[];
  bonesNightmares: OpponentNightmareRating[];
  worstOpponent: OpponentNightmareRating | null;
} {
  const finishedMatches = (matches || [])
    .filter((m) => m.status === 'finished')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (finishedMatches.length === 0) {
    return {
      bestPlayer: null,
      formPlayer: null,
      allSeasonRanked: [],
      allFormRanked: [],
      bonesNightmares: [],
      worstOpponent: null,
    };
  }

  // Pre-index known official Bønes players for canonical identification
  const knownBonesPlayerNames = new Set<string>();
  const playerOfficialMap = new Map<string, Player>();
  (players || []).forEach((p) => {
    if (p.name) {
      const norm = p.name.trim().toLowerCase();
      knownBonesPlayerNames.add(norm);
      playerOfficialMap.set(norm, p);
    }
  });

  const bonesStatsMap = new Map<
    string,
    {
      name: string;
      fiksId?: number;
      teamId: string;
      teamName: string;
      positions: PlayerPosition[];
      ratings: { rating: number; date: string }[];
      tags: string[];
      jerseyNumber?: number;
    }
  >();

  // Helper to register Bønes player rating
  const addBonesRating = (
    name: string,
    fiksId: number | undefined,
    teamId: string,
    teamName: string,
    pos: PlayerPosition,
    rating: number,
    date: string,
    tag?: string,
    jerseyNum?: number
  ) => {
    const key = fiksId ? `fiks-${fiksId}` : name.trim().toLowerCase();
    if (!bonesStatsMap.has(key)) {
      bonesStatsMap.set(key, {
        name,
        fiksId,
        teamId,
        teamName,
        positions: [],
        ratings: [],
        tags: [],
        jerseyNumber: jerseyNum,
      });
    }
    const entry = bonesStatsMap.get(key)!;
    entry.positions.push(pos);
    entry.ratings.push({ rating, date });
    if (tag) entry.tags.push(tag);
    if (!entry.jerseyNumber && jerseyNum) entry.jerseyNumber = jerseyNum;
  };

  // Map to collect standout opponent performances ("Bønes-mareritt")
  const opponentNightmareMap = new Map<
    string,
    {
      name: string;
      fiksId?: number;
      opponentTeam: string;
      bonesTeamFaced: string;
      position: PlayerPosition;
      highestRating: number;
      totalGoalsAgainstBones: number;
      totalAssistsAgainstBones: number;
      matchesCount: number;
      bestMatchDate: string;
      bestMatchScore: string;
      summaryTag: string;
    }
  >();

  // Evaluate each finished match
  for (const m of finishedMatches) {
    const isHomeBones = m.isHome || isBonesClub(m.homeTeam);
    const bonesTeamName = isHomeBones ? m.homeTeam : m.awayTeam;
    const oppTeamName = isHomeBones ? m.awayTeam : m.homeTeam;

    // 1. Process STRICTLY Bønes players
    const bonesLineup = (isHomeBones ? m.homeLineup : m.awayLineup) || m.lineup;
    const bonesList = [
      ...(bonesLineup?.starters || []),
      ...(bonesLineup?.bench || []),
      ...(bonesLineup?.subs || []),
    ];

    const processedBonesInMatch = new Set<string>();

    for (const lp of bonesList) {
      if (!lp.name) continue;
      const normName = lp.name.trim().toLowerCase();
      if (processedBonesInMatch.has(normName)) continue;
      processedBonesInMatch.add(normName);

      // Verify that this player is NOT an opponent
      if (lp.teamName && !isBonesClub(lp.teamName) && !knownBonesPlayerNames.has(normName)) {
        continue;
      }

      const matchPos = getPlayerPositionInMatch(lp.name, lp.fiksId, m, lp.position);
      // Strictly extract real goals and own goals from events
      const pEvents = (m.events || []).filter(e => e.player && e.player.trim().toLowerCase() === normName);
      const ogCount = pEvents.filter(isOwnGoalEvent).length;
      const realGoalsCount = pEvents.length > 0
        ? pEvents.filter(e => e.type === 'goal' && !isOwnGoalEvent(e)).length
        : Math.max(0, (lp.goals || 0) - ogCount);

      const perf = calculatePlayerPerformanceRating(
        {
          playerName: lp.name,
          team: bonesTeamName,
          position: matchPos,
          jerseyNumber: lp.jerseyNumber || lp.number,
          isStarter: lp.isStarter,
          goals: realGoalsCount,
          ownGoals: ogCount,
          yellowCards: lp.yellowCards,
          redCards: lp.redCards,
        },
        m
      );

      const official = playerOfficialMap.get(normName);

      addBonesRating(
        lp.name,
        lp.fiksId || official?.fiksId,
        m.teamId || official?.teamId || 'menn-1',
        bonesTeamName,
        matchPos,
        perf.rating,
        m.date,
        perf.summary,
        lp.jerseyNumber || lp.number || official?.number
      );
    }

    // Also verify any Bønes scorers in events who were not in lineup
    if (m.events) {
      for (const ev of m.events) {
        if (!ev.player) continue;
        const normName = ev.player.trim().toLowerCase();
        const isBonesEv = isBonesClub(ev.team) || knownBonesPlayerNames.has(normName);
        if (isBonesEv && !processedBonesInMatch.has(normName)) {
          processedBonesInMatch.add(normName);
          const official = playerOfficialMap.get(normName);
          const matchPos: PlayerPosition = official ? normalizePosition(official.position) : 'Angrep';
          const pEvents = m.events.filter(e => e.player && e.player.trim().toLowerCase() === normName);
          const ogCount = pEvents.filter(isOwnGoalEvent).length;
          const realGoalsCount = pEvents.filter(e => e.type === 'goal' && !isOwnGoalEvent(e)).length;

          const perf = calculatePlayerPerformanceRating(
            {
              playerName: ev.player,
              team: bonesTeamName,
              position: matchPos,
              isStarter: false,
              goals: realGoalsCount,
              ownGoals: ogCount,
            },
            m
          );

          addBonesRating(
            ev.player,
            ev.fiksId || official?.fiksId,
            m.teamId || official?.teamId || 'menn-1',
            bonesTeamName,
            matchPos,
            perf.rating,
            m.date,
            perf.summary,
            official?.number
          );
        }
      }
    }

    // 2. Process Opponents for "Bønes-mareritt" (Worst Opponent / Bønes Nightmare)
    const oppLineup = isHomeBones ? m.awayLineup : m.homeLineup;
    const oppPlayerMapInMatch = new Map<
      string,
      {
        name: string;
        fiksId?: number;
        team: string;
        position: PlayerPosition;
        goals: number;
        ownGoals: number;
        assists: number;
        yellowCards: number;
        redCards: number;
      }
    >();

    if (oppLineup) {
      const oList = [
        ...(oppLineup.starters || []),
        ...(oppLineup.bench || []),
        ...(oppLineup.subs || []),
      ];
      for (const op of oList) {
        if (!op.name) continue;
        const norm = op.name.trim().toLowerCase();
        // Skip if known Bønes player
        if (isBonesClub(op.teamName) || knownBonesPlayerNames.has(norm)) continue;

        // Disaggregate own goals from real goals
        const pEvents = (m.events || []).filter(e => e.player && e.player.trim().toLowerCase() === norm);
        const ogCount = pEvents.filter(isOwnGoalEvent).length;
        const realGoalsCount = pEvents.length > 0
          ? pEvents.filter(e => e.type === 'goal' && !isOwnGoalEvent(e)).length
          : Math.max(0, (op.goals || 0) - ogCount);

        oppPlayerMapInMatch.set(norm, {
          name: op.name,
          fiksId: op.fiksId,
          team: op.teamName || oppTeamName,
          position: normalizePosition(op.position),
          goals: realGoalsCount,
          ownGoals: ogCount,
          assists: op.assists || 0,
          yellowCards: op.yellowCards || 0,
          redCards: op.redCards || 0,
        });
      }
    }

    // Capture opponent goalscorers & card recipients from events
    if (m.events) {
      for (const ev of m.events) {
        if (!ev.player) continue;
        const norm = ev.player.trim().toLowerCase();
        if (isBonesClub(ev.team) || knownBonesPlayerNames.has(norm)) continue;

        if (!oppPlayerMapInMatch.has(norm)) {
          oppPlayerMapInMatch.set(norm, {
            name: ev.player,
            fiksId: ev.fiksId,
            team: ev.team || oppTeamName,
            position: 'Angrep',
            goals: 0,
            ownGoals: 0,
            assists: 0,
            yellowCards: 0,
            redCards: 0,
          });
        }
        const opp = oppPlayerMapInMatch.get(norm)!;
        if (ev.type === 'goal') {
          if (isOwnGoalEvent(ev)) {
            opp.ownGoals++;
          } else {
            opp.goals++;
          }
        }
        if (ev.type === 'yellow_card') opp.yellowCards++;
        if (ev.type === 'red_card') opp.redCards++;
      }
    }

    const oppScore = isHomeBones ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
    const bonesScore = isHomeBones ? (m.homeScore ?? 0) : (m.awayScore ?? 0);

    for (const opp of oppPlayerMapInMatch.values()) {
      // Opponents who scored own goals helped Bønes - they are NEVER a "Bønes-mareritt"
      if (opp.ownGoals > 0 && opp.goals === 0) {
        continue;
      }

      let oppBase = 6.8;
      if (oppScore > bonesScore) oppBase += 0.45;
      else if (oppScore === bonesScore) oppBase += 0.15;
      else oppBase -= 0.25;

      // Penalize own goals
      if (opp.ownGoals > 0) {
        oppBase -= opp.ownGoals * 2.2;
      }

      oppBase += opp.goals * 1.15;
      if (opp.goals >= 3) oppBase += 0.45; // Hat-trick bonus
      else if (opp.goals === 2) oppBase += 0.25;
      if (opp.yellowCards) oppBase -= 0.30;
      if (opp.redCards) oppBase -= 1.00;

      const rating = Math.min(10.0, Math.max(3.5, parseFloat(oppBase.toFixed(2))));

      // Only include as nightmare if they actually scored real goals against Bønes or had a dominant positive match
      if (opp.goals === 0 && rating < 7.6) {
        continue;
      }

      let summaryTag = `Solid mot ${bonesTeamName}`;
      if (opp.goals >= 4) summaryTag = `🔥 ${opp.goals} mål mot ${bonesTeamName}!`;
      else if (opp.goals === 3) summaryTag = `🎩 Hat-trick mot ${bonesTeamName}!`;
      else if (opp.goals === 2) summaryTag = `⚽ Dobbeltscorer mot ${bonesTeamName}`;
      else if (opp.goals === 1) summaryTag = `⚽ Scoring mot ${bonesTeamName}`;
      else if (oppScore > bonesScore) summaryTag = `Seier over ${bonesTeamName}`;

      const key = opp.fiksId ? `fiks-${opp.fiksId}` : opp.name.trim().toLowerCase();
      if (!opponentNightmareMap.has(key)) {
        opponentNightmareMap.set(key, {
          name: opp.name,
          fiksId: opp.fiksId,
          opponentTeam: opp.team,
          bonesTeamFaced: bonesTeamName,
          position: opp.position,
          highestRating: rating,
          totalGoalsAgainstBones: opp.goals,
          totalAssistsAgainstBones: opp.assists,
          matchesCount: 1,
          bestMatchDate: m.date,
          bestMatchScore: `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`,
          summaryTag,
        });
      } else {
        const existing = opponentNightmareMap.get(key)!;
        existing.matchesCount++;
        existing.totalGoalsAgainstBones += opp.goals;
        existing.totalAssistsAgainstBones += opp.assists;
        if (rating > existing.highestRating) {
          existing.highestRating = rating;
          existing.bonesTeamFaced = bonesTeamName;
          existing.opponentTeam = opp.team;
          existing.bestMatchDate = m.date;
          existing.bestMatchScore = `${m.homeScore ?? 0} - ${m.awayScore ?? 0}`;
          existing.summaryTag = summaryTag;
        }
      }
    }
  }

  // Fallback to squad players if match lineup list was sparse
  if (bonesStatsMap.size === 0 && players && players.length > 0) {
    for (const p of players) {
      if (!p.name) continue;
      const pos = normalizePosition(p.position);
      const baseRating = pos === 'Keeper' ? 7.6 : pos === 'Forsvar' ? 7.5 : pos === 'Angrep' ? 7.7 : 7.4;
      const bonus = (p.goals || 0) * 0.2;
      const sampleRating = Math.min(9.4, parseFloat((baseRating + bonus).toFixed(1)));
      addBonesRating(p.name, p.fiksId, p.teamId, p.teamName, pos, sampleRating, '2026-05-01');
    }
  }

  // Compile Bønes leaderboards
  const compiled: LeaderboardPlayerRating[] = [];

  bonesStatsMap.forEach((entry) => {
    if (entry.ratings.length === 0) return;

    entry.ratings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalRatings = entry.ratings.map((r) => r.rating);
    const seasonAvg =
      totalRatings.reduce((sum, r) => sum + r, 0) / totalRatings.length;

    // Last 3 matches
    const last3 = totalRatings.slice(0, 3);
    const last3Avg = last3.reduce((sum, r) => sum + r, 0) / last3.length;

    // Find most played position for this player
    const posCounts: Record<string, number> = {};
    for (const p of entry.positions) {
      posCounts[p] = (posCounts[p] || 0) + 1;
    }
    let mostPos: PlayerPosition = 'Midtbane';
    let maxCount = -1;
    for (const [p, cnt] of Object.entries(posCounts)) {
      if (cnt > maxCount) {
        maxCount = cnt;
        mostPos = p as PlayerPosition;
      }
    }

    // Trend calculation
    const ratingDiff = parseFloat((last3Avg - seasonAvg).toFixed(2));
    let trend: 'up' | 'down' | 'same' = 'same';
    if (ratingDiff >= 0.15) trend = 'up';
    else if (ratingDiff <= -0.15) trend = 'down';

    const primaryTag =
      entry.tags[0] ||
      (mostPos === 'Keeper'
        ? 'Trygt keeperspill'
        : mostPos === 'Forsvar'
        ? 'Solid forsvarsspiller'
        : mostPos === 'Angrep'
        ? 'Målfarlig angriper'
        : 'Sentral drivkraft');

    compiled.push({
      name: entry.name,
      fiksId: entry.fiksId,
      teamId: entry.teamId,
      teamName: entry.teamName,
      position: mostPos,
      matches: totalRatings.length,
      seasonAvgRating: parseFloat(seasonAvg.toFixed(2)),
      last3AvgRating: parseFloat(last3Avg.toFixed(2)),
      recentRatings: last3,
      highestRating: Math.max(...totalRatings),
      primaryTag,
      trend,
      ratingDiff,
      jerseyNumber: entry.jerseyNumber,
    });
  });

  // Sort for Beste Spiller: Prioritize players with >= 2 matches, descending by seasonAvgRating
  const allSeasonRanked = [...compiled].sort((a, b) => {
    const aWeighted = a.matches >= 2 ? a.seasonAvgRating : a.seasonAvgRating - 0.3;
    const bWeighted = b.matches >= 2 ? b.seasonAvgRating : b.seasonAvgRating - 0.3;
    return bWeighted - aWeighted || b.matches - a.matches;
  });

  // Sort for Formspiller: Descending by last3AvgRating
  const allFormRanked = [...compiled].sort((a, b) => {
    return b.last3AvgRating - a.last3AvgRating || b.matches - a.matches;
  });

  // Sort Bønes-mareritt: Highest rating against Bønes, then total goals scored against Bønes
  const bonesNightmares: OpponentNightmareRating[] = Array.from(opponentNightmareMap.values())
    .filter((opp) => opp.highestRating >= 7.6 || opp.totalGoalsAgainstBones >= 1)
    .map((opp) => ({
      name: opp.name,
      fiksId: opp.fiksId,
      opponentTeam: opp.opponentTeam,
      bonesTeamFaced: opp.bonesTeamFaced,
      position: opp.position,
      rating: opp.highestRating,
      highestRating: opp.highestRating,
      goalsAgainstBones: opp.totalGoalsAgainstBones,
      totalGoalsAgainstBones: opp.totalGoalsAgainstBones,
      assistsAgainstBones: opp.totalAssistsAgainstBones,
      totalAssistsAgainstBones: opp.totalAssistsAgainstBones,
      matchesCount: opp.matchesCount,
      bestMatchDate: opp.bestMatchDate,
      bestMatchScore: opp.bestMatchScore,
      summaryTag: opp.summaryTag,
    }))
    .sort((a, b) => {
      return (
        b.rating - a.rating ||
        b.goalsAgainstBones - a.goalsAgainstBones ||
        b.matchesCount - a.matchesCount
      );
    });

  return {
    bestPlayer: allSeasonRanked[0] || null,
    formPlayer: allFormRanked[0] || null,
    allSeasonRanked,
    allFormRanked,
    bonesNightmares,
    worstOpponent: bonesNightmares[0] || null,
  };
}

export function calculateBonesNightmaresLeaderboard(
  matches: Match[],
  players: Player[]
): OpponentNightmareRating[] {
  return calculateClubRatingLeaderboards(matches, players).bonesNightmares;
}
