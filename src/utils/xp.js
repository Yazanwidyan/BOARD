// The single XP ledger every progression system reads from — Level and Rank
// (in league.js) both derive from the same getUserXP() total through
// different lenses (fine-grained vs. coarse/permanent), so there's nothing
// to keep in sync between them. Values are deliberately simple/round, per
// the spec's own "exact values can be mocked, the system should be
// consistent" instruction.
export const WATCH_XP = 100;
export const RATE_XP = 25;
export const COLLECTION_XP = 750;
export const BADGE_XP = 250;
// Deliberately well below WATCH_XP — a rewatch is real engagement worth
// something, but paying it out at full price would make "rewatch the same
// movie forever" a better XP farm than actually watching new things.
export const REWATCH_XP = 30;

// Only completed challenges pay out — a skipped one earns nothing.
export const getChallengeXP = (history) =>
  history
    .filter((entry) => entry.status === 'completed')
    .reduce((sum, entry) => sum + entry.xpReward, 0);

// Only the rewatches count, not the first watch (that's WATCH_XP's job) —
// watchCount is absent on entries from before rewatching existed, treated
// as 1 (no rewatches yet) the same way every other reader does.
export const getRewatchXP = (watched) =>
  watched.reduce((sum, entry) => sum + (((entry.watchCount ?? 1) - 1) * REWATCH_XP), 0);

export const getCompletedChallengesCount = (history) =>
  history.filter((entry) => entry.status === 'completed').length;

export const DIFFICULTY = {
  EASY: { label: 'Easy', min: 100, max: 250 },
  MEDIUM: { label: 'Medium', min: 300, max: 600 },
  HARD: { label: 'Hard', min: 700, max: 1200 },
  EXTREME: { label: 'Extreme', min: 1500, max: 2000 },
};

// Sums every real, derived signal into one number — nothing here is stored,
// it's recomputed from watched/rated/challenge-history/collections/badges
// each time, same as every other system built this session.
export const getUserXP = ({
  watchedCount,
  ratedCount,
  challengeXP = 0,
  rewatchXP = 0,
  completedCollectionsCount,
  earnedBadgeCount,
}) => (
  watchedCount * WATCH_XP
  + ratedCount * RATE_XP
  + challengeXP
  + rewatchXP
  + completedCollectionsCount * COLLECTION_XP
  + earnedBadgeCount * BADGE_XP
);

// XP required to clear a given level — grows steadily so higher levels take
// meaningfully longer, without needing a lookup table.
const levelRequirement = (level) => 800 + (level - 1) * 90;

const LEVEL_NAMES = [
  { through: 5, name: 'Newcomer' },
  { through: 12, name: 'Movie Fan' },
  { through: 20, name: 'Film Buff' },
  { through: 30, name: 'Cinephile' },
  { through: 45, name: 'Film Expert' },
  { through: Infinity, name: 'Cinema Legend' },
];

const getLevelName = (level) => (
  LEVEL_NAMES.find(({ through }) => level <= through).name
);

// Walks up from level 1, spending XP on each level's requirement, until
// there's not enough left for the next one — that's the current level, and
// what's left over is progress into it.
export const getLevel = (xp) => {
  let level = 1;
  let remaining = xp;
  let required = levelRequirement(level);
  while (remaining >= required) {
    remaining -= required;
    level += 1;
    required = levelRequirement(level);
  }
  return {
    level,
    name: getLevelName(level),
    currentXP: remaining,
    requiredXP: required,
    progress: remaining / required,
  };
};

export default getUserXP;
