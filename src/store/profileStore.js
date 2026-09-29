import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useProfileStore = create(
  persist(
    (set) => ({
      displayName: 'You',
      bio: '',

      setDisplayName: (displayName) => set({ displayName: displayName.trim() || 'You' }),
      setBio: (bio) => set({ bio: bio.trim().slice(0, 140) }),
    }),
    {
      name: 'urwatch:profile-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useProfileStore;
