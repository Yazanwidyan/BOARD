// Two palettes — "Silver Screen": no hue, so the posters and the tier
// colours are the only colour on screen. Dark: a neutral grey page
// (#18191B) under near-black bars, cards and sheets a step lighter; the
// selected state (the open tab, a picked chip) a white pill with near-black
// text; the main buttons white too. Text is white, then two neutral greys —
// textSecondary, and textMuted (also the tabs not open). Light mode mirrors
// it: a near-black pill with white text. Every grey reads at 4.5 : 1 or
// better on the page, cards, sheets and grey buttons. Colour carries meaning
// on top: `rating` (a light silver) for ranks, scores and collections,
// `success` green for done / saved / matched, `danger` red for hard dares,
// poor scores and destructive actions. `isDark` lets the few theme-specific
// bits (status bar, blur tint) pick their side.
export const darkColors = {
  isDark: true,

  // The page under the header: a dark neutral grey, not black.
  background: "#18191B",

  // The header bars (and the tab bars pinned under them): near-black.
  headerBackground: "#0B0B0C",

  card: "#202124",

  cardElevated: "#25262A",

  // Empty tiles and light fills — muted text still reads 4.5:1 on it.
  cardElevatedLight: "#2D2E32",

  textPrimary: "#FFFFFF",

  textSecondary: "#BDBFC4",

  textMuted: "#A1A4AA",

  accent: "#FFFFFF",
  accentLight: "#BDBFC4",

  accentContrast: "#0B0B0C",

  success: "#4ED08A",

  // Ranks, scores, collections: a light silver.
  rating: "#D6D8DC",

  danger: "#FF8585",

  border: "#2C2E32",

  // Selected tabs and chips: a white pill, near-black text.
  selected: "#E8E9EB",

  selectedText: "#111214",

  successSoft: "rgba(78, 208, 138, 0.16)",

  surfaceSoft: "rgba(255, 255, 255, 0.06)",

  // Every grey button (Sign in, skips, ⇄, the sheets' actions…): a
  // neutral grey a clear step above the page and the sheets alike, text
  // in textPrimary.
  buttonFill: "#36383C",

  // Round icon buttons (a movie's Watchlist / Tonight / Board / Trailer):
  // a quiet fill a step above the page.
  ringFill: "#202124",

  // Segmented tabs (For you / Friends, Browse / Reels…): a dark track, the
  // open one a white pill with near-black text.
  segmentTrack: "#18191B",
  segmentOn: "#E8E9EB",
  segmentOnText: "#111214",
  // The tabs not open: the same grey as textMuted.
  segmentText: "#A1A4AA",

  // Every poster's thin frame.
  posterEdge: "#2A2B2F",
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

  // The greys are neutral, like dark mode's.
  textSecondary: "#45474C",

  textMuted: "#5E6166",

  accent: "#111214",
  accentLight: "#45474C",

  accentContrast: "#FFFFFF",

  success: "#1F9D55",

  rating: "#3A3C41",

  danger: "#D64545",

  border: "#DCDDE0",

  selected: "#111214",

  selectedText: "#FFFFFF",

  successSoft: "rgba(31, 157, 85, 0.12)",

  surfaceSoft: "rgba(0, 0, 0, 0.05)",

  buttonFill: "#E8E9EC",

  ringFill: "#F7F7F8",

  segmentTrack: "#EDEEF0",
  segmentOn: "#111214",
  segmentOnText: "#FFFFFF",
  // The tabs not open: the same grey as textMuted.
  segmentText: "#5E6166",

  posterEdge: "rgba(0, 0, 0, 0.1)",
};

// Static default for code that can't call `useColors()`.
export const colors = darkColors;

export default colors;
