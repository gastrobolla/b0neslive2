import { TeamCategory } from '../types.js';

export interface ClubBranding {
  primaryColor: string; // e.g. '#165094' (primary brand tone)
  secondaryColor?: string; // e.g. '#c8102e' (accent / kit tone)
  accentColor?: string;
  logoUrl?: string;
  badgeText: string; // e.g. 'BØNES IL'
  clubShortName: string; // e.g. 'Bønes'
  homeGrounds?: string[];
  foundedYear?: number;
}

export interface ClubTeamConfig {
  id: string;
  name: string;
  shortName: string;
  fiksId?: number;
  tourneyId?: number;
  springTourneyId?: number;
  division: string;
  springDivision?: string;
  category: TeamCategory;
  krets: string;
  homeGround: string;
  nffCode: string;
}

export interface ClubScraperConfig {
  fiksClubId: number;
  officialWebsiteUrl?: string;
  krets: string;
  newsFeedUrl?: string;
  autoScanIntervalSeconds?: number;
  teams: ClubTeamConfig[];
}

export interface ClubConfig {
  id: string; // Deterministic club identifier (e.g. 'bones', 'fana')
  name: string; // Official club name (e.g. 'Bønes IL')
  shortName: string; // Clean short name (e.g. 'Bønes')
  fiksClubId: number; // NFF FIKS Club ID (e.g. 965 for Bønes IL)
  branding: ClubBranding;
  scraper: ClubScraperConfig;
}

