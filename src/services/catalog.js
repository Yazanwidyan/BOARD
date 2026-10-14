import { getCatalogVersion, setMovies } from "../data/movies";
import { setReelClips } from "../data/reelClips";
import { request } from "./api";

// Loads the movie catalog from the server — every movie with its cast,
// details and vibe, plus the Reels clips — into data/movies and
// data/reelClips. Once per app run: the catalog doesn't change while the
// app is open, and nothing is kept on the device between runs.
let loading = null;

export const isCatalogLoaded = () => getCatalogVersion() > 0;

export const loadCatalog = () => {
  if (isCatalogLoaded()) return Promise.resolve();
  loading ??= request("GET", "/movies/catalog")
    .then((catalog) => {
      setMovies(catalog.movies);
      setReelClips(catalog.reelClips, catalog.clipSeconds);
    })
    .finally(() => {
      loading = null;
    });
  return loading;
};
