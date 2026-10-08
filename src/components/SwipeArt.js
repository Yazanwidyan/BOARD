import Svg, {
  Circle,
  G,
  Line,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
} from "react-native-svg";

import { fonts } from "../theme/typography";
import { t } from "../i18n";

// Hand-drawn marks for the Swipe "video store run" — no icon set.

// Pass: a DVD case going back on the shelf, with a curved arrow to the left.
export const PassArt = ({ size = 30, color }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40">
    <Rect
      x={20}
      y={9}
      width={14}
      height={22}
      rx={2}
      fill="none"
      stroke={color}
      strokeWidth={2.4}
    />
    <Line
      x1={23.5}
      y1={10}
      x2={23.5}
      y2={30}
      stroke={color}
      strokeWidth={1.6}
    />
    <Path
      d="M17 13 C 10 13, 6 17, 6 24"
      fill="none"
      stroke={color}
      strokeWidth={2.6}
      strokeLinecap="round"
    />
    <Path
      d="M2 20 L6 25.5 L10.5 20.5"
      fill="none"
      stroke={color}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Keep: a wire shopping basket with a case dropping into it.
export const KeepArt = ({ size = 30, color }) => (
  <Svg width={size} height={size} viewBox="0 0 40 40">
    <G transform="rotate(-12 20 9)">
      <Rect x={15} y={2} width={10} height={14} rx={1.5} fill={color} />
    </G>
    <Path
      d="M10 17 Q20 6 30 17"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
    />
    <Path
      d="M5 17 H35 L31 34 H9 Z"
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinejoin="round"
    />
    {[14, 20, 26].map((x) => (
      <Line
        key={x}
        x1={x}
        y1={17}
        x2={x - (x - 20) * 0.15}
        y2={34}
        stroke={color}
        strokeWidth={1.6}
      />
    ))}
    <Line x1={6.5} y1={25} x2={33.5} y2={25} stroke={color} strokeWidth={1.6} />
  </Svg>
);

// Let fate pick: a tilted die showing five.
export const DieArt = ({ size = 22, color, pip }) => (
  <Svg width={size} height={size} viewBox="0 0 30 30">
    <G transform="rotate(-12 15 15)">
      <Rect
        x={5}
        y={5}
        width={20}
        height={20}
        rx={5}
        fill="none"
        stroke={color}
        strokeWidth={2.2}
      />
      {[
        [10.5, 10.5],
        [19.5, 10.5],
        [15, 15],
        [10.5, 19.5],
        [19.5, 19.5],
      ].map(([cx, cy]) => (
        <Circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r={1.9}
          fill={pip ?? color}
        />
      ))}
    </G>
  </Svg>
);

// The "VS" starburst between two cases in a duel.
const burst = Array.from({ length: 24 }, (_, index) => {
  const radius = index % 2 === 0 ? 24 : 18;
  const angle = ((-90 + index * 15) * Math.PI) / 180;
  return `${(26 + Math.cos(angle) * radius).toFixed(1)},${(26 + Math.sin(angle) * radius).toFixed(1)}`;
}).join(" ");

export const VsBadge = ({ size = 52, color, textColor }) => (
  <Svg width={size} height={size} viewBox="0 0 52 52">
    <Polygon
      points={burst}
      fill={color}
      stroke="#FFF3C4"
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
    <SvgText
      x={26}
      y={31}
      textAnchor="middle"
      fontSize={15}
      fontFamily={fonts.extraBold}
      fill={textColor}
    >
      {t("VS")}
    </SvgText>
  </Svg>
);
