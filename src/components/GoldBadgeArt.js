import { useId } from "react";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

// Your gold shield badge, with the track's emblem where the pixel shape
// was. Earned badges keep the original gold frame, blue band and stars;
// locked badges are the same shield in greys.
//
// Props: { emblem, earned, size } (`tier` is accepted but not drawn). The
// art is 4:5, so it fits inside a `size` × `size` box.

const EARNED = {
  frame: ["#FAE8AB", "#F4D055"],
  band: ["#D9DADD", "#9A9DA4"],
  shadow: "#A5820B",
  edge: "#D5A80E",
  star: "#F7DB7A",
  ink: "#FFFFFF",
};
const LOCKED = {
  frame: ["#4A4D53", "#383B40"],
  band: ["#2E3034", "#292B2F"],
  shadow: "#202124",
  edge: "#37393E",
  star: "#4A4D53",
  ink: "#92949A",
};

// Emblems in a 24 × 24 box.
const EMBLEMS = {
  watched: {
    strokes: ["M12 21h9"],
    circles: [
      { cx: 12, cy: 12, r: 9, stroke: true },
      ...Array.from({ length: 5 }, (_, index) => {
        const angle = ((-90 + index * 72) * Math.PI) / 180;
        return {
          cx: 12 + Math.cos(angle) * 4.6,
          cy: 12 + Math.sin(angle) * 4.6,
          r: 1.9,
        };
      }),
    ],
  },
  critic: {
    fills: [
      "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
    ],
  },
  rewatch: {
    strokes: [
      "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",
      "M21 3v5h-5",
    ],
  },
  collections: {
    strokes: [
      "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",
      "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",
    ],
    fills: [
      "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",
    ],
  },
  challenges: {
    circles: [
      { cx: 12, cy: 12, r: 9.5, stroke: true },
      { cx: 12, cy: 12, r: 5.5, stroke: true },
      { cx: 12, cy: 12, r: 2.2 },
    ],
  },
  watchlist: {
    fills: ["m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"],
  },
  marquee: {
    fills: [
      "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",
    ],
    strokes: ["M5 21h14"],
  },
};

// The emblem's box on the shield's dark top.
const EMBLEM_SCALE = 0.82;
const EMBLEM_X = 24 - 12 * EMBLEM_SCALE;
const EMBLEM_Y = 19 - 12 * EMBLEM_SCALE;

