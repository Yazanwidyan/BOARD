import {
  Bookmark,
  CheckCheck,
  Clapperboard,
  Clock,
  Layers,
  Search,
} from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Text } from "./AppText";

import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { PrimaryButton } from "./PrimaryButton";

const FRONT_WIDTH = 64;
const BACK_WIDTH = 52;

// One thin icon per kind of empty — the `art` names are kept from the old
// drawn scenes so callers don't change.
const ART_ICONS = {
  emptyShelf: Bookmark, // nothing saved yet
  noDiscs: Clapperboard, // nothing watched yet
  noMatches: Search, // a search / filter with no results
  allTiered: CheckCheck, // nothing left to do
  comingSoon: Clock,
  noCollections: Layers, // no collections yet
};

// Three blank posters, fanned like a little stack — the front one carries
// the icon. A shelf waiting for films.
const PosterStack = ({ Icon, styles, colors }) => (
  <Animated.View entering={FadeIn.duration(300)} style={styles.stack} pointerEvents="none">
    <View style={[styles.back, styles.backStart]} />
    <View style={[styles.back, styles.backEnd]} />
    <View style={styles.front}>
      <Icon size={24} color={colors.textSecondary} strokeWidth={1.7} />
    </View>
  </Animated.View>
);

// An empty screen or list: a little stack of blank posters with an icon on
// the front one, a title, a grey line, and — when there's a way forward —
// a button for it. `art` picks the icon (ART_ICONS), or pass `Icon` (a
// lucide icon) directly; `icon` (any element) still replaces the stack.
export const EmptyState = ({
  art,
  Icon: IconProp,
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const Icon = IconProp ?? ART_ICONS[art];

  return (
    <View style={styles.wrap}>
      {Icon ? <PosterStack Icon={Icon} styles={styles} colors={colors} /> : icon}
      <Animated.View entering={FadeInDown.duration(320).delay(80)} style={styles.words}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </Animated.View>
      {actionLabel && onAction ? (
        <Animated.View entering={FadeIn.duration(300).delay(160)} style={styles.action}>
          <PrimaryButton label={actionLabel} onPress={onAction} dense />
        </Animated.View>
      ) : null}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xl,
    },
    // The stack: two blank posters leaning out behind the front one.
    stack: {
      width: FRONT_WIDTH + BACK_WIDTH,
      height: FRONT_WIDTH * 1.5,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.lg,
    },
    back: {
      position: "absolute",
      width: BACK_WIDTH,
      aspectRatio: 2 / 3,
      backgroundColor: colors.card,
      borderRadius: shape.poster,
    },
    backStart: {
      start: 0,
      transform: [{ rotate: "-10deg" }],
    },
    backEnd: {
      end: 0,
      transform: [{ rotate: "10deg" }],
    },
    front: {
      width: FRONT_WIDTH,
      aspectRatio: 2 / 3,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevatedLight,
      borderRadius: shape.poster,
      shadowColor: "#000",
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    words: {
      alignItems: "center",
      gap: spacing.xs + 2,
    },
    title: {
      ...typography.bodyBold,
      fontSize: 17,
      lineHeight: 22,
      color: colors.textPrimary,
      textAlign: "center",
    },
    subtitle: {
      ...typography.body,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      textAlign: "center",
      maxWidth: 280,
    },
    action: {
      marginTop: spacing.lg,
      minWidth: 180,
    },
  });

export default EmptyState;
