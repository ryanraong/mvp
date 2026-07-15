// Templated phrase banks used to generate consistent, readable review-theme
// summaries from a small set of "personality tags" per mock hotel, instead of
// hand-writing prose for every property.

export const STRENGTH_PHRASES: Record<string, string> = {
  quiet: "Guests consistently describe the property as calm and quiet, even in high season.",
  traditional: "Reviewers highlight authentic interiors, wooden fittings and traditional service touches.",
  modern: "Recently renovated interiors and modern fixtures are frequently praised.",
  spacious: "Rooms are repeatedly noted as larger than typical for the area.",
  local: "Guests appreciate the neighbourhood's local, non-touristy feel.",
  romantic: "Couples frequently mention the property as a romantic, intimate stay.",
  convenient: "Proximity to the station and easy luggage access are called out repeatedly.",
  lively: "Reviewers enjoy the energetic street life just outside the property.",
  scenic: "Views of the river, garden or skyline are a recurring highlight.",
  value: "Guests consistently call out strong value for the price paid.",
  service: "Staff helpfulness and attentive service are a recurring theme.",
  central: "The central location for sightseeing is repeatedly praised.",
  view: "Room views are frequently highlighted as a strength.",
};

export const CONCERN_PHRASES: Record<string, string> = {
  "noisy-street": "Some guests note traffic or street noise, particularly on lower floors.",
  "thin-walls": "A recurring complaint is thin walls and noise from neighbouring rooms.",
  "small-bathroom": "Several reviews mention a cramped bathroom for two people.",
  "dated-decor": "A number of guests describe the decor as dated.",
  "limited-breakfast": "Breakfast variety is a repeated minor complaint.",
  "construction": "A few recent reviews mention nearby construction noise.",
  "narrow-bed": "Guests note the bed is narrower than expected for a couple.",
  "distance": "Some guests found the walk to the nearest station longer than expected.",
  "no-lift": "Guests without lift access mention stairs being a burden with luggage.",
  "front-desk": "A handful of reviews mention slow check-in service at busy times.",
};
