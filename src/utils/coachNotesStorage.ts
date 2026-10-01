import { CoachNote } from '../types.js';

const STORAGE_PREFIX = 'bones_coach_notes_';

/**
 * Normalizes player identifier for localStorage keys
 */
export function getPlayerStorageKey(playerIdOrName: string): string {
  const sanitized = playerIdOrName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  return `${STORAGE_PREFIX}${sanitized}`;
}

/**
 * Generates initial qualitative development notes tailored to the player profile
 * if no notes have been recorded in localStorage yet.
 */
function getDefaultNotesForPlayer(
  playerId: string,
  playerName: string,
  position?: string
): CoachNote[] {
  const normPos = (position || '').toLowerCase();
  const dateNow = '2026-09-25';

  if (normPos.includes('keeper')) {
    return [
      {
        id: `note-${playerId}-init-1`,
        playerId,
        playerName,
        author: 'Geir (Keepertrenere Bønes)',
        authorRole: 'Keepertrenere',
        date: '2026-09-21',
        category: 'teknisk',
        title: 'Feltarbeid og autoritet på defensive dødballer',
        content:
          'Viser stor ro og imponerende reaksjonsevne på strek. På treningene i høst har vi jobbet målrettet med å ta mer plass i feltet ved hjørnespark og tørre å rope tidlig. Meget god progresjon i igangsetting med utkast under omstilling.',
        tags: ['Feltarbeid', 'Kommunikasjon', 'Igangsetting'],
        isHighlight: true,
        createdAt: '2026-09-21T17:30:00Z',
      },
      {
        id: `note-${playerId}-init-2`,
        playerId,
        playerName,
        author: 'Morten (Hovedtrener)',
        authorRole: 'Hovedtrener',
        date: '2026-09-14',
        category: 'holdning',
        title: 'Mental tilstedeværelse under sluttpress',
        content:
          'Holdt hodet kaldt i sluttfasen av jevne kamper. Viser god modenhet ved å roe ned tempoet når laget er under press, og sprer trygghet til stopperne.',
        tags: ['Mental styrke', 'Lederrolle', 'Trygghet'],
        isHighlight: false,
        createdAt: '2026-09-14T19:00:00Z',
      },
    ];
  }

  if (normPos.includes('forsvar') || normPos.includes('stopper') || normPos.includes('back')) {
    return [
      {
        id: `note-${playerId}-init-1`,
        playerId,
        playerName,
        author: 'Arild (Forsvarstrener)',
        authorRole: 'Assistenttrener',
        date: '2026-09-23',
        category: 'taktisk',
        title: 'Kroppsstilling og sideveis forskyvning',
        content:
          'Svært solid 1v1-duellspill. Har hevet blikket betydelig i oppbyggingsfasen. Jobber videre med rett kroppsstilling ved bakromsballer for å unngå å bli snudd i rygg. Viser forbilledlig innsats og offervilje i blokkeringer.',
        tags: ['1v1 defensivt', 'Kroppsstilling', 'Blokkeringer'],
        isHighlight: true,
        createdAt: '2026-09-23T18:15:00Z',
      },
      {
        id: `note-${playerId}-init-2`,
        playerId,
        playerName,
        author: 'Morten (Hovedtrener)',
        authorRole: 'Hovedtrener',
        date: '2026-09-10',
        category: 'holdning',
        title: 'Treningsiver og defensivt lederskap',
        content:
          'Alltid presis og setter standarden for intensitet på Bønesbanen. Tar naturlig styring over forsvarslinjen og kommuniserer tydelig med sidemann.',
        tags: ['Holdning', 'Kommunikasjon', 'Intensitet'],
        isHighlight: false,
        createdAt: '2026-09-10T19:20:00Z',
      },
    ];
  }

  if (normPos.includes('midtbane')) {
    return [
      {
        id: `note-${playerId}-init-1`,
        playerId,
        playerName,
        author: 'Morten (Hovedtrener)',
        authorRole: 'Hovedtrener',
        date: '2026-09-24',
        category: 'taktisk',
        title: 'Orientering og hodesjekk før førsteberøring',
        content:
          'Utmerket pasningsrepertoar og god spilleforståelse. Har tatt store steg i å sjekke skulderen to ganger før mottak, noe som gir mer tid med ballen under press. Flott balanse mellom å roe ned og spille fremover.',
        tags: ['Orientering', 'Førstetouch', 'Spillvending'],
        isHighlight: true,
        createdAt: '2026-09-24T18:00:00Z',
      },
      {
        id: `note-${playerId}-init-2`,
        playerId,
        playerName,
        author: 'Spillerutvikler Bønes IL',
        authorRole: 'Spillerutvikler',
        date: '2026-09-12',
        category: 'fysisk',
        title: 'Utholdenhet i pressleddet og gjenvinning',
        content:
          'Løpskapasiteten har økt merkbart i høstsesongen. Orker flere returløp og er sentral i Bønes sitt høye gjenvinningspress i midtbaneleddet.',
        tags: ['Løpskapasitet', 'Presspill', 'Gjenvinning'],
        isHighlight: false,
        createdAt: '2026-09-12T17:45:00Z',
      },
    ];
  }

  // Default for Forward / Angrep / Generelt
  return [
    {
      id: `note-${playerId}-init-1`,
      playerId,
      playerName,
      author: 'Morten (Hovedtrener)',
      authorRole: 'Hovedtrener',
      date: '2026-09-22',
      category: 'taktisk',
      title: 'Bevegelsesmønster i boks og timing på løp',
      content:
        'Klinisk instinkt foran mål. Vi har fokusert på timing i løp bak forsvarernes blindsone og mot første stolpe på innlegg. Viser stort engasjement for lagets offensive samhandling.',
      tags: ['Boksløp', 'Avslutningsferdighet', 'Timing'],
      isHighlight: true,
      createdAt: '2026-09-22T18:30:00Z',
    },
    {
      id: `note-${playerId}-init-2`,
      playerId,
      playerName,
      author: 'Arild (Assistenttrener)',
      authorRole: 'Assistenttrener',
      date: '2026-09-15',
      category: 'fokus',
      title: 'Defensiv plikt og førsteforsvarer-jobb',
      content:
        'Gledelig fremgang i defensiv disiplin. Stenger pasningslinjer til motstanderens dype midtbanespiller på en måte som hjelper hele laget å flytte etter.',
      tags: ['Førsteforsvarer', 'Presshøyde', 'Laglojalitet'],
      isHighlight: false,
      createdAt: '2026-09-15T19:15:00Z',
    },
  ];
}

