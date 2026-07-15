import { NeighbourhoodSummary } from "@/lib/types";

export const NEIGHBOURHOODS: NeighbourhoodSummary[] = [
  {
    name: "Kyoto Station",
    destination: "Kyoto",
    daytimeAtmosphere: "Busy transit hub with department stores, bus terminals and a constant flow of travellers.",
    eveningAtmosphere: "Well-lit and safe but functional rather than atmospheric; many chain restaurants stay open late.",
    foodAndCafeAccess: "Excellent — Isetan department store restaurant floors, ramen alley and station-level cafés.",
    touristIntensity: "high",
    quietness: "lively",
    walkability: "high",
    transportConnections: ["JR Haruka airport express", "JR Tokaido/Sanyo Shinkansen", "Kyoto City Bus terminal", "Karasuma subway line"],
  },
  {
    name: "Shijo-Karasuma",
    destination: "Kyoto",
    daytimeAtmosphere: "Kyoto's central business and shopping district, mixing office towers with traditional arcades.",
    eveningAtmosphere: "Busy with after-work diners; Pontocho's lantern-lit alleys are a short walk east.",
    foodAndCafeAccess: "Very good — Nishiki Market, department store basements, and izakaya-lined side streets.",
    touristIntensity: "moderate",
    quietness: "moderate",
    walkability: "high",
    transportConnections: ["Karasuma subway line", "Hankyu Kyoto line", "City bus routes to Gion and Kinkaku-ji"],
  },
  {
    name: "Gion & Higashiyama",
    destination: "Kyoto",
    daytimeAtmosphere: "Preserved wooden machiya streets, temples and teahouses; the most traditional streetscape in the city.",
    eveningAtmosphere: "Quiet residential lanes once shops close, with occasional glimpses of geiko heading to appointments.",
    foodAndCafeAccess: "Good but small-scale — traditional sweets shops, kaiseki restaurants, few late-night options.",
    touristIntensity: "high",
    quietness: "quiet",
    walkability: "moderate",
    transportConnections: ["Keihan Gion-Shijo station", "City bus routes", "20-minute walk to Kyoto Station"],
  },
  {
    name: "Arashiyama",
    destination: "Kyoto",
    daytimeAtmosphere: "Riverside district with the bamboo grove, temple gardens and rickshaw rides; busy at midday with day-trippers.",
    eveningAtmosphere: "Very quiet after 6pm once day-trip crowds leave; a genuinely relaxed, low-key stay.",
    foodAndCafeAccess: "Moderate — riverside cafés and a handful of independent restaurants, fewer chain options.",
    touristIntensity: "moderate",
    quietness: "quiet",
    walkability: "moderate",
    transportConnections: ["JR Sagano line", "Randen Arashiyama tram", "30-40 minutes to central Kyoto"],
  },
  {
    name: "Namba & Shinsaibashi",
    destination: "Osaka",
    daytimeAtmosphere: "Dense shopping arcades (Shinsaibashi-suji) connecting to Dotonbori's canal-side storefronts.",
    eveningAtmosphere: "Osaka's most energetic nightlife strip — neon signage, street food, bars open late.",
    foodAndCafeAccess: "Outstanding — Dotonbori street food, Kuromon Ichiba market, izakaya of every price point.",
    touristIntensity: "high",
    quietness: "lively",
    walkability: "high",
    transportConnections: ["Nankai Namba (direct Rapi:t/limited express to KIX)", "Midosuji subway line", "Osaka Metro Yotsubashi line"],
  },
  {
    name: "Umeda",
    destination: "Osaka",
    daytimeAtmosphere: "Osaka's northern business and department-store core, centred on the JR/Hankyu/Hanshin terminals.",
    eveningAtmosphere: "Corporate after-work crowd, rooftop bars, and the Umeda Sky Building skyline.",
    foodAndCafeAccess: "Very good — department store dining floors and an extensive underground restaurant network.",
    touristIntensity: "moderate",
    quietness: "moderate",
    walkability: "high",
    transportConnections: ["JR Osaka station", "Hankyu/Hanshin terminals", "Osaka Metro Midosuji/Tanimachi lines"],
  },
];

export function findNeighbourhood(name: string) {
  const n = NEIGHBOURHOODS.find((x) => x.name === name);
  if (!n) throw new Error(`Unknown neighbourhood: ${name}`);
  return n;
}
