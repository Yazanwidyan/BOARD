import { useState } from "react";
import { StyleSheet } from "react-native";

import { WORDMARK_FONT } from "../theme/typography";
import { Text } from "./AppText";

// The "ReelBoard" wordmark in its own face (Bebas Neue: capitals only).
// The font's built-in metrics leave room above and below the capitals that
// isn't the same on iOS and Android, so the word sits off-centre next to
// the logo. Once laid out, this measures where the capitals really are
// (the line's baseline and cap height) and shifts them to the exact middle
// of the line — so with `alignItems: "center"` beside an icon, the two line
// up on both platforms. `size`: the font size; `style`: colour etc.
export const Wordmark = ({ size, style, children = "ReelBoard" }) => {
  const [shift, setShift] = useState(0);
  return (
    <Text
      style={[
        styles.wordmark,
        { fontSize: size, lineHeight: size },
        style,
        { transform: [{ translateY: shift }] },
      ]}
      numberOfLines={1}
      onTextLayout={(event) => {
        const line = event.nativeEvent.lines?.[0];
        if (!line?.capHeight || !line.ascender) return;
        // Where the capitals are now (their middle), and where the line's
        // middle is — the difference is how far to move them.
        const baseline = line.y + line.ascender;
        const capsMiddle = baseline - line.capHeight / 2;
        const lineMiddle = line.y + line.height / 2;
        const next = Math.round((lineMiddle - capsMiddle) * 2) / 2;
        if (Math.abs(next - shift) >= 0.5) setShift(next);
      }}
      accessibilityRole="header"
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  wordmark: {
    fontFamily: WORDMARK_FONT,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
});

export default Wordmark;
