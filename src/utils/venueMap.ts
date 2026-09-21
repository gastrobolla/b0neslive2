/**
 * Venue and Google Maps helper for Bønes IL fixtures.
 * Resolves football pitches in Bergen, Hordaland, and opponent grounds
 * with verified coordinates, Google Maps navigation links, and interactive embed URLs.
 */

export interface VenueLocation {
  name: string;
  shortName: string;
  address: string;
  lat: number;
  lon: number;
  isHome: boolean;
}

export const KNOWN_PITCHES: Record<string, VenueLocation> = {
  fjellsdalen: {
    name: 'Fjellsdalen idrettsplass (Bønes)',
    shortName: 'Fjellsdalen',
    address: 'Gullstølsveien 70, 5148 Fyllingsdalen / Bønes',
    lat: 60.3345,
    lon: 5.2977,
    isHome: true,
  },
  bønes: {
    name: 'Fjellsdalen idrettsplass (Bønes)',
    shortName: 'Fjellsdalen',
    address: 'Gullstølsveien 70, 5148 Fyllingsdalen / Bønes',
    lat: 60.3345,
    lon: 5.2977,
    isHome: true,
  },
  bønesbanen: {
    name: 'Fjellsdalen idrettsplass (Bønes)',
    shortName: 'Fjellsdalen',
    address: 'Gullstølsveien 70, 5148 Fyllingsdalen / Bønes',
    lat: 60.3345,
    lon: 5.2977,
    isHome: true,
  },
  varden: {
    name: 'Varden Amfi (Fyllingsdalen)',
    shortName: 'Varden Amfi',
    address: 'Alléen 30, 5147 Fyllingsdalen',
    lat: 60.3522,
    lon: 5.2755,
    isHome: false,
  },
  fyllingsdalen: {
    name: 'Varden Amfi (Fyllingsdalen)',
    shortName: 'Varden Amfi',
    address: 'Alléen 30, 5147 Fyllingsdalen',
    lat: 60.3522,
    lon: 5.2755,
    isHome: false,
  },
  stemmemyren: {
    name: 'Stemmemyren idrettsplass (Sandviken)',
    shortName: 'Stemmemyren',
    address: 'Ladegårdsgaten 61, 5035 Bergen',
    lat: 60.4215,
    lon: 5.3184,
    isHome: false,
  },
  sandviken: {
    name: 'Stemmemyren idrettsplass (Sandviken)',
    shortName: 'Stemmemyren',
    address: 'Ladegårdsgaten 61, 5035 Bergen',
    lat: 60.4215,
    lon: 5.3184,
    isHome: false,
  },
  åsane: {
    name: 'Åsane Arena / Myrdal stadion',
    shortName: 'Åsane Arena',
    address: 'Åsane Senter 40, 5116 Ulset',
    lat: 60.4650,
    lon: 5.3280,
    isHome: false,
  },
  myrdal: {
    name: 'Myrdal stadion (Åsane)',
    shortName: 'Myrdal',
    address: 'Myrdalsvegen, 5117 Ulset',
    lat: 60.4650,
    lon: 5.3280,
    isHome: false,
  },
  krohnsminde: {
    name: 'Krohnsminde idrettsplass',
    shortName: 'Krohnsminde',
    address: 'Danmarksplass, 5054 Bergen',
    lat: 60.3752,
    lon: 5.3401,
    isHome: false,
  },
  nymark: {
    name: 'Nymark kunstgress (Brann)',
    shortName: 'Nymark',
    address: 'Klokkersmauet 1, 5063 Bergen',
    lat: 60.3670,
    lon: 5.3570,
    isHome: false,
  },
  brann: {
    name: 'Brann Stadion / Nymarksbanene',
    shortName: 'Nymark / Brann',
    address: 'Klokkersmauet 1, 5063 Bergen',
    lat: 60.3670,
    lon: 5.3570,
    isHome: false,
  },
  slettebakken: {
    name: 'Slettebakken kunstgress (Trane/Fana)',
    shortName: 'Slettebakken',
    address: 'Vilhelm Bjerknes vei 24, 5081 Bergen',
    lat: 60.3585,
    lon: 5.3582,
    isHome: false,
  },
  fana: {
    name: 'Fana Stadion / Nesttun idrettsplass',
    shortName: 'Fana Stadion',
    address: 'Grimseidvegen 85, 5239 Rådal',
    lat: 60.2970,
    lon: 5.3450,
    isHome: false,
  },
  nesttun: {
    name: 'Nesttun Idrettsplass',
    shortName: 'Nesttun',
    address: 'Nesttunvegen, 5221 Nesttun',
    lat: 60.3160,
    lon: 5.3520,
    isHome: false,
  },
  slåtthaug: {
    name: 'Slåtthaug kunstgress (Smørås)',
    shortName: 'Slåtthaug',
    address: 'Slåtthaugvegen 130, 5222 Nesttun',
    lat: 60.3080,
    lon: 5.3720,
    isHome: false,
  },
  smørås: {
    name: 'Slåtthaug kunstgress (Smørås)',
    shortName: 'Slåtthaug',
    address: 'Slåtthaugvegen 130, 5222 Nesttun',
    lat: 60.3080,
    lon: 5.3720,
    isHome: false,
  },
  lyngbø: {
    name: 'Lyngbø idrettspark',
    shortName: 'Lyngbøparken',
    address: 'Gravdalsveien 5, 5164 Laksevåg',
    lat: 60.3800,
    lon: 5.2650,
    isHome: false,
  },
  olsvik: {
    name: 'Olsvik idrettsplass',
    shortName: 'Olsvikbanen',
    address: 'Olsvikskjenet 100, 5184 Olsvik',
    lat: 60.3680,
    lon: 5.2210,
    isHome: false,
  },
  vadmyra: {
    name: 'Vadmyra kunstgress',
    shortName: 'Vadmyra',
    address: 'Vadmyraveien 85, 5172 Loddefjord',
    lat: 60.3610,
    lon: 5.2340,
    isHome: false,
  },
  loddefjord: {
    name: 'Alvøen idrettspark (Loddefjord)',
    shortName: 'Alvøen',
    address: 'Alvøveien 110, 5179 Godvik',
    lat: 60.3540,
    lon: 5.1890,
    isHome: false,
  },
  alvøen: {
    name: 'Alvøen idrettspark',
    shortName: 'Alvøen',
    address: 'Alvøveien 110, 5179 Godvik',
    lat: 60.3540,
    lon: 5.1890,
    isHome: false,
  },
  garnes: {
    name: 'Garnes kunstgras (Arna-Bjørnar)',
    shortName: 'Garnes',
    address: 'Garnesvegen, 5264 Garnes',
    lat: 60.4350,
    lon: 5.4850,
    isHome: false,
  },
  arna: {
    name: 'Arna Idrettspark',
    shortName: 'Arna Idrettspark',
    address: 'Ådnavegen 95, 5260 Indre Arna',
    lat: 60.4200,
    lon: 5.4600,
    isHome: false,
  },
  gneist: {
    name: 'Liland idrettsplass (Gneist)',
    shortName: 'Liland',
    address: 'Lilandvegen 55, 5258 Blomsterdalen',
    lat: 60.2820,
    lon: 5.2750,
    isHome: false,
  },
  liland: {
    name: 'Liland idrettsplass (Gneist)',
    shortName: 'Liland',
    address: 'Lilandvegen 55, 5258 Blomsterdalen',
    lat: 60.2820,
    lon: 5.2750,
    isHome: false,
  },
  mathopen: {
    name: 'Håkonsvern idrettsanlegg / Mathopen',
    shortName: 'Mathopen',
    address: 'Hetlevikvegen, 5174 Mathopen',
    lat: 60.3390,
    lon: 5.2180,
    isHome: false,
  },
  baune: {
    name: 'Krohnsminde / Baunebanen',
    shortName: 'Baune',
    address: 'Danmarksplass, 5054 Bergen',
    lat: 60.3752,
    lon: 5.3401,
    isHome: false,
  },
  os: {
    name: 'Kuventræ idrettsplass (Os)',
    shortName: 'Kuventræ',
    address: 'Idrettsvegen 39, 5210 Os',
    lat: 60.1890,
    lon: 5.4620,
    isHome: false,
  },
  kuventræ: {
    name: 'Kuventræ idrettsplass (Os)',
    shortName: 'Kuventræ',
    address: 'Idrettsvegen 39, 5210 Os',
    lat: 60.1890,
    lon: 5.4620,
    isHome: false,
  },
  askøy: {
    name: 'Skogen idrettspark (Askøy)',
    shortName: 'Skogen Askøy',
    address: 'Follesevegen, 5300 Kleppestø',
    lat: 60.4120,
    lon: 5.2010,
    isHome: false,
  },
  sotra: {
    name: 'Straume Idrettspark (Sotra)',
    shortName: 'Straume Idrettspark',
    address: 'Idrettsvegen 50, 5353 Straume',
    lat: 60.3540,
    lon: 5.1230,
    isHome: false,
  },
  straume: {
    name: 'Straume Idrettspark (Sotra)',
    shortName: 'Straume',
    address: 'Idrettsvegen 50, 5353 Straume',
    lat: 60.3540,
    lon: 5.1230,
    isHome: false,
  },
  djerv: {
    name: 'Møhlenpris idrettsplass (Djerv)',
    shortName: 'Møhlenpris',
    address: 'Professor Hansteens gate 57, 5006 Bergen',
    lat: 60.3845,
    lon: 5.3210,
    isHome: false,
  },
  møhlenpris: {
    name: 'Møhlenpris idrettsplass',
    shortName: 'Møhlenpris',
    address: 'Professor Hansteens gate 57, 5006 Bergen',
    lat: 60.3845,
    lon: 5.3210,
    isHome: false,
  },
  nordnes: {
    name: 'Nordnes idrettsplass',
    shortName: 'Nordnesbanen',
    address: 'Nordnesveien 34, 5005 Bergen',
    lat: 60.3990,
    lon: 5.3090,
    isHome: false,
  },
  sandviken_banen: {
    name: 'Stemmemyren kunstgress (Sandviken)',
    shortName: 'Stemmemyren',
    address: 'Ladegårdsgaten 61, 5035 Bergen',
    lat: 60.4215,
    lon: 5.3184,
    isHome: false,
  },
  nygardsparken: {
    name: 'Nygårdsparken',
    shortName: 'Nygårdsparken',
    address: 'Thormøhlens gate, 5006 Bergen',
    lat: 60.3820,
    lon: 5.3270,
    isHome: false,
  },
};

