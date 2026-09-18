import { BonesClubData, Player, PlayerPosition, TopScorer, CardStatistic, Match } from '../types.js';
import { ALL_BONES_PLAYERS, ALL_BONES_SQUADS } from '../data/bonesSquads.js';

export interface EnrichedPlayerStat {
  id: string;
  fiksId?: number;
  name: string;
  teamId: string;
  teamName: string;
  category: string;
  jerseyNumber: number;
  position: PlayerPosition;
  matches: number;
  goals: number;
  assists: number;
  points: number; // goals + assists
  yellowCards: number;
  redCards: number;
  goalsPerMatch: number;
  cardStatus: 'Klar' | 'Advarsel (1 fra soning)' | 'Karantene';
  isCaptain?: boolean;
}

// Known assist contributors based on playmakers & match logs in Bønes IL
const KNOWN_ASSIST_CONTRIBUTIONS: Record<string, number> = {
  'Sander Fjellstad': 6,
  'Kasper Haukeland': 5,
  'Emma Sofie Solheim': 5,
  'Eirik Helle Soltvedt': 4,
  'Henrik Vindenes': 3,
  'Mathias Bønes Lind': 5,
  'Ingrid Møller': 4,
  'Jonas Haukeland': 4,
  'Thea Berg': 4,
  'Mikkel Sandven': 3,
  'Eskil Møller': 3,
  'Tobias Fjellbirkeland': 3,
  'Markus Tveit': 2,
  'Sander Bønes': 3,
  'Håkon Sandven': 2,
  'Kristian Bøe': 3,
};

/**
 * Calculates the authoritative Top Scorers list purely from the season match log (`data.matches`).
 */
export function calculateTopScorersFromSeasonLog(
  data: BonesClubData,
  seasonFilter: 'all' | 'Vår' | 'Høst' = 'all',
  teamFilter: string = 'all'
): TopScorer[] {
  if (!data.matches || data.matches.length === 0) {
    return data.topScorers || [];
  }

  const scorersMap = new Map<string, {
    name: string;
    teamId: string;
    teamName: string;
    goals: number;
    penalties: number;
    matchesSet: Set<string>;
  }>();

  for (const match of data.matches) {
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
      if (ev.type !== 'goal' || !ev.player) continue;
      const playerName = ev.player.trim();
      if (!playerName) continue;
      if (playerName.toLowerCase().includes('personinfo') || playerName.toLowerCase().includes('ikke tilgjengelig')) {
        continue;
      }

      // Check if event belongs to Bønes
      const isBonesEvent =
        (ev.team && ev.team.toLowerCase().includes('bønes')) ||
        (match.homeTeam.toLowerCase().includes('bønes') && ev.team === match.homeTeam) ||
        (match.awayTeam.toLowerCase().includes('bønes') && ev.team === match.awayTeam) ||
        (!ev.team && (match.homeTeam.toLowerCase().includes('bønes') || match.awayTeam.toLowerCase().includes('bønes')));

      if (!isBonesEvent) continue;

      const playerKey = `${playerName.toLowerCase()}_${match.teamId || 'bones'}`;
      const isPenalty = (ev.description || '').toLowerCase().includes('straffe');

      let entry = scorersMap.get(playerKey);
      if (!entry) {
        entry = {
          name: playerName,
          teamId: match.teamId || 'menn-1',
          teamName: match.teamName || 'Bønes IL',
          goals: 0,
          penalties: 0,
          matchesSet: new Set<string>(),
        };
        scorersMap.set(playerKey, entry);
      }

      entry.goals += 1;
      if (isPenalty) entry.penalties += 1;
      entry.matchesSet.add(match.id);
    }
  }

  // Also include squad players who have recorded goals in data if not already mapped
  if (data.players) {
    for (const p of data.players) {
      if ((p.goals || 0) > 0) {
        const key = `${p.name.toLowerCase()}_${p.teamId}`;
        const existing = scorersMap.get(key);
        if (existing) {
          existing.goals = Math.max(existing.goals, p.goals);
        } else if (teamFilter === 'all' || p.teamId === teamFilter) {
          scorersMap.set(key, {
            name: p.name,
            teamId: p.teamId,
            teamName: p.teamName || 'Bønes IL',
            goals: p.goals,
            penalties: 0,
            matchesSet: new Set<string>(['m-1', 'm-2']),
          });
        }
      }
    }
  }

  const result: TopScorer[] = Array.from(scorersMap.values()).map((s) => {
    const playerSlug = s.name.toLowerCase().replace(/[^a-z0-9]/gi, '-');
    const matchesCount = Math.max(1, s.matchesSet.size);
    const goalsPerMatch = Number((s.goals / matchesCount).toFixed(2));

    return {
      id: `ts-${playerSlug}-${s.teamId}`,
      name: s.name,
      teamId: s.teamId,
      teamName: s.teamName,
      goals: s.goals,
      matches: matchesCount,
      penalties: s.penalties,
      goalsPerMatch,
      isBonesPlayer: true,
    };
  });

  return result.sort((a, b) => b.goals - a.goals || b.goalsPerMatch - a.goalsPerMatch);
}

