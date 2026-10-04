import { create } from 'zustand';

const TOAST_DURATION_MS = 2200;

let hideTimer = null;

// Transient, non-blocking confirmations ("Handle copied", "Coming soon")
// — the in-app replacement for one-button native Alerts. Mounted once as
// <Toast /> at the navigation root. A new toast replaces the current one
// and restarts the timer.
export const useToastStore = create((set) => ({
  toast: null,

  showToast: (message, options = {}) => {
    clearTimeout(hideTimer);
    set({ toast: { message, tone: options.tone ?? 'info', id: Date.now() } });
    hideTimer = setTimeout(() => set({ toast: null }), TOAST_DURATION_MS);
  },
  hideToast: () => {
    clearTimeout(hideTimer);
    set({ toast: null });
  },
}));

export const showToast = (message, options) =>
  useToastStore.getState().showToast(message, options);

export default useToastStore;
