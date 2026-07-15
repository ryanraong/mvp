"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useTripStore } from "@/lib/store";
import { TripStepNav } from "@/components/TripStepNav";
import { Tag } from "@/components/Badges";
import { BedType } from "@/lib/types";

export default function PreferencesPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const trip = useTripStore((s) => s.trips[id]);
  const updateConstraints = useTripStore((s) => s.updateConstraints);
  const addPreferenceFromText = useTripStore((s) => s.addPreferenceFromText);
  const setPreferenceAccepted = useTripStore((s) => s.setPreferenceAccepted);
  const removePreference = useTripStore((s) => s.removePreference);

  const [prefText, setPrefText] = useState("");

  if (!trip) return <main className="flex-1 p-8 text-slate-500">Trip not found.</main>;

  const c = trip.constraints;

  function handleInterpret() {
    if (!prefText.trim()) return;
    addPreferenceFromText(trip.id, prefText.trim());
    setPrefText("");
  }

  return (
    <>
      <TripStepNav tripId={trip.id} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold">Preferences and constraints</h1>
          <p className="mt-1 text-sm text-slate-500">
            Non-negotiables remove unsuitable rooms before comparison. Everything else is a weighted preference, not a hard filter.
          </p>
        </div>

        <section className="card">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Non-negotiables</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
            <Checkbox label="Private bathroom" checked={c.privateBathroom} onChange={(v) => updateConstraints(trip.id, { privateBathroom: v })} />
            <Checkbox label="Non-smoking room" checked={c.nonSmoking} onChange={(v) => updateConstraints(trip.id, { nonSmoking: v })} />
            <Checkbox label="Free cancellation" checked={c.freeCancellation} onChange={(v) => updateConstraints(trip.id, { freeCancellation: v })} />
            <Checkbox label="Lift access" checked={c.liftAccess} onChange={(v) => updateConstraints(trip.id, { liftAccess: v })} />
            <Checkbox label="Air conditioning" checked={c.airConditioning} onChange={(v) => updateConstraints(trip.id, { airConditioning: v })} />
            <Checkbox label="Laundry" checked={c.laundry} onChange={(v) => updateConstraints(trip.id, { laundry: v })} />
            <Checkbox label="Wheelchair accessibility" checked={c.accessibility} onChange={(v) => updateConstraints(trip.id, { accessibility: v })} />
            <Checkbox label="Breakfast included" checked={c.breakfast} onChange={(v) => updateConstraints(trip.id, { breakfast: v })} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-500">Bed preference</span>
              <select
                className="input"
                value={c.bedType}
                onChange={(e) => updateConstraints(trip.id, { bedType: e.target.value as BedType | "no-preference" })}
              >
                <option value="no-preference">No preference</option>
                <option value="twin">Twin</option>
                <option value="double">Double</option>
                <option value="queen">Queen</option>
                <option value="king">King</option>
                <option value="semi-double">Semi-double</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-500">Minimum room size (sqm)</span>
              <input
                type="number"
                className="input"
                value={c.minRoomSizeSqm ?? ""}
                placeholder="No minimum"
                onChange={(e) => updateConstraints(trip.id, { minRoomSizeSqm: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-slate-500">Max walking distance to transport (min)</span>
              <input
                type="number"
                className="input"
                value={c.maxWalkDistanceMinutes ?? ""}
                placeholder="No limit"
                onChange={(e) => updateConstraints(trip.id, { maxWalkDistanceMinutes: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </label>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-1 text-sm font-semibold text-slate-700">Experience preferences</h2>
          <p className="mb-3 text-xs text-slate-500">
            Describe the kind of hotel and neighbourhood you enjoy in normal language — we&apos;ll extract weighted themes, not hard filters.
          </p>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder='e.g. "We want somewhere chill and traditional, with a nice view"'
              value={prefText}
              onChange={(e) => setPrefText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInterpret()}
            />
            <button className="btn-secondary" onClick={handleInterpret}>
              Interpret
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {trip.preferences.length === 0 && <p className="text-xs text-slate-400">No preferences interpreted yet.</p>}
            {trip.preferences.map((p, i) => (
              <div key={`${p.theme}-${i}`} className={`rounded-lg border p-3 text-sm ${p.accepted ? "border-slate-200 bg-slate-50" : "border-slate-100 bg-white opacity-50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{p.theme}</span>
                      <Tag tone={p.category === "hotel" ? "indigo" : "emerald"}>{p.category}</Tag>
                      <span className="text-xs text-slate-400">weight {Math.round(p.weight * 100)}%</span>
                    </div>
                    <p className="mt-1 text-slate-600">We interpreted this as: {p.explanation}.</p>
                    <p className="mt-1 text-xs italic text-slate-400">&quot;{p.sourceText}&quot;</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button className="btn-ghost" onClick={() => setPreferenceAccepted(trip.id, i, !p.accepted)}>
                      {p.accepted ? "Remove" : "Restore"}
                    </button>
                    <button className="btn-ghost text-rose-600" onClick={() => removePreference(trip.id, i)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-between border-t border-slate-200 pt-6">
          <Link href={`/trips/${trip.id}/stay-plan`} className="btn-secondary">
            Back to stay plan
          </Link>
          <button className="btn-primary" onClick={() => router.push(`/trips/${trip.id}/research`)}>
            Research hotels
          </button>
        </div>
      </main>
    </>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
      {label}
    </label>
  );
}
