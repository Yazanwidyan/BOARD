import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shuffle } from '../utils/shuffle';
import { resolveRoundOutcome } from '../utils/elimination';

// Once a round is down to this many movies or fewer, swap the one-at-a-time
// swipe stack for a head-to-head "choose" screen instead.
const CHOOSE_MAX = 3;

const initialState = {
  sessionActive: false,
  originalMovies: [],
  roundNumber: 1,
  roundMovies: [],
  roundIndex: 0,
  roundKept: [],
  roundRemoved: [],
  phase: 'swiping', // 'swiping' | 'transition' | 'choose' | 'final'
  transition: null, // { message, fromCount, toCount }
  pendingNextMovies: [],
  finalMovie: null,
};

const phaseForRoundSize = (size) => {
  if (size <= 1) return 'final';
  if (size <= CHOOSE_MAX) return 'choose';
  return 'swiping';
};

export const useSessionStore = create(
  persist(
    (set, get) => ({
      ...initialState,

      startSession: (movies) => {
        const phase = phaseForRoundSize(movies.length);
        if (phase === 'final') {
          const finalMovie = movies[0];
          set({
            sessionActive: true,
            originalMovies: movies,
            roundNumber: 1,
            roundMovies: movies,
            roundIndex: 0,
            roundKept: [],
            roundRemoved: [],
            phase: 'final',
            transition: null,
            pendingNextMovies: [],
            finalMovie,
          });
          return;
        }

        set({
          sessionActive: true,
          originalMovies: movies,
          roundNumber: 1,
          roundMovies: movies,
          roundIndex: 0,
          roundKept: [],
          roundRemoved: [],
          phase,
          transition: null,
          pendingNextMovies: [],
          finalMovie: null,
        });
      },

      swipe: (direction) => {
        const {
          roundMovies, roundIndex, roundKept, roundRemoved,
        } = get();
        const movie = roundMovies[roundIndex];
        if (!movie) return;

        const nextKept = direction === 'right' ? [...roundKept, movie] : roundKept;
        const nextRemoved = direction === 'left' ? [...roundRemoved, movie] : roundRemoved;
        const nextIndex = roundIndex + 1;

        if (nextIndex < roundMovies.length) {
          set({ roundKept: nextKept, roundRemoved: nextRemoved, roundIndex: nextIndex });
          return;
        }

        const { nextMovies, message } = resolveRoundOutcome(roundMovies.length, nextKept, nextRemoved);

        if (nextMovies.length <= 1) {
          const finalMovie = nextMovies[0] ?? nextKept[0] ?? movie;

          set({
            roundKept: nextKept,
            roundRemoved: nextRemoved,
            roundIndex: nextIndex,
            phase: 'final',
            finalMovie,
          });
        } else {
          set({
            roundKept: nextKept,
            roundRemoved: nextRemoved,
            roundIndex: nextIndex,
            phase: 'transition',
            transition: { message, fromCount: roundMovies.length, toCount: nextMovies.length },
            pendingNextMovies: nextMovies,
          });
        }
      },

      continueToNextRound: () => {
        const { pendingNextMovies, roundNumber } = get();
        set({
          roundMovies: shuffle(pendingNextMovies),
          roundIndex: 0,
          roundKept: [],
          roundRemoved: [],
          roundNumber: roundNumber + 1,
          phase: phaseForRoundSize(pendingNextMovies.length),
          transition: null,
          pendingNextMovies: [],
        });
      },

      chooseFinal: (movie) => {
        set({ phase: 'final', finalMovie: movie });
      },

      endSession: () => set(initialState),
    }),
    {
      name: 'urwatch:session-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useSessionStore;
