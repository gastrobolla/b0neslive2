export type TeamCategory = 'Senior' | 'Ungdom' | 'Junior' | 'Barnefotball';

export interface TeamInfo {
  id: string;
  name: string;
  shortName: string;
  category: TeamCategory;
  division: string;
  krets: string;
  homeGround: string;
  currentRank: number;
  totalTeamsInDivision: number;
  nffCode: string;
  fiksId?: number;
  tourneyId?: number;
}

export interface TableRow {
  rank: number;
  teamName: string;
  isBones: boolean;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export interface DivisionTable {
  teamId: string;
  teamName: string;
  divisionName: string;
  season: string;
  updatedAt: string;
  tourneyId?: number;
  rows: TableRow[];
}

export interface TopScorer {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  goals: number;
  matches: number;
  penalties: number;
  goalsPerMatch: number;
  isBonesPlayer: boolean;
  recentGoalStreak?: number;
}

export interface CardStatistic {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  yellowCards: number;
  redCards: number;
  points: number; // Disciplinary points (e.g. Yellow = 1 pt, Red = 3 pts)
  status: 'Klar' | 'Advarsel (1 fra soning)' | 'Karantene';
  matches: number;
  isBonesPlayer: boolean;
}

export interface PlayerTeamRepresentation {
  teamId: string;
  teamName: string;
  matches: number;
  goals: number;
  yellowCards: number;
  redCards: number;
  springMatches: number;
  autumnMatches: number;
}

export interface PlayerMatchLog {
  id: string;
  date: string;
  season: 'Vår' | 'Høst';
  opponent: string;
  isHome: boolean;
  score: string;
  result: 'W' | 'D' | 'L';
  goals: number;
  yellowCard: boolean;
  redCard: boolean;
  minutes: number;
  rating: number; // 6.0 - 9.8
  highlight?: string;
  teamId?: string;
  teamName?: string;
  division?: string;
  role?: string;
}

export interface PlayerSeasonStats {
  matches: number;
  goals: number;
  penalties: number;
  yellowCards: number;
  redCards: number;
  goalsPerMatch: number;
  divisionName: string;
  minutesPlayed: number;
}

export interface PlayerProfile {
  name: string;
  fiksId?: number;
  fiksUrl?: string;
  teamId: string;
  teamName: string;
  division: string;
  category: TeamCategory;
  jerseyNumber: number;
  position: string;
  isBonesPlayer: boolean;
  teamsPlayedFor?: PlayerTeamRepresentation[];
  spring: PlayerSeasonStats;
  autumn: PlayerSeasonStats;
  total: {
    matches: number;
    goals: number;
    penalties: number;
    yellowCards: number;
    redCards: number;
    points: number;
    goalsPerMatch: number;
    minutesPlayed: number;
  };
  cardStatus: 'Klar' | 'Advarsel (1 fra soning)' | 'Karantene';
  recentGoalStreak?: number;
  topScorerRank?: number;
  cardRank?: number;
  formSummary: ('W' | 'D' | 'L')[];
  formTrend: 'rising' | 'steady' | 'declining';
  matchHistory: PlayerMatchLog[];
}

export type PlayerPosition = 'Keeper' | 'Forsvar' | 'Midtbane' | 'Angrep';

export interface Player {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
  jerseyNumber: number;
  number?: number;
  position: PlayerPosition;
  fiksId?: number;
  role?: 'Kaptein' | 'Visekaptein' | 'Spiller';
  matches: number;
  goals: number;
  assists?: number;
  yellowCards: number;
  redCards: number;
  isStarter?: boolean;
}

export interface MatchLineup {
  formation?: string;
  starters: Player[];
  bench: Player[];
  subs?: Player[];
  coach?: string;
  teamName?: string;
}

export type MatchStatus = 'upcoming' | 'live' | 'finished';
export type QuickCategoryFilter = 'all' | 'gutter' | 'jenter' | 'senior';

export interface MatchEvent {
  id: string;
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'sub' | 'whistle';
  player?: string;
  assistPlayer?: string;
  team: string;
  description: string;
  source?: 'NFF' | 'lagleder' | 'official';
  reportedBy?: string;
}

export interface MatchStats {
  possession?: { home: number; away: number };
  shotsTotal?: { home: number; away: number };
  shotsOnTarget?: { home: number; away: number };
  bigChances?: { home: number; away: number };
  corners?: { home: number; away: number };
  fouls?: { home: number; away: number };
  yellowCards?: { home: number; away: number };
  redCards?: { home: number; away: number };
  saves?: { home: number; away: number };
}

export interface Match {
  id: string; // e.g. "nff-8051234"
  fiksId?: number;
  teamId: string;
  teamName: string;
  division: string;
  round?: string;
  homeTeam: string;
  awayTeam: string;
  isHome: boolean; // true if Bønes is the home team
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  venue: string;
  venueCity?: string;
  status: MatchStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  halfTimeScore?: { home: number; away: number };
  currentMinute?: number;
  referee?: string;
  events?: MatchEvent[];
  stats?: MatchStats;
  attendance?: number;
  season?: string;
  category?: TeamCategory;
  lastUpdatedSource?: 'NFF' | 'lagleder' | 'official';
  lastUpdatedAt?: string;
  reportedBy?: string;
  lineup?: MatchLineup;
  homeLineup?: MatchLineup;
  awayLineup?: MatchLineup;
}

export interface ScanLog {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'update' | 'warning';
  source: string;
  message: string;
}

export interface ScannerState {
  isActive: boolean;
  lastScanned: string;
  nextScanSeconds: number;
  autoScanEnabled: boolean;
  sources: {
    name: string;
    url: string;
    status: 'online' | 'synced' | 'scanning';
    lastSync: string;
  }[];
  logs: ScanLog[];
}

export type FeedItemType = 'goal' | 'card' | 'table' | 'match_start' | 'match_end' | 'fixture' | 'scanner_sync' | 'announcement';

export interface FeedItem {
  id: string;
  timestamp: string;
  timeAgo: string;
  type: FeedItemType;
  teamId?: string;
  teamName: string;
  title: string;
  description: string;
  badgeText?: string;
  isHomeMatch?: boolean;
  venue?: string;
  score?: string;
  minute?: number;
  player?: string;
  source?: 'NFF' | 'lagleder' | 'bonesil_news' | 'system';
  reportedBy?: string;
  impact?: {
    type: 'topscorer' | 'card_warning' | 'table_rank' | 'fixture';
    detail: string;
  };
}

export interface BonesClubData {
  teams: TeamInfo[];
  tables: Record<string, DivisionTable>;
  topScorers: TopScorer[];
  cards: CardStatistic[];
  matches: Match[];
  players?: Player[];
  scanner: ScannerState;
  feed: FeedItem[];
  stats: {
    totalTeams: number;
    totalMatchesRecorded: number;
    upcomingHomeMatches: number;
    totalGoalsScored: number;
    fairPlayScore: number;
  };
  isRealData?: boolean;
  realDataSource?: string;
  lastRealScraped?: string;
  dailyScrapeSchedule?: string;
  nextDailyScrape?: string;
  isScrapingNow?: boolean;
  activeMatchWindow?: boolean;
  matchWindowDetails?: string;
  processedEventIds?: string[];
  dataVersion?: number;
  lastDiskSaved?: string;
}

export interface LaglederReportRequest {
  matchId: string;
  reporterName: string;
  action: 'goal' | 'card' | 'sub' | 'status_change' | 'score_adjust';
  team: string;
  minute: number;
  player?: string;
  cardType?: 'yellow' | 'red';
  matchStatus?: 'upcoming' | 'live' | 'finished';
  homeScore?: number;
  awayScore?: number;
  description?: string;
}
