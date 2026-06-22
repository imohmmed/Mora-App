export function formatIQD(amount: number | null | undefined): string {
  const n = Math.round(Number(amount) || 0);
  return `${n.toLocaleString("en-US")} IQD`;
}
