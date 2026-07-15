import { TransportEstimate } from "@/lib/types";

// Approximate one-way travel times in minutes from each neighbourhood cluster
// to KIX airport, and to each itinerary place. These are illustrative estimates
// (mode of transport + typical transfer time), not live routing data.

export const AIRPORT_MINUTES: Record<string, { minutes: number; mode: string; transfers: number }> = {
  "Kyoto Station": { minutes: 75, mode: "JR Haruka airport express", transfers: 0 },
  "Shijo-Karasuma": { minutes: 88, mode: "Subway + JR Haruka express", transfers: 1 },
  "Gion & Higashiyama": { minutes: 95, mode: "Bus/taxi + JR Haruka express", transfers: 1 },
  "Arashiyama": { minutes: 100, mode: "JR Sagano line + JR Haruka express", transfers: 1 },
  "Namba & Shinsaibashi": { minutes: 45, mode: "Nankai Rapi:t limited express", transfers: 0 },
  "Umeda": { minutes: 58, mode: "JR Kansai Airport Rapid + walk", transfers: 1 },
};

export const PLACE_MINUTES: Record<string, Record<string, number>> = {
  "Kyoto Station": {
    "place-fushimi-inari": 15,
    "place-kinkakuji": 40,
    "place-arashiyama-grove": 35,
    "place-gion": 15,
    "place-nishiki": 12,
    "place-kiyomizu": 20,
    "place-osaka-castle": 50,
    "place-dotonbori": 35,
    "place-usj": 55,
    "place-kuromon": 35,
    "place-shinsaibashi": 35,
  },
  "Shijo-Karasuma": {
    "place-fushimi-inari": 20,
    "place-kinkakuji": 25,
    "place-arashiyama-grove": 30,
    "place-gion": 10,
    "place-nishiki": 5,
    "place-kiyomizu": 15,
    "place-osaka-castle": 55,
    "place-dotonbori": 40,
    "place-usj": 60,
    "place-kuromon": 40,
    "place-shinsaibashi": 40,
  },
  "Gion & Higashiyama": {
    "place-fushimi-inari": 15,
    "place-kinkakuji": 35,
    "place-arashiyama-grove": 40,
    "place-gion": 2,
    "place-nishiki": 12,
    "place-kiyomizu": 8,
    "place-osaka-castle": 60,
    "place-dotonbori": 45,
    "place-usj": 65,
    "place-kuromon": 45,
    "place-shinsaibashi": 45,
  },
  "Arashiyama": {
    "place-fushimi-inari": 40,
    "place-kinkakuji": 25,
    "place-arashiyama-grove": 3,
    "place-gion": 40,
    "place-nishiki": 35,
    "place-kiyomizu": 45,
    "place-osaka-castle": 70,
    "place-dotonbori": 55,
    "place-usj": 75,
    "place-kuromon": 55,
    "place-shinsaibashi": 55,
  },
  "Namba & Shinsaibashi": {
    "place-fushimi-inari": 45,
    "place-kinkakuji": 60,
    "place-arashiyama-grove": 65,
    "place-gion": 45,
    "place-nishiki": 40,
    "place-kiyomizu": 40,
    "place-osaka-castle": 20,
    "place-dotonbori": 5,
    "place-usj": 25,
    "place-kuromon": 8,
    "place-shinsaibashi": 3,
  },
  "Umeda": {
    "place-fushimi-inari": 50,
    "place-kinkakuji": 65,
    "place-arashiyama-grove": 70,
    "place-gion": 50,
    "place-nishiki": 45,
    "place-kiyomizu": 45,
    "place-osaka-castle": 20,
    "place-dotonbori": 20,
    "place-usj": 15,
    "place-kuromon": 22,
    "place-shinsaibashi": 18,
  },
};

// Direct neighbourhood-to-neighbourhood transfer times (used for hotel-change / move analysis).
export const NEIGHBOURHOOD_TRANSFER_MINUTES: Record<string, Record<string, number>> = {
  "Kyoto Station": { "Shijo-Karasuma": 12, "Gion & Higashiyama": 20, "Arashiyama": 30, "Namba & Shinsaibashi": 35, "Umeda": 30 },
  "Shijo-Karasuma": { "Kyoto Station": 12, "Gion & Higashiyama": 12, "Arashiyama": 28, "Namba & Shinsaibashi": 42, "Umeda": 38 },
  "Gion & Higashiyama": { "Kyoto Station": 20, "Shijo-Karasuma": 12, "Arashiyama": 38, "Namba & Shinsaibashi": 50, "Umeda": 45 },
  "Arashiyama": { "Kyoto Station": 30, "Shijo-Karasuma": 28, "Gion & Higashiyama": 38, "Namba & Shinsaibashi": 60, "Umeda": 55 },
  "Namba & Shinsaibashi": { "Kyoto Station": 35, "Shijo-Karasuma": 42, "Gion & Higashiyama": 50, "Arashiyama": 60, "Umeda": 12 },
  "Umeda": { "Kyoto Station": 30, "Shijo-Karasuma": 38, "Gion & Higashiyama": 45, "Arashiyama": 55, "Namba & Shinsaibashi": 12 },
};

function hashJitter(id: string, spread: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % (spread * 2 + 1)) - spread;
}

function burdenFromMinutes(minutes: number, walkMinutes: number): "low" | "moderate" | "high" {
  if (minutes <= 20 && walkMinutes <= 8) return "low";
  if (minutes <= 45) return "moderate";
  return "high";
}

function luggageFromMinutes(minutes: number, transfers: number): "easy" | "moderate" | "hard" {
  if (minutes <= 25 && transfers === 0) return "easy";
  if (minutes <= 60 && transfers <= 1) return "moderate";
  return "hard";
}

export function estimateAirportTransport(hotelId: string, neighbourhood: string): TransportEstimate {
  const base = AIRPORT_MINUTES[neighbourhood];
  const minutes = Math.max(15, base.minutes + hashJitter(hotelId + "-air", 6));
  return {
    minutes,
    mode: base.mode,
    transfers: base.transfers,
    walkingBurden: burdenFromMinutes(minutes, 5),
    luggageDifficulty: luggageFromMinutes(minutes, base.transfers),
  };
}

export function estimatePlaceTransport(hotelId: string, neighbourhood: string, placeId: string): TransportEstimate {
  const base = PLACE_MINUTES[neighbourhood][placeId];
  const minutes = Math.max(3, base + hashJitter(hotelId + placeId, 4));
  const transfers = minutes > 45 ? 1 : 0;
  return {
    minutes,
    mode: minutes <= 10 ? "walk" : "train/bus",
    transfers,
    walkingBurden: burdenFromMinutes(minutes, minutes <= 10 ? minutes : 5),
    luggageDifficulty: luggageFromMinutes(minutes, transfers),
  };
}

export function neighbourhoodTransferMinutes(from: string, to: string): number {
  if (from === to) return 0;
  return NEIGHBOURHOOD_TRANSFER_MINUTES[from][to];
}