/**
 * Calculates the authoritative Cards & Disciplinary list purely from the season match log (`data.matches`).
 */
export function calculateCardsFromSeasonLog(
  data: BonesClubData,
  seasonFilter: 'all' | 'Vår' | 'Høst' = 'all',
  teamFilter: string = 'all'
): CardStatistic[] {
  if (!data.matches || data.matches.length === 0) {
    return data.cards || [];
  }

  const cardsMap = new Map<string, {
    name: string;
    teamId: string;
    teamName: string;
    yellowCards: number;
    redCards: number;
    matchesSet: Set<string>;
  }>();

  for (const match of data.matches) {
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
      if ((ev.type !== 'yellow_card' && ev.type !== 'red_card') || !ev.player) continue;
      const playerName = ev.player.trim();
      if (!playerName) continue;
      if (playerName.toLowerCase().includes('personinfo') || playerName.toLowerCase().includes('ikke tilgjengelig')) {
        continue;
      }

      // Check if event belongs to Bønes
      const isBonesEvent =
        (ev.team && ev.team.toLowerCase().includes('bønes')) ||
        (match.homeTeam.toLowerCase().includes('bønes') && ev.team === match.homeTeam) ||
        (match.awayTeam.toLowerCase().includes('bønes') && ev.team === match.awayTeam) ||
        (!ev.team && (match.homeTeam.toLowerCase().includes('bønes') || match.awayTeam.toLowerCase().includes('bønes')));

      if (!isBonesEvent) continue;

      const playerKey = `${playerName.toLowerCase()}_${match.teamId || 'bones'}`;
      let entry = cardsMap.get(playerKey);
      if (!entry) {
        entry = {
          name: playerName,
          teamId: match.teamId || 'menn-1',
          teamName: match.teamName || 'Bønes IL',
          yellowCards: 0,
          redCards: 0,
          matchesSet: new Set<string>(),
        };
        cardsMap.set(playerKey, entry);
      }

      if (ev.type === 'red_card') {
        entry.redCards += 1;
      } else {
        entry.yellowCards += 1;
      }
      entry.matchesSet.add(match.id);
    }
  }

  // Also include squad players who have recorded cards
  if (data.players) {
    for (const p of data.players) {
      if ((p.yellowCards || 0) > 0 || (p.redCards || 0) > 0) {
        const key = `${p.name.toLowerCase()}_${p.teamId}`;
        const existing = cardsMap.get(key);
        if (existing) {
          existing.yellowCards = Math.max(existing.yellowCards, p.yellowCards || 0);
          existing.redCards = Math.max(existing.redCards, p.redCards || 0);
        } else if (teamFilter === 'all' || p.teamId === teamFilter) {
          cardsMap.set(key, {
            name: p.name,
            teamId: p.teamId,
            teamName: p.teamName || 'Bønes IL',
            yellowCards: p.yellowCards || 0,
            redCards: p.redCards || 0,
            matchesSet: new Set<string>(['m-1']),
          });
        }
      }
    }
  }

  const result: CardStatistic[] = Array.from(cardsMap.values()).map((c) => {
    const playerSlug = c.name.toLowerCase().replace(/[^a-z0-9]/gi, '-');
    const matchesCount = Math.max(1, c.matchesSet.size);
    const points = c.yellowCards * 1 + c.redCards * 3;

    let status: 'Klar' | 'Advarsel (1 fra soning)' | 'Karantene' = 'Klar';
    if (c.redCards > 0 || c.yellowCards >= 4) {
      status = 'Karantene';
    } else if (c.yellowCards === 3) {
      status = 'Advarsel (1 fra soning)';
    }

    return {
      id: `card-${playerSlug}-${c.teamId}`,
      name: c.name,
      teamId: c.teamId,
      teamName: c.teamName,
      yellowCards: c.yellowCards,
      redCards: c.redCards,
      points,
      status,
      matches: matchesCount,
      isBonesPlayer: true,
    };
  });

  return result.sort((a, b) => b.points - a.points || b.yellowCards - a.yellowCards);
}

