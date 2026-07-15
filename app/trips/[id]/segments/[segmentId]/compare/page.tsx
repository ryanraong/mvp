"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMemo } from "react";
import { useTripStore } from "@/lib/store";
import { TripStepNav } from "@/components/TripStepNav";
import { ConfidenceBadge } from "@/components/Badges";
import { formatMoney } from "@/lib/format";
import { scoreSegment } from "@/lib/engine/scoring";
import { explainWinner } from "@/lib/engine/explanation";
import { ScoredOffer } from "@/lib/types";
import clsx from "clsx";

function cellTone(values: (number | null)[], idx: number, higherIsBetter = true): "win" | "lose" | "neutral" | "unknown" {
  const value = values[idx];
  if (value === null) return "unknown";
  const known = values.filter((v): v is number => v !== null);
  if (known.length < 2) return "neutral";
  const best = higherIsBetter ? Math.max(...known) : Math.min(...known);
  const worst = higherIsBetter ? Math.min(...known) : Math.max(...known);
  if (best === worst) return "neutral";
  if (value === best) return "win";
  if (value === worst) return "lose";
  return "neutral";
}

function ToneCell({ tone, children }: { tone: "win" | "lose" | "neutral" | "unknown"; children: React.ReactNode }) {
  return (
    <td
      className={clsx(
        "px-3 py-2 text-sm",
        tone === "win" && "bg-emerald-50 font-medium text-emerald-800",
        tone === "lose" && "bg-rose-50 text-rose-700",
        tone === "unknown" && "bg-slate-100 italic text-slate-400",
        tone === "neutral" && "text-slate-700"
      )}
    >
      {children}
    </td>
  );
}

export default function ComparePage() {
  const { id, segmentId } = useParams<{ id: string; segmentId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const trip = useTripStore((s) => s.trips[id]);
  const upsertShortlistItem = useTripStore((s) => s.upsertShortlistItem);

  const segment = trip?.segments.find((s) => s.id === segmentId);
  const allOffers = useMemo(() => (trip && segment ? scoreSegment(trip, segment) : []), [trip, segment]);
  const roomIds = (searchParams.get("rooms") ?? "").split(",").filter(Boolean).slice(0, 3);
  const offers = roomIds.map((rid) => allOffers.find((o) => o.room.id === rid)).filter((o): o is ScoredOffer => !!o);

  if (!trip || !segment) return <main className="flex-1 p-8 text-slate-500">Stay not found.</main>;
  if (offers.length < 2) {
    return (
      <main className="mx-auto max-w-2xl flex-1 p-8 text-slate-500">
        Select at least two rooms to compare from the{" "}
        <a className="underline" href={`/trips/${trip.id}/segments/${segment.id}`}>
          shortlist page
        </a>
        .
      </main>
    );
  }

  const sorted = [...offers].sort((a, b) => b.score - a.score);
  const explanation = explainWinner(sorted[0], sorted[1]);

  const rows: { label: string; values: (string | number)[]; toneValues?: (number | null)[]; higherIsBetter?: boolean }[] = [
    { label: "Total price for stay", values: offers.map((o) => formatMoney(o.totalPriceForSegment, trip.currency)), toneValues: offers.map((o) => o.totalPriceForSegment), higherIsBetter: false },
    { label: "Price confidence", values: offers.map((o) => o.room.priceConfidence) },
    { label: "Room size", values: offers.map((o) => (o.room.sizeSqm ? `${o.room.sizeSqm} sqm` : "Unknown")), toneValues: offers.map((o) => o.room.sizeSqm) },
    { label: "Bed type", values: offers.map((o) => o.room.bedType) },
    { label: "Bathroom", values: offers.map((o) => o.room.bathroom) },
    { label: "Cancellation", values: offers.map((o) => o.room.cancellation) },
    {
      label: "Airport access",
      values: offers.map((o) => `${o.hotel.fromArrivalPoint.minutes} min`),
      toneValues: offers.map((o) => o.hotel.fromArrivalPoint.minutes),
      higherIsBetter: false,
    },
    {
      label: "Neighbourhood feel",
      values: offers.map((o) => `${o.neighbourhood.quietness}, ${o.neighbourhood.touristIntensity} tourist intensity`),
    },
    { label: "Review strengths", values: offers.map((o) => o.review.strengths.slice(0, 2).join("; ") || "—") },
    { label: "Review concerns", values: offers.map((o) => o.review.concerns.slice(0, 2).join("; ") || "None recurring") },
    {
      label: "Overall score",
      values: offers.map((o) => `${Math.round(o.score * 100)}/100`),
      toneValues: offers.map((o) => o.score),
      higherIsBetter: true,
    },
  ];

  return (
    <>
      <TripStepNav tripId={trip.id} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold">Compare — {segment.role}</h1>
          <p className="mt-1 text-sm text-slate-500">Comparing {offers.length} room options for this stay.</p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[640px] table-fixed text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-40 px-3 py-2 text-xs uppercase text-slate-400">Attribute</th>
                {offers.map((o) => (
                  <th key={o.room.id} className="px-3 py-2">
                    <div className="text-sm font-semibold">{o.hotel.name}</div>
                    <div className="text-xs font-normal text-slate-500">{o.room.name}</div>
                    <div className="mt-1">
                      <ConfidenceBadge level={o.confidence} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-slate-100">
                  <td className="px-3 py-2 text-xs font-medium text-slate-500">{row.label}</td>
                  {row.values.map((v, i) => {
                    const tone = row.toneValues ? cellTone(row.toneValues as (number | null)[], i, row.higherIsBetter ?? true) : "neutral";
                    return (
                      <ToneCell key={i} tone={tone}>
                        {v === null ? "Unknown" : v}
                      </ToneCell>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className="px-3 py-3 text-xs font-medium text-slate-500">Select</td>
                {offers.map((o) => (
                  <td key={o.room.id} className="px-3 py-3">
                    <button
                      className="btn-primary text-xs"
                      onClick={() => {
                        upsertShortlistItem(trip.id, { segmentId: segment.id, hotelId: o.hotel.id, roomId: o.room.id, status: "selected" });
                        router.push(`/trips/${trip.id}/shortlist`);
                      }}
                    >
                      Select for this stay
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {explanation && (
          <section className="card">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Why {sorted[0].hotel.name} leads</h2>
            <p className="text-sm text-slate-700">{explanation.statement}</p>
            <p className="mt-2 text-sm text-slate-500">{explanation.preferenceShiftStatement}</p>
            <p className="mt-2 text-xs text-slate-400">
              Price difference vs. runner-up: {explanation.priceDifference >= 0 ? "+" : ""}
              {formatMoney(explanation.priceDifference, trip.currency)}
            </p>
          </section>
        )}

        <div className="flex justify-start border-t border-slate-200 pt-6">
          <Link href={`/trips/${trip.id}/segments/${segment.id}`} className="btn-secondary">
            Back to shortlist
          </Link>
        </div>
      </main>
    </>
  );
}
