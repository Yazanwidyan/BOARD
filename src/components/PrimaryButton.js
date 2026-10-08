import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./AppText";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { shadows } from "../theme/shadows";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const getVariantStyles = (colors) => ({
  primary: {
    container: { backgroundColor: colors.accent },
    text: { color: colors.accentContrast },
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
    container: { backgroundColor: "#FFFFFF" },
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
      <View
        style={[
          styles.base,
          dense && styles.baseDense,
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
    </AnimatedPressable>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    base: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 11,
      paddingHorizontal: spacing.md,
      // Square, like every other filled box in the app.
      borderRadius: 0,
      overflow: "hidden",
    },
    baseDense: {
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.md,
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
      marginStart: spacing.sm,
    },
  });

export default PrimaryButton;
