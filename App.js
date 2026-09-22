import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppSplashScreen } from './src/screens/AppSplashScreen';
import { useColors } from './src/theme/useColors';
import { useThemeStore } from './src/store/themeStore';

SplashScreen.preventAutoHideAsync();

// How long the custom in-app splash (logo on #0B0B0F) stays up once the
// native splash hands off to it, before the real navigator mounts.
const SPLASH_TIMEOUT_MS = 3000;

export default function App() {
  const colors = useColors();
  const mode = useThemeStore((state) => state.mode);
  const [fontsLoaded] = useFonts({
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!fontsLoaded) return undefined;
    const timer = setTimeout(() => setShowSplash(false), SPLASH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [fontsLoaded]);

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
      style={{ flex: 1, backgroundColor: colors.background }}
      onLayout={onLayoutRootView}
    >
      <SafeAreaProvider>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        {showSplash ? <AppSplashScreen /> : <AppNavigator />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
