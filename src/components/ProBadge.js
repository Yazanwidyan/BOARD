import { StyleSheet, View } from "react-native";

import { useColors } from "../theme/useColors";
import { accentColor } from "../utils/pro";
import { Text } from "./AppText";

// The small PRO tag beside a Pro member's name, in their accent (white
// when they haven't picked one).
export const ProBadge = ({ accent, style }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <View
      style={[styles.badge, { backgroundColor: accentColor(accent) ?? colors.textPrimary }, style]}
      accessibilityLabel="ReelBoard Pro"
    >
      <Text style={styles.text}>PRO</Text>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
      alignSelf: "center",
    },
    text: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "800",
      letterSpacing: 1,
      color: colors.background,
    },
  });

export default ProBadge;
