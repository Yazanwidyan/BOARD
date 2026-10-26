import { create } from "zustand";

// How many bottom sheets are on screen right now (components/BottomSheet
// counts itself in while its Modal is mounted). The reward moment
// (components/AchievementModal) waits for this to reach 0: on iOS a second
// Modal can't present over one still showing — it ends up invisible but
// still covering the screen, and every touch is swallowed.
export const useSheetStore = create((set) => ({
  open: 0,
  opened: () => set((state) => ({ open: state.open + 1 })),
  closed: () => set((state) => ({ open: Math.max(0, state.open - 1) })),
}));

export default useSheetStore;
