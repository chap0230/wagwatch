const TZ_KEY = 'wagwatch_timezone';
export const DEFAULT_TZ = 'America/Los_Angeles';

export function getUserTimezone(): string {
  return localStorage.getItem(TZ_KEY) || DEFAULT_TZ;
}

export function setUserTimezone(tz: string) {
  localStorage.setItem(TZ_KEY, tz);
}

/** Format an ISO string for display in the user's chosen timezone */
export function formatInTz(iso: string, opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }): string {
  return new Intl.DateTimeFormat(undefined, { ...opts, timeZone: getUserTimezone() }).format(new Date(iso));
}

/** Get today's date string (YYYY-MM-DD) in the user's timezone */
export function todayInTz(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: getUserTimezone() }).format(new Date());
}

/** Get the local date string (YYYY-MM-DD) for any ISO timestamp in the user's timezone */
export function localDateInTz(iso?: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: getUserTimezone() }).format(iso ? new Date(iso) : new Date());
}

/** Convert a datetime-local input value (YYYY-MM-DDTHH:mm) to a proper ISO string
 *  treating it as being in the user's timezone */
export function localInputToISO(localStr: string): string {
  const tz = getUserTimezone();
  // Parse as if it's in the user's timezone using Intl
  const [datePart, timePart] = localStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = (timePart || '00:00').split(':').map(Number);

  // Use a trick: format a known UTC time and binary-search for the offset,
  // or simpler: use the browser's ability to interpret a date in a given tz via formatting
  // We'll use the reliable approach of constructing via toLocaleString offset detection
  const approxDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(approxDate).map(p => [p.type, p.value]));
  const tzYear = parseInt(parts.year), tzMonth = parseInt(parts.month) - 1;
  const tzDay = parseInt(parts.day), tzHour = parseInt(parts.hour) % 24;
  const tzMin = parseInt(parts.minute);

  const diffMs = approxDate.getTime() - Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMin);
  return new Date(Date.UTC(year, month - 1, day, hour, minute) + diffMs).toISOString();
}

/** Convert an ISO string to a datetime-local input value in the user's timezone */
export function isoToLocalInput(iso: string): string {
  const tz = getUserTimezone();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(iso)).map(p => [p.type, p.value]));
  const h = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${h}:${parts.minute}`;
}

export const TIMEZONE_OPTIONS = [
  { label: 'Pacific Time (US)', value: 'America/Los_Angeles' },
  { label: 'Mountain Time (US)', value: 'America/Denver' },
  { label: 'Central Time (US)', value: 'America/Chicago' },
  { label: 'Eastern Time (US)', value: 'America/New_York' },
  { label: 'Alaska Time', value: 'America/Anchorage' },
  { label: 'Hawaii Time', value: 'Pacific/Honolulu' },
  { label: 'UTC', value: 'UTC' },
  { label: 'London (GMT/BST)', value: 'Europe/London' },
  { label: 'Central Europe (CET)', value: 'Europe/Berlin' },
  { label: 'Sydney (AEST)', value: 'Australia/Sydney' },
];
