"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useTripStore } from "@/lib/store";
import { TripStepNav } from "@/components/TripStepNav";
import { ConfidenceBadge, PriceConfidenceBadge, Tag } from "@/components/Badges";
import { formatDateShort, formatMoney, nightsBetween } from "@/lib/format";
import { scoreSegment, pickThreeFinalists, WEIGHTS } from "@/lib/engine/scoring";
import { ScoredOffer } from "@/lib/types";

const SUBSCORE_LABEL: Record<keyof typeof WEIGHTS, string> = {
  roomFit: "Room fit",
  price: "Price & value",
  transport: "Itinerary & transport",
  neighbourhood: "Neighbourhood fit",
  experience: "Experience fit",
  review: "Review quality",
  flexibility: "Booking flexibility",
};

function topSubscore(offer: ScoredOffer): keyof typeof WEIGHTS {
  return (Object.entries(offer.subscores) as [keyof typeof WEIGHTS, number][]).sort((a, b) => b[1] * WEIGHTS[b[0]] - a[1] * WEIGHTS[a[0]])[0][0];
}
function lowSubscore(offer: ScoredOffer): keyof typeof WEIGHTS {
  return (Object.entries(offer.subscores) as [keyof typeof WEIGHTS, number][]).sort((a, b) => a[1] * WEIGHTS[a[0]] - b[1] * WEIGHTS[b[0]])[0][0];
}

export default function SegmentShortlistPage() {
  const { id, segmentId } = useParams<{ id: string; segmentId: string }>();
  const router = useRouter();
  const trip = useTripStore((s) => s.trips[id]);
  const upsertShortlistItem = useTripStore((s) => s.upsertShortlistItem);
  const [showAll, setShowAll] = useState(false);

  const segment = trip?.segments.find((s) => s.id === segmentId);
  const offers = useMemo(() => (trip && segment ? scoreSegment(trip, segment) : []), [trip, segment]);
  const finalists = useMemo(() => pickThreeFinalists(offers), [offers]);

  if (!trip || !segment) return <main className="flex-1 p-8 text-slate-500">Stay not found.</main>;

  const nights = nightsBetween(segment.startDate, segment.endDate);
  const cards = [
    { key: "bestOverall" as const, label: "Recommended", offer: finalists.bestOverall },
    { key: "bestValue" as const, label: "Best value", offer: finalists.bestValue },
    { key: "bestExperience" as const, label: "Best experience", offer: finalists.bestExperience },
  ].filter((c, i, arr) => c.offer && arr.findIndex((x) => x.offer?.room.id === c.offer?.room.id) === i);

  function statusFor(offer: ScoredOffer) {
    return trip!.shortlist.find((sl) => sl.segmentId === segment!.id && sl.roomId === offer.room.id)?.status;
  }

  function handleSave(offer: ScoredOffer) {
    upsertShortlistItem(trip!.id, { segmentId: segment!.id, hotelId: offer.hotel.id, roomId: offer.room.id, status: "finalist" });
  }
  function handleReject(offer: ScoredOffer) {
    upsertShortlistItem(trip!.id, { segmentId: segment!.id, hotelId: offer.hotel.id, roomId: offer.room.id, status: "rejected" });
  }

  const compareIds = cards.map((c) => c.offer!.room.id).join(",");

  return (
    <>
      <TripStepNav tripId={trip.id} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{segment.role}</h1>
              <Tag tone="indigo">{segment.destination}</Tag>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {formatDateShort(segment.startDate)} – {formatDateShort(segment.endDate)} ({nights} nights) · Budget allocation ≈{" "}
              {formatMoney(trip.budget.preferredNightly * nights, trip.currency)}
            </p>
          </div>
          {finalists.bestOverall && <ConfidenceBadge level={finalists.bestOverall.confidence} />}
        </div>

        {cards.length === 0 ? (
          <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
            No candidates pass your current hard constraints for this stay. Try relaxing a constraint on the Preferences page.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {cards.map(({ key, label, offer }) => {
              if (!offer) return null;
              const status = statusFor(offer);
              const advantage = SUBSCORE_LABEL[topSubscore(offer)];
              const disadvantage = SUBSCORE_LABEL[lowSubscore(offer)];
              return (
                <div key={key} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
                  <Tag tone={key === "bestOverall" ? "emerald" : "indigo"}>{label}</Tag>
                  <h3 className="mt-2 font-medium">{offer.hotel.name}</h3>
                  <p className="text-sm text-slate-600">{offer.room.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {offer.room.sizeSqm ? `${offer.room.sizeSqm} sqm` : "Size unconfirmed"} · {offer.room.bedType} · {offer.room.bathroom} bath
                  </p>
                  <p className="mt-2 text-lg font-semibold">{formatMoney(offer.totalPriceForSegment, trip.currency)}</p>
                  <div className="mt-1">
                    <PriceConfidenceBadge label={offer.room.priceConfidence} />
                  </div>
                  {offer.hotel.mixedBathroomWarning && <p className="mt-1 text-xs text-amber-700">⚠ This property mixes private/shared bath rooms — check the room name.</p>}
                  {offer.room.bedType === "semi-double" && <p className="mt-1 text-xs text-amber-700">⚠ Semi-double bed — narrower than typical for two.</p>}
                  {offer.room.sizeSqm === null && <p className="mt-1 text-xs text-amber-700">⚠ Room size unknown</p>}

                  <div className="mt-3 space-y-1 text-xs">
                    <p>
                      <span className="font-medium text-emerald-700">Main advantage:</span> {advantage}
                    </p>
                    <p>
                      <span className="font-medium text-rose-700">Main concern:</span> {disadvantage}
                    </p>
                  </div>

                  <div className="mt-3 text-xs text-slate-400">
                    Confidence: {offer.confidenceReasons[0]}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs">
                    <Link href={`/trips/${trip.id}/segments/${segment.id}/hotels/${offer.hotel.id}?room=${offer.room.id}`} className="btn-ghost">
                      View full analysis
                    </Link>
                    <button className="btn-ghost" onClick={() => handleSave(offer)} disabled={status === "finalist"}>
                      {status === "finalist" ? "Saved ✓" : "Save"}
                    </button>
                    <button className="btn-ghost text-rose-600" onClick={() => handleReject(offer)} disabled={status === "rejected"}>
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {cards.length > 0 && (
          <div className="flex justify-center">
            <Link href={`/trips/${trip.id}/segments/${segment.id}/compare?rooms=${compareIds}`} className="btn-secondary">
              Compare these three
            </Link>
          </div>
        )}

        <div>
          <button className="text-sm text-slate-500 underline" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Hide" : "See"} all considered hotels ({offers.length} room offers)
          </button>
          {showAll && (
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Hotel</th>
                    <th className="px-3 py-2">Room</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((o) => (
                    <tr key={o.room.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        {o.hotel.name} {o.hotel.isUserCandidate && <Tag tone="amber">user candidate</Tag>}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{o.room.name}</td>
                      <td className="px-3 py-2">{formatMoney(o.totalPriceForSegment, trip.currency)}</td>
                      <td className="px-3 py-2">{o.excluded ? "—" : Math.round(o.score * 100)}</td>
                      <td className="px-3 py-2 text-xs">
                        {o.excluded ? <span className="text-rose-600">Excluded: {o.excluded.reason}</span> : <ConfidenceBadge level={o.confidence} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-between border-t border-slate-200 pt-6">
          <button className="btn-secondary" onClick={() => router.push(`/trips/${trip.id}/shortlist`)}>
            Back to all stays
          </button>
        </div>
      </main>
    </>
  );
}
