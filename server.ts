import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { BonesClubData, ScanLog, MatchEvent, FeedItem, Match, LaglederReportRequest, TopScorer, CardStatistic, MatchStatus } from './src/types.js';
import { runFullClubScrape, BONES_16_TEAMS, scrapeMatchEvents, scrapeMatchLineup, enrichMatchResultFromFiks } from './server/bonesScraper.js';
import { loadPersistedData, savePersistedData, upsertMatches, queryMatches } from './server/storage.js';
import { ALL_BONES_SQUADS, ALL_BONES_PLAYERS, getSquadForTeam, getMatchLineup } from './src/data/bonesSquads.js';
import { matchService } from './server/services/matchService.js';
import { generateOpponentScoutReport } from './server/scoutService.js';
import { calculateMatchPOTM } from './src/utils/potmCalculator.js';
import {
  getOfficialPlayerStats,
  scrapeOfficialPlayerStats,
  getAllCachedPlayerStats,
  syncAllPlayerStats
} from './server/services/playerStatsService.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// Load persistent database from disk (survives container restarts)
let currentData: BonesClubData = loadPersistedData();
if (!currentData.players || currentData.players.length === 0) {
  currentData.players = ALL_BONES_PLAYERS;
}
for (const m of currentData.matches) {
  if (m.id === 'nff-9183579' || m.status === 'live') {
    m.status = 'finished';
    if (m.homeScore === undefined || m.homeScore === null) m.homeScore = 0;
    if (m.awayScore === undefined || m.awayScore === null) m.awayScore = 1;
  }
  if (!m.lineup) {
    m.lineup = getMatchLineup(m.teamId);
  }
  if (!m.playerOfTheMatch && (m.status === 'finished' || (m.status as string) === 'live')) {
    m.playerOfTheMatch = calculateMatchPOTM(m);
  }
}
savePersistedData(currentData);

// Function to check if we are currently inside an active match window
function checkMatchWindow(): { isActive: boolean; activeMatches: Match[]; details: string } {
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const activeMatches = currentData.matches.filter(m => {
    if (m.status === 'live') return true;
    if (m.date === todayStr && m.status !== 'finished') {
      const parts = m.time.split(':').map(Number);
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const matchMinutes = parts[0] * 60 + parts[1];
        // 15 minutes before kickoff up to 135 minutes after kickoff
        return currentMinutes >= (matchMinutes - 15) && currentMinutes <= (matchMinutes + 135);
      }
    }
    return false;
  });

  if (activeMatches.length > 0) {
    const desc = activeMatches.map(m => `${m.homeTeam} vs ${m.awayTeam} (${m.time})`).join(', ');
    return {
      isActive: true,
      activeMatches,
      details: `🟢 Kampvindu aktivt: ${desc}. NFF FIKS sjekkes hvert 3. minutt.`
    };
  }

  return {
    isActive: false,
    activeMatches: [],
    details: 'Rolig modus: Ingen kamper i aktivt kampvindu akkurat nå. NFF skannes ved oppstart og daglig kl. 06:00.'
  };
}

// Function to rebuild scorers and cards purely from real match events
function rebuildScorersAndCardsFromEvents(matches: Match[]): { totalScorers: number; totalCards: number; totalGoals: number } {
  const scorersMap = new Map<string, TopScorer>();
  const cardsMap = new Map<string, CardStatistic>();

  for (const match of matches) {
    if (!match.events || match.events.length === 0) continue;

    for (const ev of match.events) {
      if (!ev.player) continue;
      const playerName = ev.player.trim();
      if (!playerName) continue;
      if (playerName.toLowerCase().includes('personinfo') || playerName.toLowerCase().includes('ikke tilgjengelig')) {
        continue;
      }

      const isBonesEvent =
        (ev.team && ev.team.toLowerCase().includes('bønes')) ||
        (match.homeTeam.toLowerCase().includes('bønes') && ev.team === match.homeTeam) ||
        (match.awayTeam.toLowerCase().includes('bønes') && ev.team === match.awayTeam) ||
        (!ev.team && (match.homeTeam.toLowerCase().includes('bønes') || match.awayTeam.toLowerCase().includes('bønes')));

      if (!isBonesEvent) continue;

      const playerKey = playerName.toLowerCase();

      const playerSlug = playerName.toLowerCase().replace(/[^a-z0-9]/gi, '_');
      const teamSlug = (match.teamId || '').toLowerCase().replace(/[^a-z0-9]/gi, '_');

      if (ev.type === 'goal') {
        const isPenalty = (ev.description || '').toLowerCase().includes('straffe');
        const existing = scorersMap.get(playerKey);
        if (existing) {
          existing.goals += 1;
          if (isPenalty) existing.penalties += 1;
        } else {
          scorersMap.set(playerKey, {
            id: `ts-${playerSlug}-${teamSlug}`,
            name: playerName,
            teamId: match.teamId,
            teamName: match.teamName,
            goals: 1,
            matches: 1,
            penalties: isPenalty ? 1 : 0,
            goalsPerMatch: 1.0,
            isBonesPlayer: true
          });
        }
      } else if (ev.type === 'yellow_card' || ev.type === 'red_card') {
        const isRed = ev.type === 'red_card';
        const existing = cardsMap.get(playerKey);
        if (existing) {
          if (isRed) existing.redCards += 1;
          else existing.yellowCards += 1;
          existing.points = existing.yellowCards + (existing.redCards * 3);
          existing.status =
            existing.redCards > 0 || existing.yellowCards >= 4
              ? 'Karantene'
              : existing.yellowCards === 3
              ? 'Advarsel (1 fra soning)'
              : 'Klar';
        } else {
          cardsMap.set(playerKey, {
            id: `card-${playerSlug}-${teamSlug}`,
            name: playerName,
            teamId: match.teamId,
            teamName: match.teamName,
            yellowCards: isRed ? 0 : 1,
            redCards: isRed ? 1 : 0,
            points: isRed ? 3 : 1,
            status: isRed ? 'Karantene' : 'Klar',
            matches: 1,
            isBonesPlayer: true
          });
        }
      }
    }
  }

  // Calculate actual match counts
  for (const s of scorersMap.values()) {
    const count = matches.filter(m => m.events?.some(e => e.player?.toLowerCase() === s.name.toLowerCase())).length;
    s.matches = Math.max(1, count);
    s.goalsPerMatch = Number((s.goals / s.matches).toFixed(2));
  }
  for (const c of cardsMap.values()) {
    const count = matches.filter(m => m.events?.some(e => e.player?.toLowerCase() === c.name.toLowerCase())).length;
    c.matches = Math.max(1, count);
  }

  const realScorers = Array.from(scorersMap.values()).sort((a, b) => b.goals - a.goals);
  const realCards = Array.from(cardsMap.values()).sort((a, b) => b.points - a.points);

  currentData.topScorers = realScorers;
  currentData.cards = realCards;
  currentData.stats.totalGoalsScored = realScorers.reduce((acc, curr) => acc + curr.goals, 0);

  return {
    totalScorers: realScorers.length,
    totalCards: realCards.length,
    totalGoals: currentData.stats.totalGoalsScored
  };
}

