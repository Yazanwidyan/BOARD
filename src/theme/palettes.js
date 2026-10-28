// Two palettes. Dark ("warm charcoal"): greys with a faint warm brown, like a
// dim cinema — a charcoal page
// under darker bars, cards a step lighter and panels #38342F; grey buttons
// #57524B with white text; the selected state (the open tab, a picked chip)
// and the main buttons white. Text is white, then #B8B2AA and #A39D95 (also
// the tabs not open), each 4.5 : 1 on the cards. Light mode is plain
// neutral greys on white. Colour only carries meaning: green (`success`) for
// done / saved / matched, `danger` red for hard dares, poor scores and
// destructive actions. Some features have their own: gold for ranks and
// scores (`rating`), orange for dares, violet for collections.
// `isDark` lets the few theme-specific bits (status bar, blur tint) pick
// their side.
export const darkColors = {
  isDark: true,

  // The page under the header: a warm charcoal.
  background: "#1C1A18",

  // The header bars (and the tab bars pinned under them): a shade darker.
  headerBackground: "#151311",

  card: "#262320",

  cardElevated: "#2D2A26",

  // Empty tiles and light fills — muted text still reads 4.5:1 on it.
  cardElevatedLight: "#38342F",

  textPrimary: "#FFFFFF",

  textSecondary: "#B8B2AA",

  textMuted: "#A39D95",

  accent: "#FFFFFF",
  accentLight: "#B8B2AA",

  accentContrast: "#151311",

  success: "#00E054",

  // A colour per feature, used on its icons, chips and "on" states;
  // everything else stays grey.
  // Ranks, titles and scores: gold.
  rating: "#F2C94C",
  // Dares: orange.
  dare: "#FF8A3D",
  // Collections: violet.
  collection: "#A78BFA",

  danger: "#FF8585",

  border: "#38342F",

  // Grey fills that mark something chosen, white text.
  selected: "#57524B",

  selectedText: "#FFFFFF",

  successSoft: "rgba(0, 224, 84, 0.16)",

  surfaceSoft: "rgba(255, 255, 255, 0.06)",

  // Every grey button (Sign in, skips, ⇄, the sheets' actions…):
  // a mid grey, white text.
  buttonFill: "#57524B",

  // Round icon buttons (a movie's Watchlist / Tonight / Board / Trailer):
  // a quiet fill a step above the page.
  ringFill: "#262320",

  // Segmented tabs (For you / Friends, Browse / Reels…): a dark track, the
  // open one a white pill with dark text.
  segmentTrack: "#1C1A18",
  segmentOn: "#FFFFFF",
  segmentOnText: "#1C1A18",
  // The tabs not open: the same grey as textMuted.
  segmentText: "#A39D95",

  // Every poster's thin frame.
  posterEdge: "#38342F",
};

export const lightColors = {
  isDark: false,

  background: "#FFFFFF",

  headerBackground: "#FFFFFF",

  card: "#F2F2F2",

  // Sheets and popovers: white, lifted by their border.
  cardElevated: "#FFFFFF",

  cardElevatedLight: "#E6E6E6",

  textPrimary: "#111111",

  // Neutral greys, like dark mode's.
  textSecondary: "#555555",

  textMuted: "#666666",

  accent: "#111111",
  accentLight: "#555555",

  accentContrast: "#FFFFFF",

  success: "#00873A",

  rating: "#8A6A00",
  dare: "#C2410C",
  collection: "#6D28D9",

  danger: "#D64545",

  border: "#DDDDDD",

  selected: "#111111",

  selectedText: "#FFFFFF",

  successSoft: "rgba(31, 157, 85, 0.12)",

  surfaceSoft: "rgba(0, 0, 0, 0.05)",

  buttonFill: "#E8E8E8",

  ringFill: "#F7F7F7",

  segmentTrack: "#EDEDED",
  segmentOn: "#111111",
  segmentOnText: "#FFFFFF",
  // The tabs not open: the same grey as textMuted.
  segmentText: "#666666",

  posterEdge: "rgba(0, 0, 0, 0.1)",
};

// Static default for code that can't call `useColors()`.
export const colors = darkColors;

export default colors;
