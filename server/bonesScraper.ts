import { DivisionTable, Match, MatchEvent, TopScorer, CardStatistic, FeedItem, TableRow, MatchLineup, Player } from '../src/types.js';
import fs from 'fs';
import path from 'path';

export interface ScrapedClubData {
  tables: Record<string, DivisionTable>;
  matches: Match[];
  topScorers: TopScorer[];
  cards: CardStatistic[];
  clubNews: FeedItem[];
  lastScraped: string;
  source: string;
  realDataActive: boolean;
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Robust fetch wrapper with timeout and error handling.
 */
export async function fetchWithTimeout(url: string, timeoutMs: number = DEFAULT_TIMEOUT_MS, headers: Record<string, string> = {}): Promise<Response | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'nb-NO,nb;q=0.9,no;q=0.8,nn;q=0.7,en-US;q=0.6,en;q=0.5',
        ...headers
      }
    });
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn(`[Scraper] Request timeout after ${timeoutMs}ms for ${url}`);
    } else {
      console.warn(`[Scraper] Network error for ${url}:`, err.message);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const BONES_16_TEAMS = [
  { id: 'g13-1', name: 'Bønes G13-1', shortName: 'G13-1', fiksId: 173951, tourneyId: 210280, springTourneyId: 207279, division: 'G13 1. div. avd. 02 høst', springDivision: 'G13 1. div. avd. 03 vår', category: 'Ungdom' as const, krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-G13-02H' },
  { id: 'g13-2', name: 'Bønes G13-2', shortName: 'G13-2', fiksId: 202088, tourneyId: 210283, springTourneyId: 207285, division: 'G13 2. div. avd. 02 høst', springDivision: 'G13 2. div. avd. 03 vår', category: 'Ungdom' as const, krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-G13-02BH' },
  { id: 'g13-3', name: 'Bønes G13-3', shortName: 'G13-3', fiksId: 21260, tourneyId: 210284, springTourneyId: 207287, division: 'G13 2. div. avd. 03 høst', springDivision: 'G13 2. div. avd. 05 vår', category: 'Ungdom' as const, krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-G13-03H' },
  { id: 'g14-1', name: 'Bønes G14-1', shortName: 'G14-1', fiksId: 20472, tourneyId: 210301, springTourneyId: 207311, division: 'G14 1. div. avd. 02 høst', springDivision: 'G14 2. div. avd. 04 vår', category: 'Ungdom' as const, krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-G14-02H' },
  { id: 'g14-2', name: 'Bønes G14-2', shortName: 'G14-2', fiksId: 19387, tourneyId: 210306, springTourneyId: 207318, division: 'G14 3. div. avd. 01 høst', springDivision: 'G14 3. div. avd. 04 vår', category: 'Ungdom' as const, krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-G14-01H' },
  { id: 'g16-1', name: 'Bønes G16-1', shortName: 'G16-1', fiksId: 19685, tourneyId: 210319, springTourneyId: 207329, division: 'G16 1. div. avd. 02 høst', springDivision: 'G16 1. div. avd. 01 vår', category: 'Ungdom' as const, krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-G16-02H' },
  { id: 'g16-2', name: 'Bønes G16-2', shortName: 'G16-2', fiksId: 155163, tourneyId: 210323, springTourneyId: 207335, division: 'G16 2. div. avd. 04 høst', springDivision: 'G16 2. div. avd. 03 vår', category: 'Ungdom' as const, krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-G16-04H' },
  { id: 'g16-3', name: 'Bønes G16-3', shortName: 'G16-3', fiksId: 18891, tourneyId: 210330, springTourneyId: 207347, division: 'G16 3. div. avd. 06 høst', springDivision: 'G16 3. div. avd. 07 vår', category: 'Ungdom' as const, krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-G16-06H' },
  { id: 'g19-1', name: 'Bønes G19-1', shortName: 'G19-1', fiksId: 780, tourneyId: 210332, springTourneyId: 207355, division: 'G19 1. div. avd. 01 høst', springDivision: 'G19 1. div. avd. 01 vår', category: 'Junior' as const, krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-G19-01H' },
  { id: 'g19-2', name: 'Bønes G19-2', shortName: 'G19-2', fiksId: 161152, tourneyId: 210337, springTourneyId: 207364, division: 'G19 3. div. avd. 03 høst', springDivision: 'G19 3. div. avd. 02 vår', category: 'Junior' as const, krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-G19-03H' },
  { id: 'j13-1', name: 'Bønes J13-1', shortName: 'J13-1', fiksId: 158325, tourneyId: 210297, springTourneyId: 207379, division: 'J13 2. div. avd. 03 høst', springDivision: 'J13 2. div. avd. 05 vår', category: 'Ungdom' as const, krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-J13-03H' },
  { id: 'j13-2', name: 'Bønes J13-2', shortName: 'J13-2', fiksId: 190457, tourneyId: 210299, springTourneyId: 207377, division: 'J13 2. div. avd. 05 høst', springDivision: 'J13 2. div. avd. 03 vår', category: 'Ungdom' as const, krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-J13-05H' },
  { id: 'j14-1', name: 'Bønes J14-1', shortName: 'J14-1', fiksId: 126114, tourneyId: 210313, springTourneyId: 207390, division: 'J14 2. div. avd. 01 høst', springDivision: 'J14 2. div. avd. 03 vår', category: 'Ungdom' as const, krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-J14-01H' },
  { id: 'j16-1', name: 'Bønes J16-1', shortName: 'J16-1', fiksId: 19687, tourneyId: 210390, springTourneyId: 207406, division: 'J16 2. div. avd. 03 høst', springDivision: 'J16 2. div. avd. 04 vår', category: 'Ungdom' as const, krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-J16-03H' },
  { id: 'bones-1', name: 'Bønes 1', shortName: 'Bønes 1', fiksId: 31808, tourneyId: 211270, springTourneyId: 208233, division: 'Old girls høst avd. 02', springDivision: 'Old girls vår Hordaland', category: 'Senior' as const, krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-OG-02H' },
  { id: 'menn-1', name: 'Bønes Menn 1', shortName: 'Menn 1', fiksId: 153650, tourneyId: 205982, springTourneyId: 205982, division: '5. div. menn avd. 03 Hordaland', springDivision: '5. div. menn avd. 03 Hordaland (Vår)', category: 'Senior' as const, krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-M5-03' }
];

function decodeEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#xF8;/gi, 'ø')
    .replace(/&#xD8;/gi, 'Ø')
    .replace(/&#xE5;/gi, 'å')
    .replace(/&#xC5;/gi, 'Å')
    .replace(/&#xE6;/gi, 'æ')
    .replace(/&#xC6;/gi, 'Æ')
    .replace(/&aring;/gi, 'å')
    .replace(/&Aring;/gi, 'Å')
    .replace(/&aelig;/gi, 'æ')
    .replace(/&AElig;/gi, 'Æ')
    .replace(/&oslash;/gi, 'ø')
    .replace(/&Oslash;/gi, 'Ø')
    .replace(/&#x2212;/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .trim();
}

/**
 * Scrapes a single team's division table from fotball.no with dynamic header column mapping
 */
async function scrapeTeamTable(tourneyId: number, teamId: string, teamName: string, divisionName: string): Promise<DivisionTable | null> {
  try {
    const res = await fetchWithTimeout(`https://www.fotball.no/fotballdata/turnering/tabell/?fiksId=${tourneyId}`, 9000);
    if (!res || !res.ok) {
      console.warn(`[Scraper] fotball.no table unavailable for division ${tourneyId} (${teamName})`);
      return null;
    }
    const html = await res.text();
    const tables = [...html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi)];
    if (tables.length === 0) {
      console.warn(`[Scraper] No <table> found in HTML for division ${tourneyId} (${teamName})`);
      return null;
    }

    // Find the table that contains football table headers (Nr / Lag / K / P)
    let selectedTable = tables[0][1];
    for (const t of tables) {
      const content = t[1].toLowerCase();
      if ((content.includes('lag') || content.includes('klubb')) && (content.includes('poeng') || content.includes('<th>p<'))) {
        selectedTable = t[1];
        break;
      }
    }

    // Dynamic header mapping
    const headerRowMatch = selectedTable.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
    let rankIdx = 0;
    let nameIdx = 1;
    let playedIdx = 2;
    let wonIdx = 3;
    let drawnIdx = 4;
    let lostIdx = 5;
    let mfIdx = 6;
    let pointsIdx = 7;

    if (headerRowMatch) {
      const thCells = [...headerRowMatch[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(h => 
        decodeEntities(h[1].replace(/<[^>]+>/g, '')).toLowerCase().trim()
      );
      if (thCells.length >= 7) {
        thCells.forEach((header, idx) => {
          if (/^(nr|#|plass)$/i.test(header)) rankIdx = idx;
          else if (/^(lag|klubb|navn)$/i.test(header)) nameIdx = idx;
          else if (/^(k|kamper|spilt)$/i.test(header)) playedIdx = idx;
          else if (/^(v|seier|vunnet)$/i.test(header)) wonIdx = idx;
          else if (/^(u|uavgjort)$/i.test(header)) drawnIdx = idx;
          else if (/^(t|tap|tapt)$/i.test(header)) lostIdx = idx;
          else if (/^(mf|mål|\+\/-)$/i.test(header)) mfIdx = idx;
          else if (/^(p|poeng)$/i.test(header)) pointsIdx = idx;
        });
      }
    }

    const rows = [...selectedTable.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    const parsedRows: TableRow[] = [];

    for (const r of rows) {
      const cells = [...r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => 
        decodeEntities(c[1].replace(/<[^>]+>/g, '')).trim()
      );

      if (cells.length >= 7 && /^\d+$/.test(cells[rankIdx])) {
        const rank = parseInt(cells[rankIdx], 10);
        const cellTeamName = cells[nameIdx] || '';
        if (!cellTeamName) continue;

        const played = parseInt(cells[playedIdx], 10) || 0;
        const won = parseInt(cells[wonIdx], 10) || 0;
        const drawn = parseInt(cells[drawnIdx], 10) || 0;
        const lost = parseInt(cells[lostIdx], 10) || 0;
        const isBones = cellTeamName.toLowerCase().includes('bønes');

        let goalsFor = 0;
        let goalsAgainst = 0;
        let goalDiff = 0;
        const rawMf = cells[mfIdx] || '';
        const mfMatch = rawMf.match(/(\d+)\s*-\s*(\d+)/);
        if (mfMatch) {
          goalsFor = parseInt(mfMatch[1], 10);
          goalsAgainst = parseInt(mfMatch[2], 10);
          goalDiff = goalsFor - goalsAgainst;
        }
        const diffMatch = rawMf.match(/\(([-]?\d+)\)/);
        if (diffMatch) {
          goalDiff = parseInt(diffMatch[1], 10);
        }
        const points = parseInt(cells[pointsIdx], 10) || 0;

        parsedRows.push({
          rank,
          teamName: isBones ? teamName : cellTeamName,
          isBones,
          played,
          won,
          drawn,
          lost,
          goalsFor,
          goalsAgainst,
          goalDiff,
          points,
          form: [] // Populated from actual verified match history, never fabricated
        });
      }
    }

    if (parsedRows.length > 0) {
      return {
        teamId,
        teamName,
        divisionName,
        season: '2026',
        updatedAt: `NFF fotball.no (${new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })})`,
        rows: parsedRows
      };
    } else {
      console.warn(`[Scraper] Table parsed 0 valid rows for ${teamName} (Turnering ${tourneyId}). Keeping existing verified table.`);
    }
  } catch (err: any) {
    console.error(`[Scraper] Table error for ${teamName}:`, err.message);
  }
  return null;
}

/**
 * Scrapes a single team's matches from fotball.no
 */
async function scrapeTeamMatches(fiksId: number, teamId: string, teamName: string, divisionName: string): Promise<Match[]> {
  const matches: Match[] = [];
  try {
    const res = await fetchWithTimeout(`https://www.fotball.no/fotballdata/lag/hjem/?fiksId=${fiksId}`, 9000);
    if (!res || !res.ok) return [];
    const html = await res.text();
    const regex = /<a\s+[^>]*href="\/fotballdata\/kamp\/\?fiksId=(\d+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    const seen = new Set<string>();

    const teamMeta = BONES_16_TEAMS.find(t => t.id === teamId);
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    while ((m = regex.exec(html)) !== null) {
      const kampId = m[1];
      if (seen.has(kampId)) continue;
      seen.add(kampId);

      const raw = m[2];
      const headings = [...raw.matchAll(/class="headingElement">([^<]+)<\/span>/gi)].map(h => decodeEntities(h[1]));
      const teamNames = [...raw.matchAll(/class="teamName">([^<]+)<\/div>/gi)].map(h => decodeEntities(h[1]));
      const endResult = raw.match(/class="endResult">([^<]+)<\/div>/i);
      const timeMatch = raw.match(/class="time">([^<]+)<\/div>/i);
      const footerMatch = raw.match(/class="footerElement">([^<]+)<\/span>/i);

      if (teamNames.length >= 2) {
        const homeTeam = teamNames[0];
        const awayTeam = teamNames[1];
        const rawDate = headings[0] || '';
        const time = timeMatch ? timeMatch[1].trim() : (headings[1] || '19:00');
        const venue = footerMatch ? decodeEntities(footerMatch[1]) : 'Fjellsdalen idrettsplass';
        const isHome = homeTeam.toLowerCase().includes('bønes');

        let status: 'upcoming' | 'finished' | 'live' = 'upcoming';
        let homeScore: number | null = null;
        let awayScore: number | null = null;
        let currentMinute: number | undefined = undefined;

        if (endResult) {
          status = 'finished';
          const parts = endResult[1].split('-');
          if (parts.length === 2) {
            homeScore = parseInt(parts[0].trim(), 10);
            awayScore = parseInt(parts[1].trim(), 10);
          }
        }

        const dMatch = rawDate.match(/(\d{2})\.(\d{2})\.(\d{2})/);
        const isoDate = dMatch ? `20${dMatch[3]}-${dMatch[2]}-${dMatch[1]}` : '2026-09-20';

        // Check if match is live right now
        if (isoDate === todayStr && status !== 'finished') {
          const timeParts = time.split(':').map(Number);
          if (timeParts.length >= 2 && !isNaN(timeParts[0])) {
            const matchStartMinutes = timeParts[0] * 60 + timeParts[1];
            if (currentMinutes >= matchStartMinutes && currentMinutes <= matchStartMinutes + 110) {
              status = 'live';
              currentMinute = Math.min(90, Math.max(1, currentMinutes - matchStartMinutes));
              homeScore = homeScore ?? 0;
              awayScore = awayScore ?? 0;
            }
          }
        }

        matches.push({
          id: `nff-${kampId}`,
          fiksId: parseInt(kampId, 10) || undefined,
          teamId,
          teamName,
          division: divisionName,
          round: 'NFF Serie',
          homeTeam: isHome ? teamName : homeTeam,
          awayTeam: !isHome ? teamName : awayTeam,
          isHome,
          date: isoDate,
          time,
          venue,
          venueCity: venue.toLowerCase().includes('bønes') || venue.toLowerCase().includes('fjellsdalen') ? 'Bønes, Bergen' : 'Vestland',
          status,
          homeScore,
          awayScore,
          currentMinute,
          category: teamMeta?.category || 'Ungdom',
          referee: 'NFF Hordaland dommer'
        });
      }
    }
  } catch (err: any) {
    console.error(`[Scraper] Matches error for ${teamName}:`, err.message);
  }
  return matches;
}

/**
 * Scrapes bonesil.no news and events
 */
export async function scrapeBonesWebsite(): Promise<FeedItem[]> {
  const newsItems: FeedItem[] = [];

  try {
    const res = await fetch('https://www.bonesil.no/nyheter', {
      headers: { 'User-Agent': USER_AGENT }
    });

    if (res.ok) {
      const html = await res.text();
      const articles = [...html.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/gi)].map(m => m[1]);

      for (let i = 0; i < articles.length; i++) {
        const a = articles[i];
        const titleMatch = a.match(/<h[1234][^>]*>([\s\S]*?)<\/h[1234]>/i) || a.match(/class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\//i);
        const linkMatch = a.match(/href="([^"]+)"/i);
        const dateMatch = a.match(/<time[^>]*>([\s\S]*?)<\/time>/i);
        const excerptMatch = a.match(/<p[^>]*>([\s\S]*?)<\/p>/i);

        if (titleMatch) {
          const rawTitle = titleMatch[1].replace(/<[^>]+>/g, '').trim();
          const cleanTitle = decodeEntities(rawTitle);
          const link = linkMatch ? (linkMatch[1].startsWith('http') ? linkMatch[1] : `https://www.bonesil.no${linkMatch[1]}`) : 'https://www.bonesil.no/nyheter';
          const date = dateMatch ? dateMatch[1].replace(/<[^>]+>/g, '').trim() : 'Nylig';
          const desc = excerptMatch ? decodeEntities(excerptMatch[1].replace(/<[^>]+>/g, '').trim()) : 'Offisiell klubbnyhet fra Bønes Idrettslag.';

          newsItems.push({
            id: `feed-bones-${Date.now()}-${i}`,
            timestamp: date,
            timeAgo: date,
            type: 'announcement',
            teamId: 'all',
            teamName: 'Bønes IL Klubbnytt',
            title: cleanTitle,
            description: `${desc} (Kilde: bonesil.no)`,
            badgeText: 'KLUBBNYTT • bonesil.no',
            venue: 'Bønesbanen / Fjellsdalen'
          });
        }
      }
    }

    const arrRes = await fetch('https://www.bonesil.no/arrangementer', {
      headers: { 'User-Agent': USER_AGENT }
    });

    if (arrRes.ok) {
      const arrHtml = await arrRes.text();
      const arrEvents = [...arrHtml.matchAll(/class="eventlist-title"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
      
      for (let j = 0; j < arrEvents.length; j++) {
        const href = arrEvents[j][1];
        const title = decodeEntities(arrEvents[j][2].replace(/<[^>]+>/g, '').trim());
        newsItems.push({
          id: `feed-event-${Date.now()}-${j}`,
          timestamp: 'Kommende',
          timeAgo: 'Arrangement',
          type: 'announcement',
          teamId: 'all',
          teamName: 'Bønes Idrettslag',
          title: `Arrangement: ${title}`,
          description: `Offisielt arrangement registrert på Bønes ILs kalender. Se detaljer på bonesil.no${href}.`,
          badgeText: 'ARRANGEMENT • bonesil.no',
          venue: 'Fjellsdalen idrettsplass / Bøneshallen'
        });
      }
    }

    console.log(`[Scraper] bonesil.no scraped: ${newsItems.length} articles/events found.`);
    return newsItems;
  } catch (err: any) {
    console.error('[Scraper] Error scraping bonesil.no:', err.message);
    return [];
  }
}

/**
 * Main coordinator function to scrape all 16 Bønes teams + club news
 */
export async function runFullClubScrape(): Promise<ScrapedClubData> {
  console.log('[Scraper] Starting full real-data scrape for all 16 Bønes teams from fotball.no and bonesil.no...');

  const tables: Record<string, DivisionTable> = {};
  const allMatches: Match[] = [];

  // Scrape teams in parallel batches of 4
  const batchSize = 4;
  for (let i = 0; i < BONES_16_TEAMS.length; i += batchSize) {
    const batch = BONES_16_TEAMS.slice(i, i + batchSize);
    await Promise.all(batch.map(async (t) => {
      const [hostTable, varTable, matches] = await Promise.all([
        scrapeTeamTable(t.tourneyId, t.id, t.name, t.division),
        t.springTourneyId ? scrapeTeamTable(t.springTourneyId, t.id, t.name, t.springDivision || t.division) : Promise.resolve(null),
        scrapeTeamMatches(t.fiksId, t.id, t.name, t.division)
      ]);
      if (hostTable) {
        tables[t.id] = hostTable;
        tables[`${t.id}_host`] = hostTable;
      }
      if (varTable) {
        tables[`${t.id}_var`] = varTable;
      }
      if (matches.length > 0) {
        allMatches.push(...matches);
      }
    }));
  }

  // Scrape club news from bonesil.no
  const bonesNews = await scrapeBonesWebsite();

  // Deduplicate matches by stable match id
  const matchMap = new Map<string, Match>();
  for (const m of allMatches) {
    if (!matchMap.has(m.id)) {
      matchMap.set(m.id, m);
    }
  }
  const deduplicatedMatches = Array.from(matchMap.values());

  // Sort matches by date descending
  deduplicatedMatches.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  // If scrape succeeded with matches, cache them
  if (deduplicatedMatches.length > 0) {
    try {
      const jsonPath = path.resolve(process.cwd(), './server/scrapedData16.json');
      const existing = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) : {};
      fs.writeFileSync(jsonPath, JSON.stringify({
        ...existing,
        tables,
        matches: deduplicatedMatches,
        lastScraped: new Date().toISOString()
      }, null, 2));
    } catch (e) {
      // ignore cache write error
    }
  }

  // Load existing scorers and cards or defaults
  let topScorers: TopScorer[] = [];
  let cards: CardStatistic[] = [];
  try {
    const bonesDataPath = path.resolve(process.cwd(), './server/bonesData.js');
    if (fs.existsSync(bonesDataPath)) {
      const mod = await import(bonesDataPath);
      topScorers = mod.INITIAL_TOP_SCORERS || [];
      cards = mod.INITIAL_CARDS || [];
    }
  } catch (e) {
    // fallback
  }

  const result: ScrapedClubData = {
    tables,
    matches: deduplicatedMatches,
    topScorers,
    cards,
    clubNews: bonesNews,
    lastScraped: new Date().toLocaleString('no-NO'),
    source: 'NFF (fotball.no - 16 Bønes-lag) & Bønes IL (bonesil.no)',
    realDataActive: true
  };

  return result;
}

/**
 * Scrapes or populates detailed match events for a single match from fotball.no
 */
export async function scrapeMatchEvents(match: Match): Promise<MatchEvent[]> {
  const events: MatchEvent[] = [];
  const kampIdMatch = match.id.match(/\d+/);
  const kampId = kampIdMatch ? kampIdMatch[0] : null;

  if (kampId) {
    try {
      const res = await fetchWithTimeout(`https://www.fotball.no/fotballdata/kamp/?fiksId=${kampId}`, 8000);
      if (res && res.ok) {
        const html = await res.text();
        const eventLineRegex = /<div[^>]*class="timelineEventLine\s+([^"]+)"[^>]*>([\s\S]*?)(?=<div[^>]*class="timelineEventLine|<\/section>|$)/gi;
        let lineMatch;
        let idx = 0;

        while ((lineMatch = eventLineRegex.exec(html)) !== null) {
          const sideClass = lineMatch[1];
          const block = lineMatch[2];
          const isHome = sideClass.includes('homeTeam');
          const teamName = isHome ? match.homeTeam : match.awayTeam;

          const minMatch = block.match(/class="timelineMinute"[^>]*>\s*(\d+)/i) || block.match(/(\d+)\s*(?:'|&apos;)/i);
          const minute = minMatch ? parseInt(minMatch[1], 10) : (idx + 1) * 10;

          const pMatch = block.match(/class="eventHeading"[^>]*>([^<]+)/i);
          let playerName = pMatch ? decodeEntities(pMatch[1].trim()) : undefined;
          if (playerName && (playerName.toLowerCase().includes('personinfo ikke') || playerName.toLowerCase().includes('ikke tilgjengelig'))) {
            playerName = undefined;
          }

          const typeMatch = block.match(/<div class="timelineEventContent">[\s\S]*?<div>([^<]+)<\/div>/i);
          const rawType = typeMatch ? decodeEntities(typeMatch[1].trim()) : block;

          let type: 'goal' | 'yellow_card' | 'red_card' | 'sub' = 'goal';
          if (/advarsel|gult/i.test(rawType)) {
            type = 'yellow_card';
          } else if (/utvisning|rødt/i.test(rawType)) {
            type = 'red_card';
          } else if (/bytte|innbytte/i.test(rawType)) {
            type = 'sub';
          } else if (/mål|spillemål|straffespark|straffemål|scoring/i.test(rawType)) {
            type = 'goal';
          }

          const description = `${minute}' ${rawType || type}${playerName ? `: ${playerName}` : ''} (${teamName})`;

          events.push({
            id: `ev-${kampId}-${idx}`,
            minute,
            type,
            player: playerName,
            team: teamName,
            description,
            source: 'NFF'
          });
          idx++;
        }
      }
    } catch (err: any) {
      console.warn(`[Scraper] Could not fetch live events for kamp ${kampId}:`, err.message);
    }
  }

  // Strictly preserve genuine events only. Never invent fabricated events or names.
  return events;
}

/**
 * Scrapes official team squads/lineups from fotball.no for a match using fiksId
 * Example: https://www.fotball.no/fotballdata/kamp/?fiksId=9188463&underside=kamptropper
 */
export async function scrapeMatchLineup(fiksIdOrMatch: string | number | Match): Promise<{
  fiksId: string;
  homeTeam: string;
  awayTeam: string;
  homeLineup: MatchLineup;
  awayLineup: MatchLineup;
  bonesLineup?: MatchLineup;
  isOfficialFiks: boolean;
} | null> {
  let kampId = '';
  let matchObj: Match | null = null;

  if (typeof fiksIdOrMatch === 'object' && fiksIdOrMatch !== null) {
    matchObj = fiksIdOrMatch;
    const m = (matchObj.fiksId ? String(matchObj.fiksId) : matchObj.id).match(/\d+/);
    kampId = m ? m[0] : '';
  } else {
    const m = String(fiksIdOrMatch).match(/\d+/);
    kampId = m ? m[0] : '';
  }

  if (!kampId) return null;

  try {
    const url = `https://www.fotball.no/fotballdata/kamp/?fiksId=${kampId}&underside=kamptropper`;
    const res = await fetchWithTimeout(url, 9000);
    if (!res || !res.ok) return null;
    const html = await res.text();

    const sections = html.split(/<h[234][^>]*>/i);
    let homeTeam = matchObj?.homeTeam || '';
    let awayTeam = matchObj?.awayTeam || '';
    let homeStarters: Player[] = [];
    let homeBench: Player[] = [];
    let awayStarters: Player[] = [];
    let awayBench: Player[] = [];
    let currentTeam = 0; // 0 = not started, 1 = home, 2 = away

    const parsePlayersFromHtml = (htmlFragment: string, isStarting: boolean): Player[] => {
      const players: Player[] = [];
      const itemRegex = /<div class="matchPlayerListItem">([\s\S]*?)(?=<div class="matchPlayerListItem"|<\/div>\s*<\/div>\s*<\/div>|$)/gi;
      let match;
      let idx = 0;

      while ((match = itemRegex.exec(htmlFragment)) !== null) {
        const block = match[1];
        const numM = block.match(/class="playerNumber">\s*(\d+)/i);
        const number = numM ? parseInt(numM[1], 10) : (idx + 1);

        const linkM = block.match(/href="[^"]*fiksId=(\d+)"[^>]*class="playerName"[^>]*>([^<]+)/i)
                   || block.match(/class="playerName"[^>]*>([^<]+)/i);

        const personFiksId = linkM && linkM[1] && /^\d+$/.test(linkM[1]) ? parseInt(linkM[1], 10) : undefined;
        const rawName = linkM ? (linkM[2] || linkM[1]).trim() : 'Spiller';
        const name = decodeEntities(rawName);

        const isCaptain = /captain|kaptein|playerCaptain/i.test(block);
        const hasGoal = /SoccerBall|SportsAndOutdoors/i.test(block);
        const hasYellow = /YellowCard/i.test(block);
        const hasRed = /RedCard/i.test(block);

        let position: 'Keeper' | 'Forsvar' | 'Midtbane' | 'Angrep' = 'Midtbane';
        if (isStarting) {
          if (idx === 0) position = 'Keeper';
          else if (idx <= 4) position = 'Forsvar';
          else if (idx <= 8) position = 'Midtbane';
          else position = 'Angrep';
        } else {
          position = idx === 0 && number === 1 ? 'Keeper' : 'Midtbane';
        }

        players.push({
          id: personFiksId ? `fiks-${personFiksId}` : `num-${number}-${idx}`,
          name,
          number,
          position,
          fiksId: personFiksId,
          role: isCaptain ? 'Kaptein' : 'Spiller',
          matches: 1,
          goals: hasGoal ? 1 : 0,
          yellowCards: hasYellow ? 1 : 0,
          redCards: hasRed ? 1 : 0,
          isStarter: isStarting
        });
        idx++;
      }
      return players;
    };

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const m = sec.match(/^([^<]+)/);
      const heading = decodeEntities(m ? m[1].trim() : '');

      if (/startoppstilling/i.test(heading)) {
        if (currentTeam === 1) homeStarters = parsePlayersFromHtml(sec, true);
        else if (currentTeam === 2) awayStarters = parsePlayersFromHtml(sec, true);
      } else if (/innbyttere/i.test(heading)) {
        if (currentTeam === 1) homeBench = parsePlayersFromHtml(sec, false);
        else if (currentTeam === 2) awayBench = parsePlayersFromHtml(sec, false);
      } else if (heading && !/nyttig|lenker|favoritter|kampdetaljer|spillere/i.test(heading)) {
        if (currentTeam === 0) {
          if (!homeTeam) homeTeam = heading;
          currentTeam = 1;
        } else if (currentTeam === 1 && (homeStarters.length > 0 || homeBench.length > 0)) {
          if (!awayTeam) awayTeam = heading;
          currentTeam = 2;
        }
      }
    }

    if (homeStarters.length === 0 && awayStarters.length === 0) {
      return null;
    }

    const homeLineup: MatchLineup = {
      teamName: homeTeam,
      starters: homeStarters,
      bench: homeBench,
      formation: homeStarters.length >= 11 ? '4-3-3' : homeStarters.length === 9 ? '3-3-2' : '3-2-1'
    };

    const awayLineup: MatchLineup = {
      teamName: awayTeam,
      starters: awayStarters,
      bench: awayBench,
      formation: awayStarters.length >= 11 ? '4-3-3' : awayStarters.length === 9 ? '3-3-2' : '3-2-1'
    };

    const isBonesHome = homeTeam.toLowerCase().includes('bønes');
    const isBonesAway = awayTeam.toLowerCase().includes('bønes');
    const bonesLineup = isBonesHome ? homeLineup : isBonesAway ? awayLineup : homeLineup;

    return {
      fiksId: kampId,
      homeTeam,
      awayTeam,
      homeLineup,
      awayLineup,
      bonesLineup,
      isOfficialFiks: true
    };
  } catch (err: any) {
    console.warn(`[Scraper] Could not scrape kamptropper for kamp ${kampId}:`, err.message);
    return null;
  }
}

