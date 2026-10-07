import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const MAX_PINNED = 3;

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

      setDisplayName: (displayName) => set({ displayName }),
      setBio: (bio) => set({ bio: bio.slice(0, 140) }),
      setEmail: (email) => set({ email }),
      setAvatarUri: (avatarUri) => set({ avatarUri }),
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
