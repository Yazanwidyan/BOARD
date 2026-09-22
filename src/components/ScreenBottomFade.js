import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../store/themeStore';

const FADE_HEIGHT = 90;
const FADE_OPACITY = 0.12;

// A faint hint of a shadow at the very bottom edge of a screen, sitting
// under the floating tab bar so content doesn't just end abruptly. Matches
// the theme instead of always being a dark shadow, since a black fade over
// a white light-mode background reads as a dirty smudge. Kept short and
// low-opacity on purpose — barely noticeable, not a visible band.
export const ScreenBottomFade = () => {
  const mode = useThemeStore((state) => state.mode);
  const fadeColor = mode === 'dark' ? '0, 0, 0' : '255, 255, 255';

  return (
    <LinearGradient
      pointerEvents="none"
      colors={['transparent', `rgba(${fadeColor}, ${FADE_OPACITY})`]}
      style={styles.fade}
    />
  );
};

const styles = StyleSheet.create({
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: FADE_HEIGHT,
  },
});

export default ScreenBottomFade;
