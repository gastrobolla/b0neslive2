import { BonesClubData, Player, PlayerPosition, TopScorer, CardStatistic, Match } from '../types.js';
import { ALL_BONES_PLAYERS, ALL_BONES_SQUADS } from '../data/bonesSquads.js';
import {
  calculateTopScorers,
  calculateCardStatistics,
  getPlayerIdentity,
  sanitizeSlug,
} from './derivedStats.js';

export interface EnrichedPlayerStat {
  id: string;
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
 * prioritizing FIKS ID for identity, lineup participation, and event attribution.
 */
export function calculateAllPlayerStats(data: BonesClubData): EnrichedPlayerStat[] {
  const playerMap = new Map<string, EnrichedPlayerStat>();
  const fiksLookup = new Map<number, EnrichedPlayerStat>();
  const nameLookup = new Map<string, EnrichedPlayerStat>();

  // Helper to register player in maps
  const registerPlayer = (p: EnrichedPlayerStat) => {
    playerMap.set(p.id, p);
    if (p.fiksId) {
      fiksLookup.set(p.fiksId, p);
    }
    nameLookup.set(`${sanitizeSlug(p.name)}_${sanitizeSlug(p.teamId)}`, p);
  };

  // 1. Initialize from all known Bønes players from squads
  const initialPlayers = data.players && data.players.length > 0 ? data.players : ALL_BONES_PLAYERS;
  for (const p of initialPlayers) {
    const identity = getPlayerIdentity(p);
    const squad = ALL_BONES_SQUADS.find((s) => s.teamId === p.teamId);

    const enriched: EnrichedPlayerStat = {
      id: identity.id,
      fiksId: identity.isFiks ? p.fiksId || (identity.id.startsWith('fiks-') ? parseInt(identity.id.replace('fiks-', ''), 10) : undefined) : undefined,
      name: p.name,
      teamId: p.teamId || 'menn-1',
      teamName: p.teamName || squad?.teamName || 'Bønes IL',
      category: squad?.category || 'Ungdom',
      jerseyNumber: p.jerseyNumber || 10,
      position: p.position || 'Midtbane',
      matches: 0,
      goals: 0,
      assists: 0,
      points: 0,
      yellowCards: 0,
      redCards: 0,
      goalsPerMatch: 0,
      cardStatus: 'Klar',
      isCaptain: p.role === 'Kaptein',
    };
    registerPlayer(enriched);
  }

  // Set of matches played per player identity
  const playerMatchesMap = new Map<string, Set<string>>();

  // Find player helper: FIKS ID first, legacy name+team fallback
  const findPlayer = (fiksId?: number, playerId?: string, name?: string, teamId?: string): EnrichedPlayerStat | undefined => {
    if (fiksId && fiksLookup.has(fiksId)) {
      return fiksLookup.get(fiksId);
    }
    if (playerId?.startsWith('fiks-')) {
      const fid = parseInt(playerId.replace('fiks-', ''), 10);
      if (fid && fiksLookup.has(fid)) return fiksLookup.get(fid);
    }
    if (playerId && playerMap.has(playerId)) {
      return playerMap.get(playerId);
    }
    if (name) {
      const key = `${sanitizeSlug(name)}_${sanitizeSlug(teamId || 'bones')}`;
      if (nameLookup.has(key)) return nameLookup.get(key);
      // Try matching by name only across teams
      for (const [k, p] of nameLookup.entries()) {
        if (k.startsWith(sanitizeSlug(name))) return p;
      }
    }
    return undefined;
  };

  // 2. Scan every match and event directly from season log (data.matches)
  for (const m of data.matches || []) {
    // Check lineups if available
    if (m.lineup) {
      const allLineupPlayers = [
        ...(m.lineup.starters || []),
        ...(m.lineup.bench || []),
        ...(m.homeLineup?.starters || []),
        ...(m.awayLineup?.starters || []),
      ];
      for (const lp of allLineupPlayers) {
        const p = findPlayer(lp.fiksId, lp.id, lp.name, m.teamId);
        if (p) {
          let set = playerMatchesMap.get(p.id);
          if (!set) {
            set = new Set();
            playerMatchesMap.set(p.id, set);
          }
          set.add(m.id);
        }
      }
    }

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

      let p = findPlayer(ev.fiksId, ev.playerId, pName, m.teamId);

      // If not yet in map, create new entry with deterministic identity
      if (!p) {
        const identity = getPlayerIdentity({
          fiksId: ev.fiksId,
          playerId: ev.playerId,
          name: pName,
          teamId: m.teamId,
        });

        p = {
          id: identity.id,
          fiksId: identity.isFiks ? ev.fiksId : undefined,
          name: pName,
          teamId: m.teamId,
          teamName: m.teamName,
          category: 'Senior',
          jerseyNumber: 10,
          position: 'Angrep',
          matches: 0,
          goals: 0,
          assists: 0,
          points: 0,
          yellowCards: 0,
          redCards: 0,
          goalsPerMatch: 0,
          cardStatus: 'Klar',
        };
        registerPlayer(p);
      }

      // Track match participation
      let matchSet = playerMatchesMap.get(p.id);
      if (!matchSet) {
        matchSet = new Set();
        playerMatchesMap.set(p.id, matchSet);
      }
      matchSet.add(m.id);

      // Tally goals
      if (ev.type === 'goal') {
        p.goals += 1;
      }

      // Tally cards
      if (ev.type === 'yellow_card') {
        p.yellowCards += 1;
      } else if (ev.type === 'red_card') {
        p.redCards += 1;
      }

      // Tally assists from event
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
        const assistPlayer = findPlayer(assistFiksId, ev.assistPlayerId, assistName || undefined, m.teamId);
        if (assistPlayer) {
          assistPlayer.assists += 1;
          let aSet = playerMatchesMap.get(assistPlayer.id);
          if (!aSet) {
            aSet = new Set();
            playerMatchesMap.set(assistPlayer.id, aSet);
          }
          aSet.add(m.id);
        }
      }
    }
  }

  // 3. Integrate known assist playmakers
  for (const [name, defaultAssists] of Object.entries(KNOWN_ASSIST_CONTRIBUTIONS)) {
    const p = findPlayer(undefined, undefined, name);
    if (p) {
      p.assists = Math.max(p.assists, defaultAssists);
    }
  }

  // 4. Merge match counts and derive final metrics
  const resultList = Array.from(playerMap.values()).map((p) => {
    const loggedMatches = playerMatchesMap.get(p.id)?.size || 0;

    if (loggedMatches > 0) {
      p.matches = loggedMatches;
    } else if (p.goals > 0 || p.assists > 0 || p.yellowCards > 0) {
      p.matches = Math.max(1, p.goals);
    } else {
      p.matches = 0;
    }

    p.points = p.goals + p.assists;
    p.goalsPerMatch = p.matches > 0 ? Number((p.goals / p.matches).toFixed(2)) : 0;

    if (p.redCards > 0 || p.yellowCards >= 4) {
      p.cardStatus = 'Karantene';
    } else if (p.yellowCards === 3) {
      p.cardStatus = 'Advarsel (1 fra soning)';
    } else {
      p.cardStatus = 'Klar';
    }

    return p;
  });

  return resultList;
}
