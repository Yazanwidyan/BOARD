import { useId } from "react";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { fonts } from "../theme/typography";

// Hand-drawn hero art for the reward dialog — one scene per kind of
// moment, all in the app's cinema language, drawn in a 120 × 120 box over
// a soft spotlight in the moment's colour:
//   watched    a ticket stub, punched with a check
//   rewatch    two tickets — the same movie again
//   collection a box set, every spine lit gold, with a seal
//   challenge  a clapperboard snapping shut
//   level      a gold star with the new level number
//   multi      a popcorn bucket ("Big Night!")
// (A badge moment shows the real badge medal instead — see BadgeArt.)

const GOLD = ["#FFF1BF", "#F2C75C", "#B98A2E"];
const INK = "#16152A";

const toRgb = (hex) => {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};
const mix = (hex, other, amount) => {
  const a = toRgb(hex);
  const b = toRgb(other);
  return `#${[0, 1, 2]
    .map((i) =>
      Math.round(a[i] + (b[i] - a[i]) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
};

const starPoints = (cx, cy, outer, inner, points = 5) =>
  Array.from({ length: points * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = ((-90 + (index * 180) / points) * Math.PI) / 180;
    return `${(cx + Math.cos(angle) * radius).toFixed(1)},${(cy + Math.sin(angle) * radius).toFixed(1)}`;
  }).join(" ");

// A ticket body (x 14–106, y 34–86) with half-circle notches on both
// sides, as one path.
const TICKET =
  "M20 34 H100 Q106 34 106 40 V53 A7 7 0 0 0 106 67 V80 Q106 86 100 86 H20 Q14 86 14 80 V67 A7 7 0 0 0 14 53 V40 Q14 34 20 34 Z";

const Ticket = ({ fill, ink, children }) => (
  <G>
    <Path d={TICKET} fill={fill} />
    {/* tear line before the stub */}
    <Path
      d="M82 38 V82"
      stroke={ink}
      strokeOpacity={0.45}
      strokeWidth={1.6}
      strokeDasharray="3 3"
    />
    {/* punch hole in the stub */}
    <Circle cx={94} cy={60} r={4.5} fill={ink} fillOpacity={0.55} />
    {children}
  </G>
);

const Sparkle = ({ x, y, size, color }) => (
  <Path
    d={`M${x} ${y - size} Q${x} ${y} ${x + size} ${y} Q${x} ${y} ${x} ${y + size} Q${x} ${y} ${x - size} ${y} Q${x} ${y} ${x} ${y - size} Z`}
    fill={color}
  />
);

const Scene = ({ kind, color, level, id }) => {
  const light = mix(color, "#FFFFFF", 0.45);
  const dark = mix(color, "#000000", 0.45);
  const metal = `url(#metal${id})`;
  const gold = `url(#gold${id})`;

  switch (kind) {
    case "rewatch":
      return (
        <G>
          <G transform="rotate(12 60 60) translate(6 -6)" opacity={0.55}>
            <Ticket fill={dark} ink={INK} />
          </G>
          <G transform="rotate(-8 60 60) translate(-2 6)">
            <Ticket fill={metal} ink={INK}>
              {/* loop arrow */}
              <Path
                d="M57 60 a11 11 0 1 1 -3.2 -7.8"
                stroke="#FFFFFF"
                strokeWidth={4.5}
                strokeLinecap="round"
                fill="none"
              />
              <Path d="M50 45 L57 52 L48 55 Z" fill="#FFFFFF" />
            </Ticket>
          </G>
        </G>
      );

    case "collection":
      return (
        <G>
          {/* spines peeking out, all lit gold */}
          {Array.from({ length: 7 }, (_, index) => (
            <Rect
              key={index}
              x={33 + index * 8}
              y={24}
              width={6}
              height={18}
              rx={1.5}
              fill={gold}
            />
          ))}
          <Rect
            x={26}
            y={36}
            width={68}
            height={64}
            rx={4}
            fill={INK}
            stroke={GOLD[1]}
            strokeWidth={2}
          />
          {/* 2 × 2 box art */}
          <Rect x={32} y={42} width={27} height={25} fill={color} />
          <Rect x={61} y={42} width={27} height={25} fill={light} />
          <Rect x={32} y={69} width={27} height={25} fill={dark} />
          <Rect
            x={61}
            y={69}
            width={27}
            height={25}
            fill={color}
            opacity={0.75}
          />
          {/* gold seal */}
          <Circle
            cx={90}
            cy={92}
            r={13}
            fill={gold}
            stroke="#FFF3C4"
            strokeWidth={2}
          />
          <Polygon points={starPoints(90, 92.5, 7, 3)} fill="#6B4A0E" />
        </G>
      );

    case "challenge":
      return (
        <G>
          {/* board */}
          <Rect
            x={24}
            y={54}
            width={72}
            height={46}
            rx={5}
            fill={INK}
            stroke={light}
            strokeOpacity={0.3}
            strokeWidth={1.5}
          />
          <Rect
            x={34}
            y={68}
            width={40}
            height={4}
            rx={2}
            fill={light}
            opacity={0.6}
          />
          <Rect
            x={34}
            y={78}
            width={52}
            height={4}
            rx={2}
            fill={light}
            opacity={0.35}
          />
          <Rect
            x={34}
            y={88}
            width={30}
            height={4}
            rx={2}
            fill={light}
            opacity={0.35}
          />
          {/* lower clapper bar */}
          <Rect x={24} y={44} width={72} height={10} fill={metal} />
          {[0, 1, 2, 3].map((index) => (
            <Polygon
              key={`b${index}`}
              points={`${30 + index * 18},44 ${38 + index * 18},44 ${33 + index * 18},54 ${25 + index * 18},54`}
              fill={INK}
            />
          ))}
          {/* top clapper, snapping down */}
          <G transform="rotate(-16 24 42)">
            <Rect x={24} y={32} width={72} height={10} fill={metal} />
            {[0, 1, 2, 3].map((index) => (
              <Polygon
                key={`t${index}`}
                points={`${30 + index * 18},32 ${38 + index * 18},32 ${33 + index * 18},42 ${25 + index * 18},42`}
                fill={INK}
              />
            ))}
          </G>
          <Circle cx={25} cy={43} r={3} fill={light} />
          <Sparkle x={92} y={26} size={6} color={GOLD[0]} />
          <Sparkle x={104} y={40} size={3.5} color={GOLD[0]} />
        </G>
      );

    case "level":
      return (
        <G>
          {/* rays */}
          {Array.from({ length: 12 }, (_, index) => {
            const angle = (index * 30 * Math.PI) / 180;
            const x1 = 60 + Math.cos(angle) * 44;
            const y1 = 60 + Math.sin(angle) * 44;
            const x2 = 60 + Math.cos(angle) * 54;
            const y2 = 60 + Math.sin(angle) * 54;
            return (
              <Path
                key={index}
                d={`M${x1} ${y1} L${x2} ${y2}`}
                stroke={GOLD[0]}
                strokeOpacity={0.7}
                strokeWidth={3}
                strokeLinecap="round"
              />
            );
          })}
          <Polygon
            points={starPoints(60, 62, 42, 19)}
            fill={gold}
            stroke="#FFF3C4"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {level != null && (
            <SvgText
              x={60}
              y={71}
              textAnchor="middle"
              fontSize={level >= 10 ? 21 : 25}
              fontFamily={fonts.extraBold}
              fill="#5A3F0C"
            >
              {String(level)}
            </SvgText>
          )}
        </G>
      );

    case "multi":
      return (
        <G>
          {/* popcorn */}
          {[
            [44, 46, 11],
            [60, 40, 13],
            [76, 46, 11],
            [52, 32, 10],
            [69, 30, 10],
            [36, 54, 8],
            [84, 54, 8],
            [60, 24, 8],
          ].map(([cx, cy, r]) => (
            <G key={`${cx}-${cy}`}>
              <Circle cx={cx} cy={cy} r={r} fill="#FFF6DD" />
              <Circle
                cx={cx + r * 0.3}
                cy={cy + r * 0.25}
                r={r * 0.45}
                fill="#F2D58A"
                opacity={0.55}
              />
            </G>
          ))}
          {/* bucket with stripes */}
          <Path d="M32 56 H88 L80 106 H40 Z" fill="#FFFFFF" />
          {[0, 1, 2].map((index) => (
            <Path
              key={index}
              d={`M${38 + index * 18} 56 H${46 + index * 18} L${44.5 + index * 16} 106 H${37.5 + index * 16} Z`}
              fill={color}
            />
          ))}
          <Rect x={29} y={53} width={62} height={7} rx={3} fill={light} />
          <Sparkle x={98} y={30} size={6} color={GOLD[0]} />
          <Sparkle x={22} y={36} size={4} color={GOLD[0]} />
        </G>
      );

    case "watched":
    default:
      return (
        <G transform="rotate(-8 60 60)">
          <Ticket fill={metal} ink={INK}>
            <Path
              d="M37 60 l8 8 l16 -17"
              stroke="#FFFFFF"
              strokeWidth={5.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Ticket>
        </G>
      );
  }
};

export const DialogArt = ({ kind, color, level, size = 132 }) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <RadialGradient id={`spot${id}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0.45} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`metal${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={mix(color, "#FFFFFF", 0.4)} />
          <Stop offset="1" stopColor={mix(color, "#000000", 0.2)} />
        </LinearGradient>
        <LinearGradient id={`gold${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={GOLD[0]} />
          <Stop offset="0.5" stopColor={GOLD[1]} />
          <Stop offset="1" stopColor={GOLD[2]} />
        </LinearGradient>
      </Defs>
      <Circle cx={60} cy={60} r={60} fill={`url(#spot${id})`} />
      <Scene kind={kind} color={color} level={level} id={id} />
    </Svg>
  );
};

// The small tick stamped next to a reward line that carries no XP.
export const StampCheck = ({ color, size = 18 }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20">
    <Circle
      cx={10}
      cy={10}
      r={8.5}
      fill="none"
      stroke={color}
      strokeWidth={1.6}
      strokeDasharray="2.2 1.4"
    />
    <Path
      d="M6 10.3 l2.6 2.6 l5.4 -5.8"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default DialogArt;
