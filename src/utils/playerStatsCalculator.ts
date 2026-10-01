import { BonesClubData, Player, PlayerPosition, TopScorer, CardStatistic, Match } from '../types.js';
import { ALL_BONES_PLAYERS, ALL_BONES_SQUADS } from '../data/bonesSquads.js';
import {
  calculateTopScorers,
  calculateCardStatistics,
  getPlayerIdentity,
  sanitizeSlug,
} from './derivedStats.js';
import { getOfficialStatsForPlayer, OfficialPlayerTeamStats } from '../services/playerStatsApi.js';

export interface EnrichedPlayerStat {
  id: string; // Unique per squad registration: e.g. "fiks-3920386_j14-1"
  personId: string; // Unique per human person: e.g. "fiks-3920386"
  fiksId?: number;
  name: string;
  teamId: string;
  teamName: string;
  category: string;
  jerseyNumber: number;
  position: PlayerPosition;
  matches: number;
  goals: number;
  assists: number;
  points: number; // goals + assists
  yellowCards: number;
  redCards: number;
  goalsPerMatch: number;
  cardStatus: 'Klar' | 'Advarsel (1 fra soning)' | 'Karantene';
  isCaptain?: boolean;
  isMultiTeam?: boolean;
  teamsPlayedFor?: OfficialPlayerTeamStats[];
  totalClubStats?: {
    matches: number;
    goals: number;
    assists: number;
    points: number;
    yellowCards: number;
    redCards: number;
    goalsPerMatch: number;
  };
  isOfficialNff?: boolean;
}

// Known assist contributors based on verified match logs in Bønes IL
const KNOWN_ASSIST_CONTRIBUTIONS: Record<string, number> = {};

/**
 * Calculates the authoritative Top Scorers list purely from the season match log (`data.matches`).
 * Delegates directly to the pure derived stats calculation prioritizing FIKS ID.
 */
export function calculateTopScorersFromSeasonLog(
  data: BonesClubData,
  seasonFilter: 'all' | 'Vår' | 'Høst' = 'all',
  teamFilter: string = 'all'
): TopScorer[] {
  if (!data.matches || data.matches.length === 0) {
    return data.topScorers || [];
  }

  return calculateTopScorers(data.matches, data.players, {
    season: seasonFilter,
    teamId: teamFilter,
    bonesOnly: true,
  });
}

/**
 * Calculates the authoritative Cards & Disciplinary list purely from the season match log (`data.matches`).
 * Delegates directly to the pure derived stats calculation prioritizing FIKS ID.
 */
export function calculateCardsFromSeasonLog(
  data: BonesClubData,
  seasonFilter: 'all' | 'Vår' | 'Høst' = 'all',
  teamFilter: string = 'all'
): CardStatistic[] {
  if (!data.matches || data.matches.length === 0) {
    return data.cards || [];
  }

  return calculateCardStatistics(data.matches, data.players, {
    season: seasonFilter,
    teamId: teamFilter,
    bonesOnly: true,
  });
}

/**
 * Computes the authoritative cutoff date for a player's static official statistics snapshot.
 * Any match played after this date is a newly completed or live match that must increment stats.
 */
export function getOfficialCutoffDate(official?: any): string {
  if (official?.matches2026 && official.matches2026.length > 0) {
    const dates = official.matches2026.map((m: any) => {
      const parts = m.date.split('.');
      return parts.length === 2 ? `2026-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` : m.date;
    });
    dates.sort();
    return dates[dates.length - 1];
  }
  return official?.lastUpdated ? official.lastUpdated.slice(0, 10) : '2026-09-20';
}

/**
 * Calculates unified player statistics for ALL players across ALL 16 Bønes football teams,
 * prioritizing official NFF statistics from fotball.no (FIKS) while dynamically and authoritatively
 * incorporating the latest completed and live matches from data.matches.
 * Ensures that players who participate on multiple teams have accurate per-team and club-wide
 * aggregated stats without duplicate or inflated match counts.
 */
