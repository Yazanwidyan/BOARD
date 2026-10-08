import { Modal, Pressable, StyleSheet, View } from "react-native";

import { radius } from "../theme/spacing";
import { useColors } from "../theme/useColors";
import { useLayoutDirection } from "../i18n";

// A small menu anchored under the button that opened it — `anchor` is
// { top, right } in window coordinates (measureInWindow the button, then
// top = y + height + gap, right = windowWidth - (x + width)). Appears and
// disappears instantly — no animation; tapping anywhere else closes it.
export const Popover = ({
  visible,
  anchor,
  onClose,
  children,
  width = 220,
}) => {
  const colors = useColors();
  const direction = useLayoutDirection();
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
      {/* Modals are their own layer: carry the language's direction. */}
      <View style={{ flex: 1, direction }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[styles.menu, { top: anchor.top, right: anchor.right, width }]}
        >
          {children}
        </View>
      </View>
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
      borderColor: colors.border,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 12,
    },
  });

export default Popover;
