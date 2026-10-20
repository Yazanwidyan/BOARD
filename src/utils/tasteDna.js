import { THEMES, getVibe } from "../data/vibes";
import { buildMyTasteModel } from "./tasteEngine";

const TOP_THEMES = 3;
const SIGNATURE_COUNT = 4;

// Everything the Taste DNA card shows, from your own taste model:
//   fingerprint  six 1–5 values (null before there's anything to go on)
//   themes       the themes you love most, with how many loved films each
//   signature    the loved films that sit closest to your fingerprint —
//                the ones that sum your taste up
export const getTasteDna = (watched) => {
  const model = buildMyTasteModel(watched);
  const { fingerprint } = model;

  const themes = [...model.themes.entries()]
    .filter(([, value]) => value.loved.length > 0 && value.sum > 0)
    .sort((a, b) => b[1].loved.length - a[1].loved.length || b[1].sum - a[1].sum)
    .slice(0, TOP_THEMES)
    .map(([key, value]) => ({
      key,
      label: THEMES[key],
      loved: new Set(value.loved.map((movie) => movie.id)).size,
    }));

  const distanceTo = (movie) =>
    Math.sqrt(
      getVibe(movie.id).dims.reduce(
        (sum, value, index) => sum + (value - fingerprint[index]) ** 2,
        0,
      ),
    );
  const signature = fingerprint
    ? [...new Map(model.lovedMovies.map((movie) => [movie.id, movie])).values()]
        .sort((a, b) => distanceTo(a) - distanceTo(b))
        .slice(0, SIGNATURE_COUNT)
    : [];

  return {
    fingerprint,
    themes,
    signature,
    hasDna: !!fingerprint,
  };
};

export default getTasteDna;
