import { useMemo } from "react";

import { useMoviesVersion } from "../data/movies";
import { useBoardStore } from "../store/boardStore";
import { useDecideStore } from "../store/decideStore";
import { useMovieStore } from "../store/movieStore";
import { useUserStore } from "../store/userStore";
import { getSourcePool, getSourceSummaries } from "./decidePools";

// What Decide's sources read: your history, saves, boards and filters —
// and the catalog version, so pools follow movies as they arrive.
const useDecideContext = () => ({
  moviesVersion: useMoviesVersion(),
  watched: useMovieStore((state) => state.watched),
  bucketList: useMovieStore((state) => state.bucketList),
  boards: useBoardStore((state) => state.boards),
  preferences: useUserStore((state) => state.preferences),
});

// Every source at a glance (utils/decidePools' getSourceSummaries), for
// the chooser — only worked out while it's open.
export const useSourceSummaries = (active) => {
  const { moviesVersion, watched, bucketList, boards, preferences } = useDecideContext();
  return useMemo(
    () => (active ? getSourceSummaries({ watched, bucketList, boards, preferences }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, watched, bucketList, boards, preferences, moviesVersion],
  );
};

// The pool for where `kind` ("swipe" / "wildcard") last chose to draw from
// (store/decideStore). → { source, board, pool }
export const useDecidePool = (kind) => {
  const { moviesVersion, watched, bucketList, boards, preferences } = useDecideContext();
  const { source, boardId } = useDecideStore((state) => state[kind]);
  const board = boards.find((item) => item.id === boardId) ?? null;
  const pool = useMemo(
    () => getSourcePool(source, { watched, bucketList, board, preferences }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source, board?.id, board?.movieIds.length, watched, bucketList, preferences, moviesVersion],
  );
  return { source, board, pool };
};

// The pool for a source chosen just now (no hook — for "go" handlers).
export const getPoolNow = (source, boardId) => {
  const { watched, bucketList } = useMovieStore.getState();
  const board = useBoardStore.getState().boards.find((item) => item.id === boardId) ?? null;
  const { preferences } = useUserStore.getState();
  return getSourcePool(source, { watched, bucketList, board, preferences });
};
