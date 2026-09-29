// A solo progression ladder, not a real competitive league — there's no
// backend or other players to rank against, just a composite score of real
// local activity mapped onto familiar ranked-tier language. The formula is
// intentionally simple and shown to the user (see LeagueScreen/sheet) rather
// than hidden, since there's no deeper signal behind it to obscure.
export const WATCHED_POINTS = 2;
export const RATED_POINTS = 3;
export const QUEUED_POINTS = 1;
export const COLLECTION_POINTS = 25;

export const getLeagueScore = ({
  watchedCount,
  ratedCount,
  queuedCount,
  completedCollectionsCount = 0,
}) =>
  watchedCount * WATCHED_POINTS
  + ratedCount * RATED_POINTS
  + queuedCount * QUEUED_POINTS
  + completedCollectionsCount * COLLECTION_POINTS;

// Same 1500 ceiling the badge ladders use — aspirational/future-proofed
// past what the current 250-movie catalog can actually produce, rather than
// quietly redefined down to fit it.
export const TIERS = [
  { tier: 'Bronze', color: '#C97C4B', min: 0 },
  { tier: 'Silver', color: '#B9BBD2', min: 100 },
  { tier: 'Gold', color: '#E8B94E', min: 300 },
  { tier: 'Platinum', color: '#7FE0D6', min: 600 },
  { tier: 'Diamond', color: '#8D9FFF', min: 1000 },
  { tier: 'Legend', color: '#8D60E2', min: 1500 },
];

const SUB_RANKS = ['III', 'II', 'I'];

export const getLeagueRank = ({
  watchedCount,
  ratedCount,
  queuedCount,
  completedCollectionsCount = 0,
}) => {
  const score = getLeagueScore({
    watchedCount,
    ratedCount,
    queuedCount,
    completedCollectionsCount,
  });

  let tierIndex = 0;
  for (let i = 0; i < TIERS.length; i += 1) {
    if (score >= TIERS[i].min) tierIndex = i;
  }
  const tier = TIERS[tierIndex];
  const nextTier = TIERS[tierIndex + 1];

  // Top tier has no sub-ranks and nothing further to progress toward.
  if (!nextTier) {
    return {
      tier: tier.tier,
      subRank: null,
      label: tier.tier,
      color: tier.color,
      score,
      progress: 1,
      pointsToNext: 0,
      nextLabel: null,
    };
  }

  const bandSize = (nextTier.min - tier.min) / SUB_RANKS.length;
  const subIndex = Math.min(
    SUB_RANKS.length - 1,
    Math.floor((score - tier.min) / bandSize),
  );
  const subMin = tier.min + subIndex * bandSize;
  const subMax = subIndex === SUB_RANKS.length - 1 ? nextTier.min : subMin + bandSize;
  const progress = Math.max(0, Math.min(1, (score - subMin) / (subMax - subMin)));
  const nextLabel = subIndex < SUB_RANKS.length - 1
    ? `${tier.tier} ${SUB_RANKS[subIndex + 1]}`
    : nextTier.tier;

  return {
    tier: tier.tier,
    subRank: SUB_RANKS[subIndex],
    label: `${tier.tier} ${SUB_RANKS[subIndex]}`,
    color: tier.color,
    score,
    progress,
    pointsToNext: Math.ceil(subMax - score),
    nextLabel,
  };
};

export default getLeagueRank;
