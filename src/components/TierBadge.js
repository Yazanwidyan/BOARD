import { StyleSheet, View } from "react-native";
import { Text } from "./AppText";

import { fonts } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { TIER_INK, getTierInfo } from "../utils/tiers";

// A tier, drawn the same way everywhere it shows: a rounded square in the
// tier's colour with its letter in near-black. Only the size changes —
// the corners and the letter scale with it.
//   tier    "S" … "F", or nothing: not tiered yet — a dashed square with
//           a dash.
//   muted   the letter on a plain square, for a tier with nothing in it
//           (Profile's six, S to F).
//   onPoster  on a poster's top corner.
export const TierBadge = ({ tier, size = 22, muted = false, onPoster = false, style }) => {
  const colors = useColors();
  const info = getTierInfo(tier);
  const box = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.28),
  };
  const letter = {
    fontSize: Math.round(size * 0.56),
    lineHeight: Math.round(size * 0.7),
  };
  return (
    <View
      style={[
        styles.box,
        box,
        info && !muted
          ? { backgroundColor: info.color }
          : info
            ? { backgroundColor: colors.cardElevatedLight }
            : [styles.empty, { borderColor: colors.textMuted }],
        onPoster && styles.onPoster,
        style,
      ]}
      accessibilityLabel={info ? `${info.key}` : undefined}
    >
      <Text style={[styles.letter, letter, { color: info && !muted ? TIER_INK : colors.textMuted }]}>
        {info ? info.key : "–"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  onPoster: {
    position: "absolute",
    top: 6,
    start: 6,
  },
  letter: {
    fontFamily: fonts.extraBold,
    textAlign: "center",
    includeFontPadding: false,
  },
});

export default TierBadge;
