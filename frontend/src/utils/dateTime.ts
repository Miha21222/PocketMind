export function formatInTimezone(value: string | null, timezone: string, locale: string, withYear = false): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    day: "2-digit",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatTimeInTimezone(value: string | null, timezone: string, locale: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDayInTimezone(value: string | null, timezone: string, locale: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

// Stable YYYY-MM-DD key for the given instant in the user's timezone, used to
// bucket tasks into day groups on the dashboard timeline.
export function dayKeyInTimezone(value: string | null, timezone: string): string {
  if (!value) return "none";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "none";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function toLocalDateTimeInput(value: string | null): string {
  if (!value) return "";
  const dt = new Date(value);
  const tzOffset = dt.getTimezoneOffset() * 60000;
  return new Date(dt.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function fromLocalDateTimeInput(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function zonedPartNumber(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): number {
  return Number(parts.find((part) => part.type === type)?.value ?? 0);
}

function getZonedParts(date: Date, timezone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(date);

  return {
    year: zonedPartNumber(parts, "year"),
    month: zonedPartNumber(parts, "month"),
    day: zonedPartNumber(parts, "day"),
    hour: zonedPartNumber(parts, "hour"),
    minute: zonedPartNumber(parts, "minute"),
    second: zonedPartNumber(parts, "second"),
  };
}

function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const zoned = getZonedParts(date, timezone);
  const zonedAsUtc = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second, 0);
  return zonedAsUtc - date.getTime();
}

function splitDayKey(dayKey: string): [number, number, number] | null {
  const match = dayKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function zonedDayKeyFromTimestamp(timestamp: number, timezone: string): string {
  const zoned = getZonedParts(new Date(timestamp), timezone);
  return `${String(zoned.year).padStart(4, "0")}-${String(zoned.month).padStart(2, "0")}-${String(zoned.day).padStart(2, "0")}`;
}

export function addDaysToDayKey(dayKey: string, days: number): string {
  const parts = splitDayKey(dayKey);
  if (!parts) return dayKey;
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function addMonthsToDayKey(dayKey: string, months: number): string {
  const parts = splitDayKey(dayKey);
  if (!parts) return dayKey;
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  date.setUTCMonth(date.getUTCMonth() + months);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function zonedDateTimeToUtcTimestamp(dayKey: string, hhmm: string, timezone: string): number | null {
  const dateParts = splitDayKey(dayKey);
  if (!dateParts) return null;
  const timeParts = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!timeParts) return null;
  const [year, month, day] = dateParts;
  const hours = Number(timeParts[1]);
  const minutes = Number(timeParts[2]);
  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  const firstPass = utcGuess - getTimezoneOffsetMs(new Date(utcGuess), timezone);
  const secondPass = utcGuess - getTimezoneOffsetMs(new Date(firstPass), timezone);
  return secondPass;
}

export function getZonedDayRange(now: Date, timezone: string): { start: number; end: number } {
  const todayKey = zonedDayKeyFromTimestamp(now.getTime(), timezone);
  const tomorrowKey = addDaysToDayKey(todayKey, 1);
  return {
    start: zonedDateTimeToUtcTimestamp(todayKey, "00:00", timezone) ?? now.getTime(),
    end: zonedDateTimeToUtcTimestamp(tomorrowKey, "00:00", timezone) ?? now.getTime(),
  };
}

// Date-only deadline helpers: the picker shows just a date, but a deadline is
// stored as the end of that local day so a task only becomes overdue once the
// day has fully passed.
export function toLocalDateInput(value: string | null, timezone?: string): string {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  if (!timezone) {
    const tzOffset = dt.getTimezoneOffset() * 60000;
    return new Date(dt.getTime() - tzOffset).toISOString().slice(0, 10);
  }
  return zonedDayKeyFromTimestamp(dt.getTime(), timezone);
}

export function fromLocalDateInput(value: string, timezone?: string): string | null {
  if (!value) return null;
  if (timezone) {
    const candidate = zonedDateTimeToUtcTimestamp(value, "23:59", timezone);
    return candidate === null ? null : new Date(candidate).toISOString();
  }
  const end = new Date(`${value}T23:59:00`);
  if (Number.isNaN(end.getTime())) return null;
  return end.toISOString();
}
