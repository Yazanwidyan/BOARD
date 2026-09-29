import { ChevronLeft } from "lucide-react-native";
import { Pressable, StyleSheet } from "react-native";

import colors from "../theme/palettes";
import { radius } from "../theme/spacing";

// Same solid black badge every back button in the app uses, so it reads as
// one consistent control — just the chevron, no label.
export const BackButton = ({ onPress, size = 40 }) => (
  <Pressable
    onPress={onPress}
    hitSlop={8}
    style={[
      styles.button,
      {
        width: size,
        height: size,
        borderRadius: radius.sm,
        backgroundColor: colors.cardElevated,
        borderWidth: 1,
        borderColor: colors.border,
      },
    ]}
  >
    <ChevronLeft size={size * 0.55} color="#FFFFFF" strokeWidth={2.4} />
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default BackButton;
