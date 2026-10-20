import { MOVIES, getMovieById } from "../data/movies";
import { DIMENSIONS, getVibe } from "../data/vibes";

// The taste side of onboarding (see OnboardingScreen): which posters to
// ask about, which "this or that" pairs to ask, and what to call the
// watcher at the end.

// Films most people have actually seen, across every kind of taste — the
// "What have you seen?" grid draws from these first, so it isn't a wall
// of 1940s classics. By TMDB id; onboarding fetches them all first
// (ONBOARDING_MOVIE_IDS).
const WELL_KNOWN = [
  "862", // Toy Story
  "155", // The Dark Knight
  "597", // Titanic
  "27205", // Inception
  "419430", // Get Out
  "10625", // Mean Girls
  "129", // Spirited Away
  "76341", // Mad Max: Fury Road
  "8587", // The Lion King
  "680", // Pulp Fiction
  "13", // Forrest Gump
  "278", // The Shawshank Redemption
  "329", // Jurassic Park
  "603", // The Matrix
  "11", // Star Wars
  "671", // Harry Potter and the Philosopher's Stone
  "12", // Finding Nemo
  "808", // Shrek
  "24428", // The Avengers
  "157336", // Interstellar
  "313369", // La La Land
  "496243", // Parasite
  "105", // Back to the Future
  "771", // Home Alone
  "509", // Notting Hill
  "8363", // Superbad
  "210577", // Gone Girl
  "138843", // The Conjuring
  "346698", // Barbie
  "872585", // Oppenheimer
  "299534", // Avengers: Endgame
  "14160", // Up
  "354912", // Coco
  "238", // The Godfather
  "550", // Fight Club
  "807", // Se7en
  "98", // Gladiator
  "120", // The Lord of the Rings: The Fellowship of the Ring
  "324857", // Spider-Man: Into the Spider-Verse
  "361743", // Top Gun: Maverick
  "546554", // Knives Out
  "245891", // John Wick
  "447332", // A Quiet Place
  "346364", // It
  "455207", // Crazy Rich Asians
  "438631", // Dune
  "545611", // Everything Everywhere All at Once
  "621", // Grease
  "745", // The Sixth Sense
  "11324", // Shutter Island
  "118340", // Guardians of the Galaxy
  "150540", // Inside Out
  "607", // Men in Black
  "22", // Pirates of the Caribbean: The Curse of the Black Pearl
];

const wellKnownMovies = () => WELL_KNOWN.map(getMovieById).filter(Boolean);

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
    ["120467", "807"], // The Grand Budapest Hotel · Se7en
    ["862", "274"], // Toy Story · The Silence of the Lambs
  ],
  pace: [
    ["329865", "76341"], // Arrival · Mad Max: Fury Road
    ["153", "245891"], // Lost in Translation · John Wick
  ],
  mind: [
    ["10625", "27205"], // Mean Girls · Inception
    ["509", "77"], // Notting Hill · Memento
  ],
  heavy: [
    ["9377", "424"], // Ferris Bueller's Day Off · Schindler's List
    ["8363", "497"], // Superbad · The Green Mile
  ],
  scale: [
    ["666277", "122"], // Past Lives · The Lord of the Rings: The Return of the King
    ["244786", "299534"], // Whiplash · Avengers: Endgame
  ],
  unreal: [
    ["37799", "129"], // The Social Network · Spirited Away
    ["769", "671"], // GoodFellas · Harry Potter and the Philosopher's Stone
  ],
};
// Every film onboarding may show — fetched in full before it starts.
export const ONBOARDING_MOVIE_IDS = [
  ...WELL_KNOWN,
  ...Object.values(PAIRS).flat(2),
];

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
        .map(([low, high]) => [getMovieById(low), getMovieById(high)])
        .filter(
          ([low, high]) =>
            low && high && !markedIds.has(low.id) && !markedIds.has(high.id),
        );
      const pair = options[0] ??
        PAIRS[dimension.key].map(([low, high]) => [getMovieById(low), getMovieById(high)])[0];
      return {
        key: dimension.key,
        index,
        low: { movie: pair[0], label: SIDE_LABELS[dimension.key][0] },
        high: { movie: pair[1], label: SIDE_LABELS[dimension.key][1] },
      };
    });

