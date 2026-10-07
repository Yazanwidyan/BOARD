import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import {
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts } from "../../theme/typography";
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
const INACTIVE_COLOR = "rgba(255, 255, 255, 0.82)";
const BOTTOM_GAP = 8;

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
// blur (iOS) behind icons + labels, and a soft highlight pill behind the
// active tab. Android has no blur for this view (expo-blur needs a
// BlurTargetView there), so it gets a denser tint instead.
export const GlassTabBar = ({ state, navigation }) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);
  const blurKey = useForegroundKey();

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
          tint="systemThinMaterialDark"
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.tint} pointerEvents="none" />

      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const Icon = getTabIcon(route.name, isFocused);
        const color = isFocused ? colors.accentLight : INACTIVE_COLOR;
        return (
          <Pressable
            key={route.key}
            style={styles.item}
            onPress={() => selectIndex(index)}
            accessibilityRole="button"
            accessibilityState={{ selected: isFocused }}
          >
            {/* The highlight wraps icon + label together. */}
            <View style={[styles.pill, isFocused && styles.pillActive]}>
              <Icon
                size={ICON_SIZES[route.name] ?? DEFAULT_ICON_SIZE}
                color={color}
              />
              <Text
                numberOfLines={1}
                style={[styles.label, isFocused && styles.labelActive]}
              >
                {LABELS[route.name]}
              </Text>
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
      left: SIDE_INSET,
      right: SIDE_INSET,
      height: GLASS_TAB_BAR_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 6,
      borderRadius: GLASS_TAB_BAR_HEIGHT / 2,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255, 255, 255, 0.18)",
      // Above elevated cards on Android; ignored on iOS.
      elevation: 10,
    },
    tint: {
      ...StyleSheet.absoluteFillObject,
      // Near-black over the blur, for a darker, smoky glass.
      backgroundColor:
        Platform.OS === "ios" ? "rgba(0, 0, 0, 0.4)" : "rgba(8, 8, 14, 0.94)",
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
      gap: 2,
      borderRadius: (GLASS_TAB_BAR_HEIGHT - 12) / 2,
    },
    pillActive: {
      backgroundColor: "rgba(255, 255, 255, 0.14)",
    },
    label: {
      fontFamily: fonts.semiBold,
      fontSize: 11,
      color: INACTIVE_COLOR,
    },
    labelActive: {
      color: colors.accentLight,
    },
  });

export default GlassTabBar;
