import { DarkTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { AchievementModal } from "../components/AchievementModal";
import { CompletionShareSheet } from "../components/CompletionShareSheet";
import { Toast } from "../components/Toast";
import { ActivityScreen } from "../screens/ActivityScreen";
import { BadgesScreen } from "../screens/BadgesScreen";
import { BrowseMoviesScreen } from "../screens/BrowseMoviesScreen";
import { ChallengeGeneratorScreen } from "../screens/ChallengeGeneratorScreen";
import { CollectionDetailsScreen } from "../screens/CollectionDetailsScreen";
import { MovieDetailsScreen } from "../screens/MovieDetailsScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { PreferencesScreen } from "../screens/PreferencesScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { SpinScreen } from "../screens/SpinScreen";
import { SwipeScreen } from "../screens/SwipeScreen";
import { AiPickScreen } from "../screens/AiPickScreen";
import { FriendProfileScreen } from "../screens/FriendProfileScreen";
import { FriendsScreen } from "../screens/FriendsScreen";
import { useChallengeStore } from "../store/challengeStore";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { useUserStore } from "../store/userStore";
import { useColors } from "../theme/useColors";
import { TabNavigator } from "./TabNavigator";

const Stack = createNativeStackNavigator();

const useHasHydrated = (store) => {
  const [hydrated, setHydrated] = useState(store.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return undefined;
    const unsubscribe = store.persist.onFinishHydration(() =>
      setHydrated(true),
    );
    if (store.persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, [store, hydrated]);

  return hydrated;
};

export const AppNavigator = () => {
  const hasCompletedOnboarding = useUserStore(
    (state) => state.hasCompletedOnboarding,
  );
  const hasUserHydrated = useHasHydrated(useUserStore);
  const hasMovieHydrated = useHasHydrated(useMovieStore);
  const hasProfileHydrated = useHasHydrated(useProfileStore);
  const hasChallengeHydrated = useHasHydrated(useChallengeStore);
  const hasHydrated =
    hasUserHydrated &&
    hasMovieHydrated &&
    hasProfileHydrated &&
    hasChallengeHydrated;
  const colors = useColors();

  const navigationTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.background,
      card: colors.card,
      border: colors.border,
      primary: colors.textPrimary,
      text: colors.textPrimary,
    },
  };

  if (!hasHydrated) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: "slide_from_right" }}
      >
        {!hasCompletedOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="Preferences"
              component={PreferencesScreen}
              options={{ animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="Swipe"
              component={SwipeScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen
              name="Spin"
              component={SpinScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="AiPick" component={AiPickScreen} />
            <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} />
            <Stack.Screen
              name="CollectionDetails"
              component={CollectionDetailsScreen}
            />
            <Stack.Screen
              name="ChallengeGenerator"
              component={ChallengeGeneratorScreen}
              options={{ animation: "slide_from_bottom" }}
            />
            <Stack.Screen name="BrowseMovies" component={BrowseMoviesScreen} />
            <Stack.Screen
              name="Search"
              component={SearchScreen}
              options={{ animation: "slide_from_bottom" }}
            />
            <Stack.Screen name="Activity" component={ActivityScreen} />
            <Stack.Screen name="Friends" component={FriendsScreen} />
            <Stack.Screen
              name="FriendProfile"
              component={FriendProfileScreen}
            />
            <Stack.Screen name="Badges" component={BadgesScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        )}
      </Stack.Navigator>
      <AchievementModal />
      <CompletionShareSheet />
      <Toast />
    </NavigationContainer>
  );
};

export default AppNavigator;
