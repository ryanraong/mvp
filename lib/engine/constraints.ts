import { Hotel, HardConstraints, Room, Budget } from "@/lib/types";

export interface ConstraintCheckResult {
  excluded?: { reason: string; hardConstraint: string };
  needsVerification: string[];
}

// Derives amenity-style attributes from the mock dataset's tags rather than
// hand-authoring separate fields for every property (see lib/data/hotels.ts).
function deriveAmenities(hotel: Hotel) {
  const liftAccess = !hotel.concernTags.includes("no-lift");
  const laundry = hotel.priceTier !== "value";
  const accessibility = liftAccess && hotel.priceTier !== "value";
  const walkToStationMinutes = hotel.concernTags.includes("distance") ? 18 : 6;
  return { liftAccess, laundry, accessibility, walkToStationMinutes };
}

export function checkHardConstraints(
  hotel: Hotel,
  room: Room,
  constraints: HardConstraints,
  budget: Budget
): ConstraintCheckResult {
  const needsVerification: string[] = [];
  const amenities = deriveAmenities(hotel);
  const nightlyPrice = room.nightlyRate;

  if (!budget.capRemoved && nightlyPrice > budget.maxNightly) {
    return {
      excluded: { reason: `Nightly rate (${nightlyPrice.toFixed(0)}) exceeds your maximum budget of ${budget.maxNightly}`, hardConstraint: "Maximum budget" },
      needsVerification,
    };
  }

  if (constraints.privateBathroom && room.bathroom !== "private") {
    return { excluded: { reason: "Room has a shared bathroom, not private", hardConstraint: "Private bathroom" }, needsVerification };
  }
  if (constraints.freeCancellation && room.cancellation !== "free") {
    return { excluded: { reason: `Cancellation policy is "${room.cancellation}", not free cancellation`, hardConstraint: "Free cancellation" }, needsVerification };
  }
  if (constraints.breakfast && !room.breakfastIncluded) {
    return { excluded: { reason: "Breakfast is not included in this room rate", hardConstraint: "Breakfast included" }, needsVerification };
  }
  if (constraints.bedType !== "no-preference" && room.bedType !== constraints.bedType) {
    return { excluded: { reason: `Bed type is ${room.bedType}, not the requested ${constraints.bedType}`, hardConstraint: "Bed type" }, needsVerification };
  }
  if (constraints.minRoomSizeSqm !== null) {
    if (room.sizeSqm === null) {
      needsVerification.push("Room size");
    } else if (room.sizeSqm < constraints.minRoomSizeSqm) {
      return { excluded: { reason: `Room size (${room.sizeSqm} sqm) is below your minimum of ${constraints.minRoomSizeSqm} sqm`, hardConstraint: "Minimum room size" }, needsVerification };
    }
  }
  if (constraints.maxWalkDistanceMinutes !== null && amenities.walkToStationMinutes > constraints.maxWalkDistanceMinutes) {
    return {
      excluded: {
        reason: `Estimated ${amenities.walkToStationMinutes}-minute walk to the nearest station exceeds your ${constraints.maxWalkDistanceMinutes}-minute limit`,
        hardConstraint: "Maximum walking distance",
      },
      needsVerification,
    };
  }
  if (constraints.liftAccess && !amenities.liftAccess) {
    return { excluded: { reason: "Property does not offer lift access", hardConstraint: "Lift access" }, needsVerification };
  }
  if (constraints.laundry && !amenities.laundry) {
    return { excluded: { reason: "Property does not offer laundry service", hardConstraint: "Laundry" }, needsVerification };
  }
  if (constraints.accessibility && !amenities.accessibility) {
    return { excluded: { reason: "Property is not confirmed wheelchair-accessible", hardConstraint: "Accessibility" }, needsVerification };
  }
  if (room.sizeSqm === null && !needsVerification.includes("Room size")) {
    needsVerification.push("Room size");
  }

  return { needsVerification };
}
