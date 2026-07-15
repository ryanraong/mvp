import {
  AccommodationSegment,
  ConfidenceLevel,
  Hotel,
  PreferenceInterpretation,
  ScoredOffer,
  Trip,
} from "@/lib/types";
import { hotelsByNeighbourhood, roomsForHotel, reviewForHotel } from "@/lib/data/hotels";
import { findNeighbourhood } from "@/lib/data/neighbourhoods";
import { checkHardConstraints } from "@/lib/engine/constraints";

export const WEIGHTS = {
  roomFit: 0.2,
  price: 0.2,
  transport: 0.2,
  neighbourhood: 0.15,
  experience: 0.1,
  review: 0.1,
  flexibility: 0.05,
};

function nightsBetween(start: string, end: string): number {
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000));
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// Maps subjective preference themes onto the attributes of a hotel / neighbourhood pairing.
function neighbourhoodThemes(neighbourhoodName: string): Set<string> {
  const n = findNeighbourhood(neighbourhoodName);
  const themes = new Set<string>();
  if (n.quietness === "quiet") themes.add("quiet");
  if (n.quietness === "lively") themes.add("lively");
  if (n.touristIntensity !== "high") themes.add("local");
  if (n.walkability === "high") themes.add("convenient");
  return themes;
}

function roomFitScore(hotel: Hotel, room: ReturnType<typeof roomsForHotel>[number]): number {
  let score = 0.55;
  if (room.bathroom === "private") score += 0.12;
  if (room.sizeSqm !== null) {
    score += 0.28 * clamp01((room.sizeSqm - 14) / (38 - 14));
  } else {
    score += 0.1;
  }
  if (room.bedType === "semi-double") score -= 0.15;
  return clamp01(score);
}

function priceScore(nightlyPrice: number | null, preferred: number, max: number): number {
  if (nightlyPrice === null) return 0.4;
  if (nightlyPrice <= preferred) return clamp01(1 - (nightlyPrice / preferred) * 0.1);
  if (nightlyPrice >= max) return 0;
  return clamp01(1 - (nightlyPrice - preferred) / (max - preferred));
}

function transportScore(hotel: Hotel, segment: AccommodationSegment, trip: Trip): { score: number; avgMinutes: number } {
  const relevantPlaces = trip.places.filter((p) => p.destination === segment.destination);
  let weightedMinutes = 0;
  let totalWeight = 0;
  for (const place of relevantPlaces) {
    const est = hotel.toPlaces[place.id];
    if (!est) continue;
    const w = place.importance === "must-visit" ? 1 : place.importance === "interested" ? 0.6 : 0.3;
    weightedMinutes += est.minutes * w;
    totalWeight += w;
  }
  const isArrivalSegment = segment.role === "Arrival base";
  const isDepartureSegment = segment.role === "Departure base";
  if (isArrivalSegment) {
    weightedMinutes += hotel.fromArrivalPoint.minutes * 1.2;
    totalWeight += 1.2;
  }
  if (isDepartureSegment) {
    weightedMinutes += hotel.toDeparturePoint.minutes * 1.2;
    totalWeight += 1.2;
  }
  const avgMinutes = totalWeight > 0 ? weightedMinutes / totalWeight : 30;
  const score = clamp01(1 - (avgMinutes - 8) / 55);
  return { score, avgMinutes };
}

function neighbourhoodScore(hotel: Hotel, preferences: PreferenceInterpretation[]): number {
  const themes = neighbourhoodThemes(hotel.neighbourhood);
  const neighbourhoodPrefs = preferences.filter((p) => p.category === "neighbourhood" && p.accepted);
  if (neighbourhoodPrefs.length === 0) return 0.65;
  let total = 0;
  let weightSum = 0;
  for (const pref of neighbourhoodPrefs) {
    weightSum += pref.weight;
    if (themes.has(pref.theme)) total += pref.weight;
  }
  return weightSum > 0 ? clamp01(0.3 + 0.7 * (total / weightSum)) : 0.65;
}

function experienceScore(hotel: Hotel, preferences: PreferenceInterpretation[]): number {
  const hotelPrefs = preferences.filter((p) => p.category === "hotel" && p.accepted);
  if (hotelPrefs.length === 0) return 0.6;
  let total = 0;
  let weightSum = 0;
  for (const pref of hotelPrefs) {
    weightSum += pref.weight;
    if (hotel.experienceTags.includes(pref.theme)) total += pref.weight;
  }
  return weightSum > 0 ? clamp01(0.25 + 0.75 * (total / weightSum)) : 0.6;
}

function reviewScore(avgScore: number, strengthsCount: number, concernsCount: number): number {
  const base = clamp01(avgScore / 5);
  const balance = strengthsCount - concernsCount;
  return clamp01(base + balance * 0.03);
}

function flexibilityScore(cancellation: string): number {
  if (cancellation === "free") return 1;
  if (cancellation === "partial") return 0.5;
  return 0.1;
}

