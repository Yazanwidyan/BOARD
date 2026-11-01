import { useAuthStore } from "../store/authStore";
import { api } from "./api";

// The few things the app tells the server, for the launch numbers on the
// admin dashboard (the server's routes/events.js): onboarding finished,
// Taste DNA shared, the app opened. Fire and forget — a lost one doesn't
// matter, and the server keeps one per person, event and day.
export const logEvent = (name) => {
  if (!useAuthStore.getState().token) return;
  api.post("/events", { name }).catch(() => {});
};
