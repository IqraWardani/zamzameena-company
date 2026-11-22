type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export const DEFAULT_EVENT_TIMEZONE = "Asia/Makassar";

function getZonedParts(date: Date, timezone: string): LocalDateTimeParts | null {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const values = Object.fromEntries(
      parts.map((part) => [part.type, part.value]),
    );
    return {
      year: Number(values.year),
      month: Number(values.month),
      day: Number(values.day),
      hour: Number(values.hour),
      minute: Number(values.minute),
    };
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}

function sameParts(left: LocalDateTimeParts, right: LocalDateTimeParts): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  );
}

export function localDateTimeToIso(
  value: string,
  timezone: string,
): string | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const desired = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
  const localCalendar = new Date(
    Date.UTC(desired.year, desired.month - 1, desired.day, desired.hour, desired.minute),
  );
  if (
    localCalendar.getUTCFullYear() !== desired.year ||
    localCalendar.getUTCMonth() !== desired.month - 1 ||
    localCalendar.getUTCDate() !== desired.day ||
    desired.hour > 23 ||
    desired.minute > 59
  ) {
    return null;
  }

  const desiredAsUtc = localCalendar.getTime();
  let timestamp = desiredAsUtc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const zoned = getZonedParts(new Date(timestamp), timezone);
    if (!zoned) return null;
    const representedAsUtc = Date.UTC(
      zoned.year,
      zoned.month - 1,
      zoned.day,
      zoned.hour,
      zoned.minute,
    );
    const correction = desiredAsUtc - representedAsUtc;
    if (correction === 0) break;
    timestamp += correction;
  }

  const result = new Date(timestamp);
  const actual = getZonedParts(result, timezone);
  return actual && sameParts(actual, desired) ? result.toISOString() : null;
}

export function localDateTimeToOffsetIso(
  value: string,
  timezone: string,
): string | null {
  const utcValue = localDateTimeToIso(value, timezone);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!utcValue || !match) return null;

  const localAsUtc = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
  const offsetMinutes = (localAsUtc - Date.parse(utcValue)) / 60_000;
  const sign = offsetMinutes < 0 ? "-" : "+";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, "0");
  const offsetRemainder = String(absoluteOffset % 60).padStart(2, "0");

  return `${value}:00${sign}${offsetHours}:${offsetRemainder}`;
}

export function dateTimeInputValues(
  value: Date | string | null | undefined,
  timezone: string,
): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const instant = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(instant.getTime())) return { date: "", time: "" };
  const parts = getZonedParts(instant, timezone);
  if (!parts) return { date: "", time: "" };

  const date = [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
  const time = [
    String(parts.hour).padStart(2, "0"),
    String(parts.minute).padStart(2, "0"),
  ].join(":");
  return { date, time };
}

export function slugifyEventName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)
    .replace(/-+$/g, "");
}
