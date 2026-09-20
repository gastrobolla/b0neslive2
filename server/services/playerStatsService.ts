import fs from 'fs';
import path from 'path';
import { BONES_16_TEAMS, decodeEntities } from '../bonesScraper.js';

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
  statType?: string;
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

const CACHE_FILE = path.join(process.cwd(), 'data', 'official_nff_player_stats.json');

// Map NFF team IDs to our internal team IDs
const NFF_TEAM_TO_INTERNAL: Record<number, { teamId: string; name: string }> = {
  173951: { teamId: 'g13-1', name: 'Bønes G13-1' },
  202088: { teamId: 'g13-2', name: 'Bønes G13-2' },
  21260:  { teamId: 'g13-3', name: 'Bønes G13-3' },
  20472:  { teamId: 'g14-1', name: 'Bønes G14-1' },
  19387:  { teamId: 'g14-2', name: 'Bønes G14-2' },
  19685:  { teamId: 'g16-1', name: 'Bønes G16-1' },
  155163: { teamId: 'g16-2', name: 'Bønes G16-2' },
  18891:  { teamId: 'g16-3', name: 'Bønes G16-3' },
  780:    { teamId: 'g19-1', name: 'Bønes G19-1' },
  161152: { teamId: 'g19-2', name: 'Bønes G19-2' },
  158325: { teamId: 'j13-1', name: 'Bønes J13-1' },
  190457: { teamId: 'j13-2', name: 'Bønes J13-2' },
  126114: { teamId: 'j14-1', name: 'Bønes J14-1' },
  19687:  { teamId: 'j16-1', name: 'Bønes J16-1' },
  31808:  { teamId: 'bones-1', name: 'Bønes 1 (Old girls)' },
  153650: { teamId: 'menn-1', name: 'Bønes Menn 1' },
  164915: { teamId: 'menn-1', name: 'Bønes 2 Voksen' },
};

// In-memory cache
let memoryCache: Record<number, OfficialNffPlayerStats> | null = null;

function loadCache(): Record<number, OfficialNffPlayerStats> {
  if (memoryCache) return memoryCache;
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf8');
      memoryCache = JSON.parse(raw);
      return memoryCache || {};
    }
  } catch (err) {
    console.warn('[PlayerStatsService] Failed to load cache file:', (err as Error).message);
  }
  memoryCache = {};
  return memoryCache;
}

function saveCache(cache: Record<number, OfficialNffPlayerStats>) {
  memoryCache = cache;
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch (err) {
    console.warn('[PlayerStatsService] Failed to write cache file:', (err as Error).message);
  }
}

/**
 * Scrapes official stats from fotball.no for a single player by FIKS ID
 */
