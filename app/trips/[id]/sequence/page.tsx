"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTripStore } from "@/lib/store";
import { TripStepNav } from "@/components/TripStepNav";
import { Tag } from "@/components/Badges";
import { formatDateShort, formatMoney } from "@/lib/format";
import { buildScenarios, buildMoveAnalyses } from "@/lib/engine/sequence";
import { scoreSegment } from "@/lib/engine/scoring";
import { Scenario, ScenarioKind } from "@/lib/types";
import clsx from "clsx";

const SCENARIO_TONE: Record<ScenarioKind, "emerald" | "indigo" | "amber" | "rose"> = {
  "best-overall": "emerald",
  "fewer-changes": "indigo",
  "lower-cost": "amber",
  "best-experience": "rose",
};

export default function SequencePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const trip = useTripStore((s) => s.trips[id]);
  const selectScenario = useTripStore((s) => s.selectScenario);
  const upsertShortlistItem = useTripStore((s) => s.upsertShortlistItem);
  const [expanded, setExpanded] = useState<ScenarioKind | null>(null);

  const scenarios = useMemo(() => (trip ? buildScenarios(trip) : []), [trip]);
  const offersBySegment = useMemo(() => {
    if (!trip) return new Map();
    const m = new Map<string, ReturnType<typeof scoreSegment>>();
    trip.segments.forEach((seg) => m.set(seg.id, scoreSegment(trip, seg)));
    return m;
  }, [trip]);

  if (!trip) return <main className="flex-1 p-8 text-slate-500">Trip not found.</main>;

  function stayLabel(scenario: Scenario, stay: Scenario["stays"][number]) {
    const seg = trip!.segments.find((s) => s.id === stay.segmentId);
    const offers = offersBySegment.get(stay.segmentId) ?? [];
    const offer = offers.find((o: { room: { id: string } }) => o.room.id === stay.roomId);
    return { seg, offer };
  }

  function handleChoose(scenario: Scenario) {
    selectScenario(trip!.id, scenario.kind);
    scenario.stays.forEach((stay) => {
      upsertShortlistItem(trip!.id, { segmentId: stay.segmentId, hotelId: stay.hotelId, roomId: stay.roomId, status: "selected" });
    });
    router.push(`/trips/${trip!.id}/booking`);
  }

  return (
    <>
      <TripStepNav tripId={trip.id} />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold">Sequence recommendation</h1>
          <p className="mt-1 text-sm text-slate-500">
            The best individual hotels may not produce the best overall trip. Compare complete sequences, not single stays. Your switching tolerance:{" "}
            <span className="font-medium">{trip.switchingTolerance}</span>.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {scenarios.map((scenario) => {
            const moves = buildMoveAnalyses(trip, scenario);
            const isExpanded = expanded === scenario.kind;
            const isSelected = trip.selectedScenario === scenario.kind;
            return (
              <div key={scenario.kind} className={clsx("card", isSelected && "ring-2 ring-slate-900")}>
                <div className="flex items-center justify-between">
                  <Tag tone={SCENARIO_TONE[scenario.kind]}>{scenario.label}</Tag>
                  <span className="text-xs text-slate-400">Sequence score {Math.round(scenario.sequenceScore * 100)}/100</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{scenario.description}</p>

                <ol className="mt-3 space-y-2 border-l border-slate-200 pl-3">
                  {scenario.stays.map((stay, i) => {
                    const { seg, offer } = stayLabel(scenario, stay);
                    if (!seg || !offer) return null;
                    return (
                      <li key={stay.segmentId} className="text-sm">
                        <span className="text-xs text-slate-400">
                          {formatDateShort(seg.startDate)} – {formatDateShort(seg.endDate)}
                        </span>
                        <div>
                          <span className="font-medium">{offer.hotel.name}</span> <span className="text-slate-500">— {offer.room.name}</span>
                        </div>
                        {i < scenario.stays.length - 1 && moves[i] && (
                          <div
                            className={clsx(
                              "mt-1 text-xs",
                              moves[i].recommendation === "worth it" && "text-emerald-700",
                              moves[i].recommendation === "not worth it" && "text-rose-700",
                              moves[i].recommendation === "marginal" && "text-amber-700"
                            )}
                          >
                            ↓ Move {moves[i].recommendation} — {moves[i].transferMinutes} min transfer
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>

                {scenario.stays.length === 0 && (
                  <p className="mt-2 text-sm text-rose-600">No eligible hotels found for this trip&apos;s destinations in the demo dataset.</p>
                )}

                <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-3">
                  <Stat label="Total price" value={formatMoney(scenario.totalPrice, trip.currency)} />
                  <Stat label="Hotel changes" value={String(scenario.numberOfMoves)} />
                  <Stat label="Transfer time" value={`${scenario.totalTransferMinutes} min`} />
                  <Stat label="Luggage burden" value={scenario.luggageBurden} />
                  <Stat label="Experience variety" value={`${Math.round(scenario.experienceVarietyScore * 100)}/100`} />
                  <Stat label="Arrival convenience" value={`${Math.round(scenario.arrivalConvenienceScore * 100)}/100`} />
                </dl>

                <p className="mt-3 text-xs text-slate-500">
                  <span className="font-medium">Main compromise:</span> {scenario.mainCompromise}
                </p>

                <button className="mt-2 text-xs text-slate-500 underline" onClick={() => setExpanded(isExpanded ? null : scenario.kind)}>
                  {isExpanded ? "Hide" : "Show"} move-by-move analysis
                </button>
                {isExpanded && (
                  <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3 text-xs">
                    {moves.length === 0 && <p className="text-slate-400">No hotel changes in this sequence.</p>}
                    {moves.map((m, i) => (
                      <p key={i}>
                        <span className="font-medium">Move {i + 1}:</span> {m.reasoning} Lost access between check-out and check-in: ~{m.lostAccessHours}h.{" "}
                        {m.luggageDifficulty !== "easy" && "Luggage forwarding may help with this transfer."}
                      </p>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
                  <button className="btn-primary text-xs" onClick={() => handleChoose(scenario)}>
                    Choose this sequence
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700">{value}</dd>
    </div>
  );
}
