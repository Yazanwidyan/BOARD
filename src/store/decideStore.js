import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Where Decide's Swipe and Wildcard last drew from (utils/decidePools), so
// each opens on your usual, and your last answers to "Let ReelBoard
// choose" — kept on this phone. `boardId`: the board, when the source is
// "board".
export const useDecideStore = create(
  persist(
    (set) => ({
      swipe: { source: "taste", boardId: null },
      wildcard: { source: "anything", boardId: null },
      // "Let ReelBoard choose": your last answers (utils/guidedPick).
      guided: null,
      setSwipe: (changes) => set((state) => ({ swipe: { ...state.swipe, ...changes } })),
      setWildcard: (changes) => set((state) => ({ wildcard: { ...state.wildcard, ...changes } })),
      setGuided: (guided) => set({ guided }),
    }),
    {
      name: "board:decide-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useDecideStore;