export async function scrapeOfficialPlayerStats(
  fiksId: number,
  includeMatches: boolean = true
): Promise<OfficialNffPlayerStats | null> {
  const url = `https://www.fotball.no/fotballdata/person/profil/?fiksId=${fiksId}&underside=statistikk`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'no,nb;q=0.9,nn;q=0.8,en;q=0.7',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[PlayerStatsService] fotball.no returned status ${res.status} for fiksId ${fiksId}`);
      return null;
    }

    const html = await res.text();

    // 1. Extract Player Name
    let name = '';
    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i) || html.match(/property="og:title"\s+content="([\s\S]*?)"/i);
    if (titleMatch) {
      name = decodeEntities(titleMatch[1]).replace(/\s*-\s*Profil[\s\S]*/i, '').trim();
    }

    // 2. Extract Career Summary (Tables 0, 1, 2)
    let matchesYouth = 0;
    let matchesAdult = 0;
    let totalGoals = 0;
    let goalsYouth = 0;
    let goalsAdult = 0;
    let goalsAverage = 0;
    let yellowCards = 0;
    let redCards = 0;

    const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)].map((m) => m[0]);

    if (tables.length > 0) {
      const t0Text = tables[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const mYouthMatch = t0Text.match(/Ungdom\s+(\d+)/i);
      const mAdultMatch = t0Text.match(/Voksen\s+(\d+)/i);
      if (mYouthMatch) matchesYouth = parseInt(mYouthMatch[1], 10) || 0;
      if (mAdultMatch) matchesAdult = parseInt(mAdultMatch[1], 10) || 0;
    }

    if (tables.length > 1) {
      const t1Text = tables[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const gYouthMatch = t1Text.match(/Ungdom\s+(\d+)\s+([\d,.]+)/i);
      const gAdultMatch = t1Text.match(/Voksen\s+(\d+)\s+([\d,.]+)/i);
      if (gYouthMatch) {
        goalsYouth = parseInt(gYouthMatch[1], 10) || 0;
        goalsAverage = parseFloat(gYouthMatch[2].replace(',', '.')) || 0;
      }
      if (gAdultMatch) {
        goalsAdult = parseInt(gAdultMatch[1], 10) || 0;
      }
      totalGoals = goalsYouth + goalsAdult;
    }

    // 3. Extract Table 3: Season by Season, Team by Team
    const seasons: OfficialPlayerSeasonRow[] = [];
    const table3Match = html.match(/<table data-colspan="8">[\s\S]*?<\/table>/i);
    if (table3Match) {
      const rows = [...table3Match[0].matchAll(/<tr>[\s\S]*?<\/tr>/gi)].slice(1);
      for (const r of rows) {
        const rowHtml = r[0];
        const teamIdAttr = rowHtml.match(/data-team-id="(\d+)"/i);
        const nffTeamId = teamIdAttr ? parseInt(teamIdAttr[1], 10) : undefined;
        const internalTeam = nffTeamId ? NFF_TEAM_TO_INTERNAL[nffTeamId] : undefined;

        const cells = [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
          decodeEntities(c[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
        );

        if (cells.length >= 8) {
          seasons.push({
            season: cells[0],
            teamName: cells[1],
            teamId: internalTeam?.teamId,
            nffTeamId,
            ageCategory: cells[2],
            matches: parseInt(cells[3], 10) || 0,
            goals: parseInt(cells[4], 10) || 0,
            goalsPerMatch: parseFloat(cells[5].replace(',', '.')) || 0,
            yellowCards: parseInt(cells[6], 10) || 0,
            redCards: parseInt(cells[7], 10) || 0,
          });
        }
      }
    }

    // 4. Extract Table 4: Tournaments
    const tournaments: OfficialPlayerTournamentRow[] = [];
    const table4Match = html.match(/<th title="Turneringskategori">Turneringskategori<\/th>[\s\S]*?<\/table>/i);
    if (table4Match) {
      const fullTable = '<table ' + table4Match[0];
      const rows = [...fullTable.matchAll(/<tr>[\s\S]*?<\/tr>/gi)].slice(1);
      for (const r of rows) {
        const cells = [...r[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
          decodeEntities(c[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
        );
        if (cells.length >= 7) {
          tournaments.push({
            tournament: cells[0],
            teamInfo: cells[1],
            matches: parseInt(cells[2], 10) || 0,
            goals: parseInt(cells[3], 10) || 0,
            goalsPerMatch: parseFloat(cells[4].replace(',', '.')) || 0,
            yellowCards: parseInt(cells[5], 10) || 0,
            redCards: parseInt(cells[6], 10) || 0,
          });
        }
      }
    }

    // 5. Aggregate 2026 Season Stats
    const rows2026 = seasons.filter((s) => s.season.includes('2026'));
    const teams2026: OfficialPlayerTeamStats[] = [];

    let totalMatches2026 = 0;
    let totalGoals2026 = 0;
    let yellowCards2026 = 0;
    let redCards2026 = 0;

    for (const r of rows2026) {
      totalMatches2026 += r.matches;
      totalGoals2026 += r.goals;
      yellowCards2026 += r.yellowCards;
      redCards2026 += r.redCards;

      teams2026.push({
        teamId: r.teamId || `nff-${r.nffTeamId || 'unknown'}`,
        teamName: r.teamId && NFF_TEAM_TO_INTERNAL[r.nffTeamId || 0] ? NFF_TEAM_TO_INTERNAL[r.nffTeamId || 0].name : r.teamName,
        nffTeamId: r.nffTeamId,
        ageCategory: r.ageCategory,
        matches: r.matches,
        goals: r.goals,
        goalsPerMatch: r.goalsPerMatch,
        yellowCards: r.yellowCards,
        redCards: r.redCards,
      });
    }

    const goalsPerMatch2026 = totalMatches2026 > 0 ? Number((totalGoals2026 / totalMatches2026).toFixed(2)) : 0;

    // 6. Optionally fetch 2026 match logs for each team
    let matches2026: OfficialPlayerMatchItem[] = [];
    if (includeMatches && rows2026.length > 0) {
      for (const r of rows2026) {
        if (!r.nffTeamId) continue;
        try {
          const mList = await fetchPlayerMatchesFromNff(fiksId, r.nffTeamId, '110', r.teamId);
          matches2026.push(...mList);
        } catch {
          // Non-blocking
        }
      }
      // Deduplicate matches by matchFiksId
      const seenFiks = new Set<number>();
      matches2026 = matches2026.filter((m) => {
        if (m.matchFiksId && seenFiks.has(m.matchFiksId)) return false;
        if (m.matchFiksId) seenFiks.add(m.matchFiksId);
        return true;
      });
    }

    const result: OfficialNffPlayerStats = {
      fiksId,
      name: name || `FIKS Spiller ${fiksId}`,
      lastUpdated: new Date().toISOString(),
      isOfficial: true,
      career: {
        matchesYouth,
        matchesAdult,
        totalMatches: matchesYouth + matchesAdult,
        goalsYouth,
        goalsAdult,
        totalGoals,
        goalsAverage,
        yellowCards,
        redCards,
      },
      season2026: {
        totalMatches: totalMatches2026,
        totalGoals: totalGoals2026,
        goalsPerMatch: goalsPerMatch2026,
        yellowCards: yellowCards2026,
        redCards: redCards2026,
        teams: teams2026,
      },
      seasons,
      tournaments,
      matches2026,
    };

    // Save to cache
    const cache = loadCache();
    cache[fiksId] = result;
    saveCache(cache);

    return result;
  } catch (err) {
    console.error(`[PlayerStatsService] Error scraping fiksId ${fiksId}:`, (err as Error).message);
    return null;
  }
}

/**
 * Fetches match list for a player in a specific team via /PersonPage/GetMatches
 */
async function fetchPlayerMatchesFromNff(
  fiksId: number,
  nffTeamId: number,
  seasonId: string = '110',
  teamIdHint?: string
): Promise<OfficialPlayerMatchItem[]> {
  const params = new URLSearchParams({
    fiksId: String(fiksId),
    teamId: String(nffTeamId),
    statType: 'any',
    seasonId,
    isNationalStats: 'False',
    showTournament: 'true',
  });

  const res = await fetch('https://www.fotball.no/PersonPage/GetMatches', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
    body: params.toString(),
  });

  if (!res.ok) return [];

  const text = await res.text();
  const rows = [...text.matchAll(/<tr>[\s\S]*?<\/tr>/gi)].slice(1);
  const matches: OfficialPlayerMatchItem[] = [];

  for (const r of rows) {
    const cells = [...r[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      decodeEntities(c[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    );
    const fiksMatch = r[0].match(/fiksId=(\d+)/);
    const matchFiksId = fiksMatch ? parseInt(fiksMatch[1], 10) : undefined;

    if (cells.length >= 4) {
      matches.push({
        date: cells[0],
        tournament: cells[1],
        match: cells[2],
        result: cells[3],
        venue: cells[4] || 'Bønesbanen',
        matchFiksId,
        teamId: teamIdHint,
      });
    }
  }

  return matches;
}

/**
 * Gets official player stats from cache or scrapes if not present
 */
export async function getOfficialPlayerStats(
  fiksId: number,
  forceRefresh: boolean = false
): Promise<OfficialNffPlayerStats | null> {
  const cache = loadCache();
  if (!forceRefresh && cache[fiksId]) {
    return cache[fiksId];
  }

  return scrapeOfficialPlayerStats(fiksId, true);
}

/**
 * Gets all cached official player stats
 */
export function getAllCachedPlayerStats(): Record<number, OfficialNffPlayerStats> {
  return loadCache();
}

/**
 * Batch scrapes all unique Bønes player FIKS IDs
 */
export async function syncAllPlayerStats(
  fiksIds: number[],
  batchSize: number = 6,
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  const cache = loadCache();
  let completed = 0;
  const total = fiksIds.length;

  for (let i = 0; i < total; i += batchSize) {
    const chunk = fiksIds.slice(i, i + batchSize);
    await Promise.all(
      chunk.map(async (fid) => {
        try {
          await scrapeOfficialPlayerStats(fid, false);
        } catch (err) {
          console.warn(`[Sync] Failed for fiksId ${fid}:`, (err as Error).message);
        } finally {
          completed++;
          if (onProgress) onProgress(completed, total);
        }
      })
    );
    // Small delay between batches to be respectful to fotball.no
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return completed;
}
