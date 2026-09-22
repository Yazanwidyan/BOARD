import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useThemeStore = create(
  persist(
    (set) => ({
      mode: 'dark', // 'dark' | 'light'
      setMode: (mode) => set({ mode }),
      toggleMode: () => set((state) => ({ mode: state.mode === 'dark' ? 'light' : 'dark' })),
    }),
    {
      name: 'urwatch:theme-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useThemeStore;
