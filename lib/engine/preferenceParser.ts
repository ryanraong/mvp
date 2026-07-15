import { PreferenceInterpretation, PreferenceTheme } from "@/lib/types";

interface ThemeRule {
  theme: PreferenceTheme;
  category: "hotel" | "neighbourhood";
  pattern: RegExp;
  weight: number;
  explanation: string;
}

const RULES: ThemeRule[] = [
  { theme: "quiet", category: "neighbourhood", pattern: /quiet|calm|peaceful|tranquil/i, weight: 0.7, explanation: "quiet streets and low nighttime noise" },
  { theme: "traditional", category: "hotel", pattern: /traditional|authentic|ryokan|historic|tatami/i, weight: 0.75, explanation: "traditional Japanese interiors and service touches" },
  { theme: "modern", category: "hotel", pattern: /modern|contemporary|new build|renovated/i, weight: 0.6, explanation: "modern fixtures and recently renovated interiors" },
  { theme: "spacious", category: "hotel", pattern: /spacious|big room|large room|roomy|room size/i, weight: 0.6, explanation: "larger-than-typical rooms" },
  { theme: "local", category: "neighbourhood", pattern: /local|non-touristy|residential|authentic neighbourhood|off the beaten/i, weight: 0.6, explanation: "a local, non-touristy neighbourhood feel" },
  { theme: "romantic", category: "hotel", pattern: /romantic|honeymoon|anniversary|intimate|couple/i, weight: 0.65, explanation: "a romantic, intimate atmosphere" },
  { theme: "convenient", category: "neighbourhood", pattern: /convenient|easy access|close to( the)? station|walkable|transport link/i, weight: 0.6, explanation: "easy transport access and short transfers" },
  { theme: "lively", category: "neighbourhood", pattern: /lively|nightlife|vibrant|energetic|bustling/i, weight: 0.6, explanation: "an energetic, lively street scene" },
  { theme: "scenic", category: "hotel", pattern: /scenic|view|river|garden|nature|bamboo/i, weight: 0.6, explanation: "river, garden or skyline views" },
];

// "Chill" is treated as a special compound preference per the product spec's
// worked example, mapping to a small bundle of themes rather than one.
function chillBundle(sourceText: string): PreferenceInterpretation[] {
  return [
    { theme: "quiet", category: "neighbourhood", weight: 0.65, explanation: "quiet streets, away from the busiest tourist flow", sourceText, accepted: true },
    { theme: "local", category: "neighbourhood", weight: 0.55, explanation: "riverside or park access and independent cafés over chain shops", sourceText, accepted: true },
    { theme: "scenic", category: "hotel", weight: 0.5, explanation: "riverside, garden or park-adjacent settings", sourceText, accepted: true },
  ];
}

export function interpretPreferenceText(text: string): PreferenceInterpretation[] {
  const results: PreferenceInterpretation[] = [];
  const seen = new Set<PreferenceTheme>();

  if (/\bchill(ed)?\b/i.test(text)) {
    for (const r of chillBundle(text)) {
      results.push(r);
      seen.add(r.theme);
    }
  }

  for (const rule of RULES) {
    if (seen.has(rule.theme)) continue;
    if (rule.pattern.test(text)) {
      results.push({
        theme: rule.theme,
        category: rule.category,
        weight: rule.weight,
        explanation: rule.explanation,
        sourceText: text,
        accepted: true,
      });
      seen.add(rule.theme);
    }
  }

  return results;
}
