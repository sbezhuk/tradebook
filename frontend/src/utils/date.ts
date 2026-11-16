/**
 * Date and time utilities for handling UTC timestamps from backend
 * and converting to/from user's local timezone.
 */

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Parses an ISO date string as UTC if no timezone offset is provided.
 * Handles both "2026-11-16T10:37:00Z" and naive strings like "2026-11-16T10:37:00".
 */
export const parseUtcDate = (val: string | null | undefined): Date | null => {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;
  // If the string already has Z or a timezone offset like +02:00 or -05:00, parse directly.
  const hasTz = str.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(str);
  const normalized = hasTz ? str : `${str.replace(' ', 'T')}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Converts a UTC date (ISO string or Date) to local input format "YYYY-MM-DDTHH:mm"
 * for datetime pickers (GlassDateTimePicker).
 */
export const toLocalInputValue = (input: Date | string | null | undefined): string => {
  if (!input) return '';
  const d = input instanceof Date ? input : parseUtcDate(input);
  if (!d) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`;
};

/**
 * Converts a local datetime input string "YYYY-MM-DDTHH:mm" to an ISO-8601 UTC string.
 * This preserves the exact local time the user chose when converting to UTC for backend storage.
 */
export const fromLocalInputToUtcIso = (localVal: string): string => {
  if (!localVal) return new Date().toISOString();
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(localVal);
  if (match) {
    const [, y, m, d, h, min] = match;
    const localDate = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min));
    return localDate.toISOString();
  }
  const fallback = new Date(localVal);
  return Number.isNaN(fallback.getTime()) ? new Date().toISOString() : fallback.toISOString();
};

/**
 * Formats a UTC date string or Date into user's local Ukrainian representation.
 * e.g. "16.11, 12:37" or "16.11.2026"
 */
export const formatDisplayDateTime = (
  val: string | Date | null | undefined,
  includeTime = true
): string => {
  if (!val) return '';
  const d = val instanceof Date ? val : parseUtcDate(val);
  if (!d) return String(val || '');
  if (!includeTime) {
    return d.toLocaleDateString('uk-UA');
  }
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const hh = pad2(d.getHours());
  const min = pad2(d.getMinutes());
  return `${dd}.${mm}, ${hh}:${min}`;
};
