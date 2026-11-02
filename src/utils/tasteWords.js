import { t } from "../i18n";

// Taste in words people read at a glance — not percentages from a few taps
// (the engine's numbers stay inside it).

// How well a film fits you, in a word, from the engine's 0–100 match.
export const matchWord = (match) => {
  if (match == null) return null;
  if (match >= 85) return t("Strong match");
  if (match >= 70) return t("Good match");
  return t("Worth a try");
};

// Your taste and a friend's: a number only once you've both tiered enough
// films for one to mean something; until then, a word.
export const FRIEND_MATCH_TIERS = 10;
export const friendMatchLabel = (match, myTiered, theirTiered) => {
  if (match == null) return null;
  return myTiered >= FRIEND_MATCH_TIERS && theirTiered >= FRIEND_MATCH_TIERS ? `${match}%` : matchWord(match);
};

// How many of these watched entries have a tier.
export const countTiered = (watched = []) =>
  watched.filter((entry) => entry.tier || entry.rating != null).length;

// Your strongest leanings (components/TasteDnaBars readTasteDna's words,
// already in your language) as one sentence: "You lean toward dark,
// mind-bending films."
export const tasteSentence = (leanings) => {
  const [first, second] = leanings;
  if (!first) return t("Your taste is wide open so far.");
  if (!second) return t("You lean toward {first} films.", { first: first.word });
  return t("You lean toward {first}, {second} films.", { first: first.word, second: second.word });
};
