import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const FADE_HEIGHT = 90;
const FADE_OPACITY = 0.12;

// A faint hint of a shadow at the very bottom edge of a screen, sitting
// under the floating tab bar so content doesn't just end abruptly. Kept
// short and low-opacity on purpose — barely noticeable, not a visible band.
export const ScreenBottomFade = () => (
  <LinearGradient
    pointerEvents="none"
    colors={["transparent", `rgba(0, 0, 0, ${FADE_OPACITY})`]}
    style={styles.fade}
  />
);

const styles = StyleSheet.create({
  fade: {
    position: "absolute",
    start: 0,
    end: 0,
    bottom: 0,
    height: FADE_HEIGHT,
  },
});

export default ScreenBottomFade;
