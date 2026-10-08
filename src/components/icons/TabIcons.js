import Svg, { Circle, G, Path, Rect } from "react-native-svg";

// Solid-glyph icons from assets/*.svg (SVG Repo), rendered via react-native-svg
// primitives instead of Image so `color` can recolor them at runtime for the
// tab bar's active/inactive states.
const COMPASS_PATH =
  "M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM14.5981 10.4999C14.0241 9.50566 11.0229 7.85497 9.66659 7.14526C9.35019 6.97969 8.97741 7.19492 8.96259 7.55171C8.89909 9.08112 8.82799 12.5057 9.40199 13.4999C9.976 14.4941 12.9773 16.1448 14.3335 16.8545C14.6499 17.02 15.0227 16.8048 15.0375 16.448C15.101 14.9186 15.1721 11.4941 14.5981 10.4999Z";

export const CompassIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path fillRule="evenodd" clipRule="evenodd" d={COMPASS_PATH} fill={color} />
  </Svg>
);

// Stroke-only twin of CompassIcon — the "inactive" treatment for the
// Discover tab (vs. CompassIcon's solid fill used when active).
export const CompassOutlineIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d={COMPASS_PATH} fill="none" stroke={color} strokeWidth={1.5} />
  </Svg>
);

export const PointersIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11.1056 3.44721L5.78885 6.10557C5.00831 6.49585 4.61803 6.69098 4.61803 7C4.61803 7.30902 5.00831 7.50415 5.78885 7.89443L11.1056 10.5528C11.5445 10.7722 11.7639 10.882 12 10.882C12.2361 10.882 12.4555 10.7722 12.8944 10.5528L18.2111 7.89443C18.9917 7.50415 19.382 7.30902 19.382 7C19.382 6.69098 18.9917 6.49585 18.2111 6.10557L12.8944 3.44721C12.4555 3.22776 12.2361 3.11803 12 3.11803C11.7639 3.11803 11.5445 3.22776 11.1056 3.44721Z"
      fill={color}
    />
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7.02204 10.4893C7.62591 10.8135 8.33704 11.169 9.15542 11.5782L10.2111 12.1061C11.089 12.545 11.5279 12.7644 12 12.7644C12.4721 12.7644 12.911 12.545 13.7889 12.1061L14.8446 11.5782C15.663 11.169 16.3741 10.8135 16.978 10.4893L18.2112 11.1059C18.9917 11.4961 19.382 11.6913 19.382 12.0003C19.382 12.3093 18.9917 12.5044 18.2112 12.8947L12.8944 15.5531C12.4555 15.7725 12.2361 15.8822 12 15.8822C11.7639 15.8822 11.5445 15.7725 11.1056 15.5531L11.1056 15.5531L5.78886 12.8947C5.00832 12.5044 4.61804 12.3093 4.61804 12.0003C4.61804 11.6913 5.00832 11.4961 5.78886 11.1059L7.02204 10.4893Z"
      fill={color}
    />
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7.02157 15.4893C7.62555 15.8135 8.33684 16.1692 9.15544 16.5785L10.2112 17.1063C11.089 17.5452 11.5279 17.7647 12 17.7647C12.4722 17.7647 12.9111 17.5452 13.7889 17.1063L14.8446 16.5785C15.6632 16.1692 16.3745 15.8135 16.9785 15.4893L18.2112 16.1056C18.9917 16.4959 19.382 16.691 19.382 17C19.382 17.3091 18.9917 17.5042 18.2112 17.8945L12.8944 20.5528C12.4555 20.7723 12.2361 20.882 12 20.882C11.7639 20.882 11.5445 20.7723 11.1056 20.5528L11.1056 20.5528L5.78886 17.8945C5.00832 17.5042 4.61804 17.3091 4.61804 17C4.61804 16.691 5.00832 16.4959 5.78886 16.1056L7.02157 15.4893Z"
      fill={color}
    />
  </Svg>
);

