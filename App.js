import { useCallback, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from "@expo-google-fonts/sora";
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from "@expo-google-fonts/ibm-plex-sans-arabic";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { syncLayoutDirection } from "./src/i18n";
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
  // Sora everywhere — see src/theme/typography.js.
  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
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

  return (
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
  );
}
