import { useIsFocused } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../i18n";
import { useTipsStore } from "../store/tipsStore";
import { TAB_BAR_CLEARANCE, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";

// What each main screen is for — shown once, the first time you open it.
const TIPS = {
  home: {
    title: "Home",
    body: "Tonight's pick, your dare, and what to watch next — all in one place.",
  },
  discover: {
    title: "Discover",
    body: "Watch trailer clips in Reels, or browse rails picked for your taste. Tap + to save a movie.",
  },
  decide: {
    title: "Decide",
    body: "Can't choose? Swipe, Spin, or let the AI pick — or take a dare for bonus XP.",
  },
  library: {
    title: "Library",
    body: "Your watchlist, what you've watched, and collections. Tier what you watch from S to F.",
  },
  profile: {
    title: "Profile",
    body: "Your level, badges and taste. Pick your top ten and share your taste card.",
  },
};

// A small card floating just above the tab bar, the first time a screen is
// opened: what the screen is for, and "Got it". It waits a beat after the
// screen appears, shows only while that screen is in front, and never
// again once dismissed.
export const FirstVisitTip = ({ id }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const seen = useTipsStore((state) => !!state.seen[id]);
  const markSeen = useTipsStore((state) => state.markSeen);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isFocused || seen) return undefined;
    const timer = setTimeout(() => setReady(true), 500);
    return () => clearTimeout(timer);
  }, [isFocused, seen]);

  const tip = TIPS[id];
  if (!tip || seen || !isFocused || !ready) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(260)}
      exiting={FadeOutDown.duration(180)}
      style={[
        styles.card,
        { bottom: insets.bottom + TAB_BAR_CLEARANCE + spacing.sm },
      ]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.text}>
        <Text style={styles.title}>{t(tip.title)}</Text>
        <Text style={styles.body}>{t(tip.body)}</Text>
      </View>
      <Pressable
        onPress={() => markSeen(id)}
        hitSlop={10}
        accessibilityRole="button"
      >
        <Text style={styles.action}>{t("Got it")}</Text>
      </Pressable>
    </Animated.View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // A filled square box, lifted by a hairline border.
    card: {
      position: "absolute",
      start: spacing.md,
      end: spacing.md,
      zIndex: 50,
      elevation: 20,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.cardElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    text: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...typography.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    body: {
      ...typography.body,
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },
    action: {
      ...typography.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
  });

export default FirstVisitTip;
