import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { shadows } from "../theme/shadows";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Primary is a 2px gradient "rim" (darker blue at the bottom, light blue at
// the top) around a solid blue face — the same treatment as the web app's
// primary button.
const PRIMARY_RIM = ["#8ecbff", "#2c80d4"];
const PRIMARY_FACE = "#3aa0ff";

const getVariantStyles = (colors) => ({
  primary: {
    container: { backgroundColor: PRIMARY_FACE },
    text: { color: "#FFFFFF" },
    shadow: shadows.glow,
  },
  secondary: {
    container: {
      backgroundColor: colors.card,
    },
    text: { color: colors.textPrimary },
    shadow: null,
  },
  outline: {
    container: {
      backgroundColor: "transparent",
    },
    text: { color: colors.textPrimary },
    shadow: null,
  },
  ghost: {
    container: { backgroundColor: "transparent" },
    text: { color: colors.textSecondary },
    shadow: null,
  },
  // White pill for use on top of a solid accent-colored surface (e.g. a
  // filled promo-style card) — inverse of `primary`.
  light: {
    container: { backgroundColor: colors.accentContrast },
    text: { color: colors.background },
    shadow: null,
  },
});

export const PrimaryButton = ({
  label,
  onPress,
  variant = "primary",
  icon,
  disabled = false,
  dense = false,
  style,
  contentStyle,
  textStyle,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const variantStyles = getVariantStyles(colors);
  const variantStyle = variantStyles[variant] ?? variantStyles.primary;
  const isPrimary = variant === "primary" || !variantStyles[variant];
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isPrimary ? 0.9 : 1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { duration: 100 });
    if (isPrimary) opacity.value = withTiming(1, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
    if (isPrimary) opacity.value = withTiming(0.9, { duration: 150 });
  };

  const face = (
    <View
      style={[
        styles.base,
        dense && styles.baseDense,
        isPrimary && styles.primaryFace,
        variantStyle.container,
        contentStyle,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.text,
          variantStyle.text,
          isPrimary && styles.primaryText,
          icon && styles.textWithIcon,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        !disabled && variantStyle.shadow,
        animatedStyle,
        disabled && styles.disabled,
        style,
      ]}
    >
      {isPrimary ? (
        <LinearGradient colors={PRIMARY_RIM} style={styles.primaryRim}>
          {face}
        </LinearGradient>
      ) : (
        face
      )}
    </AnimatedPressable>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    base: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      overflow: "hidden",
    },
    baseDense: {
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.md,
    },
    primaryRim: {
      padding: 2,
      borderRadius: 12,
    },
    primaryFace: {
      borderRadius: 10,
    },
    primaryText: {
      letterSpacing: -0.2,
    },
    disabled: {
      opacity: 0.4,
    },
    text: {
      ...typography.subtitle,
    },
    textWithIcon: {
      marginLeft: spacing.sm,
    },
  });

export default PrimaryButton;
