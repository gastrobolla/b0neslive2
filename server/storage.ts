import fs from 'fs';
import path from 'path';
import { BonesClubData, DatabaseSchemaV2, Match, MatchEvent, MatchStatus, Player } from '../src/types.js';
import { getClubData } from './bonesData.js';
import {
  calculateMatchScore,
  calculateTopScorers,
  calculateCardStatistics,
  generateDeterministicEventId,
  getPlayerIdentity,
  sanitizeSlug,
} from '../src/utils/derivedStats.js';
import {
  enrichMatchEventWithIdentity,
  toCanonicalPlayerId,
  extractNumericFiksId,
  resolvePlayerIdentity,
  runPlayerIdentityDiagnostics,
} from '../src/utils/playerResolver.js';
import { ALL_BONES_PLAYERS } from '../src/data/bonesSquads.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'bones_database.json');
const BAK_FILE = path.join(DATA_DIR, 'bones_database.bak');
const V1_BAK_FILE = path.join(DATA_DIR, 'bones_database.v1.bak.json');

/**
 * Migrates data to DatabaseSchemaV2:
 * 1. Automatic backup to bones_database.v1.bak.json if not already present.
 * 2. Normalizes player IDs across all squads (canonical format, teamId strictly excluded).
 * 3. Enriches all MatchEvents using 3-tier scoped identity resolution (Lineup -> Squad -> Club) with Ambiguity Guardrail.
 * 4. Enforces deterministic MatchEvent IDs: ${matchId}_m${minute}_${type}_${playerId}_${team}
 * 5. Re-derives event-driven match scores and derived stats (topScorers, cards).
 * 6. Sets schemaVersion = '2.0', dataVersion = 2.
 */
