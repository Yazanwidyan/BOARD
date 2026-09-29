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
  ...buildMarqueeBadges(watchedIds),
]);

export default getBadges;
