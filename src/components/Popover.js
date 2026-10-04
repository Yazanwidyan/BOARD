import { Modal, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";

import { radius } from "../theme/spacing";
import { useColors } from "../theme/useColors";

// A small menu anchored under the button that opened it — `anchor` is
// { top, right } in window coordinates (measureInWindow the button, then
// top = y + height + gap, right = windowWidth - (x + width)). Grows out of
// its top-right corner; tapping anywhere else closes it.
export const Popover = ({
  visible,
  anchor,
  onClose,
  children,
  width = 220,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View
        entering={ZoomIn.springify().damping(18).stiffness(260)}
        exiting={FadeOut.duration(120)}
        style={[
          styles.menu,
          { top: anchor.top, right: anchor.right, width },
          { transformOrigin: "top right" },
        ]}
      >
        <Animated.View entering={FadeIn.duration(120)}>
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    menu: {
      position: "absolute",
      paddingVertical: 6,
      borderRadius: radius.md,
      backgroundColor: colors.cardElevated,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.08)",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 12,
    },
  });

export default Popover;
