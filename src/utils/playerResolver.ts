import { Player, MatchEvent, IdentityResolutionResult, Person, PlayerPosition, PositionSource } from '../types.js';

/**
 * Standardizes slug creation from human names or raw text.
 */
export function sanitizePlayerNameSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Normalizes any player ID to a canonical identity string.
 * RULES:
 * - FIKS ID is always formatted as "fiks-${fiksId}"
 * - Parallel formats (p-, player-, fiks_, raw digits) are normalized to "fiks-${fiksId}"
 * - teamId is strictly NEVER included in the canonical ID
 * - Legacy fallback is formatted as "legacy_${nameSlug}"
 */
export function toCanonicalPlayerId(fiksIdOrId?: number | string | null, name?: string): string {
  if (typeof fiksIdOrId === 'number' && !isNaN(fiksIdOrId) && fiksIdOrId > 0) {
    return `fiks-${fiksIdOrId}`;
  }
  if (typeof fiksIdOrId === 'string' && fiksIdOrId.trim()) {
    const clean = fiksIdOrId.trim();
    // Handle "p-3761464", "player-3761464", "fiks_3761464", "fiks-3761464" or pure digits "3761464"
    const fiksMatch = clean.match(/^(?:fiks[-_]|p-|player-)?(\d+)$/i);
    if (fiksMatch) {
      return `fiks-${fiksMatch[1]}`;
    }
    // Handle existing legacy IDs: strip any accidental team suffix if present
    if (clean.startsWith('legacy_')) {
      return clean.replace(/_[a-z0-9]+-[0-9]+$/i, '');
    }
  }
  if (name && name.trim()) {
    const slug = sanitizePlayerNameSlug(name);
    return `legacy_${slug}`;
  }
  return 'legacy_unknown';
}

/**
 * Extracts pure numeric FIKS ID from various formats.
 */
