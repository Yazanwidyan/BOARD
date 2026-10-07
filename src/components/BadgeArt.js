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
//   watching    hexagon  · blue       critic      shield   · gold
//   rewatch     circle   · teal         collections diamond  · silver
//   challenges  octagon  · coral        watchlist   squircle · green
//   marquee     seal     · warm gold
// — filled with a smooth two-tone gradient, a bold white pixel emblem in the
// middle, and the tier shown as pips underneath (one more pip per tier, up
// to five; the top tier gets a gold rim). Locked badges are the same
// shape in flat grey. Flat and crisp: no ribbons, metal or shine.
//
// The emblems are pixel art, for an 8-bit trophy feel; pips are pixels too.
// Same props as before (`metal` is no longer used for colour).

export const BADGE_TRACKS = {
  watched: {
    shape: "hexagon",
    from: "#7FA8F5",
    to: "#3D6FD1",
    color: "#A9C4FF",
  },
  critic: { shape: "shield", from: "#F2B53A", to: "#B5700E", color: "#F8E08E" },
  rewatch: {
    shape: "circle",
    from: "#3FC7B6",
    to: "#1A7A72",
    color: "#7FE0D6",
  },
  collections: {
    shape: "diamond",
    from: "#B5BAC4",
    to: "#5F6570",
    color: "#C8C9CC",
  },
  challenges: {
    shape: "octagon",
    from: "#F27A8A",
    to: "#B23447",
    color: "#F6A0AC",
  },
  watchlist: {
    shape: "squircle",
    from: "#66C46A",
    to: "#2F7F3A",
    color: "#A4E59B",
  },
  marquee: { shape: "seal", from: "#FF9A4D", to: "#C24E14", color: "#FFC08A" },
};

// The track's main colour — for checks, bars and connectors next to it.
export const badgeTrackColor = (category) => {
  const track = BADGE_TRACKS[category] ?? BADGE_TRACKS.marquee;
  return track.color;
};

const LOCKED_FILL = "#292B2F";
const LOCKED_EDGE = "#383B40";
const LOCKED_INK = "#92949A";
const PIP_GOLD = "#FFE08A";

// Pixel-art emblems on an 11 × 11 grid ("#" = filled) — the game feel
// of an 8-bit trophy. Each is turned into a single path below.
const PIXELS = {
  // film reel
  watched: [
    "...#####...",
    "..#######..",
    ".###...###.",
    ".###...###.",
    "#..#####..#",
    "#..##.##..#",
    "#..#####..#",
    ".###...###.",
    ".###...###.",
    "..#######..",
    "...#####...",
  ],
  // star
  critic: [
    ".....#.....",
    "....###....",
    "....###....",
    "...#####...",
    "###########",
    ".#########.",
    "..#######..",
    "...#####...",
    "..###.###..",
    "..##...##..",
    ".##.....##.",
  ],
  // replay arrow
  rewatch: [
    "...#####.##",
    ".#######.##",
    ".##....####",
    "##.....####",
    "##.........",
    "##.........",
    "##.......##",
    "##.......##",
    ".##.....##.",
    ".#########.",
    "...#####...",
  ],
  // stack of cases
  collections: [
    "...#####...",
    "...........",
    "..#######..",
    "...........",
    "###########",
    "###########",
    "###########",
    "###########",
    "###########",
    "###########",
    "...........",
  ],
  // target
  challenges: [
    "...#####...",
    ".##.....##.",
    ".#.......#.",
    "#...###...#",
    "#..#...#..#",
    "#..#.#.#..#",
    "#..#...#..#",
    "#...###...#",
    ".#.......#.",
    ".##.....##.",
    "...#####...",
  ],
  // bookmark
  watchlist: [
    "..#######..",
    "..#######..",
    "..#######..",
    "..#######..",
    "..#######..",
    "..#######..",
    "..#######..",
    "..###.###..",
    "..##...##..",
    "..#.....#..",
    "...........",
  ],
  // crown
  marquee: [
    "...........",
    "#....#....#",
    "##..###..##",
    "###.###.###",
    "###########",
    "###########",
    ".#########.",
    "...........",
    ".#########.",
    ".#########.",
    "...........",
  ],
};

const PIXEL = 3.2;
const GRID = 11;

// One path per emblem: a rectangle per run of filled cells in each row.
const pixelPath = (rows, cell) =>
  rows
    .map((row, y) => {
      let d = "";
      let x = 0;
      while (x < row.length) {
        if (row[x] !== "#") {
          x += 1;
          continue;
        }
        let end = x;
        while (row[end] === "#") end += 1;
        d += `M${x * cell} ${y * cell}h${(end - x) * cell}v${cell}h${-(end - x) * cell}z`;
        x = end;
      }
      return d;
    })
    .join("");

const EMBLEM_PATHS = Object.fromEntries(
  Object.entries(PIXELS).map(([key, rows]) => [key, pixelPath(rows, PIXEL)]),
);

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
          x={17}
          y={17}
          width={66}
          height={66}
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
  const track = BADGE_TRACKS[emblem] ?? BADGE_TRACKS.marquee;
  const emblemPath = EMBLEM_PATHS[emblem] ?? EMBLEM_PATHS.marquee;
  const ink = earned ? "#FFFFFF" : LOCKED_INK;
  const pips = Math.max(1, Math.min(5, tier + 1));
  const pipColor = earned ? "#FFFFFF" : LOCKED_INK;
  // The top tier gets a gold rim instead of a sixth pip.
  const maxed = earned && tier >= 5;
  // Emblem sits a little high, leaving room for the pips.
  const ex = 50 - (GRID * PIXEL) / 2;
  const ey = 43 - (GRID * PIXEL) / 2;

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
        edge={maxed ? PIP_GOLD : earned ? track.to : LOCKED_EDGE}
      />

      {/* Pixel emblem with a one-pixel drop shadow */}
      <G transform={`translate(${ex} ${ey})`}>
        {earned && (
          <Path
            d={emblemPath}
            fill={track.to}
            opacity={0.85}
            transform={`translate(0 ${PIXEL * 0.5})`}
          />
        )}
        <Path d={emblemPath} fill={ink} />
      </G>

      {/* Tier pips */}
      {Array.from({ length: pips }, (_, index) => (
        <Rect
          key={index}
          x={50 + (index - (pips - 1) / 2) * 8 - 2.5}
          y={74.5}
          width={5}
          height={5}
          fill={pipColor}
          opacity={earned ? 1 : 0.7}
        />
      ))}
    </Svg>
  );
};

export default BadgeArt;
