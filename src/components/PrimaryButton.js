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
  textStyle,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const variantStyles = getVariantStyles(colors);
  const variantStyle = variantStyles[variant] ?? variantStyles.primary;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.96, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 150 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        !disabled && variantStyle.shadow,
        disabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      <View style={[styles.base, dense && styles.baseDense, variantStyle.container]}>
        {icon}
        <Text
          style={[
            styles.text,
            variantStyle.text,
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
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      overflow: "hidden",
    },
    baseDense: {
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.md,
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
