export const STORAGE_KEYS = {
  articles: "reading-journal-articles-v3",
  books: "reading-journal-books-v1",
  sessions: "reading-journal-sessions-v1",
  vocabulary: "reading-journal-vocabulary-v1",
  tests: "reading-journal-tests-v1",
  goals: "reading-journal-goals-v1",
  reviews: "reading-journal-reviews-v1",
  migration: "reading-journal-migration-v4",
};

export function makeId(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadArray(key, fallback = []) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function saveArray(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Could not save ${key}`, error);
  }
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
