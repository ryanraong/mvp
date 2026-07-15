import { AccommodationSegment } from "@/lib/types";

// Proposed accommodation segments for the validation trip
// (Kyoto & Osaka, 27 October - 10 November 2026, 14 nights).
export const SEED_SEGMENTS: AccommodationSegment[] = [
  {
    id: "seg-1",
    destination: "Kyoto",
    startDate: "2026-10-27",
    endDate: "2026-10-30",
    role: "Arrival base",
    rationale:
      "Kyoto Station has the fastest, most reliable link to KIX (JR Haruka express) and puts Fushimi Inari within a short train ride, so the first jet-lagged days involve minimal transfers.",
    suggestedNeighbourhoods: ["Kyoto Station", "Shijo-Karasuma"],
    status: "proposed",
  },
  {
    id: "seg-2",
    destination: "Kyoto",
    startDate: "2026-10-30",
    endDate: "2026-11-03",
    role: "Traditional experience",
    rationale:
      "Gion & Higashiyama's preserved streetscape and walkable access to Kiyomizu-dera offer a meaningfully different, more atmospheric experience than the station area — worth a dedicated hotel change.",
    suggestedNeighbourhoods: ["Gion & Higashiyama", "Shijo-Karasuma"],
    status: "proposed",
  },
  {
    id: "seg-3",
    destination: "Kyoto",
    startDate: "2026-11-03",
    endDate: "2026-11-07",
    role: "Relaxed stay",
    rationale:
      "Arashiyama is noticeably quieter in the evenings once day-trippers leave, giving a relaxed riverside counterpoint to the two busier Kyoto stays, with the bamboo grove and river on foot.",
    suggestedNeighbourhoods: ["Arashiyama", "Gion & Higashiyama"],
    status: "proposed",
  },
  {
    id: "seg-4",
    destination: "Osaka",
    startDate: "2026-11-07",
    endDate: "2026-11-10",
    role: "Departure base",
    rationale:
      "Namba gives a direct Nankai Rapi:t link to KIX for departure day and puts Dotonbori's nightlife and food scene within walking distance for the trip's final stretch.",
    suggestedNeighbourhoods: ["Namba & Shinsaibashi", "Umeda"],
    status: "proposed",
  },
];
