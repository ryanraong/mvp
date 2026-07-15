import { HOTELS } from "@/lib/data/hotels";
import { ImportedHotelStatus } from "@/lib/types";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function matchImportedHotel(rawName: string, destination: string): { hotelId?: string; status: ImportedHotelStatus } {
  const target = normalize(rawName);
  const candidates = HOTELS.filter((h) => h.destination.toLowerCase() === destination.toLowerCase());

  const exact = candidates.find((h) => normalize(h.name) === target);
  if (exact) return { hotelId: exact.id, status: "matched" };

  const partial = candidates.find((h) => normalize(h.name).includes(target) || target.includes(normalize(h.name)));
  if (partial) return { hotelId: partial.id, status: "needs-confirmation" };

  const wordOverlap = candidates.find((h) => {
    const hWords = new Set(h.name.toLowerCase().split(/\s+/));
    const tWords = rawName.toLowerCase().split(/\s+/);
    return tWords.some((w) => w.length > 3 && hWords.has(w));
  });
  if (wordOverlap) return { hotelId: wordOverlap.id, status: "needs-confirmation" };

  return { status: "unmatched" };
}
