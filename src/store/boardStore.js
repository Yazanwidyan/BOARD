import { queryKeys, queueChange } from "../services/queryClient";
import { createAccountStore } from "./accountStore";

// Your own boards — "Rainy day", "Date night" — beyond the one watchlist.
// A board is just a name and an ordered list of movie ids (newest last);
// a movie can sit on any number of boards, watched or not.
//   boards: [{ id, name, movieIds: [], createdAt, updatedAt }]
// Server data (GET /api/boards), cached by TanStack Query — see
// store/accountStore.js.
const newId = () =>
  `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const BOARD_NAME_MAX = 40;

const BOARDS = { invalidate: [queryKeys.boards] };

const touch = (board, changes) => ({
  ...board,
  ...changes,
  updatedAt: Date.now(),
});

export const useBoardStore = createAccountStore({
  queryKey: queryKeys.boards,
  initial: { boards: [] },
  actions: ({ get, set }) => {
    const updateBoard = (boardId, update) =>
      set((state) => ({
        boards: state.boards.map((board) =>
          board.id === boardId ? update(board) : board,
        ),
      }));

    return {
      // Returns the new board's id, so callers can add to it or open it.
      // The server keeps the app's id, so later edits find it.
      createBoard: (name, movieIds = []) => {
        const id = newId();
        const now = Date.now();
        const board = {
          id,
          name: name.trim().slice(0, BOARD_NAME_MAX),
          movieIds,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ boards: [board, ...state.boards] }));
        queueChange(
          "POST",
          "/boards",
          { id, name: board.name, movieIds },
          BOARDS,
        );
        return id;
      },

      renameBoard: (boardId, name) => {
        const trimmed = name.trim().slice(0, BOARD_NAME_MAX);
        updateBoard(boardId, (board) => touch(board, { name: trimmed }));
        queueChange(
          "PATCH",
          `/boards/${boardId}`,
          { name: trimmed },
          {
            merge: `board-name:${boardId}`,
            ...BOARDS,
          },
        );
      },

      deleteBoard: (boardId) => {
        set((state) => ({
          boards: state.boards.filter((board) => board.id !== boardId),
        }));
        queueChange("DELETE", `/boards/${boardId}`, undefined, BOARDS);
      },

      toggleBoardMovie: (boardId, movieId) => {
        const board = get().boards.find((item) => item.id === boardId);
        if (!board) return;
        const onBoard = board.movieIds.includes(movieId);
        updateBoard(boardId, (current) =>
          touch(current, {
            movieIds: onBoard
              ? current.movieIds.filter((id) => id !== movieId)
              : [...current.movieIds, movieId],
          }),
        );
        if (onBoard)
          queueChange(
            "DELETE",
            `/boards/${boardId}/movies/${movieId}`,
            undefined,
            BOARDS,
          );
        else
          queueChange("POST", `/boards/${boardId}/movies`, { movieId }, BOARDS);
      },

      clearBoards: () => {
        const ids = get().boards.map((board) => board.id);
        set({ boards: [] });
        ids.forEach((id) =>
          queueChange("DELETE", `/boards/${id}`, undefined, BOARDS),
        );
      },
    };
  },
});

export const getBoardById = (boardId) =>
  useBoardStore.getState().boards.find((board) => board.id === boardId);

export default useBoardStore;
