import { queryKeys, queueChange } from "../services/queryClient";
import { createAccountStore } from "./accountStore";

// Your profile: name, bio, avatar, top ten and pinned collections. Server
// data (GET /api/me/profile), cached by TanStack Query — see
// store/accountStore.js. The cached profile also carries the account's
// handle, email, level and so on.
export const MAX_PINNED = 3;
export const TOP_TEN_SIZE = 10;

const PROFILE = { invalidate: [queryKeys.profile] };

const patchProfile = (changes) =>
  queueChange("PATCH", "/me/profile", changes, {
    merge: "profile",
    ...PROFILE,
  });

export const useProfileStore = createAccountStore({
  queryKey: queryKeys.profile,
  initial: {
    displayName: "You",
    bio: "",
    email: "",
    avatarUri: null,
    // Completed collections pinned to the front of Profile's "Completed"
    // showcase — up to MAX_PINNED, most recently pinned first.
    pinnedCollections: [],
    // Your top ten, picked by hand: movie ids in rank order (#1 first).
    topTen: [],
  },
  actions: ({ get, set }) => ({
    // Saved once it isn't blank (the field can be empty while typing).
    setDisplayName: (displayName) => {
      set({ displayName });
      if (displayName.trim())
        patchProfile({ displayName: displayName.trim().slice(0, 50) });
    },
    setBio: (bio) => {
      set({ bio: bio.slice(0, 140) });
      patchProfile({ bio: bio.slice(0, 140).trim() });
    },
    // The account's email is changed on the server only; this just shows it.
    setEmail: (email) => set({ email }),
    setAvatarUri: (avatarUri) => {
      set({ avatarUri });
      patchProfile({ avatarUri });
    },
    // Add a movie to the next rank, or take it out (the ranks close up).
    toggleTopTen: (movieId) => {
      const topTen = get().topTen ?? [];
      if (!topTen.includes(movieId) && topTen.length >= TOP_TEN_SIZE) return;
      const next = topTen.includes(movieId)
        ? topTen.filter((id) => id !== movieId)
        : [...topTen, movieId];
      set({ topTen: next });
      queueChange(
        "PUT",
        "/me/top-ten",
        { movieIds: next },
        { merge: "top-ten", ...PROFILE },
      );
    },
    togglePinnedCollection: (collectionId) => {
      const pinned = get().pinnedCollections ?? [];
      const next = pinned.includes(collectionId)
        ? pinned.filter((id) => id !== collectionId)
        : [collectionId, ...pinned].slice(0, MAX_PINNED);
      set({ pinnedCollections: next });
      queueChange(
        "PUT",
        "/me/pinned-collections",
        { collectionIds: next },
        { merge: "pinned-collections", ...PROFILE },
      );
    },
  }),
});

export default useProfileStore;
