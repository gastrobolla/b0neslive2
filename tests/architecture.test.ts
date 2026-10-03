import assert from 'node:assert';
import {
  toCanonicalPlayerId,
  extractNumericFiksId,
  resolvePlayerIdentity,
  buildPersonsFromPlayersAndEvents,
} from '../src/utils/playerResolver.js';
import {
  calculateMatchScore,
  calculateTopScorers,
  calculateCardStatistics,
  generateDeterministicEventId,
  isOwnGoalEvent,
} from '../src/utils/derivedStats.js';
import {
  ClubConfig,
  getClubConfig,
  registerClubConfig,
  listClubConfigs,
  isClubTeam,
  BONES_CLUB_CONFIG,
  FANA_CLUB_CONFIG,
} from '../src/config/clubConfig.js';
import { Match, MatchEvent, Player } from '../src/types.js';
import { migrateToV2, getDatabaseFilePath } from '../server/storage.js';

console.log('🚀 Running Full Architecture & Quality Assurance Invariant Tests...\n');

// =========================================================================
// TEST 1: Same FIKS-ID across different teams/seasons -> Same canonical player
// =========================================================================
console.log('▶ TEST 1: Canonical Player Identity (Same FIKS-ID -> Same Person)');
{
  const p1: Player = {
    id: 'p-1',
    name: 'Henrik Vindenes',
    teamId: 'g16-1',
    teamName: 'Bønes G16-1',
    fiksId: 123456,
    position: 'Angrep',
    season: '2025',
    jerseyNumber: 10,
    matches: 0,
    goals: 0,
    yellowCards: 0,
    redCards: 0,
  };

  const p2: Player = {
    id: 'p-2',
    name: 'Henrik Vindenes',
    teamId: 'g19-1', // Moved to older age group in next season
    teamName: 'Bønes G19-1',
    fiksId: 123456,
    position: 'Midtbane',
    season: '2026',
    jerseyNumber: 7,
    matches: 0,
    goals: 0,
    yellowCards: 0,
    redCards: 0,
  };

  const cId1 = toCanonicalPlayerId(p1.fiksId, p1.name);
  const cId2 = toCanonicalPlayerId(p2.fiksId, p2.name);
  assert.strictEqual(cId1, 'fiks-123456');
  assert.strictEqual(cId2, 'fiks-123456');
  assert.strictEqual(cId1, cId2, 'Same FIKS-ID must yield exact same canonical ID');

  const persons = buildPersonsFromPlayersAndEvents([p1, p2], [], 'bones');
  assert.strictEqual(persons.length, 1, 'Expected exactly 1 canonical Person for same FIKS-ID');
  const person = persons[0];
  assert.strictEqual(person.canonicalPlayerId, 'fiks-123456');
  assert.strictEqual(person.fiksId, 123456);
  assert.strictEqual(person.teams.length, 2, 'Person must aggregate all team representations without duplication');
  console.log('  ✔ Passed: Person aggregated across teams with single canonical identity.');
}

// =========================================================================
// TEST 2: Same Name (Different FIKS-IDs) -> Different Persons; Ambiguous Name -> Unresolved
// =========================================================================
console.log('\n▶ TEST 2: Same Name Disambiguation & Ambiguity Guardrail');
{
  const playerA: Player = {
    id: 'fiks-11111',
    name: 'Magnus Olsen',
    teamId: 'g14-1',
    fiksId: 11111,
    matches: 0,
    goals: 0,
    yellowCards: 0,
    redCards: 0,
  };

  const playerB: Player = {
    id: 'fiks-22222',
    name: 'Magnus Olsen', // Identical name, distinct individual
    teamId: 'g16-2',
    fiksId: 22222,
    matches: 0,
    goals: 0,
    yellowCards: 0,
    redCards: 0,
  };

  const persons = buildPersonsFromPlayersAndEvents([playerA, playerB], [], 'bones');
  assert.strictEqual(persons.length, 2, 'Expected 2 distinct Persons for identical names with different FIKS-IDs');
  assert.notStrictEqual(persons[0].canonicalPlayerId, persons[1].canonicalPlayerId);

  // Ambiguity Guardrail:
  // When an event has only the name 'Magnus Olsen' and multiple candidates exist without match scope,
  // it MUST return ambiguous = true / unresolved (NEVER GUESS!)
  const ambiguousRes = resolvePlayerIdentity(
    { name: 'Magnus Olsen' },
    { allClubPlayers: [playerA, playerB], clubConfig: BONES_CLUB_CONFIG }
  );
  assert.strictEqual(ambiguousRes.ambiguous, true, 'Central resolver must flag ambiguous match when multiple players share name');
  assert.strictEqual(ambiguousRes.confidence, 'ambiguous', 'Resolver confidence must be ambiguous');
  assert.strictEqual(ambiguousRes.fiksId, undefined, 'Ambiguous resolution must not guess a fiksId');
  console.log('  ✔ Passed: Multi-individual disambiguation and ambiguity guardrail verified.');
}