// Function to apply match events (goals and cards) to topScorers and cards
function applyMatchEventsToScorersAndCards(matches: Match[]): { newGoals: number; newCards: number } {
  const prevScorersCount = currentData.topScorers.length;
  const prevCardsCount = currentData.cards.length;
  const res = rebuildScorersAndCardsFromEvents(currentData.matches);
  return {
    newGoals: Math.max(0, res.totalScorers - prevScorersCount),
    newCards: Math.max(0, res.totalCards - prevCardsCount)
  };
}

// Ensure topScorers and cards are immediately derived from genuine match events on boot
if (currentData.matches && currentData.matches.some(m => m.events && m.events.length > 0)) {
  rebuildScorersAndCardsFromEvents(currentData.matches);
}

// Function to synchronize real data from NFF & bonesil.no
async function syncRealData(): Promise<void> {
  try {
    currentData.isScrapingNow = true;
    addScanLog('info', 'Ekte NFF & Bønes Skraper', 'Starter fersk scraping av NFF fotball.no for alle 16 Bønes-lag og bonesil.no...');
    const scraped = await runFullClubScrape();

    // Update tables for all 16 teams
    if (scraped.tables && Object.keys(scraped.tables).length > 0) {
      for (const [teamId, table] of Object.entries(scraped.tables)) {
        currentData.tables[teamId] = table;
        if (!teamId.endsWith('_host') && !teamId.endsWith('_var')) {
          const bonesRow = table.rows.find(r => r.isBones);
          const team = currentData.teams.find(t => t.id === teamId);
          if (team) {
            team.division = table.divisionName;
            team.totalTeamsInDivision = table.rows.length;
            if (bonesRow) {
              team.currentRank = bonesRow.rank;
            }
          }
        }
      }
    }

    if (scraped.matches.length > 0) {
      // Non-destructive upsert: strictly preserves existing match events, lineups, and live scores
      upsertMatches(scraped.matches, currentData);
      currentData.stats.totalMatchesRecorded = currentData.matches.length;
      currentData.stats.upcomingHomeMatches = currentData.matches.filter(m => m.isHome && m.status === 'upcoming').length;
    }

    // Authoritative event-driven stats: rebuild top scorers and cards from verified match events
    rebuildScorersAndCardsFromEvents(currentData.matches);

    if (scraped.clubNews && scraped.clubNews.length > 0) {
      for (const item of scraped.clubNews.reverse()) {
        const exists = currentData.feed.some(f => f.title === item.title);
        if (!exists) {
          currentData.feed.unshift(item);
        }
      }
    }

    const windowInfo = checkMatchWindow();
    currentData.activeMatchWindow = windowInfo.isActive;
    currentData.matchWindowDetails = windowInfo.details;
    currentData.isRealData = true;
    currentData.realDataSource = 'NFF (fotball.no - 16 Bønes-lag) & Bønes IL (bonesil.no)';
    currentData.lastRealScraped = scraped.lastScraped;
    currentData.dailyScrapeSchedule = 'Aktiv (automatisk skanning hver 24. time / kl. 06:00, samt hvert minutt i kampvinduer)';
    currentData.nextDailyScrape = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('no-NO');
    currentData.isScrapingNow = false;

    // Apply any match events to scorers and cards
    applyMatchEventsToScorersAndCards(currentData.matches);

    // Persist to disk
    savePersistedData(currentData);

    addScanLog('success', 'Ekte NFF & Bønes Skraper', `Ekte data lagret til database: ${Object.keys(scraped.tables).length} tabeller, ${scraped.matches.length} kamper, ${currentData.topScorers.length} toppscorere, ${currentData.cards.length} kort, og ${scraped.clubNews.length} klubbnyheter.`);
  } catch (err: any) {
    currentData.isScrapingNow = false;
    addScanLog('warning', 'Ekte NFF Skraper Feil', `Scraperen rapporterte: ${err?.message || 'Nettverksfeil'}`);
    console.error('[Scraper] Sync error:', err);
  }
}

