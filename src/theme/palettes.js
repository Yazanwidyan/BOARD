// Two palettes. Dark: a grey page (#1A1B1E) under near-black bars, cards
// and sheets a step lighter; #667688 slate for selected states (the open
// tab, a picked chip); the main buttons the page's contrast colour (white).
// Text is white, then two slate-blue greys — textSecondary, and textMuted
// (also the tabs not open) — and light mode uses the same slate tone, every
// grey readable at 4.5 : 1 or better on the page, cards and sheets. Colour
// carries meaning on top: `rating` (a light slate) for ranks, scores and
// collections, `success` green for done / saved / matched, `danger` red for
// hard dares, poor scores and destructive actions. `isDark` lets the few
// theme-specific bits (status bar, blur tint) pick their side.
export const darkColors = {
  isDark: true,

  // The page under the header: a dark grey, not black.
  background: "#1A1B1E",

  // The header bars (and the tab bars pinned under them): near-black.
  headerBackground: "#0E0F11",

  card: "#222327",

  cardElevated: "#27292D",

  // Empty tiles and light fills — muted text still reads 4.5:1 on it.
  cardElevatedLight: "#2C2E33",

  textPrimary: "#FFFFFF",

  textSecondary: "#B4BEC8",

  textMuted: "#909EAC",

  accent: "#FFFFFF",
  accentLight: "#B4BEC8",

  accentContrast: "#0E0F11",

  success: "#4ED08A",

  // Ranks, scores, collections: a light slate, bluer than the greys.
  rating: "#9FB3C8",

  danger: "#FF8585",

  border: "#34363B",

  // Selected tabs and chips, and the main buttons: slate, white text.
  selected: "#667688",

  selectedText: "#FFFFFF",

  successSoft: "rgba(78, 208, 138, 0.16)",

  surfaceSoft: "rgba(255, 255, 255, 0.06)",

  // Every grey button (Sign in, skips, ⇄, the sheets' actions…): a
  // neutral grey a clear step above the page and the sheets alike, text
  // in textPrimary.
  buttonFill: "#3A3D43",

  // Round icon buttons (a movie's Watchlist / Tonight / Board / Trailer):
  // a quiet fill a step above the page.
  ringFill: "#222327",

  // Segmented tabs (For you / Friends, Browse / Reels / Trending…): a dark
  // track, the open one a slate pill with white text.
  segmentTrack: "#1A1B1E",
  segmentOn: "#667688",
  segmentOnText: "#FFFFFF",
  // The tabs not open: the same grey as textMuted.
  segmentText: "#909EAC",

  // Every poster's thin frame.
  posterEdge: "#2A2C31",
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

  // The greys share dark mode's slate tone.
  textSecondary: "#46505C",

  textMuted: "#5F6B78",

  accent: "#111214",
  accentLight: "#46505C",

  accentContrast: "#FFFFFF",

  success: "#1F9D55",

  rating: "#4E5D6E",

  danger: "#D64545",

  border: "#DCDDE0",

  selected: "#111214",

  selectedText: "#FFFFFF",

  successSoft: "rgba(31, 157, 85, 0.12)",

  surfaceSoft: "rgba(0, 0, 0, 0.05)",

  buttonFill: "#E8E9EC",

  ringFill: "#F7F7F8",

  segmentTrack: "#EDEEF0",
  segmentOn: "#667688",
  segmentOnText: "#FFFFFF",
  // The tabs not open: the same grey as textMuted.
  segmentText: "#5F6B78",

  posterEdge: "rgba(0, 0, 0, 0.1)",
};

// Static default for code that can't call `useColors()`.
export const colors = darkColors;

export default colors;
