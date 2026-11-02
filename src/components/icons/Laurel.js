import { useId } from "react";
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Polygon, Stop } from "react-native-svg";

// ReelBoard's trophy: a film festival's laurels — two gold branches curving
// up either side of a circle, tied with a ribbon at the foot — drawn in a
// 100 × 100 box. The trophy cabinet sets a finished collection's posters in
// the middle (components/TrophyCabinet); the icon (LaurelIcon) puts a star
// there.

// Highlight → gold → shade.
export const GOLD = ["#FFF1B8", "#E9C25A", "#A9781E"];
// A trophy not won yet: the same laurels in pewter.
export const PEWTER = ["#8E8E93", "#5C5C60", "#3A3A3C"];

const CENTER = { x: 50, y: 50 };
// The stems' circle, and how many pairs of leaves on each branch.
const STEM = 41;
const PAIRS = 7;
// Where the branches run, in degrees (0 = right, 90 = down): from the foot
// up each side, stopping short of the top. The leaves start a little above
// the ribbon.
const FROM = 97;
const LEAVES_FROM = 114;
const TO = 238;

const point = (degrees, radius) => {
  const angle = (degrees * Math.PI) / 180;
  return { x: CENTER.x + Math.cos(angle) * radius, y: CENTER.y + Math.sin(angle) * radius };
};

// One branch's leaves, from the foot up: a pair at each step — one either
// side of the stem, both tipped up the branch — smaller towards the top,
// and one more at the tip. `side`: -1 the left branch, 1 the right
// (mirrored).
const leavesOf = (side) => {
  const leaf = (key, degrees, offset, tilt, size) => {
    const at = point(degrees, STEM + offset);
    const angle = degrees + 90 + tilt;
    return {
      key: `${side}-${key}`,
      cx: side === -1 ? at.x : 100 - at.x,
      cy: at.y,
      rx: 6.6 * size,
      ry: 2.7 * size,
      rotate: side === -1 ? angle : 180 - angle,
    };
  };
  const pairs = Array.from({ length: PAIRS }, (_, index) => {
    const step = index / (PAIRS - 1);
    const degrees = LEAVES_FROM + (TO - 8 - LEAVES_FROM) * step;
    const size = 1 - step * 0.3;
    return [leaf(`out${index}`, degrees, 4.6 * size, -34, size), leaf(`in${index}`, degrees, -4.2 * size, 34, size)];
  }).flat();
  return [...pairs, leaf("tip", TO + 2, 0, 0, 0.72)];
};

const arc = (side) => {
  const start = point(FROM, STEM);
  const end = point(TO, STEM);
  const flip = (p) => (side === -1 ? p : { x: 100 - p.x, y: p.y });
  const a = flip(start);
  const b = flip(end);
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} A${STEM} ${STEM} 0 0 ${side === -1 ? 1 : 0} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
};

// The wreath alone. `children` (SVG) go in the middle, behind nothing.
// `muted`: not won yet — pewter, not gold.
export const Laurel = ({ size, muted = false, children }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gold = `url(#gold${id})`;
  const tones = muted ? PEWTER : GOLD;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`gold${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={tones[0]} />
          <Stop offset="0.45" stopColor={tones[1]} />
          <Stop offset="1" stopColor={tones[2]} />
        </LinearGradient>
      </Defs>
      {children}
      {[-1, 1].map((side) => (
        <G key={side}>
          <Path d={arc(side)} stroke={gold} strokeWidth={1.6} fill="none" strokeLinecap="round" />
          {leavesOf(side).map((leaf) => (
            <Ellipse
              key={leaf.key}
              cx={leaf.cx}
              cy={leaf.cy}
              rx={leaf.rx}
              ry={leaf.ry}
              fill={gold}
              transform={`rotate(${leaf.rotate.toFixed(1)} ${leaf.cx.toFixed(1)} ${leaf.cy.toFixed(1)})`}
            />
          ))}
        </G>
      ))}
      {/* The ribbon where the stems cross: a knot and two tails. */}
      <Polygon points="44,95 50,90 47,100" fill={tones[2]} />
      <Polygon points="56,95 50,90 53,100" fill={tones[2]} />
      <Ellipse cx={50} cy={90.5} rx={3.4} ry={2.6} fill={gold} />
    </Svg>
  );
};

// A five-pointed star's points, for the icon's middle.
const starPoints = (cx, cy, outer, inner) =>
  Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = ((-90 + index * 36) * Math.PI) / 180;
    return `${(cx + Math.cos(angle) * radius).toFixed(1)},${(cy + Math.sin(angle) * radius).toFixed(1)}`;
  }).join(" ");

// The trophy as an icon (headings, the share card): the laurels round a
// gold star — pewter, `muted`, for one not won yet.
export const LaurelIcon = ({ size = 20, muted = false }) => (
  <Laurel size={size} muted={muted}>
    <Polygon points={starPoints(50, 49, 19, 8)} fill={(muted ? PEWTER : GOLD)[1]} />
  </Laurel>
);

export default Laurel;
