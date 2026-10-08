import { useColorScheme } from "react-native";

import { useThemeStore } from "../store/themeStore";
import { darkColors, lightColors } from "./palettes";

// The palette for the current appearance: the user's choice in Settings,
// or the phone's light/dark setting when that's "system". Screens build
// their styles from this on every render, so switching applies at once.
export const useColors = () => {
  const mode = useThemeStore((state) => state.mode);
  const systemScheme = useColorScheme();
  const isDark = mode === "system" ? systemScheme !== "light" : mode === "dark";
  return isDark ? darkColors : lightColors;
};

export default useColors;
