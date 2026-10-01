import { create } from 'zustand';

// Transient UI state, deliberately not persisted — an achievement popup
// that survives a reload would be a bug, not a feature. Shape of an
// achievement: { title, subtitle?, rows: [{ label, xp }], total }.
export const useAchievementStore = create((set) => ({
  achievement: null,

  showAchievement: (achievement) => set({ achievement }),
  hideAchievement: () => set({ achievement: null }),
}));

export default useAchievementStore;