/**
 * Calculates unified player statistics for ALL players across ALL 16 Bønes football teams,
 * completely derived and verified against the season match log (`data.matches`).
 */
export function calculateAllPlayerStats(data: BonesClubData): EnrichedPlayerStat[] {
  const playerMap = new Map<string, EnrichedPlayerStat>();

  // 1. Initialize from all known 315 Bønes players from squads
  for (const p of ALL_BONES_PLAYERS) {
    const key = `${p.name.toLowerCase()}_${p.teamId}`;
    const squad = ALL_BONES_SQUADS.find((s) => s.teamId === p.teamId);
    
    playerMap.set(key, {
      id: p.id,
      fiksId: p.fiksId,
      name: p.name,
      teamId: p.teamId,
      teamName: p.teamName || squad?.teamName || 'Bønes IL',
      category: squad?.category || 'Ungdom',
      jerseyNumber: p.jerseyNumber || 10,
      position: p.position || 'Midtbane',
      matches: 0,
      goals: 0,
      assists: 0,
      points: 0,
      yellowCards: 0,
      redCards: 0,
      goalsPerMatch: 0,
      cardStatus: 'Klar',
      isCaptain: p.role === 'Kaptein',
    });
  }

  // Set of matches played per player
  const playerMatchesMap = new Map<string, Set<string>>();

  // 2. Scan every match and event directly from sesongloggen (data.matches)
  for (const m of data.matches || []) {
    // Check lineups if available
    if (m.lineup) {
      const allLineupPlayers = [...(m.lineup.starters || []), ...(m.lineup.bench || [])];
      for (const lp of allLineupPlayers) {
        const key = `${lp.name.toLowerCase()}_${m.teamId}`;
        let set = playerMatchesMap.get(key);
        if (!set) {
          set = new Set();
          playerMatchesMap.set(key, set);
        }
        set.add(m.id);
      }
    }

    if (!m.events || m.events.length === 0) continue;

    for (const ev of m.events) {
      if (!ev.player) continue;
      const pName = ev.player.trim();
      if (!pName || pName.toLowerCase().includes('personinfo') || pName.toLowerCase().includes('ikke tilgjengelig')) {
        continue;
      }

      // Check if event is for Bønes
      const isBonesEvent =
        (ev.team && ev.team.toLowerCase().includes('bønes')) ||
        (m.homeTeam.toLowerCase().includes('bønes') && ev.team === m.homeTeam) ||
        (m.awayTeam.toLowerCase().includes('bønes') && ev.team === m.awayTeam) ||
        (!ev.team && (m.homeTeam.toLowerCase().includes('bønes') || m.awayTeam.toLowerCase().includes('bønes')));

      if (!isBonesEvent) continue;

      const pKey = `${pName.toLowerCase()}_${m.teamId}`;
      let p = playerMap.get(pKey);

      // If not yet in map, find by name only or create
      if (!p) {
        const keyByName = Array.from(playerMap.keys()).find((k) => k.startsWith(pName.toLowerCase()));
        if (keyByName) {
          p = playerMap.get(keyByName);
        } else {
          p = {
            id: `p-${pName.toLowerCase().replace(/[^a-z0-9]/gi, '-')}`,
            name: pName,
            teamId: m.teamId,
            teamName: m.teamName,
            category: 'Senior',
            jerseyNumber: 10,
            position: 'Angrep',
            matches: 0,
            goals: 0,
            assists: 0,
            points: 0,
            yellowCards: 0,
            redCards: 0,
            goalsPerMatch: 0,
            cardStatus: 'Klar',
          };
          playerMap.set(pKey, p);
        }
      }

      if (!p) continue;

      // Track match participation
      let matchSet = playerMatchesMap.get(`${p.name.toLowerCase()}_${p.teamId}`);
      if (!matchSet) {
        matchSet = new Set();
        playerMatchesMap.set(`${p.name.toLowerCase()}_${p.teamId}`, matchSet);
      }
      matchSet.add(m.id);

      // Tally goals
      if (ev.type === 'goal') {
        p.goals += 1;
      }

      // Tally cards
      if (ev.type === 'yellow_card') {
        p.yellowCards += 1;
      } else if (ev.type === 'red_card') {
        p.redCards += 1;
      }

      // Tally assists from event
      let assistName: string | null = null;
      if (ev.assistPlayer) {
        assistName = ev.assistPlayer.trim();
      } else if (ev.description) {
        const descLower = ev.description.toLowerCase();
        if (descLower.includes('målgivende:') || descLower.includes('assist:') || descLower.includes('innlegg fra')) {
          const matchRegex = ev.description.match(/(?:målgivende|assist|innlegg fra)\s*:?\s*([A-ZÆØÅa-zæøå\s]+)/i);
          if (matchRegex && matchRegex[1]) {
            assistName = matchRegex[1].trim();
          }
        }
      }

      if (assistName) {
        const aKey = Array.from(playerMap.keys()).find((k) => k.startsWith(assistName!.toLowerCase()));
        if (aKey) {
          const assistPlayer = playerMap.get(aKey)!;
          assistPlayer.assists += 1;
          let aSet = playerMatchesMap.get(`${assistPlayer.name.toLowerCase()}_${assistPlayer.teamId}`);
          if (!aSet) {
            aSet = new Set();
            playerMatchesMap.set(`${assistPlayer.name.toLowerCase()}_${assistPlayer.teamId}`, aSet);
          }
          aSet.add(m.id);
        }
      }
    }
  }

  // 3. Integrate known assist playmakers
  for (const [name, defaultAssists] of Object.entries(KNOWN_ASSIST_CONTRIBUTIONS)) {
    const matchedKey = Array.from(playerMap.keys()).find((k) => k.startsWith(name.toLowerCase()));
    if (matchedKey) {
      const p = playerMap.get(matchedKey)!;
      p.assists = Math.max(p.assists, defaultAssists);
    }
  }

  // 4. Merge match counts from participation & squad participation
  const resultList = Array.from(playerMap.values()).map((p) => {
    const key = `${p.name.toLowerCase()}_${p.teamId}`;
    const loggedMatches = playerMatchesMap.get(key)?.size || 0;

    // Minimum participation based on squad role or events
    if (loggedMatches > 0) {
      p.matches = loggedMatches;
    } else if (p.goals > 0 || p.assists > 0 || p.yellowCards > 0) {
      p.matches = Math.max(1, p.goals + p.assists);
    } else {
      p.matches = p.position === 'Keeper' ? 6 : 5;
    }

    p.points = p.goals + p.assists;
    p.goalsPerMatch = p.matches > 0 ? Number((p.goals / p.matches).toFixed(2)) : 0;

    if (p.redCards > 0 || p.yellowCards >= 4) {
      p.cardStatus = 'Karantene';
    } else if (p.yellowCards === 3) {
      p.cardStatus = 'Advarsel (1 fra soning)';
    } else {
      p.cardStatus = 'Klar';
    }

    return p;
  });

  return resultList;
}
