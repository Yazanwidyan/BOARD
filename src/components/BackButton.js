import { ChevronLeft } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";

import { useColors } from "../theme/useColors";
import { t, useIsRTL } from "../i18n";

// The app's back control: a flat chevron, no circle or border, so it sits
// quietly in the header like the other header icons.
//
// `floating` brings back a solid circle for the few places the button sits
// over photos (Movie details, Collection details) and needs contrast.
// lucide's chevron-left is drawn from x≈8 of its 24-unit box; the flat
// button pulls it left by that much so the stroke lines up with the page's
// left edge instead of floating in from it.
const CHEVRON_INSET = 8 / 24;

export const BackButton = ({ onPress, size = 40, floating = false }) => {
  const colors = useColors();
  const isRTL = useIsRTL();
  const iconSize = floating ? size * 0.55 : size * 0.72;
  return (
    <Pressable
      onPress={onPress}
      // The flat button is only as wide as the chevron, so widen the touch
      // area to keep it easy to hit.
      hitSlop={floating ? 8 : { top: 8, bottom: 8, left: 12, right: 16 }}
      accessibilityRole="button"
      accessibilityLabel={t("Back")}
      style={({ pressed }) => [
        styles.button,
        floating
          ? { width: size, height: size }
          : {
              height: size,
              width: iconSize * (1 - CHEVRON_INSET),
              marginStart: -iconSize * CHEVRON_INSET,
              alignItems: "flex-start",
            },
        floating && {
          borderRadius: size / 2,
          backgroundColor: colors.cardElevated,
          borderWidth: 1,
          borderColor: colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      {/* Points the reading way back: left, or right in Arabic. */}
      <ChevronLeft
        style={isRTL && styles.flipped}
        size={iconSize}
        color={colors.textPrimary}
        strokeWidth={floating ? 2.4 : 1.75}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
  flipped: {
    transform: [{ scaleX: -1 }],
  },
  pressed: {
    opacity: 0.6,
  },
});

export default BackButton;
