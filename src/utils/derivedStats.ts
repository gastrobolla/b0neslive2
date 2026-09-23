import { Match, MatchEvent, Player, TopScorer, CardStatistic, FeedItem, FeedItemType } from '../types.js';
import { calculateMatchPOTM } from './potmCalculator.js';
import {
  toCanonicalPlayerId,
  extractNumericFiksId,
  resolvePlayerIdentity,
  sanitizePlayerNameSlug,
} from './playerResolver.js';

/**
 * Normalizes an arbitrary text string to a safe, URL-friendly slug.
 */
export function sanitizeSlug(text: string): string {
  return sanitizePlayerNameSlug(text);
}

/**
 * Resolves an authoritative canonical player key prioritizing numeric FIKS ID.
 * NOTE: teamId is strictly NEVER part of a person's canonical identity.
 */
export function getPlayerIdentity(player: {
  fiksId?: number | null;
  id?: string | null;
  playerId?: string | null;
  name?: string | null;
  teamId?: string | null;
}): { key: string; isFiks: boolean; id: string; name: string } {
  const displayName = (player.name || 'Ukjent spiller').trim();
  const numFiks =
    extractNumericFiksId(player.fiksId) ||
    extractNumericFiksId(player.playerId) ||
    extractNumericFiksId(player.id);

  if (numFiks) {
    return {
      key: `fiks_${numFiks}`,
      isFiks: true,
      id: `fiks-${numFiks}`,
      name: displayName,
    };
  }

  const canon = toCanonicalPlayerId(player.playerId || player.id, displayName);
  const fid = canon.startsWith('fiks-') ? extractNumericFiksId(canon) : undefined;

  return {
    key: fid ? `fiks_${fid}` : canon,
    isFiks: !!fid,
    id: canon,
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

      // Ambiguity Guardrail: Skip ambiguous events so goals are never misattributed
      if (ev.ambiguous) continue;

      const lineupList = [
        ...(match.lineup?.starters || []),
        ...(match.lineup?.bench || []),
        ...(match.homeLineup?.starters || []),
        ...(match.awayLineup?.starters || []),
      ];

      const res = resolvePlayerIdentity(
        {
          fiksId: ev.fiksId,
          playerId: ev.playerId,
          name: playerName,
        },
        {
          lineupPlayers: lineupList,
          squadPlayers: players,
          allClubPlayers: players,
        }
      );

      if (res.isAmbiguous) {
        continue;
      }

      const canonicalId = res.canonicalId || toCanonicalPlayerId(ev.playerId, playerName);
      const identityKey = res.fiksId ? `fiks_${res.fiksId}` : canonicalId;
      const isPenalty = (ev.description || '').toLowerCase().includes('straffe');

      let entry = scorersMap.get(identityKey);
      if (!entry) {
        entry = {
          key: identityKey,
          fiksId: res.fiksId,
          id: canonicalId,
          name: res.displayName || playerName,
          teamId: match.teamId || 'menn-1',
          teamName: match.teamName || 'Bønes IL',
          goals: 0,
          penalties: 0,
          matchesSet: new Set<string>(),
          isBonesPlayer: isBonesEvent,
        };
        scorersMap.set(identityKey, entry);
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
      fiksId: s.fiksId,
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

      // Ambiguity Guardrail: Skip ambiguous events so cards are never misattributed
      if (ev.ambiguous) continue;

      const lineupList = [
        ...(match.lineup?.starters || []),
        ...(match.lineup?.bench || []),
        ...(match.homeLineup?.starters || []),
        ...(match.awayLineup?.starters || []),
      ];

      const res = resolvePlayerIdentity(
        {
          fiksId: ev.fiksId,
          playerId: ev.playerId,
          name: playerName,
        },
        {
          lineupPlayers: lineupList,
          squadPlayers: players,
          allClubPlayers: players,
        }
      );

      if (res.isAmbiguous) {
        continue;
      }

      const canonicalId = res.canonicalId || toCanonicalPlayerId(ev.playerId, playerName);
      const identityKey = res.fiksId ? `fiks_${res.fiksId}` : canonicalId;

      let entry = cardsMap.get(identityKey);
      if (!entry) {
        entry = {
          key: identityKey,
          fiksId: res.fiksId,
          id: canonicalId,
          name: res.displayName || playerName,
          teamId: match.teamId || 'menn-1',
          teamName: match.teamName || 'Bønes IL',
          yellowCards: 0,
          redCards: 0,
          matchesSet: new Set<string>(),
          isBonesPlayer: isBonesEvent,
        };
        cardsMap.set(identityKey, entry);
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
      fiksId: c.fiksId,
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
    // Generate 'Banens Beste' status event for finished matches
    if (match.status === 'finished') {
      const potm = match.playerOfTheMatch || calculateMatchPOTM(match);
      const winner = potm?.candidates?.find((c) => c.playerName === potm.winnerName) || potm?.candidates?.[0];
      if (winner) {
        feed.push({
          id: `feed_potm_${match.id}`,
          timestamp: match.date ? `${match.date}T${match.time || '18:00'}:00Z` : new Date().toISOString(),
          timeAgo: 'Ferdigspilt',
          type: 'potm',
          teamId: match.teamId,
          teamName: match.teamName,
          title: `Sluttresultat: ${match.homeTeam} ${match.homeScore ?? 0} - ${match.awayScore ?? 0} ${match.awayTeam}`,
          description: `Kampen er ferdigspilt. Banens Beste ble kåret til ${winner.playerName} (${winner.algoRating.toFixed(1)} ★) med ${winner.votes || 0} stemmer.`,
          badgeText: 'Banens Beste',
          isHomeMatch: match.isHome,
          venue: match.venue,
          score: `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`,
          player: winner.playerName,
          matchId: match.id,
          match,
          potmWinner: {
            name: winner.playerName,
            rating: winner.algoRating,
            votes: winner.votes || 0,
            team: winner.team,
            position: winner.position,
            totalVotes: potm.totalVotes,
            combinedScore: winner.combinedScore
          },
          impact: {
            type: 'potm',
            detail: `Banens Beste: ${winner.playerName} (★ ${winner.algoRating.toFixed(1)})`
          }
        });
      }
    }

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
