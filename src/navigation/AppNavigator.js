import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabNavigator } from './TabNavigator';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { PreferencesScreen } from '../screens/PreferencesScreen';
import { SwipeScreen } from '../screens/SwipeScreen';
import { MovieDetailsScreen } from '../screens/MovieDetailsScreen';
import { BrowseMoviesScreen } from '../screens/BrowseMoviesScreen';
import { useUserStore } from '../store/userStore';
import { useThemeStore } from '../store/themeStore';
import { useColors } from '../theme/useColors';

const Stack = createNativeStackNavigator();

const useHasHydrated = (store) => {
  const [hydrated, setHydrated] = useState(store.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return undefined;
    const unsubscribe = store.persist.onFinishHydration(() => setHydrated(true));
    if (store.persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, [store, hydrated]);

  return hydrated;
};

export const AppNavigator = () => {
  const hasCompletedOnboarding = useUserStore((state) => state.hasCompletedOnboarding);
  const hasHydrated = useHasHydrated(useUserStore);
  const mode = useThemeStore((state) => state.mode);
  const colors = useColors();

  const navigationTheme = {
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.backgroundSecondary,
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
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {!hasCompletedOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="Preferences"
              component={PreferencesScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="Swipe"
              component={SwipeScreen}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} />
            <Stack.Screen name="BrowseMovies" component={BrowseMoviesScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
