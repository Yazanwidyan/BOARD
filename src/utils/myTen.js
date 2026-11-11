import { create } from "zustand";

import { getMovieById } from "../data/movies";
import { t } from "../i18n";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { orderSTier } from "./tiers";

// "My Ten": your title and your progress, made of your own S tier.
//   the Ten    the first TEN films of your S tier, in your order (the
//              order sheet on the tier list). Only S films get in — and an
//              S only ever comes from a tier you chose on purpose.
//   the title  your #1 — "S · Heat" — the film at the top of the Ten.
// A new S goes to the end of the Ten while there's room; once it's full,
// you choose what makes room (MakeRoomSheet) — a film bumped out stays S,
// it just sits behind the Ten. Demoting a film from S lets the next one
// up.
export const TEN = 10;

// Your Ten, from a library and an S order: { ordered (S entries in
// order), ten (the first TEN movies), crown (the #1 movie or null) }.
export const getTen = (watched, order = []) => {
  const ordered = orderSTier(watched, order);
  const ten = ordered
    .slice(0, TEN)
    .map((entry) => getMovieById(entry.movieId))
    .filter(Boolean);
  return { ordered, ten, crown: ten[0] ?? null };
};

// The film waiting for room in a full Ten (MakeRoomSheet shows while set).
export const useTenStore = create((set) => ({
  waiting: null,
  askForRoom: (movieId) => set({ waiting: movieId }),
  done: () => set({ waiting: null }),
}));

// A film just tiered S (it wasn't before): it joins the Ten — at the end
// if there's room, else just behind it while you're asked what makes room.
// → what to say: the line for the toast, or null when the sheet asks.
export const placeNewS = (movieId, { fromPick = false } = {}) => {
  const { watched } = useMovieStore.getState();
  const { topTen, setSTierOrder } = useProfileStore.getState();
  const others = orderSTier(watched, topTen ?? [])
    .map((entry) => entry.movieId)
    .filter((id) => id !== movieId);
  const title = getMovieById(movieId)?.title ?? t("This film");
  if (others.length >= TEN) {
    setSTierOrder([...others.slice(0, TEN), movieId, ...others.slice(TEN)]);
    useTenStore.getState().askForRoom(movieId);
    return null;
  }
  setSTierOrder([...others, movieId]);
  if (others.length === 0) return t("Your first S. {title} now heads your Ten.", { title });
  if (fromPick) return t("Tonight's pick made your Ten.");
  return t("Into your Ten · {count}/10", { count: others.length + 1 });
};

// Make room: `bumped` leaves the Ten for the waiting film (which takes its
// place); both stay S. Without `bumped`, the waiting film stays outside.
export const makeRoom = (bumped) => {
  const { waiting, done } = useTenStore.getState();
  done();
  if (!waiting || !bumped) return null;
  const { watched } = useMovieStore.getState();
  const { topTen, setSTierOrder } = useProfileStore.getState();
  const ordered = orderSTier(watched, topTen ?? [])
    .map((entry) => entry.movieId)
    .filter((id) => id !== waiting && id !== bumped);
  const at = Math.max(0, orderSTier(watched, topTen ?? []).findIndex((entry) => entry.movieId === bumped));
  const ten = ordered.slice(0, TEN - 1);
  ten.splice(Math.min(at, ten.length), 0, waiting);
  setSTierOrder([...ten, bumped, ...ordered.slice(TEN - 1)]);
  return t("{title} is in your Ten.", { title: getMovieById(waiting)?.title ?? "" });
};