export const ShuffleIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <G transform="translate(16 16) scale(0.85) translate(-16 -16)">
      <Path
        d="M1,10c0-1.104,0.896-2,2-2h2c2.356,0,4.405,1.394,6.31,3.322l-2.512,3.15
	C7.455,13.041,6.137,12,5,12H3C1.896,12,1,11.104,1,10z M22,10h2.172l-0.586,0.586c-0.781,0.781-0.781,2.047,0,2.828
	s2.047,0.781,2.828,0l4-4c0.781-0.781,0.781-2.047,0-2.828l-4-4c-0.781-0.781-2.047-0.781-2.828,0s-0.781,2.047,0,2.828L24.172,6H22
	c-3.972,0-7.073,3.947-10.072,7.765C9.631,16.688,7.028,20,5,20H3c-1.104,0-2,0.896-2,2s0.896,2,2,2h2
	c3.972,0,7.073-3.947,10.072-7.765C17.369,13.312,19.972,10,22,10z M26.414,18.586c-0.781-0.781-2.047-0.781-2.828,0
	s-0.781,2.047,0,2.828L24.172,22H22c-1.606,0-3.572-2.078-5.461-4.394l-2.581,3.153C16.353,23.614,18.913,26,22,26h2.172
	l-0.586,0.586c-0.781,0.781-0.781,2.047,0,2.828s2.047,0.781,2.828,0l4-4c0.781-0.781,0.781-2.047,0-2.828L26.414,18.586z"
        fill={color}
        stroke={color}
        strokeWidth={0.75}
        strokeLinejoin="round"
      />
    </G>
  </Svg>
);

export const BookmarkIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 9C4 6.17157 4 4.75736 4.87868 3.87868C5.75736 3 7.17157 3 10 3H14C16.8284 3 18.2426 3 19.1213 3.87868C20 4.75736 20 6.17157 20 9V15.8276C20 18.5109 20 19.8525 19.1557 20.2629C18.3114 20.6733 17.2565 19.8444 15.1465 18.1866L14.4713 17.656C13.2849 16.7239 12.6917 16.2578 12 16.2578C11.3083 16.2578 10.7151 16.7239 9.52871 17.656L8.85346 18.1866C6.74355 19.8444 5.68859 20.6733 4.84429 20.2629C4 19.8525 4 18.5109 4 15.8276V9Z"
      fill={color}
      stroke={color}
      strokeWidth={2}
    />
  </Svg>
);

export const GridIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="8" height="8" rx="2" fill={color} />
    <Rect x="13" y="3" width="8" height="8" rx="2" fill={color} />
    <Rect x="3" y="13" width="8" height="8" rx="2" fill={color} />
    <Rect x="13" y="13" width="8" height="8" rx="2" fill={color} />
  </Svg>
);

const LIBRARY_PATH =
  "M5.9897,3 C7.0937,3 7.9897,3.896 7.9897,5 L7.9897,23 C7.9897,24.104 7.0937,25 5.9897,25 L4.0007,25 C2.8957,25 2.0007,24.104 2.0007,23 L2.0007,5 C2.0007,3.896 2.8957,3 4.0007,3 L5.9897,3 Z M12.9897,3 C14.0937,3 14.9897,3.896 14.9897,5 L14.9897,23 C14.9897,24.104 14.0937,25 12.9897,25 L10.9947,25 C9.8897,25 8.9947,24.104 8.9947,23 L8.9947,5 C8.9947,3.896 9.8897,3 10.9947,3 L12.9897,3 Z M22.0701,6.5432 L25.9301,22.0262 C26.1971,23.0972 25.5441,24.1832 24.4731,24.4512 L22.5101,24.9402 C21.4391,25.2072 20.3531,24.5552 20.0861,23.4832 L16.2261,8.0002 C15.9581,6.9282 16.6111,5.8432 17.6821,5.5752 L19.6451,5.0862 C20.7161,4.8182 21.8021,5.4712 22.0701,6.5432 Z";

export const LibraryIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <G transform="translate(14 14) scale(0.85) translate(-14 -14)">
      <Path d={LIBRARY_PATH} fill={color} />
    </G>
  </Svg>
);

// Stroke-only twin of LibraryIcon — the "inactive" treatment for the
// Library tab (vs. LibraryIcon's solid fill used when active).
export const LibraryOutlineIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <G transform="translate(14 14) scale(0.85) translate(-14 -14)">
      <Path d={LIBRARY_PATH} fill="none" stroke={color} strokeWidth={1.5} />
    </G>
  </Svg>
);