export function calculateAllPlayerStats(data: BonesClubData): EnrichedPlayerStat[] {
  const squadPlayerMap = new Map<string, EnrichedPlayerStat>();
  const initialPlayers = data.players && data.players.length > 0 ? data.players : ALL_BONES_PLAYERS;

  // 1. Initialize from squad rosters
  for (const p of initialPlayers) {
    const identity = getPlayerIdentity(p);
    const personId = identity.id;
    const teamId = p.teamId || 'menn-1';
    const squadKey = `${personId}_${teamId}`;
    const squad = ALL_BONES_SQUADS.find((s) => s.teamId === teamId);
    const fiksId = identity.isFiks
      ? p.fiksId || (identity.id.startsWith('fiks-') ? parseInt(identity.id.replace('fiks-', ''), 10) : undefined)
      : undefined;

    // Check if official NFF stats exist for this player
    const officialStats = getOfficialStatsForPlayer(fiksId);

    let matches = p.matches || 0;
    let goals = p.goals || 0;
    let yellowCards = p.yellowCards || 0;
    let redCards = p.redCards || 0;
    let goalsPerMatch = matches > 0 ? Number((goals / matches).toFixed(2)) : 0;

    if (officialStats) {
      const teamStat = officialStats.season2026.teams.find((t) => t.teamId === teamId);
      if (teamStat) {
        matches = teamStat.matches;
        goals = teamStat.goals;
        yellowCards = teamStat.yellowCards;
        redCards = teamStat.redCards;
        goalsPerMatch = teamStat.goalsPerMatch;
      } else if (officialStats.season2026.teams.length === 1 && matches === 0) {
        const singleTeam = officialStats.season2026.teams[0];
        matches = singleTeam.matches;
        goals = singleTeam.goals;
        yellowCards = singleTeam.yellowCards;
        redCards = singleTeam.redCards;
        goalsPerMatch = singleTeam.goalsPerMatch;
      }
    }

    const clonedTeams = officialStats?.season2026?.teams
      ? officialStats.season2026.teams.map((t) => ({ ...t }))
      : undefined;

    const enriched: EnrichedPlayerStat = {
      id: squadKey,
      personId,
      fiksId,
      name: p.name,
      teamId,
      teamName: p.teamName || squad?.teamName || 'Bønes IL',
      category: squad?.category || 'Ungdom',
      jerseyNumber: p.jerseyNumber || 10,
      position: (fiksId === 3862970 || p.name.toLowerCase().includes('emma bjelde cortez'))
        ? 'Keeper'
        : (fiksId === 4009621 || p.name.toLowerCase().includes('maja sadownik bruvik') || p.name.toLowerCase().includes('maja bruvik'))
        ? 'Forsvar'
        : (p.name.toLowerCase().includes('sunniva stavrum') || (goals >= 3 && p.position === 'Keeper'))
        ? 'Angrep'
        : (p.position || 'Midtbane'),
      matches,
      goals,
      assists: 0,
      points: goals,
      yellowCards,
      redCards,
      goalsPerMatch,
      cardStatus: redCards > 0 || yellowCards >= 4 ? 'Karantene' : yellowCards === 3 ? 'Advarsel (1 fra soning)' : 'Klar',
      isCaptain: p.role === 'Kaptein',
      isMultiTeam: officialStats ? officialStats.season2026.teams.length > 1 : false,
      teamsPlayedFor: clonedTeams,
      totalClubStats: officialStats
        ? {
            matches: officialStats.season2026.totalMatches,
            goals: officialStats.season2026.totalGoals,
            assists: 0,
            points: officialStats.season2026.totalGoals,
            yellowCards: officialStats.season2026.yellowCards,
            redCards: officialStats.season2026.redCards,
            goalsPerMatch: officialStats.season2026.goalsPerMatch,
          }
        : undefined,
      isOfficialNff: !!officialStats,
    };

    squadPlayerMap.set(squadKey, enriched);
  }

  // 1b. Also register any teams the player officially played for in 2026 that might not be in the initial squad
  for (const p of initialPlayers) {
    const identity = getPlayerIdentity(p);
    const personId = identity.id;
    const fiksId = identity.isFiks
      ? p.fiksId || (identity.id.startsWith('fiks-') ? parseInt(identity.id.replace('fiks-', ''), 10) : undefined)
      : undefined;

    const officialStats = getOfficialStatsForPlayer(fiksId);
    if (officialStats && officialStats.season2026.teams.length > 0) {
      for (const t of officialStats.season2026.teams) {
        const squadKey = `${personId}_${t.teamId}`;
        if (!squadPlayerMap.has(squadKey)) {
          const squad = ALL_BONES_SQUADS.find((s) => s.teamId === t.teamId);
          squadPlayerMap.set(squadKey, {
            id: squadKey,
            personId,
            fiksId,
            name: p.name,
            teamId: t.teamId,
            teamName: t.teamName || squad?.teamName || 'Bønes IL',
            category: squad?.category || (t.ageCategory.includes('Voksen') ? 'Senior' : 'Ungdom'),
            jerseyNumber: p.jerseyNumber || 10,
            position: (fiksId === 3862970 || p.name.toLowerCase().includes('emma bjelde cortez'))
              ? 'Keeper'
              : (fiksId === 4009621 || p.name.toLowerCase().includes('maja sadownik bruvik') || p.name.toLowerCase().includes('maja bruvik'))
              ? 'Forsvar'
              : (p.name.toLowerCase().includes('sunniva stavrum') || (t.goals >= 3 && p.position === 'Keeper'))
              ? 'Angrep'
              : (p.position || 'Midtbane'),
            matches: t.matches,
            goals: t.goals,
            assists: 0,
            points: t.goals,
            yellowCards: t.yellowCards,
            redCards: t.redCards,
            goalsPerMatch: t.goalsPerMatch,
            cardStatus: t.redCards > 0 || t.yellowCards >= 4 ? 'Karantene' : t.yellowCards === 3 ? 'Advarsel (1 fra soning)' : 'Klar',
            isCaptain: false,
            isMultiTeam: true,
            teamsPlayedFor: officialStats.season2026.teams.map((tm) => ({ ...tm })),
            totalClubStats: {
              matches: officialStats.season2026.totalMatches,
              goals: officialStats.season2026.totalGoals,
              assists: 0,
              points: officialStats.season2026.totalGoals,
              yellowCards: officialStats.season2026.yellowCards,
              redCards: officialStats.season2026.redCards,
              goalsPerMatch: officialStats.season2026.goalsPerMatch,
            },
            isOfficialNff: true,
          });
        }
      }
    }
  }

  // 2. Scan finished and live matches to dynamically include the latest matches, goals and cards
  const processedPlayerMatches = new Set<string>(); // key: `${personId}_${matchId}`

  for (const m of data.matches || []) {
    // Only count completed or active live matches
    if (m.status !== 'finished' && (m.status as string) !== 'live') continue;

    const matchFiksId = m.fiksId || (m.id ? parseInt(m.id.replace('nff-', ''), 10) : undefined);

    // Identify all match participants for Bønes
    const matchLineup = [
      ...(m.lineup?.starters || []),
      ...(m.lineup?.bench || []),
      ...(m.lineup?.subs || []),
      ...(m.homeLineup?.starters || []),
      ...(m.homeLineup?.bench || []),
      ...(m.homeLineup?.subs || []),
      ...(m.awayLineup?.starters || []),
      ...(m.awayLineup?.bench || []),
      ...(m.awayLineup?.subs || []),
    ];

    const potmCandidates = m.playerOfTheMatch?.candidates || [];

    const bonesEvents = (m.events || []).filter((ev) => {
      const pName = (ev.player || '').trim();
      if (!pName || pName.toLowerCase().includes('personinfo') || pName.toLowerCase().includes('ikke tilgjengelig')) {
        return false;
      }
      return (
        (ev.team && ev.team.toLowerCase().includes('bønes')) ||
        (m.homeTeam.toLowerCase().includes('bønes') && ev.team === m.homeTeam) ||
        (m.awayTeam.toLowerCase().includes('bønes') && ev.team === m.awayTeam) ||
        (!ev.team && (m.homeTeam.toLowerCase().includes('bønes') || m.awayTeam.toLowerCase().includes('bønes')))
      );
    });

    // Map unique participants in this match
    const participantsMap = new Map<string, { fiksId?: number; name: string }>();

    for (const lp of matchLineup) {
      const pName = (lp.name || '').trim();
      if (!pName || pName.toLowerCase().includes('personinfo')) continue;
      const key = lp.fiksId ? `fiks-${lp.fiksId}` : sanitizeSlug(pName);
      if (!participantsMap.has(key)) {
        participantsMap.set(key, { fiksId: lp.fiksId, name: pName });
      }
    }

    for (const c of potmCandidates) {
      const pName = (c.playerName || '').trim();
      if (!pName || pName.toLowerCase().includes('personinfo')) continue;
      const key = c.fiksId ? `fiks-${c.fiksId}` : sanitizeSlug(pName);
      if (!participantsMap.has(key)) {
        participantsMap.set(key, { fiksId: c.fiksId, name: pName });
      }
    }

    for (const ev of bonesEvents) {
      const pName = (ev.player || '').trim();
      if (pName && !pName.toLowerCase().includes('personinfo')) {
        const key = ev.fiksId ? `fiks-${ev.fiksId}` : sanitizeSlug(pName);
        if (!participantsMap.has(key)) {
          participantsMap.set(key, { fiksId: ev.fiksId, name: pName });
        }
      }
      const subIn = (ev.subInPlayer || '').trim();
      if (subIn && !subIn.toLowerCase().includes('personinfo')) {
        const key = sanitizeSlug(subIn);
        if (!participantsMap.has(key)) {
          participantsMap.set(key, { name: subIn });
        }
      }
    }

    // Now update participant stats for newly finished or live matches
    for (const [, partInfo] of participantsMap.entries()) {
      const targetSquadKey = partInfo.fiksId
        ? `fiks-${partInfo.fiksId}_${m.teamId}`
        : `${sanitizeSlug(partInfo.name)}_${m.teamId}`;

      let p = squadPlayerMap.get(targetSquadKey);

      // Fallback: match by fiksId or name across teams
      if (!p) {
        for (const entry of squadPlayerMap.values()) {
          if (
            (partInfo.fiksId && entry.fiksId === partInfo.fiksId) ||
            entry.name.toLowerCase() === partInfo.name.toLowerCase()
          ) {
            p = entry;
            break;
          }
        }
      }

      if (!p) continue;

      const playerMatchKey = `${p.personId}_${m.id}`;
      if (processedPlayerMatches.has(playerMatchKey)) continue;
      processedPlayerMatches.add(playerMatchKey);

      // Check if this match was already part of the player's official stats baseline
      const official = getOfficialStatsForPlayer(p.fiksId);
      let isOfficialBaselineMatch = false;
      if (official && official.season2026) {
        const cutoff = getOfficialCutoffDate(official);
        isOfficialBaselineMatch = m.date <= cutoff;
      }

      // If NOT in official baseline (e.g. newly finished match, latest match, or non-official player):
      if (!isOfficialBaselineMatch) {
        p.matches += 1;
        if (p.totalClubStats) {
          p.totalClubStats.matches += 1;
        }

        // Tally events for this player in this new match
        const playerEvents = bonesEvents.filter((ev) => {
          if (partInfo.fiksId && ev.fiksId) return ev.fiksId === partInfo.fiksId;
          return ev.player && ev.player.trim().toLowerCase() === partInfo.name.toLowerCase();
        });

        const newGoals = playerEvents.filter((e) => e.type === 'goal').length;
        const newYellow = playerEvents.filter((e) => e.type === 'yellow_card').length;
        const newRed = playerEvents.filter((e) => e.type === 'red_card').length;

        p.goals += newGoals;
        p.yellowCards += newYellow;
        p.redCards += newRed;

        if (p.totalClubStats) {
          p.totalClubStats.goals += newGoals;
          p.totalClubStats.yellowCards += newYellow;
          p.totalClubStats.redCards += newRed;
        }

        // Update teamsPlayedFor
        if (p.teamsPlayedFor) {
          let teamEntry = p.teamsPlayedFor.find((t) => t.teamId === m.teamId);
          if (!teamEntry) {
            const squad = ALL_BONES_SQUADS.find((s) => s.teamId === m.teamId);
            teamEntry = {
              teamId: m.teamId,
              teamName: m.teamName || squad?.teamName || 'Bønes IL',
              ageCategory: squad?.category || 'Ungdom',
              matches: 0,
              goals: 0,
              goalsPerMatch: 0,
              yellowCards: 0,
              redCards: 0,
            };
            p.teamsPlayedFor.push(teamEntry);
            p.isMultiTeam = p.teamsPlayedFor.length > 1;
          }
          teamEntry.matches += 1;
          teamEntry.goals += newGoals;
          teamEntry.yellowCards += newYellow;
          teamEntry.redCards += newRed;
          teamEntry.goalsPerMatch = teamEntry.matches > 0 ? Number((teamEntry.goals / teamEntry.matches).toFixed(2)) : 0;
        }
      }
    }

    // Assists scanning from match events
    for (const ev of bonesEvents) {
      let assistName: string | null = null;
      let assistFiksId = ev.assistFiksId;
      if (ev.assistPlayer) {
        assistName = ev.assistPlayer.trim();
      } else if (ev.description) {
        const descLower = ev.description.toLowerCase();
        if (descLower.includes('målgivende:') || descLower.includes('assist:') || descLower.includes('innlegg fra')) {
          const matchRegex = ev.description.match(/(?:målgivende|assist|innlegg fra)\s*:?\s*([A-ZÆØÅa-zæøå\s]+)/i);
          if (matchRegex && matchRegex[1]) {
            assistName = matchRegex[1].trim();
          }
        }
      }

      if (assistName || assistFiksId) {
        for (const aEntry of squadPlayerMap.values()) {
          if (
            (assistFiksId && aEntry.fiksId === assistFiksId && aEntry.teamId === m.teamId) ||
            (assistName && aEntry.name.toLowerCase() === assistName.toLowerCase() && aEntry.teamId === m.teamId)
          ) {
            aEntry.assists += 1;
            break;
          }
        }
      }
    }
  }

  // 3. Integrate known assist playmakers
  for (const [name, defaultAssists] of Object.entries(KNOWN_ASSIST_CONTRIBUTIONS)) {
    for (const p of squadPlayerMap.values()) {
      if (p.name.toLowerCase() === name.toLowerCase()) {
        p.assists = Math.max(p.assists, defaultAssists);
      }
    }
  }

  // 4. Synchronize totalClubStats for multi-team players and finalize calculated metrics
  const personClubStatsMap = new Map<string, { matches: number; goals: number; assists: number; yellowCards: number; redCards: number }>();
  for (const p of squadPlayerMap.values()) {
    const existing = personClubStatsMap.get(p.personId);
    if (!existing) {
      personClubStatsMap.set(p.personId, {
        matches: p.totalClubStats?.matches ?? p.matches,
        goals: p.totalClubStats?.goals ?? p.goals,
        assists: p.totalClubStats?.assists ?? p.assists,
        yellowCards: p.totalClubStats?.yellowCards ?? p.yellowCards,
        redCards: p.totalClubStats?.redCards ?? p.redCards,
      });
    } else {
      if (!p.isOfficialNff) {
        existing.matches += p.matches;
        existing.goals += p.goals;
        existing.assists += p.assists;
        existing.yellowCards += p.yellowCards;
        existing.redCards += p.redCards;
      } else {
        existing.matches = Math.max(existing.matches, p.totalClubStats?.matches ?? p.matches);
        existing.goals = Math.max(existing.goals, p.totalClubStats?.goals ?? p.goals);
        existing.assists = Math.max(existing.assists, p.totalClubStats?.assists ?? p.assists);
        existing.yellowCards = Math.max(existing.yellowCards, p.totalClubStats?.yellowCards ?? p.yellowCards);
        existing.redCards = Math.max(existing.redCards, p.totalClubStats?.redCards ?? p.redCards);
      }
    }
  }

  for (const p of squadPlayerMap.values()) {
    p.points = p.goals + p.assists;
    p.goalsPerMatch = p.matches > 0 ? Number((p.goals / p.matches).toFixed(2)) : 0;
    p.cardStatus = p.redCards > 0 || p.yellowCards >= 4 ? 'Karantene' : p.yellowCards === 3 ? 'Advarsel (1 fra soning)' : 'Klar';

    const club = personClubStatsMap.get(p.personId);
    if (club) {
      const pts = club.goals + club.assists;
      const gpm = club.matches > 0 ? Number((club.goals / club.matches).toFixed(2)) : 0;
      p.totalClubStats = {
        matches: club.matches,
        goals: club.goals,
        assists: club.assists,
        points: pts,
        yellowCards: club.yellowCards,
        redCards: club.redCards,
        goalsPerMatch: gpm,
      };
    }
  }

  // 5. Return enriched list
  return Array.from(squadPlayerMap.values());
}

