"use client";

import { useParams, useRouter } from "next/navigation";
import { useTripStore } from "@/lib/store";
import { TripStepNav } from "@/components/TripStepNav";
import { Tag } from "@/components/Badges";
import { nightsBetween } from "@/lib/format";
import { SegmentRole } from "@/lib/types";

const ROLES: SegmentRole[] = ["Arrival base", "Day-trip hub", "Traditional experience", "Relaxed stay", "Nightlife base", "Departure base"];

export default function StayPlanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const trip = useTripStore((s) => s.trips[id]);
  const updateSegment = useTripStore((s) => s.updateSegment);
  const mergeWithNextSegment = useTripStore((s) => s.mergeWithNextSegment);
  const splitSegment = useTripStore((s) => s.splitSegment);
  const reorderSegment = useTripStore((s) => s.reorderSegment);
  const confirmSegments = useTripStore((s) => s.confirmSegments);

  if (!trip) return <main className="flex-1 p-8 text-slate-500">Trip not found.</main>;

  if (trip.segments.length === 0) {
    return (
      <>
        <TripStepNav tripId={trip.id} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 text-slate-500">
          No stay plan yet.{" "}
          <a className="underline" href={`/trips/${trip.id}`}>
            Go back to trip setup
          </a>{" "}
          and click &quot;Build my trip&quot;.
        </main>
      </>
    );
  }

  const totalNights = nightsBetween(trip.arrivalDate, trip.departureDate);

  return (
    <>
      <TripStepNav tripId={trip.id} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold">Stay plan review</h1>
          <p className="mt-1 text-sm text-slate-500">
            We propose {trip.segments.length} hotel stay{trip.segments.length === 1 ? "" : "s"} across {totalNights} nights. Confirm this plan, or merge,
            split, reorder and edit any stay first.
          </p>
        </div>

        <ol className="space-y-4">
          {trip.segments.map((seg, i) => {
            const nights = nightsBetween(seg.startDate, seg.endDate);
            const nextSeg = trip.segments[i + 1];
            const canMergeWithNext = !!nextSeg && nextSeg.destination === seg.destination;
            return (
              <li key={seg.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">{i + 1}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <select
                          className="rounded border border-slate-200 bg-transparent text-sm font-semibold"
                          value={seg.role}
                          onChange={(e) => updateSegment(trip.id, seg.id, { role: e.target.value as SegmentRole })}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        <Tag tone="indigo">{seg.destination}</Tag>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <input
                          type="date"
                          className="rounded border border-slate-200 px-1 py-0.5"
                          value={seg.startDate}
                          onChange={(e) => updateSegment(trip.id, seg.id, { startDate: e.target.value })}
                        />
                        <span>–</span>
                        <input
                          type="date"
                          className="rounded border border-slate-200 px-1 py-0.5"
                          value={seg.endDate}
                          onChange={(e) => updateSegment(trip.id, seg.id, { endDate: e.target.value })}
                        />
                        <span>({nights} night{nights === 1 ? "" : "s"})</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div className="flex gap-1">
                      <button className="btn-ghost" disabled={i === 0} onClick={() => reorderSegment(trip.id, seg.id, "up")} title="Move earlier">
                        ↑
                      </button>
                      <button
                        className="btn-ghost"
                        disabled={i === trip.segments.length - 1}
                        onClick={() => reorderSegment(trip.id, seg.id, "down")}
                        title="Move later"
                      >
                        ↓
                      </button>
                    </div>
                    <div className="flex gap-1">
                      {canMergeWithNext && (
                        <button className="btn-ghost" onClick={() => mergeWithNextSegment(trip.id, seg.id)}>
                          Merge with next
                        </button>
                      )}
                      {nights >= 2 && (
                        <button className="btn-ghost" onClick={() => splitSegment(trip.id, seg.id)}>
                          Split
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-sm text-slate-600">{seg.rationale}</p>

                {seg.oneNightWarning && <p className="mt-2 text-xs font-medium text-amber-700">⚠ {seg.oneNightWarning}</p>}

                {seg.suggestedNeighbourhoods.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {seg.suggestedNeighbourhoods.map((n) => (
                      <Tag key={n}>{n}</Tag>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>

        <div className="flex justify-end border-t border-slate-200 pt-6">
          <button
            className="btn-primary"
            onClick={() => {
              confirmSegments(trip.id);
              router.push(`/trips/${trip.id}/preferences`);
            }}
          >
            Confirm stay plan
          </button>
        </div>
      </main>
    </>
  );
}
