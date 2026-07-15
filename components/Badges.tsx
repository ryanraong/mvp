import { ConfidenceLevel, PriceConfidenceLabel } from "@/lib/types";
import { PRICE_CONFIDENCE_LABEL } from "@/lib/format";
import clsx from "clsx";

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const styles: Record<ConfidenceLevel, string> = {
    high: "bg-emerald-100 text-emerald-800 border-emerald-300",
    medium: "bg-amber-100 text-amber-800 border-amber-300",
    low: "bg-rose-100 text-rose-800 border-rose-300",
  };
  const label: Record<ConfidenceLevel, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };
  return <span className={clsx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", styles[level])}>{label[level]}</span>;
}

export function PriceConfidenceBadge({ label }: { label: PriceConfidenceLabel }) {
  const styles: Record<PriceConfidenceLabel, string> = {
    "exact-verified-total": "bg-emerald-100 text-emerald-800 border-emerald-300",
    "exact-before-tax": "bg-sky-100 text-sky-800 border-sky-300",
    "live-starting-rate": "bg-amber-100 text-amber-800 border-amber-300",
    indicative: "bg-orange-100 text-orange-800 border-orange-300",
    unavailable: "bg-slate-200 text-slate-700 border-slate-300",
  };
  return <span className={clsx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", styles[label])}>{PRICE_CONFIDENCE_LABEL[label]}</span>;
}

export function Tag({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "rose" | "amber" | "emerald" | "indigo" }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  return <span className={clsx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", tones[tone])}>{children}</span>;
}