/**
 * Aggregates player stats across the ENTIRE club so each human player appears
 * exactly ONCE with their true total matches, total goals, and multi-team representation badges.
 */
export function calculateAggregatedClubPlayerStats(squadPlayers: EnrichedPlayerStat[]): EnrichedPlayerStat[] {
  const aggregatedMap = new Map<string, EnrichedPlayerStat>();

  for (const p of squadPlayers) {
    const key = p.personId;
    const existing = aggregatedMap.get(key);

    if (!existing) {
      // First time encountering this player
      const clone: EnrichedPlayerStat = {
        ...p,
        id: p.personId,
        matches: p.totalClubStats?.matches ?? p.matches,
        goals: p.totalClubStats?.goals ?? p.goals,
        assists: p.totalClubStats?.assists ?? p.assists,
        points: p.totalClubStats?.points ?? (p.goals + p.assists),
        yellowCards: p.totalClubStats?.yellowCards ?? p.yellowCards,
        redCards: p.totalClubStats?.redCards ?? p.redCards,
        goalsPerMatch: p.totalClubStats?.goalsPerMatch ?? (p.matches > 0 ? Number((p.goals / p.matches).toFixed(2)) : 0),
      };
      aggregatedMap.set(key, clone);
    } else {
      // Merge if not using official totalClubStats
      if (!existing.totalClubStats) {
        existing.matches += p.matches;
        existing.goals += p.goals;
        existing.assists += p.assists;
        existing.points = existing.goals + existing.assists;
        existing.yellowCards += p.yellowCards;
        existing.redCards += p.redCards;
        existing.goalsPerMatch = existing.matches > 0 ? Number((existing.goals / existing.matches).toFixed(2)) : 0;
      }
      // Combine teamsPlayedFor
      if (p.teamsPlayedFor && (!existing.teamsPlayedFor || existing.teamsPlayedFor.length < p.teamsPlayedFor.length)) {
        existing.teamsPlayedFor = p.teamsPlayedFor;
        existing.isMultiTeam = p.teamsPlayedFor.length > 1;
      }
    }
  }

  // Format display team name for multi-team players
  return Array.from(aggregatedMap.values()).map((p) => {
    if (p.teamsPlayedFor && p.teamsPlayedFor.length > 1) {
      p.isMultiTeam = true;
      const teamNames = p.teamsPlayedFor.map((t) => t.teamName.replace('Bønes ', '')).join(', ');
      p.teamName = `Flere lag (${teamNames})`;
    }
    return p;
  });
}

