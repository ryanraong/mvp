import { AccommodationSegment, Trip } from "@/lib/types";
import { SEED_SEGMENTS } from "@/lib/data/segments";
import { addDays, nightsBetween } from "@/lib/format";

// Proposes accommodation segments for a trip. The MVP demo dataset has full
// research coverage for the Kyoto & Osaka validation trip; for any other
// destination list it falls back to one undifferentiated segment per
// destination and is upfront that detailed research isn't available.
export function proposeSegments(trip: Trip): AccommodationSegment[] {
  const totalNights = nightsBetween(trip.arrivalDate, trip.departureDate);
  const dests = trip.destinations.map((d) => d.trim().toLowerCase());
  const isKyotoOsaka = dests.length === 2 && dests.includes("kyoto") && dests.includes("osaka");

  if (isKyotoOsaka) {
    const defaultNights = SEED_SEGMENTS.map((s) => nightsBetween(s.startDate, s.endDate));
    const defaultTotal = defaultNights.reduce((a, b) => a + b, 0);
    const scaled = defaultNights.map((n) => Math.max(1, Math.round((n / defaultTotal) * totalNights)));
    const diff = totalNights - scaled.reduce((a, b) => a + b, 0);
    scaled[scaled.length - 1] += diff;

    let cursor = trip.arrivalDate;
    return SEED_SEGMENTS.map((template, i) => {
      const startDate = cursor;
      const endDate = addDays(startDate, scaled[i]);
      cursor = endDate;
      const oneNightWarning = scaled[i] <= 1 ? "This stay is only one night — consider merging it with an adjacent segment." : undefined;
      return {
        ...template,
        startDate,
        endDate,
        oneNightWarning,
      };
    });
  }

  // Fallback: one undifferentiated segment per destination.
  const perDestination = Math.max(1, Math.floor(totalNights / Math.max(1, trip.destinations.length)));
  let cursor = trip.arrivalDate;
  return trip.destinations.map((destination, i) => {
    const isLast = i === trip.destinations.length - 1;
    const nights = isLast ? totalNights - perDestination * i : perDestination;
    const startDate = cursor;
    const endDate = addDays(startDate, Math.max(1, nights));
    cursor = endDate;
    return {
      id: `seg-fallback-${i}`,
      destination,
      startDate,
      endDate,
      role: "Arrival base",
      rationale:
        "This MVP demo's research dataset only has full coverage for Kyoto & Osaka. This destination is shown as a single undifferentiated stay — add Kyoto and/or Osaka to see full segmentation, room-level comparison and sequence optimisation.",
      suggestedNeighbourhoods: [],
      status: "proposed",
    };
  });
}
