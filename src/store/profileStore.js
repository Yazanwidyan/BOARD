import { queryKeys, queueChange } from "../services/queryClient";
import { createAccountStore } from "./accountStore";

// Your profile: name, bio, avatar, your S tier's order and pinned collections. Server
// data (GET /api/me/profile), cached by TanStack Query — see
// store/accountStore.js. The cached profile also carries the account's
// handle, email, level and so on.
export const MAX_PINNED = 3;
// How many S films can be put in order (the server's S_TIER_ORDER_MAX).
export const S_TIER_ORDER_MAX = 1000;

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
    // A film you've watched whose still is your profile's cover (null: none).
    coverMovieId: null,
    // Completed collections pinned to the front of Profile's "Completed"
    // showcase — up to MAX_PINNED, most recently pinned first.
    pinnedCollections: [],
    // The order of your S tier — your favourites — as movie ids, #1 first
    // (utils/tiers' orderSTier). Kept as `topTen`, its name from before.
    topTen: [],
    // ReelBoard Pro (utils/pro): { active, since, until, source } — the
    // server's say — and the accent a Pro profile wears (null: none).
    pro: { active: false, since: null, until: null, source: null },
    accent: null,
  },
  actions: ({ get, set }) => {
    // The S tier's order, saved whole.
    const saveSTierOrder = (movieIds) => {
      const next = [...new Set(movieIds)].slice(0, S_TIER_ORDER_MAX);
      set({ topTen: next });
      queueChange(
        "PUT",
        "/me/top-ten",
        { movieIds: next },
        { merge: "top-ten", ...PROFILE },
      );
    };
    return {
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
      // A Pro perk (the server refuses it otherwise); null takes it off.
      setAccent: (accent) => {
        set({ accent });
        patchProfile({ accent });
      },
      // The account's email is changed on the server only; this just shows it.
      setEmail: (email) => set({ email }),
      setAvatarUri: (avatarUri) => {
        set({ avatarUri });
        patchProfile({ avatarUri });
      },
      // Your cover: a watched film's still, or null for none.
      setCoverMovieId: (coverMovieId) => {
        set({ coverMovieId });
        patchProfile({ coverMovieId });
      },
      // Your S tier, put in order: its movie ids, #1 first.
      setSTierOrder: saveSTierOrder,
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
    };
  },
});

export default useProfileStore;
