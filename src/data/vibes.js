import { getMovieById } from "./movies";

// What each catalog movie *feels* like — the Taste DNA the taste engine
// learns from, so taste isn't just genre.
//
// Six dimensions, each 1–5:
//   dark     1 light-hearted … 5 dark, bleak
//   pace     1 slow burn …     5 relentless
//   mind     1 easy watch …    5 mind-bending
//   heavy    1 feel-good …     5 emotionally devastating
//   scale    1 intimate …      5 epic
//   unreal   1 grounded …      5 fantastical
//
// Then a few themes (keys of THEMES below). The model itself is defined
// here; each movie's own values come with the catalog from the server
// (movie.vibe — maintained in the backend's data/catalog.json).

export const DIMENSIONS = [
  { key: "dark", low: "light-hearted", high: "dark" },
  { key: "pace", low: "slow-burning", high: "fast" },
  { key: "mind", low: "easy to watch", high: "mind-bending" },
  { key: "heavy", low: "feel-good", high: "emotionally heavy" },
  { key: "scale", low: "intimate", high: "epic" },
  { key: "unreal", low: "grounded", high: "fantastical" },
];

export const THEMES = {
  twist: "twist endings",
  heist: "heists and cons",
  revenge: "revenge stories",
  "coming-of-age": "coming-of-age stories",
  friendship: "friendship stories",
  love: "love stories",
  family: "family stories",
  "one-room": "one-location stories",
  true: "true stories",
  war: "war films",
  crime: "crime sagas",
  killer: "killer thrillers",
  detective: "detective stories",
  supernatural: "supernatural stories",
  monster: "monster movies",
  survival: "survival stories",
  space: "space films",
  ai: "AI and machines",
  time: "time-bending stories",
  dystopia: "dystopias",
  satire: "satires",
  obsession: "stories of obsession",
  chase: "chase films",
  spy: "spy films",
  superhero: "superhero films",
  quest: "quests",
  "fairy-tale": "fairy tales",
  music: "music films",
  sports: "underdog stories",
  school: "school stories",
  "rise-fall": "rise-and-fall stories",
  injustice: "stories about injustice",
  loneliness: "stories about loneliness",
  grief: "stories about grief",
  showbiz: "show-business stories",
  western: "westerns",
  prison: "prison and escape stories",
  noir: "noirs",
  dreams: "stories about the mind",
  aliens: "alien encounters",
  road: "road movies",
  conspiracy: "conspiracy thrillers",
};

// A neutral middle for any movie without a vibe.
const NEUTRAL = { dims: [3, 3, 3, 3, 3, 3], themes: [] };

export const getVibe = (movieId) => getMovieById(movieId)?.vibe ?? NEUTRAL;

export default getVibe;
