/**
 * Lightweight input validators used by API handlers.
 *
 * Every validator returns null on success or a human-readable error string
 * suitable for returning in a 400 response.
 */

// Generous upper bounds — a pet's name is not 10,000 characters.
export const LIMITS = {
  shortText: 100,    // names, breeds, display names
  mediumText: 500,   // dosage, frequency, medical type, locations
  longText: 2000,    // notes, descriptions
  email: 254,        // RFC 5321 max
  phone: 32,
  listItems: 50,     // max items in conditions/allergies arrays
} as const;

export function isString(v: unknown): v is string {
  return typeof v === 'string';
}

/** Validate a required string field with a max length. */
export function validateString(value: unknown, field: string, max: number): string | null {
  if (!isString(value)) return `${field} must be a string`;
  const trimmed = value.trim();
  if (!trimmed) return `${field} is required`;
  if (value.length > max) return `${field} must be ${max} characters or fewer`;
  return null;
}

/** Validate an optional string field (null/undefined ok). */
export function validateOptionalString(value: unknown, field: string, max: number): string | null {
  if (value === undefined || value === null) return null;
  if (!isString(value)) return `${field} must be a string`;
  if (value.length > max) return `${field} must be ${max} characters or fewer`;
  return null;
}

// RFC 5322-ish — good enough for rejecting garbage without trying to be perfect.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateOptionalEmail(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (!isString(value)) return `${field} must be a string`;
  if (value.length > LIMITS.email) return `${field} must be ${LIMITS.email} characters or fewer`;
  if (!EMAIL_RE.test(value)) return `${field} must be a valid email address`;
  return null;
}

// Digits, spaces, dashes, parens, plus — permissive enough for international.
const PHONE_RE = /^[+\d][\d\s().\-]{1,31}$/;
export function validateOptionalPhone(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (!isString(value)) return `${field} must be a string`;
  if (value.length > LIMITS.phone) return `${field} must be ${LIMITS.phone} characters or fewer`;
  if (!PHONE_RE.test(value)) return `${field} must be a valid phone number`;
  return null;
}

// ISO-8601 date (YYYY-MM-DD). Doesn't validate real calendar days; DynamoDB
// doesn't care, and downstream uses tolerate it.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export function validateIsoDate(value: unknown, field: string): string | null {
  if (!isString(value)) return `${field} must be a string`;
  if (!ISO_DATE_RE.test(value)) return `${field} must be an ISO date (YYYY-MM-DD)`;
  if (Number.isNaN(Date.parse(value))) return `${field} must be a valid date`;
  return null;
}

/** Validate a weight value — nullable number, sane bounds (in kg or lb). */
export function validateOptionalWeight(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || Number.isNaN(value)) return `${field} must be a number`;
  if (value <= 0 || value > 500) return `${field} must be between 0 and 500`;
  return null;
}

/** Validate an optional array of short strings (e.g. conditions, allergies). */
export function validateOptionalStringList(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) return `${field} must be an array`;
  if (value.length > LIMITS.listItems) return `${field} must contain ${LIMITS.listItems} items or fewer`;
  for (const item of value) {
    if (!isString(item)) return `${field} items must be strings`;
    if (item.length > LIMITS.shortText) return `${field} items must be ${LIMITS.shortText} characters or fewer`;
  }
  return null;
}

/** Run a list of validators, returning the first error string or null. */
export function firstError(checks: (string | null)[]): string | null {
  for (const err of checks) if (err) return err;
  return null;
}

// Reject timestamps that are either malformed or wildly out of range. We
// accept ±1 year around "now" to allow for clock skew, backfilling a
// forgotten note from yesterday, or scheduling slight future events.
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
export function validateOccurredAt(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null; // handler defaults to now
  if (!isString(value)) return `${field} must be an ISO-8601 timestamp string`;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return `${field} must be a valid ISO-8601 timestamp`;
  const now = Date.now();
  if (t < now - ONE_YEAR_MS) return `${field} is too far in the past`;
  if (t > now + ONE_YEAR_MS) return `${field} is too far in the future`;
  return null;
}