// No fitting asset for "Collections", so hand-drafted in the same
// solid-glyph style as the rest: a fanned stack of cards.
export const LayersIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="3"
      y="7"
      width="14"
      height="14"
      rx="3"
      fill={color}
      opacity={0.35}
    />
    <Rect
      x="6"
      y="4"
      width="14"
      height="14"
      rx="3"
      fill={color}
      opacity={0.65}
    />
    <Rect x="9" y="1" width="14" height="14" rx="3" fill={color} />
  </Svg>
);

export const HomeIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10 20V14H14V20H19V12H22L12 3L2 12H5V20H10Z" fill={color} />
  </Svg>
);

// The Home tab is literally named "Board" — a hand-drafted angular
// logomark (zigzag stem + rounded bowl) instead of a plain letterform or a
// house glyph. Solid-only (no outline twin): it's a single brand mark, not
// a glyph meant to read differently active vs. inactive.
// ReelBoard's logo: a film strip curled into a ring — frames around the
// middle, sprocket holes along both edges. One colour: the frames and
// holes are cut out (evenodd), so it works on any background. Same shape
// as the app icon, in a square box cropped to the ring.
const LOGO_FILM_RING =
  "M92 50 A42 42 0 1 0 8 50 A42 42 0 1 0 92 50 Z M73 50 A23 23 0 1 0 27 50 A23 23 0 1 0 73 50 Z M51.02 13.51 A36.5 36.5 0 0 1 67.36 17.89 L63.56 24.93 A28.5 28.5 0 0 0 50.8 21.51 Z M69.13 18.91 A36.5 36.5 0 0 1 81.09 30.87 L74.27 35.07 A28.5 28.5 0 0 0 64.93 25.73 Z M82.11 32.64 A36.5 36.5 0 0 1 86.49 48.98 L78.49 49.2 A28.5 28.5 0 0 0 75.07 36.44 Z M86.49 51.02 A36.5 36.5 0 0 1 82.11 67.36 L75.07 63.56 A28.5 28.5 0 0 0 78.49 50.8 Z M81.09 69.13 A36.5 36.5 0 0 1 69.13 81.09 L64.93 74.27 A28.5 28.5 0 0 0 74.27 64.93 Z M67.36 82.11 A36.5 36.5 0 0 1 51.02 86.49 L50.8 78.49 A28.5 28.5 0 0 0 63.56 75.07 Z M48.98 86.49 A36.5 36.5 0 0 1 32.64 82.11 L36.44 75.07 A28.5 28.5 0 0 0 49.2 78.49 Z M30.87 81.09 A36.5 36.5 0 0 1 18.91 69.13 L25.73 64.93 A28.5 28.5 0 0 0 35.07 74.27 Z M17.89 67.36 A36.5 36.5 0 0 1 13.51 51.02 L21.51 50.8 A28.5 28.5 0 0 0 24.93 63.56 Z M13.51 48.98 A36.5 36.5 0 0 1 17.89 32.64 L24.93 36.44 A28.5 28.5 0 0 0 21.51 49.2 Z M18.91 30.87 A36.5 36.5 0 0 1 30.87 18.91 L35.07 25.73 A28.5 28.5 0 0 0 25.73 35.07 Z M32.64 17.89 A36.5 36.5 0 0 1 48.98 13.51 L49.2 21.51 A28.5 28.5 0 0 0 36.44 24.93 Z M48.44 9.43 A40.6 40.6 0 0 1 51.56 9.43 L51.47 11.63 A38.4 38.4 0 0 0 48.53 11.63 Z M56.39 9.91 A40.6 40.6 0 0 1 59.44 10.51 L58.93 12.65 A38.4 38.4 0 0 0 56.04 12.08 Z M64.09 11.92 A40.6 40.6 0 0 1 66.97 13.11 L66.05 15.11 A38.4 38.4 0 0 0 63.32 13.99 Z M71.24 15.4 A40.6 40.6 0 0 1 73.84 17.13 L72.54 18.91 A38.4 38.4 0 0 0 70.09 17.28 Z M77.59 20.21 A40.6 40.6 0 0 1 79.79 22.41 L78.18 23.91 A38.4 38.4 0 0 0 76.09 21.82 Z M82.87 26.16 A40.6 40.6 0 0 1 84.6 28.76 L82.72 29.91 A38.4 38.4 0 0 0 81.09 27.46 Z M86.89 33.03 A40.6 40.6 0 0 1 88.08 35.91 L86.01 36.68 A38.4 38.4 0 0 0 84.89 33.95 Z M89.49 40.56 A40.6 40.6 0 0 1 90.09 43.61 L87.92 43.96 A38.4 38.4 0 0 0 87.35 41.07 Z M90.57 48.44 A40.6 40.6 0 0 1 90.57 51.56 L88.37 51.47 A38.4 38.4 0 0 0 88.37 48.53 Z M90.09 56.39 A40.6 40.6 0 0 1 89.49 59.44 L87.35 58.93 A38.4 38.4 0 0 0 87.92 56.04 Z M88.08 64.09 A40.6 40.6 0 0 1 86.89 66.97 L84.89 66.05 A38.4 38.4 0 0 0 86.01 63.32 Z M84.6 71.24 A40.6 40.6 0 0 1 82.87 73.84 L81.09 72.54 A38.4 38.4 0 0 0 82.72 70.09 Z M79.79 77.59 A40.6 40.6 0 0 1 77.59 79.79 L76.09 78.18 A38.4 38.4 0 0 0 78.18 76.09 Z M73.84 82.87 A40.6 40.6 0 0 1 71.24 84.6 L70.09 82.72 A38.4 38.4 0 0 0 72.54 81.09 Z M66.97 86.89 A40.6 40.6 0 0 1 64.09 88.08 L63.32 86.01 A38.4 38.4 0 0 0 66.05 84.89 Z M59.44 89.49 A40.6 40.6 0 0 1 56.39 90.09 L56.04 87.92 A38.4 38.4 0 0 0 58.93 87.35 Z M51.56 90.57 A40.6 40.6 0 0 1 48.44 90.57 L48.53 88.37 A38.4 38.4 0 0 0 51.47 88.37 Z M43.61 90.09 A40.6 40.6 0 0 1 40.56 89.49 L41.07 87.35 A38.4 38.4 0 0 0 43.96 87.92 Z M35.91 88.08 A40.6 40.6 0 0 1 33.03 86.89 L33.95 84.89 A38.4 38.4 0 0 0 36.68 86.01 Z M28.76 84.6 A40.6 40.6 0 0 1 26.16 82.87 L27.46 81.09 A38.4 38.4 0 0 0 29.91 82.72 Z M22.41 79.79 A40.6 40.6 0 0 1 20.21 77.59 L21.82 76.09 A38.4 38.4 0 0 0 23.91 78.18 Z M17.13 73.84 A40.6 40.6 0 0 1 15.4 71.24 L17.28 70.09 A38.4 38.4 0 0 0 18.91 72.54 Z M13.11 66.97 A40.6 40.6 0 0 1 11.92 64.09 L13.99 63.32 A38.4 38.4 0 0 0 15.11 66.05 Z M10.51 59.44 A40.6 40.6 0 0 1 9.91 56.39 L12.08 56.04 A38.4 38.4 0 0 0 12.65 58.93 Z M9.43 51.56 A40.6 40.6 0 0 1 9.43 48.44 L11.63 48.53 A38.4 38.4 0 0 0 11.63 51.47 Z M9.91 43.61 A40.6 40.6 0 0 1 10.51 40.56 L12.65 41.07 A38.4 38.4 0 0 0 12.08 43.96 Z M11.92 35.91 A40.6 40.6 0 0 1 13.11 33.03 L15.11 33.95 A38.4 38.4 0 0 0 13.99 36.68 Z M15.4 28.76 A40.6 40.6 0 0 1 17.13 26.16 L18.91 27.46 A38.4 38.4 0 0 0 17.28 29.91 Z M20.21 22.41 A40.6 40.6 0 0 1 22.41 20.21 L23.91 21.82 A38.4 38.4 0 0 0 21.82 23.91 Z M26.16 17.13 A40.6 40.6 0 0 1 28.76 15.4 L29.91 17.28 A38.4 38.4 0 0 0 27.46 18.91 Z M33.03 13.11 A40.6 40.6 0 0 1 35.91 11.92 L36.68 13.99 A38.4 38.4 0 0 0 33.95 15.11 Z M40.56 10.51 A40.6 40.6 0 0 1 43.61 9.91 L43.96 12.08 A38.4 38.4 0 0 0 41.07 12.65 Z M48.52 23.44 A26.6 26.6 0 0 1 51.48 23.44 L51.36 25.64 A24.4 24.4 0 0 0 48.64 25.64 Z M56.79 24.28 A26.6 26.6 0 0 1 59.62 25.2 L58.82 27.25 A24.4 24.4 0 0 0 56.23 26.41 Z M64.41 27.64 A26.6 26.6 0 0 1 66.81 29.39 L65.42 31.09 A24.4 24.4 0 0 0 63.22 29.49 Z M70.61 33.19 A26.6 26.6 0 0 1 72.36 35.59 L70.51 36.78 A24.4 24.4 0 0 0 68.91 34.58 Z M74.8 40.38 A26.6 26.6 0 0 1 75.72 43.21 L73.59 43.77 A24.4 24.4 0 0 0 72.75 41.18 Z M76.56 48.52 A26.6 26.6 0 0 1 76.56 51.48 L74.36 51.36 A24.4 24.4 0 0 0 74.36 48.64 Z M75.72 56.79 A26.6 26.6 0 0 1 74.8 59.62 L72.75 58.82 A24.4 24.4 0 0 0 73.59 56.23 Z M72.36 64.41 A26.6 26.6 0 0 1 70.61 66.81 L68.91 65.42 A24.4 24.4 0 0 0 70.51 63.22 Z M66.81 70.61 A26.6 26.6 0 0 1 64.41 72.36 L63.22 70.51 A24.4 24.4 0 0 0 65.42 68.91 Z M59.62 74.8 A26.6 26.6 0 0 1 56.79 75.72 L56.23 73.59 A24.4 24.4 0 0 0 58.82 72.75 Z M51.48 76.56 A26.6 26.6 0 0 1 48.52 76.56 L48.64 74.36 A24.4 24.4 0 0 0 51.36 74.36 Z M43.21 75.72 A26.6 26.6 0 0 1 40.38 74.8 L41.18 72.75 A24.4 24.4 0 0 0 43.77 73.59 Z M35.59 72.36 A26.6 26.6 0 0 1 33.19 70.61 L34.58 68.91 A24.4 24.4 0 0 0 36.78 70.51 Z M29.39 66.81 A26.6 26.6 0 0 1 27.64 64.41 L29.49 63.22 A24.4 24.4 0 0 0 31.09 65.42 Z M25.2 59.62 A26.6 26.6 0 0 1 24.28 56.79 L26.41 56.23 A24.4 24.4 0 0 0 27.25 58.82 Z M23.44 51.48 A26.6 26.6 0 0 1 23.44 48.52 L25.64 48.64 A24.4 24.4 0 0 0 25.64 51.36 Z M24.28 43.21 A26.6 26.6 0 0 1 25.2 40.38 L27.25 41.18 A24.4 24.4 0 0 0 26.41 43.77 Z M27.64 35.59 A26.6 26.6 0 0 1 29.39 33.19 L31.09 34.58 A24.4 24.4 0 0 0 29.49 36.78 Z M33.19 29.39 A26.6 26.6 0 0 1 35.59 27.64 L36.78 29.49 A24.4 24.4 0 0 0 34.58 31.09 Z M40.38 25.2 A26.6 26.6 0 0 1 43.21 24.28 L43.77 26.41 A24.4 24.4 0 0 0 41.18 27.25 Z";

