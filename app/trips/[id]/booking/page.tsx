"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useTripStore } from "@/lib/store";
import { TripStepNav } from "@/components/TripStepNav";
import { Tag } from "@/components/Badges";
import { formatDateShort, formatMoney } from "@/lib/format";
import { scoreSegment, pickThreeFinalists } from "@/lib/engine/scoring";
import { BookingRecord } from "@/lib/types";

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const trip = useTripStore((s) => s.trips[id]);
  const recordBooking = useTripStore((s) => s.recordBooking);
  const [openForm, setOpenForm] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!trip) return [];
    return trip.segments.map((seg) => {
      const offers = scoreSegment(trip, seg);
      const selected = trip.shortlist.find((sl) => sl.segmentId === seg.id && (sl.status === "selected" || sl.status === "booked"));
      const offer = selected ? offers.find((o) => o.room.id === selected.roomId) : pickThreeFinalists(offers).bestOverall;
      const booking = trip.bookings.find((b) => b.segmentId === seg.id);
      return { seg, offer, booking };
    });
  }, [trip]);

  if (!trip) return <main className="flex-1 p-8 text-slate-500">Trip not found.</main>;

  return (
    <>
      <TripStepNav tripId={trip.id} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold">Final decision and booking</h1>
          <p className="mt-1 text-sm text-slate-500">Your booking checklist for this trip.</p>
        </div>

        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Confirm the room category, bathroom type, total price and cancellation policy before payment. Availability may have changed since the last
          check. This app does not book on your behalf — booking links open the provider or hotel&apos;s own site (affiliate relationships, if any,
          would be disclosed here).
        </div>

        <div className="space-y-4">
          {rows.map(({ seg, offer, booking }) => {
            if (!offer) {
              return (
                <div key={seg.id} className="card text-sm text-rose-600">
                  {seg.role}: no eligible hotel found — revisit constraints or the sequence page.
                </div>
              );
            }
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${offer.hotel.name} ${offer.room.name} booking`)}`;
            return (
              <div key={seg.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-medium">{seg.role}</h2>
                      <Tag tone="indigo">{seg.destination}</Tag>
                      {booking && <Tag tone="emerald">Booked</Tag>}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {offer.hotel.name} — {offer.room.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateShort(seg.startDate)} – {formatDateShort(seg.endDate)} · Expected price: {formatMoney(offer.totalPriceForSegment, trip.currency)} ·{" "}
                      Cancellation: {offer.room.cancellation}
                    </p>
                    {offer.needsVerification && offer.needsVerification.length > 0 && (
                      <p className="mt-1 text-xs text-amber-700">Outstanding verification: {offer.needsVerification.join(", ")}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs">
                      Open booking page
                    </a>
                    {!booking && (
                      <button className="btn-ghost text-xs" onClick={() => setOpenForm(openForm === seg.id ? null : seg.id)}>
                        Mark as booked
                      </button>
                    )}
                  </div>
                </div>

                {openForm === seg.id && !booking && (
                  <BookingForm
                    defaultPrice={offer.totalPriceForSegment}
                    currency={trip.currency}
                    onSubmit={(record) => {
                      recordBooking(trip.id, { ...record, segmentId: seg.id, hotelId: offer.hotel.id, roomId: offer.room.id });
                      setOpenForm(null);
                    }}
                  />
                )}

                {booking && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    Booked via {booking.bookingSource} · {formatMoney(booking.totalPrice, booking.currency)} · {booking.paymentStatus}
                    {booking.cancellationDeadline && ` · Cancel by ${booking.cancellationDeadline}`}
                    {booking.bookingReference && <span className="ml-1 text-slate-400">(reference hidden by default)</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}

function BookingForm({
  defaultPrice,
  currency,
  onSubmit,
}: {
  defaultPrice: number;
  currency: BookingRecord["currency"];
  onSubmit: (record: Omit<BookingRecord, "segmentId" | "hotelId" | "roomId">) => void;
}) {
  const [source, setSource] = useState("Booking.com");
  const [reference, setReference] = useState("");
  const [price, setPrice] = useState(defaultPrice);
  const [paymentStatus, setPaymentStatus] = useState<BookingRecord["paymentStatus"]>("deposit-paid");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-slate-200 p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <input className="input text-xs" placeholder="Booking source" value={source} onChange={(e) => setSource(e.target.value)} />
        <input className="input text-xs" placeholder="Booking reference" value={reference} onChange={(e) => setReference(e.target.value)} />
        <input type="number" className="input text-xs" placeholder="Total price" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        <input type="date" className="input text-xs" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select className="input text-xs" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as BookingRecord["paymentStatus"])}>
          <option value="unpaid">Unpaid</option>
          <option value="deposit-paid">Deposit paid</option>
          <option value="paid-in-full">Paid in full</option>
        </select>
        <input className="input text-xs" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="flex justify-end">
        <button
          className="btn-primary text-xs"
          onClick={() => onSubmit({ bookingSource: source, bookingReference: reference || undefined, totalPrice: price, currency, paymentStatus, cancellationDeadline: deadline || undefined, notes: notes || undefined })}
        >
          Save booking record
        </button>
      </div>
    </div>
  );
}
