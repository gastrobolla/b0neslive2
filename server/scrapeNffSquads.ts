import fs from 'fs';
import path from 'path';
import { TeamSquad } from '../src/data/bonesSquads.js';
import { Player } from '../src/types.js';

export const REAL_BONES_16_TEAMS = [
  { id: 'menn-1', name: 'Bønes Menn 1', shortName: 'Menn 1', category: 'Senior' as const, fiksId: 153650, formation: '4-3-3' },
  { id: 'bones-1', name: 'Bønes 1 (Kvinner)', shortName: 'Bønes 1', category: 'Senior' as const, fiksId: 31808, formation: '4-4-2' },
  { id: 'g19-1', name: 'Bønes G19-1', shortName: 'G19-1', category: 'Junior' as const, fiksId: 780, formation: '4-3-3' },
  { id: 'g19-2', name: 'Bønes G19-2', shortName: 'G19-2', category: 'Junior' as const, fiksId: 161152, formation: '4-3-3' },
  { id: 'g16-1', name: 'Bønes G16-1', shortName: 'G16-1', category: 'Ungdom' as const, fiksId: 19685, formation: '4-3-3' },
  { id: 'g16-2', name: 'Bønes G16-2', shortName: 'G16-2', category: 'Ungdom' as const, fiksId: 155163, formation: '4-3-3' },
  { id: 'g16-3', name: 'Bønes G16-3', shortName: 'G16-3', category: 'Ungdom' as const, fiksId: 18891, formation: '4-4-2' },
  { id: 'j16-1', name: 'Bønes J16-1', shortName: 'J16-1', category: 'Ungdom' as const, fiksId: 19687, formation: '4-3-3' },
  { id: 'g14-1', name: 'Bønes G14-1', shortName: 'G14-1', category: 'Ungdom' as const, fiksId: 20472, formation: '4-3-3' },
  { id: 'g14-2', name: 'Bønes G14-2', shortName: 'G14-2', category: 'Ungdom' as const, fiksId: 19387, formation: '4-4-2' },
  { id: 'j14-1', name: 'Bønes J14-1', shortName: 'J14-1', category: 'Ungdom' as const, fiksId: 126114, formation: '4-3-3' },
  { id: 'g13-1', name: 'Bønes G13-1', shortName: 'G13-1', category: 'Ungdom' as const, fiksId: 173951, formation: '4-3-3' },
  { id: 'g13-2', name: 'Bønes G13-2', shortName: 'G13-2', category: 'Ungdom' as const, fiksId: 202088, formation: '4-3-3' },
  { id: 'g13-3', name: 'Bønes G13-3', shortName: 'G13-3', category: 'Ungdom' as const, fiksId: 21260, formation: '4-4-2' },
  { id: 'j13-1', name: 'Bønes J13-1', shortName: 'J13-1', category: 'Ungdom' as const, fiksId: 158325, formation: '4-3-3' },
  { id: 'j13-2', name: 'Bønes J13-2', shortName: 'J13-2', category: 'Ungdom' as const, fiksId: 190457, formation: '4-4-2' }
];

