import { setMovies } from "../data/movies";
import { setReelClips } from "../data/reelClips";
import { NOT_MODIFIED, requestIfChanged } from "./api";
import { queryClient, queryKeys } from "./queryClient";
import { loadJSON, saveJSON } from "./storage";

// The movie catalog — every movie with its cast, details and vibe, plus the
// Reels clips — loaded into data/movies and data/reelClips, which the rest
// of the app reads directly.
//
// It's a TanStack query (queryKeys.catalog), but saved on the device on its
// own, only when it changes, rather than with the rest of the cache. Each
// load sends the saved copy's ETag, so while the server's catalog is the
// same the answer is an empty 304 and nothing is downloaded.
const STORAGE_KEY = "board:catalog";

let applied = null;

const apply = (catalog) => {
  if (!catalog || catalog === applied) return;
  applied = catalog;
  setMovies(catalog.movies);
  setReelClips(catalog.reelClips, catalog.clipSeconds);
};

export const isCatalogLoaded = () => applied !== null;

const fetchCatalog = async () => {
  const saved = queryClient.getQueryData(queryKeys.catalog);
  const result = await requestIfChanged("/movies/catalog", saved?.etag);
  if (result === NOT_MODIFIED && saved) return saved;
  const catalog = { ...result.data, etag: result.etag };
  saveJSON(STORAGE_KEY, catalog);
  return catalog;
};

// Defaults rather than per-call options, so they also hold for the query
// restoreCatalog() creates — above all, that it isn't saved with the cache.
queryClient.setQueryDefaults(queryKeys.catalog, {
  queryFn: fetchCatalog,
  staleTime: 60 * 1000,
  meta: { persist: false },
});

// The saved copy, if there is one — right away on launch, before the
// network. Marked stale, so the next loadCatalog() checks for changes.
export const restoreCatalog = async () => {
  if (isCatalogLoaded()) return true;
  const saved = await loadJSON(STORAGE_KEY);
  if (!saved?.movies) return false;
  queryClient.setQueryData(queryKeys.catalog, saved, { updatedAt: 0 });
  apply(saved);
  return true;
};

// Loads (or checks for a newer) catalog, starting from the saved copy.
// Concurrent calls share a request. Offline with a copy on the device,
// that copy is used; only with none at all does it fail.
export const loadCatalog = async () => {
  await restoreCatalog();
  try {
    apply(await queryClient.fetchQuery({ queryKey: queryKeys.catalog }));
  } catch (error) {
    if (!isCatalogLoaded()) throw error;
  }
};
