import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Stop } from "react-native-svg";

import { fonts } from "../theme/typography";
import { Text } from "./AppText";

// Each step's colours, from the first to the last: a glowing rim (three
// stops) whose middle colour also lights the ticks and the number.
const LEVEL_COLORS = [
  ["#8E5CFF", "#C77DFF", "#5B2BFF"],
  ["#FF5CA8", "#FF9AD5", "#C2185B"],
  ["#3D8BFF", "#7FB2FF", "#1E4FD8"],
  ["#2EC5FF", "#8AE6FF", "#0A84FF"],
  ["#30D158", "#7CF08F", "#0E9F4D"],
  ["#B8F53C", "#30D158", "#F2D23C"],
  ["#FFD60A", "#FFB340", "#FF6B00"],
];
// Not reached yet: brushed steel.
const STEEL = ["#E5E5EA", "#8E8E93", "#3A3A3C"];
const TICKS = 36;

const formatValue = (value) => value.toLocaleString("en");

// A milestone as a medal, like Apple Music Replay's: a disc with a glowing
// rim, a ring of ticks and the number in the middle — in its step's colours
// when reached, steel while in progress.
export const MilestoneMedal = ({ milestone, size = 120 }) => {
  const reached = !!milestone.reachedAt;
  const [rimA, glow, rimB] = reached ? LEVEL_COLORS[milestone.level % LEVEL_COLORS.length] : STEEL;
  const center = size / 2;
  const rim = size * 0.075;
  const radius = center - rim / 2 - 1;
  const inner = radius - rim / 2;
  const id = `medal-${milestone.key}-${reached ? "on" : "off"}`;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={rimA} />
            <Stop offset="0.5" stopColor={glow} />
            <Stop offset="1" stopColor={rimB} />
          </LinearGradient>
        </Defs>
        {/* The disc, then its rim. */}
        <Circle cx={center} cy={center} r={inner} fill="#0C0C0F" />
        <Circle cx={center} cy={center} r={radius} stroke={`url(#${id})`} strokeWidth={rim} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={inner - 1}
          stroke={glow}
          strokeOpacity={0.25}
          strokeWidth={1}
          fill="none"
        />
        {/* The ticks: every third one longer. */}
        {Array.from({ length: TICKS }, (_, index) => {
          const angle = (index / TICKS) * Math.PI * 2;
          const long = index % 3 === 0;
          const from = inner * (long ? 0.7 : 0.76);
          const to = inner * 0.86;
          return (
            <Line
              key={index}
              x1={center + Math.cos(angle) * from}
              y1={center + Math.sin(angle) * from}
              x2={center + Math.cos(angle) * to}
              y2={center + Math.sin(angle) * to}
              stroke={glow}
              strokeOpacity={reached ? (long ? 0.95 : 0.55) : 0.35}
              strokeWidth={long ? 2 : 1.4}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.numberWrap}>
          <Text
            style={[styles.number, { fontSize: size * 0.2, color: reached ? glow : "#AEAEB2" }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatValue(milestone.value)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  numberWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: "22%",
  },
  number: {
    fontFamily: fonts.regular,
    letterSpacing: -0.5,
  },
});

export default MilestoneMedal;
