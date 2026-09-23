import { Match } from '../types.js';

/**
 * Formats a date string 'YYYY-MM-DD' and time string 'HH:mm' into ICS local format YYYYMMDDTHHmm00
 */
function formatIcsDateTime(dateStr: string, timeStr?: string, durationMinutes: number = 90): { start: string; end: string } {
  const cleanDate = dateStr.replace(/[^0-9]/g, '').slice(0, 8); // YYYYMMDD
  
  let hours = 12;
  let minutes = 0;
  
  if (timeStr && timeStr.includes(':')) {
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h)) hours = h;
    if (!isNaN(m)) minutes = m;
  }
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  const start = `${cleanDate}T${pad(hours)}${pad(minutes)}00`;
  
  // Calculate end time
  const totalStartMinutes = hours * 60 + minutes;
  const totalEndMinutes = totalStartMinutes + durationMinutes;
  
  const endHours = Math.floor(totalEndMinutes / 60) % 24;
  const endMinutes = totalEndMinutes % 60;
  
  // Check if date wrapped past midnight (rare for youth matches, but safe)
  let endDateStr = cleanDate;
  if (totalEndMinutes >= 24 * 60) {
    const d = new Date(
      parseInt(cleanDate.substring(0, 4), 10),
      parseInt(cleanDate.substring(4, 6), 10) - 1,
      parseInt(cleanDate.substring(6, 8), 10) + 1
    );
    endDateStr = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  }
  
  const end = `${endDateStr}T${pad(endHours)}${pad(endMinutes)}00`;
  return { start, end };
}

/**
 * Escapes characters for standard iCalendar text values (RFC 5545)
 */
function escapeIcsText(str: string = ''): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\n');
}

/**
 * Generate match title for calendar
 */
export function getMatchCalendarTitle(match: Match): string {
  const isBonesHome = match.homeTeam.toLowerCase().includes('bønes');
  const isBonesAway = match.awayTeam.toLowerCase().includes('bønes');
  
  if (isBonesHome) {
    return `${match.homeTeam} – ${match.awayTeam}`;
  } else if (isBonesAway) {
    return `${match.awayTeam} borte mot ${match.homeTeam}`;
  }
  return `${match.homeTeam} – ${match.awayTeam}`;
}

/**
 * Generates match calendar description
 */
export function getMatchCalendarDescription(match: Match): string {
  const lines: string[] = [];
  lines.push(`⚽ Kamp: ${match.homeTeam} vs ${match.awayTeam}`);
  if (match.division) {
    lines.push(`🏆 Turnering: ${match.division}${match.round ? ` (${match.round})` : ''}`);
  }
  if (match.venue) {
    lines.push(`📍 Bane: ${match.venue}${match.venueCity ? `, ${match.venueCity}` : ''}`);
  }
  lines.push(`🕒 Kampstart: kl. ${match.time || '12:00'}`);
  lines.push(`🏟️ Type: ${match.isHome ? 'Hjemmekamp (Bønes)' : 'Bortekamp'}`);
  if (match.referee) {
    lines.push(`👤 Dommer: ${match.referee}`);
  }
  if (match.status === 'finished') {
    lines.push(`📊 Sluttresultat: ${match.homeScore ?? 0} - ${match.awayScore ?? 0}`);
  }
  lines.push('');
  lines.push('Følg kampen direkte på Bønes IL Livescore:');
  if (typeof window !== 'undefined') {
    lines.push(`${window.location.origin}/?tab=matches&match=${match.id}`);
  } else {
    lines.push('https://bonesil.no');
  }

  return lines.join('\n');
}

/**
 * Generates a direct Google Calendar event URL for a match
 */
export function getGoogleCalendarUrl(match: Match): string {
  const title = getMatchCalendarTitle(match);
  const { start, end } = formatIcsDateTime(match.date, match.time, 105);
  const description = getMatchCalendarDescription(match);
  const location = `${match.venue || 'Fjellsdalen idrettsplass'}${match.venueCity ? `, ${match.venueCity}` : ''}`;
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    details: description,
    location: location,
    ctz: 'Europe/Oslo'
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates an iCalendar VEVENT block for a single match
 */
function createIcsVEvent(match: Match, nowUtc: string): string {
  const title = getMatchCalendarTitle(match);
  const { start, end } = formatIcsDateTime(match.date, match.time, 105);
  const description = getMatchCalendarDescription(match);
  const location = `${match.venue || 'Fjellsdalen idrettsplass'}${match.venueCity ? `, ${match.venueCity}` : ''}`;
  const url = typeof window !== 'undefined' ? `${window.location.origin}/?tab=matches&match=${match.id}` : '';

  return [
    'BEGIN:VEVENT',
    `UID:bones-match-${match.id}@bonesil.fotball.no`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART;TZID=Europe/Oslo:${start}`,
    `DTEND;TZID=Europe/Oslo:${end}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(location)}`,
    'STATUS:CONFIRMED',
    'CATEGORIES:Fotball,Bønes IL,Kamp',
    ...(url ? [`URL:${url}`] : []),
    'END:VEVENT'
  ].join('\r\n');
}

/**
 * Generates a complete .ics file content for one or multiple matches
 */
export function generateIcsContent(matches: Match[], calendarTitle?: string): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const now = new Date();
  const nowUtc = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  
  const calName = calendarTitle || (matches.length === 1 ? getMatchCalendarTitle(matches[0]) : 'Bønes IL Kampprogram');

  const vevents = matches.map((m) => createIcsVEvent(m, nowUtc)).join('\r\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bønes IL Fotball//Terminliste//NO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calName)}`,
    'X-WR-TIMEZONE:Europe/Oslo',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Oslo',
    'X-LIC-LOCATION:Europe/Oslo',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
    vevents,
    'END:VCALENDAR'
  ].join('\r\n');
}

/**
 * Initiates browser download of .ics content
 */
export function downloadIcsFile(filename: string, icsContent: string): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.ics') ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 150);
}

/**
 * Downloads a single match as an .ics file
 */
export function downloadMatchIcs(match: Match): void {
  const filename = `Bones_${match.homeTeam}_vs_${match.awayTeam}_${match.date}`
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  
  const ics = generateIcsContent([match], getMatchCalendarTitle(match));
  downloadIcsFile(filename, ics);
}

/**
 * Downloads a schedule of matches for a team or group as an .ics file
 */
export function downloadTeamScheduleIcs(matches: Match[], teamName: string = 'Bønes IL'): void {
  if (matches.length === 0) return;
  
  const cleanTeamName = teamName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Terminliste_${cleanTeamName}_2026.ics`;
  const calTitle = `Terminliste: ${teamName}`;
  
  const ics = generateIcsContent(matches, calTitle);
  downloadIcsFile(filename, ics);
}
