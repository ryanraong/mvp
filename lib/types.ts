// Core domain types for the Hotel Research & Selection Assistant MVP.
// Mirrors the entities described in the functional spec (trip, segments, hotels, rooms, etc).

export type Currency = "SGD" | "JPY" | "USD";

export type TravelerType = "couple" | "family" | "friends" | "solo" | "other";

export type SwitchingTolerance = "frequent" | "easy-only" | "few-changes";

export type PlaceImportance = "must-visit" | "interested" | "optional";
export type PlaceSource = "search" | "maps-link" | "pasted";

export interface Place {
  id: string;
  name: string;
  destination: string;
  lat: number;
  lng: number;
  preferredDate?: string;
  importance: PlaceImportance;
  source: PlaceSource;
  isDuplicate?: boolean;
}

export type ImportedHotelStatus = "matched" | "needs-confirmation" | "unmatched";

export interface ImportedHotel {
  id: string;
  rawName: string;
  link?: string;
  destination: string;
  matchedHotelId?: string;
  status: ImportedHotelStatus;
}

export type BedType = "twin" | "double" | "queen" | "king" | "semi-double";

export interface HardConstraints {
  privateBathroom: boolean;
  nonSmoking: boolean;
  bedType: BedType | "no-preference";
  minRoomSizeSqm: number | null;
  maxWalkDistanceMinutes: number | null;
  freeCancellation: boolean;
  liftAccess: boolean;
  airConditioning: boolean;
  laundry: boolean;
  accessibility: boolean;
  breakfast: boolean;
  checkinAfter: string | null; // e.g. "15:00"
}

export type PreferenceTheme =
  | "quiet"
  | "traditional"
  | "modern"
  | "spacious"
  | "local"
  | "romantic"
  | "convenient"
  | "lively"
  | "scenic";

export interface PreferenceInterpretation {
  theme: PreferenceTheme;
  category: "hotel" | "neighbourhood";
  weight: number; // 0-1
  explanation: string;
  sourceText: string;
  accepted: boolean;
}

export interface ReactionEvent {
  id: string;
  hotelId: string;
  roomId?: string;
  reaction:
    | "like"
    | "dislike"
    | "too-expensive"
    | "room-too-small"
    | "wrong-atmosphere"
    | "poor-location"
    | "not-special-enough"
    | "too-inconvenient";
  affectedTheme?: PreferenceTheme;
  weightDelta?: number;
  undone?: boolean;
  createdAt: string;
}

export type SegmentRole =
  | "Arrival base"
  | "Day-trip hub"
  | "Traditional experience"
  | "Relaxed stay"
  | "Nightlife base"
  | "Departure base";

export interface AccommodationSegment {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  role: SegmentRole;
  rationale: string;
  suggestedNeighbourhoods: string[];
  oneNightWarning?: string;
  shortlistedHotelId?: string;
  shortlistedRoomId?: string;
  status: "proposed" | "confirmed";
}

export type PriceConfidenceLabel =
  | "exact-verified-total"
  | "exact-before-tax"
  | "live-starting-rate"
  | "indicative"
  | "unavailable";

export interface Room {
  id: string;
  hotelId: string;
  name: string;
  sizeSqm: number | null;
  bedType: BedType;
  occupancy: number;
  bathroom: "private" | "shared";
  smoking: false;
  view?: string;
  breakfastIncluded: boolean;
  cancellation: "free" | "partial" | "non-refundable";
  cancellationDeadline?: string;
  nightlyRate: number;
  totalPriceForStay: number | null;
  currency: Currency;
  priceConfidence: PriceConfidenceLabel;
  priceSource: string;
  retrievedAt: string;
  taxesIncluded: boolean;
  prepaymentRequired: boolean;
}

export interface ReviewSummary {
  hotelId: string;
  strengths: string[];
  concerns: string[];
  isolatedComplaints: string[];
  unverifiedAnecdotes: string[];
  recency: string;
  travelerTypeRelevance: string;
  roomSpecificNotes?: string;
  avgScore: number;
  reviewCount: number;
}

export interface NeighbourhoodSummary {
  name: string;
  destination: string;
  daytimeAtmosphere: string;
  eveningAtmosphere: string;
  foodAndCafeAccess: string;
  touristIntensity: "low" | "moderate" | "high";
  quietness: "quiet" | "moderate" | "lively";
  walkability: "low" | "moderate" | "high";
  transportConnections: string[];
}

export interface TransportEstimate {
  minutes: number;
  mode: string;
  transfers: number;
  walkingBurden: "low" | "moderate" | "high";
  luggageDifficulty: "easy" | "moderate" | "hard";
}