export function migrateToV2(data: BonesClubData): DatabaseSchemaV2 {
  console.log('[Storage] Starting migration to DatabaseSchemaV2 with canonical player identities...');

  // 1. Create .v1.bak.json backup if not already present
  try {
    if (fs.existsSync(DB_FILE) && !fs.existsSync(V1_BAK_FILE)) {
      fs.copyFileSync(DB_FILE, V1_BAK_FILE);
      console.log(`[Storage] Created migration backup at ${V1_BAK_FILE}`);
    }
  } catch (err: any) {
    console.warn('[Storage] Could not create v1 backup:', err.message);
  }

  const allClubPlayers: Player[] = [...(data.players || []), ...ALL_BONES_PLAYERS];

  // Build unambiguous legacy map for Bones players (from officialStats and club squads)
  const legacyMap = new Map<string, number>();
  const nameToFids = new Map<string, Set<number>>();

  const registerCandidate = (name?: string, fiksId?: number) => {
    if (!name || !fiksId) return;
    const slug = name.toLowerCase().trim().replace(/æ/g, 'ae').replace(/ø/g, 'oe').replace(/å/g, 'aa').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!slug) return;
    if (!nameToFids.has(slug)) nameToFids.set(slug, new Set());
    nameToFids.get(slug)!.add(fiksId);
  };

  // From official_nff_player_stats.json
  const officialFile = path.join(DATA_DIR, 'official_nff_player_stats.json');
  if (fs.existsSync(officialFile)) {
    try {
      const officialObj = JSON.parse(fs.readFileSync(officialFile, 'utf-8'));
      for (const entry of Object.values(officialObj) as any[]) {
        if (entry.name && entry.fiksId) {
          registerCandidate(entry.name, entry.fiksId);
        }
      }
    } catch {
      // ignore
    }
  }

  // From allClubPlayers
  for (const p of allClubPlayers) {
    const fid = extractNumericFiksId(p.fiksId) || extractNumericFiksId(p.id);
    if (p.name && fid) {
      registerCandidate(p.name, fid);
    }
  }

  // Ambiguity guardrail: only insert into legacyMap if exactly 1 fiksId exists for this name in the club
  for (const [slug, fids] of nameToFids.entries()) {
    if (fids.size === 1) {
      legacyMap.set(slug, Array.from(fids)[0]);
    }
  }

  // 2. Migrate all players in data.players to canonical ID
  if (Array.isArray(data.players)) {
    data.players = data.players.map((p) => {
      const numFiks = extractNumericFiksId(p.fiksId) || extractNumericFiksId(p.id);
      const canonId = toCanonicalPlayerId(numFiks ? `fiks-${numFiks}` : p.id, p.name);
      const isFiks = canonId.startsWith('fiks-');
      const fid = isFiks ? extractNumericFiksId(canonId) : undefined;

      return {
        ...p,
        id: canonId,
        fiksId: fid,
      };
    });
  }

  // 3. Migrate all matches and enrich their events with canonical identity
  const processedEventIds = new Set<string>();

  data.matches = (data.matches || []).map((match) => {
    if (!match.events || match.events.length === 0) {
      return match;
    }

    const lineupList = [
      ...(match.lineup?.starters || []),
      ...(match.lineup?.bench || []),
      ...(match.lineup?.subs || []),
      ...(match.homeLineup?.starters || []),
      ...(match.homeLineup?.bench || []),
      ...(match.awayLineup?.starters || []),
      ...(match.awayLineup?.bench || []),
    ];

    const squadList = (data.players || []).filter((p) => p.teamId === match.teamId);

    const eventMap = new Map<string, MatchEvent>();

    for (let idx = 0; idx < match.events.length; idx++) {
      const rawEv = match.events[idx];

      // Enrich event using scoped resolution and ambiguity guardrail
      const enriched = enrichMatchEventWithIdentity(rawEv, match, {
        lineupPlayers: lineupList,
        squadPlayers: squadList,
        allClubPlayers: allClubPlayers,
        legacyMap: legacyMap,
      });

      const effectivePlayerId = enriched.playerId || toCanonicalPlayerId(undefined, enriched.player);
      const deterministicId = generateDeterministicEventId(
        match.id,
        enriched.minute,
        enriched.type,
        effectivePlayerId,
        enriched.team || match.teamName
      );

      const normalizedEvent: MatchEvent = {
        ...enriched,
        id: deterministicId,
        matchId: match.id,
        playerId: effectivePlayerId,
      };

      eventMap.set(deterministicId, normalizedEvent);
      processedEventIds.add(deterministicId);
    }

    const sortedEvents = Array.from(eventMap.values()).sort((a, b) => a.minute - b.minute);

    // Event-driven score calculation
    const hasGoals = sortedEvents.some((e) => e.type === 'goal');
    let homeScore = match.homeScore;
    let awayScore = match.awayScore;

    if (hasGoals) {
      const derivedScore = calculateMatchScore(
        sortedEvents,
        match.homeScore,
        match.awayScore,
        match.homeTeam,
        match.awayTeam
      );
      homeScore = derivedScore.homeScore;
      awayScore = derivedScore.awayScore;
    }

    return {
      ...match,
      homeScore,
      awayScore,
      events: sortedEvents,
    };
  });

  // 4. Re-derive topScorers and cards from the normalized events
  data.topScorers = calculateTopScorers(data.matches, data.players, { bonesOnly: true });
  data.cards = calculateCardStatistics(data.matches, data.players, { bonesOnly: true });

  const v2Data: DatabaseSchemaV2 = {
    ...data,
    dataVersion: 2,
    schemaVersion: '2.0',
    migratedAt: new Date().toISOString(),
    processedEventIds: Array.from(processedEventIds),
    lastDiskSaved: new Date().toISOString(),
  };

  // Run integrity diagnostics
  const diag = runPlayerIdentityDiagnostics(v2Data);
  console.log(
    `[Storage] Migration complete. Diagnostics: ${diag.totalUniqueFiksPersons} unique FIKS persons, ${diag.totalPlayerRecords} squad records, ${diag.eventsDiagnostics.totalEvents} match events (${diag.eventsDiagnostics.authoritativeEvents} authoritative FIKS events, ${diag.eventsDiagnostics.unresolvedEvents} legacy, ${diag.eventsDiagnostics.ambiguousEvents} ambiguous).`
  );

  return v2Data;
}

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
        // Check if migration to V2 is needed
        if (parsed.schemaVersion !== '2.0' || !parsed.dataVersion || parsed.dataVersion < 2) {
          console.log(
            `[Storage] Database schema is not 2.0 (current schemaVersion: ${parsed.schemaVersion || 'none'}, dataVersion: ${parsed.dataVersion}). Migrating to V2...`
          );
          const v2 = migrateToV2(parsed);
          savePersistedData(v2);
          return v2;
        }

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
        console.log(
          `[Storage] Persisted database loaded successfully from ${DB_FILE} (Version: ${parsed.dataVersion}, Matches: ${parsed.matches.length}).`
        );
        return parsed;
      }
    }
  } catch (err: any) {
    console.error(
      '[Storage] Error reading persisted database file, falling back to backup or initial seed data:',
      err.message
    );
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
  const migrated = migrateToV2(initial);
  savePersistedData(migrated);
  return migrated;
}

/**
 * Saves club data to disk atomically to prevent data loss on server restarts.
 */
