import fs from 'fs';
import path from 'path';
import { BonesClubData, DatabaseSchemaV2, Match, MatchEvent, MatchStatus, Player, Person } from '../src/types.js';
import { getClubData } from './bonesData.js';
import {
  calculateMatchScore,
  calculateTopScorers,
  calculateCardStatistics,
  generateDeterministicEventId,
  getPlayerIdentity,
  sanitizeSlug,
  isOwnGoalEvent
} from '../src/utils/derivedStats.js';
import { calculateMatchPOTM } from '../src/utils/potmCalculator.js';
import {
  enrichMatchEventWithIdentity,
  toCanonicalPlayerId,
  extractNumericFiksId,
  resolvePlayerIdentity,
  runPlayerIdentityDiagnostics,
  buildPersonsFromPlayersAndEvents,
} from '../src/utils/playerResolver.js';
import { ALL_BONES_PLAYERS } from '../src/data/bonesSquads.js';
import { ClubConfig, getClubConfig, isClubTeam } from '../src/config/clubConfig.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'bones_database.json');
const BAK_FILE = path.join(DATA_DIR, 'bones_database.bak');
const V1_BAK_FILE = path.join(DATA_DIR, 'bones_database.v1.bak.json');

export function getDatabaseFilePath(clubId: string = 'bones'): string {
  const clean = (clubId || 'bones').toLowerCase().trim();
  return path.join(DATA_DIR, clean === 'bones' ? 'bones_database.json' : `${clean}_database.json`);
}

export function getBakFilePath(clubId: string = 'bones'): string {
  const clean = (clubId || 'bones').toLowerCase().trim();
  return path.join(DATA_DIR, clean === 'bones' ? 'bones_database.bak' : `${clean}_database.bak`);
}

/**
 * Migrates data to DatabaseSchemaV2:
 * 1. Automatic backup to bones_database.v1.bak.json if not already present.
 * 2. Normalizes player IDs across all squads (canonical format, teamId strictly excluded).
 * 3. Enriches all MatchEvents using 3-tier scoped identity resolution (Lineup -> Squad -> Club) with Ambiguity Guardrail.
 * 4. Enforces deterministic MatchEvent IDs: ${matchId}_m${minute}_${type}_${playerId}_${team}
 * 5. Re-derives event-driven match scores and derived stats (topScorers, cards).
 * 6. Sets schemaVersion = '2.0', dataVersion = 2.
 */
export function migrateToV2(data: BonesClubData, clubId: string = 'bones'): DatabaseSchemaV2 {
  const cleanClubId = (clubId || data.clubId || 'bones').toLowerCase().trim();
  const clubConfig = getClubConfig(cleanClubId);
  console.log(`[Storage] Starting migration to DatabaseSchemaV2 for club: ${clubConfig.name} (${cleanClubId})...`);

  // 1. Create .v1.bak.json backup if not already present (for bones)
  if (cleanClubId === 'bones') {
    try {
      if (fs.existsSync(DB_FILE) && !fs.existsSync(V1_BAK_FILE)) {
        fs.copyFileSync(DB_FILE, V1_BAK_FILE);
        console.log(`[Storage] Created migration backup at ${V1_BAK_FILE}`);
      }
    } catch (err: any) {
      console.warn('[Storage] Could not create v1 backup:', err.message);
    }
  }

  data.clubId = cleanClubId;
  data.clubConfig = clubConfig;

  // Stamp clubId on all teams
  if (Array.isArray(data.teams)) {
    for (const t of data.teams) {
      t.clubId = t.clubId || cleanClubId;
    }
  }

  const allClubPlayers: Player[] = cleanClubId === 'bones'
    ? [...(data.players || []), ...ALL_BONES_PLAYERS]
    : [...(data.players || [])];

  // Build unambiguous legacy map for club players (from officialStats and club squads)
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
        personId: canonId,
        fiksId: fid,
        clubId: p.clubId || cleanClubId,
      };
    });
  }

  // 3. Migrate all matches and enrich their events with canonical identity
  const processedEventIds = new Set<string>();

  data.matches = (data.matches || []).map((match) => {
    match.clubId = match.clubId || cleanClubId;
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
        clubConfig: clubConfig,
        clubId: cleanClubId,
      });

      const effectivePlayerId = enriched.ambiguous ? undefined : enriched.playerId;
      const eventKeyPlayer = enriched.ambiguous ? `ambiguous_${sanitizeSlug(enriched.player || 'player')}_${idx}` : (effectivePlayerId || `unresolved_${idx}`);
      const deterministicId = generateDeterministicEventId(
        match.id,
        enriched.minute,
        enriched.type,
        eventKeyPlayer,
        enriched.team || match.teamName
      );

      const normalizedEvent: MatchEvent = {
        ...enriched,
        id: deterministicId,
        matchId: match.id,
        playerId: effectivePlayerId,
        fiksId: enriched.ambiguous ? undefined : enriched.fiksId,
        clubId: cleanClubId,
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
        match.awayTeam,
        clubConfig
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

  // 4. Build canonical Person identities
  data.persons = buildPersonsFromPlayersAndEvents(data.players || [], data.matches || [], cleanClubId);

  // 5. Re-derive topScorers and cards from the normalized events
  data.topScorers = calculateTopScorers(data.matches, data.players, { clubConfig, clubOnly: true });
  data.cards = calculateCardStatistics(data.matches, data.players, { clubConfig, clubOnly: true });

  const v2Data: DatabaseSchemaV2 = {
    ...data,
    dataVersion: 2,
    schemaVersion: '2.0',
    migratedAt: new Date().toISOString(),
    processedEventIds: Array.from(processedEventIds),
    lastDiskSaved: new Date().toISOString(),
    persons: data.persons,
  };

  // Run integrity diagnostics
  const diag = runPlayerIdentityDiagnostics(v2Data);
  console.log(
    `[Storage] Migration complete for ${cleanClubId}. Diagnostics: ${diag.totalUniqueFiksPersons} unique FIKS persons, ${diag.totalPlayerRecords} squad records, ${diag.eventsDiagnostics.totalEvents} match events (${diag.eventsDiagnostics.authoritativeEvents} authoritative FIKS events, ${diag.eventsDiagnostics.unresolvedEvents} legacy, ${diag.eventsDiagnostics.ambiguousEvents} ambiguous).`
  );

  return v2Data;
}

