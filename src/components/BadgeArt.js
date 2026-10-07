import { useId } from "react";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Polygon,
  Stop,
} from "react-native-svg";

// Hand-drawn badge medals. Every badge is the same build — ribbons, a
// metal frame, a dark inner disc, and an emblem — and two things vary:
//
// - the emblem says WHICH track (film reel = watching, star = critic,
//   loop = rewatch, layers = collections, target = challenges, bookmark =
//   watchlist, crown = a marquee franchise);
// - the frame says HOW HIGH up the track: a plain coin, then an octagon,
//   then a rosette with ribbons, then a sunburst — plus the metal colour
//   (bronze → silver → gold → platinum → diamond → master).
//
// Drawn in a 100 × 100 box; the medal body is centred slightly high so
// the ribbons have room underneath.

const CX = 50;
const CY = 46;
const DISC_R = 30;
const UNEARNED_METAL = "#7A7D9C";
const DISC_BASE = "#14152B";

// Emblems are drawn in a 24 × 24 box (lucide-style strokes) and scaled
// into the disc.
const EMBLEM_SCALE = 1.5;
const EMBLEM_OFFSET_X = CX - 12 * EMBLEM_SCALE;
const EMBLEM_OFFSET_Y = CY - 12 * EMBLEM_SCALE;

const EMBLEMS = {
  // A film reel: rim, five spool holes, hub, and a trailing strip.
  watched: {
    strokes: ["M12 21h9"],
    circles: [
      { cx: 12, cy: 12, r: 9, stroke: true },
      ...Array.from({ length: 5 }, (_, index) => {
        const angle = ((-90 + index * 72) * Math.PI) / 180;
        return {
          cx: 12 + Math.cos(angle) * 4.6,
          cy: 12 + Math.sin(angle) * 4.6,
          r: 1.8,
        };
      }),
      { cx: 12, cy: 12, r: 1.1 },
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
    circles: [{ cx: 12, cy: 12, r: 2.2 }],
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
      { cx: 12, cy: 12, r: 2 },
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

// ---- colour helpers (all theme metals are plain #RRGGBB) ----
const toRgb = (hex) => {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};
const mix = (hex, other, amount) => {
  const a = toRgb(hex);
  const b = toRgb(other);
  const channel = (index) =>
    Math.round(a[index] + (b[index] - a[index]) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(0)}${channel(1)}${channel(2)}`;
};

// A regular star/polygon around the medal centre: `points` tips at
// `outer`, valleys at `inner` (inner === outer → plain polygon corners).
const starPoints = (points, outer, inner, rotation = -90) => {
  const coords = [];
  const steps = inner === outer ? points : points * 2;
  for (let index = 0; index < steps; index += 1) {
    const radius = inner === outer || index % 2 === 0 ? outer : inner;
    const angle = ((rotation + (index * 360) / steps) * Math.PI) / 180;
    coords.push(
      `${(CX + Math.cos(angle) * radius).toFixed(2)},${(CY + Math.sin(angle) * radius).toFixed(2)}`,
    );
  }
  return coords.join(" ");
};

// Frame shape per tier: 0 coin, 1 octagon, 2 rosette, 3+ sunburst.
const Frame = ({ tier, fill, stroke }) => {
  if (tier <= 0) {
    return (
      <Circle
        cx={CX}
        cy={CY}
        r={42}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
    );
  }
  const points =
    tier === 1
      ? starPoints(8, 43, 43, -90 + 22.5)
      : tier === 2
        ? starPoints(16, 44, 40)
        : starPoints(tier >= 5 ? 24 : 14, 46, tier >= 5 ? 38 : 36);
  return (
    <Polygon
      points={points}
      fill={fill}
      stroke={stroke}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
  );
};

// Two ribbon tails hanging behind the medal (tier 2 and up).
const Ribbons = ({ color, shade }) => (
  <G>
    <Polygon points="33,58 21,97 30,91 36,99 47,64" fill={shade} />
    <Polygon points="67,58 79,97 70,91 64,99 53,64" fill={shade} />
    <Polygon points="35,58 25,92 31,88 36,95 45,63" fill={color} />
    <Polygon points="65,58 75,92 69,88 64,95 55,63" fill={color} />
  </G>
);
// Ribboned tiers draw the body a little smaller and higher so the tails
// show underneath.
const RIBBON_BODY = `translate(${CX} 39) scale(0.84) translate(${-CX} ${-CY})`;

export const BadgeArt = ({ emblem, tier = 0, metal, earned = true, size }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const base = earned ? metal : UNEARNED_METAL;
  const light = mix(base, "#FFFFFF", 0.5);
  const dark = mix(base, "#000000", 0.4);
  const disc = mix(base, DISC_BASE, 0.84);
  const spec = EMBLEMS[emblem] ?? EMBLEMS.marquee;
  const emblemColor = earned
    ? mix(base, "#FFFFFF", 0.25)
    : mix(base, "#FFFFFF", 0.1);
  const strokeWidth = 2.1;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`metal${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={light} />
          <Stop offset="0.45" stopColor={base} />
          <Stop offset="1" stopColor={dark} />
        </LinearGradient>
        <LinearGradient id={`disc${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={mix(disc, "#FFFFFF", 0.08)} />
          <Stop offset="1" stopColor={disc} />
        </LinearGradient>
      </Defs>

      {tier >= 2 && <Ribbons color={base} shade={dark} />}

      <G transform={tier >= 2 ? RIBBON_BODY : undefined}>
        <Frame tier={tier} fill={`url(#metal${id})`} stroke={dark} />

        {/* Inner disc with a bright rim */}
        <Circle
          cx={CX}
          cy={CY}
          r={DISC_R + 3}
          fill="none"
          stroke={light}
          strokeOpacity={0.55}
          strokeWidth={1.2}
        />
        <Circle cx={CX} cy={CY} r={DISC_R} fill={`url(#disc${id})`} />

        {/* Emblem */}
        <G
          transform={`translate(${EMBLEM_OFFSET_X} ${EMBLEM_OFFSET_Y}) scale(${EMBLEM_SCALE})`}
        >
          {(spec.fills ?? []).map((d) => (
            <Path key={d} d={d} fill={emblemColor} />
          ))}
          {(spec.strokes ?? []).map((d) => (
            <Path
              key={d}
              d={d}
              fill="none"
              stroke={emblemColor}
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
              fill={stroke ? "none" : emblemColor}
              stroke={stroke ? emblemColor : "none"}
              strokeWidth={stroke ? strokeWidth : 0}
            />
          ))}
        </G>

        {/* Shine across the top-left of the frame */}
        {earned && (
          <Ellipse
            cx={36}
            cy={24}
            rx={16}
            ry={6}
            fill="#FFFFFF"
            fillOpacity={0.22}
            transform="rotate(-32 36 24)"
          />
        )}
      </G>
    </Svg>
  );
};

export default BadgeArt;
