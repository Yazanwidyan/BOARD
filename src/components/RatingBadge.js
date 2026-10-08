import { Star } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { Text } from "./AppText";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

export const RatingBadge = ({ rating, size = "md" }) => {
  const isSmall = size === "sm";
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <View style={[styles.container, isSmall && styles.containerSmall]}>
      <Star
        size={isSmall ? 11 : 13}
        color={colors.success}
        fill={colors.success}
      />
      <Text style={[styles.text, isSmall && styles.textSmall]}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.successSoft,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: 0,
      gap: 4,
    },
    containerSmall: {
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    text: {
      ...typography.caption,
      color: colors.success,
    },
    textSmall: {
      fontSize: 11,
    },
  });

export default RatingBadge;