// Bønes IL 16 Teams configuration
export const BONES_TEAMS: ClubTeamConfig[] = [
  { id: 'g13-1', name: 'Bønes G13-1', shortName: 'G13-1', fiksId: 173951, tourneyId: 210280, springTourneyId: 207279, division: 'G13 1. div. avd. 02 høst', springDivision: 'G13 1. div. avd. 03 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-G13-02H' },
  { id: 'g13-2', name: 'Bønes G13-2', shortName: 'G13-2', fiksId: 202088, tourneyId: 210283, springTourneyId: 207285, division: 'G13 2. div. avd. 02 høst', springDivision: 'G13 2. div. avd. 03 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-G13-02BH' },
  { id: 'g13-3', name: 'Bønes G13-3', shortName: 'G13-3', fiksId: 21260, tourneyId: 210284, springTourneyId: 207287, division: 'G13 2. div. avd. 03 høst', springDivision: 'G13 2. div. avd. 05 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-G13-03H' },
  { id: 'g14-1', name: 'Bønes G14-1', shortName: 'G14-1', fiksId: 20472, tourneyId: 210301, springTourneyId: 207311, division: 'G14 1. div. avd. 02 høst', springDivision: 'G14 2. div. avd. 04 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-G14-02H' },
  { id: 'g14-2', name: 'Bønes G14-2', shortName: 'G14-2', fiksId: 19387, tourneyId: 210306, springTourneyId: 207318, division: 'G14 3. div. avd. 01 høst', springDivision: 'G14 3. div. avd. 04 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-G14-01H' },
  { id: 'g16-1', name: 'Bønes G16-1', shortName: 'G16-1', fiksId: 19685, tourneyId: 210319, springTourneyId: 207329, division: 'G16 1. div. avd. 02 høst', springDivision: 'G16 1. div. avd. 01 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-G16-02H' },
  { id: 'g16-2', name: 'Bønes G16-2', shortName: 'G16-2', fiksId: 155163, tourneyId: 210323, springTourneyId: 207335, division: 'G16 2. div. avd. 04 høst', springDivision: 'G16 2. div. avd. 03 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-G16-04H' },
  { id: 'g16-3', name: 'Bønes G16-3', shortName: 'G16-3', fiksId: 18891, tourneyId: 210330, springTourneyId: 207347, division: 'G16 3. div. avd. 06 høst', springDivision: 'G16 3. div. avd. 07 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-G16-06H' },
  { id: 'g19-1', name: 'Bønes G19-1', shortName: 'G19-1', fiksId: 780, tourneyId: 210332, springTourneyId: 207355, division: 'G19 1. div. avd. 01 høst', springDivision: 'G19 1. div. avd. 01 vår', category: 'Junior', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-G19-01H' },
  { id: 'g19-2', name: 'Bønes G19-2', shortName: 'G19-2', fiksId: 161152, tourneyId: 210337, springTourneyId: 207364, division: 'G19 3. div. avd. 03 høst', springDivision: 'G19 3. div. avd. 02 vår', category: 'Junior', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-G19-03H' },
  { id: 'j13-1', name: 'Bønes J13-1', shortName: 'J13-1', fiksId: 158325, tourneyId: 210297, springTourneyId: 207379, division: 'J13 2. div. avd. 03 høst', springDivision: 'J13 2. div. avd. 05 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-J13-03H' },
  { id: 'j13-2', name: 'Bønes J13-2', shortName: 'J13-2', fiksId: 190457, tourneyId: 210299, springTourneyId: 207377, division: 'J13 2. div. avd. 05 høst', springDivision: 'J13 2. div. avd. 03 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-J13-05H' },
  { id: 'j14-1', name: 'Bønes J14-1', shortName: 'J14-1', fiksId: 126114, tourneyId: 210313, springTourneyId: 207390, division: 'J14 2. div. avd. 01 høst', springDivision: 'J14 2. div. avd. 03 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-J14-01H' },
  { id: 'j16-1', name: 'Bønes J16-1', shortName: 'J16-1', fiksId: 19687, tourneyId: 210390, springTourneyId: 207406, division: 'J16 2. div. avd. 03 høst', springDivision: 'J16 2. div. avd. 04 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-J16-03H' },
  { id: 'bones-1', name: 'Bønes 1', shortName: 'Bønes 1', fiksId: 31808, tourneyId: 211270, springTourneyId: 208233, division: 'Old girls høst avd. 02', springDivision: 'Old girls vår Hordaland', category: 'Senior', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-OG-02H' },
  { id: 'menn-1', name: 'Bønes Menn 1', shortName: 'Menn 1', fiksId: 153650, tourneyId: 205982, springTourneyId: 205982, division: '5. div. menn avd. 03 Hordaland', springDivision: '5. div. menn avd. 03 Hordaland (Vår)', category: 'Senior', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-M5-03' }
];

export const BONES_CLUB_CONFIG: ClubConfig = {
  id: 'bones',
  name: 'Bønes IL',
  shortName: 'Bønes',
  fiksClubId: 965,
  branding: {
    primaryColor: '#165094',
    secondaryColor: '#c8102e',
    accentColor: '#f59e0b',
    logoUrl: '/assets/bones-logo.png',
    badgeText: 'BØNES IL',
    clubShortName: 'Bønes',
    homeGrounds: ['Fjellsdalen idrettsplass', 'Bønesbanen'],
    foundedYear: 1995,
  },
  scraper: {
    fiksClubId: 965,
    officialWebsiteUrl: 'https://bonesil.no',
    krets: 'NFF Hordaland',
    newsFeedUrl: 'https://bonesil.no/feed',
    autoScanIntervalSeconds: 180,
    teams: BONES_TEAMS,
  },
};

// Second sample club (demonstrates generic multi-club capability)
export const FANA_CLUB_CONFIG: ClubConfig = {
  id: 'fana',
  name: 'Fana IL',
  shortName: 'Fana',
  fiksClubId: 978,
  branding: {
    primaryColor: '#c8102e',
    secondaryColor: '#ffffff',
    accentColor: '#165094',
    badgeText: 'FANA IL',
    clubShortName: 'Fana',
  },
  scraper: {
    fiksClubId: 978,
    officialWebsiteUrl: 'https://fanail.no',
    krets: 'NFF Hordaland',
    autoScanIntervalSeconds: 300,
    teams: [
      {
        id: 'fana-menn-1',
        name: 'Fana Menn 1',
        shortName: 'Fana 1',
        fiksId: 97801,
        tourneyId: 205980,
        division: '3. div. menn avd. 01',
        category: 'Senior',
        krets: 'NFF Hordaland',
        homeGround: 'Nesttun Idrettsplass',
        nffCode: 'NFF-HOR-M3-01',
      },
    ],
  },
};

// Registered Club Registry
const CLUB_REGISTRY = new Map<string, ClubConfig>();
CLUB_REGISTRY.set(BONES_CLUB_CONFIG.id, BONES_CLUB_CONFIG);
CLUB_REGISTRY.set(FANA_CLUB_CONFIG.id, FANA_CLUB_CONFIG);

export const DEFAULT_CLUB_ID = 'bones';

/**
 * Retrieves the active ClubConfig by ID.
 * Falls back to Bønes IL if not specified or not found.
 */
export function getClubConfig(clubId?: string | null): ClubConfig {
  if (!clubId) return BONES_CLUB_CONFIG;
  const normalized = clubId.trim().toLowerCase();
  return CLUB_REGISTRY.get(normalized) || BONES_CLUB_CONFIG;
}

/**
 * Registers a new club dynamically.
 * Fulfills the architecture test: A new club can be added by simply registering its ClubConfig.
 */
export function registerClubConfig(config: ClubConfig): void {
  CLUB_REGISTRY.set(config.id.toLowerCase(), config);
}

/**
 * Lists all registered clubs in the platform.
 */
export function listClubConfigs(): ClubConfig[] {
  return Array.from(CLUB_REGISTRY.values());
}

/**
 * Checks whether a given team name belongs to the specified club.
 * Completely replaces hardcoded `toLowerCase().includes('bønes')` checks!
 */
export function isClubTeam(teamName: string | undefined | null, club: ClubConfig): boolean {
  if (!teamName) return false;
  const tNorm = teamName.toLowerCase().trim();
  const cNameNorm = club.name.toLowerCase().trim();
  const cShortNorm = club.shortName.toLowerCase().trim();
  const cCleanStem = cShortNorm.replace(/\s*(il|fk|sk|fotball)\s*/gi, '').trim();

  // 1. Direct contains check for official name or short name
  if (tNorm.includes(cNameNorm) || tNorm.includes(cShortNorm)) return true;
  if (cCleanStem.length >= 3 && tNorm.includes(cCleanStem)) return true;

  // 2. Check registered teams in the club config
  if (club.scraper?.teams?.some((t) => t.name.toLowerCase() === tNorm || t.id.toLowerCase() === tNorm)) {
    return true;
  }

  return false;
}
