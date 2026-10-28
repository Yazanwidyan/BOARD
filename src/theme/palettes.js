// Two palettes, all neutral greys — no tint. Dark ("charcoal"): a charcoal page
// under darker bars, cards a step lighter and panels #363636; grey buttons
// #555555 with white text; the selected state (the open tab, a picked chip)
// and the main buttons white. Text is white, then #B3B3B3 and #A3A3A3 (also
// the tabs not open), each 4.5 : 1 on the cards. Light mode is the same
// greys turned over. Colour only carries meaning: green (`success`) for
// done / saved / matched, `danger` red for hard dares, poor scores and
// destructive actions. Some features have their own: gold for ranks and
// scores (`rating`), orange for dares, violet for collections.
// `isDark` lets the few theme-specific bits (status bar, blur tint) pick
// their side.
export const darkColors = {
  isDark: true,

  // The page under the header: charcoal.
  background: "#1C1C1C",

  // The header bars (and the tab bars pinned under them): a shade darker.
  headerBackground: "#161616",

  card: "#262626",

  cardElevated: "#2C2C2C",

  // Empty tiles and light fills — muted text still reads 4.5:1 on it.
  cardElevatedLight: "#363636",

  textPrimary: "#FFFFFF",

  textSecondary: "#B3B3B3",

  textMuted: "#A3A3A3",

  accent: "#FFFFFF",
  accentLight: "#B3B3B3",

  accentContrast: "#161616",

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

  border: "#363636",

  // Grey fills that mark something chosen, white text.
  selected: "#555555",

  selectedText: "#FFFFFF",

  successSoft: "rgba(0, 224, 84, 0.16)",

  surfaceSoft: "rgba(255, 255, 255, 0.06)",

  // Every grey button (Sign in, skips, ⇄, the sheets' actions…):
  // a mid grey, white text.
  buttonFill: "#555555",

  // Round icon buttons (a movie's Watchlist / Tonight / Board / Trailer):
  // a quiet fill a step above the page.
  ringFill: "#262626",

  // Segmented tabs (For you / Friends, Browse / Reels…): a dark track, the
  // open one a white pill with dark text.
  segmentTrack: "#1C1C1C",
  segmentOn: "#FFFFFF",
  segmentOnText: "#1C1C1C",
  // The tabs not open: the same grey as textMuted.
  segmentText: "#A3A3A3",

  // Every poster's thin frame.
  posterEdge: "#363636",
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
