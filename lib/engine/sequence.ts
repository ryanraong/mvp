import { AccommodationSegment, MoveAnalysis, Scenario, ScenarioKind, ScoredOffer, SwitchingTolerance, Trip } from "@/lib/types";
import { scoreSegment } from "@/lib/engine/scoring";
import { neighbourhoodTransferMinutes } from "@/lib/data/transport";

const SWITCH_PENALTY: Record<SwitchingTolerance, number> = {
  frequent: 0.02,
  "easy-only": 0.05,
  "few-changes": 0.1,
};

function luggageRank(l: "easy" | "moderate" | "hard"): number {
  return l === "easy" ? 0 : l === "moderate" ? 1 : 2;
}
function worseLuggage(a: "easy" | "moderate" | "hard", b: "easy" | "moderate" | "hard") {
  return luggageRank(a) >= luggageRank(b) ? a : b;
}

// Builds the merged 3-hotel alternative by combining segments 2 and 3 (both Kyoto)
// into a single stay, which is the only structurally sound merge in this trip:
// both are Kyoto segments, they are adjacent, and neither is the arrival/departure anchor.
function buildMergedSegments(segments: AccommodationSegment[]): AccommodationSegment[] | null {
  const idx = segments.findIndex((s) => s.role === "Traditional experience");
  const nextIdx = idx + 1;
  if (idx === -1 || nextIdx >= segments.length) return null;
  const a = segments[idx];
  const b = segments[nextIdx];
  if (a.destination !== b.destination) return null;

  const merged: AccommodationSegment = {
    ...a,
    id: `${a.id}+${b.id}`,
    endDate: b.endDate,
    rationale: `Merged stay combining "${a.role}" and "${b.role}" into one hotel to reduce hotel changes.`,
    suggestedNeighbourhoods: Array.from(new Set([...a.suggestedNeighbourhoods, ...b.suggestedNeighbourhoods])),
  };
  return [...segments.slice(0, idx), merged, ...segments.slice(nextIdx + 1)];
}

function pickOffersForSegments(
  trip: Trip,
  segments: AccommodationSegment[],
  pick: (offers: ScoredOffer[]) => ScoredOffer | undefined
): { segment: AccommodationSegment; offer: ScoredOffer }[] {
  const result: { segment: AccommodationSegment; offer: ScoredOffer }[] = [];
  // Avoid recommending the immediately preceding stay's hotel again — a "move" to
  // the same hotel is not a real move, and two adjacent segments sharing a hotel
  // usually means the researched neighbourhood pools overlapped, not a genuine pick.
  let previousHotelId: string | undefined;
  for (const segment of segments) {
    const eligible = scoreSegment(trip, segment).filter((o) => !o.excluded);
    const withoutPrevious = previousHotelId ? eligible.filter((o) => o.hotel.id !== previousHotelId) : eligible;
    const pool = withoutPrevious.length > 0 ? withoutPrevious : eligible;
    const chosen = pick(pool);
    if (chosen) {
      result.push({ segment, offer: chosen });
      previousHotelId = chosen.hotel.id;
    }
  }
  return result;
}

