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

// Date-only deadline helpers: the picker shows just a date, but a deadline is
// stored as the end of that local day so a task only becomes overdue once the
// day has fully passed.
export function toLocalDateInput(value: string | null): string {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  const tzOffset = dt.getTimezoneOffset() * 60000;
  return new Date(dt.getTime() - tzOffset).toISOString().slice(0, 10);
}

export function fromLocalDateInput(value: string): string | null {
  if (!value) return null;
  const end = new Date(`${value}T23:59:00`);
  if (Number.isNaN(end.getTime())) return null;
  return end.toISOString();
}
