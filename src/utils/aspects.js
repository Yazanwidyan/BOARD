// "What did you love?" / "What didn't work?" — the one-tap reasons behind a
// tier. Each nudges the taste fingerprint (see tasteEngine): `dims` moves a
// Taste DNA dimension (indices into DIMENSIONS: dark, pace, mind, heavy,
// scale, unreal) by that much, `themes` count as extra love for those
// themes, and `shorter` means long runtimes start to count against.

export const LOVED_ASPECTS = [
  { key: "twist", label: "The twist", dims: { 2: 0.8 }, themes: ["twist"] },
  { key: "story", label: "The story", dims: { 2: 0.4 } },
  { key: "acting", label: "The acting", dims: { 3: 0.3 } },
  { key: "visuals", label: "The visuals", dims: { 4: 0.8 } },
  { key: "music", label: "The music", themes: ["music"] },
  { key: "thrills", label: "The thrills", dims: { 1: 0.8 } },
  { key: "funny", label: "It was funny", dims: { 0: -0.6, 3: -0.5 } },
  { key: "emotional", label: "It got me", dims: { 3: 0.8 } },
  { key: "atmosphere", label: "The atmosphere", dims: { 1: -0.5, 0: 0.3 } },
];

export const DISLIKED_ASPECTS = [
  { key: "slow", label: "Too slow", dims: { 1: 0.8 } },
  { key: "long", label: "Too long", shorter: true },
  { key: "bleak", label: "Too bleak", dims: { 0: -0.8, 3: -0.5 } },
  { key: "confusing", label: "Too confusing", dims: { 2: -0.8 } },
  { key: "predictable", label: "Predictable", dims: { 2: 0.6 } },
  { key: "silly", label: "Too silly", dims: { 0: 0.5, 5: -0.5 } },
];

const BY_KEY = Object.fromEntries(
  [...LOVED_ASPECTS, ...DISLIKED_ASPECTS].map((aspect) => [aspect.key, aspect]),
);

export const getAspect = (key) => BY_KEY[key] ?? null;

// Which set to offer for a tier: what worked for B and up, what didn't for
// C and below.
export const aspectsForTier = (tier) =>
  ["S", "A", "B"].includes(tier) ? LOVED_ASPECTS : DISLIKED_ASPECTS;
