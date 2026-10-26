// Two palettes — Letterboxd's. Dark: the blue-grey page (#14181C) under
// darker bars, cards a step lighter and panels #2C3440; buttons and the
// selected state (the open tab, a picked chip) Letterboxd's slate #445566
// with white text; the main buttons white. Text is white, then #99AABB and
// #8899AA (also the tabs not open) — Letterboxd's own #778899 is too faint
// on cards for 4.5 : 1. Light mode borrows the same blue-greys. Colour
// carries meaning on top: Letterboxd green (`success`) for done / saved /
// matched, Letterboxd blue (`rating`) for ranks, scores and collections,
// `danger` red for hard dares, poor scores and destructive actions.
// `isDark` lets the few theme-specific bits (status bar, blur tint) pick
// their side.
export const darkColors = {
  isDark: true,

  // The page under the header: Letterboxd's blue-grey.
  background: "#14181C",

  // The header bars (and the tab bars pinned under them): near-black.
  headerBackground: "#0E1013",

  card: "#1C2228",

  cardElevated: "#202830",

  // Empty tiles and light fills — muted text still reads 4.5:1 on it.
  cardElevatedLight: "#2C3440",

  textPrimary: "#FFFFFF",

  textSecondary: "#99AABB",

  textMuted: "#8899AA",

  accent: "#FFFFFF",
  accentLight: "#99AABB",

  accentContrast: "#0E1013",

  success: "#00E054",

  // Ranks, scores, collections: Letterboxd blue.
  rating: "#40BCF4",

  danger: "#FF8585",

  border: "#2C3440",

  // Selected tabs and chips: Letterboxd's slate, white text.
  selected: "#445566",

  selectedText: "#FFFFFF",

  successSoft: "rgba(0, 224, 84, 0.16)",

  surfaceSoft: "rgba(255, 255, 255, 0.06)",

  // Every grey button (Sign in, skips, ⇄, the sheets' actions…):
  // Letterboxd's button slate, white text.
  buttonFill: "#445566",

  // Round icon buttons (a movie's Watchlist / Tonight / Board / Trailer):
  // a quiet fill a step above the page.
  ringFill: "#1C2228",

  // Segmented tabs (For you / Friends, Browse / Reels…): a dark track, the
  // open one a slate pill with white text.
  segmentTrack: "#14181C",
  segmentOn: "#445566",
  segmentOnText: "#FFFFFF",
  // The tabs not open: the same grey as textMuted.
  segmentText: "#8899AA",

  // Every poster's thin frame.
  posterEdge: "#2C3440",
};

export const lightColors = {
  isDark: false,

  background: "#FFFFFF",

  headerBackground: "#FFFFFF",

  card: "#F2F2F3",

  // Sheets and popovers: white, lifted by their border.
  cardElevated: "#FFFFFF",

  cardElevatedLight: "#E6E7E9",

  textPrimary: "#111214",

  // The greys share dark mode's Letterboxd blue-grey.
  textSecondary: "#445566",

  textMuted: "#556677",

  accent: "#111214",
  accentLight: "#445566",

  accentContrast: "#FFFFFF",

  success: "#00873A",

  rating: "#17729E",

  danger: "#D64545",

  border: "#DCDDE0",

  selected: "#111214",

  selectedText: "#FFFFFF",

  successSoft: "rgba(31, 157, 85, 0.12)",

  surfaceSoft: "rgba(0, 0, 0, 0.05)",

  buttonFill: "#E8E9EC",

  ringFill: "#F7F7F8",

  segmentTrack: "#EDEEF0",
  segmentOn: "#445566",
  segmentOnText: "#FFFFFF",
  // The tabs not open: the same grey as textMuted.
  segmentText: "#556677",

  posterEdge: "rgba(0, 0, 0, 0.1)",
};

// Static default for code that can't call `useColors()`.
export const colors = darkColors;

export default colors;
