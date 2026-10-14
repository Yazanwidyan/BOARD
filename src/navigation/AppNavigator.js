import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { AchievementModal } from "../components/AchievementModal";
import { CompletionShareSheet } from "../components/CompletionShareSheet";
import { Toast } from "../components/Toast";
import { AccountScreen } from "../screens/AccountScreen";
import { ActivityScreen } from "../screens/ActivityScreen";
import { BadgesScreen } from "../screens/BadgesScreen";
import { BoardDetailsScreen } from "../screens/BoardDetailsScreen";
import { BrowseMoviesScreen } from "../screens/BrowseMoviesScreen";
import { ChallengeGeneratorScreen } from "../screens/ChallengeGeneratorScreen";
import { CollectionDetailsScreen } from "../screens/CollectionDetailsScreen";
import { MovieDetailsScreen } from "../screens/MovieDetailsScreen";
import { MovieNightScreen } from "../screens/MovieNightScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { PreferencesScreen } from "../screens/PreferencesScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { SpinScreen } from "../screens/SpinScreen";
import { SwipeScreen } from "../screens/SwipeScreen";
import { TierMovieScreen } from "../screens/TierMovieScreen";
import { AiPickScreen } from "../screens/AiPickScreen";
import { FriendProfileScreen } from "../screens/FriendProfileScreen";
import { FriendsScreen } from "../screens/FriendsScreen";
import { AccountLoadingScreen } from "../screens/AccountLoadingScreen";
import { AuthScreen } from "../screens/AuthScreen";
import { startSync } from "../services/sync";
import { useAuthStore } from "../store/authStore";
import { useUserStore } from "../store/userStore";
import { useLanguageStore } from "../store/languageStore";
import { useThemeStore } from "../store/themeStore";
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
  // The only things kept on the device: the session, and the language and
  // theme (so the sign-in screen shows right before an account is loaded —
  // the account's own settings take over once it is). Everything else is
  // loaded from the server.
  const hasAuthHydrated = useHasHydrated(useAuthStore);
  const hasLanguageHydrated = useHasHydrated(useLanguageStore);
  const hasThemeHydrated = useHasHydrated(useThemeStore);
  const hasHydrated = hasAuthHydrated && hasLanguageHydrated && hasThemeHydrated;
  const signedIn = useAuthStore((state) => Boolean(state.token));
  const accountReady = useAuthStore((state) => state.status === "ready");
  const colors = useColors();

  // Once the saved session is known, load the account from the server
  // (if signed in) and start sending changes to it.
  useEffect(() => {
    if (hasHydrated) startSync();
  }, [hasHydrated]);

  const baseTheme = colors.isDark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
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
        {!signedIn ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : !accountReady ? (
          <Stack.Screen name="AccountLoading" component={AccountLoadingScreen} />
        ) : !hasCompletedOnboarding ? (
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
            <Stack.Screen
              name="MovieNight"
              component={MovieNightScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="BoardDetails" component={BoardDetailsScreen} />
            <Stack.Screen
              name="TierMovie"
              component={TierMovieScreen}
              options={{ animation: "slide_from_bottom" }}
            />
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
            <Stack.Screen name="Account" component={AccountScreen} />
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
