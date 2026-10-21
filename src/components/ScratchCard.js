import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, {
  Defs,
  G,
  Line,
  LinearGradient,
  Mask,
  Path,
  Pattern,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { t } from "../i18n";
import { fonts } from "../theme/typography";

// How wide the finger scratches, and how much has to come off before the
// rest falls away.
const BRUSH = 36;
const REVEAL_AT = 0.6;
// The card is split into this grid to tell how much is scratched off.
const COLS = 6;
const ROWS = 9;
const FADE_MS = 280;
// A light tick at most this often while scratching.
const TICK_MS = 70;
const INK = "#3B2A08";

// A scratch card: `children` (the poster) under a layer of gold foil that
// comes off where you rub it. Once about 60% is off the rest fades and
// `onReveal` is called. Fresh for each card — give it a new `key` to cover
// a new film.
export const ScratchCard = ({ width, height, children, onReveal, onScratchStart, onScratchEnd }) => {
  const [strokes, setStrokes] = useState([]);
  const [gone, setGone] = useState(false);
  const cleared = useRef(new Set());
  const revealed = useRef(false);
  const lastTick = useRef(0);
  const foil = useSharedValue(1);

  const cellW = width / COLS;
  const cellH = height / ROWS;

  const reveal = () => {
    if (revealed.current) return;
    revealed.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    foil.value = withTiming(0, { duration: FADE_MS });
    setTimeout(() => setGone(true), FADE_MS);
    onReveal?.();
  };

  // Marks the grid cells the brush covers at (x, y).
  const rub = (x, y) => {
    let fresh = false;
    for (let col = 0; col < COLS; col += 1) {
      for (let row = 0; row < ROWS; row += 1) {
        const cx = (col + 0.5) * cellW;
        const cy = (row + 0.5) * cellH;
        if (Math.hypot(cx - x, cy - y) <= BRUSH * 0.6) {
          const key = row * COLS + col;
          if (!cleared.current.has(key)) {
            cleared.current.add(key);
            fresh = true;
          }
        }
      }
    }
    const now = Date.now();
    if (fresh && now - lastTick.current > TICK_MS) {
      lastTick.current = now;
      Haptics.selectionAsync();
    }
    if (cleared.current.size / (COLS * ROWS) >= REVEAL_AT) reveal();
  };

  const add = (x, y, start) => {
    setStrokes((current) =>
      start ? [...current, [[x, y]]] : [...current.slice(0, -1), [...(current.at(-1) ?? []), [x, y]]],
    );
    rub(x, y);
  };

  const scratch = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true)
    .onBegin((event) => {
      onScratchStart?.();
      add(event.x, event.y, true);
    })
    .onUpdate((event) => add(event.x, event.y, false))
    .onFinalize(() => onScratchEnd?.());

  // Each stroke a line through its points (a dot gets a tiny one).
  const d = strokes
    .map((points) => {
      const [first, ...rest] = points;
      const tail = rest.length > 0 ? rest : [[first[0] + 0.1, first[1]]];
      return `M${first[0]} ${first[1]} ${tail.map(([x, y]) => `L${x} ${y}`).join(" ")}`;
    })
    .join(" ");

  const foilStyle = useAnimatedStyle(() => ({ opacity: foil.value }));

  return (
    <View style={{ width, height }}>
      {children}
      {!gone && (
        <GestureDetector gesture={scratch}>
          <Animated.View
            style={[StyleSheet.absoluteFill, foilStyle]}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t("Scratch to reveal")}
            accessibilityActions={[{ name: "activate", label: t("Reveal") }]}
            onAccessibilityAction={reveal}
          >
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id="foil" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#F7DC8A" />
                  <Stop offset="0.35" stopColor="#D4A33C" />
                  <Stop offset="0.6" stopColor="#F2C14E" />
                  <Stop offset="1" stopColor="#B8862A" />
                </LinearGradient>
                <Pattern id="foilHatch" width={10} height={10} patternUnits="userSpaceOnUse">
                  <Line x1={0} y1={0} x2={10} y2={10} stroke={INK} strokeOpacity={0.14} strokeWidth={1} />
                  <Line x1={10} y1={0} x2={0} y2={10} stroke={INK} strokeOpacity={0.14} strokeWidth={1} />
                </Pattern>
                {/* White keeps the foil; the strokes, in black, cut it away. */}
                <Mask id="scratched" maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
                  <Rect x={0} y={0} width={width} height={height} fill="#FFFFFF" />
                  {!!d && (
                    <Path
                      d={d}
                      stroke="#000000"
                      strokeWidth={BRUSH}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  )}
                </Mask>
              </Defs>
              <G mask="url(#scratched)">
                <Rect x={0} y={0} width={width} height={height} fill="url(#foil)" />
                <Rect x={0} y={0} width={width} height={height} fill="url(#foilHatch)" />
                <Rect
                  x={10}
                  y={10}
                  width={width - 20}
                  height={height - 20}
                  fill="none"
                  stroke={INK}
                  strokeOpacity={0.35}
                  strokeWidth={1}
                />
                <SvgText
                  x={width / 2}
                  y={height / 2 - 4}
                  fill={INK}
                  fontSize={20}
                  fontFamily={fonts.extraBold}
                  fontWeight="800"
                  letterSpacing={3}
                  textAnchor="middle"
                >
                  {t("Scratch").toUpperCase()}
                </SvgText>
                <SvgText
                  x={width / 2}
                  y={height / 2 + 16}
                  fill={INK}
                  fillOpacity={0.75}
                  fontSize={11}
                  fontFamily={fonts.bold}
                  textAnchor="middle"
                >
                  {t("to see your film")}
                </SvgText>
              </G>
            </Svg>
          </Animated.View>
        </GestureDetector>
      )}
    </View>
  );
};

export default ScratchCard;
