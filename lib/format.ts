import { Currency, PriceConfidenceLabel } from "@/lib/types";

const SYMBOLS: Record<Currency, string> = { SGD: "S$", JPY: "¥", USD: "US$" };

export function formatMoney(amount: number, currency: Currency = "SGD"): string {
  return `${SYMBOLS[currency]}${Math.round(amount).toLocaleString()}`;
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateShort(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-SG", { day: "numeric", month: "short" });
}

export function nightsBetween(start: string, end: string): number {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000));
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const PRICE_CONFIDENCE_LABEL: Record<PriceConfidenceLabel, string> = {
  "exact-verified-total": "Exact-date verified total",
  "exact-before-tax": "Exact-date price before taxes",
  "live-starting-rate": "Live starting rate",
  indicative: "Indicative price",
  unavailable: "Price unavailable",
};
