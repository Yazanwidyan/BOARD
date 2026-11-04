import { create } from "zustand";

// Search, shared by its two halves: the field lives in the tab bar (it
// rises above the keyboard, as Apple TV's does) and the results on the
// Search tab (screens/SearchScreen). Not saved — a new launch starts clean.
//   query    what's typed
//   focused  whether the field has the keyboard
//   from     the tab Search was opened from — the round button beside the
//            field goes back to it
export const useSearchStore = create((set) => ({
  query: "",
  setQuery: (query) => set({ query }),
  focused: false,
  setFocused: (focused) => set({ focused }),
  from: "Home",
  setFrom: (from) => set({ from }),
}));

export default useSearchStore;