/**
 * Resolves full venue details from a venue name string or opponent name.
 */
export function getVenueDetails(venueName?: string, opponentName?: string): VenueLocation {
  const clean = (venueName || '').toLowerCase().trim();
  const cleanOpp = (opponentName || '').toLowerCase().trim();

  // 1. Direct venue match
  for (const [key, loc] of Object.entries(KNOWN_PITCHES)) {
    if (clean.includes(key)) {
      return loc;
    }
  }

  // 2. Opponent name match (e.g. away match against Fana, Baune, etc.)
  for (const [key, loc] of Object.entries(KNOWN_PITCHES)) {
    if (cleanOpp.includes(key)) {
      return {
        ...loc,
        name: `${loc.name} (${opponentName})`,
      };
    }
  }

  // 3. Fallback: Searchable location in Bergen / Western Norway
  const displayName = venueName || (opponentName ? `${opponentName}s hjemmebane` : 'Fjellsdalen idrettsplass');
  return {
    name: displayName,
    shortName: displayName.split(' ')[0],
    address: `${displayName}, Bergen`,
    lat: 60.3913,
    lon: 5.3221,
    isHome: clean.includes('bønes') || clean.includes('fjellsdalen'),
  };
}

/**
 * Builds an interactive Google Maps navigation link.
 */
export function getGoogleMapsUrl(venue: VenueLocation | string, opponent?: string): string {
  const loc = typeof venue === 'string' ? getVenueDetails(venue, opponent) : venue;
  const query = encodeURIComponent(`${loc.name} ${loc.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/**
 * Builds an embeddable Google Maps iframe source URL.
 */
export function getGoogleMapsEmbedUrl(venue: VenueLocation | string, opponent?: string): string {
  const loc = typeof venue === 'string' ? getVenueDetails(venue, opponent) : venue;
  const query = encodeURIComponent(`${loc.name}, Bergen, Norge`);
  return `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}
