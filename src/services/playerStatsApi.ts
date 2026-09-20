import OFFICIAL_STATS_RAW from '../data/officialNffPlayerStats.json';

export interface OfficialPlayerTeamStats {
  teamId: string;
  teamName: string;
  nffTeamId?: number;
  ageCategory: string;
  matches: number;
  goals: number;
  goalsPerMatch: number;
  yellowCards: number;
  redCards: number;
}

export interface OfficialPlayerSeasonRow {
  season: string;
  teamName: string;
  teamId?: string;
  nffTeamId?: number;
  ageCategory: string;
  matches: number;
  goals: number;
  goalsPerMatch: number;
  yellowCards: number;
  redCards: number;
}

export interface OfficialPlayerTournamentRow {
  tournament: string;
  teamInfo: string;
  matches: number;
  goals: number;
  goalsPerMatch: number;
  yellowCards: number;
  redCards: number;
}

export interface OfficialPlayerMatchItem {
  date: string;
  tournament: string;
  match: string;
  result: string;
  venue: string;
  matchFiksId?: number;
  teamId?: string;
}

export interface OfficialNffPlayerStats {
  fiksId: number;
  name: string;
  lastUpdated: string;
  isOfficial: boolean;
  career: {
    matchesYouth: number;
    matchesAdult: number;
    totalMatches: number;
    goalsYouth: number;
    goalsAdult: number;
    totalGoals: number;
    goalsAverage: number;
    yellowCards: number;
    redCards: number;
  };
  season2026: {
    totalMatches: number;
    totalGoals: number;
    goalsPerMatch: number;
    yellowCards: number;
    redCards: number;
    teams: OfficialPlayerTeamStats[];
  };
  seasons: OfficialPlayerSeasonRow[];
  tournaments: OfficialPlayerTournamentRow[];
  matches2026?: OfficialPlayerMatchItem[];
}

// In-memory registry initialized from static bundle
const memoryCache: Record<number, OfficialNffPlayerStats> = {
  ...(OFFICIAL_STATS_RAW as Record<string, OfficialNffPlayerStats>),
};

/**
 * Synchronous lookup of official NFF stats by FIKS ID
 */
export function getOfficialStatsForPlayer(fiksId?: number | null): OfficialNffPlayerStats | null {
  if (!fiksId) return null;
  return memoryCache[fiksId] || null;
}

/**
 * Gets team breakdown for a player in 2026
 */
export function getTeamBreakdownForPlayer(fiksId?: number | null): OfficialPlayerTeamStats[] {
  const stats = getOfficialStatsForPlayer(fiksId);
  return stats?.season2026?.teams || [];
}

/**
 * Returns all cached official stats
 */
export function getAllOfficialStats(): Record<number, OfficialNffPlayerStats> {
  return memoryCache;
}

/**
 * Fetches latest official stats from server API or scrapes live from fotball.no
 */
export async function fetchOfficialPlayerStats(
  fiksId: number,
  force: boolean = false
): Promise<OfficialNffPlayerStats | null> {
  try {
    const url = `/api/bones/player/${fiksId}/nff-stats${force ? '?force=true' : ''}`;
    const res = await fetch(url);
    if (!res.ok) return memoryCache[fiksId] || null;
    const data = await res.json();
    if (data.success && data.stats) {
      memoryCache[fiksId] = data.stats;
      return data.stats;
    }
  } catch (err) {
    console.warn('[PlayerStatsApi] Failed to fetch live stats, using cached:', err);
  }
  return memoryCache[fiksId] || null;
}

/**
 * Forces a live refresh directly from fotball.no
 */
export async function refreshPlayerStats(fiksId: number): Promise<OfficialNffPlayerStats | null> {
  try {
    const res = await fetch(`/api/bones/player/${fiksId}/nff-stats/refresh`, { method: 'POST' });
    if (!res.ok) return memoryCache[fiksId] || null;
    const data = await res.json();
    if (data.success && data.stats) {
      memoryCache[fiksId] = data.stats;
      return data.stats;
    }
  } catch (err) {
    console.warn('[PlayerStatsApi] Failed to refresh live stats:', err);
  }
  return memoryCache[fiksId] || null;
}

/**
 * Triggers full sync of all player stats from NFF fotball.no
 */
export async function syncPlayerStatsFromNff(): Promise<{ success: boolean; syncedPlayers?: number }> {
  try {
    const res = await fetch('/api/bones/players/nff-stats/sync', { method: 'POST' });
    const json = await res.json();
    return json;
  } catch (err) {
    console.warn('[PlayerStatsApi] Failed to trigger full sync:', err);
    return { success: false };
  }
}