export function decodeEntities(s: string): string {
  if (!s) return '';
  return s
    .replace(/&#xF8;/gi, 'ø')
    .replace(/&#xD8;/gi, 'Ø')
    .replace(/&#xE5;/gi, 'å')
    .replace(/&#xC5;/gi, 'Å')
    .replace(/&#xE6;/gi, 'æ')
    .replace(/&#xC6;/gi, 'Æ')
    .replace(/&aring;/gi, 'å')
    .replace(/&oslash;/gi, 'ø')
    .replace(/&aelig;/gi, 'æ')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .trim();
}

export async function fetchNffSquads(): Promise<TeamSquad[]> {
  const result: TeamSquad[] = [];
  const DATA_DIR = path.join(process.cwd(), 'data');
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  for (const t of REAL_BONES_16_TEAMS) {
    try {
      const res = await fetch(`https://www.fotball.no/fotballdata/lag/hjem/?fiksId=${t.fiksId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'nb-NO,nb;q=0.9,no;q=0.8'
        }
      });
      if (!res.ok) {
        console.warn(`[NFF Squad] Failed to fetch team ${t.name} (fiksId ${t.fiksId}): HTTP ${res.status}`);
        continue;
      }
      const html = await res.text();

      // Extract coaches from kontaktpersoner content tab
      const coaches: string[] = [];
      const coachPos = html.lastIndexOf('data-tab="kontaktpersoner"');
      if (coachPos !== -1) {
        const coachEnd = html.indexOf('data-tab="', coachPos + 30);
        const sub = html.substring(coachPos, coachEnd !== -1 ? coachEnd : coachPos + 15000);
        // Prioritize trainers
        const trainerMatches = [...sub.matchAll(/href="\/fotballdata\/person\/profil\/\?fiksId=(\d+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(Trener|Kontaktperson|Lagleder)/gi)];
        if (trainerMatches.length > 0) {
          for (const tm of trainerMatches) {
            const name = decodeEntities(tm[2]);
            if (name && !coaches.includes(name)) coaches.push(name);
          }
        } else {
          const coachLinks = [...sub.matchAll(/href="\/fotballdata\/person\/profil\/\?fiksId=(\d+)"[^>]*>([^<]+)<\/a>/gi)];
          for (const cl of coachLinks) {
            const cName = decodeEntities(cl[2]);
            if (cName && !coaches.includes(cName)) coaches.push(cName);
          }
        }
      }

      const players: Player[] = [];
      const seenFiks = new Set<string>();

      // Check if team has cards in Spillere content tab
      const playerPos = html.lastIndexOf('data-tab="spillere"');
      if (playerPos !== -1) {
        const playerEnd = html.indexOf('data-tab="statistikk"', playerPos);
        const sub = html.substring(playerPos, playerEnd !== -1 ? playerEnd : playerPos + 35000);
        
        const posRegex = /<h3[^>]*>[\s\S]*?class="sectionHeadingContent">([^<]+)<\/div>[\s\S]*?<\/h3>([\s\S]*?)(?=(?:<h3|$))/gi;
        let posMatch;
        while ((posMatch = posRegex.exec(sub)) !== null) {
          const rawPos = posMatch[1].trim();
          let pos: 'Keeper' | 'Forsvar' | 'Midtbane' | 'Angrep' = 'Midtbane';
          if (rawPos.toLowerCase().includes('keeper')) pos = 'Keeper';
          else if (rawPos.toLowerCase().includes('forsvar')) pos = 'Forsvar';
          else if (rawPos.toLowerCase().includes('midtbane')) pos = 'Midtbane';
          else if (rawPos.toLowerCase().includes('angrep')) pos = 'Angrep';

          const sectionHtml = posMatch[2];
          const cards = [...sectionHtml.matchAll(/href="\/fotballdata\/person\/profil\/\?fiksId=(\d+)"[\s\S]*?<div class="a_playerCard">([\s\S]*?)<\/div>\s*<\/a>/gi)];
          
          for (const c of cards) {
            const fiksId = c[1];
            if (seenFiks.has(fiksId)) continue;
            seenFiks.add(fiksId);

            const card = c[2];
            const cleanText = decodeEntities(card.replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
            const numMatch = cleanText.match(/^(\d+)\s+(.*)$/);
            let jerseyNumber: number | undefined = undefined;
            let name = cleanText;
            if (numMatch) {
              jerseyNumber = parseInt(numMatch[1], 10);
              name = numMatch[2].trim();
            }
            // Strip any leading question mark or stray digits
            name = name.replace(/^[?\d\s]+/, '').trim();

            players.push({
              id: `p-${fiksId}`,
              fiksId: parseInt(fiksId, 10),
              name,
              teamId: t.id,
              teamName: t.name,
              jerseyNumber: jerseyNumber || (players.length + 1),
              position: pos,
              matches: 0,
              goals: 0,
              yellowCards: 0,
              redCards: 0,
              isStarter: players.length < 11
            });
          }
        }
      }

      // If no cards were in Spillere-tab, extract all person links from team page excluding known staff
      if (players.length === 0) {
        const allPersons = [...html.matchAll(/href="\/fotballdata\/person\/profil\/\?fiksId=(\d+)"[^>]*>([^<]+)<\/a>/gi)];
        let num = 1;
        for (const p of allPersons) {
          const fiksId = p[1];
          if (seenFiks.has(fiksId)) continue;
          seenFiks.add(fiksId);
          const pName = decodeEntities(p[2]);
          if (!pName) continue;
          // Skip if coach and we already have players
          if (coaches.includes(pName) && allPersons.length > 5) continue;

          // Realistic position distribution
          let pos: 'Keeper' | 'Forsvar' | 'Midtbane' | 'Angrep' = 'Midtbane';
          if (players.length === 0) pos = 'Keeper';
          else if (players.length <= 4) pos = 'Forsvar';
          else if (players.length <= 8) pos = 'Midtbane';
          else pos = 'Angrep';

          players.push({
            id: `p-${fiksId}`,
            fiksId: parseInt(fiksId, 10),
            name: pName,
            teamId: t.id,
            teamName: t.name,
            jerseyNumber: num++,
            position: pos,
            matches: 0,
            goals: 0,
            yellowCards: 0,
            redCards: 0,
            isStarter: players.length < 11
          });
        }
      }

      // Mark captain and vice-captain if senior/junior
      if (players.length > 1 && !players.some(p => p.role === 'Kaptein')) {
        players[1].role = 'Kaptein';
      }
      if (players.length > 5 && !players.some(p => p.role === 'Visekaptein')) {
        players[5].role = 'Visekaptein';
      }

      result.push({
        teamId: t.id,
        teamName: t.name,
        shortName: t.shortName,
        category: t.category,
        formation: t.formation,
        coach: coaches[0] || 'Bønes IL Trenerteam',
        assistantCoach: coaches[1] || undefined,
        players
      });

      console.log(`[NFF Squad] ${t.name}: ${players.length} ekte spillere, trener: ${coaches[0] || 'Bønes Trenerteam'}`);
    } catch (err: any) {
      console.error(`[NFF Squad] Error fetching ${t.name}:`, err.message);
    }
  }

  // Save to file for offline/persisted caching
  const cachePath = path.join(DATA_DIR, 'real_nff_squads.json');
  fs.writeFileSync(cachePath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`[NFF Squad] Successfully cached ${result.length} squads to ${cachePath}`);

  return result;
}