export function extractNumericFiksId(input?: number | string | null): number | undefined {
  if (typeof input === 'number' && !isNaN(input) && input > 0) {
    return input;
  }
  if (typeof input === 'string' && input.trim()) {
    const m = input.trim().match(/^(?:fiks[-_]|p-|player-)?(\d+)$/i);
    if (m) {
      const num = parseInt(m[1], 10);
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return undefined;
}

/**
 * Candidate pool for resolving a player's identity within a specific scope.
 */
export interface ResolutionScope {
  lineupPlayers?: Player[];
  squadPlayers?: Player[];
  allClubPlayers?: Player[];
  legacyMap?: Map<string, number>; // maps legacyId or nameSlug to fiksId
  targetTeam?: string;
}

/**
 * Resolves player identity with authoritative priority and ambiguity guardrails.
 *
 * Priority order:
 * 1) Explicit numeric FIKS ID
 * 2) Verified FIKS-based ID (e.g. "fiks-123456" or "p-123456")
 * 3) Verified legacy mapping (if mapped to a FIKS ID)
 * 4) Scoped name match within match lineup/squad (ONLY if uniquely 1 candidate)
 *
 * Ambiguity Guardrail:
 * If multiple candidates in scope match the display name, DO NOT GUESS.
 * Returns isAmbiguous: true, method: 'unresolved', confidence: 'ambiguous'.
 */
export function resolvePlayerIdentity(
  input: {
    fiksId?: number | null;
    playerId?: string | null;
    name?: string | null;
  },
  scope?: ResolutionScope
): IdentityResolutionResult {
  const displayName = input.name?.trim() || '';

  // 1. Explicit numeric FIKS ID
  const numFiks = extractNumericFiksId(input.fiksId) || extractNumericFiksId(input.playerId);
  if (numFiks) {
    return {
      canonicalId: `fiks-${numFiks}`,
      fiksId: numFiks,
      displayName: displayName || `Spiller #${numFiks}`,
      method: 'fiksId',
      confidence: 'authoritative',
      isAmbiguous: false,
      candidateCount: 1,
    };
  }

  // 2. Canonical or legacy ID provided
  if (input.playerId && input.playerId.trim()) {
    const rawId = input.playerId.trim();
    const canon = toCanonicalPlayerId(rawId, displayName);
    if (canon.startsWith('fiks-')) {
      const fid = extractNumericFiksId(canon);
      return {
        canonicalId: canon,
        fiksId: fid,
        displayName: displayName || (fid ? `Spiller #${fid}` : 'Spiller'),
        method: 'canonicalPlayerId',
        confidence: 'verified',
        isAmbiguous: false,
        candidateCount: 1,
      };
    }
  }

  // If no name is available either, identity cannot be established
  if (!displayName || displayName.toLowerCase().includes('personinfo') || displayName.toLowerCase().includes('ikke tilgjengelig')) {
    return {
      displayName: displayName || 'Ukjent spiller',
      method: 'unresolved',
      confidence: 'unresolved',
      isAmbiguous: false,
      candidateCount: 0,
    };
  }

  const nameSlug = sanitizePlayerNameSlug(displayName);
  const isBonesTeam = !scope?.targetTeam || /bønes|bones/i.test(scope.targetTeam);

  // 3. Verified legacy mapping (only for Bones players/teams)
  if (isBonesTeam && scope?.legacyMap && scope.legacyMap.has(nameSlug)) {
    const mappedFid = scope.legacyMap.get(nameSlug)!;
    return {
      canonicalId: `fiks-${mappedFid}`,
      fiksId: mappedFid,
      displayName,
      method: 'legacyMapping',
      confidence: 'verified',
      isAmbiguous: false,
      candidateCount: 1,
    };
  }

  // 4. Scoped name matching (Lineup candidates first, then squad candidates, then club-wide)
  const normTarget = displayName.toLowerCase();

  const searchInPool = (pool?: Player[]): Player[] => {
    if (!pool || pool.length === 0) return [];
    return pool.filter((p) => {
      if (!p.name) return false;
      const pNorm = p.name.trim().toLowerCase();
      return pNorm === normTarget || sanitizePlayerNameSlug(p.name) === nameSlug;
    });
  };

  const getUniquePersons = (candidates: Player[]): Map<string, Player> => {
    const map = new Map<string, Player>();
    for (const c of candidates) {
      const cid = toCanonicalPlayerId(c.fiksId || c.id, c.name);
      if (!map.has(cid)) {
        map.set(cid, c);
      }
    }
    return map;
  };

  // Check lineup first (most tightly scoped to the match)
  const lineupCandidates = searchInPool(scope?.lineupPlayers);
  const uniqueLineup = getUniquePersons(lineupCandidates);

  if (uniqueLineup.size === 1) {
    const candidate = Array.from(uniqueLineup.values())[0];
    const fid = extractNumericFiksId(candidate.fiksId) || extractNumericFiksId(candidate.id);
    return {
      canonicalId: fid ? `fiks-${fid}` : toCanonicalPlayerId(candidate.id, candidate.name),
      fiksId: fid,
      displayName: candidate.name,
      method: 'scopedNameMatch',
      confidence: fid ? 'verified' : 'verified',
      isAmbiguous: false,
      unresolved: false,
      candidateCount: 1,
    };
  } else if (uniqueLineup.size > 1) {
    // Ambiguity Guardrail: Multiple distinct persons in the same lineup share the name -> DO NOT GUESS
    return {
      displayName,
      ambiguousName: displayName,
      canonicalId: undefined,
      fiksId: undefined,
      method: 'unresolved',
      confidence: 'ambiguous',
      isAmbiguous: true,
      unresolved: true,
      candidateCount: uniqueLineup.size,
      candidateFiksIds: Array.from(uniqueLineup.values())
        .map((p) => extractNumericFiksId(p.fiksId || p.id))
        .filter((id): id is number => id !== undefined),
    };
  }

  // If this event belongs to an opponent team, do NOT search Bones club squad/players
  if (!isBonesTeam) {
    return {
      canonicalId: undefined,
      fiksId: undefined,
      displayName,
      method: 'unresolved',
      confidence: 'unresolved',
      isAmbiguous: false,
      unresolved: true,
      candidateCount: 0,
    };
  }

  // Check squad second
  const squadCandidates = searchInPool(scope?.squadPlayers);
  const uniqueSquad = getUniquePersons(squadCandidates);

  if (uniqueSquad.size === 1) {
    const candidate = Array.from(uniqueSquad.values())[0];
    const fid = extractNumericFiksId(candidate.fiksId) || extractNumericFiksId(candidate.id);
    return {
      canonicalId: fid ? `fiks-${fid}` : toCanonicalPlayerId(candidate.id, candidate.name),
      fiksId: fid,
      displayName: candidate.name,
      method: 'scopedNameMatch',
      confidence: fid ? 'verified' : 'verified',
      isAmbiguous: false,
      unresolved: false,
      candidateCount: 1,
    };
  } else if (uniqueSquad.size > 1) {
    // Ambiguity Guardrail: Multiple distinct persons in the squad share the name -> DO NOT GUESS
    return {
      displayName,
      ambiguousName: displayName,
      canonicalId: undefined,
      fiksId: undefined,
      method: 'unresolved',
      confidence: 'ambiguous',
      isAmbiguous: true,
      unresolved: true,
      candidateCount: uniqueSquad.size,
      candidateFiksIds: Array.from(uniqueSquad.values())
        .map((p) => extractNumericFiksId(p.fiksId || p.id))
        .filter((id): id is number => id !== undefined),
    };
  }

  // Check club-wide pool if provided
  const clubCandidates = searchInPool(scope?.allClubPlayers);
  const uniqueClubPersons = getUniquePersons(clubCandidates);

  if (uniqueClubPersons.size === 1) {
    const candidate = Array.from(uniqueClubPersons.values())[0];
    const fid = extractNumericFiksId(candidate.fiksId) || extractNumericFiksId(candidate.id);
    return {
      canonicalId: fid ? `fiks-${fid}` : toCanonicalPlayerId(candidate.id, candidate.name),
      fiksId: fid,
      displayName: candidate.name,
      method: 'scopedNameMatch',
      confidence: fid ? 'verified' : 'verified',
      isAmbiguous: false,
      unresolved: false,
      candidateCount: 1,
    };
  } else if (uniqueClubPersons.size > 1) {
    // Ambiguity Guardrail: Multiple DIFFERENT persons in the club share the name -> DO NOT GUESS
    return {
      displayName,
      ambiguousName: displayName,
      canonicalId: undefined,
      fiksId: undefined,
      method: 'unresolved',
      confidence: 'ambiguous',
      isAmbiguous: true,
      unresolved: true,
      candidateCount: uniqueClubPersons.size,
      candidateFiksIds: Array.from(uniqueClubPersons.values())
        .map((p) => extractNumericFiksId(p.fiksId || p.id))
        .filter((id): id is number => id !== undefined),
    };
  }

  // Fallback: unresolved
  return {
    canonicalId: undefined,
    fiksId: undefined,
    displayName,
    method: 'unresolved',
    confidence: 'unresolved',
    isAmbiguous: false,
    unresolved: true,
    candidateCount: 0,
  };
}

/**
 * Enriches a MatchEvent with verified canonical player identity using resolution rules.
 */
export function enrichMatchEventWithIdentity(
  event: MatchEvent,
  matchOrScope?: any,
  maybeScope?: ResolutionScope
): MatchEvent {
  let scope: ResolutionScope | undefined = undefined;
  if (maybeScope) {
    scope = { ...maybeScope };
  } else if (matchOrScope && (matchOrScope.lineupPlayers || matchOrScope.allClubPlayers || matchOrScope.squadPlayers)) {
    scope = matchOrScope;
  }

  if (matchOrScope && matchOrScope.id && (matchOrScope.homeTeam || matchOrScope.awayTeam || matchOrScope.teamName)) {
    const match = matchOrScope;
    const autoLineup = [
      ...(match.lineup?.starters || []),
      ...(match.lineup?.bench || []),
      ...(match.lineup?.subs || []),
      ...(match.homeLineup?.starters || []),
      ...(match.homeLineup?.bench || []),
      ...(match.awayLineup?.starters || []),
      ...(match.awayLineup?.bench || []),
    ];
    scope = {
      lineupPlayers: scope?.lineupPlayers && scope.lineupPlayers.length > 0 ? scope.lineupPlayers : autoLineup,
      squadPlayers: scope?.squadPlayers,
      allClubPlayers: scope?.allClubPlayers,
      legacyMap: scope?.legacyMap,
      targetTeam: event.team || match.teamName || match.teamId,
    };
  }

  // If already authoritative with canonical fiksId, enforce invariant event.playerId === `fiks-${event.fiksId}`
  if (event.fiksId && event.playerId && event.playerId.startsWith('fiks-')) {
    return {
      ...event,
      playerId: `fiks-${event.fiksId}`,
      resolutionMethod: event.resolutionMethod || 'fiksId',
      resolutionConfidence: event.resolutionConfidence || 'authoritative',
      ambiguous: false,
      unresolved: false,
    };
  }

  const res = resolvePlayerIdentity(
    {
      fiksId: event.fiksId,
      playerId: event.playerId,
      name: event.player,
    },
    scope
  );

  let assistRes: IdentityResolutionResult | undefined = undefined;
  if (event.assistPlayer || event.assistFiksId || event.assistPlayerId) {
    assistRes = resolvePlayerIdentity(
      {
        fiksId: event.assistFiksId,
        playerId: event.assistPlayerId,
        name: event.assistPlayer,
      },
      scope
    );
  }

  const isAmbiguous = res.isAmbiguous;
  const isUnresolved = res.confidence === 'unresolved' || isAmbiguous;
  const resolvedFiksId = isAmbiguous ? undefined : (res.fiksId || extractNumericFiksId(event.fiksId));
  const resolvedPlayerId = isAmbiguous
    ? undefined
    : (resolvedFiksId ? `fiks-${resolvedFiksId}` : (res.canonicalId || (event.playerId?.startsWith('fiks-') ? event.playerId : undefined)));

  const assistFiksId = assistRes
    ? (assistRes.isAmbiguous ? undefined : (assistRes.fiksId || extractNumericFiksId(event.assistFiksId)))
    : extractNumericFiksId(event.assistFiksId);
  const assistPlayerId = assistRes
    ? (assistRes.isAmbiguous ? undefined : (assistFiksId ? `fiks-${assistFiksId}` : assistRes.canonicalId))
    : (assistFiksId ? `fiks-${assistFiksId}` : event.assistPlayerId);

  return {
    ...event,
    playerId: resolvedPlayerId,
    fiksId: resolvedFiksId,
    ambiguous: isAmbiguous,
    unresolved: isUnresolved,
    resolutionMethod: res.method,
    resolutionConfidence: res.confidence,
    assistPlayerId: assistPlayerId,
    assistFiksId: assistFiksId,
    assistAmbiguous: assistRes ? assistRes.isAmbiguous : false,
  };
}

/**
 * Diagnostic report interface
 */
export interface PlayerIdentityDiagnostics {
  totalUniqueFiksPersons: number;
  totalPlayerRecords: number;
  fiksIdsWithMultipleSquadRecords: Array<{
    fiksId: number;
    name: string;
    teams: string[];
  }>;
  conflictingNamesForSameFiks: Array<{
    fiksId: number;
    names: string[];
  }>;
  sameNameWithDifferentFiks: Array<{
    name: string;
    fiksIds: number[];
  }>;
  legacyPlayersEligibleForUpgrade: Array<{
    name: string;
    legacyId: string;
    matchedFiksId: number;
  }>;
  inconsistentIds: Array<{
    playerId: string;
    expectedCanonicalId: string;
    fiksId?: number;
    name: string;
  }>;
  eventsWithoutIdentity: Array<{
    eventId: string;
    matchId: string;
    minute: number;
    type: string;
    player?: string;
  }>;
  officialNffDiscrepancies: Array<{
    fiksId: number;
    name: string;
    officialNffGoals: number;
    internalEventGoals: number;
    difference: number;
  }>;
  eventsDiagnostics: {
    totalEvents: number;
    authoritativeEvents: number;
    unresolvedEvents: number;
    ambiguousEvents: number;
  };
}

/**
 * Read-only diagnostic function inspecting player identity integrity.
 */
export function runPlayerIdentityDiagnostics(
  playersOrData: Player[] | any,
  events: MatchEvent[] = [],
  officialStats: Record<string, any> = {}
): PlayerIdentityDiagnostics {
  let playerList: Player[] = [];
  let eventList: MatchEvent[] = events;

  if (Array.isArray(playersOrData)) {
    playerList = playersOrData;
  } else if (playersOrData && typeof playersOrData === 'object') {
    playerList = Array.isArray(playersOrData.players) ? playersOrData.players : [];
    if (Array.isArray(playersOrData.matches) && eventList.length === 0) {
      eventList = playersOrData.matches.flatMap((m: any) => m.events || []);
    }
  }

  const fiksToPlayers = new Map<number, Player[]>();
  const nameToFiks = new Map<string, Set<number>>();
  const legacyPlayers: Player[] = [];
  const inconsistentIds: Array<{ playerId: string; expectedCanonicalId: string; fiksId?: number; name: string }> = [];

  for (const p of playerList) {
    const fid = extractNumericFiksId(p.fiksId) || extractNumericFiksId(p.id);
    if (fid) {
      if (!fiksToPlayers.has(fid)) fiksToPlayers.set(fid, []);
      fiksToPlayers.get(fid)!.push(p);

      // Check invariant: player.id === `fiks-${fid}`
      if (p.id !== `fiks-${fid}`) {
        inconsistentIds.push({
          playerId: p.id,
          expectedCanonicalId: `fiks-${fid}`,
          fiksId: fid,
          name: p.name,
        });
      }
    } else {
      legacyPlayers.push(p);
    }

    if (p.name && fid) {
      const norm = p.name.trim().toLowerCase();
      if (!nameToFiks.has(norm)) nameToFiks.set(norm, new Set());
      nameToFiks.get(norm)!.add(fid);
    }
  }

  // 1. Multiple squad records for same FIKS
  const fiksIdsWithMultipleSquadRecords: Array<{ fiksId: number; name: string; teams: string[] }> = [];
  const conflictingNamesForSameFiks: Array<{ fiksId: number; names: string[] }> = [];

  for (const [fid, list] of fiksToPlayers.entries()) {
    if (list.length > 1) {
      const teams = Array.from(new Set(list.map((x) => x.teamName || x.teamId || 'Ukjent')));
      fiksIdsWithMultipleSquadRecords.push({
        fiksId: fid,
        name: list[0].name,
        teams,
      });
    }

    const uniqueNames = Array.from(new Set(list.map((x) => x.name.trim())));
    if (uniqueNames.length > 1) {
      conflictingNamesForSameFiks.push({
        fiksId: fid,
        names: uniqueNames,
      });
    }
  }

  // 2. Same name with different FIKS
  const sameNameWithDifferentFiks: Array<{ name: string; fiksIds: number[] }> = [];
  for (const [name, fids] of nameToFiks.entries()) {
    if (fids.size > 1) {
      sameNameWithDifferentFiks.push({
        name,
        fiksIds: Array.from(fids),
      });
    }
  }

  // 3. Legacy players upgradeable via officialStats or known FIKS
  const legacyPlayersEligibleForUpgrade: Array<{ name: string; legacyId: string; matchedFiksId: number }> = [];
  for (const leg of legacyPlayers) {
    const norm = (leg.name || '').trim().toLowerCase();
    const knownFids = nameToFiks.get(norm);
    if (knownFids && knownFids.size === 1) {
      legacyPlayersEligibleForUpgrade.push({
        name: leg.name,
        legacyId: leg.id,
        matchedFiksId: Array.from(knownFids)[0],
      });
    }
  }

  // 4. Events diagnostic & events without identity
  let authoritativeEvents = 0;
  let unresolvedEvents = 0;
  let ambiguousEvents = 0;
  const eventsWithoutIdentity: Array<{
    eventId: string;
    matchId: string;
    minute: number;
    type: string;
    player?: string;
  }> = [];

  for (const ev of eventList) {
    if (ev.ambiguous) {
      ambiguousEvents++;
    } else if (ev.fiksId || (ev.playerId && ev.playerId.startsWith('fiks-'))) {
      authoritativeEvents++;
    } else {
      unresolvedEvents++;
      if (ev.type === 'goal' || ev.type === 'yellow_card' || ev.type === 'red_card') {
        eventsWithoutIdentity.push({
          eventId: ev.id,
          matchId: ev.matchId,
          minute: ev.minute,
          type: ev.type,
          player: ev.player,
        });
      }
    }
  }

  // 5. Official NFF discrepancies (comparing derived event goals with official NFF stats)
  const officialNffDiscrepancies: Array<{
    fiksId: number;
    name: string;
    officialNffGoals: number;
    internalEventGoals: number;
    difference: number;
  }> = [];

  if (officialStats && Object.keys(officialStats).length > 0) {
    // Count internal event goals per fiksId
    const eventGoalsByFiks = new Map<number, number>();
    for (const ev of eventList) {
      if (ev.type === 'goal' && !ev.ambiguous) {
        const fid = ev.fiksId || extractNumericFiksId(ev.playerId);
        if (fid) {
          eventGoalsByFiks.set(fid, (eventGoalsByFiks.get(fid) || 0) + 1);
        }
      }
    }

    for (const [fidStr, stat] of Object.entries(officialStats)) {
      const fid = parseInt(fidStr, 10);
      if (isNaN(fid)) continue;
      const offGoals = stat.season2026?.totalGoals ?? stat.career?.totalGoals ?? 0;
      const intGoals = eventGoalsByFiks.get(fid) || 0;
      if (offGoals !== intGoals && (offGoals > 0 || intGoals > 0)) {
        officialNffDiscrepancies.push({
          fiksId: fid,
          name: stat.name || `Spiller #${fid}`,
          officialNffGoals: offGoals,
          internalEventGoals: intGoals,
          difference: intGoals - offGoals,
        });
      }
    }
  }

  return {
    totalUniqueFiksPersons: fiksToPlayers.size,
    totalPlayerRecords: playerList.length,
    fiksIdsWithMultipleSquadRecords,
    conflictingNamesForSameFiks,
    sameNameWithDifferentFiks,
    legacyPlayersEligibleForUpgrade,
    inconsistentIds,
    eventsWithoutIdentity,
    officialNffDiscrepancies,
    eventsDiagnostics: {
      totalEvents: eventList.length,
      authoritativeEvents,
      unresolvedEvents,
      ambiguousEvents,
    },
  };
}
