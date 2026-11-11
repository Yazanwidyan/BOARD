import { logEvent } from "../services/events";
import { logPick } from "../services/pickLog";
import { queryClient, queryKeys, queueChange } from "../services/queryClient";
import { createAccountStore } from "./accountStore";

// Your library: watchlist, watched + tiers, tonight's pick and manually
// unlocked collections. Server data, cached by TanStack Query (see
// store/accountStore.js) under queryKeys.library = GET /api/me/library.
const LIBRARY = { invalidate: [queryKeys.library] };
// Changes to the watch history also change your profile's counts, which
// the server works out — so the profile is re-read afterwards too.
const WATCHED = { invalidate: [queryKeys.library, queryKeys.profile] };
// …and the movie's community tiers (if its page is open, it updates).
const watchedChange = (movieId) => ({
  invalidate: [...WATCHED.invalidate, queryKeys.communityMovie(movieId)],
});

export const useMovieStore = createAccountStore({
  queryKey: queryKeys.library,
  initial: {
    bucketList: [], // manually curated "want to watch someday" — [{ movieId, addedAt }]
    pickedMovie: null, // single movie id — approved after a pick session
    // Set when the pick came from a Home mood chip — { movieId, mood } —
    // so Tonight's Pick can say why and reroll within the same mood.
    // Tied to the movie id, so any other way of picking makes it stale
    // (readers ignore a mismatch) without having to clear it everywhere.
    pickMood: null,
    // [{ movieId, timestamp, tier: 'S'|'A'|'B'|'C'|'D'|'F' | null, watchCount }]
    // Older entries may carry `rating` (0.5–5 stars) instead of `tier` —
    // utils/tiers.js getTier() converts those on read.
    // One entry per movie, never duplicated — a rewatch bumps watchCount
    // and timestamp on the same entry rather than adding a second one, so
    // every existing "one entry per movie" assumption elsewhere (badges,
    // XP, collections, the Library grid's keying by movie id) keeps
    // working untouched. watchCount is absent on entries created before
    // this existed; every reader treats that as 1 via `?? 1`.
    watched: [],
    // Collection ids the user explicitly chose to track from the "See
    // All Collections" browser, before having watched anything in them —
    // a manual opt-in layered on top of the automatic "you've watched
    // something in it" unlock, same OR relationship as a watchlist pick.
    unlockedCollections: [],
  },
  actions: ({ get, set }) => {
    // `source`: why it was suggested (services/pickLog) — taste,
    // collection, watchlist, onboarding or other.
    const setPick = (movieId, mood = null, source = "other") => {
      // The taste metric: a pick for tonight taken (and, below, watched).
      if (movieId && movieId !== get().pickedMovie) {
        logEvent("pick_accepted");
        logPick(movieId, source, get().watched);
      }
      set({ pickedMovie: movieId, pickMood: mood ? { movieId, mood } : null });
      queueChange(
        "PUT",
        "/me/pick",
        { movieId, mood },
        { merge: "pick", ...LIBRARY },
      );
    };
    const clearPick = () => {
      set({ pickedMovie: null, pickMood: null });
      queueChange("DELETE", "/me/pick", undefined, {
        merge: "pick",
        ...LIBRARY,
      });
    };
    const patchWatched = (movieId, entryChanges, body) => {
      if (!get().watched.some((entry) => entry.movieId === movieId)) return;
      set((state) => ({
        watched: state.watched.map((entry) =>
          entry.movieId === movieId ? { ...entry, ...entryChanges } : entry,
        ),
      }));
      queueChange("PATCH", `/me/watched/${movieId}`, body, {
        merge: `watched:${movieId}`,
        ...watchedChange(movieId),
      });
    };

    return {
      toggleUnlockedCollection: (collectionId) => {
        const unlocked = get().unlockedCollections.includes(collectionId);
        set((state) => ({
          unlockedCollections: unlocked
            ? state.unlockedCollections.filter((id) => id !== collectionId)
            : [...state.unlockedCollections, collectionId],
        }));
        queueChange(
          unlocked ? "DELETE" : "PUT",
          `/me/unlocked-collections/${encodeURIComponent(collectionId)}`,
          undefined,
          { merge: `unlock:${collectionId}`, ...LIBRARY },
        );
      },

      toggleBucketList: (movieId) => {
        const isInList = get().bucketList.some(
          (entry) => entry.movieId === movieId,
        );
        set((state) => ({
          bucketList: isInList
            ? state.bucketList.filter((entry) => entry.movieId !== movieId)
            : [...state.bucketList, { movieId, addedAt: Date.now() }],
        }));
        if (isInList)
          queueChange("DELETE", `/me/watchlist/${movieId}`, undefined, LIBRARY);
        else queueChange("POST", "/me/watchlist", { movieId }, LIBRARY);
      },

      // Only one movie can be "the pick" at a time — approving a new one
      // replaces whatever was there before.
      togglePickedMovie: (movieId) => {
        const { pickedMovie, pickMood } = get();
        if (pickedMovie === movieId) {
          clearPick();
          return;
        }
        // A mood from an earlier pick doesn't carry over (readers ignore a
        // mismatch, so it's left as it was).
        logEvent("pick_accepted");
        logPick(movieId, "other", get().watched);
        set({ pickedMovie: movieId, pickMood });
        queueChange(
          "PUT",
          "/me/pick",
          { movieId, mood: null },
          { merge: "pick", ...LIBRARY },
        );
      },

      // Marking something watched graduates it off the watchlist and
      // clears it as the current pick, since "want to watch" / "picked"
      // and "watched" shouldn't both hold. (The server does the same.)
      toggleWatched: (movieId) => {
        const isWatched = get().watched.some(
          (entry) => entry.movieId === movieId,
        );
        if (isWatched) {
          set((state) => ({
            watched: state.watched.filter((entry) => entry.movieId !== movieId),
          }));
          queueChange(
            "DELETE",
            `/me/watched/${movieId}`,
            undefined,
            watchedChange(movieId),
          );
        } else {
          const timestamp = Date.now();
          if (get().pickedMovie === movieId) logEvent("pick_watched");
          set((state) => ({
            watched: [
              { movieId, timestamp, rating: null, watchCount: 1 },
              ...state.watched,
            ],
            bucketList: state.bucketList.filter(
              (entry) => entry.movieId !== movieId,
            ),
            pickedMovie:
              state.pickedMovie === movieId ? null : state.pickedMovie,
          }));
          // It may also complete the active challenge on the server.
          queueChange(
            "POST",
            "/me/watched",
            { movieId, tier: null, watchedAt: timestamp },
            {
              invalidate: [
                ...watchedChange(movieId).invalidate,
                queryKeys.challenges,
              ],
            },
          );
        }
      },

      // ReelBoard's rating: a tier (S–F), or null to clear it. Drops any old
      // star rating so the tier is the only source of truth from now on.
      setWatchedTier: (movieId, tier) =>
        patchWatched(movieId, { tier, rating: null }, { tier: tier ?? null }),

      // When you watched it — for logging a movie late or fixing the date.
      // Never in the future.
      setWatchedDate: (movieId, timestamp) => {
        const watchedAt = Math.round(Math.min(timestamp, Date.now()));
        patchWatched(movieId, { timestamp: watchedAt }, { watchedAt });
      },

      // Legacy star ratings aren't sent anywhere — tiers replaced them.
      setWatchedRating: (movieId, rating) => {
        set((state) => ({
          watched: state.watched.map((entry) =>
            entry.movieId === movieId ? { ...entry, rating } : entry,
          ),
        }));
      },

      // Distinct from toggleWatched on purpose — a rewatch of something
      // already watched, not a re-mark. Bumps timestamp to now too, so it
      // surfaces in "Recently Watched" the same way a first watch would;
      // you just watched it again, that's genuinely recent activity.
      rewatchMovie: (movieId) => {
        const existing = get().watched.find(
          (entry) => entry.movieId === movieId,
        );
        if (!existing) return;
        const updated = {
          ...existing,
          watchCount: (existing.watchCount ?? 1) + 1,
          timestamp: Date.now(),
        };
        set((state) => ({
          watched: [
            updated,
            ...state.watched.filter((entry) => entry.movieId !== movieId),
          ],
        }));
        queueChange(
          "POST",
          `/me/watched/${movieId}/rewatch`,
          undefined,
          LIBRARY,
        );
      },

      // Set (not toggle) tonight's pick — e.g. a Movie night match.
      setPickedMovie: (movieId, source) => setPick(movieId, null, source),

      clearBucketList: () => {
        set({ bucketList: [] });
        queueChange("DELETE", "/me/watchlist", undefined, LIBRARY);
      },
      clearPickedMovie: clearPick,
      setMoodPick: (movieId, mood) => setPick(movieId, mood),
      clearWatched: () => {
        set({ watched: [] });
        queueChange("DELETE", "/me/watched", undefined, WATCHED);
      },
      clearUnlockedCollections: () => {
        const ids = get().unlockedCollections;
        set({ unlockedCollections: [] });
        ids.forEach((id) =>
          queueChange(
            "DELETE",
            `/me/unlocked-collections/${encodeURIComponent(id)}`,
            undefined,
            {
              merge: `unlock:${id}`,
              ...LIBRARY,
            },
          ),
        );
      },
    };
  },
});

export default useMovieStore;
