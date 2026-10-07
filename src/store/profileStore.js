import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const MAX_PINNED = 3;
export const TOP_TEN_SIZE = 10;

export const useProfileStore = create(
  persist(
    (set) => ({
      displayName: "You",
      bio: "",
      email: "",
      avatarUri: null,
      // Completed collections pinned to the front of Profile's "Completed"
      // showcase — up to MAX_PINNED, most recently pinned first.
      pinnedCollections: [],
      // Your top ten, picked by hand: movie ids in rank order (#1 first).
      topTen: [],

      setDisplayName: (displayName) => set({ displayName }),
      setBio: (bio) => set({ bio: bio.slice(0, 140) }),
      setEmail: (email) => set({ email }),
      setAvatarUri: (avatarUri) => set({ avatarUri }),
      // Add a movie to the next rank, or take it out (the ranks close up).
      toggleTopTen: (movieId) =>
        set((state) => {
          const topTen = state.topTen ?? [];
          if (topTen.includes(movieId)) {
            return { topTen: topTen.filter((id) => id !== movieId) };
          }
          return topTen.length >= TOP_TEN_SIZE
            ? {}
            : { topTen: [...topTen, movieId] };
        }),
      togglePinnedCollection: (collectionId) =>
        set((state) => {
          const pinned = state.pinnedCollections ?? [];
          return {
            pinnedCollections: pinned.includes(collectionId)
              ? pinned.filter((id) => id !== collectionId)
              : [collectionId, ...pinned].slice(0, MAX_PINNED),
          };
        }),
    }),
    {
      name: "board:profile-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useProfileStore;