/**
 * Forces a complete re-calculation of all player data, top scorers, and card statistics
 * immediately after a match has changed status to 'finished' or when a new match data bundle is fetched.
 */
export function recalculateAllPlayerData(
  data: BonesClubData,
  options?: {
    finishedMatchId?: string;
    reason?: 'match_finished' | 'data_fetched' | 'manual';
  }
): BonesClubData {
  if (!data) return data;

  // 1. Calculate enriched stats for every squad player
  const enrichedSquadPlayers = calculateAllPlayerStats(data);

  // 2. Map enriched squad players into Player[] for data.players
  const updatedPlayers: Player[] = enrichedSquadPlayers.map((esp) => ({
    id: esp.id,
    fiksId: esp.fiksId,
    name: esp.name,
    teamId: esp.teamId,
    teamName: esp.teamName,
    jerseyNumber: esp.jerseyNumber,
    position: esp.position,
    matches: esp.matches,
    goals: esp.goals,
    assists: esp.assists,
    yellowCards: esp.yellowCards,
    redCards: esp.redCards,
    role: esp.isCaptain ? 'Kaptein' : undefined,
  }));

  // 3. Recalculate authoritative Top Scorers and Cards from the season log
  const nextData: BonesClubData = {
    ...data,
    players: updatedPlayers,
  };

  const nextTopScorers = calculateTopScorersFromSeasonLog(nextData);
  const nextCards = calculateCardsFromSeasonLog(nextData);

  return {
    ...nextData,
    topScorers: nextTopScorers,
    cards: nextCards,
    dataVersion: (data.dataVersion || 1) + 1,
    lastDiskSaved: new Date().toISOString(),
  };
}

export const forceRecalculatePlayerData = recalculateAllPlayerData;

export function onMatchStatusChangedToFinished(data: BonesClubData, matchId?: string): BonesClubData {
  return recalculateAllPlayerData(data, { finishedMatchId: matchId, reason: 'match_finished' });
}

export function onNewMatchDataFetched(data: BonesClubData): BonesClubData {
  return recalculateAllPlayerData(data, { reason: 'data_fetched' });
}

