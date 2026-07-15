import { ScoredOffer } from "@/lib/types";
import { WEIGHTS } from "@/lib/engine/scoring";

const LABELS: Record<keyof typeof WEIGHTS, string> = {
  roomFit: "room fit",
  price: "price and value",
  transport: "itinerary and transport",
  neighbourhood: "neighbourhood fit",
  experience: "experience fit",
  review: "review quality and risk",
  flexibility: "booking flexibility",
};

export interface WinnerExplanation {
  recommendedRoom: string;
  runnerUpRoom: string;
  priceDifference: number;
  mainBenefit: string;
  mainSacrifice: string;
  preferenceShiftStatement: string;
  statement: string;
}

export function explainWinner(winner: ScoredOffer, runnerUp: ScoredOffer | undefined): WinnerExplanation | undefined {
  if (!runnerUp) return undefined;

  const keys = Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[];
  const diffs = keys.map((k) => ({ key: k, diff: (winner.subscores[k] - runnerUp.subscores[k]) * WEIGHTS[k] }));
  diffs.sort((a, b) => b.diff - a.diff);
  const topBenefit = diffs[0];
  const topSacrifice = [...diffs].sort((a, b) => a.diff - b.diff)[0];

  const priceDifference = winner.totalPriceForSegment - runnerUp.totalPriceForSegment;
  const recommendedRoom = `${winner.hotel.name}, ${winner.room.name}`;
  const runnerUpRoom = `${runnerUp.hotel.name}, ${runnerUp.room.name}`;

  const mainBenefit = `${winner.hotel.name} wins mainly on ${LABELS[topBenefit.key]}.`;
  const mainSacrifice =
    topSacrifice.diff < 0
      ? `${runnerUp.hotel.name} does better on ${LABELS[topSacrifice.key]} — that's the main trade-off you're accepting.`
      : `There is no significant category where ${runnerUp.hotel.name} outperforms ${winner.hotel.name}.`;

  const preferenceShiftStatement =
    topSacrifice.diff < 0
      ? `${runnerUp.hotel.name} would become the better choice if you weighted ${LABELS[topSacrifice.key]} more heavily than ${LABELS[topBenefit.key]}.`
      : `No small priority change would flip this recommendation — ${winner.hotel.name} leads across most criteria.`;

  const priceSentence =
    priceDifference === 0
      ? "at the same total price"
      : priceDifference > 0
      ? `for ${Math.abs(priceDifference).toFixed(0)} more over the stay`
      : `while costing ${Math.abs(priceDifference).toFixed(0)} less over the stay`;

  const statement = `${winner.hotel.name} wins for this stay because it provides better ${LABELS[topBenefit.key]} ${priceSentence} than ${runnerUp.hotel.name}.`;

  return {
    recommendedRoom,
    runnerUpRoom,
    priceDifference,
    mainBenefit,
    mainSacrifice,
    preferenceShiftStatement,
    statement,
  };
}
