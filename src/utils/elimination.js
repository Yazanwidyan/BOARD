import { byWeightedRating } from "./movieFilters";
// Resolves what carries into the next elimination round from what you kept,
// so the game always converges toward one movie — and never brings back
// something you passed on unless there's nothing else to go on.
// Messages are English keys, translated where they're shown (t()).
//
//   kept none        nothing grabbed you → the best few of the round come
//                    back for another look
//   kept one         that's the pick
//   kept nearly all  barely any progress (80%+) → trimmed to the
//                    highest-rated of what you kept
//   otherwise        exactly what you kept, nothing added
const RETRY_RATIO = 0.4;
const HIGH_KEEP_RATE = 0.8;
const TRIM_RATIO = 0.6;

const byRatingDesc = byWeightedRating;

export const resolveRoundOutcome = (roundSize, kept, removed) => {
  if (kept.length === 0) {
    const count = Math.max(1, Math.ceil(roundSize * RETRY_RATIO));
    return {
      nextMovies: [...removed]
        .sort(byRatingDesc)
        .slice(0, Math.min(count, removed.length)),
      message: "Let's bring a few more options.",
    };
  }

  if (kept.length === 1) {
    return { nextMovies: kept, message: "That's the one." };
  }

  if (kept.length / roundSize >= HIGH_KEEP_RATE) {
    const target = Math.max(
      2,
      Math.min(Math.ceil(roundSize * TRIM_RATIO), kept.length - 1),
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