// =========================================================================
// TEST 3: MatchEvent = Single Source of Truth for Score & Stats (including Own Goals)
// =========================================================================
console.log('\n▶ TEST 3: Event-Driven Stats, Match Scores, and Own Goal Invariants');
{
  const events: MatchEvent[] = [
    {
      id: 'ev-1',
      matchId: 'm-1',
      minute: 12,
      type: 'goal',
      player: 'Henrik Vindenes',
      playerId: 'fiks-123456',
      fiksId: 123456,
      team: 'Bønes G16-1',
      description: '12\' Mål: Henrik Vindenes',
    },
    {
      id: 'ev-2',
      matchId: 'm-1',
      minute: 34,
      type: 'goal',
      player: 'Opponent Striker',
      team: 'Fana G16-1',
      description: '34\' Mål: Opponent Striker',
    },
    {
      id: 'ev-3',
      matchId: 'm-1',
      minute: 78,
      type: 'goal',
      goalType: 'own_goal',
      description: '78\' Selvmål: Bønes Defender (sm)',
      player: 'Bønes Defender',
      playerId: 'fiks-999999',
      fiksId: 999999,
      team: 'Bønes G16-1', // Scored by Bønes defender into own net
    },
    {
      id: 'ev-4',
      matchId: 'm-1',
      minute: 85,
      type: 'yellow_card',
      player: 'Henrik Vindenes',
      playerId: 'fiks-123456',
      fiksId: 123456,
      team: 'Bønes G16-1',
      description: '85\' Gult kort: Henrik Vindenes',
    },
  ];

  // Derive match score: Bønes (Home) has 1 normal goal + 1 own goal scored by Bønes defender.
  // Fana (Away) has 1 normal goal + gets 1 goal awarded from Bønes own goal!
  // Result must be 1 - 2!
  const score = calculateMatchScore(events, 0, 0, 'Bønes G16-1', 'Fana G16-1', BONES_CLUB_CONFIG);
  assert.strictEqual(score.homeScore, 1, 'Home score must be 1 (normal goal)');
  assert.strictEqual(score.awayScore, 2, 'Away score must be 2 (1 normal goal + 1 opponent own goal)');

  const match: Match = {
    id: 'm-1',
    date: '2026-05-10',
    time: '18:00',
    homeTeam: 'Bønes G16-1',
    awayTeam: 'Fana G16-1',
    homeScore: score.homeScore,
    awayScore: score.awayScore,
    status: 'finished',
    isHome: true,
    teamId: 'g16-1',
    teamName: 'Bønes G16-1',
    division: 'G16 1. div',
    venue: 'Fjellsdalen idrettsplass',
    events,
  };

  const players: Player[] = [
    { id: 'fiks-123456', fiksId: 123456, name: 'Henrik Vindenes', teamId: 'g16-1', matches: 1, goals: 1, yellowCards: 1, redCards: 0 },
    { id: 'fiks-999999', fiksId: 999999, name: 'Bønes Defender', teamId: 'g16-1', matches: 1, goals: 0, yellowCards: 0, redCards: 0 },
  ];

  const topScorers = calculateTopScorers([match], players, { clubConfig: BONES_CLUB_CONFIG, clubOnly: true });
  assert.strictEqual(topScorers.length, 1, 'Defender who scored own goal must NOT be in top scorers list');
  assert.strictEqual(topScorers[0].name, 'Henrik Vindenes');
  assert.strictEqual(topScorers[0].goals, 1);

  const cards = calculateCardStatistics([match], players, { clubConfig: BONES_CLUB_CONFIG, clubOnly: true });
  assert.strictEqual(cards.length, 1);
  assert.strictEqual(cards[0].name, 'Henrik Vindenes');
  assert.strictEqual(cards[0].yellowCards, 1);
  console.log('  ✔ Passed: Single source of truth & own goal handling verified.');
}