/**
 * Loads all coach notes for a specific player.
 * Checks localStorage first; if not found, seeds with default notes and caches them.
 */
export function getCoachNotesForPlayer(
  playerIdOrName: string,
  playerName?: string,
  position?: string
): CoachNote[] {
  if (!playerIdOrName) return [];
  const key = getPlayerStorageKey(playerIdOrName);

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
      }
    } catch (err) {
      console.warn(`[CoachNotes] Error reading notes for ${playerIdOrName}:`, err);
    }
  }

  // Generate initial notes and seed localStorage
  const initialNotes = getDefaultNotesForPlayer(
    playerIdOrName,
    playerName || playerIdOrName,
    position
  );
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(initialNotes));
    } catch (err) {
      console.warn('[CoachNotes] Error saving initial notes to localStorage:', err);
    }
  }

  return initialNotes;
}

/**
 * Adds a new coach note for a player and returns the updated list.
 */
export function saveCoachNote(
  playerIdOrName: string,
  noteData: Omit<CoachNote, 'id' | 'createdAt'> & { id?: string }
): CoachNote[] {
  const key = getPlayerStorageKey(playerIdOrName);
  const currentNotes = getCoachNotesForPlayer(playerIdOrName, noteData.playerName);

  const newNote: CoachNote = {
    ...noteData,
    id: noteData.id || `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  const updated = [newNote, ...currentNotes.filter((n) => n.id !== newNote.id)].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error('[CoachNotes] Failed to persist note:', err);
  }

  return updated;
}

/**
 * Updates an existing coach note.
 */
export function updateCoachNote(
  playerIdOrName: string,
  updatedNote: CoachNote
): CoachNote[] {
  const key = getPlayerStorageKey(playerIdOrName);
  const currentNotes = getCoachNotesForPlayer(playerIdOrName, updatedNote.playerName);

  const updated = currentNotes.map((n) => (n.id === updatedNote.id ? updatedNote : n)).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error('[CoachNotes] Failed to update note:', err);
  }

  return updated;
}

/**
 * Deletes a coach note by id.
 */
export function deleteCoachNote(playerIdOrName: string, noteId: string): CoachNote[] {
  const key = getPlayerStorageKey(playerIdOrName);
  const currentNotes = getCoachNotesForPlayer(playerIdOrName);
  const filtered = currentNotes.filter((n) => n.id !== noteId);

  try {
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (err) {
    console.error('[CoachNotes] Failed to delete note:', err);
  }

  return filtered;
}
