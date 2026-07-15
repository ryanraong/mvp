"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import Link from "next/link";
import { useTripStore } from "@/lib/store";
import { TripStepNav } from "@/components/TripStepNav";
import { ConfidenceBadge, Tag } from "@/components/Badges";
import { buildCoverageReport, buildConfidenceDimensions } from "@/lib/engine/coverage";

export default function CoveragePage() {
  const { id } = useParams<{ id: string }>();
  const trip = useTripStore((s) => s.trips[id]);
  const coverage = useMemo(() => (trip ? buildCoverageReport(trip) : null), [trip]);
  const dimensions = useMemo(() => (trip ? buildConfidenceDimensions(trip) : null), [trip]);

  if (!trip || !coverage || !dimensions) return <main className="flex-1 p-8 text-slate-500">Trip not found.</main>;

  return (
    <>
      <TripStepNav tripId={trip.id} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold">Coverage and confidence</h1>
          <p className="mt-1 text-sm text-slate-500">
            Evidence of how broadly we searched. This report does not claim to cover the entire market — only what was actually searched.
          </p>
        </div>

        <section className="card">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Search coverage</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <Stat label="Neighbourhoods searched" value={String(coverage.neighbourhoodsSearched.length)} />
            <Stat label="Properties considered" value={String(coverage.propertiesConsidered)} />
            <Stat label="Room offers examined" value={String(coverage.roomOffersConsidered)} />
            <Stat label="Sources used" value={String(coverage.sourcesSearched.length)} />
            <Stat label="Excluded by hard filters" value={String(coverage.eliminatedByHardFilters)} />
            <Stat label="Reached finalist stage" value={String(coverage.finalistCount)} />
          </dl>
          <div className="mt-3 flex flex-wrap gap-1">
            {coverage.neighbourhoodsSearched.map((n) => (
              <Tag key={n}>{n}</Tag>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Sources: {coverage.sourcesSearched.join(", ")}</p>
        </section>

        <section className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Main elimination reasons</h2>
          {coverage.mainEliminationReasons.length === 0 ? (
            <p className="text-sm text-slate-400">No offers were excluded by hard filters.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-4 text-sm text-slate-600">
              {coverage.mainEliminationReasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Material information not verified</h2>
          {coverage.unverifiedInfo.length === 0 ? (
            <p className="text-sm text-slate-400">Nothing outstanding — all shown details are confirmed.</p>
          ) : (
            <ul className="list-disc space-y-1 pl-4 text-sm text-slate-600">
              {coverage.unverifiedInfo.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Confidence dimensions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <DimensionBadge label="Property information" level={dimensions.propertyInformation} />
            <DimensionBadge label="Room information" level={dimensions.roomInformation} />
            <DimensionBadge label="Price" level={dimensions.price} />
            <DimensionBadge label="Cancellation" level={dimensions.cancellation} />
            <DimensionBadge label="Reviews" level={dimensions.reviews} />
            <DimensionBadge label="Transport" level={dimensions.transport} />
          </div>
        </section>

        <section className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Confidence by stay</h2>
          <div className="space-y-2">
            {trip.segments.map((seg) => (
              <div key={seg.id} className="flex items-center justify-between text-sm">
                <span>{seg.role}</span>
                {coverage.confidenceBySegment[seg.id] ? <ConfidenceBadge level={coverage.confidenceBySegment[seg.id]} /> : <span className="text-slate-400">No eligible candidates</span>}
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end border-t border-slate-200 pt-6">
          <Link href={`/trips/${trip.id}/sequence`} className="btn-primary">
            Return to recommendation
          </Link>
        </div>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-base font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function DimensionBadge({ label, level }: { label: string; level: "high" | "medium" | "low" }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-1">
        <ConfidenceBadge level={level} />
      </div>
    </div>
  );
}
