import { useId } from "react";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
} from "react-native-svg";

// Geometric badge tokens. Each track has its own shape and colour —
//   watching    hexagon  · purple       critic      shield   · gold
//   rewatch     circle   · teal         collections diamond  · blue
//   challenges  octagon  · coral        watchlist   squircle · green
//   marquee     seal     · warm gold
// — filled with a smooth two-tone gradient, a bold white emblem in the
// middle, and the tier shown as pips underneath (one more pip per tier, up
// to five; past that the pips turn gold). Locked badges are the same
// shape in flat grey. Flat and crisp: no ribbons, metal or shine.
//
// Same props as before (`metal` is no longer used for colour).

const TRACKS = {
  watched: { shape: "hexagon", from: "#B48CFF", to: "#6A3FC4" },
  critic: { shape: "shield", from: "#FFE7A0", to: "#D9A12E" },
  rewatch: { shape: "circle", from: "#8FF0E2", to: "#2A9C91" },
  collections: { shape: "diamond", from: "#A6DDFB", to: "#3B82C9" },
  challenges: { shape: "octagon", from: "#FFB3BE", to: "#D4505F" },
  watchlist: { shape: "squircle", from: "#B9F0AE", to: "#46A04F" },
  marquee: { shape: "seal", from: "#FFE08A", to: "#C7860A" },
};

// The track's main colour — for checks, bars and connectors next to it.
export const badgeTrackColor = (category) => {
  const track = TRACKS[category] ?? TRACKS.marquee;
  return track.from;
};

const LOCKED_FILL = "#2C2E54";
const LOCKED_EDGE = "#4A4D84";
const LOCKED_INK = "#8A8CB0";
const PIP_GOLD = "#FFE08A";

// Emblems in a 24 × 24 box, drawn white.
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

const polygon = (points, radius, rotation, cx = 50, cy = 50) =>
  Array.from({ length: points }, (_, index) => {
    const angle = ((rotation + (index * 360) / points) * Math.PI) / 180;
    return `${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`;
  }).join(" ");

const seal = (points, outer, inner) =>
  Array.from({ length: points * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = ((-90 + (index * 180) / points) * Math.PI) / 180;
    return `${(50 + Math.cos(angle) * radius).toFixed(2)},${(50 + Math.sin(angle) * radius).toFixed(2)}`;
  }).join(" ");

// The token shape, filled and edged. A same-colour stroke with round
// joins softens the polygon corners.
const Shape = ({ shape, fill, edge }) => {
  const common = {
    fill,
    stroke: edge,
    strokeWidth: 4,
    strokeLinejoin: "round",
  };
  switch (shape) {
    case "hexagon":
      return <Polygon points={polygon(6, 44, -90)} {...common} />;
    case "octagon":
      return <Polygon points={polygon(8, 44, 22.5)} {...common} />;
    case "shield":
      return (
        <Path
          d="M50 6 L87 17 V47 C87 71 71 87 50 95 C29 87 13 71 13 47 V17 Z"
          {...common}
        />
      );
    case "diamond":
      return (
        <Rect
          x={19}
          y={19}
          width={62}
          height={62}
          rx={14}
          transform="rotate(45 50 50)"
          {...common}
        />
      );
    case "squircle":
      return <Rect x={8} y={8} width={84} height={84} rx={28} {...common} />;
    case "seal":
      return <Polygon points={seal(14, 46, 40)} {...common} />;
    case "circle":
    default:
      return <Circle cx={50} cy={50} r={43} {...common} />;
  }
};

export const BadgeArt = ({ emblem, tier = 0, earned = true, size }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const track = TRACKS[emblem] ?? TRACKS.marquee;
  const spec = EMBLEMS[emblem] ?? EMBLEMS.marquee;
  const ink = earned ? "#FFFFFF" : LOCKED_INK;
  const pips = Math.max(1, Math.min(5, tier + 1));
  const pipColor = earned ? (tier >= 5 ? PIP_GOLD : "#FFFFFF") : LOCKED_INK;
  const strokeWidth = 2.4;
  // Emblem sits a little high, leaving room for the pips.
  const emblemScale = 1.45;
  const ex = 50 - 12 * emblemScale;
  const ey = 44 - 12 * emblemScale;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`fill${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={track.from} />
          <Stop offset="1" stopColor={track.to} />
        </LinearGradient>
      </Defs>

      <Shape
        shape={track.shape}
        fill={earned ? `url(#fill${id})` : LOCKED_FILL}
        edge={earned ? track.to : LOCKED_EDGE}
      />

      <G transform={`translate(${ex} ${ey}) scale(${emblemScale})`}>
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

      {/* Tier pips */}
      {Array.from({ length: pips }, (_, index) => (
        <Circle
          key={index}
          cx={50 + (index - (pips - 1) / 2) * 8}
          cy={77}
          r={2.6}
          fill={pipColor}
          opacity={earned ? 1 : 0.7}
        />
      ))}
    </Svg>
  );
};

export default BadgeArt;