/**
 * Loads persisted club data from disk or initializes if first time.
 * Supports multi-club data isolation by clubId.
 */
export function loadPersistedData(clubId: string = 'bones'): BonesClubData {
  const cleanClubId = (clubId || 'bones').toLowerCase().trim();
  const dbFile = getDatabaseFilePath(cleanClubId);
  const bakFile = getBakFilePath(cleanClubId);

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(dbFile)) {
      const raw = fs.readFileSync(dbFile, 'utf-8');
      const parsed = JSON.parse(raw) as BonesClubData;

      // Verify that parsed object contains minimal required structure
      if (parsed && Array.isArray(parsed.teams) && parsed.tables && Array.isArray(parsed.matches)) {
        // Check if migration to V2 is needed
        if (parsed.schemaVersion !== '2.0' || !parsed.dataVersion || parsed.dataVersion < 2 || !parsed.persons) {
          console.log(
            `[Storage] Database schema is not 2.0 or missing persons for ${cleanClubId}. Migrating to V2...`
          );
          const v2 = migrateToV2(parsed, cleanClubId);
          savePersistedData(v2, cleanClubId);
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

        // Strictly purge mockup players and reset any mockup matches (e.g. nff-9183579)
        for (const m of parsed.matches) {
          if (m.id === 'nff-9183579') {
            m.status = 'upcoming';
            delete m.homeScore;
            delete m.awayScore;
            m.events = [];
            delete m.playerOfTheMatch;
          }
          if (m.events) {
            m.events = m.events.filter(e => !e.player || !e.player.toLowerCase().includes('sander bønes'));
          }
          if (m.playerOfTheMatch?.winnerName?.toLowerCase().includes('sander bønes')) {
            delete m.playerOfTheMatch;
          }
        }
        if (Array.isArray(parsed.topScorers)) {
          parsed.topScorers = parsed.topScorers.filter(p => !p.name || !p.name.toLowerCase().includes('sander bønes'));
        }
        if (Array.isArray(parsed.players)) {
          parsed.players = parsed.players.filter(p => !p.name || !p.name.toLowerCase().includes('sander bønes'));
        }
        if (Array.isArray(parsed.feed)) {
          parsed.feed = parsed.feed.filter(f => !f.player || !f.player.toLowerCase().includes('sander bønes'));
        }
        if (Array.isArray(parsed.processedEventIds)) {
          parsed.processedEventIds = parsed.processedEventIds.filter(id => !id.includes('sander_boenes'));
        }

        if (cleanClubId === 'bones') {
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
        }

        // Authoritatively synchronize match scores with goal events (including own goals)
        const clubConfig = getClubConfig(cleanClubId);
        for (const m of parsed.matches) {
          if (m.events && m.events.length > 0 && m.events.some(e => e.type === 'goal')) {
            const derived = calculateMatchScore(m.events, m.homeScore, m.awayScore, m.homeTeam, m.awayTeam, clubConfig);
            m.homeScore = derived.homeScore;
            m.awayScore = derived.awayScore;
          }

          const hasOwnGoal = (m.events || []).some(isOwnGoalEvent);
          const potmWinnerScoredOG = m.playerOfTheMatch && (m.events || []).some(e =>
            isOwnGoalEvent(e) && e.player && e.player.trim().toLowerCase() === m.playerOfTheMatch?.winnerName?.trim().toLowerCase()
          );

          if ((!m.playerOfTheMatch || hasOwnGoal || potmWinnerScoredOG) && (m.status === 'finished' || (m.status as string) === 'live')) {
            m.playerOfTheMatch = calculateMatchPOTM(m);
          }
        }

        if (!parsed.persons || parsed.persons.length === 0) {
          parsed.persons = buildPersonsFromPlayersAndEvents(parsed.players || [], parsed.matches || [], cleanClubId);
        }

        console.log(
          `[Storage] Persisted database loaded successfully from ${dbFile} (Version: ${parsed.dataVersion}, Matches: ${parsed.matches.length}, Club: ${cleanClubId}).`
        );
        return parsed;
      }
    }
  } catch (err: any) {
    console.error(
      `[Storage] Error reading persisted database file for ${cleanClubId}, falling back to backup or initial seed data:`,
      err.message
    );
    if (fs.existsSync(bakFile)) {
      try {
        const bakRaw = fs.readFileSync(bakFile, 'utf-8');
        const bakParsed = JSON.parse(bakRaw) as BonesClubData;
        if (bakParsed && Array.isArray(bakParsed.matches)) {
          console.log(`[Storage] Successfully recovered ${cleanClubId} from backup file.`);
          return bakParsed;
        }
      } catch (bakErr) {
        console.error(`[Storage] Backup recovery failed for ${cleanClubId}:`, bakErr);
      }
    }
  }

  // If not found or error, initialize from seed data or club configuration
  console.log(`[Storage] Initializing fresh database for ${cleanClubId} and saving to disk...`);
  let initial: BonesClubData;
  if (cleanClubId === 'bones') {
    initial = getClubData();
  } else {
    const config = getClubConfig(cleanClubId);
    initial = {
      clubId: cleanClubId,
      clubConfig: config,
      teams: config.scraper?.teams?.map(t => ({
        id: t.id,
        clubId: cleanClubId,
        name: t.name,
        shortName: t.shortName,
        category: t.category,
        division: t.division,
        krets: t.krets,
        homeGround: t.homeGround,
        currentRank: 1,
        totalTeamsInDivision: 8,
        nffCode: t.nffCode,
        fiksId: t.fiksId,
        tourneyId: t.tourneyId,
      })) || [],
      tables: {},
      topScorers: [],
      cards: [],
      matches: [],
      players: [],
      persons: [],
      scanner: {
        isActive: false,
        isScanning: false,
        lastScanned: new Date().toISOString(),
        lastScan: new Date().toISOString(),
        nextScanSeconds: 180,
        autoScanEnabled: true,
        sources: [],
        logs: [],
        scanDuration: '0s',
        totalMatchesFound: 0,
        errors: [],
        progress: 100,
        currentTask: 'Klar'
      },
      feed: [],
      stats: {
        totalTeams: config.scraper?.teams?.length || 0,
        totalMatchesRecorded: 0,
        upcomingHomeMatches: 0,
        totalGoalsScored: 0,
        fairPlayScore: 10.0
      },
      isRealData: true,
      dataVersion: 2,
      schemaVersion: '2.0',
    };
  }

  const migrated = migrateToV2(initial, cleanClubId);
  savePersistedData(migrated, cleanClubId);
  return migrated;
}

