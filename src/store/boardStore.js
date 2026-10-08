import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Your own boards — "Rainy day", "Date night" — beyond the one watchlist.
// A board is just a name and an ordered list of movie ids (newest last);
// a movie can sit on any number of boards, watched or not.
//   boards: [{ id, name, movieIds: [], createdAt, updatedAt }]
const newId = () =>
  `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const BOARD_NAME_MAX = 40;

const touch = (board, changes) => ({
  ...board,
  ...changes,
  updatedAt: Date.now(),
});

export const useBoardStore = create(
  persist(
    (set) => ({
      boards: [],

      // Returns the new board's id, so callers can add to it or open it.
      createBoard: (name, movieIds = []) => {
        const id = newId();
        const now = Date.now();
        set((state) => ({
          boards: [
            {
              id,
              name: name.trim().slice(0, BOARD_NAME_MAX),
              movieIds,
              createdAt: now,
              updatedAt: now,
            },
            ...state.boards,
          ],
        }));
        return id;
      },

      renameBoard: (boardId, name) =>
        set((state) => ({
          boards: state.boards.map((board) =>
            board.id === boardId
              ? touch(board, { name: name.trim().slice(0, BOARD_NAME_MAX) })
              : board,
          ),
        })),

      deleteBoard: (boardId) =>
        set((state) => ({
          boards: state.boards.filter((board) => board.id !== boardId),
        })),

      toggleBoardMovie: (boardId, movieId) =>
        set((state) => ({
          boards: state.boards.map((board) => {
            if (board.id !== boardId) return board;
            return touch(board, {
              movieIds: board.movieIds.includes(movieId)
                ? board.movieIds.filter((id) => id !== movieId)
                : [...board.movieIds, movieId],
            });
          }),
        })),

      clearBoards: () => set({ boards: [] }),
    }),
    {
      name: "board:boards-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export const getBoardById = (boardId) =>
  useBoardStore.getState().boards.find((board) => board.id === boardId);

export default useBoardStore;
