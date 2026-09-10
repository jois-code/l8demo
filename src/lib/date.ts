/**
 * Utility functions to format timestamps and dates according to Indian Standard Time (IST, UTC+5:30).
 */

export interface FormatISTOptions {
  includeTime?: boolean;
  hour12?: boolean;
}

/**
 * Formats a date or timestamp string to IST: "DD/MM/YYYY HH:mm:ss" (or 12-hour format if requested).
 * @param dateInput - Date object, ISO string, or SQLite timestamp string (UTC)
 * @param options - Formatting options
 */
export function formatToIST(
  dateInput?: string | Date | null,
  options: FormatISTOptions = {}
): string {
  if (!dateInput) return "";

  let d: Date;
  if (dateInput instanceof Date) {
    d = dateInput;
  } else {
    let s = String(dateInput).trim();
    if (!s) return "";
    // If it's a SQLite timestamp like "2026-09-10 18:20:00" without timezone, treat as UTC
    if (!s.endsWith("Z") && !s.includes("+")) {
      s = s.replace(" ", "T") + "Z";
    }
    d = new Date(s);
  }

  if (isNaN(d.getTime())) return String(dateInput);

  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: options.hour12 ?? false,
  }).formatToParts(d);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const dayPhase = map.dayPeriod ? ` ${map.dayPeriod.toLowerCase()}` : "";

  if (options.includeTime === false) {
    return `${map.day}/${map.month}/${map.year}`;
  }

  return `${map.day}/${map.month}/${map.year} ${map.hour}:${map.minute}:${map.second}${dayPhase}`;
}

/**
 * Returns current timestamp in IST for Google Sheets or exports (e.g. "10/09/2026 23:50:28")
 */
export function getISTTimestamp(date = new Date()): string {
  return formatToIST(date, { hour12: false });
}
