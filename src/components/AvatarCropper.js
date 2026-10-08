import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "./AppText";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { t } from "../i18n";

const MAX_ZOOM = 5;
const OUTPUT_SIZE = 512;
const SIDE_MARGIN = 24;

// Keeps the photo covering the whole circle: at zoom `z`, the photo can
// only slide as far as its overhang past the circle on each side.
const clampOffset = (offset, baseSize, zoom, diameter) => {
  "worklet";
  const max = Math.max(0, (baseSize * zoom - diameter) / 2);
  return Math.min(max, Math.max(-max, offset));
};

// Full-screen circular avatar cropper. The photo sits under a dark scrim
// with a round window; drag to move it, pinch to zoom (it can never leave
// the circle uncovered). "Use photo" crops exactly the circle's square to
// a 512 × 512 image and hands back its uri.
//
// image: { uri, width, height } — the picked photo, in pixels.
export const AvatarCropper = ({ image, onCancel, onDone }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [area, setArea] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const diameter = area
    ? Math.min(windowWidth - SIDE_MARGIN * 2, area.height - SIDE_MARGIN * 2)
    : 0;
  // Smallest size that covers the circle — zoom 1.
  const baseScale = image
    ? Math.max(diameter / image.width, diameter / image.height)
    : 1;
  const baseWidth = image ? image.width * baseScale : 0;
  const baseHeight = image ? image.height * baseScale : 0;

  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const zoom = useSharedValue(1);
  const start = useSharedValue({ x: 0, y: 0, zoom: 1 });

  const pan = Gesture.Pan()
    .onStart(() => {
      start.value = { x: offsetX.value, y: offsetY.value, zoom: zoom.value };
    })
    .onUpdate((event) => {
      offsetX.value = clampOffset(
        start.value.x + event.translationX,
        baseWidth,
        zoom.value,
        diameter,
      );
      offsetY.value = clampOffset(
        start.value.y + event.translationY,
        baseHeight,
        zoom.value,
        diameter,
      );
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      start.value = { x: offsetX.value, y: offsetY.value, zoom: zoom.value };
    })
    .onUpdate((event) => {
      const next = Math.min(
        MAX_ZOOM,
        Math.max(1, start.value.zoom * event.scale),
      );
      zoom.value = next;
      offsetX.value = clampOffset(offsetX.value, baseWidth, next, diameter);
      offsetY.value = clampOffset(offsetY.value, baseHeight, next, diameter);
    });

  // Double-tap to reset.
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      zoom.value = withTiming(1);
      offsetX.value = withTiming(0);
      offsetY.value = withTiming(0);
    });

  const gesture = Gesture.Simultaneous(pan, pinch, doubleTap);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: zoom.value },
    ],
  }));

  const handleUse = async () => {
    if (!image || !diameter || isSaving) return;
    setIsSaving(true);
    try {
      // The circle's square, from the displayed photo back to pixels.
      const scale = baseScale * zoom.value;
      const shownWidth = baseWidth * zoom.value;
      const shownHeight = baseHeight * zoom.value;
      const size = Math.min(
        image.width,
        image.height,
        Math.round(diameter / scale),
      );
      const originX = Math.round(
        ((shownWidth - diameter) / 2 - offsetX.value) / scale,
      );
      const originY = Math.round(
        ((shownHeight - diameter) / 2 - offsetY.value) / scale,
      );
      const crop = {
        originX: Math.min(Math.max(0, originX), image.width - size),
        originY: Math.min(Math.max(0, originY), image.height - size),
        width: size,
        height: size,
      };

      const context = ImageManipulator.manipulate(image.uri);
      context.crop(crop).resize({ width: OUTPUT_SIZE, height: OUTPUT_SIZE });
      const rendered = await context.renderAsync();
      const result = await rendered.saveAsync({
        compress: 0.85,
        format: SaveFormat.JPEG,
      });
      onDone(result.uri);
    } catch {
      // If cropping fails, fall back to the photo as picked.
      onDone(image.uri);
    } finally {
      setIsSaving(false);
    }
  };

  const centerX = area ? area.width / 2 : 0;
  const centerY = area ? area.height / 2 : 0;
  const r = diameter / 2;

  return (
    <Modal
      visible={!!image}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <GestureHandlerRootView style={styles.root}>
        <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
          <Text style={styles.title}>{t("Move and scale")}</Text>
          <Text style={styles.hint}>
            {t("Pinch to zoom · double-tap to reset")}
          </Text>
        </View>

        <GestureDetector gesture={gesture}>
          <View
            style={styles.area}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              setArea({ width, height });
            }}
          >
            {image && area && (
              <Animated.Image
                source={{ uri: image.uri }}
                style={[
                  styles.photo,
                  {
                    width: baseWidth,
                    height: baseHeight,
                    left: centerX - baseWidth / 2,
                    top: centerY - baseHeight / 2,
                  },
                  imageStyle,
                ]}
              />
            )}
            {/* Dark scrim with a round window, and the circle's edge */}
            {area && (
              <Svg
                width={area.width}
                height={area.height}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              >
                <Path
                  d={`M0 0 H${area.width} V${area.height} H0 Z M${centerX - r} ${centerY} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`}
                  fill="rgba(0, 0, 0, 0.62)"
                  fillRule="evenodd"
                />
                <Circle
                  cx={centerX}
                  cy={centerY}
                  r={r}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.85)"
                  strokeWidth={1.5}
                />
              </Svg>
            )}
          </View>
        </GestureDetector>

        <View
          style={[styles.bottom, { paddingBottom: insets.bottom + spacing.md }]}
        >
          <Pressable onPress={onCancel} hitSlop={8} disabled={isSaving}>
            <Text style={styles.cancel}>{t("Cancel")}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.useButton,
              pressed && styles.useButtonPressed,
            ]}
            onPress={handleUse}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.selectedText} />
            ) : (
              <Text style={styles.useText}>{t("Use photo")}</Text>
            )}
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: "#000000",
    },
    top: {
      alignItems: "center",
      paddingBottom: spacing.sm,
    },
    title: {
      ...typography.subtitle,
      color: "#FFFFFF",
    },
    hint: {
      ...typography.caption,
      color: "rgba(255, 255, 255, 0.6)",
      marginTop: 2,
    },
    area: {
      flex: 1,
      overflow: "hidden",
    },
    photo: {
      position: "absolute",
    },
    bottom: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    cancel: {
      ...typography.bodyBold,
      color: "#FFFFFF",
    },
    useButton: {
      minWidth: 120,
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: 12,
      borderRadius: 0,
      backgroundColor: colors.selected,
    },
    useButtonPressed: {
      opacity: 0.85,
    },
    useText: {
      ...typography.bodyBold,
      color: colors.selectedText,
    },
  });

export default AvatarCropper;
