/**
 * Timezone-aware date utilities.
 * Uses the user's profile timezone (e.g. "America/New_York") for all day-boundary logic.
 */

/** Get "today" as YYYY-MM-DD in the given timezone */
export function getTodayInTz(tz: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: tz }); // en-CA gives YYYY-MM-DD
}

/** Get start/end of today in the given timezone, returned as ISO strings (UTC) for DB queries */
export function getDayBoundsUTC(tz: string, dateStr?: string): { start: string; end: string } {
  const today = dateStr || getTodayInTz(tz);
  // Build date at midnight in the target timezone using Intl
  const startLocal = new Date(`${today}T00:00:00`);
  const endLocal = new Date(`${today}T23:59:59.999`);

  // Get the UTC offset for this timezone at these times
  const startUTC = zonedToUTC(today, '00:00:00', tz);
  const endUTC = zonedToUTC(today, '23:59:59.999', tz);

  return { start: startUTC.toISOString(), end: endUTC.toISOString() };
}

/** Convert a date+time in a given timezone to a UTC Date */
function zonedToUTC(dateStr: string, timeStr: string, tz: string): Date {
  // Create a formatter that outputs in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  // We need to find the UTC time that corresponds to dateStr+timeStr in tz.
  // Strategy: start with a guess, then adjust based on the offset.
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm, ssRaw] = timeStr.split(':');
  const ss = parseFloat(ssRaw || '0');

  // Naive guess (treat as UTC)
  const guess = new Date(Date.UTC(y, m - 1, d, parseInt(hh), parseInt(mm), Math.floor(ss), (ss % 1) * 1000));

  // See what that guess looks like in the target timezone
  const parts = formatter.formatToParts(guess);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');
  const guessInTz = new Date(Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')));

  // The difference tells us the offset
  const offsetMs = guessInTz.getTime() - guess.getTime();

  // Adjust
  return new Date(guess.getTime() - offsetMs);
}

/** Format current time in timezone */
export function nowInTz(tz: string): Date {
  // Returns a Date object representing "now" — but the actual Date is always UTC internally.
  // For display, use toLocaleString with timeZone option.
  return new Date();
}

/** Get current hour + minute as total minutes in the given timezone */
export function nowMinutesInTz(tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  return h * 60 + m;
}

/** Get greeting based on timezone */
export function getGreetingInTz(tz: string): string {
  const h = Math.floor(nowMinutesInTz(tz) / 60);
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Format today's date string in timezone */
export function getDateStrInTz(tz: string): string {
  return new Date().toLocaleDateString('en-US', {
    timeZone: tz, weekday: 'long', month: 'long', day: 'numeric',
  });
}
