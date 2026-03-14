import type { AqiInfo, AqiLevel } from "./types";

/**
 * Format a number with comma separators: 1234 → "1,234"
 * Returns "—" for null/undefined.
 */
export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US");
}

/**
 * Format a delta percentage with sign: 12.3 → "+12.3%", -5.1 → "−5.1%"
 * Returns "—" for null/undefined. Uses proper minus sign (−).
 */
export function formatDelta(pct: number | null | undefined): string {
  if (pct == null) return "—";
  if (pct === 0) return "0.0%";
  const sign = pct > 0 ? "+" : "\u2212";
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

/**
 * Format a date as "Mar 13, 2026"
 * Uses UTC to avoid timezone shifts with date-only strings.
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (date == null) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Format a date as "Mar 13" (short, no year)
 * Uses UTC to avoid timezone shifts with date-only strings.
 */
export function formatDateShort(
  date: string | Date | null | undefined
): string {
  if (date == null) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

const AQI_BREAKPOINTS: { max: number; label: string; level: AqiLevel }[] = [
  { max: 50, label: "Good", level: "Good" },
  { max: 100, label: "Moderate", level: "Moderate" },
  {
    max: 150,
    label: "Unhealthy for Sensitive Groups",
    level: "Unhealthy for Sensitive Groups",
  },
  { max: 200, label: "Unhealthy", level: "Unhealthy" },
  { max: 300, label: "Very Unhealthy", level: "Very Unhealthy" },
  { max: 500, label: "Hazardous", level: "Hazardous" },
];

/**
 * Convert an AQI numeric value to { value, label, level }.
 * Returns null for null/undefined input.
 */
export function formatAqi(value: number | null | undefined): AqiInfo | null {
  if (value == null) return null;
  const clamped = Math.max(0, Math.round(value));
  const bp =
    AQI_BREAKPOINTS.find((b) => clamped <= b.max) ??
    AQI_BREAKPOINTS[AQI_BREAKPOINTS.length - 1];
  return { value: clamped, label: bp.label, level: bp.level };
}