function scenarioFromPicks(
  trip: Trip,
  kind: ScenarioKind,
  label: string,
  description: string,
  picks: { segment: AccommodationSegment; offer: ScoredOffer }[]
): Scenario {
  const totalPrice = picks.reduce((sum, p) => sum + p.offer.totalPriceForSegment, 0);

  let numberOfMoves = 0;
  let totalTransferMinutes = 0;
  let luggageBurden: "easy" | "moderate" | "hard" = "easy";
  for (let i = 0; i < picks.length - 1; i++) {
    const fromHotelId = picks[i].offer.hotel.id;
    const toHotelId = picks[i + 1].offer.hotel.id;
    if (fromHotelId === toHotelId) continue; // same hotel, no real move
    numberOfMoves += 1;
    const from = picks[i].offer.hotel.neighbourhood;
    const to = picks[i + 1].offer.hotel.neighbourhood;
    totalTransferMinutes += neighbourhoodTransferMinutes(from, to);
    if (from !== to) luggageBurden = worseLuggage(luggageBurden, "moderate");
  }

  const experienceVarietyScore =
    picks.reduce((s, p) => s + p.offer.subscores.experience + p.offer.subscores.neighbourhood, 0) / (picks.length * 2 || 1);

  const arrivalPick = picks.find((p) => p.segment.role === "Arrival base");
  const departurePick = picks.find((p) => p.segment.role === "Departure base");
  const arrivalConvenienceScore = arrivalPick ? 1 - Math.min(1, arrivalPick.offer.hotel.fromArrivalPoint.minutes / 120) : 0.5;
  const departureConvenienceScore = departurePick ? 1 - Math.min(1, departurePick.offer.hotel.toDeparturePoint.minutes / 120) : 0.5;

  const avgOfferScore = picks.reduce((s, p) => s + p.offer.score, 0) / (picks.length || 1);
  const switchPenalty = numberOfMoves * SWITCH_PENALTY[trip.switchingTolerance];
  const budgetPenalty = trip.budget.totalBudget && totalPrice > trip.budget.totalBudget ? 0.08 : 0;
  const sequenceScore = Math.max(
    0,
    avgOfferScore * 0.55 +
      experienceVarietyScore * 0.15 +
      arrivalConvenienceScore * 0.1 +
      departureConvenienceScore * 0.1 +
      (1 - totalTransferMinutes / 400) * 0.1 -
      switchPenalty -
      budgetPenalty
  );

  const mainCompromise =
    kind === "lower-cost"
      ? "Trades some room size, view and neighbourhood distinctiveness for a lower total spend."
      : kind === "fewer-changes"
      ? "Spends longer in one Kyoto neighbourhood rather than experiencing both Gion and Arashiyama as distinct stays."
      : kind === "best-experience"
      ? "Prioritises distinctive rooms and neighbourhoods over price, raising the total cost."
      : "Balances cost, experience and convenience without maximising any single dimension.";

  return {
    kind,
    label,
    description,
    stays: picks.map((p) => ({ segmentId: p.segment.id, hotelId: p.offer.hotel.id, roomId: p.offer.room.id })),
    totalPrice,
    numberOfMoves,
    totalTransferMinutes,
    luggageBurden,
    experienceVarietyScore,
    arrivalConvenienceScore,
    departureConvenienceScore,
    mainCompromise,
    sequenceScore,
  };
}

export function buildScenarios(trip: Trip): Scenario[] {
  const scenarios: Scenario[] = [];

  const bestOverallPicks = pickOffersForSegments(trip, trip.segments, (offers) => offers[0]);
  scenarios.push(
    scenarioFromPicks(
      trip,
      "best-overall",
      "Best overall",
      "Balances experience, cost, transport and moving burden across all four stays.",
      bestOverallPicks
    )
  );

  const lowerCostPicks = pickOffersForSegments(trip, trip.segments, (offers) =>
    [...offers].sort((a, b) => a.totalPriceForSegment - b.totalPriceForSegment)[0]
  );
  scenarios.push(
    scenarioFromPicks(trip, "lower-cost", "Lower cost", "Stays closest to your preferred nightly budget throughout the trip.", lowerCostPicks)
  );

  const bestExperiencePicks = pickOffersForSegments(trip, trip.segments, (offers) =>
    [...offers].sort((a, b) => {
      const expA = a.subscores.experience * 0.6 + a.subscores.neighbourhood * 0.4;
      const expB = b.subscores.experience * 0.6 + b.subscores.neighbourhood * 0.4;
      return expB - expA;
    })[0]
  );
  scenarios.push(
    scenarioFromPicks(
      trip,
      "best-experience",
      "Best experience",
      "Prioritises distinctive properties and neighbourhoods, even where that costs more.",
      bestExperiencePicks
    )
  );

  const mergedSegments = buildMergedSegments(trip.segments);
  if (mergedSegments) {
    const fewerChangesPicks = pickOffersForSegments(trip, mergedSegments, (offers) => offers[0]);
    scenarios.push(
      scenarioFromPicks(
        trip,
        "fewer-changes",
        "Fewer changes",
        "Uses the smallest practical number of hotels by merging the two central Kyoto stays into one.",
        fewerChangesPicks
      )
    );
  }

  return scenarios;
}

