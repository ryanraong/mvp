"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useTripStore } from "@/lib/store";
import { TripStepNav } from "@/components/TripStepNav";
import { Tag } from "@/components/Badges";
import { parseMapsLink } from "@/lib/engine/mapsLink";
import { PlaceImportance, PlaceSource, SwitchingTolerance, TravelerType } from "@/lib/types";

const SUPPORTED_DESTINATIONS = ["Kyoto", "Osaka"];

export default function TripSetupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const trip = useTripStore((s) => s.trips[id]);
  const updateTrip = useTripStore((s) => s.updateTrip);
  const addPlace = useTripStore((s) => s.addPlace);
  const removePlace = useTripStore((s) => s.removePlace);
  const addImportedHotel = useTripStore((s) => s.addImportedHotel);
  const proposeSegmentsForTrip = useTripStore((s) => s.proposeSegmentsForTrip);

  const [placeInput, setPlaceInput] = useState("");
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [placeDestination, setPlaceDestination] = useState("");
  const [placeImportance, setPlaceImportance] = useState<PlaceImportance>("interested");
  const [hotelInput, setHotelInput] = useState("");
  const [hotelDestination, setHotelDestination] = useState("");
  const [newDestination, setNewDestination] = useState("");

  if (!trip) {
    return <main className="flex-1 p-8 text-slate-500">Trip not found.</main>;
  }

  const missing: string[] = [];
  if (trip.destinations.length === 0) missing.push("At least one destination");
  if (!trip.arrivalDate) missing.push("Arrival date");
  if (!trip.departureDate) missing.push("Departure date");
  if (trip.travelerCount < 1) missing.push("Traveller count");
  const dateOrderInvalid = trip.arrivalDate && trip.departureDate && trip.departureDate < trip.arrivalDate;
  const canBuild = missing.length === 0 && !dateOrderInvalid;

  const unsupportedDestinations = trip.destinations.filter((d) => !SUPPORTED_DESTINATIONS.includes(d));

  function handleAddPlace() {
    setPlaceError(null);
    const parsed = parseMapsLink(placeInput);
    if ("error" in parsed) {
      setPlaceError(parsed.error);
      return;
    }
    if (!placeDestination) {
      setPlaceError("Choose which destination this place belongs to.");
      return;
    }
    const source: PlaceSource = /^https?:\/\//i.test(placeInput.trim()) ? "maps-link" : "search";
    addPlace(trip.id, { name: parsed.name, destination: placeDestination, importance: placeImportance, source, lat: 0, lng: 0 });
    setPlaceInput("");
  }

  function handleAddHotel() {
    if (!hotelInput.trim() || !hotelDestination) return;
    addImportedHotel(trip.id, hotelInput.trim(), undefined, hotelDestination);
    setHotelInput("");
  }

  function handleAddDestination() {
    const d = newDestination.trim();
    if (!d || trip.destinations.includes(d)) return;
    updateTrip(trip.id, { destinations: [...trip.destinations, d] });
    setNewDestination("");
  }

  function handleBuild() {
    proposeSegmentsForTrip(trip.id);
    router.push(`/trips/${trip.id}/stay-plan`);
  }

  return (
    <>
      <TripStepNav tripId={trip.id} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8">
        <div>
          <input
            className="w-full border-b border-transparent bg-transparent text-2xl font-semibold outline-none focus:border-slate-300"
            value={trip.name}
            onChange={(e) => updateTrip(trip.id, { name: e.target.value })}
          />
          <p className="mt-1 text-sm text-slate-500">Collect enough information to propose an accommodation structure for this trip.</p>
        </div>

        {missing.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Missing before you can build the trip: {missing.join(", ")}.
          </div>
        )}
        {dateOrderInvalid && (
          <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">Departure date cannot be before the arrival date.</div>
        )}

        <Section title="Dates and travellers">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Arrival date">
              <input type="date" className="input" value={trip.arrivalDate} onChange={(e) => updateTrip(trip.id, { arrivalDate: e.target.value })} />
            </Field>
            <Field label="Departure date">
              <input type="date" className="input" value={trip.departureDate} onChange={(e) => updateTrip(trip.id, { departureDate: e.target.value })} />
            </Field>
            <Field label="Number of travellers">
              <input
                type="number"
                min={1}
                className="input"
                value={trip.travelerCount}
                onChange={(e) => updateTrip(trip.id, { travelerCount: Number(e.target.value) })}
              />
            </Field>
            <Field label="Traveller type">
              <select className="input" value={trip.travelerType} onChange={(e) => updateTrip(trip.id, { travelerType: e.target.value as TravelerType })}>
                <option value="couple">Couple</option>
                <option value="family">Family</option>
                <option value="friends">Friends</option>
                <option value="solo">Solo</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Destinations">
          <p className="mb-2 text-xs text-slate-500">This MVP demo has full research coverage for Kyoto &amp; Osaka only.</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {trip.destinations.map((d) => (
              <span key={d} className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-sm">
                {d}
                <button className="text-slate-400 hover:text-rose-600" onClick={() => updateTrip(trip.id, { destinations: trip.destinations.filter((x) => x !== d) })}>
                  ×
                </button>
              </span>
            ))}
          </div>
          {unsupportedDestinations.length > 0 && (
            <p className="mb-2 text-xs text-amber-700">
              No detailed research data for: {unsupportedDestinations.join(", ")}. These will show as a single undifferentiated stay.
            </p>
          )}
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Add a destination (e.g. Kyoto)"
              value={newDestination}
              onChange={(e) => setNewDestination(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddDestination()}
            />
            <button className="btn-secondary" onClick={handleAddDestination}>
              Add
            </button>
          </div>
        </Section>

        <Section title="Arrival and departure">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Where do you arrive?">
              <input className="input" value={trip.arrivalPoint} onChange={(e) => updateTrip(trip.id, { arrivalPoint: e.target.value })} placeholder="e.g. Kansai International Airport (KIX)" />
            </Field>
            <Field label="Where do you depart?">
              <input className="input" value={trip.departurePoint} onChange={(e) => updateTrip(trip.id, { departurePoint: e.target.value })} placeholder="e.g. Kansai International Airport (KIX)" />
            </Field>
          </div>
        </Section>

        <Section title="Budget">
          <p className="mb-3 text-xs text-slate-500">
            Your preferred budget is your normal nightly spend. Your maximum budget is what you&apos;d stretch to for an exceptional stay — a hotel
            above preferred but below maximum can still appear, with an explanation of why the extra spend may be worthwhile. Hotels above the maximum are excluded.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <Field label={`Preferred nightly (${trip.currency})`}>
              <input
                type="number"
                className="input"
                value={trip.budget.preferredNightly}
                onChange={(e) => updateTrip(trip.id, { budget: { ...trip.budget, preferredNightly: Number(e.target.value) } })}
              />
            </Field>
            <Field label={`Maximum nightly (${trip.currency})`}>
              <input
                type="number"
                className="input"
                value={trip.budget.maxNightly}
                onChange={(e) => updateTrip(trip.id, { budget: { ...trip.budget, maxNightly: Number(e.target.value) } })}
              />
            </Field>
            <Field label="Currency">
              <select className="input" value={trip.currency} onChange={(e) => updateTrip(trip.id, { currency: e.target.value as typeof trip.currency })}>
                <option value="SGD">SGD</option>
                <option value="JPY">JPY</option>
                <option value="USD">USD</option>
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Initial travel style">
          <Field label="How do you feel about changing hotels?">
            <select
              className="input"
              value={trip.switchingTolerance}
              onChange={(e) => updateTrip(trip.id, { switchingTolerance: e.target.value as SwitchingTolerance })}
            >
              <option value="frequent">Comfortable changing frequently</option>
              <option value="easy-only">Comfortable when the move is easy</option>
              <option value="few-changes">Prefer few changes</option>
            </select>
          </Field>
        </Section>

        <Section title="Planned places (optional)">
          <div className="mb-3 flex flex-wrap gap-2">
            {trip.places.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs">
                {p.name} <Tag tone={p.importance === "must-visit" ? "rose" : p.importance === "interested" ? "amber" : "slate"}>{p.importance}</Tag>
                {p.isDuplicate && <Tag tone="amber">duplicate</Tag>}
                <button className="text-slate-400 hover:text-rose-600" onClick={() => removePlace(trip.id, p.id)}>
                  ×
                </button>
              </span>
            ))}
            {trip.places.length === 0 && <span className="text-xs text-slate-400">No places added yet — a trip can proceed without them.</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="input flex-1 min-w-[200px]"
              placeholder="Place name or Google Maps link"
              value={placeInput}
              onChange={(e) => setPlaceInput(e.target.value)}
            />
            <select className="input w-32" value={placeDestination} onChange={(e) => setPlaceDestination(e.target.value)}>
              <option value="">Destination…</option>
              {trip.destinations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select className="input w-36" value={placeImportance} onChange={(e) => setPlaceImportance(e.target.value as PlaceImportance)}>
              <option value="must-visit">Must visit</option>
              <option value="interested">Interested</option>
              <option value="optional">Optional</option>
            </select>
            <button className="btn-secondary" onClick={handleAddPlace}>
              Add
            </button>
          </div>
          {placeError && <p className="mt-1 text-xs text-rose-600">{placeError}</p>}
        </Section>

        <Section title="Existing hotel candidates (optional)">
          <p className="mb-2 text-xs text-slate-500">
            Hotels you&apos;ve already found are labelled &quot;user candidate&quot; and assessed against the broader market — they don&apos;t
            automatically score higher.
          </p>
          <div className="mb-3 space-y-2">
            {trip.importedHotels.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span>
                  {h.rawName} <span className="text-slate-400">· {h.destination}</span>
                </span>
                <Tag tone={h.status === "matched" ? "emerald" : h.status === "needs-confirmation" ? "amber" : "rose"}>
                  {h.status === "matched" ? "Matched" : h.status === "needs-confirmation" ? "Needs confirmation" : "Unmatched — please confirm"}
                </Tag>
              </div>
            ))}
            {trip.importedHotels.length === 0 && <span className="text-xs text-slate-400">None added yet.</span>}
          </div>
          <div className="flex flex-wrap gap-2">
            <input className="input flex-1 min-w-[200px]" placeholder="Hotel name or link" value={hotelInput} onChange={(e) => setHotelInput(e.target.value)} />
            <select className="input w-32" value={hotelDestination} onChange={(e) => setHotelDestination(e.target.value)}>
              <option value="">Destination…</option>
              {trip.destinations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button className="btn-secondary" onClick={handleAddHotel}>
              Add
            </button>
          </div>
        </Section>

        <div className="flex justify-between border-t border-slate-200 pt-6">
          <Link href="/" className="btn-secondary">
            Save and finish later
          </Link>
          <button disabled={!canBuild} onClick={handleBuild} className="btn-primary disabled:cursor-not-allowed disabled:opacity-40">
            Build my trip
          </button>
        </div>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
