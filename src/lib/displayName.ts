/**
 * Formats a reviewer's full name for public display.
 *
 * Rules (simple, documented):
 *   null / empty        → returns the `anonymous` fallback string (translated by caller)
 *   Single word         → returned as-is ("Marie" → "Marie")
 *   Two+ words          → first token + initial of last token + dot
 *                         "Jean Dupont"       → "Jean D."
 *                         "Jean-Pierre Dupont"→ "Jean-Pierre D."  (hyphen preserved)
 *                         "Ana von Habsburg"  → "Ana H."          (last token wins)
 *   Croatian diacritics → correct: JS .toUpperCase() handles Č Ć Š Ž Đ natively
 *
 * Particle rule: "Ana von Habsburg" gives "Ana H." (not "Ana v.") because the initial
 * is always taken from the last space-separated token — simpler and more consistent
 * than detecting particles, which vary across languages.
 */
export function formatReviewerName(
  fullName: string | null | undefined,
  anonymous: string,
): string {
  const trimmed = fullName?.trim();
  if (!trimmed) return anonymous;
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${parts[0]} ${lastInitial}.`;
}
