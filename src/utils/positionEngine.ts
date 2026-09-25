import { Match, MatchLineup, Player, PlayerPosition } from '../types.js';

/**
 * Normalizes any free-text or abbreviated position into one of the standard categories:
 * 'Keeper', 'Forsvar', 'Midtbane', 'Angrep', or 'Ukjent'.
 */
export function normalizePosition(raw: string | undefined | null): PlayerPosition {
  if (!raw) return 'Ukjent';
  const s = raw.trim().toLowerCase();

  // Keeper / Goalkeeper
  if (
    s.includes('keeper') ||
    s.includes('målvakt') ||
    s.includes('goalie') ||
    s === 'gk' ||
    s === 'k'
  ) {
    return 'Keeper';
  }

  // Forsvar / Defenders / Backs / Stoppers
  if (
    s.includes('forsvar') ||
    s.includes('stopper') ||
    s.includes('back') ||
    s.includes('midtstopper') ||
    s.includes('høyreback') ||
    s.includes('venstreback') ||
    s === 'cb' ||
    s === 'rb' ||
    s === 'lb' ||
    s === 'def'
  ) {
    return 'Forsvar';
  }

  // Angrep / Forwards / Strikers / Spiss
  if (
    s.includes('spiss') ||
    s.includes('angrep') ||
    s.includes('angriper') ||
    s.includes('forward') ||
    s.includes('striker') ||
    s === 'cf' ||
    s === 'st' ||
    s === 'fwd' ||
    s === 'att'
  ) {
    return 'Angrep';
  }

  // Midtbane / Midfielders / Wings / Kanter
  if (
    s.includes('midtbane') ||
    s.includes('ving') ||
    s.includes('kant') ||
    s.includes('anker') ||
    s.includes('flanke') ||
    s === 'cm' ||
    s === 'cam' ||
    s === 'cdm' ||
    s === 'lm' ||
    s === 'rm' ||
    s === 'mid' ||
    s === 'wing'
  ) {
    return 'Midtbane';
  }

  return 'Ukjent';
}

export interface PositionBreakdownItem {
  position: PlayerPosition;
  count: number;
  percentage: number;
  label: string;
}

export interface PositionStatsSummary {
  mostPlayedPosition: PlayerPosition;
  totalTrackedMatches: number;
  breakdown: PositionBreakdownItem[];
  primaryPositionLabel: string;
  hasMultiplePositions: boolean;
  positionSummaryText: string;
}

/**
 * Determines which position a player played in a given match,
 * based on match lineups, formation role, or events.
 */
export function getPlayerPositionInMatch(
  playerName: string,
  fiksId: number | undefined,
  match: Match,
  fallbackPosition?: string
): PlayerPosition {
  const normTarget = playerName.trim().toLowerCase();

  const searchLineup = (lpList: Player[] | undefined, isStarterList: boolean): PlayerPosition | null => {
    if (!lpList || lpList.length === 0) return null;

    for (let idx = 0; idx < lpList.length; idx++) {
      const p = lpList[idx];
      const matchByName = p.name && p.name.trim().toLowerCase() === normTarget;
      const matchByFiks = fiksId && p.fiksId && p.fiksId === fiksId;

      if (matchByName || matchByFiks) {
        // 1. Explicit normalized position if provided and valid
        if (p.position && p.position !== 'Ukjent' && (p.position as any) !== 'unknown') {
          const norm = normalizePosition(p.position);
          if (norm !== 'Ukjent') return norm;
        }

        // 2. Positional placement in standard starting formation (index-based)
        if (isStarterList) {
          if (idx === 0) return 'Keeper';
          if (idx >= 1 && idx <= 4) return 'Forsvar';
          if (idx >= 5 && idx <= 7) return 'Midtbane';
          if (idx >= 8) return 'Angrep';
        }

        // 3. Fallback to player's general position if defined
        if (fallbackPosition) {
          const fb = normalizePosition(fallbackPosition);
          if (fb !== 'Ukjent') return fb;
        }

        return isStarterList ? 'Midtbane' : 'Midtbane';
      }
    }
    return null;
  };

  // Check home, away, or direct lineup
  const directStarters = match.lineup?.starters;
  const directBench = match.lineup?.bench || match.lineup?.subs;
  const homeStarters = match.homeLineup?.starters;
  const homeBench = match.homeLineup?.bench || match.homeLineup?.subs;
  const awayStarters = match.awayLineup?.starters;
  const awayBench = match.awayLineup?.bench || match.awayLineup?.subs;

  const inStarters =
    searchLineup(directStarters, true) ||
    searchLineup(homeStarters, true) ||
    searchLineup(awayStarters, true);
  if (inStarters) return inStarters;

  const inBench =
    searchLineup(directBench, false) ||
    searchLineup(homeBench, false) ||
    searchLineup(awayBench, false);
  if (inBench) return inBench;

  // Check if player scored in this match (offensive involvement)
  const hadGoals = (match.events || []).some(
    (e) =>
      e.type === 'goal' &&
      ((fiksId && e.fiksId === fiksId) ||
        (e.player && e.player.trim().toLowerCase() === normTarget))
  );

  if (hadGoals) {
    // If fallback is already keeper, preserve keeper (e.g. penalty save or keeper goal), else default to Angrep/Midtbane
    const fb = fallbackPosition ? normalizePosition(fallbackPosition) : 'Ukjent';
    if (fb === 'Keeper') return 'Keeper';
    return fb === 'Forsvar' ? 'Forsvar' : 'Angrep';
  }

  // Fallback to player profile position
  if (fallbackPosition) {
    const fb = normalizePosition(fallbackPosition);
    if (fb !== 'Ukjent') return fb;
  }

  return 'Midtbane';
}

