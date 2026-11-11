import { getMovieById } from "../data/movies";
import { useAuthStore } from "../store/authStore";
import { getMovieMatch } from "../utils/tasteEngine";
import { api } from "./api";

// Every pick for tonight taken, and what came of it, for the server
// (routes/picks.js) — how the taste engine is judged: which of its signals
// led to films people loved. Fire and forget, like services/events.

// A pick taken. `source`: why it was suggested — taste / collection /
// watchlist (Home's angles), onboarding, or other. `watched` the library
// (for the engine's breakdown of why it fits).
export const logPick = (movieId, source, watched) => {
  if (!useAuthStore.getState().token || !movieId) return;
  const movie = getMovieById(movieId);
  let fit = null;
  try {
    fit = movie ? getMovieMatch(watched, movie) : null;
  } catch {
    fit = null;
  }
  api
    .post("/me/picks", {
      movieId,
      source,
      match: fit?.match ?? null,
      signals: (fit?.factors ?? []).map(({ key, value }) => ({ key, value })),
    })
    .catch(() => {});
};

// What came of it: "loved" (S/A), "fine" (B/C), "not" (D/F) once tiered,
// "not_watched", or "dismissed" (the morning question put away).
export const logPickOutcome = (movieId, outcome, tier = undefined) => {
  if (!useAuthStore.getState().token || !movieId) return;
  api.post("/me/picks/outcome", { movieId, outcome, ...(tier ? { tier } : {}) }).catch(() => {});
};

export const outcomeOfTier = (tier) =>
  tier === "S" || tier === "A" ? "loved" : tier === "D" || tier === "F" ? "not" : "fine";
