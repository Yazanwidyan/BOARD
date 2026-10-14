import { useCallback, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
// Just the five weights the app uses — the package root would pull in all
// eighteen Inter files, italics included.
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";
import { IBMPlexSansArabic_400Regular } from "@expo-google-fonts/ibm-plex-sans-arabic/400Regular";
import { IBMPlexSansArabic_500Medium } from "@expo-google-fonts/ibm-plex-sans-arabic/500Medium";
import { IBMPlexSansArabic_600SemiBold } from "@expo-google-fonts/ibm-plex-sans-arabic/600SemiBold";
import { IBMPlexSansArabic_700Bold } from "@expo-google-fonts/ibm-plex-sans-arabic/700Bold";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { syncLayoutDirection } from "./src/i18n";
import { persistOptions, queryClient } from "./src/services/queryClient";
import { useLanguageStore } from "./src/store/languageStore";
import { useColors } from "./src/theme/useColors";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const colors = useColors();
  const language = useLanguageStore((state) => state.language);

  // Once the saved language loads, make sure the layout direction matches
  // it (Arabic is right-to-left).
  useEffect(() => {
    if (useLanguageStore.persist.hasHydrated()) syncLayoutDirection();
    return useLanguageStore.persist.onFinishHydration(syncLayoutDirection);
  }, []);
  // Inter everywhere — see src/theme/typography.js.
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    // Arabic (see src/theme/typography.js).
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });

  const onLayoutRootView = useCallback(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  // The query cache (the account's data and its waiting changes) is
  // restored from the device before anything reads it — see
  // services/queryClient.js.
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
    >
      <GestureHandlerRootView
        style={{
          flex: 1,
          backgroundColor: colors.background,
          // Arabic mirrors the whole layout (see src/i18n).
          direction: language === "ar" ? "rtl" : "ltr",
        }}
        onLayout={onLayoutRootView}
      >
        <SafeAreaProvider>
          <StatusBar style={colors.isDark ? "light" : "dark"} />
          {/* Keyed on the language: switching it remounts the screens so
            every t() reads the new language at once — no restart. */}
          <AppNavigator key={language} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </PersistQueryClientProvider>
  );
}
