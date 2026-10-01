import { useChallengeStore } from '../store/challengeStore';
import { useMovieStore } from '../store/movieStore';
import { useProfileStore } from '../store/profileStore';
import { useRecentSearchStore } from '../store/recentSearchStore';
import { useSessionStore } from '../store/sessionStore';
import { DEFAULT_PREFERENCES, useUserStore } from '../store/userStore';

// A genuine blank slate — distinct from what a fresh install actually gets
// (the seeded demo profile). Wipes every real piece of local state and
// sends the app back through onboarding, but sets hasSeeded to true (not
// back to false) specifically so it doesn't turn straight around and
// re-seed the demo profile the moment onboarding finishes again.
export const resetAppData = () => {
  useMovieStore.setState({
    watched: [],
    bucketList: [],
    pickedMovie: null,
    unlockedCollections: [],
  });
  useChallengeStore.setState({ activeChallenge: null, history: [] });
  useSessionStore.getState().endSession();
  useProfileStore.setState({ displayName: 'You', bio: '' });
  useRecentSearchStore.getState().clearSearches();
  useUserStore.setState({
    hasCompletedOnboarding: false,
    hasSeeded: true,
    preferences: DEFAULT_PREFERENCES,
  });
};

export default resetAppData;