export const ReelBoardIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="7 7 86 86" fill="none">
    <Path fillRule="evenodd" fill={color} d={LOGO_FILM_RING} />
  </Svg>
);

export const BoardBIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 3 L18 3 L11 13 L15 13 L8 21 L4 21 L11 11 L7 11 Z"
      fill={color}
    />
    <Path d="M12 9 H14.5 A5.5 5.5 0 0 1 14.5 20 H12 Z" fill={color} />
  </Svg>
);

// Concentric rings instead of a dice/pip glyph — a pip-based die needs a
// second contrasting color to punch through, which breaks this tab bar's
// single-`color`-prop swap between active/inactive states.
export const TargetIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} fill="none" />
    <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth={2} fill="none" />
    <Circle cx="12" cy="12" r="1.8" fill={color} />
  </Svg>
);

// A rounded screen with a play triangle cut out of its center via an
// evenodd compound path — the same single-path trick CompassIcon uses for
// its needle, so the triangle reads as a hole in the solid screen (active)
// and as its own outline alongside the screen's when just stroked (inactive).
const SCREEN_PLAY_PATH =
  "M6 3 H18 A3 3 0 0 1 21 6 V15 A3 3 0 0 1 18 18 H6 A3 3 0 0 1 3 15 V6 A3 3 0 0 1 6 3 Z M9.5 7.5 L9.5 13.5 L15.5 10.5 Z";

