import { Match, MatchEvent, MatchLineup, Player, MatchStatus } from '../../src/types.js';

export interface MatchFilter {
  status?: MatchStatus | 'all';
  category?: string;
  teamId?: string;
  date?: string;
  isHome?: boolean;
  limit?: number;
}

export interface IMatchRepository {
  getAllMatches(): Promise<Match[]>;
  getMatchById(id: string): Promise<Match | undefined>;
  queryMatches(filters: MatchFilter): Promise<Match[]>;
  upsertMatch(match: Match): Promise<Match>;
  upsertMatches(matches: Match[]): Promise<{ added: number; updated: number }>;
  updateMatchEvents(matchId: string, events: MatchEvent[]): Promise<Match>;
  updateMatchLineup(matchId: string, lineup: MatchLineup, isOfficialFiks?: boolean): Promise<Match>;
  addSupplementaryComment(matchId: string, commentEvent: MatchEvent): Promise<Match>;
}

export interface IPlayerRepository {
  getAllPlayers(): Promise<Player[]>;
  getPlayerByIdOrFiks(idOrFiks: string | number): Promise<Player | undefined>;
  getPlayersByTeam(teamId: string): Promise<Player[]>;
  updatePlayer(player: Player): Promise<Player>;
}
