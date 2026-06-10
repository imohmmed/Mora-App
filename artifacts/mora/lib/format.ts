/**
 * Format a price number as Iraqi Dinar.
 * Numbers always rendered in English (LTR) regardless of app language.
 * Example: 50000 → "50,000 IQD"
 */
export function formatIQD(price: number | null | undefined): string {
  if (price == null) return "";
  const rounded = Math.round(price);
  return rounded.toLocaleString("en-US") + " IQD";
}
