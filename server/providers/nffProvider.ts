/**
 * NFF Provider / Adapter
 * Isolates all NFF-specific external data fetching, HTML scraping, and raw-to-normalized conversions.
 * Ensures consistent error handling, timeouts, and deterministic data models.
 */

import {
  Match,
  MatchEvent,
  MatchLineup,
  DivisionTable,
  TopScorer,
  CardStatistic,
  FeedItem,
} from '../../src/types.js';
import {
  BONES_16_TEAMS,
  scrapeMatchEvents,
  scrapeMatchLineup,
  runFullClubScrape,
  fetchWithTimeout,
  ScrapedClubData,
} from '../bonesScraper.js';

export interface ScrapedMatchLineupResult {
  fiksId: string;
  homeTeam: string;
  awayTeam: string;
  homeLineup: MatchLineup;
  awayLineup: MatchLineup;
  bonesLineup?: MatchLineup;
  isOfficialFiks: boolean;
}

export interface NFFProviderInterface {
  fetchMatchEvents(match: Match): Promise<MatchEvent[]>;
  fetchMatchLineup(fiksIdOrMatch: string | number | Match): Promise<ScrapedMatchLineupResult | null>;
  syncAllTeams(): Promise<ScrapedClubData>;
}

export class NFFProvider implements NFFProviderInterface {
  /**
   * Fetches official live match events directly from NFF match report.
   */
  async fetchMatchEvents(match: Match): Promise<MatchEvent[]> {
    try {
      return await scrapeMatchEvents(match);
    } catch (err: any) {
      console.warn(`[NFFProvider] Failed to fetch events for match ${match.id}:`, err.message);
      return [];
    }
  }

  /**
   * Fetches official match lineup from NFF.
   */
  async fetchMatchLineup(fiksIdOrMatch: string | number | Match): Promise<ScrapedMatchLineupResult | null> {
    try {
      return await scrapeMatchLineup(fiksIdOrMatch);
    } catch (err: any) {
      console.warn(`[NFFProvider] Failed to fetch lineup for match:`, err.message);
      return null;
    }
  }

  /**
   * Executes a full synchronization of all 16 Bønes IL teams from NFF.
   */
  async syncAllTeams(): Promise<ScrapedClubData> {
    return await runFullClubScrape();
  }
}

// Export singleton instance
export const nffProvider = new NFFProvider();
export { BONES_16_TEAMS };
