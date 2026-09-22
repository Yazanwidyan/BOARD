import { MOVIES } from '../data/movies';
import { shuffle } from '../utils/shuffle';
import { applyPreferenceFilters } from '../utils/movieFilters';

const DEFAULT_PICK_COUNT = 10;

const excludeIds = (movies, ids) => {
  if (!ids || ids.length === 0) return movies;
  const idSet = new Set(ids);
  return movies.filter((movie) => !idSet.has(movie.id));
};

// Relax filters progressively so a valid pick of `count` is (almost) always
// possible, while still favoring the user's stated preferences when there's
// enough supply.
const RELAXATION_STEPS = [
  (prefs) => prefs,
  (prefs) => ({ ...prefs, runtime: 'Any' }),
  (prefs) => ({ ...prefs, runtime: 'Any', decade: 'Any' }),
  (prefs) => ({ ...prefs, runtime: 'Any', decade: 'Any', minRating: null }),
  (prefs) => ({ ...prefs, runtime: 'Any', decade: 'Any', minRating: null, genres: [] }),
];

const pickWithRelaxedFilters = (pool, preferences, count) => {
  for (let step = 0; step < RELAXATION_STEPS.length; step += 1) {
    const relaxedPrefs = RELAXATION_STEPS[step](preferences);
    const filtered = applyPreferenceFilters(pool, relaxedPrefs);
    if (filtered.length >= count) {
      return shuffle(filtered).slice(0, count);
    }
  }
  // Not enough unseen movies match anything: fall back to the full pool.
  return shuffle(pool).slice(0, count);
};

// `priorityIds` (e.g. the user's watch list) are guaranteed slots — they skip
// the genre/rating/decade/runtime filters entirely, since the user already
// hand-picked them. Any remaining slots are filled the normal, filtered way.
export const generateRecommendations = (
  preferences = {},
  count = DEFAULT_PICK_COUNT,
  priorityIds = [],
) => {
  const priorityPool = priorityIds.length > 0
    ? MOVIES.filter((movie) => priorityIds.includes(movie.id))
    : [];
  const priorityPicks = shuffle(priorityPool).slice(0, count);

  const remainingCount = count - priorityPicks.length;
  if (remainingCount <= 0) {
    return shuffle(priorityPicks);
  }

  const restPool = excludeIds(MOVIES, priorityPicks.map((movie) => movie.id));
  const restPicks = pickWithRelaxedFilters(restPool, preferences, remainingCount);

  return shuffle([...priorityPicks, ...restPicks]);
};

export default generateRecommendations;