// =========================================================================
// TEST 4: Multi-Club Data Isolation (Club A never leaks into Club B)
// =========================================================================
console.log('\n▶ TEST 4: Multi-Club Isolation & Path Segregation');
{
  const bonesDbPath = getDatabaseFilePath('bones');
  const fanaDbPath = getDatabaseFilePath('fana');
  const aasaaneDbPath = getDatabaseFilePath('aasane');

  assert.ok(bonesDbPath.endsWith('bones_database.json'));
  assert.ok(fanaDbPath.endsWith('fana_database.json'));
  assert.ok(aasaaneDbPath.endsWith('aasane_database.json'));
  assert.notStrictEqual(bonesDbPath, fanaDbPath, 'Databases must have isolated file paths');

  // Verify team matching isolation
  assert.strictEqual(isClubTeam('Bønes G16-1', BONES_CLUB_CONFIG), true);
  assert.strictEqual(isClubTeam('Bønes G16-1', FANA_CLUB_CONFIG), false, 'Bønes team must never match Fana club');
  assert.strictEqual(isClubTeam('Fana Menn 1', FANA_CLUB_CONFIG), true);
  assert.strictEqual(isClubTeam('Fana Menn 1', BONES_CLUB_CONFIG), false, 'Fana team must never match Bønes club');
  console.log('  ✔ Passed: Club configs, storage isolation, and team recognition verified.');
}

// =========================================================================
// TEST 5: THE ARCHITECTURE TEST (Add new club solely via ClubConfig)
// =========================================================================
console.log('\n▶ TEST 5: THE CRUCIAL ARCHITECTURE TEST (Zero-code Club Addition)');
{
  // 1. Create a brand new club configuration
  const NEW_CLUB_CONFIG: ClubConfig = {
    id: 'aarvoll',
    name: 'Årvoll IL',
    shortName: 'Årvoll',
    fiksClubId: 345,
    branding: {
      primaryColor: '#003366',
      secondaryColor: '#ffffff',
      accentColor: '#0066cc',
      badgeText: 'ÅRVOLL IL',
      clubShortName: 'Årvoll',
      homeGrounds: ['Årvoll kunstgress'],
      foundedYear: 1932,
    },
    scraper: {
      fiksClubId: 345,
      officialWebsiteUrl: 'https://aarvoll.no',
      krets: 'NFF Oslo',
      autoScanIntervalSeconds: 300,
      teams: [
        {
          id: 'aarvoll-m1',
          name: 'Årvoll Herrer A',
          shortName: 'Herrer A',
          fiksId: 34501,
          tourneyId: 30101,
          division: '4. div. menn avd. 02 Oslo',
          category: 'Senior',
          krets: 'NFF Oslo',
          homeGround: 'Årvoll kunstgress',
          nffCode: 'NFF-OSL-M4-02',
        },
      ],
    },
  };

  // 2. Register new club in the platform
  registerClubConfig(NEW_CLUB_CONFIG);
  const registered = getClubConfig('aarvoll');
  assert.strictEqual(registered.id, 'aarvoll');
  assert.strictEqual(registered.name, 'Årvoll IL');

  // 3. Test generic database migration and derivation without modifying any codebase files
  const sampleNewClubData = {
    clubId: 'aarvoll',
    teams: registered.scraper.teams,
    matches: [
      {
        id: 'nff-998877',
        date: '2026-06-01',
        time: '19:00',
        homeTeam: 'Årvoll Herrer A',
        awayTeam: 'Oppsal 2',
        teamId: 'aarvoll-m1',
        teamName: 'Årvoll Herrer A',
        isHome: true,
        division: '4. div. menn avd. 02 Oslo',
        venue: 'Årvoll kunstgress',
        events: [
          {
            id: 'ev-aar-1',
            matchId: 'nff-998877',
            minute: 44,
            type: 'goal' as const,
            player: 'Kasper Toft',
            playerId: 'fiks-778899',
            fiksId: 778899,
            team: 'Årvoll Herrer A',
            description: '44\' Mål: Kasper Toft',
          },
        ],
      },
    ],
    players: [
      {
        id: 'fiks-778899',
        fiksId: 778899,
        name: 'Kasper Toft',
        teamId: 'aarvoll-m1',
        clubId: 'aarvoll',
        matches: 1,
        goals: 1,
        yellowCards: 0,
        redCards: 0,
      },
    ],
  };

  const v2Result = migrateToV2(sampleNewClubData as any, 'aarvoll');
  assert.strictEqual(v2Result.clubId, 'aarvoll');
  assert.strictEqual(v2Result.schemaVersion, '2.0');
  assert.strictEqual(v2Result.persons.length, 1);
  assert.strictEqual(v2Result.persons[0].canonicalPlayerId, 'fiks-778899');
  assert.strictEqual(v2Result.topScorers.length, 1);
  assert.strictEqual(v2Result.topScorers[0].name, 'Kasper Toft');
  assert.strictEqual(v2Result.topScorers[0].goals, 1);
  assert.strictEqual(v2Result.matches[0].homeScore, 1);
  assert.strictEqual(v2Result.matches[0].awayScore, 0);

  console.log('  ✔ Passed: New club "Årvoll IL" successfully instantiated, migrated and scored with zero code changes.');
}

console.log('\n🎉 ALL ARCHITECTURE INVARIANT TESTS PASSED SUCCESSFULLY!\n');
