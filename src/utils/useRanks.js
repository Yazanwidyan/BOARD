import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useMoviesVersion } from "../data/movies";
import { api } from "../services/api";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { getRankSummary } from "./ranks";

// How many dares a dare history has finished.
export const countFinishedDares = (history) =>
  history.filter((entry) => entry.status === "completed").length;

// Your ranks, live: { tracks, earned, count, title } (utils/ranks), worked
// out again when your history, your dares or the movies the phone has
// change.
export const useRankSummary = () => {
  const version = useMoviesVersion();
  const watched = useMovieStore((state) => state.watched);
  const history = useChallengeStore((state) => state.history);
  const dares = countFinishedDares(history);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getRankSummary(watched, dares), [watched, dares, version]);
};

// How rare each rank is — { [rank id]: percent of watchers } from the
// server, refreshed every few minutes. Empty until it arrives.
export const useRankRarity = () => {
  const query = useQuery({
    queryKey: ["ranks", "rarity"],
    queryFn: () => api.get("/ranks/rarity"),
    staleTime: 5 * 60 * 1000,
  });
  return query.data?.rarity ?? {};
};
