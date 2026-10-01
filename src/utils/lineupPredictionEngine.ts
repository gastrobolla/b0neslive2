import { Match, MatchLineup, Player } from '../types.js';

export interface ResolvedTeamLineup {
  teamName: string;
  isHome: boolean;
  isConfirmed: boolean;
  isPredicted: boolean;
  formation: string;
  starters: Player[];
  bench: Player[];
  coach: string;
  sourceDescription: string;
  previousOpponent?: string;
  previousMatchDate?: string;
}

/**
 * Resolves the lineup for a team in a match.
 * If the match has a confirmed official lineup in FIKS (or is finished/live), it uses the confirmed lineup.
 * If not, it automatically predicts the lineup by retrieving the previous starting lineup in the same formation,
 * which dynamically updates as soon as the official squad is reported to FIKS.
 */
export function resolveTeamLineup(
  teamSide: 'home' | 'away',
  match: Match | null | undefined,
  allMatches: Match[] = []
): ResolvedTeamLineup {
  const isHome = teamSide === 'home';
  if (!match) {
    return {
      teamName: '',
      isHome,
      isConfirmed: false,
      isPredicted: true,
      formation: '4-3-3',
      starters: [],
      bench: [],
      coach: '',
      sourceDescription: '',
    };
  }

  const teamName = (isHome ? match.homeTeam : match.awayTeam) || '';
  const isBones = teamName.toLowerCase().includes('bønes');

  // Check direct or side-specific lineup on current match
  const directLineup: MatchLineup | undefined =
    isHome
      ? (match.homeLineup || (isBones ? match.lineup : undefined))
      : (match.awayLineup || (isBones ? match.lineup : undefined));

  const hasConfirmedLineup = Boolean(
    (directLineup && directLineup.starters && directLineup.starters.length > 0 && (
      (directLineup as any).isOfficial ||
      directLineup.starters.some((s) => s.fiksId) ||
      match.status === 'finished' ||
      match.status === 'live'
    ))
  );

  if (hasConfirmedLineup && directLineup) {
    const starters = directLineup.starters || [];
    const bench = directLineup.bench || directLineup.subs || [];
    const formation = directLineup.formation || inferFormationFromStarters(starters);
    const coach = directLineup.coach || (isBones ? 'Bønes Trenerteam' : `${teamName} Trenerteam`);

    return {
      teamName,
      isHome,
      isConfirmed: true,
      isPredicted: false,
      formation,
      starters,
      bench,
      coach,
      sourceDescription: 'Offisielt bekreftet i NFF FIKS kampskjema',
    };
  }

  // PREDICTED LINEUP: Find previous match for this team
  const normTeamName = teamName.trim().toLowerCase();
  const pastMatches = (allMatches || [])
    .filter((m) => {
      if (m.id === match.id) return false;
      const mDate = m.date || '';
      const currDate = match.date || '';
      const isPastOrEqual = mDate <= currDate;
      const isCompleted = m.status === 'finished' || m.status === 'live';

      const isSameTeam =
        (isBones && m.teamId && match.teamId && m.teamId === match.teamId) ||
        (m.homeTeam && m.homeTeam.trim().toLowerCase().includes(normTeamName)) ||
        (m.awayTeam && m.awayTeam.trim().toLowerCase().includes(normTeamName));

      return isPastOrEqual && isCompleted && isSameTeam;
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  for (const prevMatch of pastMatches) {
    const prevIsHome = (prevMatch.homeTeam || '').toLowerCase().includes(normTeamName);
    const prevLineup: MatchLineup | undefined =
      prevIsHome
        ? (prevMatch.homeLineup || prevMatch.lineup)
        : (prevMatch.awayLineup || prevMatch.lineup);

    if (prevLineup && prevLineup.starters && prevLineup.starters.length > 0) {
      const prevOpponent = prevIsHome ? prevMatch.awayTeam : prevMatch.homeTeam;
      const formation = prevLineup.formation || inferFormationFromStarters(prevLineup.starters);
      const coach = prevLineup.coach || (isBones ? 'Bønes Trenerteam' : `${teamName} Trenerteam`);

      return {
        teamName,
        isHome,
        isConfirmed: false,
        isPredicted: true,
        formation,
        starters: prevLineup.starters,
        bench: prevLineup.bench || prevLineup.subs || [],
        coach,
        previousOpponent: prevOpponent,
        previousMatchDate: prevMatch.date,
        sourceDescription: `Forventet oppstilling basert på forrige kamp mot ${prevOpponent}${prevMatch.date ? ` (${prevMatch.date})` : ''} i ${formation}`,
      };
    }
  }

  // Fallback if existing directLineup has any starters even without official tag
  if (directLineup && directLineup.starters && directLineup.starters.length > 0) {
    const starters = directLineup.starters;
    const bench = directLineup.bench || directLineup.subs || [];
    const formation = directLineup.formation || inferFormationFromStarters(starters);
    const coach = directLineup.coach || (isBones ? 'Bønes Trenerteam' : `${teamName} Trenerteam`);

    return {
      teamName,
      isHome,
      isConfirmed: false,
      isPredicted: true,
      formation,
      starters,
      bench,
      coach,
      sourceDescription: 'Foreløpig registrert oppstilling',
    };
  }

  // Ultimate fallback to synthetic squad players
  const defaultFormation = '4-3-3';
  return {
    teamName,
    isHome,
    isConfirmed: false,
    isPredicted: true,
    formation: defaultFormation,
    starters: [],
    bench: [],
    coach: isBones ? 'Bønes Trenerteam' : `${teamName} Trenerteam`,
    sourceDescription: 'Venter på tropp fra NFF FIKS',
  };
}

/**
 * Infers formation string like 4-3-3, 3-4-2-1, 3-3-2 based on starters count and positions
 */
export function inferFormationFromStarters(starters: Player[]): string {
  if (!starters || starters.length === 0) return '4-3-3';
  const n = starters.length;

  if (n <= 7) return '2-3-1';
  if (n <= 9) return '3-3-2';

  const defenders = starters.filter((p) => p.position === 'Forsvar').length;
  const midfielders = starters.filter((p) => p.position === 'Midtbane').length;
  const forwards = starters.filter((p) => p.position === 'Angrep').length;

  if (defenders > 0 && midfielders > 0 && forwards > 0) {
    return `${defenders}-${midfielders}-${forwards}`;
  }

  return '4-3-3';
}

export interface PitchSlotPosition {
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  role: 'GK' | 'DEF' | 'MID' | 'ATT';
}

/**
 * Calculates (x, y) coordinates for all players on a dual-team horizontal Sofascore football pitch.
 * Home team occupies the left half (0 - 50%), attacking right.
 * Away team occupies the right half (50 - 100%), attacking left.
 */
export function calculatePitchCoordinates(
  formationStr: string,
  teamSide: 'home' | 'away',
  playerCount: number = 11
): PitchSlotPosition[] {
  const isHome = teamSide === 'home';
  const cleanFormation = formationStr.replace(/[^\d-]/g, '').trim() || (playerCount <= 9 ? '3-3-2' : '4-3-3');
  const lines = cleanFormation
    .split('-')
    .map((s) => parseInt(s, 10))
    .filter((n) => !isNaN(n) && n > 0);

  const numLines = lines.length || 3;
  const slots: PitchSlotPosition[] = [];

  // Goalkeeper (slot 0)
  slots.push({
    x: isHome ? 5 : 95,
    y: 50,
    role: 'GK',
  });

  // Outfield lines
  for (let lineIdx = 0; lineIdx < numLines; lineIdx++) {
    const playersInLine = lines[lineIdx];
    const isDef = lineIdx === 0;
    const isAtt = lineIdx === numLines - 1;
    const role: 'DEF' | 'MID' | 'ATT' = isDef ? 'DEF' : isAtt ? 'ATT' : 'MID';

    // X placement:
    // Home: 15% (first def line) up to 43% (final att line)
    // Away: 85% (first def line) down to 57% (final att line)
    const progress = numLines > 1 ? lineIdx / (numLines - 1) : 0.5;
    const x = isHome
      ? 14 + progress * 29
      : 86 - progress * 29;

    // Y placement evenly spread vertically between 14% and 86%
    for (let pIdx = 0; pIdx < playersInLine; pIdx++) {
      let y = 50;
      if (playersInLine > 1) {
        y = 15 + (pIdx / (playersInLine - 1)) * 70;
      }
      slots.push({
        x: parseFloat(x.toFixed(1)),
        y: parseFloat(y.toFixed(1)),
        role,
      });
    }
  }

  // If playerCount exceeds slots, append remaining on mid
  while (slots.length < playerCount) {
    slots.push({
      x: isHome ? 32 : 68,
      y: 50,
      role: 'MID',
    });
  }

  return slots;
}
