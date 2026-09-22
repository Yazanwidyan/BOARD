import { useEffect, useState } from 'react';
import {
  Modal, Pressable, StyleSheet, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useThemeStore } from '../store/themeStore';
import { radius, spacing } from '../theme/spacing';

const OPEN_DURATION = 320;
const CLOSE_DURATION = 260;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;

// A hand-rolled bottom sheet (Reanimated + Gesture Handler, both already
// used elsewhere in the app) instead of Modal's built-in `animationType`,
// whose slide-up ships with an unrelated instant backdrop fade that reads
// as janky. The backdrop is a plain, non-transforming view (not part of the
// sheet's translateY), so only the sheet itself slides.
export const BottomSheet = ({ visible, onClose, children }) => {
  const mode = useThemeStore((state) => state.mode);
  const sheetColor = mode === 'dark' ? '#000000' : '#FFFFFF';
  const styles = createStyles(sheetColor);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetHeight = height - insets.top - spacing.sm;

  const [isMounted, setIsMounted] = useState(visible);
  const translateY = useSharedValue(sheetHeight);

  const close = () => {
    translateY.value = withTiming(sheetHeight, { duration: CLOSE_DURATION }, (finished) => {
      if (finished) runOnJS(setIsMounted)(false);
    });
  };

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      translateY.value = withTiming(0, { duration: OPEN_DURATION });
    } else {
      close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY) {
        runOnJS(onClose)();
      } else {
        translateY.value = withTiming(0, { duration: 200 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!isMounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View style={[styles.sheet, { height: sheetHeight }, sheetStyle]}>
          <GestureDetector gesture={pan}>
            <View style={styles.handleZone}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>

          <View style={styles.content}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const createStyles = (sheetColor) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: sheetColor,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
  },
  handleZone: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128, 128, 128, 0.4)',
  },
  content: {
    flex: 1,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
});

export default BottomSheet;