const GoldBadgeArt = ({ emblem = "marquee", earned = true, size = 48 }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const look = earned ? EARNED : LOCKED;
  const spec = EMBLEMS[emblem] ?? EMBLEMS.marquee;
  const ink = look.ink;
  const strokeWidth = 2.4;

  return (
    <Svg width={size * 0.8} height={size} viewBox="0 0 48 60" fill="none">
      <Defs>
        <ClipPath id={`clip${id}`}>
          <Rect width="48" height="60" fill="white" />
        </ClipPath>

        <LinearGradient
          id={`top${id}`}
          x1="4.624"
          y1="1.285"
          x2="42.584"
          y2="40.12"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#33363B" />
          <Stop offset="1" stopColor="#1B1C1F" />
        </LinearGradient>

        <LinearGradient
          id={`band${id}`}
          x1="1.781"
          y1="28.219"
          x2="50.939"
          y2="41.126"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor={look.band[0]} />
          <Stop offset="1" stopColor={look.band[1]} />
        </LinearGradient>

        <LinearGradient
          id={`frame${id}`}
          x1="0"
          y1="0"
          x2="48"
          y2="56"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor={look.frame[0]} />
          <Stop offset="1" stopColor={look.frame[1]} />
        </LinearGradient>
      </Defs>

      <G clipPath={`url(#clip${id})`}>
        {/* Shadow under the shield */}
        <Path
          fill={look.shadow}
          d="M48 42.76v-26.5c0-3.79-2.66-7.06-6.37-7.83L27.26 5.435a15.9 15.9 0 0 0-6.525 0L6.365 8.43A8 8 0 0 0 0 16.26v26.505c0 2.86 1.525 5.5 4 6.93l16 9.24a8 8 0 0 0 8 0l16-9.24c2.475-1.43 4-4.07 4-6.93z"
        />

        {/* Dark top */}
        <Path
          fill={`url(#top${id})`}
          d="M22.751 39.255h3.135l20.065-11.7.36-18.305-2.79-4.005-19.52-3.96-19.525 4.5-2.695 2.88V27.17z"
        />

        {/* Band */}
        <Path
          fill={`url(#band${id})`}
          d="m2.501 27.17 21.5 12.835 21.5-12.575 1.62 2.615-.81 11.005-2.34 3.2-19.16 10.205-4.56-.54L2.501 42.58l-.72-4.475z"
        />

        {/* Inner edge shading */}
        <Path
          fill={look.shadow}
          d="M41.12 5.775 26.75 2.78a13.5 13.5 0 0 0-2.755-.285q-1.381 0-2.755.285L6.88 5.775A5.53 5.53 0 0 0 2.5 11.16v1c0-2.59 1.84-4.855 4.38-5.385L21.25 3.78q1.374-.285 2.755-.285t2.755.285l14.37 2.995a5.53 5.53 0 0 1 4.38 5.385v-1c0-2.59-1.84-4.855-4.38-5.385z"
        />
        <Path
          fill={look.edge}
          d="m44 30.595-16 9.24a8 8 0 0 1-8 0l-16-9.24c-.55-.32-1.05-.7-1.5-1.125v1c.45.425.95.805 1.5 1.125l16 9.24a8 8 0 0 0 8 0l16-9.24c.55-.32 1.05-.7 1.5-1.125v-1c-.45.425-.95.805-1.5 1.125"
        />

        {/* Frame */}
        <Path
          fill={`url(#frame${id})`}
          d="M41.63 3.33 27.265.335a15.9 15.9 0 0 0-6.525 0L6.37 3.33A8 8 0 0 0 0 11.16v27.505c0 2.86 1.525 5.5 4 6.93l16 9.24a8 8 0 0 0 8 0l16-9.24c2.475-1.43 4-4.07 4-6.93V11.16c0-3.79-2.66-7.06-6.37-7.83m3.87 35.335a5.52 5.52 0 0 1-2.75 4.765l-16 9.24a5.51 5.51 0 0 1-5.5 0l-16-9.24a5.52 5.52 0 0 1-2.75-4.765V29.47c.45.425.95.805 1.5 1.125l16 9.24a8 8 0 0 0 8 0l16-9.24c.55-.32 1.05-.7 1.5-1.125zm0-15a5.52 5.52 0 0 1-2.75 4.765l-16 9.24a5.51 5.51 0 0 1-5.5 0l-16-9.245A5.52 5.52 0 0 1 2.5 23.66v-12.5c0-2.59 1.84-4.855 4.38-5.385L21.25 2.78q1.374-.285 2.755-.285t2.755.285l14.37 2.995a5.53 5.53 0 0 1 4.38 5.385v12.505z"
        />

        {/* Stars */}
        <Path
          fill={look.star}
          d="m23.974 49.515-1.86.985c-.22.11-.44-.055-.385-.275l.385-2.08-1.535-1.48c-.165-.165-.055-.44.165-.495l2.08-.33.93-1.915c.11-.22.385-.22.495 0l.93 1.915 2.08.33c.22.055.33.33.165.495l-1.535 1.48.385 2.08c.055.22-.22.385-.385.275z"
        />
        <Path
          fill={look.star}
          d="M13.887 46.095c-.165.11-.38-.055-.325-.215l.325-1.79-1.305-1.25c-.165-.11-.055-.325.11-.38l1.79-.27.815-1.63a.253.253 0 0 1 .435 0l.815 1.63 1.79.27c.165 0 .215.27.11.38l-1.305 1.25.325 1.79c.055.165-.165.325-.325.215l-1.63-.87-1.63.87zM7.177 41.34c-.165.11-.38-.055-.33-.22l.275-1.42-1.04-1.04c-.165-.11-.055-.38.11-.38l1.475-.22.655-1.31c.055-.165.33-.165.38 0l.655 1.31 1.475.22c.055.055.11.275 0 .38l-1.04 1.04.275 1.42c0 .165-.165.33-.33.22l-1.31-.655-1.365.655z"
        />

        {/* Emblem */}
        <G
          transform={`translate(${EMBLEM_X} ${EMBLEM_Y}) scale(${EMBLEM_SCALE})`}
        >
          {(spec.fills ?? []).map((d) => (
            <Path key={d} d={d} fill={ink} />
          ))}
          {(spec.strokes ?? []).map((d) => (
            <Path
              key={d}
              d={d}
              fill="none"
              stroke={ink}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {(spec.circles ?? []).map(({ cx, cy, r, stroke }) => (
            <Circle
              key={`${cx}-${cy}-${r}`}
              cx={cx}
              cy={cy}
              r={r}
              fill={stroke ? "none" : ink}
              stroke={stroke ? ink : "none"}
              strokeWidth={stroke ? strokeWidth : 0}
            />
          ))}
        </G>
      </G>
    </Svg>
  );
};

export { GoldBadgeArt };
export default GoldBadgeArt;
