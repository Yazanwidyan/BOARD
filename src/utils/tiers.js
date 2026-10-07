// Reelboard's own rating: a tier, not a number. Each watched movie can be
// placed in S / A / B / C / D / F — shown next to IMDb, Rotten Tomatoes
// and Metacritic on the movie page as "Reelboard: S".
//
// Stored as `tier` on the watched entry. Entries rated before tiers
// existed have a 0.5–5 star `rating` instead; getTier() reads those
// through starsToTier so nobody's old ratings are lost.
export const TIERS = [
  { key: "S", meaning: "All-time favorite", color: "#F8E08E" },
  { key: "A", meaning: "Loved it", color: "#A4E59B" },
  { key: "B", meaning: "Really good", color: "#8FD3F5" },
  { key: "C", meaning: "It was fine", color: "#C8C9CC" },
  { key: "D", meaning: "Not for me", color: "#F5B98F" },
  { key: "F", meaning: "Hated it", color: "#F6A0AC" },
];

const TIER_BY_KEY = Object.fromEntries(TIERS.map((tier) => [tier.key, tier]));

export const getTierInfo = (key) => TIER_BY_KEY[key] ?? null;

// 5★ → S, 4–4.5★ → A, 3–3.5★ → B, 2–2.5★ → C, 1–1.5★ → D, 0.5★ → F
export const starsToTier = (stars) => {
  if (stars == null) return null;
  if (stars >= 5) return "S";
  if (stars >= 4) return "A";
  if (stars >= 3) return "B";
  if (stars >= 2) return "C";
  if (stars >= 1) return "D";
  return "F";
};

// The tier for a watched entry (new `tier`, or converted old stars).
export const getTier = (entry) =>
  entry?.tier ?? starsToTier(entry?.rating) ?? null;

export const isRated = (entry) => getTier(entry) != null;

// For sorting: S first (0) … F last (5); unrated after everything.
export const tierRank = (entry) => {
  const key = getTier(entry);
  const index = TIERS.findIndex((tier) => tier.key === key);
  return index === -1 ? TIERS.length : index;
};

export default TIERS;
