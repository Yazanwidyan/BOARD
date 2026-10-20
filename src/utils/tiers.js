// ReelBoard's own rating: a tier, not a number. Each watched movie can be
// placed in S / A / B / C / D / F — shown next to IMDb, Rotten Tomatoes
// and Metacritic on the movie page as "ReelBoard: S".
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

// ReelBoard's tier for a movie: everyone's tiers averaged (S = 5 … F = 0)
// and rounded to the nearest one. `counts`: { S: n, A: n, … } from
// GET /api/community/movies/:id. Null until somebody has tiered it.
export const getAverageTier = (counts) => {
  let total = 0;
  let sum = 0;
  TIERS.forEach((tier, index) => {
    const count = counts?.[tier.key] ?? 0;
    total += count;
    sum += count * (TIERS.length - 1 - index);
  });
  if (total === 0) return null;
  const score = sum / total;
  return TIERS[TIERS.length - 1 - Math.round(score)].key;
};

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

// Your S tier is your favourites, in the order you set: `order` (movie
// ids, #1 first — the profile's `topTen`) first, then any other S films,
// most recently watched first. → the S entries, in that order.
export const orderSTier = (entries, order = []) => {
  const position = new Map(order.map((id, index) => [id, index]));
  return entries
    .filter((entry) => getTier(entry) === "S")
    .sort(
      (a, b) =>
        (position.get(a.movieId) ?? Number.MAX_SAFE_INTEGER) -
          (position.get(b.movieId) ?? Number.MAX_SAFE_INTEGER) ||
        (b.timestamp ?? 0) - (a.timestamp ?? 0),
    );
};

export default TIERS;
