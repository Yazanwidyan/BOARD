import Svg, { Path } from "react-native-svg";

// Tonight's pick, as a line icon: an outlined play triangle with softly
// rounded corners. Drawn in a 24 × 24 box with round joins, the same
// weight as the app's lucide icons, so it sits beside them (and takes the
// same size / color / strokeWidth props).
export const TonightIcon = ({ size = 24, color = "#FFFFFF", strokeWidth = 1.9 }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Optically centred: nudged right, since a triangle's weight sits
        toward its flat side. */}
    <Path d="M7.5 5.2v13.6a1.2 1.2 0 0 0 1.8 1l10.6-6.8a1.2 1.2 0 0 0 0-2L9.3 4.2a1.2 1.2 0 0 0-1.8 1Z" />
  </Svg>
);

export default TonightIcon;
