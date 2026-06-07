import { format } from "date-fns";

export function fmt(
  value: string | number | Date | null | undefined,
  pattern: string,
  fallback = "—",
): string {
  try {
    if (value == null || value === "") return fallback;
    const d =
      value instanceof Date ? value : new Date(value as string | number);
    if (isNaN(d.getTime())) return fallback;
    return format(d, pattern);
  } catch {
    return fallback;
  }
}
