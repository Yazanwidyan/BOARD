import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  AppState,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useProfileStore } from "../../store/profileStore";
import { useColors } from "../../theme/useColors";
import { DEFAULT_ICON_SIZE, ICON_SIZES, LABELS, getTabIcon } from "./tabConfig";

// Fixed height (not sized by its buttons) so the BlurView has its real
// frame from the very first layout — expo-blur only applies its effect on
// draw, and a view that's drawn at zero size and resized later stays an
// empty, transparent view. Same setup as the Blur lab panels, which work.
export const GLASS_TAB_BAR_HEIGHT = 64;
const SIDE_INSET = 16;
// Inactive icons + labels: a soft near-white, light enough to read clearly
// over the glass without competing with the active tab's accent color.
const inactiveColor = (colors) =>
  colors.isDark ? "rgba(255, 255, 255, 0.82)" : "rgba(0, 0, 0, 0.72)";
const BOTTOM_GAP = 8;
// The Profile tab shows your photo (once you've set one) instead of the
// person icon — like Instagram.
const AVATAR_SIZE = 28;

// Re-creates the BlurView whenever the app comes back to the foreground —
// iOS can stop the paused animator expo-blur uses for intensity while the
// app is backgrounded, which would leave the glass blank.
const useForegroundKey = () => {
  const [key, setKey] = useState(0);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") setKey((value) => value + 1);
    });
    return () => subscription.remove();
  }, []);
  return key;
};

// Frosted-glass floating tab bar: a full-width rounded slab with a real
// blur (iOS) behind the icons (no labels), and a soft highlight pill behind
// the active tab. Profile shows your photo when you have one. Android has no blur for this view (expo-blur needs a
// BlurTargetView there), so it gets a denser tint instead.
export const GlassTabBar = ({ state, navigation }) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);
  const blurKey = useForegroundKey();
  const avatarUri = useProfileStore((state) => state.avatarUri);

  const selectIndex = (index) => {
    const route = state.routes[index];
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (index !== state.index && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
    Haptics.selectionAsync();
  };

  return (
    <View
      style={[
        styles.bar,
        { bottom: Math.max(BOTTOM_GAP, insets.bottom - BOTTOM_GAP) },
      ]}
    >
      {Platform.OS === "ios" && (
        <BlurView
          key={blurKey}
          intensity={60}
          tint={
            colors.isDark ? "systemThinMaterialDark" : "systemThinMaterialLight"
          }
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.tint} pointerEvents="none" />

      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const Icon = getTabIcon(route.name, isFocused);
        const color = isFocused ? colors.textPrimary : inactiveColor(colors);
        return (
          <Pressable
            key={route.key}
            style={styles.item}
            onPress={() => selectIndex(index)}
            accessibilityRole="button"
            accessibilityLabel={LABELS[route.name]}
            accessibilityState={{ selected: isFocused }}
          >
            {/* Icons only — the highlight sits behind the icon. */}
            <View style={[styles.pill, isFocused && styles.pillActive]}>
              {route.name === "Profile" && avatarUri ? (
                <View
                  style={[
                    styles.avatarRing,
                    isFocused && styles.avatarRingActive,
                  ]}
                >
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                </View>
              ) : (
                <Icon
                  size={ICON_SIZES[route.name] ?? DEFAULT_ICON_SIZE}
                  color={color}
                />
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    bar: {
      position: "absolute",
      start: SIDE_INSET,
      end: SIDE_INSET,
      height: GLASS_TAB_BAR_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 6,
      borderRadius: GLASS_TAB_BAR_HEIGHT / 2,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.isDark
        ? "rgba(255, 255, 255, 0.18)"
        : "rgba(0, 0, 0, 0.08)",
      // Above elevated cards on Android; ignored on iOS.
      elevation: 10,
    },
    tint: {
      ...StyleSheet.absoluteFill,
      // Near-black over the blur, for a darker, smoky glass.
      backgroundColor:
        Platform.OS === "ios"
          ? colors.isDark
            ? "rgba(0, 0, 0, 0.4)"
            : "rgba(255, 255, 255, 0.55)"
          : colors.isDark
            ? "rgba(8, 8, 14, 0.94)"
            : "rgba(250, 250, 251, 0.96)",
    },
    item: {
      flex: 1,
      alignSelf: "stretch",
      paddingVertical: 6,
      paddingHorizontal: 2,
    },
    pill: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: (GLASS_TAB_BAR_HEIGHT - 12) / 2,
    },
    pillActive: {
      backgroundColor: colors.surfaceSoft,
    },
    // A thin ring around the photo marks it as the open tab.
    avatarRing: {
      width: AVATAR_SIZE + 4,
      height: AVATAR_SIZE + 4,
      borderRadius: (AVATAR_SIZE + 4) / 2,
      borderWidth: 1.5,
      borderColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarRingActive: {
      borderColor: colors.textPrimary,
    },
    avatar: {
      width: AVATAR_SIZE - 2,
      height: AVATAR_SIZE - 2,
      borderRadius: (AVATAR_SIZE - 2) / 2,
      backgroundColor: colors.card,
    },
  });

export default GlassTabBar;
