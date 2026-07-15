// Minimal parser for Google Maps place links, used by the "add place" and
// "import hotel" flows. Extracts a human-readable name without calling any
// external API (no Google Maps key is configured for this MVP prototype).
export function parseMapsLink(input: string): { name: string } | { error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { error: "Please paste a Google Maps link or place name." };

  const isUrl = /^https?:\/\//i.test(trimmed);
  if (!isUrl) {
    return { name: trimmed };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { error: "That doesn't look like a valid link." };
  }
  if (!/google\.[a-z.]+$/i.test(url.hostname.replace(/^maps\./, "").replace(/^www\./, ""))) {
    return { error: "Only Google Maps links are supported for place import." };
  }

  const placeMatch = url.pathname.match(/\/place\/([^/]+)/);
  if (placeMatch) {
    const name = decodeURIComponent(placeMatch[1]).replace(/\+/g, " ");
    return { name };
  }

  const qParam = url.searchParams.get("q");
  if (qParam) return { name: qParam.replace(/\+/g, " ") };

  return { error: "Couldn't find a place name in that link — try pasting the place name directly." };
}
