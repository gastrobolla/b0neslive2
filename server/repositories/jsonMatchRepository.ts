import {
  Match,
  MatchEvent,
  MatchLineup,
  Player,
  BonesClubData,
} from '../../src/types.js';
import {
  IMatchRepository,
  IPlayerRepository,
  MatchFilter,
} from './matchRepository.js';
import {
  loadPersistedData,
  savePersistedData,
  upsertMatch,
  upsertMatches,
  queryMatches,
  mergeMatchEvents,
} from '../storage.js';
import { calculateMatchScore } from '../../src/utils/derivedStats.js';

export class JsonMatchRepository implements IMatchRepository, IPlayerRepository {
  private data: BonesClubData;

  constructor() {
    this.data = loadPersistedData();
  }

  public getRawData(): BonesClubData {
    return this.data;
  }

  public async getAllMatches(): Promise<Match[]> {
    return [...this.data.matches];
  }

  public async getMatchById(id: string): Promise<Match | undefined> {
    return this.data.matches.find((m) => m.id === id);
  }

  public async queryMatches(filters: MatchFilter): Promise<Match[]> {
    return queryMatches(this.data, filters);
  }

  public async upsertMatch(match: Match): Promise<Match> {
    const updated = upsertMatch(match, this.data);
    savePersistedData(this.data);
    return updated;
  }

  public async upsertMatches(matches: Match[]): Promise<{ added: number; updated: number }> {
    const res = upsertMatches(matches, this.data);
    savePersistedData(this.data);
    return res;
  }

  public async updateMatchEvents(matchId: string, events: MatchEvent[]): Promise<Match> {
    const match = this.data.matches.find((m) => m.id === matchId);
    if (!match) {
      throw new Error(`Match with id ${matchId} not found`);
    }

    // Merge incoming events with existing supplementary notes/comments
    const merged = mergeMatchEvents(match.events || [], events, matchId);
    match.events = merged;

    // Derived score
    if (merged.some((e) => e.type === 'goal')) {
      const derived = calculateMatchScore(
        merged,
        match.homeScore,
        match.awayScore,
        match.homeTeam,
        match.awayTeam
      );
      match.homeScore = derived.homeScore;
      match.awayScore = derived.awayScore;
    }

    match.lastUpdatedAt = new Date().toISOString();
    savePersistedData(this.data);
    return match;
  }

  public async updateMatchLineup(
    matchId: string,
    lineup: MatchLineup,
    isOfficialFiks: boolean = true
  ): Promise<Match> {
    const match = this.data.matches.find((m) => m.id === matchId);
    if (!match) {
      throw new Error(`Match with id ${matchId} not found`);
    }

    match.lineup = lineup;
    if (isOfficialFiks) {
      match.isOfficialFiks = true;
    }
    match.lastUpdatedAt = new Date().toISOString();
    savePersistedData(this.data);
    return match;
  }

  public async addSupplementaryComment(matchId: string, commentEvent: MatchEvent): Promise<Match> {
    const match = this.data.matches.find((m) => m.id === matchId);
    if (!match) {
      throw new Error(`Match with id ${matchId} not found`);
    }

    const merged = mergeMatchEvents(match.events || [], [commentEvent], matchId);
    match.events = merged;
    match.lastUpdatedAt = new Date().toISOString();
    savePersistedData(this.data);
    return match;
  }

  // Player repository implementation
  public async getAllPlayers(): Promise<Player[]> {
    return [...(this.data.players || [])];
  }

  public async getPlayerByIdOrFiks(idOrFiks: string | number): Promise<Player | undefined> {
    const searchStr = String(idOrFiks).toLowerCase();
    const searchFiks = typeof idOrFiks === 'number' ? idOrFiks : parseInt(searchStr.replace(/\D+/g, ''), 10);

    return (this.data.players || []).find((p) => {
      if (searchFiks && p.fiksId === searchFiks) return true;
      if (p.id.toLowerCase() === searchStr) return true;
      return false;
    });
  }

  public async getPlayersByTeam(teamId: string): Promise<Player[]> {
    return (this.data.players || []).filter((p) => p.teamId === teamId);
  }

  public async updatePlayer(player: Player): Promise<Player> {
    const idx = (this.data.players || []).findIndex(
      (p) => p.id === player.id || (p.fiksId && player.fiksId && p.fiksId === player.fiksId)
    );
    if (idx >= 0) {
      this.data.players[idx] = { ...this.data.players[idx], ...player };
    } else {
      this.data.players.push(player);
    }
    savePersistedData(this.data);
    return player;
  }
}

export const matchRepository = new JsonMatchRepository();
