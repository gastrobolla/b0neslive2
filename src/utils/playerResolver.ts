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
 * - teamId is NEVER included in the canonical ID
 * - Legacy fallback is formatted as "legacy_${nameSlug}"
 */
export function toCanonicalPlayerId(fiksIdOrId?: number | string | null, name?: string): string {
  if (typeof fiksIdOrId === 'number' && !isNaN(fiksIdOrId) && fiksIdOrId > 0) {
    return `fiks-${fiksIdOrId}`;
  }
  if (typeof fiksIdOrId === 'string' && fiksIdOrId.trim()) {
    const clean = fiksIdOrId.trim();
    // Handle "p-3761464" or "fiks-3761464" or pure digits "3761464"
    const fiksMatch = clean.match(/^(?:fiks-|p-)?(\d+)$/i);
    if (fiksMatch) {
      return `fiks-${fiksMatch[1]}`;
    }
    // Handle existing legacy IDs: strip any accidental team suffix if present
    if (clean.startsWith('legacy_')) {
      return clean;
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
    const m = input.trim().match(/^(?:fiks-|p-)?(\d+)$/i);
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

  // 4. Scoped name matching (Lineup candidates first, then squad candidates)
  const normTarget = displayName.toLowerCase();

  const searchInPool = (pool?: Player[]): Player[] => {
    if (!pool || pool.length === 0) return [];
    return pool.filter((p) => {
      if (!p.name) return false;
      const pNorm = p.name.trim().toLowerCase();
      return pNorm === normTarget || sanitizePlayerNameSlug(p.name) === nameSlug;
    });
  };

  // Check lineup first (most tightly scoped to the match)
  const lineupCandidates = searchInPool(scope?.lineupPlayers);
  if (lineupCandidates.length === 1) {
    const candidate = lineupCandidates[0];
    const fid = extractNumericFiksId(candidate.fiksId) || extractNumericFiksId(candidate.id);
    return {
      canonicalId: fid ? `fiks-${fid}` : toCanonicalPlayerId(candidate.id, candidate.name),
      fiksId: fid,
      displayName: candidate.name,
      method: 'scopedNameMatch',
      confidence: fid ? 'verified' : 'verified',
      isAmbiguous: false,
      candidateCount: 1,
    };
  } else if (lineupCandidates.length > 1) {
    // Ambiguity Guardrail: Multiple players in the same lineup share the name -> DO NOT GUESS
    return {
      displayName,
      method: 'unresolved',
      confidence: 'ambiguous',
      isAmbiguous: true,
      candidateCount: lineupCandidates.length,
    };
  }

  // If this event belongs to an opponent team, do NOT search Bones club squad/players
  if (!isBonesTeam) {
    return {
      canonicalId: toCanonicalPlayerId(undefined, displayName),
      displayName,
      method: 'unresolved',
      confidence: 'unresolved',
      isAmbiguous: false,
      candidateCount: 0,
    };
  }

  // Check squad second
  const squadCandidates = searchInPool(scope?.squadPlayers);
  if (squadCandidates.length === 1) {
    const candidate = squadCandidates[0];
    const fid = extractNumericFiksId(candidate.fiksId) || extractNumericFiksId(candidate.id);
    return {
      canonicalId: fid ? `fiks-${fid}` : toCanonicalPlayerId(candidate.id, candidate.name),
      fiksId: fid,
      displayName: candidate.name,
      method: 'scopedNameMatch',
      confidence: fid ? 'verified' : 'verified',
      isAmbiguous: false,
      candidateCount: 1,
    };
  } else if (squadCandidates.length > 1) {
    // Ambiguity Guardrail: Multiple players in the squad share the name -> DO NOT GUESS
    return {
      displayName,
      method: 'unresolved',
      confidence: 'ambiguous',
      isAmbiguous: true,
      candidateCount: squadCandidates.length,
    };
  }

  // Check club-wide pool if provided
  const clubCandidates = searchInPool(scope?.allClubPlayers);
  // Group club candidates by unique person (same fiksId means same person)
  const uniqueClubPersons = new Map<string, Player>();
  for (const c of clubCandidates) {
    const cid = toCanonicalPlayerId(c.fiksId || c.id, c.name);
    if (!uniqueClubPersons.has(cid)) {
      uniqueClubPersons.set(cid, c);
    }
  }

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
      candidateCount: 1,
    };
  } else if (uniqueClubPersons.size > 1) {
    // Ambiguity Guardrail: Multiple DIFFERENT persons in the club share the name
    return {
      displayName,
      method: 'unresolved',
      confidence: 'ambiguous',
      isAmbiguous: true,
      candidateCount: uniqueClubPersons.size,
    };
  }

  // Fallback: unresolved
  return {
    canonicalId: toCanonicalPlayerId(undefined, displayName),
    displayName,
    method: 'unresolved',
    confidence: 'unresolved',
    isAmbiguous: false,
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

  // If already authoritative with canonical fiksId, return as is
  if (event.fiksId && event.playerId && event.playerId.startsWith('fiks-')) {
    return {
      ...event,
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
  if (event.assistPlayer) {
    assistRes = resolvePlayerIdentity(
      {
        fiksId: event.assistFiksId,
        playerId: event.assistPlayerId,
        name: event.assistPlayer,
      },
      scope
    );
  }

  return {
    ...event,
    playerId: res.isAmbiguous ? undefined : (res.canonicalId || event.playerId),
    fiksId: res.isAmbiguous ? undefined : (res.fiksId || event.fiksId),
    ambiguous: res.isAmbiguous,
    unresolved: res.confidence === 'unresolved',
    resolutionMethod: res.method,
    resolutionConfidence: res.confidence,
    assistPlayerId: assistRes ? (assistRes.isAmbiguous ? undefined : assistRes.canonicalId) : event.assistPlayerId,
    assistFiksId: assistRes ? (assistRes.isAmbiguous ? undefined : assistRes.fiksId) : event.assistFiksId,
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

  for (const p of playerList) {
    const fid = extractNumericFiksId(p.fiksId) || extractNumericFiksId(p.id);
    if (fid) {
      if (!fiksToPlayers.has(fid)) fiksToPlayers.set(fid, []);
      fiksToPlayers.get(fid)!.push(p);
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

  // 4. Events diagnostic
  let authoritativeEvents = 0;
  let unresolvedEvents = 0;
  let ambiguousEvents = 0;

  for (const ev of eventList) {
    if (ev.ambiguous) {
      ambiguousEvents++;
    } else if (ev.fiksId || (ev.playerId && ev.playerId.startsWith('fiks-'))) {
      authoritativeEvents++;
    } else {
      unresolvedEvents++;
    }
  }

  return {
    totalUniqueFiksPersons: fiksToPlayers.size,
    totalPlayerRecords: playerList.length,
    fiksIdsWithMultipleSquadRecords,
    conflictingNamesForSameFiks,
    sameNameWithDifferentFiks,
    legacyPlayersEligibleForUpgrade,
    eventsDiagnostics: {
      totalEvents: eventList.length,
      authoritativeEvents,
      unresolvedEvents,
      ambiguousEvents,
    },
  };
}