/**
 * Calculates a player's position statistics across all matches in history,
 * and determines the position the player plays THE MOST (mode).
 * 
 * Example from user brief:
 * Player with 10 matches:
 *  1 as keeper
 *  2 as midtbane/ving
 *  7 as angrep/spiss
 *  => Most played: Angrep (Spiss)
 */
export function calculatePlayerPositionStats(
  playerName: string,
  fiksId: number | undefined,
  matches: Match[],
  fallbackPosition?: string
): PositionStatsSummary {
  const normTarget = playerName.trim().toLowerCase();

  const counts: Record<PlayerPosition, number> = {
    Keeper: 0,
    Forsvar: 0,
    Midtbane: 0,
    Angrep: 0,
    Ukjent: 0,
    unknown: 0,
  };

  // Find all matches where the player participated
  const relevantMatches = matches.filter((m) => {
    const allLineup = [
      ...(m.lineup?.starters || []),
      ...(m.lineup?.bench || []),
      ...(m.lineup?.subs || []),
      ...(m.homeLineup?.starters || []),
      ...(m.homeLineup?.bench || []),
      ...(m.homeLineup?.subs || []),
      ...(m.awayLineup?.starters || []),
      ...(m.awayLineup?.bench || []),
      ...(m.awayLineup?.subs || []),
    ];

    const inLp = allLineup.some(
      (p) =>
        (fiksId && p.fiksId === fiksId) ||
        (p.name && p.name.trim().toLowerCase() === normTarget)
    );
    if (inLp) return true;

    const inEv = (m.events || []).some(
      (e) =>
        (fiksId && e.fiksId === fiksId) ||
        (e.player && e.player.trim().toLowerCase() === normTarget)
    );
    return inEv;
  });

  for (const m of relevantMatches) {
    const pos = getPlayerPositionInMatch(playerName, fiksId, m, fallbackPosition);
    counts[pos] = (counts[pos] || 0) + 1;
  }

  const totalTracked =
    counts.Keeper + counts.Forsvar + counts.Midtbane + counts.Angrep + counts.Ukjent;

  // Determine the most played position
  let mostPlayed: PlayerPosition = 'Ukjent';
  let maxCount = -1;

  // Priority order if tied: Angrep > Midtbane > Forsvar > Keeper (or registered position)
  const posOrder: PlayerPosition[] = ['Angrep', 'Midtbane', 'Forsvar', 'Keeper'];

  // If player has registered fallback position, check that first as initial candidate
  const normFallback = fallbackPosition ? normalizePosition(fallbackPosition) : 'Ukjent';
  if (normFallback !== 'Ukjent') {
    mostPlayed = normFallback;
  }

  for (const pos of posOrder) {
    if (counts[pos] > maxCount) {
      maxCount = counts[pos];
      mostPlayed = pos;
    }
  }

  // If no matches recorded yet, default to fallbackPosition
  if (totalTracked === 0 && normFallback !== 'Ukjent') {
    mostPlayed = normFallback;
  } else if (mostPlayed === 'Ukjent') {
    mostPlayed = normFallback !== 'Ukjent' ? normFallback : 'Midtbane';
  }

  // Build breakdown list sorted by match count descending
  const breakdown: PositionBreakdownItem[] = (
    ['Angrep', 'Midtbane', 'Forsvar', 'Keeper'] as PlayerPosition[]
  )
    .filter((pos) => counts[pos] > 0)
    .sort((a, b) => counts[b] - counts[a])
    .map((pos) => {
      const count = counts[pos];
      const pct = totalTracked > 0 ? Math.round((count / totalTracked) * 100) : 100;
      let label = pos as string;
      if (pos === 'Angrep') label = 'Angrep / Spiss';
      else if (pos === 'Midtbane') label = 'Midtbane / Ving';
      else if (pos === 'Forsvar') label = 'Forsvar';
      else if (pos === 'Keeper') label = 'Målvakt / Keeper';
      return {
        position: pos,
        count,
        percentage: pct,
        label,
      };
    });

  const hasMultiplePositions = breakdown.length > 1;

  // User-friendly summary text
  const positionSummaryText =
    breakdown.length > 0
      ? `Mest spilt: ${mostPlayed} (${counts[mostPlayed]} kamper)${
          hasMultiplePositions
            ? ` • ` +
              breakdown
                .filter((b) => b.position !== mostPlayed)
                .map((b) => `${b.position} (${b.count})`)
                .join(' • ')
            : ''
        }`
      : `Posisjon: ${mostPlayed}`;

  return {
    mostPlayedPosition: mostPlayed,
    totalTrackedMatches: totalTracked,
    breakdown,
    primaryPositionLabel:
      mostPlayed === 'Angrep'
        ? 'Spiss'
        : mostPlayed === 'Midtbane'
        ? 'Midtbane'
        : mostPlayed === 'Forsvar'
        ? 'Forsvar'
        : mostPlayed === 'Keeper'
        ? 'Keeper'
        : 'Spiller',
    hasMultiplePositions,
    positionSummaryText,
  };
}

/**
 * Enriches players in a squad so their `position` field dynamically reflects
 * the position they have played THE MOST across real match lineups.
 */
export function enrichPlayersWithMostPlayedPosition(
  players: Player[],
  matches: Match[]
): Player[] {
  if (!matches || matches.length === 0) return players;

  return players.map((p) => {
    const stats = calculatePlayerPositionStats(p.name, p.fiksId, matches, p.position);
    return {
      ...p,
      position: stats.mostPlayedPosition,
      positionSource: stats.totalTrackedMatches > 0 ? 'NFF' : p.positionSource,
    };
  });
}
