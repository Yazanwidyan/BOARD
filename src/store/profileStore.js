import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useProfileStore = create(
  persist(
    (set) => ({
      displayName: 'You',
      bio: '',
      email: '',
      avatarUri: null,

      setDisplayName: (displayName) => set({ displayName }),
      setBio: (bio) => set({ bio: bio.slice(0, 140) }),
      setEmail: (email) => set({ email }),
      setAvatarUri: (avatarUri) => set({ avatarUri }),
    }),
    {
      name: 'board:profile-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useProfileStore;
