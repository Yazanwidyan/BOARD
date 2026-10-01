import { getCollectionById, getCollectionProgress } from './collections';

// Derived, not stored — always computed live from real local state so a
// badge's earned/unearned status can never drift out of sync with the data
// it's supposedly based on.
//
// Thresholds go up to 1500 on purpose, well past the current 250-movie
// catalog — they're future-proofed for when the catalog grows rather than
// capped at what's earnable today, so the top tiers stay real goals instead
// of being quietly redefined down to fit the current dataset.
const WATCHED_TIERS = [
  { id: 'first-watch', label: 'First Watch', threshold: 1 },
  { id: 'movie-buff', label: 'Movie Buff', threshold: 10 },
  { id: 'film-fan', label: 'Film Fan', threshold: 50 },
  { id: 'cinephile', label: 'Cinephile', threshold: 100 },
  { id: 'completionist', label: 'Completionist', threshold: 250 },
  { id: 'archivist', label: 'Archivist', threshold: 500 },
  { id: 'marathoner', label: 'Marathoner', threshold: 1000 },
  { id: 'cinema-legend', label: 'Legend of Cinema', threshold: 1500 },
];

// "Reviews" map to the star rating a user leaves on a watched movie — the
// app has no separate text-review feature, and a rating is the real signal
// of "this person weighed in on this movie" that already exists.
const CRITIC_TIERS = [
  { id: 'amateur-critic', label: 'Amateur Critic', threshold: 5 },
  { id: 'rising-critic', label: 'Rising Critic', threshold: 25 },
  { id: 'trusted-critic', label: 'Trusted Critic', threshold: 100 },
  { id: 'certified-critic', label: 'Certified Critic', threshold: 250 },
  { id: 'veteran-critic', label: 'Veteran Critic', threshold: 500 },
  { id: 'elite-critic', label: 'Elite Critic', threshold: 750 },
  { id: 'master-critic', label: 'Master Critic', threshold: 1000 },
  { id: 'legendary-critic', label: 'Legendary Critic', threshold: 1500 },
];

// How many whole collections (franchises, decades, genres) have been fully
// watched — a different kind of progress than raw volume, rewarding
// finishing a real, bounded set rather than just watching a lot.
const COLLECTION_TIERS = [
  { id: 'collector', label: 'Collector', threshold: 1 },
  { id: 'series-enthusiast', label: 'Series Enthusiast', threshold: 3 },
  { id: 'set-completionist', label: 'Set Completionist', threshold: 8 },
  { id: 'master-curator', label: 'Master Curator', threshold: 20 },
];

// Completed challenges — a different axis of engagement than raw watch
// volume: taking on and finishing what BOARD suggests, not just watching.
const CHALLENGE_TIERS = [
  { id: 'challenge-accepted', label: 'Challenge Accepted', threshold: 1 },
  { id: 'challenge-hunter', label: 'Challenge Hunter', threshold: 25 },
  { id: 'challenge-master', label: 'Challenge Master', threshold: 100 },
];

// Counts DISTINCT movies rewatched at least once, not total rewatch volume
// — rewarding breadth ("how many different movies you loved enough to
// watch again") rather than letting one endlessly-rewatched favorite climb
// the ladder alone.
const REWATCH_TIERS = [
  { id: 'rewatcher', label: 'Rewatcher', threshold: 1 },
  { id: 'comfort-viewer', label: 'Comfort Viewer', threshold: 10 },
  { id: 'devoted-fan', label: 'Devoted Fan', threshold: 25 },
];

// A few specific franchise collections get their own named badge on top of
// the generic ladder above — a nicer payoff for finishing something
// specific ("Middle-earth Complete") than just another number ticking up.
const MARQUEE_COLLECTIONS = [
  { collectionId: 'franchise-the-lord-of-the-rings', id: 'marquee-lotr', label: 'Middle-earth Complete' },
  { collectionId: 'franchise-harry-potter', id: 'marquee-harry-potter', label: 'Hogwarts Graduate' },
  { collectionId: 'franchise-toy-story', id: 'marquee-toy-story', label: 'To Infinity and Beyond' },
  { collectionId: 'franchise-marvel-cinematic-universe', id: 'marquee-mcu', label: 'Assembled' },
];

const buildTierBadges = (tiers, category, count) => tiers.map((tier) => ({
  ...tier,
  category,
  progress: count,
  earned: count >= tier.threshold,
}));

const buildMarqueeBadges = (watchedIds) => MARQUEE_COLLECTIONS
  .map(({ collectionId, id, label }) => {
    const collection = getCollectionById(collectionId);
    if (!collection) return null;
    const { watchedCount, total, progress } = getCollectionProgress(collection, watchedIds);
    return {
      id,
      label,
      category: 'collections',
      threshold: total,
      progress: watchedCount,
      earned: progress === 1,
    };
  })
  .filter(Boolean);

export const getBadges = ({
  watchedCount,
  ratedCount,
  queuedCount,
  completedCollectionsCount,
  completedChallengesCount = 0,
  rewatchedCount = 0,
  watchedIds,
}) => ([
  ...buildTierBadges(WATCHED_TIERS, 'watched', watchedCount),
  ...buildTierBadges(CRITIC_TIERS, 'critic', ratedCount),
  {
    id: 'curator',
    label: 'Curator',
    category: 'watchlist',
    threshold: 10,
    progress: queuedCount,
    earned: queuedCount >= 10,
  },
  ...buildTierBadges(COLLECTION_TIERS, 'collections', completedCollectionsCount),
  ...buildTierBadges(CHALLENGE_TIERS, 'challenges', completedChallengesCount),
  ...buildTierBadges(REWATCH_TIERS, 'watched', rewatchedCount),
  ...buildMarqueeBadges(watchedIds),
]);

// Which badges flipped from unearned to earned between two snapshots of
// the same params shape getBadges() takes — the one thing that makes "you
// just earned this" a knowable moment even though badges themselves are
// pure derived booleans with no earned-at timestamp. Callers snapshot
// params right before and right after whatever action might move a count
// (a watch, a rating, a challenge completing).
export const getNewlyEarnedBadges = (beforeParams, afterParams) => {
  const before = getBadges(beforeParams);
  const after = getBadges(afterParams);
  const earnedBefore = new Set(
    before.filter((badge) => badge.earned).map((badge) => badge.id),
  );
  return after.filter(
    (badge) => badge.earned && !earnedBefore.has(badge.id),
  );
};

// No earn-timestamp is tracked (badges are pure derived booleans, same as
// everything else here), so "latest" is approximated as the single most
// demanding badge currently earned — a reasonable stand-in, not a claim
// about exactly when it was unlocked.
export const getLatestBadge = (badges) => {
  const earned = badges.filter((badge) => badge.earned);
  if (earned.length === 0) return null;
  return earned.reduce((best, badge) => (
    badge.threshold > best.threshold ? badge : best
  ));
};

export default getBadges;
