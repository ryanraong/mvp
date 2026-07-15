import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  BookingRecord,
  DEFAULT_CONSTRAINTS,
  HardConstraints,
  ImportedHotel,
  Place,
  ReactionEvent,
  ScenarioKind,
  ShortlistItem,
  ShortlistStatus,
  Trip,
} from "@/lib/types";
import { SEED_PLACES } from "@/lib/data/places";
import { interpretPreferenceText } from "@/lib/engine/preferenceParser";
import { matchImportedHotel } from "@/lib/engine/importMatch";
import { proposeSegments } from "@/lib/engine/segmentation";
import { addDays, nightsBetween } from "@/lib/format";

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function seedTrip(): Trip {
  const now = nowIso();
  return {
    id: "trip-kyoto-osaka-demo",
    name: "Kyoto & Osaka Anniversary Trip",
    arrivalDate: "2026-10-27",
    departureDate: "2026-11-10",
    destinations: ["Kyoto", "Osaka"],
    travelerCount: 2,
    travelerType: "couple",
    arrivalPoint: "Kansai International Airport (KIX)",
    departurePoint: "Kansai International Airport (KIX)",
    currency: "SGD",
    budget: { preferredNightly: 100, maxNightly: 200, totalBudget: null },
    switchingTolerance: "easy-only",
    places: SEED_PLACES,
    importedHotels: [
      {
        id: newId("imported"),
        rawName: "Toji-dori Guesthouse",
        link: "https://maps.google.com/?q=Toji-dori+Guesthouse+Kyoto",
        destination: "Kyoto",
        matchedHotelId: "toji-dori-guesthouse",
        status: "matched",
      },
    ],
    constraints: {
      ...DEFAULT_CONSTRAINTS,
      privateBathroom: true,
      maxWalkDistanceMinutes: 15,
      airConditioning: true,
    },
    preferences: [
      { theme: "traditional", category: "hotel", weight: 0.8, explanation: "traditional Japanese interiors and service touches", sourceText: "We want a real traditional Kyoto experience, not a generic business hotel.", accepted: true },
      { theme: "quiet", category: "neighbourhood", weight: 0.65, explanation: "quiet streets and low nighttime noise", sourceText: "Somewhere relaxed and not too hectic in the evenings.", accepted: true },
      { theme: "scenic", category: "hotel", weight: 0.6, explanation: "river, garden or skyline views", sourceText: "A nice view would be lovely, especially by the river.", accepted: true },
      { theme: "romantic", category: "hotel", weight: 0.6, explanation: "a romantic, intimate atmosphere", sourceText: "It's our anniversary trip so somewhere a bit special/romantic.", accepted: true },
      { theme: "convenient", category: "neighbourhood", weight: 0.5, explanation: "easy transport access and short transfers", sourceText: "Would like arrival and departure to be simple given our flights.", accepted: true },
    ],
    reactions: [],
    segments: [],
    shortlist: [],
    bookings: [],
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}

interface TripStore {
  trips: Record<string, Trip>;
  tripOrder: string[];
  hasHydratedSeed: boolean;
  ensureSeedTrip: () => void;
  createTrip: (input: Partial<Trip> & { name: string }) => string;
  updateTrip: (id: string, patch: Partial<Trip>) => void;
  deleteTrip: (id: string) => void;

  addPlace: (tripId: string, place: Omit<Place, "id" | "isDuplicate">) => void;
  removePlace: (tripId: string, placeId: string) => void;

  addImportedHotel: (tripId: string, rawName: string, link: string | undefined, destination: string) => void;
  confirmImportedHotelMatch: (tripId: string, importedId: string, hotelId: string) => void;

  updateConstraints: (tripId: string, patch: Partial<HardConstraints>) => void;

  addPreferenceFromText: (tripId: string, text: string) => void;
  setPreferenceAccepted: (tripId: string, index: number, accepted: boolean) => void;
  removePreference: (tripId: string, index: number) => void;

  addReaction: (tripId: string, reaction: Omit<ReactionEvent, "id" | "createdAt" | "undone">) => void;
  undoReaction: (tripId: string, reactionId: string) => void;

  proposeSegmentsForTrip: (tripId: string) => void;
  updateSegment: (tripId: string, segmentId: string, patch: Partial<Trip["segments"][number]>) => void;
  mergeWithNextSegment: (tripId: string, segmentId: string) => void;
  splitSegment: (tripId: string, segmentId: string) => void;
  reorderSegment: (tripId: string, segmentId: string, direction: "up" | "down") => void;
  confirmSegments: (tripId: string) => void;

  setSwitchingTolerance: (tripId: string, tolerance: Trip["switchingTolerance"]) => void;
  setBudget: (tripId: string, patch: Partial<Trip["budget"]>) => void;

  upsertShortlistItem: (tripId: string, item: Omit<ShortlistItem, "id">) => void;
  setShortlistStatus: (tripId: string, shortlistId: string, status: ShortlistStatus) => void;

  selectScenario: (tripId: string, kind: ScenarioKind) => void;
  recordBooking: (tripId: string, record: BookingRecord) => void;
}

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      trips: {},
      tripOrder: [],
      hasHydratedSeed: false,

      ensureSeedTrip: () => {
        const state = get();
        if (state.hasHydratedSeed || Object.keys(state.trips).length > 0) return;
        const trip = seedTrip();
        set({ trips: { [trip.id]: trip }, tripOrder: [trip.id], hasHydratedSeed: true });
      },

      createTrip: (input) => {
        const id = newId("trip");
        const now = nowIso();
        const trip: Trip = {
          id,
          name: input.name,
          arrivalDate: input.arrivalDate ?? "",
          departureDate: input.departureDate ?? "",
          destinations: input.destinations ?? [],
          travelerCount: input.travelerCount ?? 2,
          travelerType: input.travelerType ?? "couple",
          arrivalPoint: input.arrivalPoint ?? "",
          departurePoint: input.departurePoint ?? "",
          currency: input.currency ?? "SGD",
          budget: input.budget ?? { preferredNightly: 100, maxNightly: 200, totalBudget: null },
          switchingTolerance: input.switchingTolerance ?? "easy-only",
          places: [],
          importedHotels: [],
          constraints: DEFAULT_CONSTRAINTS,
          preferences: [],
          reactions: [],
          segments: [],
          shortlist: [],
          bookings: [],
          status: "draft",
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ trips: { ...s.trips, [id]: trip }, tripOrder: [id, ...s.tripOrder] }));
        return id;
      },

      updateTrip: (id, patch) =>
        set((s) => {
          const trip = s.trips[id];
          if (!trip) return s;
          return { trips: { ...s.trips, [id]: { ...trip, ...patch, updatedAt: nowIso() } } };
        }),

      deleteTrip: (id) =>
        set((s) => {
          const rest = { ...s.trips };
          delete rest[id];
          return { trips: rest, tripOrder: s.tripOrder.filter((t) => t !== id) };
        }),

      addPlace: (tripId, place) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          const isDuplicate = trip.places.some(
            (p) => p.name.toLowerCase() === place.name.toLowerCase() && p.destination === place.destination
          );
          const newPlace: Place = { ...place, id: newId("place"), isDuplicate };
          return { trips: { ...s.trips, [tripId]: { ...trip, places: [...trip.places, newPlace], updatedAt: nowIso() } } };
        }),

      removePlace: (tripId, placeId) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          return { trips: { ...s.trips, [tripId]: { ...trip, places: trip.places.filter((p) => p.id !== placeId), updatedAt: nowIso() } } };
        }),

      addImportedHotel: (tripId, rawName, link, destination) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          const match = matchImportedHotel(rawName, destination);
          const imported: ImportedHotel = {
            id: newId("imported"),
            rawName,
            link,
            destination,
            matchedHotelId: match.hotelId,
            status: match.status,
          };
          return { trips: { ...s.trips, [tripId]: { ...trip, importedHotels: [...trip.importedHotels, imported], updatedAt: nowIso() } } };
        }),

      confirmImportedHotelMatch: (tripId, importedId, hotelId) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          const importedHotels = trip.importedHotels.map((h) => (h.id === importedId ? { ...h, matchedHotelId: hotelId, status: "matched" as const } : h));
          return { trips: { ...s.trips, [tripId]: { ...trip, importedHotels, updatedAt: nowIso() } } };
        }),

      updateConstraints: (tripId, patch) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          return { trips: { ...s.trips, [tripId]: { ...trip, constraints: { ...trip.constraints, ...patch }, updatedAt: nowIso() } } };
        }),

      addPreferenceFromText: (tripId, text) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          const interpreted = interpretPreferenceText(text);
          const existingThemes = new Set(trip.preferences.map((p) => p.theme));
          const additions = interpreted.filter((p) => !existingThemes.has(p.theme));
          return { trips: { ...s.trips, [tripId]: { ...trip, preferences: [...trip.preferences, ...additions], updatedAt: nowIso() } } };
        }),

      setPreferenceAccepted: (tripId, index, accepted) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          const preferences = trip.preferences.map((p, i) => (i === index ? { ...p, accepted } : p));
          return { trips: { ...s.trips, [tripId]: { ...trip, preferences, updatedAt: nowIso() } } };
        }),

      removePreference: (tripId, index) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          const preferences = trip.preferences.filter((_, i) => i !== index);
          return { trips: { ...s.trips, [tripId]: { ...trip, preferences, updatedAt: nowIso() } } };
        }),

      addReaction: (tripId, reaction) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          const event: ReactionEvent = { ...reaction, id: newId("reaction"), createdAt: nowIso(), undone: false };
          let preferences = trip.preferences;
          if (reaction.affectedTheme && reaction.weightDelta) {
            const idx = preferences.findIndex((p) => p.theme === reaction.affectedTheme);
            if (idx >= 0) {
              const updated = [...preferences];
              updated[idx] = { ...updated[idx], weight: Math.max(0, Math.min(1, updated[idx].weight + reaction.weightDelta)) };
              preferences = updated;
            }
          }
          return { trips: { ...s.trips, [tripId]: { ...trip, reactions: [...trip.reactions, event], preferences, updatedAt: nowIso() } } };
        }),

      undoReaction: (tripId, reactionId) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          const reaction = trip.reactions.find((r) => r.id === reactionId);
          if (!reaction) return s;
          let preferences = trip.preferences;
          if (reaction.affectedTheme && reaction.weightDelta) {
            const idx = preferences.findIndex((p) => p.theme === reaction.affectedTheme);
            if (idx >= 0) {
              const updated = [...preferences];
              updated[idx] = { ...updated[idx], weight: Math.max(0, Math.min(1, updated[idx].weight - reaction.weightDelta)) };
              preferences = updated;
            }
          }
          const reactions = trip.reactions.map((r) => (r.id === reactionId ? { ...r, undone: true } : r));
          return { trips: { ...s.trips, [tripId]: { ...trip, reactions, preferences, updatedAt: nowIso() } } };
        }),

      proposeSegmentsForTrip: (tripId) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          const segments = proposeSegments(trip);
          return { trips: { ...s.trips, [tripId]: { ...trip, segments, status: "segments-proposed", updatedAt: nowIso() } } };
        }),

      updateSegment: (tripId, segmentId, patch) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          const segments = trip.segments.map((seg) => (seg.id === segmentId ? { ...seg, ...patch } : seg));
          return { trips: { ...s.trips, [tripId]: { ...trip, segments, updatedAt: nowIso() } } };
        }),

      mergeWithNextSegment: (tripId, segmentId) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          const idx = trip.segments.findIndex((seg) => seg.id === segmentId);
          if (idx < 0 || idx >= trip.segments.length - 1) return s;
          const a = trip.segments[idx];
          const b = trip.segments[idx + 1];
          const merged = {
            ...a,
            endDate: b.endDate,
            rationale: `Merged stay combining "${a.role}" and "${b.role}".`,
            suggestedNeighbourhoods: Array.from(new Set([...a.suggestedNeighbourhoods, ...b.suggestedNeighbourhoods])),
            oneNightWarning: undefined,
          };
          const segments = [...trip.segments.slice(0, idx), merged, ...trip.segments.slice(idx + 2)];
          return { trips: { ...s.trips, [tripId]: { ...trip, segments, updatedAt: nowIso() } } };
        }),

      splitSegment: (tripId, segmentId) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          const idx = trip.segments.findIndex((seg) => seg.id === segmentId);
          if (idx < 0) return s;
          const seg = trip.segments[idx];
          const totalNights = nightsBetween(seg.startDate, seg.endDate);
          if (totalNights < 2) return s;
          const firstNights = Math.ceil(totalNights / 2);
          const midDate = addDays(seg.startDate, firstNights);
          const first = { ...seg, endDate: midDate, oneNightWarning: firstNights <= 1 ? "This stay is only one night." : undefined };
          const second = {
            ...seg,
            id: newId("seg"),
            startDate: midDate,
            role: seg.role,
            rationale: `Split from "${seg.role}" — adjust the role and neighbourhoods for this half if needed.`,
            oneNightWarning: totalNights - firstNights <= 1 ? "This stay is only one night." : undefined,
          };
          const segments = [...trip.segments.slice(0, idx), first, second, ...trip.segments.slice(idx + 1)];
          return { trips: { ...s.trips, [tripId]: { ...trip, segments, updatedAt: nowIso() } } };
        }),

      reorderSegment: (tripId, segmentId, direction) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          const idx = trip.segments.findIndex((seg) => seg.id === segmentId);
          const swapWith = direction === "up" ? idx - 1 : idx + 1;
          if (idx < 0 || swapWith < 0 || swapWith >= trip.segments.length) return s;
          const reordered = [...trip.segments];
          [reordered[idx], reordered[swapWith]] = [reordered[swapWith], reordered[idx]];
          // Recompute contiguous dates from the trip's arrival date, preserving each segment's own night count.
          let cursor = trip.arrivalDate;
          const segments = reordered.map((seg) => {
            const nights = nightsBetween(seg.startDate, seg.endDate);
            const startDate = cursor;
            const endDate = addDays(startDate, nights);
            cursor = endDate;
            return { ...seg, startDate, endDate };
          });
          return { trips: { ...s.trips, [tripId]: { ...trip, segments, updatedAt: nowIso() } } };
        }),

      confirmSegments: (tripId) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          const segments = trip.segments.map((seg) => ({ ...seg, status: "confirmed" as const }));
          return { trips: { ...s.trips, [tripId]: { ...trip, segments, status: "researching", updatedAt: nowIso() } } };
        }),

      setSwitchingTolerance: (tripId, tolerance) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          return { trips: { ...s.trips, [tripId]: { ...trip, switchingTolerance: tolerance, updatedAt: nowIso() } } };
        }),

      setBudget: (tripId, patch) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          return { trips: { ...s.trips, [tripId]: { ...trip, budget: { ...trip.budget, ...patch }, updatedAt: nowIso() } } };
        }),

      upsertShortlistItem: (tripId, item) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          const existingIdx = trip.shortlist.findIndex((sl) => sl.segmentId === item.segmentId && sl.hotelId === item.hotelId && sl.roomId === item.roomId);
          let shortlist: ShortlistItem[];
          if (existingIdx >= 0) {
            shortlist = trip.shortlist.map((sl, i) => (i === existingIdx ? { ...sl, ...item } : sl));
          } else {
            shortlist = [...trip.shortlist, { ...item, id: newId("shortlist") }];
          }
          return { trips: { ...s.trips, [tripId]: { ...trip, shortlist, status: trip.status === "draft" || trip.status === "segments-proposed" ? "shortlisted" : trip.status, updatedAt: nowIso() } } };
        }),

      setShortlistStatus: (tripId, shortlistId, status) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          const shortlist = trip.shortlist.map((sl) => (sl.id === shortlistId ? { ...sl, status } : sl));
          return { trips: { ...s.trips, [tripId]: { ...trip, shortlist, updatedAt: nowIso() } } };
        }),

      selectScenario: (tripId, kind) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          return { trips: { ...s.trips, [tripId]: { ...trip, selectedScenario: kind, status: "sequenced", updatedAt: nowIso() } } };
        }),

      recordBooking: (tripId, record) =>
        set((s) => {
          const trip = s.trips[tripId];
          if (!trip) return s;
          const bookings = [...trip.bookings.filter((b) => b.segmentId !== record.segmentId), record];
          const segments = trip.segments.map((seg) =>
            seg.id === record.segmentId ? { ...seg, shortlistedHotelId: record.hotelId, shortlistedRoomId: record.roomId } : seg
          );
          return { trips: { ...s.trips, [tripId]: { ...trip, bookings, segments, status: "booked", updatedAt: nowIso() } } };
        }),
    }),
    { name: "hotel-assistant-trips" }
  )
);
