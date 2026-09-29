import Svg, { Path, Rect } from "react-native-svg";

const clamp = (value) => Math.max(0, Math.min(255, value));

const shade = (hex, percent) => {
  const num = parseInt(hex.replace("#", ""), 16);
  const amount = Math.round(2.55 * percent);
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0xff) + amount);
  const b = clamp((num & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};

// A faceted gem badge for league ranks — recolored per tier from a single
// base color (a lighter and a darker facet derived from it), with a small
// filmstrip-and-play emblem in the center so it reads as a movie badge.
// The gem outline and facets are hand-drawn plain geometry (a kite shape
// plus four triangular facets) rather than a pixel-art pattern, since a
// borrowed reference icon turned out to spell "</>" in its facet squares —
// fine for a coding app, wrong symbol entirely for this one.
export const RankGemIcon = ({ size = 48, color = "#A1664C" }) => {
  const mid = color;
  const light = shade(color, 22);
  const dark = shade(color, -28);

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path d="M14 8 L34 8 L44 18 L24 44 L4 18 Z" fill={mid} />
      <Path d="M14 8 L24 20 L4 18 Z" fill={light} />
      <Path d="M34 8 L44 18 L24 20 Z" fill={dark} />
      <Path d="M4 18 L24 20 L24 44 Z" fill={dark} />

      {/* Filmstrip frame + play triangle, so the gem reads as a movie
          badge rather than a generic rank icon. */}
      <Rect x="17" y="18" width="14" height="12" rx="2" fill="#FFFFFF" />
      <Rect x="19" y="16.5" width="2" height="2" rx="0.5" fill={mid} />
      <Rect x="27" y="16.5" width="2" height="2" rx="0.5" fill={mid} />
      <Rect x="19" y="29.5" width="2" height="2" rx="0.5" fill={mid} />
      <Rect x="27" y="29.5" width="2" height="2" rx="0.5" fill={mid} />
      <Path d="M22 21.2V26.8L27 24Z" fill={dark} />
    </Svg>
  );
};

export default RankGemIcon;
