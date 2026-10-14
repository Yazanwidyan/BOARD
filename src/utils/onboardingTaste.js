import { MOVIES } from "../data/movies";
import { DIMENSIONS, getVibe } from "../data/vibes";

// The taste side of onboarding (see OnboardingScreen): which posters to
// ask about, which "this or that" pairs to ask, and what to call the
// watcher at the end.

const byTitle = (title) => MOVIES.find((movie) => movie.title === title);

// Films most people have actually seen, across every kind of taste — the
// "What have you seen?" grid draws from these first, so it isn't a wall
// of 1940s classics.
const WELL_KNOWN = [
  "Toy Story",
  "The Dark Knight",
  "Titanic",
  "Inception",
  "Get Out",
  "Mean Girls",
  "Spirited Away",
  "Mad Max: Fury Road",
  "The Lion King",
  "Pulp Fiction",
  "Forrest Gump",
  "The Shawshank Redemption",
  "Jurassic Park",
  "The Matrix",
  "Star Wars",
  "Harry Potter and the Sorcerer's Stone",
  "Finding Nemo",
  "Shrek",
  "The Avengers",
  "Interstellar",
  "La La Land",
  "Parasite",
  "Back to the Future",
  "Home Alone",
  "Notting Hill",
  "Superbad",
  "Gone Girl",
  "The Conjuring",
  "Barbie",
  "Oppenheimer",
  "Avengers: Endgame",
  "Up",
  "Coco",
  "The Godfather",
  "Fight Club",
  "Se7en",
  "Gladiator",
  "The Lord of the Rings: The Fellowship of the Ring",
  "Spider-Man: Into the Spider-Verse",
  "Top Gun: Maverick",
  "Knives Out",
  "John Wick",
  "A Quiet Place",
  "It",
  "Crazy Rich Asians",
  "Dune",
  "Everything Everywhere All at Once",
  "Grease",
  "The Sixth Sense",
  "Shutter Island",
  "Guardians of the Galaxy",
  "Inside Out",
  "Men in Black",
  "Pirates of the Caribbean: The Curse of the Black Pearl",
];

// Looked up in the catalog when needed — it loads from the server after
// start-up, so not at module load.
const wellKnownMovies = () => WELL_KNOWN.map(byTitle).filter(Boolean);

const distance = (a, b) =>
  Math.sqrt(
    getVibe(a.id).dims.reduce(
      (sum, value, index) => sum + (value - getVibe(b.id).dims[index]) ** 2,
      0,
    ),
  );

// The first grid: `count` well-known films as different from each other
// as possible (farthest-point sampling in Taste DNA space), from a random
// start so replays differ.
export const pickSpreadMovies = (count, excludeIds = new Set()) => {
  const pool = wellKnownMovies().filter((movie) => !excludeIds.has(movie.id));
  if (pool.length === 0) return [];
  const chosen = [pool[Math.floor(Math.random() * pool.length)]];
  while (chosen.length < Math.min(count, pool.length)) {
    let best = null;
    let bestDistance = -1;
    pool.forEach((movie) => {
      if (chosen.includes(movie)) return;
      const nearest = Math.min(...chosen.map((other) => distance(movie, other)));
      if (nearest > bestDistance) {
        bestDistance = nearest;
        best = movie;
      }
    });
    chosen.push(best);
  }
  return chosen;
};

