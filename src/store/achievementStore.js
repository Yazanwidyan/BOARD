import { create } from 'zustand';

// Transient UI state, deliberately not persisted — an achievement popup
// that survives a reload would be a bug, not a feature. Shape of an
// achievement — a moment: { reason ("watched" | "rewatch" | "tier"),
// movieId, ranks, sagaSteps, dare, ranksBefore, ranksAfter,
// shareCollectionId } (see utils/achievementFeedback); the dialog decides
// what leads. An `id` is stamped on so
// a new achievement replaces an open one with a fresh entrance.
export const useAchievementStore = create((set) => ({
  achievement: null,

  showAchievement: (achievement) =>
    set({ achievement: { ...achievement, id: Date.now() } }),
  hideAchievement: () => set({ achievement: null }),
}));

export default useAchievementStore;
