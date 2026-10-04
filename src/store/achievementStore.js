import { create } from 'zustand';

// Transient UI state, deliberately not persisted — an achievement popup
// that survives a reload would be a bug, not a feature. Shape of an
// achievement: { title, kind, rows: [{ label, detail?, xp }], total } —
// `kind` ("watched" | "rewatch" | "badge" | "collection" | "challenge" |
// "multi") picks the dialog's icon/color/confetti. An `id` is stamped on so
// a new achievement replaces an open one with a fresh entrance.
export const useAchievementStore = create((set) => ({
  achievement: null,

  showAchievement: (achievement) =>
    set({ achievement: { ...achievement, id: Date.now() } }),
  hideAchievement: () => set({ achievement: null }),
}));

export default useAchievementStore;
