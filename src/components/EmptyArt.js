import { useId } from "react";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { fonts } from "../theme/typography";

// Hand-drawn empty-state scenes, in the app's video-store language. Drawn
// in a 160 × 110 box over a soft spotlight:
//   emptyShelf  bare shelves, dashed outlines where cases should stand, one
//               lonely case, a RESTOCKING tag
//   noDiscs     an open DVD case with the disc missing
//   noMatches   a magnifier over an empty, dashed shelf slot
//   allTiered   S / A / B tier tiles fanned, with a check stamp
//   comingSoon  a little marquee sign: SOON

const LEDGE = "#383B40";
const CASE = "#0D0D12";
const INK = "rgba(255, 255, 255, 0.28)";
const TIER = { S: "#F8E08E", A: "#A4E59B", B: "#8FD3F5" };

const Ledge = ({ y }) => (
  <G>
    <Rect x={10} y={y} width={140} height={6} rx={1.5} fill={LEDGE} />
    <Rect x={10} y={y} width={140} height={1.2} fill="rgba(255,255,255,0.18)" />
  </G>
);

const DashedSlot = ({ x, y, w = 20, h = 30 }) => (
  <Rect
    x={x}
    y={y}
    width={w}
    height={h}
    rx={2}
    fill="none"
    stroke={INK}
    strokeWidth={1.4}
    strokeDasharray="3 3"
  />
);

