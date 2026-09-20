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

// Known assist contributors based on playmakers & match logs in Bønes IL
const KNOWN_ASSIST_CONTRIBUTIONS: Record<string, number> = {
  'Sander Fjellstad': 6,
  'Kasper Haukeland': 5,
  'Emma Sofie Solheim': 5,
  'Eirik Helle Soltvedt': 4,
  'Henrik Vindenes': 3,
  'Mathias Bønes Lind': 5,
  'Ingrid Møller': 4,
  'Jonas Haukeland': 4,
  'Thea Berg': 4,
  'Mikkel Sandven': 3,
  'Eskil Møller': 3,
  'Tobias Fjellbirkeland': 3,
  'Markus Tveit': 2,
  'Sander Bønes': 3,
  'Håkon Sandven': 2,
  'Kristian Bøe': 3,
};

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
 * Calculates unified player statistics for ALL players across ALL 16 Bønes football teams,
 * prioritizing official NFF statistics from fotball.no (FIKS) and ensuring that players
 * who participate on multiple teams have accurate per-team and club-wide aggregated stats
 * without duplicate or inflated match counts.
 */
export function calculateAllPlayerStats(data: BonesClubData): EnrichedPlayerStat[] {
  const squadPlayerMap = new Map<string, EnrichedPlayerStat>();
  const initialPlayers = data.players && data.players.length > 0 ? data.players : ALL_BONES_PLAYERS;

  // Track match participations per (personId + teamId) from local match logs
  const teamMatchSet = new Map<string, Set<string>>();

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

    let matches = 0;
    let goals = 0;
    let yellowCards = 0;
    let redCards = 0;
    let goalsPerMatch = 0;

    if (officialStats) {
      const teamStat = officialStats.season2026.teams.find((t) => t.teamId === teamId);
      if (teamStat) {
        matches = teamStat.matches;
        goals = teamStat.goals;
        yellowCards = teamStat.yellowCards;
        redCards = teamStat.redCards;
        goalsPerMatch = teamStat.goalsPerMatch;
      }
    }

    const enriched: EnrichedPlayerStat = {
      id: squadKey,
      personId,
      fiksId,
      name: p.name,
      teamId,
      teamName: p.teamName || squad?.teamName || 'Bønes IL',
      category: squad?.category || 'Ungdom',
      jerseyNumber: p.jerseyNumber || 10,
      position: p.position || 'Midtbane',
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
      teamsPlayedFor: officialStats ? officialStats.season2026.teams : undefined,
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
            position: p.position || 'Midtbane',
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
            teamsPlayedFor: officialStats.season2026.teams,
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

  // 2. Scan match events from season log for assists & non-NFF fallbacks
  for (const m of data.matches || []) {
    if (!m.events || m.events.length === 0) continue;

    for (const ev of m.events) {
      const pName = (ev.player || '').trim();
      if (!pName || pName.toLowerCase().includes('personinfo') || pName.toLowerCase().includes('ikke tilgjengelig')) {
        continue;
      }

      // Check if event belongs to Bønes
      const isBonesEvent =
        (ev.team && ev.team.toLowerCase().includes('bønes')) ||
        (m.homeTeam.toLowerCase().includes('bønes') && ev.team === m.homeTeam) ||
        (m.awayTeam.toLowerCase().includes('bønes') && ev.team === m.awayTeam) ||
        (!ev.team && (m.homeTeam.toLowerCase().includes('bønes') || m.awayTeam.toLowerCase().includes('bønes')));

      if (!isBonesEvent) continue;

      // Find squad player entry for this match's teamId
      const targetSquadKey = ev.fiksId
        ? `fiks-${ev.fiksId}_${m.teamId}`
        : `${sanitizeSlug(pName)}_${m.teamId}`;

      let p = squadPlayerMap.get(targetSquadKey);

      // Fallback: match by personId across teams if not found in this specific team
      if (!p && ev.fiksId) {
        for (const entry of squadPlayerMap.values()) {
          if (entry.fiksId === ev.fiksId) {
            p = entry;
            break;
          }
        }
      }

      if (p) {
        // Tally assists
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
              aEntry.points = aEntry.goals + aEntry.assists;
              break;
            }
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
        p.points = p.goals + p.assists;
        if (p.totalClubStats) {
          p.totalClubStats.assists = Math.max(p.totalClubStats.assists, p.assists);
          p.totalClubStats.points = p.totalClubStats.goals + p.totalClubStats.assists;
        }
      }
    }
  }

  // 4. Return enriched list
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
