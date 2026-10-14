import { queryKeys, queueChange } from "../services/queryClient";
import { createAccountStore } from "./accountStore";

// First-visit tips: which screens' tip cards you've already dismissed.
// Settings → "Show tips again" clears it. Part of the account's settings
// (tipsSeen), cached by TanStack Query — see store/accountStore.js.

// Always the whole map, replacing the server's (so "show tips again" works).
const saveSeen = (tipsSeen) =>
  queueChange(
    "PATCH",
    "/me/settings",
    { resetTips: true, tipsSeen },
    { merge: "settings", invalidate: [queryKeys.settings] },
  );

export const useTipsStore = createAccountStore({
  queryKey: queryKeys.settings,
  initial: { seen: {} },
  view: (settings) => ({ seen: settings.tipsSeen ?? {} }),
  actions: ({ get, set }) => ({
    markSeen: (id) => {
      const tipsSeen = { ...get().seen, [id]: true };
      set({ tipsSeen });
      saveSeen(tipsSeen);
    },
    resetTips: () => {
      set({ tipsSeen: {} });
      saveSeen({});
    },
  }),
});

export default useTipsStore;
