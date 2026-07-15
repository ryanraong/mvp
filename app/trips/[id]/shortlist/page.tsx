"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useTripStore } from "@/lib/store";
import { TripStepNav } from "@/components/TripStepNav";
import { ConfidenceBadge, Tag } from "@/components/Badges";
import { formatDateShort, formatMoney, nightsBetween } from "@/lib/format";
import { scoreSegment, pickThreeFinalists } from "@/lib/engine/scoring";

export default function ShortlistOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const trip = useTripStore((s) => s.trips[id]);

  if (!trip) return <main className="flex-1 p-8 text-slate-500">Trip not found.</main>;

  return (
    <>
      <TripStepNav tripId={trip.id} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-4 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold">Stay shortlists</h1>
          <p className="mt-1 text-sm text-slate-500">Three decision-ready finalists per stay. Open a stay to compare rooms in detail.</p>
        </div>

        <div className="space-y-3">
          {trip.segments.map((seg) => {
            const nights = nightsBetween(seg.startDate, seg.endDate);
            const offers = scoreSegment(trip, seg);
            const { bestOverall } = pickThreeFinalists(offers);
            const budgetAllocation = trip.budget.preferredNightly * nights;
            return (
              <Link
                key={seg.id}
                href={`/trips/${trip.id}/segments/${seg.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-medium">{seg.role}</h2>
                      <Tag tone="indigo">{seg.destination}</Tag>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDateShort(seg.startDate)} – {formatDateShort(seg.endDate)} ({nights} nights) · Budget allocation ≈ {formatMoney(budgetAllocation, trip.currency)}
                    </p>
                    {bestOverall ? (
                      <p className="mt-2 text-sm text-slate-700">
                        Leading pick: <span className="font-medium">{bestOverall.hotel.name}</span>, {bestOverall.room.name} —{" "}
                        {formatMoney(bestOverall.totalPriceForSegment, trip.currency)} total
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-rose-600">No candidates currently pass your constraints for this stay.</p>
                    )}
                  </div>
                  {bestOverall && <ConfidenceBadge level={bestOverall.confidence} />}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="flex justify-end border-t border-slate-200 pt-6">
          <Link href={`/trips/${trip.id}/sequence`} className="btn-primary">
            Optimise full sequence
          </Link>
        </div>
      </main>
    </>
  );
}
