import { Match, MatchEvent, Player, TopScorer, CardStatistic, FeedItem, FeedItemType } from '../types.js';

/**
 * Normalizes an arbitrary text string to a safe, URL-friendly slug.
 */
export function sanitizeSlug(text: string): string {
  if (!text) return 'unknown';
  return text
    .toLowerCase()
    .trim()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resolves an authoritative player key prioritizing numeric FIKS ID.
 * Falls back deterministically to legacy identifier if FIKS ID is missing.
 */
export function getPlayerIdentity(player: {
  fiksId?: number | null;
  id?: string | null;
  playerId?: string | null;
  name?: string | null;
  teamId?: string | null;
}): { key: string; isFiks: boolean; id: string; name: string } {
  const displayName = (player.name || 'Ukjent spiller').trim();

  // 1. Direct numeric fiksId
  if (player.fiksId && Number(player.fiksId) > 0) {
    const fid = Number(player.fiksId);
    return {
      key: `fiks_${fid}`,
      isFiks: true,
      id: `fiks-${fid}`,
      name: displayName,
    };
  }

  // 2. Check if playerId or id has fiks- prefix
  const rawId = player.playerId || player.id || '';
  const fiksMatch = rawId.match(/^fiks-(\d+)$/);
  if (fiksMatch) {
    const fid = parseInt(fiksMatch[1], 10);
    return {
      key: `fiks_${fid}`,
      isFiks: true,
      id: `fiks-${fid}`,
      name: displayName,
    };
  }

  // 3. Fallback to deterministic legacy key
  const nameSlug = sanitizeSlug(displayName);
  const teamSlug = player.teamId ? sanitizeSlug(player.teamId) : 'bones';
  const legacyId = `legacy_${nameSlug}_${teamSlug}`;

  return {
    key: legacyId,
    isFiks: false,
    id: legacyId,
    name: displayName,
  };
}

/**
 * Generates a stable deterministic event ID:
 * ${matchId}_m${minute}_${type}_${playerId}_${team}
 */
export function generateDeterministicEventId(
  matchId: string,
  minute: number,
  type: string,
  playerIdOrName: string | undefined,
  team: string
): string {
  const mId = sanitizeSlug(matchId);
  const cleanType = sanitizeSlug(type);
  const cleanPlayer = sanitizeSlug(playerIdOrName || 'anon');
  const cleanTeam = sanitizeSlug(team || 'team');
  return `${mId}_m${minute}_${cleanType}_${cleanPlayer}_${cleanTeam}`;
}

/**
 * Deterministically calculates match score derived from MatchEvents.
 * If no events exist, falls back to recorded scores (if provided).
 */
export function calculateMatchScore(
  events: MatchEvent[] | undefined,
  fallbackHome?: number | null,
  fallbackAway?: number | null,
  homeTeamName?: string,
  awayTeamName?: string
): { homeScore: number; awayScore: number } {
  if (!events || events.length === 0) {
    return {
      homeScore: fallbackHome !== null && fallbackHome !== undefined ? fallbackHome : 0,
      awayScore: fallbackAway !== null && fallbackAway !== undefined ? fallbackAway : 0,
    };
  }

  const goalEvents = events.filter((e) => e.type === 'goal');
  if (goalEvents.length === 0) {
    return {
      homeScore: fallbackHome !== null && fallbackHome !== undefined ? fallbackHome : 0,
      awayScore: fallbackAway !== null && fallbackAway !== undefined ? fallbackAway : 0,
    };
  }

  let homeScore = 0;
  let awayScore = 0;

  const hSlug = homeTeamName ? sanitizeSlug(homeTeamName) : '';
  const aSlug = awayTeamName ? sanitizeSlug(awayTeamName) : '';

  for (const ev of goalEvents) {
    const evTeamSlug = sanitizeSlug(ev.team || '');

    // Check direct equality or containment
    if (hSlug && (evTeamSlug === hSlug || evTeamSlug.includes(hSlug) || hSlug.includes(evTeamSlug))) {
      homeScore += 1;
    } else if (aSlug && (evTeamSlug === aSlug || evTeamSlug.includes(aSlug) || aSlug.includes(evTeamSlug))) {
      awayScore += 1;
    } else {
      // Fallback heuristics: check if ev.team contains 'bønes' or opponent clues
      const isBonesEv = evTeamSlug.includes('bones') || (ev.team && ev.team.toLowerCase().includes('bønes'));
      const isHomeBones = hSlug.includes('bones') || (homeTeamName && homeTeamName.toLowerCase().includes('bønes'));

      if (isBonesEv && isHomeBones) {
        homeScore += 1;
      } else if (isBonesEv && !isHomeBones) {
        awayScore += 1;
      } else if (!isBonesEv && isHomeBones) {
        awayScore += 1;
      } else if (!isBonesEv && !isHomeBones) {
        homeScore += 1;
      } else {
        homeScore += 1;
      }
    }
  }

  return { homeScore, awayScore };
}

/**
 * Authoritative Top Scorers calculation derived deterministically from MatchEvents.
 * Prioritizes FIKS ID for player deduplication and representation.
 */
export function calculateTopScorers(
  matches: Match[],
  players?: Player[],
  options?: {
    season?: 'all' | 'Vår' | 'Høst';
    teamId?: string;
    bonesOnly?: boolean;
  }
): TopScorer[] {
  const seasonFilter = options?.season || 'all';
  const teamFilter = options?.teamId || 'all';
  const bonesOnly = options?.bonesOnly !== false; // default true

  // Fast player lookup by FIKS ID and by name
  const playerByFiks = new Map<number, Player>();
  const playerByName = new Map<string, Player>();

  if (players) {
    for (const p of players) {
      if (p.fiksId) playerByFiks.set(p.fiksId, p);
      playerByName.set(p.name.trim().toLowerCase(), p);
    }
  }

  const scorersMap = new Map<
    string,
    {
      key: string;
      fiksId?: number;
      id: string;
      name: string;
      teamId: string;
      teamName: string;
      goals: number;
      penalties: number;
      matchesSet: Set<string>;
      isBonesPlayer: boolean;
    }
  >();

  for (const match of matches) {
    // Team filter
    if (teamFilter !== 'all' && match.teamId !== teamFilter) {
      continue;
    }

    // Season filter
    const matchSeason: 'Vår' | 'Høst' = match.season === 'Vår' || match.date < '2026-07-01' ? 'Vår' : 'Høst';
    if (seasonFilter !== 'all' && matchSeason !== seasonFilter) {
      continue;
    }

    if (!match.events || match.events.length === 0) continue;

    for (const ev of match.events) {
      if (ev.type !== 'goal') continue;

      const playerName = (ev.player || '').trim();
      if (!playerName || playerName.toLowerCase().includes('personinfo') || playerName.toLowerCase().includes('ikke tilgjengelig')) {
        continue;
      }

      // Check Bønes player condition
      const isBonesMatch =
        match.teamName.toLowerCase().includes('bønes') ||
        match.homeTeam.toLowerCase().includes('bønes') ||
        match.awayTeam.toLowerCase().includes('bønes');

      const isBonesEvent =
        (ev.team && ev.team.toLowerCase().includes('bønes')) ||
        (match.homeTeam.toLowerCase().includes('bønes') && ev.team === match.homeTeam) ||
        (match.awayTeam.toLowerCase().includes('bønes') && ev.team === match.awayTeam) ||
        (!ev.team && isBonesMatch);

      if (bonesOnly && !isBonesEvent) continue;

      // Resolve player identity
      let resolvedFiksId = ev.fiksId;
      if (!resolvedFiksId && ev.playerId?.startsWith('fiks-')) {
        resolvedFiksId = parseInt(ev.playerId.replace('fiks-', ''), 10);
      }
      if (!resolvedFiksId) {
        const pMatch = playerByName.get(playerName.toLowerCase());
        if (pMatch?.fiksId) resolvedFiksId = pMatch.fiksId;
      }

      const identity = getPlayerIdentity({
        fiksId: resolvedFiksId,
        playerId: ev.playerId,
        name: playerName,
        teamId: match.teamId,
      });

      const isPenalty = (ev.description || '').toLowerCase().includes('straffe');

      let entry = scorersMap.get(identity.key);
      if (!entry) {
        entry = {
          key: identity.key,
          fiksId: identity.isFiks ? resolvedFiksId : undefined,
          id: identity.id,
          name: playerName,
          teamId: match.teamId || 'menn-1',
          teamName: match.teamName || 'Bønes IL',
          goals: 0,
          penalties: 0,
          matchesSet: new Set<string>(),
          isBonesPlayer: isBonesEvent,
        };
        scorersMap.set(identity.key, entry);
      }

      entry.goals += 1;
      if (isPenalty) entry.penalties += 1;
      entry.matchesSet.add(match.id);
    }
  }

  const result: TopScorer[] = Array.from(scorersMap.values()).map((s) => {
    const matchesCount = Math.max(1, s.matchesSet.size);
    const goalsPerMatch = Number((s.goals / matchesCount).toFixed(2));

    return {
      id: s.id,
      name: s.name,
      teamId: s.teamId,
      teamName: s.teamName,
      goals: s.goals,
      matches: matchesCount,
      penalties: s.penalties,
      goalsPerMatch,
      isBonesPlayer: s.isBonesPlayer,
    };
  });

  return result.sort((a, b) => b.goals - a.goals || b.goalsPerMatch - a.goalsPerMatch);
}

/**
 * Authoritative Card & Disciplinary statistics derived deterministically from MatchEvents.
 * Prioritizes FIKS ID for player deduplication.
 */
export function calculateCardStatistics(
  matches: Match[],
  players?: Player[],
  options?: {
    season?: 'all' | 'Vår' | 'Høst';
    teamId?: string;
    bonesOnly?: boolean;
  }
): CardStatistic[] {
  const seasonFilter = options?.season || 'all';
  const teamFilter = options?.teamId || 'all';
  const bonesOnly = options?.bonesOnly !== false;

  const playerByName = new Map<string, Player>();
  if (players) {
    for (const p of players) {
      playerByName.set(p.name.trim().toLowerCase(), p);
    }
  }

  const cardsMap = new Map<
    string,
    {
      key: string;
      fiksId?: number;
      id: string;
      name: string;
      teamId: string;
      teamName: string;
      yellowCards: number;
      redCards: number;
      matchesSet: Set<string>;
      isBonesPlayer: boolean;
    }
  >();

  for (const match of matches) {
    if (teamFilter !== 'all' && match.teamId !== teamFilter) {
      continue;
    }

    const matchSeason: 'Vår' | 'Høst' = match.season === 'Vår' || match.date < '2026-07-01' ? 'Vår' : 'Høst';
    if (seasonFilter !== 'all' && matchSeason !== seasonFilter) {
      continue;
    }

    if (!match.events || match.events.length === 0) continue;

    for (const ev of match.events) {
      if (ev.type !== 'yellow_card' && ev.type !== 'red_card') continue;

      const playerName = (ev.player || '').trim();
      if (!playerName || playerName.toLowerCase().includes('personinfo') || playerName.toLowerCase().includes('ikke tilgjengelig')) {
        continue;
      }

      const isBonesMatch =
        match.teamName.toLowerCase().includes('bønes') ||
        match.homeTeam.toLowerCase().includes('bønes') ||
        match.awayTeam.toLowerCase().includes('bønes');

      const isBonesEvent =
        (ev.team && ev.team.toLowerCase().includes('bønes')) ||
        (match.homeTeam.toLowerCase().includes('bønes') && ev.team === match.homeTeam) ||
        (match.awayTeam.toLowerCase().includes('bønes') && ev.team === match.awayTeam) ||
        (!ev.team && isBonesMatch);

      if (bonesOnly && !isBonesEvent) continue;

      let resolvedFiksId = ev.fiksId;
      if (!resolvedFiksId && ev.playerId?.startsWith('fiks-')) {
        resolvedFiksId = parseInt(ev.playerId.replace('fiks-', ''), 10);
      }
      if (!resolvedFiksId) {
        const pMatch = playerByName.get(playerName.toLowerCase());
        if (pMatch?.fiksId) resolvedFiksId = pMatch.fiksId;
      }

      const identity = getPlayerIdentity({
        fiksId: resolvedFiksId,
        playerId: ev.playerId,
        name: playerName,
        teamId: match.teamId,
      });

      let entry = cardsMap.get(identity.key);
      if (!entry) {
        entry = {
          key: identity.key,
          fiksId: identity.isFiks ? resolvedFiksId : undefined,
          id: identity.id,
          name: playerName,
          teamId: match.teamId || 'menn-1',
          teamName: match.teamName || 'Bønes IL',
          yellowCards: 0,
          redCards: 0,
          matchesSet: new Set<string>(),
          isBonesPlayer: isBonesEvent,
        };
        cardsMap.set(identity.key, entry);
      }

      if (ev.type === 'red_card') {
        entry.redCards += 1;
      } else {
        entry.yellowCards += 1;
      }
      entry.matchesSet.add(match.id);
    }
  }

  const result: CardStatistic[] = Array.from(cardsMap.values()).map((c) => {
    const matchesCount = Math.max(1, c.matchesSet.size);
    const points = c.yellowCards * 1 + c.redCards * 3;

    let status: 'Klar' | 'Advarsel (1 fra soning)' | 'Karantene' = 'Klar';
    if (c.redCards > 0 || c.yellowCards >= 4) {
      status = 'Karantene';
    } else if (c.yellowCards === 3) {
      status = 'Advarsel (1 fra soning)';
    }

    return {
      id: c.id,
      name: c.name,
      teamId: c.teamId,
      teamName: c.teamName,
      yellowCards: c.yellowCards,
      redCards: c.redCards,
      points,
      status,
      matches: matchesCount,
      isBonesPlayer: c.isBonesPlayer,
    };
  });

  return result.sort((a, b) => b.points - a.points || b.yellowCards - a.yellowCards);
}

/**
 * Builds deterministic live feed items from matches and their match events.
 */
export function buildMatchFeed(matches: Match[], limit: number = 40): FeedItem[] {
  const feed: FeedItem[] = [];

  for (const match of matches) {
    if (!match.events || match.events.length === 0) continue;

    for (const ev of match.events) {
      if (ev.type === 'goal') {
        feed.push({
          id: `feed_${ev.id}`,
          timestamp: ev.createdAt || `${match.date}T${match.time}:00Z`,
          timeAgo: `${ev.minute}' minutt`,
          type: 'goal',
          teamId: match.teamId,
          teamName: match.teamName,
          title: `Mål: ${ev.player || ev.team}`,
          description: ev.description || `${ev.minute}' Mål for ${ev.team}`,
          badgeText: `${ev.minute}'`,
          isHomeMatch: match.isHome,
          venue: match.venue,
          score: `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`,
          minute: ev.minute,
          player: ev.player,
          source: ev.source || 'NFF',
          reportedBy: ev.reportedBy,
        });
      } else if (ev.type === 'yellow_card' || ev.type === 'red_card') {
        feed.push({
          id: `feed_${ev.id}`,
          timestamp: ev.createdAt || `${match.date}T${match.time}:00Z`,
          timeAgo: `${ev.minute}' minutt`,
          type: 'card',
          teamId: match.teamId,
          teamName: match.teamName,
          title: ev.type === 'red_card' ? `Rødt kort: ${ev.player || ev.team}` : `Gult kort: ${ev.player || ev.team}`,
          description: ev.description || `${ev.minute}' Kort til ${ev.player || ev.team}`,
          badgeText: `${ev.minute}'`,
          isHomeMatch: match.isHome,
          venue: match.venue,
          minute: ev.minute,
          player: ev.player,
          source: ev.source || 'NFF',
          reportedBy: ev.reportedBy,
        });
      }
    }
  }

  // Sort descending by timestamp/minute
  return feed
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}
