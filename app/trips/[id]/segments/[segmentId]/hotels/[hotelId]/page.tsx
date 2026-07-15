"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import Link from "next/link";
import { useTripStore } from "@/lib/store";
import { TripStepNav } from "@/components/TripStepNav";
import { ConfidenceBadge, PriceConfidenceBadge, Tag } from "@/components/Badges";
import { formatMoney } from "@/lib/format";
import { scoreSegment, WEIGHTS } from "@/lib/engine/scoring";
import { roomsForHotel } from "@/lib/data/hotels";

const SUBSCORE_LABEL: Record<keyof typeof WEIGHTS, string> = {
  roomFit: "Room fit",
  price: "Price & value",
  transport: "Itinerary & transport",
  neighbourhood: "Neighbourhood fit",
  experience: "Experience fit",
  review: "Review quality & risk",
  flexibility: "Booking flexibility",
};

export default function HotelDetailPage() {
  const { id, segmentId, hotelId } = useParams<{ id: string; segmentId: string; hotelId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const trip = useTripStore((s) => s.trips[id]);
  const upsertShortlistItem = useTripStore((s) => s.upsertShortlistItem);

  const segment = trip?.segments.find((s) => s.id === segmentId);
  const offers = useMemo(() => (trip && segment ? scoreSegment(trip, segment) : []), [trip, segment]);
  const rooms = roomsForHotel(hotelId);
  const roomParam = searchParams.get("room");
  const activeRoomId = roomParam ?? rooms[0]?.id;
  const offer = offers.find((o) => o.room.id === activeRoomId);
  const rankedEligible = offers.filter((o) => !o.excluded);
  const rank = rankedEligible.findIndex((o) => o.room.id === activeRoomId);
  const runnerUp = rank === 0 ? rankedEligible[1] : rankedEligible[0];

  if (!trip || !segment || !offer) return <main className="flex-1 p-8 text-slate-500">Hotel or room not found for this stay.</main>;

  const { hotel, room, review, neighbourhood } = offer;

  function switchRoom(roomId: string) {
    router.push(`/trips/${trip.id}/segments/${segment!.id}/hotels/${hotel.id}?room=${roomId}`);
  }

  const relevantPlaces = trip.places.filter((p) => p.destination === segment.destination).sort((a) => (a.importance === "must-visit" ? -1 : 1));

  return (
    <>
      <TripStepNav tripId={trip.id} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{hotel.name}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {hotel.neighbourhood}, {hotel.destination} {hotel.isUserCandidate && <Tag tone="amber">user candidate</Tag>}
            </p>
          </div>
          <ConfidenceBadge level={offer.confidence} />
        </div>

        {offer.excluded && (
          <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
            This room is excluded from recommendation: {offer.excluded.reason} (hard constraint: {offer.excluded.hardConstraint}).
          </div>
        )}

        <section className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Why it fits this stay</h2>
          <ul className="space-y-1 text-sm">
            {offer.topFactors.map((f) => (
              <li key={f}>
                <span className="font-medium">{SUBSCORE_LABEL[f as keyof typeof WEIGHTS]}</span> — scored {Math.round(offer.subscores[f as keyof typeof WEIGHTS] * 100)}/100,
                weighted {Math.round(WEIGHTS[f as keyof typeof WEIGHTS] * 100)}% of the overall score.
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Room details</h2>
            {rooms.length > 1 && (
              <select className="input w-auto text-xs" value={activeRoomId} onChange={(e) => switchRoom(e.target.value)}>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <Detail label="Room name" value={room.name} />
            <Detail label="Size" value={room.sizeSqm ? `${room.sizeSqm} sqm` : "Unknown"} warn={room.sizeSqm === null} />
            <Detail label="Bed type" value={room.bedType} warn={room.bedType === "semi-double"} />
            <Detail label="Occupancy" value={`${room.occupancy} guests`} />
            <Detail label="Bathroom" value={room.bathroom} warn={room.bathroom === "shared"} />
            <Detail label="Smoking" value="Non-smoking" />
            <Detail label="View" value={room.view ?? "Not specified"} />
            <Detail label="Breakfast" value={room.breakfastIncluded ? "Included" : "Not included"} />
            <Detail label="Cancellation" value={room.cancellation === "free" ? `Free until ${room.cancellationDeadline ?? "deadline shown at booking"}` : room.cancellation} />
            <Detail label="Taxes" value={room.taxesIncluded ? "Included" : "Not included"} />
            <Detail label="Prepayment" value={room.prepaymentRequired ? "Required" : "Not required"} />
            <Detail label="Total price for stay" value={formatMoney(offer.totalPriceForSegment, trip.currency)} />
          </dl>
          {hotel.mixedBathroomWarning && (
            <p className="mt-2 text-xs font-medium text-amber-700">⚠ This property mixes private-bath and shared-bath room categories — this is the {room.bathroom} option.</p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <PriceConfidenceBadge label={room.priceConfidence} />
            <span className="text-xs text-slate-400">
              Source: {room.priceSource} · Retrieved {new Date(room.retrievedAt).toLocaleString("en-SG")}
            </span>
          </div>
          {offer.needsVerification && offer.needsVerification.length > 0 && (
            <p className="mt-2 text-xs text-amber-700">Needs verification: {offer.needsVerification.join(", ")}.</p>
          )}
        </section>

        <section className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Review themes</h2>
          <p className="mb-2 text-xs text-slate-500">
            {review.recency} · Average {review.avgScore.toFixed(1)}/5 across {review.reviewCount} reviews (supporting information, not the primary conclusion) ·{" "}
            {review.travelerTypeRelevance}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase text-emerald-700">Recurring strengths</h3>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
                {review.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase text-rose-700">Recurring concerns</h3>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
                {review.concerns.length > 0 ? review.concerns.map((c) => <li key={c}>{c}</li>) : <li className="text-slate-400">None recurring</li>}
              </ul>
            </div>
          </div>
          {review.roomSpecificNotes && <p className="mt-2 text-xs text-amber-700">Room-specific note: {review.roomSpecificNotes}</p>}
          {review.isolatedComplaints.length > 0 && (
            <p className="mt-2 text-xs text-slate-400">Isolated complaints (not recurring): {review.isolatedComplaints.join(" ")}</p>
          )}
          {review.unverifiedAnecdotes.length > 0 && (
            <p className="mt-1 text-xs text-slate-400">Unverified anecdotes: {review.unverifiedAnecdotes.join(" ")}</p>
          )}
        </section>

        <section className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Neighbourhood — {neighbourhood.name}</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <Detail label="Daytime" value={neighbourhood.daytimeAtmosphere} />
            <Detail label="Evening" value={neighbourhood.eveningAtmosphere} />
            <Detail label="Food & cafés" value={neighbourhood.foodAndCafeAccess} />
            <Detail label="Tourist intensity" value={neighbourhood.touristIntensity} />
            <Detail label="Quietness" value={neighbourhood.quietness} />
            <Detail label="Walkability" value={neighbourhood.walkability} />
          </dl>
          <p className="mt-2 text-xs text-slate-500">Transport connections: {neighbourhood.transportConnections.join(", ")}</p>
        </section>

        <section className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Transport</h2>
          <ul className="space-y-1 text-sm">
            <li>
              From arrival point: {hotel.fromArrivalPoint.minutes} min via {hotel.fromArrivalPoint.mode} ({hotel.fromArrivalPoint.transfers} transfer
              {hotel.fromArrivalPoint.transfers === 1 ? "" : "s"}, {hotel.fromArrivalPoint.luggageDifficulty} with luggage)
            </li>
            <li>
              To departure point: {hotel.toDeparturePoint.minutes} min via {hotel.toDeparturePoint.mode} ({hotel.toDeparturePoint.luggageDifficulty} with
              luggage)
            </li>
            {relevantPlaces.map((p) => {
              const est = hotel.toPlaces[p.id];
              if (!est) return null;
              return (
                <li key={p.id}>
                  To {p.name} ({p.importance}): {est.minutes} min, {est.walkingBurden} walking burden
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Risks and unknowns</h2>
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {offer.confidenceReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Sources</h2>
          <div className="flex flex-wrap gap-2">
            {hotel.sources.map((src) => (
              <Tag key={src}>{src}</Tag>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-6">
          <div className="flex gap-2">
            <button
              className="btn-secondary"
              onClick={() => router.push(`/trips/${trip.id}/segments/${segment.id}`)}
            >
              Back to shortlist
            </button>
            {runnerUp && (
              <Link href={`/trips/${trip.id}/segments/${segment.id}/compare?rooms=${room.id},${runnerUp.room.id}`} className="btn-secondary">
                Compare with runner-up
              </Link>
            )}
          </div>
          <button
            className="btn-primary"
            onClick={() => upsertShortlistItem(trip.id, { segmentId: segment.id, hotelId: hotel.id, roomId: room.id, status: "finalist" })}
          >
            Add to shortlist
          </button>
        </div>
      </main>
    </>
  );
}

function Detail({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className={warn ? "font-medium text-amber-700" : "text-slate-700"}>{value}</dd>
    </div>
  );
}