export function savePersistedData(data: BonesClubData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    data.dataVersion = 2;
    data.schemaVersion = '2.0';
    data.lastDiskSaved = new Date().toISOString();

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
 * Intelligently merges match events:
 * - Exact deterministic ID matching.
 * - Tolerance matching: if an event from lagleder has the same type, player and minute within ±2 of an NFF event,
 *   they are merged preserving lagleder's reporter info and description, and elevated to official/NFF.
 */
export function mergeMatchEvents(
  existingEvents: MatchEvent[] = [],
  incomingEvents: MatchEvent[] = [],
  matchId: string
): MatchEvent[] {
  const merged: MatchEvent[] = [...existingEvents];

  for (const incoming of incomingEvents) {
    const incId =
      incoming.id ||
      generateDeterministicEventId(
        matchId,
        incoming.minute,
        incoming.type,
        incoming.playerId || incoming.player,
        incoming.team
      );
    const incEvent: MatchEvent = { ...incoming, id: incId, matchId };

    // 1. Exact ID match
    const exactIdx = merged.findIndex((e) => e.id === incId);
    if (exactIdx >= 0) {
      const ex = merged[exactIdx];
      merged[exactIdx] = {
        ...ex,
        ...incEvent,
        reportedBy: ex.reportedBy || incEvent.reportedBy,
        description: incEvent.description || ex.description,
        source: ex.source === 'NFF' || incEvent.source === 'NFF' ? 'NFF' : incEvent.source,
      };
      continue;
    }

    // 2. Tolerance match (±2 minutes, same event type, same player)
    const incNameSlug = sanitizeSlug(incoming.player || '');
    const incFiks =
      incoming.fiksId ||
      (incoming.playerId?.startsWith('fiks-')
        ? parseInt(incoming.playerId.replace('fiks-', ''), 10)
        : undefined);

    const fuzzyIdx = merged.findIndex((ex) => {
      if (ex.type !== incoming.type) return false;
      if (Math.abs(ex.minute - incoming.minute) > 2) return false;

      const exFiks =
        ex.fiksId ||
        (ex.playerId?.startsWith('fiks-')
          ? parseInt(ex.playerId.replace('fiks-', ''), 10)
          : undefined);

      if (incFiks && exFiks) {
        return incFiks === exFiks;
      }

      const exNameSlug = sanitizeSlug(ex.player || '');
      return (
        incNameSlug.length > 2 &&
        exNameSlug.length > 2 &&
        (incNameSlug.includes(exNameSlug) || exNameSlug.includes(incNameSlug))
      );
    });

    if (fuzzyIdx >= 0) {
      const ex = merged[fuzzyIdx];
      merged[fuzzyIdx] = {
        ...ex,
        minute: incEvent.source === 'NFF' ? incEvent.minute : ex.minute,
        source: ex.source === 'NFF' || incEvent.source === 'NFF' ? 'NFF' : incEvent.source || ex.source,
        reportedBy: ex.reportedBy || incEvent.reportedBy,
        description: ex.description || incEvent.description,
        fiksId: incFiks || ex.fiksId,
        playerId: incEvent.playerId || ex.playerId,
      };
    } else {
      merged.push(incEvent);
    }
  }

  return merged.sort((a, b) => a.minute - b.minute);
}

/**
 * Merges a single match into the database preserving existing verified events and lagleder inputs.
 */
export function upsertMatch(newMatch: Match, currentData: BonesClubData): Match {
  const existingIdx = currentData.matches.findIndex((m) => m.id === newMatch.id);

  if (existingIdx >= 0) {
    const existing = currentData.matches[existingIdx];
    const mergedEvents = mergeMatchEvents(existing.events || [], newMatch.events || [], newMatch.id);

    // Event-driven score calculation
    let homeScore =
      newMatch.homeScore !== null && newMatch.homeScore !== undefined ? newMatch.homeScore : existing.homeScore;
    let awayScore =
      newMatch.awayScore !== null && newMatch.awayScore !== undefined ? newMatch.awayScore : existing.awayScore;

    if (mergedEvents.some((e) => e.type === 'goal')) {
      const derived = calculateMatchScore(
        mergedEvents,
        homeScore,
        awayScore,
        newMatch.homeTeam || existing.homeTeam,
        newMatch.awayTeam || existing.awayTeam
      );
      homeScore = derived.homeScore;
      awayScore = derived.awayScore;
    }

    const merged: Match = {
      ...existing,
      ...newMatch,
      homeScore,
      awayScore,
      events: mergedEvents.length > 0 ? mergedEvents : existing.events,
      lineup: newMatch.lineup || existing.lineup,
      homeLineup: newMatch.homeLineup || existing.homeLineup,
      awayLineup: newMatch.awayLineup || existing.awayLineup,
      isOfficialFiks: newMatch.isOfficialFiks ?? existing.isOfficialFiks,
      lastUpdatedSource: newMatch.lastUpdatedSource || existing.lastUpdatedSource,
      lastUpdatedAt: newMatch.lastUpdatedAt || existing.lastUpdatedAt,
      reportedBy: newMatch.reportedBy || existing.reportedBy,
      category: newMatch.category || existing.category,
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
export function upsertMatches(
  newMatches: Match[],
  currentData: BonesClubData
): { added: number; updated: number } {
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
  return currentData.matches
    .filter((m) => {
      if (filters.status && filters.status !== 'all' && m.status !== filters.status) {
        return false;
      }
      if (filters.category && filters.category !== 'all') {
        const cat = (m.category || '').toLowerCase();
        const targetCat = filters.category.toLowerCase();
        if (targetCat === 'gutter' && !cat.includes('ungdom') && !m.teamName.toLowerCase().includes('g'))
          return false;
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
    })
    .slice(0, filters.limit || 500);
}
