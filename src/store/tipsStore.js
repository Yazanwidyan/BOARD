import { create } from "zustand";

// First-visit tips: which screens' tip cards you've already dismissed.
// Settings → "Show tips again" clears it.
export const useTipsStore = create((set) => ({
  seen: {},
  markSeen: (id) =>
    set((state) => ({ seen: { ...state.seen, [id]: true } })),
  resetTips: () => set({ seen: {} }),
}));

export default useTipsStore;
