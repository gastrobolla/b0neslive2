const fs = require('fs');

const TEAMS = [
  { id: 'g13-1', name: 'Bønes G13-1', shortName: 'G13-1', fiksId: 173951, tourneyId: 207279, division: 'G13 1. div. avd. 03 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-G13-03' },
  { id: 'g13-2', name: 'Bønes G13-2', shortName: 'G13-2', fiksId: 202088, tourneyId: 207285, division: 'G13 2. div. avd. 03 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-G13-03B' },
  { id: 'g13-3', name: 'Bønes G13-3', shortName: 'G13-3', fiksId: 21260, tourneyId: 207287, division: 'G13 2. div. avd. 05 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-G13-05' },
  { id: 'g14-1', name: 'Bønes G14-1', shortName: 'G14-1', fiksId: 20472, tourneyId: 207311, division: 'G14 2. div. avd. 04 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-G14-04' },
  { id: 'g14-2', name: 'Bønes G14-2', shortName: 'G14-2', fiksId: 19387, tourneyId: 207318, division: 'G14 3. div. avd. 04 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-G14-04B' },
  { id: 'g16-1', name: 'Bønes G16-1', shortName: 'G16-1', fiksId: 19685, tourneyId: 207329, division: 'G16 1. div. avd. 01 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-G16-01' },
  { id: 'g16-2', name: 'Bønes G16-2', shortName: 'G16-2', fiksId: 155163, tourneyId: 207335, division: 'G16 2. div. avd. 03 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-G16-03' },
  { id: 'g16-3', name: 'Bønes G16-3', shortName: 'G16-3', fiksId: 18891, tourneyId: 207347, division: 'G16 3. div. avd. 07 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-G16-07' },
  { id: 'g19-1', name: 'Bønes G19-1', shortName: 'G19-1', fiksId: 780, tourneyId: 206745, division: 'G19 NM kretskvalifisering / Serie', category: 'Junior', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-G19-01' },
  { id: 'g19-2', name: 'Bønes G19-2', shortName: 'G19-2', fiksId: 161152, tourneyId: 207364, division: 'G19 3. div. avd. 02 vår', category: 'Junior', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-G19-02' },
  { id: 'j13-1', name: 'Bønes J13-1', shortName: 'J13-1', fiksId: 158325, tourneyId: 207379, division: 'J13 2. div. avd. 05 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-J13-05' },
  { id: 'j13-2', name: 'Bønes J13-2', shortName: 'J13-2', fiksId: 190457, tourneyId: 207377, division: 'J13 2. div. avd. 03 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-J13-03' },
  { id: 'j14-1', name: 'Bønes J14-1', shortName: 'J14-1', fiksId: 126114, tourneyId: 207390, division: 'J14 2. div. avd. 03 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass / Bønes fotballbane', nffCode: 'NFF-HOR-J14-03' },
  { id: 'j16-1', name: 'Bønes J16-1', shortName: 'J16-1', fiksId: 19687, tourneyId: 207406, division: 'J16 2. div. avd. 04 vår', category: 'Ungdom', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-J16-04' },
  { id: 'bones-1', name: 'Bønes 1', shortName: 'Bønes 1', fiksId: 31808, tourneyId: 208233, division: 'Old girls vår Hordaland', category: 'Senior', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-OG-01' },
  { id: 'menn-1', name: 'Bønes Menn 1', shortName: 'Menn 1', fiksId: 153650, tourneyId: 205982, division: '5. div. menn avd. 03 Hordaland', category: 'Senior', krets: 'NFF Hordaland', homeGround: 'Fjellsdalen idrettsplass', nffCode: 'NFF-HOR-M5-03' }
];

function decode(str) {
  return (str || '')
    .replace(/&#xF8;/g, 'ø').replace(/&#xD8;/g, 'Ø')
    .replace(/&#xE5;/g, 'å').replace(/&#xC5;/g, 'Å')
    .replace(/&#xE6;/g, 'æ').replace(/&#xC6;/g, 'Æ')
    .replace(/&#x2212;/g, '-')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

async function scrapeAll() {
  const tables = {};
  const matches = [];
  const teamsWithStats = [];

  for (const t of TEAMS) {
    let currentRank = 1;
    let totalTeams = 10;
    try {
      const res = await fetch(`https://www.fotball.no/fotballdata/turnering/tabell/?fiksId=${t.tourneyId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const html = await res.text();
      const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
      if (tableMatch) {
        const rows = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
        const parsedRows = [];
        for (const r of rows) {
          const cells = [...r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => 
            decode(c[1].replace(/<[^>]+>/g, ''))
          );
          if (cells.length >= 8 && /^\d+$/.test(cells[0])) {
            const rank = parseInt(cells[0], 10);
            const teamName = cells[1];
            const played = parseInt(cells[2], 10) || 0;
            const won = parseInt(cells[3], 10) || 0;
            const drawn = parseInt(cells[4], 10) || 0;
            const lost = parseInt(cells[5], 10) || 0;
            const isBones = teamName.toLowerCase().includes('bønes');

            let goalsFor = 0;
            let goalsAgainst = 0;
            let goalDiff = 0;
            const rawMf = cells[6] || '';
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
            const points = parseInt(cells[7], 10) || 0;

            if (isBones) {
              currentRank = rank;
            }

            parsedRows.push({
              rank,
              teamName: isBones ? t.name : teamName,
              isBones,
              played,
              won,
              drawn,
              lost,
              goalsFor,
              goalsAgainst,
              goalDiff,
              points,
              form: [won > 0 ? 'W' : 'D', drawn > 0 ? 'D' : 'W', lost > 0 ? 'L' : 'W'].slice(0, 3)
            });
          }
        }

        if (parsedRows.length > 0) {
          totalTeams = parsedRows.length;
          tables[t.id] = {
            teamId: t.id,
            teamName: t.name,
            divisionName: t.division,
            season: '2026',
            updatedAt: 'NFF Sanntid',
            rows: parsedRows
          };
        }
      }
    } catch (e) {
      console.error('Table error for', t.name, e.message);
    }

    // Matches
    try {
      const res = await fetch(`https://www.fotball.no/fotballdata/lag/hjem/?fiksId=${t.fiksId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const html = await res.text();
      const regex = /<a\s+[^>]*href="\/fotballdata\/kamp\/\?fiksId=(\d+)"[^>]*>([\s\S]*?)<\/a>/gi;
      let m;
      const seen = new Set();
      while ((m = regex.exec(html)) !== null) {
        const kampId = m[1];
        if (seen.has(kampId)) continue;
        seen.add(kampId);

        const raw = m[2];
        const headings = [...raw.matchAll(/class="headingElement">([^<]+)<\/span>/gi)].map(h => decode(h[1]));
        const teamNames = [...raw.matchAll(/class="teamName">([^<]+)<\/div>/gi)].map(h => decode(h[1]));
        const endResult = raw.match(/class="endResult">([^<]+)<\/div>/i);
        const timeMatch = raw.match(/class="time">([^<]+)<\/div>/i);
        const footerMatch = raw.match(/class="footerElement">([^<]+)<\/span>/i);

        if (teamNames.length >= 2) {
          const homeTeam = teamNames[0];
          const awayTeam = teamNames[1];
          const rawDate = headings[0] || '';
          const time = timeMatch ? timeMatch[1].trim() : (headings[1] || '19:00');
          const venue = footerMatch ? decode(footerMatch[1]) : 'Fjellsdalen idrettsplass';
          const isHome = homeTeam.toLowerCase().includes('bønes');

          let status = 'upcoming';
          let homeScore = undefined;
          let awayScore = undefined;

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

          matches.push({
            id: `nff-${kampId}`,
            teamId: t.id,
            teamName: t.name,
            division: t.division,
            round: 'NFF Serie',
            homeTeam: isHome ? t.name : homeTeam,
            awayTeam: !isHome ? t.name : awayTeam,
            isHome,
            date: isoDate,
            time,
            venue,
            venueCity: venue.toLowerCase().includes('bønes') || venue.toLowerCase().includes('fjellsdalen') ? 'Bønes, Bergen' : 'Vestland',
            status,
            homeScore,
            awayScore,
            referee: 'NFF Hordaland dommer'
          });
        }
      }
    } catch(e) {
      console.error('Match error for', t.name, e.message);
    }

    teamsWithStats.push({
      ...t,
      currentRank,
      totalTeamsInDivision: totalTeams
    });
  }

  // Sort matches by date descending
  matches.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  fs.writeFileSync('./server/scrapedData16.json', JSON.stringify({
    teams: teamsWithStats,
    tables,
    matches
  }, null, 2));

  console.log(`Successfully scraped and saved ${teamsWithStats.length} teams, ${Object.keys(tables).length} tables, ${matches.length} matches.`);
}

scrapeAll();
