import { ConfidenceLevel, CoverageReport, Trip } from "@/lib/types";
import { scoreSegment, pickThreeFinalists } from "@/lib/engine/scoring";

export function buildCoverageReport(trip: Trip): CoverageReport {
  const neighbourhoodsSearched = new Set<string>();
  const sourcesSearched = new Set<string>();
  const propertyIds = new Set<string>();
  let roomOffersConsidered = 0;
  let eliminatedByHardFilters = 0;
  const eliminationReasonCounts: Record<string, number> = {};
  const unverifiedInfo = new Set<string>();
  const confidenceBySegment: Record<string, "high" | "medium" | "low"> = {};
  let finalistCount = 0;

  for (const segment of trip.segments) {
    segment.suggestedNeighbourhoods.forEach((n) => neighbourhoodsSearched.add(n));
    const offers = scoreSegment(trip, segment);
    for (const offer of offers) {
      propertyIds.add(offer.hotel.id);
      offer.hotel.sources.forEach((s) => sourcesSearched.add(s));
      roomOffersConsidered += 1;
      if (offer.excluded) {
        eliminatedByHardFilters += 1;
        eliminationReasonCounts[offer.excluded.hardConstraint] = (eliminationReasonCounts[offer.excluded.hardConstraint] ?? 0) + 1;
      } else if (offer.needsVerification?.length) {
        offer.needsVerification.forEach((v) => unverifiedInfo.add(`${offer.hotel.name}: ${v} unconfirmed`));
      }
    }
    const { bestOverall, bestValue, bestExperience } = pickThreeFinalists(offers);
    finalistCount += new Set([bestOverall?.room.id, bestValue?.room.id, bestExperience?.room.id].filter(Boolean)).size;
    if (bestOverall) confidenceBySegment[segment.id] = bestOverall.confidence;
  }

  const mainEliminationReasons = Object.entries(eliminationReasonCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => `${reason} (${count} offer${count === 1 ? "" : "s"} excluded)`);

  return {
    neighbourhoodsSearched: Array.from(neighbourhoodsSearched),
    propertiesConsidered: propertyIds.size,
    roomOffersConsidered,
    sourcesSearched: Array.from(sourcesSearched),
    eliminatedByHardFilters,
    mainEliminationReasons,
    finalistCount,
    unverifiedInfo: Array.from(unverifiedInfo),
    confidenceBySegment,
  };
}

export interface ConfidenceDimensions {
  propertyInformation: ConfidenceLevel;
  roomInformation: ConfidenceLevel;
  price: ConfidenceLevel;
  cancellation: ConfidenceLevel;
  reviews: ConfidenceLevel;
  transport: ConfidenceLevel;
}

function levelFromFraction(fraction: number): ConfidenceLevel {
  if (fraction >= 0.8) return "high";
  if (fraction >= 0.5) return "medium";
  return "low";
}

export function buildConfidenceDimensions(trip: Trip): ConfidenceDimensions {
  const eligible = trip.segments.flatMap((segment) => scoreSegment(trip, segment).filter((o) => !o.excluded));
  const n = eligible.length || 1;

  const exactPrice = eligible.filter((o) => o.room.priceConfidence === "exact-verified-total").length;
  const knownSize = eligible.filter((o) => o.room.sizeSqm !== null).length;
  const wellReviewed = eligible.filter((o) => o.review.reviewCount >= 100).length;
  const noConflict = eligible.filter((o) => !o.review.roomSpecificNotes?.toLowerCase().includes("conflict")).length;
  const knownCancellation = eligible.filter((o) => o.room.cancellation !== undefined).length;

  return {
    propertyInformation: levelFromFraction(noConflict / n),
    roomInformation: levelFromFraction(knownSize / n),
    price: levelFromFraction(exactPrice / n),
    cancellation: levelFromFraction(knownCancellation / n),
    reviews: levelFromFraction(wellReviewed / n),
    transport: "high",
  };
}
