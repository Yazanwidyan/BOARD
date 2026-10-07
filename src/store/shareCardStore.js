import { create } from 'zustand';

// Which completed collection the brag card is open for (null = closed).
// Transient UI state, mounted once at the root as <CompletionShareSheet />,
// so the achievement dialog, Profile and Collection Details can all open
// the same card.
export const useShareCardStore = create((set) => ({
  collectionId: null,
  openShareCard: (collectionId) => set({ collectionId }),
  closeShareCard: () => set({ collectionId: null }),
}));

export const openShareCard = (collectionId) =>
  useShareCardStore.getState().openShareCard(collectionId);

export default useShareCardStore;
