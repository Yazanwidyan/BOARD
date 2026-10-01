// Rank — a long-term, permanent status tier, distinct from Level (see
// xp.js). Both read the same getUserXP() total; Rank just uses a much
// coarser scale and never resets, unlike a weekly league. There's no
// backend or other players to rank against — this is a solo ladder, not a
// real competitive leaderboard.
export const TIERS = [
  { tier: 'Rookie', color: '#9AA0B4', min: 0 },
  { tier: 'Bronze', color: '#C97C4B', min: 2000 },
  { tier: 'Silver', color: '#B9BBD2', min: 6000 },
  { tier: 'Gold', color: '#E8B94E', min: 15000 },
  { tier: 'Platinum', color: '#7FE0D6', min: 35000 },
  { tier: 'Diamond', color: '#8D9FFF', min: 70000 },
  { tier: 'Master', color: '#8D60E2', min: 150000 },
];

export const getRank = (xp) => {
  let tierIndex = 0;
  for (let i = 0; i < TIERS.length; i += 1) {
    if (xp >= TIERS[i].min) tierIndex = i;
  }
  const tier = TIERS[tierIndex];
  const nextTier = TIERS[tierIndex + 1];

  // Top rank has nothing further to progress toward.
  if (!nextTier) {
    return {
      tier: tier.tier,
      label: tier.tier,
      color: tier.color,
      xp,
      progress: 1,
      xpToNext: 0,
      nextLabel: null,
    };
  }

  const progress = Math.max(
    0,
    Math.min(1, (xp - tier.min) / (nextTier.min - tier.min)),
  );

  return {
    tier: tier.tier,
    label: tier.tier,
    color: tier.color,
    xp,
    progress,
    xpToNext: Math.ceil(nextTier.min - xp),
    nextLabel: nextTier.tier,
  };
};

export default getRank;
