"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTripStore } from "@/lib/store";
import { TripStepNav } from "@/components/TripStepNav";
import { buildCoverageReport } from "@/lib/engine/coverage";

const STAGES = [
  "Searching neighbourhoods",
  "Identifying properties",
  "Checking rooms",
  "Applying constraints",
  "Analysing reviews",
  "Comparing transport",
  "Ranking finalists",
];

export default function ResearchProgressPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const trip = useTripStore((s) => s.trips[id]);
  const [stageIdx, setStageIdx] = useState(0);
  const [done, setDone] = useState(false);

  const coverage = useMemo(() => (trip ? buildCoverageReport(trip) : null), [trip]);

  useEffect(() => {
    if (!trip || done) return;
    if (stageIdx >= STAGES.length - 1) {
      const t = setTimeout(() => setDone(true), 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStageIdx((i) => i + 1), 650);
    return () => clearTimeout(t);
  }, [stageIdx, trip, done]);

  if (!trip || !coverage) return <main className="flex-1 p-8 text-slate-500">Trip not found.</main>;

  return (
    <>
      <TripStepNav tripId={trip.id} />
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-10">
        <div>
          <h1 className="text-2xl font-semibold">Researching your stays</h1>
          <p className="mt-1 text-sm text-slate-500">Searching across {trip.segments.length} accommodation segments in {trip.destinations.join(" & ")}.</p>
        </div>

        <ol className="space-y-2">
          {STAGES.map((stage, i) => {
            const state = i < stageIdx || done ? "done" : i === stageIdx ? "active" : "pending";
            return (
              <li key={stage} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
                <span
                  className={
                    state === "done"
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-white"
                      : state === "active"
                      ? "h-5 w-5 animate-pulse rounded-full bg-slate-900"
                      : "h-5 w-5 rounded-full border border-slate-300"
                  }
                >
                  {state === "done" ? "✓" : ""}
                </span>
                <span className={state === "pending" ? "text-slate-400" : "text-slate-800"}>{stage}</span>
              </li>
            );
          })}
        </ol>

        {stageIdx >= 1 && (
          <div className="card">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Partial results</h2>
            <ul className="space-y-1 text-sm text-slate-600">
              {stageIdx >= 1 && <li>Neighbourhoods searched so far: {coverage.neighbourhoodsSearched.join(", ")}</li>}
              {stageIdx >= 2 && <li>{coverage.propertiesConsidered} properties identified</li>}
              {stageIdx >= 3 && <li>{coverage.roomOffersConsidered} room offers considered, {coverage.eliminatedByHardFilters} excluded by your constraints so far</li>}
              {stageIdx >= 4 && coverage.unverifiedInfo.length > 0 && <li>{coverage.unverifiedInfo.length} details still need verification</li>}
            </ul>
          </div>
        )}

        {done ? (
          <div className="flex justify-end border-t border-slate-200 pt-6">
            <button className="btn-primary" onClick={() => router.push(`/trips/${trip.id}/shortlist`)}>
              Review finalists
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400">No action required — you can also review early candidates while research continues.</p>
        )}
      </main>
    </>
  );
}