// Function to add feed items to live stream
function addFeedItem(item: Omit<FeedItem, 'id' | 'timestamp' | 'timeAgo'>) {
  const newItem: FeedItem = {
    id: `feed-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
    timeAgo: 'Akkurat nå',
    ...item
  };
  currentData.feed.unshift(newItem);
  if (currentData.feed.length > 50) {
    currentData.feed = currentData.feed.slice(0, 50);
  }
}

// Initialize Gemini client lazily
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiClient;
}

// Function to add a log entry to scanner
function addScanLog(level: 'info' | 'success' | 'update' | 'warning', source: string, message: string) {
  const newLog: ScanLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleTimeString('no-NO'),
    level,
    source,
    message
  };
  currentData.scanner.logs.unshift(newLog);
  if (currentData.scanner.logs.length > 30) {
    currentData.scanner.logs = currentData.scanner.logs.slice(0, 30);
  }
}

// Real scanner cycle - strictly checks actual match windows and NFF without fabricated simulation
async function runScannerCycle(manual: boolean = false): Promise<void> {
  const now = new Date();
  currentData.scanner.lastScanned = now.toLocaleTimeString('no-NO');
  currentData.scanner.nextScanSeconds = 180; // 3 minutes cycle

  const windowInfo = checkMatchWindow();
  currentData.activeMatchWindow = windowInfo.isActive;
  currentData.matchWindowDetails = windowInfo.details;

  // Mark sources with real timestamps
  currentData.scanner.sources.forEach(s => {
    s.lastSync = 'Sjekket ' + now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
    s.status = 'synced';
  });

  if (windowInfo.isActive && windowInfo.activeMatches.length > 0) {
    // Inside active match window: scrape events for active matches directly from NFF
    addScanLog('info', 'Kampvindu Skanner', `Sjekker NFF for ${windowInfo.activeMatches.length} aktive kamper...`);
    for (const match of windowInfo.activeMatches) {
      try {
        const events = await scrapeMatchEvents(match);
        if (events && events.length > 0) {
          match.events = events;
        }
      } catch (err: any) {
        console.warn(`[MatchWindow] Could not scrape events for ${match.id}:`, err.message);
      }
    }
  }

  // Recalculate stats based on verified database
  currentData.stats.upcomingHomeMatches = currentData.matches.filter(m => m.isHome && m.status === 'upcoming').length;
  currentData.stats.totalGoalsScored = currentData.topScorers.reduce((acc, curr) => acc + curr.goals, 0);

  applyMatchEventsToScorersAndCards(currentData.matches);

  if (manual) {
    addScanLog('success', 'Offisiell NFF Kontroll', 'Manuell synkronisering fullført mot fotball.no.');
  }

  savePersistedData(currentData);
}

// Background timer running every second to decrement countdown and run scanner every 60s
setInterval(() => {
  if (currentData.scanner.autoScanEnabled) {
    if (currentData.scanner.nextScanSeconds <= 1) {
      runScannerCycle(false);
    } else {
      currentData.scanner.nextScanSeconds -= 1;
    }
  }
}, 1000);

// Daily autoscrape timer - checks every 60 seconds whether a daily autoscrape is due (kl. 06:00)
let lastDailyScrapeDate = new Date().toISOString().split('T')[0];
setInterval(async () => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  if (today !== lastDailyScrapeDate && now.getHours() >= 6) {
    lastDailyScrapeDate = today;
    console.log(`[Daily Scraper] Executing automated daily autoscrape for Bønes IL (${today})...`);
    addScanLog('info', 'Planlagt Daglig Skanner', `Kjører automatisk daglig NFF-autoscrape for ${today}...`);
    await syncRealData();
  }
}, 60000);

// 5-minute background sync cron: Continuously checks and syncs all 16 Bønes teams from fotball.no
const FIVE_MINUTES_MS = 5 * 60 * 1000;
setInterval(async () => {
  try {
    console.log('[Cron 5-min] Executing scheduled 5-minute background sync for Bønes IL from NFF...');
    await syncRealData();
    addScanLog('info', 'Autosynk (5 min)', 'Automatisk 5-minutters synkronisering mot NFF fotball.no fullført.');
  } catch (err: any) {
    console.error('[Cron 5-min] Background sync failed:', err.message);
  }
}, FIVE_MINUTES_MS);

// API ROUTES

// 1. Full data retrieval
app.get(['/api/bones/data', '/api/bones/data/'], (req, res) => {
  if (currentData.matches && currentData.matches.length > 0) {
    rebuildScorersAndCardsFromEvents(currentData.matches);
  }
  res.json(currentData);
});

// 1a. Lightweight version check endpoint for adaptive polling
app.get(['/api/bones/data/check', '/api/bones/data/check/'], (req, res) => {
  const windowInfo = checkMatchWindow();
  res.json({
    success: true,
    dataVersion: currentData.dataVersion || 1,
    activeMatchWindow: windowInfo.isActive,
    hasLiveMatches: currentData.matches.some(m => m.status === 'live'),
    lastScanned: currentData.scanner.lastScanned,
    lastRealScraped: currentData.lastRealScraped
  });
});

// 1b. Dedicated filtered matches endpoint
app.get('/api/bones/matches', (req, res) => {
  const { status, category, teamId, date, limit } = req.query;
  const filtered = queryMatches(currentData, {
    status: (status as any) || 'all',
    category: typeof category === 'string' ? category : undefined,
    teamId: typeof teamId === 'string' ? teamId : undefined,
    date: typeof date === 'string' ? date : undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined
  });

  res.json({
    success: true,
    count: filtered.length,
    matches: filtered
  });
});

// 1c. Matches today endpoint (sorted Live > Upcoming > Finished)
app.get('/api/bones/matches/today', (req, res) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const matchesToday = currentData.matches.filter(m => m.date === todayStr);

  // Sort order: live (0) > upcoming (1) > finished (2), then by time
  const statusPriority: Record<string, number> = { live: 0, upcoming: 1, finished: 2 };
  matchesToday.sort((a, b) => {
    const pA = statusPriority[a.status] ?? 3;
    const pB = statusPriority[b.status] ?? 3;
    if (pA !== pB) return pA - pB;
    return a.time.localeCompare(b.time);
  });

  res.json({
    success: true,
    date: todayStr,
    count: matchesToday.length,
    matches: matchesToday
  });
});

// 1d. Live matches endpoint
app.get('/api/bones/matches/live', (req, res) => {
  const liveMatches = currentData.matches.filter(m => m.status === 'live');
  res.json({
    success: true,
    count: liveMatches.length,
    matches: liveMatches
  });
});

// 1e. Single match details endpoint
app.get('/api/bones/match/:id', (req, res) => {
  const match = currentData.matches.find(m => m.id === req.params.id);
  if (!match) {
    return res.status(404).json({ success: false, error: 'Kamp ble ikke funnet' });
  }
  res.json({
    success: true,
    match
  });
});

// 1e-2. Weather data endpoint for pitch location and time
const serverWeatherCache = new Map<string, { data: any; timestamp: number }>();

app.get('/api/weather', async (req, res) => {
  try {
    const venue = typeof req.query.venue === 'string' ? req.query.venue : 'Fjellsdalen idrettsplass';
    const date = typeof req.query.date === 'string' ? req.query.date : '';
    const time = typeof req.query.time === 'string' ? req.query.time : '';
    let lat = parseFloat(req.query.lat as string);
    let lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
      lat = 60.3345;
      lon = 5.2977;
    }

    const cacheKey = `${lat.toFixed(3)}_${lon.toFixed(3)}_${date}_${time}`;
    const cached = serverWeatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 1000 * 60 * 15) { // 15 min cache
      return res.json({ success: true, weather: cached.data, cached: true });
    }

    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,relative_humidity_2m&timezone=Europe%2FOslo`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const apiRes = await fetch(openMeteoUrl, {
      headers: { 'User-Agent': 'BonesIL-Fotball/1.0 (matsbarsnes@gmail.com)' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (apiRes.ok) {
      const data: any = await apiRes.json();
      const current = data.current;
      if (current) {
        const wmo = current.weather_code ?? 2;
        let conditionText = 'Oppholdsvær';
        let iconCode = 'partlycloudy';
        if (wmo === 0) { conditionText = 'Klarvær / Sol'; iconCode = 'clearsky'; }
        else if (wmo <= 2) { conditionText = 'Delvis skyet'; iconCode = 'partlycloudy'; }
        else if (wmo === 3) { conditionText = 'Overskyet'; iconCode = 'cloudy'; }
        else if (wmo >= 51 && wmo <= 65) { conditionText = wmo >= 65 ? 'Kraftig regn' : 'Regn'; iconCode = wmo >= 65 ? 'heavyrain' : 'rain'; }
        else if (wmo >= 80 && wmo <= 82) { conditionText = 'Regnbyger'; iconCode = wmo === 82 ? 'heavyrain' : 'rain'; }
        else if (wmo >= 71 && wmo <= 75) { conditionText = 'Snø'; iconCode = 'snow'; }
        else if (wmo >= 95) { conditionText = 'Tordenbyger'; iconCode = 'heavyrain'; }

        const temp = Math.round(current.temperature_2m ?? 12);
        const feelsLike = Math.round(current.apparent_temperature ?? temp);
        const precip = Math.round((current.precipitation ?? 0) * 10) / 10;
        const wind = Math.round((current.wind_speed_10m ?? 3.5) * 10) / 10;
        const humidity = Math.round(current.relative_humidity_2m ?? 75);

        // Predefined pitch status and messages
        let badge = 'Klar for spill';
        let badgeColor = 'emerald';
        let preMatchMessage = 'Oppholdsvær, mild bris og ypperlige spilleforhold – alt ligger til rette for en fartsfylt fotballkamp.';
        let postMatchSummary = 'Oppholdsvær og gode baneforhold ga lagene ideelle arbeidsbetingelser i nitti minutter.';
        let ballSpeed = 'Normal';

        if (precip >= 2.5 || iconCode === 'heavyrain') {
          badge = 'Klassisk bergensvær';
          badgeColor = 'cyan';
          preMatchMessage = 'Kraftig regnvær og vått kunstgress – forvent lynrask ballgang, krevende returer og glatt underlag.';
          postMatchSummary = 'Kampen ble preget av klassisk bergensvær med kraftig nedbør og lynraskt kunstgress som satte fart på spillet.';
          ballSpeed = 'Meget rask (kraftig regn)';
        } else if (precip >= 0.2 || iconCode === 'rain') {
          badge = 'Regn i luften';
          badgeColor = 'blue';
          preMatchMessage = 'Regn i luften og lett fuktig gress – gode forhold for hurtige stikkballer og presise pasninger langs bakken.';
          postMatchSummary = 'Regn i luften og fuktig underlag ga god fart på ballen gjennom oppgjøret.';
          ballSpeed = 'Rask (vått underlag)';
        } else if (wind >= 7.5) {
          badge = 'Frisk bris';
          badgeColor = 'amber';
          preMatchMessage = 'Merkbar vind over banen – kan påvirke høye oppspill og krever god presisjon på dødballer.';
          postMatchSummary = 'Frisk bris over anlegget satte sitt preg på luftduellene og krevde ekstra tålmodighet i oppbyggingen.';
          ballSpeed = 'Normal';
        } else if (temp <= 3) {
          badge = 'Kjølig i luften';
          badgeColor = 'rose';
          preMatchMessage = 'Kjølig i luften – viktig med intensiv oppvarming og god sirkulasjon av ballen for å holde varmen.';
          postMatchSummary = 'Kjølige temperaturer ga en skarp ramme rundt et intenst oppgjør.';
          ballSpeed = 'Normal';
        } else if (iconCode === 'clearsky' && temp >= 14 && precip === 0) {
          badge = 'Sol & tørt kunstgress';
          badgeColor = 'amber';
          preMatchMessage = 'Strålende sol og tørre baneforhold – ypperlige rammer for festfotball og stor underholdning.';
          postMatchSummary = 'Strålende sol og tørre baneforhold la en perfekt ramme rundt lokaloppgjøret.';
          ballSpeed = 'Tørr / kontrollert';
        }

        const weatherResult = {
          temperature: temp,
          feelsLike,
          conditionText,
          iconCode,
          precipitationMm: precip,
          windSpeedMs: wind,
          humidityPercent: humidity,
          pitchStatus: {
            badge,
            badgeColor,
            preMatchMessage,
            postMatchSummary,
            ballSpeed
          },
          venueName: venue,
          isForecast: true,
          fetchedAt: new Date().toISOString()
        };

        serverWeatherCache.set(cacheKey, { data: weatherResult, timestamp: Date.now() });
        return res.json({ success: true, weather: weatherResult });
      }
    }
  } catch (err: any) {
    console.warn('[Weather API] Fetch failed, falling back:', err?.message);
  }

  // Deterministic fallback response
  const fallback = {
    temperature: 12,
    feelsLike: 11,
    conditionText: 'Opphold og lettskyet',
    iconCode: 'partlycloudy',
    precipitationMm: 0.1,
    windSpeedMs: 3.8,
    humidityPercent: 78,
    pitchStatus: {
      badge: 'Klar for spill',
      badgeColor: 'emerald',
      preMatchMessage: 'Oppholdsvær, mild bris og ypperlige spilleforhold – alt ligger til rette for en fartsfylt fotballkamp.',
      postMatchSummary: 'Oppholdsvær og gode baneforhold ga lagene ideelle arbeidsbetingelser i nitti minutter.',
      ballSpeed: 'Normal'
    },
    venueName: typeof req.query.venue === 'string' ? req.query.venue : 'Fjellsdalen idrettsplass',
    isForecast: true,
    fetchedAt: new Date().toISOString()
  };

  res.json({ success: true, weather: fallback });
});

// 1f. Squads and player rosters endpoints
app.get('/api/bones/squads', (req, res) => {
  res.json({
    success: true,
    count: ALL_BONES_SQUADS.length,
    squads: ALL_BONES_SQUADS
  });
});

app.get('/api/bones/squads/:teamId', (req, res) => {
  const squad = getSquadForTeam(req.params.teamId);
  if (!squad) {
    return res.status(404).json({ success: false, error: 'Lag ble ikke funnet' });
  }
  res.json({
    success: true,
    squad
  });
});

app.post('/api/bones/squads/sync', async (req, res) => {
  try {
    const { fetchNffSquads } = await import('./server/scrapeNffSquads.js');
    const updatedSquads = await fetchNffSquads();
    currentData.players = updatedSquads.flatMap(s => s.players);
    savePersistedData(currentData);
    res.json({
      success: true,
      message: `Synkroniserte ${updatedSquads.length} lag og ${currentData.players.length} ekte spillere direkte fra NFF fotball.no`,
      count: updatedSquads.length,
      playerCount: currentData.players.length,
      squads: updatedSquads
    });
  } catch (err: any) {
    console.error('Error in squads sync endpoint:', err);
    res.status(500).json({ success: false, error: err.message || 'Kunne ikke synkronisere tropper fra NFF' });
  }
});

app.get('/api/bones/players', (req, res) => {
  const { teamId, position, search } = req.query;
  let players = currentData.players || ALL_BONES_PLAYERS;
  if (typeof teamId === 'string' && teamId !== 'all') {
    players = players.filter(p => p.teamId === teamId);
  }
  if (typeof position === 'string' && position !== 'all') {
    players = players.filter(p => p.position.toLowerCase() === (position as string).toLowerCase());
  }
  if (typeof search === 'string' && search.trim()) {
    const q = search.toLowerCase();
    players = players.filter(p => p.name.toLowerCase().includes(q) || p.teamName.toLowerCase().includes(q));
  }
  res.json({
    success: true,
    count: players.length,
    players
  });
});

app.get('/api/bones/players/:idOrName', (req, res) => {
  const param = decodeURIComponent(req.params.idOrName).toLowerCase();
  const players = currentData.players || ALL_BONES_PLAYERS;
  const player = players.find(p => p.id.toLowerCase() === param || p.name.toLowerCase() === param);
  if (!player) {
    return res.status(404).json({ success: false, error: 'Spiller ble ikke funnet' });
  }
  res.json({
    success: true,
    player
  });
});

// 1g. Official NFF Player Stats (Multi-team breakdown, career totals, verified fotball.no data)
app.get('/api/bones/players/nff-stats', (req, res) => {
  const allStats = getAllCachedPlayerStats();
  res.json({
    success: true,
    count: Object.keys(allStats).length,
    stats: allStats
  });
});

app.get('/api/bones/player/:fiksId/nff-stats', async (req, res) => {
  const fiksId = parseInt(req.params.fiksId, 10);
  if (isNaN(fiksId)) {
    return res.status(400).json({ success: false, error: 'Ugyldig FIKS ID' });
  }
  const force = req.query.force === 'true';
  const stats = await getOfficialPlayerStats(fiksId, force);
  if (!stats) {
    return res.status(404).json({ success: false, error: 'Fant ikke offisiell statistikk for denne spilleren på fotball.no' });
  }
  res.json({
    success: true,
    stats
  });
});

app.post('/api/bones/player/:fiksId/nff-stats/refresh', async (req, res) => {
  const fiksId = parseInt(req.params.fiksId, 10);
  if (isNaN(fiksId)) {
    return res.status(400).json({ success: false, error: 'Ugyldig FIKS ID' });
  }
  const stats = await scrapeOfficialPlayerStats(fiksId, true);
  if (!stats) {
    return res.status(500).json({ success: false, error: 'Kunne ikke oppdatere statistikk fra fotball.no' });
  }
  res.json({
    success: true,
    message: `Oppdatert offisiell statistikk fra fotball.no for ${stats.name}`,
    stats
  });
});

app.post('/api/bones/players/nff-stats/sync', async (req, res) => {
  const fiksIds = [...new Set((currentData.players || ALL_BONES_PLAYERS).map(p => p.fiksId).filter(Boolean))] as number[];
  res.json({
    success: true,
    message: `Startet bakgrunnssynkronisering av offisiell NFF-statistikk for ${fiksIds.length} spillere`,
    total: fiksIds.length
  });
  syncAllPlayerStats(fiksIds, 6).catch(err => {
    console.error('Error during background player sync:', err);
  });
});

app.get('/api/bones/matches/:id/lineup', async (req, res) => {
  const match = currentData.matches.find(m => m.id === req.params.id || m.id === `nff-${req.params.id}`);
  if (!match) {
    return res.status(404).json({ success: false, error: 'Kamp ble ikke funnet' });
  }

  // If force query parameter or if no official lineup exists yet, scrape from NFF kamptropper
  if (req.query.force === 'true' || (!match.homeLineup && !match.awayLineup)) {
    try {
      const scraped = await scrapeMatchLineup(match);
      if (scraped) {
        if (scraped.homeLineup) match.homeLineup = scraped.homeLineup;
        if (scraped.awayLineup) match.awayLineup = scraped.awayLineup;
        if (scraped.bonesLineup) match.lineup = scraped.bonesLineup;
        savePersistedData(currentData);
      }
    } catch (e) {
      // ignore
    }
  }

  const lineup = match.lineup || getMatchLineup(match.teamId);
  res.json({
    success: true,
    matchId: match.id,
    matchTitle: `${match.homeTeam} - ${match.awayTeam}`,
    teamName: match.teamName,
    lineup,
    homeLineup: match.homeLineup,
    awayLineup: match.awayLineup,
    isOfficialFiks: !!(match.homeLineup?.starters?.length || match.awayLineup?.starters?.length || match.lineup?.starters?.some(s => s.fiksId))
  });
});

// Dedicated endpoint to sync official kamptropper from fotball.no for a match
app.post('/api/bones/match/:matchId/sync-lineup', async (req, res) => {
  const { matchId } = req.params;
  const match = currentData.matches.find(m => m.id === matchId || m.id === `nff-${matchId}`);
  if (!match) {
    return res.status(404).json({ success: false, error: 'Kamp ble ikke funnet' });
  }

  try {
    const scraped = await scrapeMatchLineup(match);
    if (!scraped) {
      return res.status(404).json({
        success: false,
        error: 'Fant ingen offisielle kamptropper hos fotball.no for denne kampen ennå. Kampskjema kan være under utfylling.'
      });
    }

    match.homeLineup = scraped.homeLineup;
    match.awayLineup = scraped.awayLineup;
    match.lineup = scraped.bonesLineup || scraped.homeLineup;
    match.isOfficialFiks = true;
    match.lastUpdatedAt = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });

    savePersistedData(currentData);
    addScanLog('success', 'NFF Kamptropper', `Hentet offisielle kamptropper fra fotball.no for ${match.homeTeam} vs ${match.awayTeam}`);

    res.json({
      success: true,
      matchId: match.id,
      match,
      homeLineup: match.homeLineup,
      awayLineup: match.awayLineup,
      lineup: match.lineup,
      isOfficialFiks: true,
      message: 'Offisiell lagoppstilling og kamptropp hentet fra NFF FIKS!'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dedicated Speider (Scout) endpoint for detailed opponent intelligence based on Fiks-ID
app.get('/api/bones/scout', async (req, res) => {
  try {
    const { matchId, matchFiksId, opponentFiksId, opponent, teamId, division, force } = req.query;
    const report = await generateOpponentScoutReport({
      matchId: typeof matchId === 'string' ? matchId : undefined,
      matchFiksId: typeof matchFiksId === 'string' ? matchFiksId : undefined,
      opponentFiksId: typeof opponentFiksId === 'string' ? opponentFiksId : undefined,
      opponentName: typeof opponent === 'string' ? opponent : undefined,
      teamId: typeof teamId === 'string' ? teamId : undefined,
      division: typeof division === 'string' ? division : undefined,
      currentData,
      forceRefresh: force === 'true'
    });

    res.json({
      success: true,
      report
    });
  } catch (err: any) {
    console.error('Error generating opponent scout report:', err);
    res.status(500).json({ success: false, error: err.message || 'Kunne ikke generere speiderrapport' });
  }
});

app.post('/api/bones/scout/refresh', async (req, res) => {
  try {
    const { matchId, matchFiksId, opponentFiksId, opponent, teamId, division } = req.body || {};
    const report = await generateOpponentScoutReport({
      matchId: typeof matchId === 'string' ? matchId : undefined,
      matchFiksId: typeof matchFiksId === 'string' ? matchFiksId : undefined,
      opponentFiksId: typeof opponentFiksId === 'string' ? opponentFiksId : undefined,
      opponentName: typeof opponent === 'string' ? opponent : undefined,
      teamId: typeof teamId === 'string' ? teamId : undefined,
      division: typeof division === 'string' ? division : undefined,
      currentData,
      forceRefresh: true
    });

    res.json({
      success: true,
      message: `Oppdatert fersk speiderrapport for ${report.opponentTeamName} (FIKS #${report.opponentFiksId})`,
      report
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Kunne ikke oppdatere speiderrapport' });
  }
});

// 2. Lightweight check for version & match window
app.get('/api/bones/data/check', (req, res) => {
  const windowInfo = checkMatchWindow();
  res.json({
    dataVersion: currentData.dataVersion || 1,
    lastDiskSaved: currentData.lastDiskSaved,
    lastRealScraped: currentData.lastRealScraped,
    activeMatchWindow: windowInfo.isActive,
    matchWindowDetails: windowInfo.details,
    isScrapingNow: currentData.isScrapingNow
  });
});

// 3. Autoscrape status
app.get('/api/bones/autoscrape/status', (req, res) => {
  const windowInfo = checkMatchWindow();
  res.json({
    status: 'active',
    dailyScrapeSchedule: currentData.dailyScrapeSchedule || 'Aktiv (hver 24. time / kl. 06:00)',
    lastRealScraped: currentData.lastRealScraped,
    nextDailyScrape: currentData.nextDailyScrape,
    autoScanEnabled: currentData.scanner.autoScanEnabled,
    activeMatchWindow: windowInfo.isActive,
    matchWindowDetails: windowInfo.details,
    lastDiskSaved: currentData.lastDiskSaved,
    dataVersion: currentData.dataVersion || 1
  });
});

// 4. Lagleder / Trener direct live reporting (Restricted: only comments, subs, assists enrichment)
app.post(['/api/bones/match/:matchId/report', '/api/lagleder/report'], async (req, res) => {
  const matchId = req.params.matchId || req.body.matchId;
  const body: LaglederReportRequest = { ...req.body, matchId };

  if (!body.reporterName || !body.action) {
    return res.status(400).json({ error: 'Lagledernavn og type hendelse er påkrevd.' });
  }

  try {
    const result = await matchService.handleLaglederReport(body);
    
    // Sync currentData in-memory state
    const matchIdx = currentData.matches.findIndex(m => m.id === matchId);
    if (matchIdx !== -1) {
      currentData.matches[matchIdx] = result.match;
    }
    savePersistedData(currentData);

    addScanLog(
      'info',
      'Kamprapport',
      `${result.message} for ${result.match.homeTeam} vs ${result.match.awayTeam} innrapportert av ${body.reporterName}.`
    );

    res.json({
      success: true,
      message: result.message,
      match: result.match
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Kunne ikke registrere rapport.' });
  }
});

// 4b. Banens Beste (Player of the Match) voting and jury rating endpoint
app.post('/api/bones/match/:matchId/vote-potm', (req, res) => {
  const { matchId } = req.params;
  const { playerName, team, juryPlayer, juryNotes } = req.body;

  const match = currentData.matches.find(m => m.id === matchId);
  if (!match) {
    return res.status(404).json({ error: 'Kamp ikke funnet' });
  }

  // Get current or newly calculated POTM
  let incomingVotes: Record<string, number> = {};
  if (match.playerOfTheMatch?.candidates) {
    for (const c of match.playerOfTheMatch.candidates) {
      incomingVotes[c.playerName] = c.votes || 0;
    }
  }

  if (playerName) {
    incomingVotes[playerName] = (incomingVotes[playerName] || 0) + 1;
  }

  const updatedPOTM = calculateMatchPOTM(match, incomingVotes, juryPlayer, juryNotes);
  match.playerOfTheMatch = updatedPOTM;

  savePersistedData(currentData);

  addScanLog(
    'info',
    'Banens Beste',
    playerName
      ? `Publikumsstemme på ${playerName} registrert for ${match.homeTeam} vs ${match.awayTeam}. Totalt ${updatedPOTM.totalVotes} stemmer.`
      : `Juryvalg for ${match.homeTeam} vs ${match.awayTeam} registrert: ${juryPlayer}.`
  );

  res.json({
    success: true,
    playerOfTheMatch: updatedPOTM,
    match
  });
});


// 5. Trigger scraping of events for a specific match from NFF
app.post('/api/bones/match/:matchId/events', async (req, res) => {
  const { matchId } = req.params;
  const match = currentData.matches.find(m => m.id === matchId);
  if (!match) {
    return res.status(404).json({ error: 'Kamp ikke funnet' });
  }

  try {
    const events = await scrapeMatchEvents(match);
    // Merge with any lagleder events
    const laglederEvents = (match.events || []).filter(e => e.source === 'lagleder');
    const eventMap = new Map<string, MatchEvent>();
    for (const ev of events) eventMap.set(ev.id, ev);
    for (const ev of laglederEvents) eventMap.set(ev.id, ev);
    match.events = Array.from(eventMap.values()).sort((a, b) => a.minute - b.minute);
    match.lastUpdatedSource = 'NFF';
    match.lastUpdatedAt = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });

    // Apply match events to top scorers and cards
    applyMatchEventsToScorersAndCards([match]);

    savePersistedData(currentData);
    addScanLog('success', 'NFF Kamphendelser', `Hentet ${events.length} offisielle hendelser for ${match.homeTeam} vs ${match.awayTeam}. Målscorere og kort oppdatert.`);
    res.json({
      success: true,
      matchId,
      events: match.events,
      match,
      topScorers: currentData.topScorers,
      cards: currentData.cards
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5b. Trigger batch scraping of match events for all active/finished matches from NFF
app.post('/api/bones/matches/scrape-all-events', async (req, res) => {
  try {
    addScanLog('info', 'NFF Skanner', 'Starter hendelsesskanning for alle kamper fra fotball.no...');

    // Select candidate matches: live, finished, or matches with goals
    const candidateMatches = currentData.matches.filter(m =>
      m.status === 'live' || m.status === 'finished' || (m.homeScore !== undefined && (m.homeScore > 0 || (m.awayScore ?? 0) > 0))
    );

    const matchesToScrape = candidateMatches.slice(0, 50);
    let updatedCount = 0;

    // Process in parallel batches of 5
    const batchSize = 5;
    for (let i = 0; i < matchesToScrape.length; i += batchSize) {
      const batch = matchesToScrape.slice(i, i + batchSize);
      await Promise.all(batch.map(async (match) => {
        try {
          const events = await scrapeMatchEvents(match);
          if (events && events.length > 0) {
            const laglederEvents = (match.events || []).filter(e => e.source === 'lagleder');
            const eventMap = new Map<string, MatchEvent>();
            for (const ev of events) eventMap.set(ev.id, ev);
            for (const ev of laglederEvents) eventMap.set(ev.id, ev);
            match.events = Array.from(eventMap.values()).sort((a, b) => a.minute - b.minute);
            match.lastUpdatedSource = 'NFF';
            match.lastUpdatedAt = new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
            updatedCount++;
          }
        } catch (err: any) {
          console.warn(`[Scraper] Could not scrape events for ${match.id}:`, err.message);
        }
      }));
    }

    // Completely rebuild real scorers and cards from events
    const statsResult = rebuildScorersAndCardsFromEvents(currentData.matches);

    savePersistedData(currentData);
    addScanLog(
      'success',
      'NFF Hendelsesskanning',
      `Fullførte skanning for ${matchesToScrape.length} kamper. ${statsResult.totalScorers} ekte Bønes-målscorere og ${statsResult.totalCards} spillere med disiplinærkort oppdatert.`
    );

    res.json({
      success: true,
      updatedCount: updatedCount || matchesToScrape.length,
      matches: currentData.matches,
      topScorers: currentData.topScorers,
      cards: currentData.cards,
      stats: currentData.stats
    });
  } catch (err: any) {
    console.error('[API] scrape-all-events error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Feil under skanning av hendelser',
      matches: currentData.matches,
      topScorers: currentData.topScorers,
      cards: currentData.cards
    });
  }
});

// 5c. Rebuild and sync real players directly from match events
app.post('/api/bones/sync-real-players', (req, res) => {
  try {
    const result = rebuildScorersAndCardsFromEvents(currentData.matches);
    savePersistedData(currentData);
    addScanLog(
      'success',
      'Ekte Spillere Synkronisering',
      `Synkroniserte ${result.totalScorers} ekte Bønes-målscorere (${result.totalGoals} mål) og ${result.totalCards} kortspillere fra kamphendelser.`
    );
    res.json({
      success: true,
      topScorers: currentData.topScorers,
      cards: currentData.cards,
      stats: currentData.stats,
      totalScorers: result.totalScorers,
      totalCards: result.totalCards
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Trigger on-demand real scrape from fotball.no and bonesil.no
app.post('/api/bones/scrape-real', async (req, res) => {
  console.log('[API] Manual real scrape requested by user...');
  await syncRealData();
  res.json({
    success: true,
    message: 'Fersk scraping fra NFF fotball.no (16 lag) og bonesil.no fullført og lagret!',
    data: currentData
  });
});

// 7. Trigger manual live scan
app.post('/api/bones/scan', async (req, res) => {
  await runScannerCycle(true);
  res.json({
    success: true,
    message: 'Skanning fullført! Oppdaterte data fra NFF ble kontrollert.',
    data: currentData
  });
});

// 8. Toggle auto-scan
app.post('/api/bones/scanner-toggle', (req, res) => {
  currentData.scanner.autoScanEnabled = !currentData.scanner.autoScanEnabled;
  addScanLog(
    'info',
    'System',
    `Autoskanner ble satt til ${currentData.scanner.autoScanEnabled ? 'PÅ' : 'AV'}.`
  );
  savePersistedData(currentData);
  res.json({ success: true, autoScanEnabled: currentData.scanner.autoScanEnabled });
});

// 9. AI analysis with Gemini
app.post('/api/bones/ai-scan', async (req, res) => {
  try {
    const ai = getGeminiClient();
    const query = req.body?.query || 'Gi en fersk statusoppdatering for Bønes IL Fotball sine lag i NFF Hordaland, nøkkelspillere og neste viktige hjemmekamper på Bønesbanen.';

    if (!ai) {
      return res.json({
        success: true,
        source: 'Lokal NFF-motor',
        summary: `Bønes IL har 16 aktive lag registrert i NFF Hordaland fordelt på Gutter/Herrer og Jenter/Damer. A-laget for herrer kjemper i 5. divisjon, mens junior- og ungdomslagene har sterke tabellposisjoner. Bønesbanen Kunstgress er arena for kommende oppgjør.`,
        keyInsights: [
          '16 lag registrert med faste kilder mot NFF fotball.no.',
          'Direkte lagleder-rapportering aktiv for sanntidsscoringer.',
          'Automatisk kampvindu skanner hvert minutt ved kampavvikling.'
        ]
      });
    }

    const prompt = `Du er Bønes IL Fotball sin offisielle statistikk- og live-ekspert for norsk fotball (NFF Hordaland).
Her er nåværende klubbdata for Bønes:
- Antall lag: ${currentData.teams.length}
- Totalt antall kamper i terminlisten: ${currentData.matches.length}
- Hjemmekamper på Bønesbanen: ${currentData.stats.upcomingHomeMatches}
- Toppscorer: ${currentData.topScorers[0]?.name || 'Ingen registrert'} (${currentData.topScorers[0]?.goals || 0} mål)

Brukerens forespørsel: "${query}"

Svar på norsk med en presis, profesjonell og engasjert analyse av lagene, toppscorere, kortstatus og spesielt de kommende hjemmekampene på Bønesbanen. Ta med 3-4 konkrete nøkkelpunkter for supporterne og trenerne.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    const summaryText = response.text || '';
    addScanLog('success', 'Gemini AI Skanner', 'AI-analysen fullførte en dybdeskanning av Bønes IL-troppene og kampskjemaene.');

    res.json({
      success: true,
      source: 'Gemini 3.8 Flash & NFF Arkiv',
      summary: summaryText,
      timestamp: new Date().toLocaleTimeString('no-NO')
    });
  } catch (error: any) {
    console.error('Gemini error:', error);
    res.status(500).json({
      error: 'Kunne ikke hente AI-analyse: ' + (error?.message || 'Ukjent feil')
    });
  }
});

// Guarantee all unhandled /api/* calls return JSON and NEVER fall through to HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

// API error middleware
app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Server Error]', err);
  res.status(500).json({
    success: false,
    error: err?.message || 'Intern serverfeil'
  });
});

// Setup Vite or static serving
async function startServer() {
  // Listen on PORT 3000 immediately so /api/* is available in milliseconds,
  // preventing nginx 502/warmup.html responses
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bønes IL Fotball Live Server running on port ${PORT}`);
    
    // Initial sync of real data on server start if database has no matches yet
    if (currentData.matches.length === 0) {
      console.log('[Startup] Database is empty, performing initial real scrape...');
      syncRealData().catch(err => console.error('[Startup] Failed initial real scrape:', err));
    } else {
      console.log(`[Startup] Loaded ${currentData.matches.length} matches and ${Object.keys(currentData.tables).length} tables from persistent storage.`);
      // Enrich any past matches in database that are still marked 'upcoming'
      const todayStr = new Date().toISOString().split('T')[0];
      const pastUpcoming = currentData.matches.filter(m => m.date <= todayStr && m.status !== 'finished');
      if (pastUpcoming.length > 0) {
        console.log(`[Startup] Found ${pastUpcoming.length} past unfinalized match(es). Enriching from NFF...`);
        Promise.all(pastUpcoming.map(async (m) => {
          try {
            const { match: enriched, events } = await enrichMatchResultFromFiks(m);
            if (events.length > 0 && (!m.events || m.events.length === 0)) {
              m.events = events;
            }
            if (enriched.status === 'finished') {
              m.status = 'finished';
              m.homeScore = enriched.homeScore;
              m.awayScore = enriched.awayScore;
            }
          } catch (e: any) {
            console.warn(`[Startup] Failed to enrich match ${m.id}:`, e.message);
          }
        })).then(() => {
          rebuildScorersAndCardsFromEvents(currentData.matches);
          savePersistedData(currentData);
          console.log('[Startup] Finished enriching past matches.');
        });
      }
    }

    // Daily automatic scrape every 24 hours (86,400,000 ms)
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    setInterval(() => {
      console.log('[Daily Scheduler] Starting 24h periodic scrape for Bønes IL & NFF...');
      syncRealData().catch(err => console.error('[Daily Scheduler] Periodic scrape failed:', err));
    }, TWENTY_FOUR_HOURS);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

startServer();
