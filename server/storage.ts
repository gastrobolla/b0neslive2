import fs from 'fs';
import path from 'path';
import { BonesClubData, Match, MatchEvent, MatchStatus } from '../src/types.js';
import { getClubData } from './bonesData.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'bones_database.json');
const BAK_FILE = path.join(DATA_DIR, 'bones_database.bak');

/**
 * Loads persisted club data from disk or initializes if first time.
 */
export function loadPersistedData(): BonesClubData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as BonesClubData;

      // Verify that parsed object contains minimal required structure
      if (parsed && Array.isArray(parsed.teams) && parsed.tables && Array.isArray(parsed.matches)) {
        // Deduplicate matches upon load
        const matchMap = new Map<string, Match>();
        for (const m of parsed.matches) {
          if (!matchMap.has(m.id)) {
            matchMap.set(m.id, m);
          } else {
            // Merge events if duplicate ID
            const existing = matchMap.get(m.id)!;
            if (m.events && m.events.length > (existing.events?.length || 0)) {
              existing.events = m.events;
            }
          }
        }
        parsed.matches = Array.from(matchMap.values());

        const eventsFile = path.join(DATA_DIR, 'real_match_events.json');
        if (fs.existsSync(eventsFile)) {
          try {
            const eventsMap = JSON.parse(fs.readFileSync(eventsFile, 'utf-8'));
            for (const m of parsed.matches) {
              if (eventsMap[m.id] && (!m.events || m.events.length === 0)) {
                m.events = eventsMap[m.id];
              }
            }
          } catch (e) {
            console.warn('[Storage] Could not merge real_match_events.json:', e);
          }
        }
        console.log(`[Storage] Persisted database loaded successfully from ${DB_FILE} (Version: ${parsed.dataVersion || 1}, Matches: ${parsed.matches.length}).`);
        return parsed;
      }
    }
  } catch (err: any) {
    console.error('[Storage] Error reading persisted database file, falling back to backup or initial seed data:', err.message);
    if (fs.existsSync(BAK_FILE)) {
      try {
        const bakRaw = fs.readFileSync(BAK_FILE, 'utf-8');
        const bakParsed = JSON.parse(bakRaw) as BonesClubData;
        if (bakParsed && Array.isArray(bakParsed.matches)) {
          console.log('[Storage] Successfully recovered from backup file.');
          return bakParsed;
        }
      } catch (bakErr) {
        console.error('[Storage] Backup recovery failed:', bakErr);
      }
    }
  }

  // If not found or error, initialize from seed data
  console.log('[Storage] Initializing fresh database from verified seed data and saving to disk...');
  const initial = getClubData();
  initial.dataVersion = 1;
  initial.lastDiskSaved = new Date().toLocaleString('no-NO');
  savePersistedData(initial);
  return initial;
}

/**
 * Saves club data to disk atomically to prevent data loss on server restarts.
 */
export function savePersistedData(data: BonesClubData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    data.dataVersion = (data.dataVersion || 0) + 1;
    data.lastDiskSaved = new Date().toLocaleString('no-NO');

    const tempFile = `${DB_FILE}.tmp`;
    const serialized = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempFile, serialized, 'utf-8');

    // Create backup of current DB if it exists
    if (fs.existsSync(DB_FILE)) {
      try {
        fs.copyFileSync(DB_FILE, BAK_FILE);
      } catch {
        // ignore backup copy failure
      }
    }

    fs.renameSync(tempFile, DB_FILE);
  } catch (err: any) {
    console.error('[Storage] Error saving database to disk:', err.message);
  }
}

/**
 * Merges a single match into the database preserving existing verified events and lagleder inputs.
 */
export function upsertMatch(newMatch: Match, currentData: BonesClubData): Match {
  const existingIdx = currentData.matches.findIndex(m => m.id === newMatch.id);

  if (existingIdx >= 0) {
    const existing = currentData.matches[existingIdx];

    // Merge events intelligently
    const eventMap = new Map<string, MatchEvent>();
    if (existing.events) {
      for (const ev of existing.events) eventMap.set(ev.id, ev);
    }
    if (newMatch.events) {
      for (const ev of newMatch.events) eventMap.set(ev.id, ev);
    }
    const mergedEvents = Array.from(eventMap.values()).sort((a, b) => a.minute - b.minute);

    // Merge match fields
    const merged: Match = {
      ...existing,
      ...newMatch,
      homeScore: newMatch.homeScore !== null && newMatch.homeScore !== undefined ? newMatch.homeScore : existing.homeScore,
      awayScore: newMatch.awayScore !== null && newMatch.awayScore !== undefined ? newMatch.awayScore : existing.awayScore,
      events: mergedEvents.length > 0 ? mergedEvents : existing.events,
      lastUpdatedSource: newMatch.lastUpdatedSource || existing.lastUpdatedSource,
      lastUpdatedAt: newMatch.lastUpdatedAt || existing.lastUpdatedAt,
      reportedBy: newMatch.reportedBy || existing.reportedBy,
      category: newMatch.category || existing.category
    };

    currentData.matches[existingIdx] = merged;
    return merged;
  } else {
    currentData.matches.push(newMatch);
    return newMatch;
  }
}

/**
 * Bulk upserts matches into the database.
 */
export function upsertMatches(newMatches: Match[], currentData: BonesClubData): { added: number; updated: number } {
  let added = 0;
  let updated = 0;
  const existingMap = new Map<string, number>();

  currentData.matches.forEach((m, idx) => existingMap.set(m.id, idx));

  for (const match of newMatches) {
    if (existingMap.has(match.id)) {
      upsertMatch(match, currentData);
      updated++;
    } else {
      currentData.matches.push(match);
      existingMap.set(match.id, currentData.matches.length - 1);
      added++;
    }
  }

  // Sort matches by date descending
  currentData.matches.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  return { added, updated };
}

/**
 * Queries matches with flexible filters.
 */
export function queryMatches(
  currentData: BonesClubData,
  filters: {
    status?: MatchStatus | 'all';
    category?: string;
    teamId?: string;
    date?: string;
    isHome?: boolean;
    limit?: number;
  }
): Match[] {
  return currentData.matches.filter(m => {
    if (filters.status && filters.status !== 'all' && m.status !== filters.status) {
      return false;
    }
    if (filters.category && filters.category !== 'all') {
      const cat = (m.category || '').toLowerCase();
      const targetCat = filters.category.toLowerCase();
      if (targetCat === 'gutter' && !cat.includes('ungdom') && !m.teamName.toLowerCase().includes('g')) return false;
      if (targetCat === 'jenter' && !m.teamName.toLowerCase().includes('j')) return false;
      if (targetCat === 'senior' && cat !== 'senior') return false;
    }
    if (filters.teamId && filters.teamId !== 'all' && m.teamId !== filters.teamId) {
      return false;
    }
    if (filters.date && m.date !== filters.date) {
      return false;
    }
    if (filters.isHome !== undefined && m.isHome !== filters.isHome) {
      return false;
    }
    return true;
  }).slice(0, filters.limit || 500);
}