function confidenceFor(
  room: ReturnType<typeof roomsForHotel>[number],
  needsVerification: string[],
  reviewCount: number,
  roomSpecificNotes?: string
): { level: ConfidenceLevel; reasons: string[] } {
  const reasons: string[] = [];
  let level: ConfidenceLevel = "high";

  if (room.priceConfidence === "indicative" || room.priceConfidence === "live-starting-rate" || room.priceConfidence === "unavailable") {
    level = "low";
    reasons.push(`Price is ${room.priceConfidence.replace(/-/g, " ")}, not an exact-date verified total`);
  }
  if (needsVerification.length > 0) {
    if (level !== "low") level = "medium";
    reasons.push(`Unverified: ${needsVerification.join(", ")}`);
  }
  if (roomSpecificNotes && roomSpecificNotes.toLowerCase().includes("conflict")) {
    level = "low";
    reasons.push("Sources conflict on room details");
  }
  if (reviewCount < 100) {
    if (level === "high") level = "medium";
    reasons.push(`Limited review volume (n=${reviewCount})`);
  }
  if (reasons.length === 0) {
    reasons.push("Property, room, price and reviews are all confirmed through verified sources");
  }
  return { level, reasons };
}

export function scoreSegment(trip: Trip, segment: AccommodationSegment): ScoredOffer[] {
  const nights = nightsBetween(segment.startDate, segment.endDate);
  const hotelIds = new Set<string>();
  const candidateHotels: Hotel[] = [];
  for (const nb of segment.suggestedNeighbourhoods) {
    for (const h of hotelsByNeighbourhood(nb)) {
      if (!hotelIds.has(h.id)) {
        hotelIds.add(h.id);
        candidateHotels.push(h);
      }
    }
  }

  const offers: ScoredOffer[] = [];
  for (const hotel of candidateHotels) {
    const review = reviewForHotel(hotel.id);
    const neighbourhood = findNeighbourhood(hotel.neighbourhood);
    for (const room of roomsForHotel(hotel.id)) {
      const check = checkHardConstraints(hotel, room, trip.constraints, trip.budget);
      const nightlyPrice = room.nightlyRate;

      if (check.excluded) {
        offers.push({
          hotel,
          room,
          review,
          neighbourhood,
          nights,
          totalPriceForSegment: room.nightlyRate * nights,
          score: 0,
          subscores: { roomFit: 0, price: 0, transport: 0, neighbourhood: 0, experience: 0, review: 0, flexibility: 0 },
          confidence: "low",
          confidenceReasons: [check.excluded.reason],
          excluded: check.excluded,
          needsVerification: check.needsVerification,
          topFactors: [],
        });
        continue;
      }

      const rf = roomFitScore(hotel, room);
      const pr = priceScore(nightlyPrice, trip.budget.preferredNightly, trip.budget.maxNightly);
      const { score: tr } = transportScore(hotel, segment, trip);
      const nb = neighbourhoodScore(hotel, trip.preferences);
      const ex = experienceScore(hotel, trip.preferences);
      const rv = reviewScore(review.avgScore, review.strengths.length, review.concerns.length);
      const fl = flexibilityScore(room.cancellation);

      const subscores = { roomFit: rf, price: pr, transport: tr, neighbourhood: nb, experience: ex, review: rv, flexibility: fl };
      const score =
        subscores.roomFit * WEIGHTS.roomFit +
        subscores.price * WEIGHTS.price +
        subscores.transport * WEIGHTS.transport +
        subscores.neighbourhood * WEIGHTS.neighbourhood +
        subscores.experience * WEIGHTS.experience +
        subscores.review * WEIGHTS.review +
        subscores.flexibility * WEIGHTS.flexibility;

      const contributions = Object.entries(subscores).map(([k, v]) => ({
        key: k,
        contribution: v * WEIGHTS[k as keyof typeof WEIGHTS],
      }));
      contributions.sort((a, b) => b.contribution - a.contribution);
      const topFactors = contributions.slice(0, 3).map((c) => c.key);

      const { level, reasons } = confidenceFor(room, check.needsVerification, review.reviewCount, review.roomSpecificNotes);

      offers.push({
        hotel,
        room,
        review,
        neighbourhood,
        nights,
        totalPriceForSegment: room.nightlyRate * nights,
        score,
        subscores,
        confidence: level,
        confidenceReasons: reasons,
        needsVerification: check.needsVerification.length > 0 ? check.needsVerification : undefined,
        topFactors,
      });
    }
  }

  return offers.sort((a, b) => b.score - a.score);
}

export function pickThreeFinalists(offers: ScoredOffer[]): {
  bestOverall?: ScoredOffer;
  bestValue?: ScoredOffer;
  bestExperience?: ScoredOffer;
} {
  const eligible = offers.filter((o) => !o.excluded);
  if (eligible.length === 0) return {};
  const bestOverall = eligible[0];
  const bestValue = [...eligible].sort((a, b) => a.totalPriceForSegment - b.totalPriceForSegment)[0];
  const bestExperience = [...eligible].sort((a, b) => {
    const expA = a.subscores.experience * 0.6 + a.subscores.neighbourhood * 0.4;
    const expB = b.subscores.experience * 0.6 + b.subscores.neighbourhood * 0.4;
    return expB - expA;
  })[0];
  return { bestOverall, bestValue, bestExperience };
}

export { nightsBetween };