export const PlayScreenIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d={SCREEN_PLAY_PATH}
      fill={color}
    />
    <Path d="M9 21H15" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// Stroke-only twin of PlayScreenIcon — the "inactive" treatment for the
// Decide tab (vs. PlayScreenIcon's solid fill used when active).
export const PlayScreenOutlineIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d={SCREEN_PLAY_PATH} fill="none" stroke={color} strokeWidth={1.5} />
    <Path d="M9 21H15" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export const UserIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" fill={color} />
    <Path
      d="M5.33788 17.3206C5.99897 14.5269 8.77173 13 11.6426 13H12.3574C15.2283 13 18.001 14.5269 18.6621 17.3206C18.79 17.8611 18.8917 18.4268 18.9489 19.0016C19.0036 19.5512 18.5523 20 18 20H6C5.44772 20 4.99642 19.5512 5.0511 19.0016C5.1083 18.4268 5.20997 17.8611 5.33788 17.3206Z"
      fill={color}
    />
  </Svg>
);

// Ring + head + shoulders share one set of coordinates between the outline
// and filled variants below, sized to sit inside a r=10 ring — matching
// CompassIcon's ring radius so Profile reads at the same visual size/weight
// as the other tab icons instead of looking smaller — so switching active
// state only toggles fill, never the shape itself, and the stroke width
// (1.5) matches the rest of this file's outline icons instead of a lucide
// default. The body path has no closing "Z" — left open at the bottom
// instead of a flat closing edge, so the stroked (inactive) version reads
// as an open collar.
const PROFILE_HEAD = { cx: 12, cy: 8.7, r: 4.2 };
const PROFILE_BODY_PATH = "M6.4 19.2 Q6.4 15.9 12 15.9 Q17.6 15.9 17.6 19.2";
// Filled variant needs an explicit close — react-native-svg doesn't
// auto-close an open subpath for fill the way browser SVG does, which left
// a sliver of background showing through near the open end.
const PROFILE_BODY_PATH_SOLID = `${PROFILE_BODY_PATH} Z`;

