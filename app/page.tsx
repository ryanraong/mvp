"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useTripStore } from "@/lib/store";
import { formatDateShort } from "@/lib/format";
import { Tag } from "@/components/Badges";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  "segments-proposed": "Stay plan proposed",
  researching: "Researching",
  shortlisted: "Shortlisting",
  sequenced: "Sequence chosen",
  booking: "Ready to book",
  booked: "Booked",
};

export default function Dashboard() {
  const tripOrder = useTripStore((s) => s.tripOrder);
  const tripsById = useTripStore((s) => s.trips);
  const trips = useMemo(() => tripOrder.map((id) => tripsById[id]).filter(Boolean), [tripOrder, tripsById]);
  const createTrip = useTripStore((s) => s.createTrip);
  const router = useRouter();

  function handleCreate() {
    const id = createTrip({ name: "New trip" });
    router.push(`/trips/${id}`);
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your trips</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tell us where you&apos;re going, what matters to you, and the places you may visit — we&apos;ll research hotels, compare rooms,
            optimise the sequence, and explain why the recommendation fits.
          </p>
        </div>
        <button onClick={handleCreate} className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
          Create trip
        </button>
      </div>

      {trips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Start with your destinations and dates. You can add hotels or places later.
        </div>
      ) : (
        <ul className="space-y-3">
          {trips.map((trip) => {
            const unresolvedSegments = trip.segments.filter((seg) => !seg.shortlistedRoomId).length;
            return (
              <li key={trip.id}>
                <Link
                  href={`/trips/${trip.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-medium">{trip.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {trip.arrivalDate ? formatDateShort(trip.arrivalDate) : "No dates yet"}
                        {trip.departureDate ? ` – ${formatDateShort(trip.departureDate)}` : ""}
                        {trip.destinations.length > 0 ? ` · ${trip.destinations.join(", ")}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Tag tone="indigo">{STATUS_LABEL[trip.status] ?? trip.status}</Tag>
                      {trip.segments.length > 0 && (
                        <span className="text-xs text-slate-500">
                          {unresolvedSegments > 0 ? `${unresolvedSegments} stay${unresolvedSegments === 1 ? "" : "s"} undecided` : "All stays decided"}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