export function buildMoveAnalyses(trip: Trip, scenario: Scenario): MoveAnalysis[] {
  const analyses: MoveAnalysis[] = [];
  const offersBySegment = new Map<string, ScoredOffer[]>();
  for (const segment of trip.segments) {
    offersBySegment.set(segment.id, scoreSegment(trip, segment));
  }

  for (let i = 0; i < scenario.stays.length - 1; i++) {
    const fromStay = scenario.stays[i];
    const toStay = scenario.stays[i + 1];
    const fromSegment = trip.segments.find((s) => s.id === fromStay.segmentId)!;
    const toSegment = trip.segments.find((s) => s.id === toStay.segmentId)!;
    const fromOffers = offersBySegment.get(fromStay.segmentId) ?? [];
    const toOffers = offersBySegment.get(toStay.segmentId) ?? [];
    const fromOffer = fromOffers.find((o) => o.room.id === fromStay.roomId);
    const toOffer = toOffers.find((o) => o.room.id === toStay.roomId);
    if (!fromOffer || !toOffer) continue;

    const experienceGain = toOffer.subscores.experience - fromOffer.subscores.experience;
    const locationGain = toOffer.subscores.neighbourhood + toOffer.subscores.transport - (fromOffer.subscores.neighbourhood + fromOffer.subscores.transport);
    const priceDifference = toOffer.totalPriceForSegment - fromOffer.totalPriceForSegment;
    const transferMinutes = neighbourhoodTransferMinutes(fromOffer.hotel.neighbourhood, toOffer.hotel.neighbourhood);
    const luggageDifficulty: "easy" | "moderate" | "hard" = transferMinutes <= 15 ? "easy" : transferMinutes <= 35 ? "moderate" : "hard";
    const lostAccessHours = fromSegment.destination === toSegment.destination ? 2 : 4;

    const netGain = experienceGain * 0.5 + locationGain * 0.5;
    let recommendation: MoveAnalysis["recommendation"] = "marginal";
    let reasoning: string;
    if (fromOffer.hotel.id === toOffer.hotel.id) {
      recommendation = "not worth it";
      reasoning = "Same hotel selected for both stays — no move occurs.";
    } else if (fromSegment.destination !== toSegment.destination) {
      recommendation = "worth it";
      reasoning = `This move is required — the trip changes destination from ${fromSegment.destination} to ${toSegment.destination} here, so a hotel change can't be avoided.`;
    } else if (netGain > 0.08 && transferMinutes <= 45) {
      recommendation = "worth it";
      reasoning = `The move gains meaningful experience and location fit (net +${(netGain * 100).toFixed(0)}%) for a manageable ${transferMinutes}-minute transfer.`;
    } else if (netGain <= 0.02) {
      recommendation = "not worth it";
      reasoning = `The two hotels are similar enough (net ${(netGain * 100).toFixed(0)}%) that the ${transferMinutes}-minute transfer and lost access likely aren't worth it — consider staying in one hotel for both segments.`;
    } else {
      recommendation = "marginal";
      reasoning = `The move offers a modest improvement (net +${(netGain * 100).toFixed(0)}%) that may or may not be worth the ${transferMinutes}-minute transfer, depending on how much you value a fresh neighbourhood.`;
    }

    analyses.push({
      fromSegmentId: fromStay.segmentId,
      toSegmentId: toStay.segmentId,
      experienceGain,
      locationGain,
      priceDifference,
      transferMinutes,
      luggageDifficulty,
      lostAccessHours,
      recommendation,
      reasoning,
    });
  }

  return analyses;
}
