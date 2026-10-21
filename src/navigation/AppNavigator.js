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
import { BoardDetailsScreen } from "../screens/BoardDetailsScreen";
import { BrowseMoviesScreen } from "../screens/BrowseMoviesScreen";
import { ChallengeGeneratorScreen } from "../screens/ChallengeGeneratorScreen";
import { CollectionDetailsScreen } from "../screens/CollectionDetailsScreen";
import { EditProfileScreen } from "../screens/EditProfileScreen";
import { MovieDetailsScreen } from "../screens/MovieDetailsScreen";
import { MovieNightScreen } from "../screens/MovieNightScreen";
import { GroupNightScreen } from "../screens/GroupNightScreen";
import { RanksScreen } from "../screens/RanksScreen";
import { RecapScreen } from "../screens/RecapScreen";
import { OnboardingScreen } from "../screens/OnboardingScreen";
import { PreferencesScreen } from "../screens/PreferencesScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { SwipeScreen } from "../screens/SwipeScreen";
import { TasteScreen } from "../screens/TasteScreen";
import { TierListScreen } from "../screens/TierListScreen";
import { TierMovieScreen } from "../screens/TierMovieScreen";
import { AiPickScreen } from "../screens/AiPickScreen";
import { WildcardScreen } from "../screens/WildcardScreen";
import { SimilarScreen } from "../screens/SimilarScreen";
import { FriendProfileScreen } from "../screens/FriendProfileScreen";
import { ClubDetailsScreen } from "../screens/ClubDetailsScreen";
import { ClubsScreen } from "../screens/ClubsScreen";
import { FriendsScreen } from "../screens/FriendsScreen";
import { AccountLoadingScreen } from "../screens/AccountLoadingScreen";
import { EmailAuthScreen } from "../screens/EmailAuthScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { startNotifications } from "../services/notifications";
import { startSync } from "../services/sync";
import { useAuthStore } from "../store/authStore";
import { useUserStore } from "../store/userStore";
import { useLanguageStore } from "../store/languageStore";
import { useThemeStore } from "../store/themeStore";
import { useColors } from "../theme/useColors";
import { TabNavigator } from "./TabNavigator";

const Stack = createNativeStackNavigator();

// Links into the app (the "reelboard" scheme in app.json): a movie night
// invite (reelboard://night/ABC123) opens straight into the room, and
// notifications open Friends, the recap or Decide. Only screens that exist
// right now can be opened: signed out, a link just opens the app.
const LINKING = {
  prefixes: ["reelboard://"],
  config: {
    screens: {
      GroupNight: "night/:code",
      Friends: "friends",
      Recap: "recap",
      Main: { screens: { Decide: "decide" } },
    },
  },
};

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
  // All that's kept on the device: the session, and the language and
  // theme (Arabic's right-to-left layout has to be set before anything
  // shows; the account's own settings take over once it's loaded).
  // Everything else comes from the server on every launch.
  const hasAuthHydrated = useHasHydrated(useAuthStore);
  const hasLanguageHydrated = useHasHydrated(useLanguageStore);
  const hasThemeHydrated = useHasHydrated(useThemeStore);
  const hasHydrated = hasAuthHydrated && hasLanguageHydrated && hasThemeHydrated;
  const signedIn = useAuthStore((state) => Boolean(state.token));
  const accountReady = useAuthStore((state) => state.status === "ready");
  const colors = useColors();

  // Once the saved session is in, load the account from the server.
  useEffect(() => {
    if (hasHydrated) startSync();
  }, [hasHydrated]);

  // An account is in: its reminders and push token (if notifications are
  // switched on — see services/notifications).
  useEffect(() => {
    if (accountReady) startNotifications();
  }, [accountReady]);

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
    <NavigationContainer theme={navigationTheme} linking={LINKING}>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: "slide_from_right" }}
      >
        {!signedIn ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="EmailAuth" component={EmailAuthScreen} />
          </>
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
            <Stack.Screen name="AiPick" component={AiPickScreen} />
            <Stack.Screen name="Similar" component={SimilarScreen} />
            {/* Scratching shouldn't swipe the screen away. */}
            <Stack.Screen
              name="Wildcard"
              component={WildcardScreen}
              options={{ gestureEnabled: false, animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="MovieNight"
              component={MovieNightScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="Recap" component={RecapScreen} />
            <Stack.Screen
              name="GroupNight"
              component={GroupNightScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="BoardDetails" component={BoardDetailsScreen} />
            <Stack.Screen
              name="TierMovie"
              component={TierMovieScreen}
              // A quick rise and fade — tiering is a one-thumb moment.
              options={{ animation: "fade_from_bottom", animationDuration: 200 }}
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
            <Stack.Screen name="Clubs" component={ClubsScreen} />
            <Stack.Screen name="ClubDetails" component={ClubDetailsScreen} />
            <Stack.Screen
              name="FriendProfile"
              component={FriendProfileScreen}
            />
            <Stack.Screen name="Ranks" component={RanksScreen} />
            <Stack.Screen name="TierList" component={TierListScreen} />
            <Stack.Screen name="Taste" component={TasteScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
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
