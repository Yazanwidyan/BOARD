// "Can we watch this with the family?" — derived from the movie's official
// US age rating (details.rated, from OMDb). Levels:
//   family — G / PG, and "Approved" (the pre-1968 Hays Code certificate:
//            classics made under strict content rules — likely fine, but
//            flagged as an older rating)
//   teen   — PG-13
//   adult  — R / NC-17
//   unknown — no rating on record
const LEVELS = {
  G: {
    level: "family",
    label: "Family friendly",
    note: "Rated G — suitable for all ages.",
  },
  PG: {
    level: "family",
    label: "Family friendly",
    note: "Rated PG — some material may need parental guidance for young kids.",
  },
  Approved: {
    level: "family",
    label: "Likely family friendly",
    note: 'An older classic (pre-1968 "Approved" rating), made under strict content rules.',
  },
  "PG-13": {
    level: "teen",
    label: "Teens 13+",
    note: "Rated PG-13 — parents strongly cautioned for kids under 13.",
  },
  R: {
    level: "adult",
    label: "Adults",
    note: "Rated R — under 17 should watch with a parent.",
  },
  "NC-17": {
    level: "adult",
    label: "Adults only",
    note: "Rated NC-17 — no one 17 and under.",
  },
};

export const getFamilyRating = (movie) =>
  LEVELS[movie?.details?.rated] ?? {
    level: "unknown",
    label: "Not rated",
    note: "No official age rating on record — check before watching with kids.",
  };

export const isFamilyFriendly = (movie) =>
  getFamilyRating(movie).level === "family";

export default getFamilyRating;