export type PriceTier = "value" | "best-fit" | "stretch";

export interface Hotel {
  id: string;
  name: string;
  destination: string;
  neighbourhood: string;
  lat: number;
  lng: number;
  priceTier: PriceTier;
  sources: string[];
  isUserCandidate?: boolean;
  mixedBathroomWarning?: boolean;
  experienceTags: string[];
  concernTags: string[];
  fromArrivalPoint: TransportEstimate;
  toDeparturePoint: TransportEstimate;
  toPlaces: Record<string, TransportEstimate>; // placeId -> estimate
}

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ScoredOffer {
  hotel: Hotel;
  room: Room;
  review: ReviewSummary;
  neighbourhood: NeighbourhoodSummary;
  nights: number;
  totalPriceForSegment: number;
  score: number;
  subscores: {
    roomFit: number;
    price: number;
    transport: number;
    neighbourhood: number;
    experience: number;
    review: number;
    flexibility: number;
  };
  confidence: ConfidenceLevel;
  confidenceReasons: string[];
  excluded?: { reason: string; hardConstraint: string };
  needsVerification?: string[];
  topFactors: string[];
}

export type ShortlistStatus = "considering" | "finalist" | "rejected" | "selected" | "booked";

export interface ShortlistItem {
  id: string;
  segmentId: string;
  hotelId: string;
  roomId: string;
  status: ShortlistStatus;
  notes?: string;
  advantages?: string[];
  concerns?: string[];
}

export interface BookingRecord {
  segmentId: string;
  hotelId: string;
  roomId: string;
  bookingSource: string;
  bookingReference?: string;
  totalPrice: number;
  currency: Currency;
  paymentStatus: "unpaid" | "deposit-paid" | "paid-in-full";
  cancellationDeadline?: string;
  notes?: string;
}

export type ScenarioKind = "best-overall" | "fewer-changes" | "lower-cost" | "best-experience";

export interface ScenarioStay {
  segmentId: string;
  hotelId: string;
  roomId: string;
}

export interface Scenario {
  kind: ScenarioKind;
  label: string;
  description: string;
  stays: ScenarioStay[];
  totalPrice: number;
  numberOfMoves: number;
  totalTransferMinutes: number;
  luggageBurden: "easy" | "moderate" | "hard";
  experienceVarietyScore: number;
  arrivalConvenienceScore: number;
  departureConvenienceScore: number;
  mainCompromise: string;
  sequenceScore: number;
}

export interface MoveAnalysis {
  fromSegmentId: string;
  toSegmentId: string;
  experienceGain: number;
  locationGain: number;
  priceDifference: number;
  transferMinutes: number;
  luggageDifficulty: "easy" | "moderate" | "hard";
  lostAccessHours: number;
  recommendation: "worth it" | "marginal" | "not worth it";
  reasoning: string;
}

export interface CoverageReport {
  neighbourhoodsSearched: string[];
  propertiesConsidered: number;
  roomOffersConsidered: number;
  sourcesSearched: string[];
  eliminatedByHardFilters: number;
  mainEliminationReasons: string[];
  finalistCount: number;
  unverifiedInfo: string[];
  confidenceBySegment: Record<string, ConfidenceLevel>;
}

export interface Budget {
  preferredNightly: number;
  maxNightly: number;
  totalBudget: number | null;
  capRemoved?: boolean;
}

export type TripStatus = "draft" | "segments-proposed" | "researching" | "shortlisted" | "sequenced" | "booking" | "booked";

export interface Trip {
  id: string;
  name: string;
  arrivalDate: string;
  departureDate: string;
  destinations: string[];
  travelerCount: number;
  travelerType: TravelerType;
  arrivalPoint: string;
  departurePoint: string;
  currency: Currency;
  budget: Budget;
  switchingTolerance: SwitchingTolerance;
  maxBudgetOverridden?: boolean;
  places: Place[];
  importedHotels: ImportedHotel[];
  constraints: HardConstraints;
  preferences: PreferenceInterpretation[];
  reactions: ReactionEvent[];
  segments: AccommodationSegment[];
  shortlist: ShortlistItem[];
  bookings: BookingRecord[];
  selectedScenario?: ScenarioKind;
  status: TripStatus;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_CONSTRAINTS: HardConstraints = {
  privateBathroom: true,
  nonSmoking: true,
  bedType: "no-preference",
  minRoomSizeSqm: null,
  maxWalkDistanceMinutes: 15,
  freeCancellation: false,
  liftAccess: false,
  airConditioning: true,
  laundry: false,
  accessibility: false,
  breakfast: false,
  checkinAfter: null,
};