/**
 * Saves club data to disk atomically to prevent data loss on server restarts.
 * Isolates data per club.
 */
export function savePersistedData(data: BonesClubData, clubId: string = 'bones'): void {
  const cleanClubId = (clubId || data.clubId || 'bones').toLowerCase().trim();
  const dbFile = getDatabaseFilePath(cleanClubId);
  const bakFile = getBakFilePath(cleanClubId);

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    data.clubId = cleanClubId;
    data.dataVersion = 2;
    data.schemaVersion = '2.0';
    data.lastDiskSaved = new Date().toISOString();

    const tempFile = `${dbFile}.tmp`;
    const serialized = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempFile, serialized, 'utf-8');

    // Create backup of current DB if it exists
    if (fs.existsSync(dbFile)) {
      try {
        fs.copyFileSync(dbFile, bakFile);
      } catch {
        // ignore backup copy failure
      }
    }

    fs.renameSync(tempFile, dbFile);
  } catch (err: any) {
    console.error(`[Storage] Error saving database to disk for ${cleanClubId}:`, err.message);
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

    const matchStatus: MatchStatus = newMatch.status || existing.status || 'finished';
    const hasOwnGoal = (mergedEvents || []).some(isOwnGoalEvent);
    const potmWinnerScoredOG = (newMatch.playerOfTheMatch || existing.playerOfTheMatch) && (mergedEvents || []).some(e =>
      isOwnGoalEvent(e) && e.player && e.player.trim().toLowerCase() === (newMatch.playerOfTheMatch || existing.playerOfTheMatch)?.winnerName?.trim().toLowerCase()
    );
    let playerOfTheMatch = newMatch.playerOfTheMatch || existing.playerOfTheMatch;
    if (!playerOfTheMatch || hasOwnGoal || potmWinnerScoredOG) {
      if (matchStatus === 'finished' || matchStatus === 'live') {
        playerOfTheMatch = calculateMatchPOTM({
          ...existing,
          ...newMatch,
          events: mergedEvents,
          homeScore,
          awayScore,
          status: matchStatus,
        });
      }
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
      playerOfTheMatch,
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
