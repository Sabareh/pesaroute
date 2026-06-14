export function parseMoneyInput(value: string, fallback = 10000): number {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function formatKes(value: number): string {
  return `KES ${Math.round(value).toLocaleString("en-KE")}`;
}

export function formatUsd(value: number): string {
  return `USD ${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