// "Show more": films like the ones you've marked seen (so a thriller fan
// gets more thrillers to recognise), well-known first; before anything's
// marked, just more spread.
export const pickMoreMovies = (count, shownIds, seenMovies) => {
  if (seenMovies.length === 0) return pickSpreadMovies(count, shownIds);
  const closest = (movie) =>
    Math.min(...seenMovies.map((seen) => distance(movie, seen)));
  const wellKnownIds = new Set(wellKnownMovies().map((movie) => movie.id));
  return MOVIES.filter((movie) => !shownIds.has(movie.id))
    .map((movie) => ({
      movie,
      score: closest(movie) - (wellKnownIds.has(movie.id) ? 1.5 : 0),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map(({ movie }) => movie);
};

// "This or that": per dimension, two pairs of [low, high] films with what
// each side means. Neither needs to have been seen — it's about appetite.
const PAIRS = {
  dark: [
    ["The Grand Budapest Hotel", "Se7en"],
    ["Toy Story", "The Silence of the Lambs"],
  ],
  pace: [
    ["Arrival", "Mad Max: Fury Road"],
    ["Lost in Translation", "John Wick"],
  ],
  mind: [
    ["Mean Girls", "Inception"],
    ["Notting Hill", "Memento"],
  ],
  heavy: [
    ["Ferris Bueller's Day Off", "Schindler's List"],
    ["Superbad", "The Green Mile"],
  ],
  scale: [
    ["Past Lives", "The Lord of the Rings: The Return of the King"],
    ["Whiplash", "Avengers: Endgame"],
  ],
  unreal: [
    ["The Social Network", "Spirited Away"],
    ["Goodfellas", "Harry Potter and the Sorcerer's Stone"],
  ],
};
const SIDE_LABELS = {
  dark: ["Light & fun", "Dark & tense"],
  pace: ["Slow burn", "Non-stop"],
  mind: ["Easy watch", "Mind-bending"],
  heavy: ["Feel-good", "Gut-punch"],
  scale: ["Small & personal", "Huge & epic"],
  unreal: ["Real world", "Other worlds"],
};
const QUESTION_COUNT = 5;

// Which questions to ask: the dimensions we know least about first — those
// your tiers so far don't lean either way on — skipping any pair whose
// films you've marked (they'd be a different question).
export const pickQuestions = (fingerprint, markedIds = new Set()) =>
  DIMENSIONS.map((dimension, index) => ({
    dimension,
    index,
    certainty: fingerprint ? Math.abs(fingerprint[index] - 3) : 0,
  }))
    .sort((a, b) => a.certainty - b.certainty || Math.random() - 0.5)
    .slice(0, QUESTION_COUNT)
    .map(({ dimension, index }) => {
      const options = PAIRS[dimension.key]
        .map(([low, high]) => [byTitle(low), byTitle(high)])
        .filter(
          ([low, high]) =>
            low && high && !markedIds.has(low.id) && !markedIds.has(high.id),
        );
      const pair = options[0] ??
        PAIRS[dimension.key].map(([low, high]) => [byTitle(low), byTitle(high)])[0];
      return {
        key: dimension.key,
        index,
        low: { movie: pair[0], label: SIDE_LABELS[dimension.key][0] },
        high: { movie: pair[1], label: SIDE_LABELS[dimension.key][1] },
      };
    });

// What kind of watcher the fingerprint describes: every type scores how
// well it fits (from `l`, the fingerprint − 3 per dimension, −2 … 2) and
// the best one wins — "The All-Rounder" when nothing stands out.
const ARCHETYPES = [
  {
    name: "The Puzzle Solver",
    line: "Dark, twisty and clever — you like a film that makes you work.",
    score: (l) => l.mind * 1.2 + l.dark * 0.5,
  },
  {
    name: "The Adrenaline Junkie",
    line: "Fast and tense, with no time to breathe.",
    score: (l) => l.pace * 1.1 + l.dark * 0.3,
  },
  {
    name: "The Deep Feeler",
    line: "You want a film that leaves a mark.",
    score: (l) => l.heavy - l.pace * 0.3,
  },
  {
    name: "The World Traveler",
    line: "Big worlds, bigger adventures.",
    score: (l) => l.unreal + l.scale * 0.5,
  },
  {
    name: "The Comfort Watcher",
    line: "Warm, funny and easy — films that feel like a hug.",
    score: (l) => -l.dark * 0.8 - l.heavy * 0.6 - l.mind * 0.3,
  },
  {
    name: "The Slow-Burn Cinephile",
    line: "Patient, quiet films that reward you for staying.",
    score: (l) => -l.pace + l.heavy * 0.3,
  },
  {
    name: "The Night Owl",
    line: "The darker the better.",
    score: (l) => l.dark * 0.85,
  },
  {
    name: "The Spectacle Seeker",
    line: "Go big or go home.",
    score: (l) => l.scale + l.pace * 0.3,
  },
];
const ALL_ROUNDER = {
  name: "The All-Rounder",
  line: "A bit of everything, and open to anything.",
};
const STANDS_OUT = 0.6;

export const getArchetype = (fingerprint) => {
  if (!fingerprint) return ALL_ROUNDER;
  const lean = Object.fromEntries(
    DIMENSIONS.map((dimension, index) => [
      dimension.key,
      fingerprint[index] - 3,
    ]),
  );
  const best = ARCHETYPES.map((archetype) => ({
    archetype,
    score: archetype.score(lean),
  })).sort((a, b) => b.score - a.score)[0];
  return best.score >= STANDS_OUT ? best.archetype : ALL_ROUNDER;
};
