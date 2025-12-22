/**
 * Helper functions for JSON serialization/deserialization
 * Needed because SQLite stores JSON as strings
 */

export function parseJson<T>(value: string | null | undefined, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

export function stringifyJson(value: any): string {
  return JSON.stringify(value);
}

