// Resolves what carries into the next elimination round based on how decisive
// the user was this round, so the game always converges toward one movie.
// Messages are English keys, translated where they're shown (t()).
const LOW_KEEP_RATE = 0.2;
const HIGH_KEEP_RATE = 0.8;
const PAD_TARGET_RATIO = 0.4;
const TRIM_TARGET_RATIO = 0.6;

const byRatingDesc = (a, b) => b.rating - a.rating;

export const resolveRoundOutcome = (roundSize, kept, removed) => {
  const keepRate = kept.length / roundSize;

  if (kept.length === 0) {
    const padCount = Math.max(1, Math.ceil(roundSize * PAD_TARGET_RATIO));
    return {
      nextMovies: [...removed]
        .sort(byRatingDesc)
        .slice(0, Math.min(padCount, removed.length)),
      message: "Let's bring a few more options.",
    };
  }

  if (keepRate <= LOW_KEEP_RATE) {
    const target = Math.min(
      roundSize,
      Math.max(kept.length + 1, Math.ceil(roundSize * PAD_TARGET_RATIO)),
    );
    const need = target - kept.length;
    const extra = [...removed].sort(byRatingDesc).slice(0, need);
    return {
      nextMovies: [...kept, ...extra],
      message: "Let's bring a few more options.",
    };
  }

  if (keepRate >= HIGH_KEEP_RATE && kept.length > 1) {
    const target = Math.max(
      1,
      Math.min(Math.ceil(roundSize * TRIM_TARGET_RATIO), kept.length - 1),
    );
    return {
      nextMovies: [...kept].sort(byRatingDesc).slice(0, target),
      message: "Let's narrow these down a little.",
    };
  }

  return {
    nextMovies: kept,
    message: "Nice. We've narrowed it down.",
  };
};

export default resolveRoundOutcome;
