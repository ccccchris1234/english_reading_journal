export const DAY_MS = 86_400_000;

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function parseLocalDate(value) {
  if (!value) return new Date();
  return new Date(`${value}T12:00:00`);
}

export function toIsoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export function startOfWeek(date = new Date()) {
  const current = new Date(date);
  current.setHours(12, 0, 0, 0);
  const day = current.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + offset);
  return current;
}

export function endOfWeek(date = new Date()) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

export function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

export function inDateRange(value, start, end) {
  if (!value) return false;
  const date = parseLocalDate(value);
  return date >= start && date <= end;
}

export function formatDate(value, options = {}) {
  if (!value) return "Not set";
  return parseLocalDate(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: options.year === false ? undefined : "numeric",
  });
}

export function formatShortDate(value) {
  if (!value) return "";
  return parseLocalDate(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function number(value, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

export function pagesInSession(session) {
  return Math.max(0, number(session.endPage) - number(session.startPage));
}

export function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + number(value), 0) / values.length;
}

export function percentChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function splitLines(text) {
  return String(text || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function splitTags(text) {
  return String(text || "")
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getWordCount(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function getReadingTime(text) {
  const words = getWordCount(text);
  if (!words) return "0 min";
  return `${Math.max(1, Math.ceil(words / 220))} min`;
}

export function normalizeUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

export function currentStreak(sessions) {
  const dates = new Set(sessions.map((session) => session.date).filter(Boolean));
  if (!dates.size) return 0;

  let cursor = parseLocalDate(todayIso());
  if (!dates.has(toIsoDate(cursor))) {
    cursor = addDays(cursor, -1);
  }

  let streak = 0;
  while (dates.has(toIsoDate(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function lastNWeeks(count = 8) {
  const currentStart = startOfWeek(new Date());
  return Array.from({ length: count }, (_, index) => {
    const start = addDays(currentStart, -7 * (count - 1 - index));
    return {
      start,
      end: endOfWeek(start),
      label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
  });
}

export function truncate(text, max = 120) {
  const value = String(text || "");
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
