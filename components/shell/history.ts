const KEY = "learn-postgres:history";
const MAX = 500;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}

function write(list: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // localStorage may be full or disabled; silently ignore.
  }
}

export function loadHistory(): string[] {
  return read();
}

export function pushHistory(entry: string): void {
  const trimmed = entry.trim();
  if (!trimmed) return;
  const list = read();
  if (list[list.length - 1] === trimmed) return;
  list.push(trimmed);
  while (list.length > MAX) list.shift();
  write(list);
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore — storage might be disabled
  }
}