// The "inactive" treatment for the Profile tab — a plain outline, replacing
// lucide's CircleUserRound so geometry and stroke width stay in sync with
// the solid-fill "active" version below.
export const CircleUserOutlineIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="12"
      r="10"
      stroke={color}
      strokeWidth={1.5}
      fill="none"
    />
    <Circle {...PROFILE_HEAD} stroke={color} strokeWidth={1.5} fill="none" />
    <Path d={PROFILE_BODY_PATH} stroke={color} strokeWidth={1.5} fill="none" />
  </Svg>
);

// Same ring/head/shoulders geometry as CircleUserOutlineIcon, head and
// shoulders solid-filled — the "active" treatment for the Profile tab.
export const CircleUserFilledIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle
      cx="12"
      cy="12"
      r="10"
      stroke={color}
      strokeWidth={1.5}
      fill="none"
    />
    <Circle {...PROFILE_HEAD} fill={color} />
    <Path d={PROFILE_BODY_PATH_SOLID} fill={color} />
  </Svg>
);

export const SearchAltIcon = ({ size = 24, color = "#000000" }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11 18C14.866 18 18 14.866 18 11C18 7.13401 14.866 4 11 4C7.13401 4 4 7.13401 4 11C4 14.866 7.13401 18 11 18ZM11 6C10.3434 6 9.69321 6.12933 9.08658 6.3806C8.47995 6.63188 7.92876 7.00017 7.46447 7.46447C7.00017 7.92876 6.63188 8.47996 6.3806 9.08658C6.12933 9.69321 6 10.3434 6 11C6 11.5523 6.44772 12 7 12C7.55228 12 8 11.5523 8 11C8 10.606 8.0776 10.2159 8.22836 9.85195C8.37913 9.48797 8.6001 9.15726 8.87868 8.87868C9.15726 8.6001 9.48797 8.37913 9.85195 8.22836C10.2159 8.0776 10.606 8 11 8C11.5523 8 12 7.55228 12 7C12 6.44772 11.5523 6 11 6Z"
      fill={color}
    />
    <Path
      d="M20 20L18 18"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);
