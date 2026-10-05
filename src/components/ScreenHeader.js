import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

export const HEADER_BAR_HEIGHT = 52;

// Every tab's header: a fixed-height, card-colored bar with a hairline
// border, the title on the left and actions on the right. It never folds or
// animates — anything more than a title (a live status line, a search
// field, tab chips) lives at the top of the page instead, in <PageIntro>.
//
// Usage:
//   const header = useDockHeader();
//   <Animated.ScrollView onScroll={header.onScroll} scrollEventThrottle={16}
//     contentContainerStyle={{ paddingTop: header.contentInset }}>
//     <PageIntro subtitle="…">{controls}</PageIntro>
//   …
//   <DockHeader {...header.props} title="Library" right={…} />
export const useDockHeader = () => {
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  return {
    scrollY,
    onScroll,
    contentInset: insets.top + HEADER_BAR_HEIGHT + spacing.md,
    props: {},
  };
};

// The round icon button every tab's header actions use.
export const HeaderIconButton = ({ onPress, children, style }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <Pressable style={[styles.iconButton, style]} onPress={onPress} hitSlop={6}>
      {children}
    </Pressable>
  );
};

// Title (with an optional small `eyebrow` line above it, e.g. Home's
// greeting) on the left, actions on the right — no centered title.
export const DockHeader = ({ title, eyebrow, right }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        { paddingTop: insets.top, height: insets.top + HEADER_BAR_HEIGHT },
      ]}
    >
      <View style={styles.leftTitleBlock}>
        {!!eyebrow && (
          <Text style={styles.leftEyebrow} numberOfLines={1}>
            {eyebrow}
          </Text>
        )}
        <Text
          style={eyebrow ? styles.leftTitle : styles.title}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
};

// The top of a tab's page: optional eyebrow, a large title (Home only), the
// live status line, and any controls (passed as children).
export const PageIntro = ({ eyebrow, title, subtitle, children }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.intro}>
      {!!eyebrow && <Text style={styles.introEyebrow}>{eyebrow}</Text>}
      {!!title && <Text style={styles.introTitle}>{title}</Text>}
      {!!subtitle && <Text style={styles.introSubtitle}>{subtitle}</Text>}
      {children ? (
        <View style={(eyebrow || title || subtitle) && styles.introControls}>
          {children}
        </View>
      ) : null}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // Above the scroll content on both platforms: zIndex for iOS, and on
    // Android an elevation higher than any card's, since Android draws
    // elevated views above non-elevated siblings regardless of order.
    bar: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      elevation: 16,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    right: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    title: {
      ...typography.title,
      fontSize: 20,
      color: colors.textPrimary,
    },
    leftTitleBlock: {
      flex: 1,
      marginRight: spacing.sm,
    },
    leftEyebrow: {
      ...typography.label,
      fontSize: 10,
      color: colors.accentLight,
    },
    leftTitle: {
      ...typography.subtitle,
      fontSize: 17,
      color: colors.textPrimary,
      marginTop: 1,
    },
    iconButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevatedLight,
    },
    intro: {
      paddingHorizontal: spacing.md,
    },
    introEyebrow: {
      ...typography.label,
      color: colors.accentLight,
      marginBottom: spacing.xs,
    },
    introTitle: {
      ...typography.display,
      color: colors.textPrimary,
    },
    introSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    introControls: {
      marginTop: spacing.md,
    },
  });
