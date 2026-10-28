import { Pressable, StyleSheet, View } from "react-native";

import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";

// The round buttons: one size.
const SIZE = 40;

// The app's action button, wherever a few actions share a row (Home's
// cards, a movie's page): its icon in a circle, its name under; a row of
// them shares the width evenly, every one the same. The states:
//   `on`   — switched on (saved, tonight's pick): filled in the signature
//            colour (`brand`), a dark icon;
//   `done` — finished (watched): green, the colour for done.
// `tint`: a feature's colour — the icon's, and the fill when it's on.
// `a11yLabel`: a fuller name for screen readers, when the label's short.
export const RoundAction = ({
  Icon,
  label,
  a11yLabel,
  onPress,
  on = false,
  done = false,
  tint,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const iconColor = done
    ? colors.success
    : on
      ? colors.brandText
      : (tint ?? colors.textPrimary);
  return (
    <Pressable
      style={styles.action}
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      accessibilityState={{ selected: on || done }}
    >
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.circle,
              on && styles.circleOn,
              done && styles.circleDone,
              tint && on && { backgroundColor: tint },
              pressed && styles.pressed,
            ]}
          >
            <Icon size={18} color={iconColor} strokeWidth={1.9} />
          </View>
          <Text style={[styles.label, done && styles.labelDone]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    action: {
      flex: 1,
      alignItems: "center",
      gap: 6,
    },
    circle: {
      width: SIZE,
      height: SIZE,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevatedLight,
      borderRadius: SIZE / 2,
    },
    circleOn: {
      backgroundColor: colors.brand,
    },
    circleDone: {
      backgroundColor: colors.successSoft,
    },
    pressed: {
      opacity: 0.7,
    },
    // The text colour, with a soft shadow in dark mode so it reads over a
    // film's still too.
    label: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 14,
      color: colors.textPrimary,
      ...(colors.isDark && {
        textShadowColor: "rgba(0, 0, 0, 0.6)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      }),
    },
    labelDone: {
      color: colors.success,
    },
  });

export default RoundAction;