const Scene = ({ art, accent, light }) => {
  switch (art) {
    case "noDiscs":
      return (
        <G>
          {/* left panel: the cover */}
          <Rect
            x={30}
            y={18}
            width={48}
            height={70}
            rx={3}
            fill={CASE}
            stroke="rgba(255,255,255,0.14)"
          />
          <Rect
            x={35}
            y={23}
            width={38}
            height={60}
            fill={accent}
            opacity={0.35}
          />
          <Rect
            x={41}
            y={66}
            width={26}
            height={4}
            rx={2}
            fill={light}
            opacity={0.5}
          />
          {/* right panel: the tray, disc missing */}
          <Rect
            x={82}
            y={18}
            width={48}
            height={70}
            rx={3}
            fill={CASE}
            stroke="rgba(255,255,255,0.14)"
          />
          <Circle
            cx={106}
            cy={53}
            r={19}
            fill="none"
            stroke={INK}
            strokeWidth={1.6}
            strokeDasharray="4 3"
          />
          <Circle
            cx={106}
            cy={53}
            r={5}
            fill="none"
            stroke={light}
            strokeWidth={2}
          />
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const angle = (index * 60 * Math.PI) / 180;
            return (
              <Line
                key={index}
                x1={106 + Math.cos(angle) * 6.5}
                y1={53 + Math.sin(angle) * 6.5}
                x2={106 + Math.cos(angle) * 9}
                y2={53 + Math.sin(angle) * 9}
                stroke={light}
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            );
          })}
          {/* hinge */}
          <Rect x={78} y={18} width={4} height={70} fill="#1B1C1F" />
        </G>
      );

    case "noMatches":
      return (
        <G>
          <Ledge y={78} />
          <DashedSlot x={36} y={46} />
          <DashedSlot x={62} y={46} />
          <DashedSlot x={88} y={46} />
          {/* magnifier */}
          <G transform="rotate(-18 96 40)">
            <Circle
              cx={92}
              cy={38}
              r={20}
              fill={accent}
              fillOpacity={0.12}
              stroke={light}
              strokeWidth={3.5}
            />
            <Path
              d="M78 30 A16 16 0 0 1 90 22"
              stroke="#FFFFFF"
              strokeOpacity={0.55}
              strokeWidth={2.5}
              strokeLinecap="round"
              fill="none"
            />
            <Rect x={88} y={57} width={8} height={24} rx={4} fill={light} />
          </G>
        </G>
      );

    case "allTiered":
      return (
        <G>
          {/* S on the left and on top: drawn last */}
          {[
            ["B", 14, 108],
            ["A", 0, 80],
            ["S", -14, 52],
          ].map(([key, rotate, x]) => (
            <G key={key} transform={`rotate(${rotate} ${x} 60)`}>
              <Rect
                x={x - 19}
                y={34}
                width={38}
                height={46}
                rx={6}
                fill={TIER[key]}
              />
              <SvgText
                x={x}
                y={67}
                textAnchor="middle"
                fontSize={26}
                fontFamily={fonts.extraBold}
                fill="#161719"
              >
                {key}
              </SvgText>
            </G>
          ))}
          {/* check stamp */}
          <Circle
            cx={128}
            cy={30}
            r={13}
            fill="#161719"
            stroke={TIER.A}
            strokeWidth={2.2}
            strokeDasharray="3 2"
          />
          <Path
            d="M121.5 30.5 l4.5 4.5 l8 -9"
            stroke={TIER.A}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </G>
      );

    case "comingSoon":
      return (
        <G>
          <Rect
            x={28}
            y={26}
            width={104}
            height={54}
            rx={6}
            fill="#161719"
            stroke="rgba(255,231,163,0.45)"
            strokeWidth={1.5}
          />
          {Array.from({ length: 12 }, (_, index) => (
            <G key={index}>
              <Circle cx={36 + index * 8} cy={33} r={2} fill="#FFE7A3" />
              <Circle
                cx={36 + index * 8}
                cy={73}
                r={2}
                fill="#FFE7A3"
                opacity={index % 2 ? 0.5 : 1}
              />
            </G>
          ))}
          <SvgText
            x={80}
            y={60}
            textAnchor="middle"
            fontSize={19}
            letterSpacing={4}
            fontFamily={fonts.extraBold}
            fill="#FFE7A3"
          >
            SOON
          </SvgText>
          <Rect x={50} y={80} width={4} height={18} fill={LEDGE} />
          <Rect x={106} y={80} width={4} height={18} fill={LEDGE} />
        </G>
      );

    case "emptyShelf":
    default:
      return (
        <G>
          {/* hanging RESTOCKING tag */}
          <Line x1={62} y1={0} x2={70} y2={12} stroke={INK} strokeWidth={1} />
          <Line x1={98} y1={0} x2={90} y2={12} stroke={INK} strokeWidth={1} />
          <Rect x={56} y={11} width={48} height={14} rx={3} fill={accent} />
          <SvgText
            x={80}
            y={21}
            textAnchor="middle"
            fontSize={7}
            letterSpacing={1}
            fontFamily={fonts.extraBold}
            fill="#FFFFFF"
          >
            RESTOCKING
          </SvgText>
          {/* top shelf: empty slots and one lonely case */}
          <DashedSlot x={24} y={30} h={28} />
          <DashedSlot x={48} y={30} h={28} />
          <DashedSlot x={72} y={30} h={28} />
          <G transform="rotate(-14 118 58)">
            <Rect
              x={106}
              y={30}
              width={20}
              height={28}
              rx={2}
              fill={CASE}
              stroke="rgba(255,255,255,0.18)"
            />
            <Rect
              x={110}
              y={33}
              width={13}
              height={22}
              fill={accent}
              opacity={0.45}
            />
          </G>
          <Ledge y={58} />
          {/* bottom shelf: all empty */}
          <DashedSlot x={36} y={70} h={26} />
          <DashedSlot x={60} y={70} h={26} />
          <DashedSlot x={84} y={70} h={26} />
          <DashedSlot x={108} y={70} h={26} />
          <Ledge y={96} />
        </G>
      );
  }
};

export const EmptyArt = ({ art, accent, light, width = 200 }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const height = (width * 110) / 160;
  return (
    <Svg width={width} height={height} viewBox="0 0 160 110">
      <Defs>
        <RadialGradient id={`spot${id}`} cx="50%" cy="55%" r="55%">
          <Stop offset="0" stopColor={accent} stopOpacity={0.28} />
          <Stop offset="1" stopColor={accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={160} height={110} fill={`url(#spot${id})`} />
      <Scene art={art} accent={accent} light={light} />
    </Svg>
  );
};

export default EmptyArt;
