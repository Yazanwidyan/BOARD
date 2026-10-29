// Two palettes, Apple Music's (iOS's own system colours). Dark: a true
// black page and bars, cards in iOS's grouped greys (#1C1C1E, then #2C2C2E
// and #3A3A3C), hairlines #38383A. Text is white, then iOS's secondary and
// tertiary greys. Its red (#FA2D48) is the signature — the main buttons, an
// action that's on, and the text of the grey buttons (as on a playlist's
// Play / Shuffle). The others carry meaning: green (`success`) — done,
// matched; yellow (`rating`) — stars, ranks and scores; orange (`dare`) —
// dares; blue (`collection`) — collections. `danger` for hard dares, poor
// scores and destructive actions. Light mode: the same, on white.
// `isDark` lets the few theme-specific bits (status bar, blur tint) pick
// their side.
export const darkColors = {
  isDark: true,

  // The page: black, as in Apple Music.
  background: "#000000",

  // The header bars (and the tab bars pinned under them): the same black.
  headerBackground: "#000000",

  // Cards: iOS's grouped grey; raised ones (sheets, popovers) a step up.
  card: "#1C1C1E",

  cardElevated: "#2C2C2E",

  // Empty tiles and light fills.
  cardElevatedLight: "#3A3A3C",

  textPrimary: "#FFFFFF",

  textSecondary: "#AEAEB2",

  textMuted: "#8E8E93",

  accent: "#FFFFFF",
  accentLight: "#AEAEB2",

  accentContrast: "#000000",

  // The signature: Apple Music red — main buttons, an action that's on —
  // with white text on it.
  brand: "#FA2D48",
  brandText: "#FFFFFF",

  // Done and matched: iOS green.
  success: "#30D158",

  // A colour per feature, used on its icons, chips and "on" states;
  // everything else stays grey.
  // Stars, ranks and scores: iOS yellow.
  rating: "#FFD60A",
  // Dares: iOS orange.
  dare: "#FF9F0A",
  // Collections: iOS blue.
  collection: "#64D2FF",

  danger: "#FF453A",

  border: "#38383A",

  // Grey fills that mark something chosen, white text.
  selected: "#3A3A3C",

  selectedText: "#FFFFFF",

  successSoft: "rgba(48, 209, 88, 0.16)",

  surfaceSoft: "rgba(255, 255, 255, 0.06)",

  // Every grey button (Sign in, skips, ⇄, the sheets' actions…): iOS's
  // raised grey, so it shows on a card as well as on the page.
  buttonFill: "#2C2C2E",

  // Round icon buttons (a movie's Watchlist / Tonight / Board / Trailer):
  // a quiet fill a step above the page.
  ringFill: "#1C1C1E",

  // Segmented tabs (Browse / Reels…): iOS's segmented control — a grey
  // track, the open one a lighter pill with white text.
  segmentTrack: "#1C1C1E",
  segmentOn: "#636366",
  segmentOnText: "#FFFFFF",
  // The tabs not open: the same grey as textMuted.
  segmentText: "#8E8E93",

  // Every poster's thin frame.
  posterEdge: "rgba(255, 255, 255, 0.08)",
};

export const lightColors = {
  isDark: false,

  background: "#FFFFFF",

  headerBackground: "#FFFFFF",

  card: "#F2F2F7",

  // Sheets and popovers: white, lifted by their border.
  cardElevated: "#FFFFFF",

  cardElevatedLight: "#E5E5EA",

  textPrimary: "#000000",

  // iOS's greys, a touch deeper so they read on white.
  textSecondary: "#6C6C70",

  textMuted: "#6E6E73",

  accent: "#000000",
  accentLight: "#6C6C70",

  accentContrast: "#FFFFFF",

  brand: "#FA2D48",
  brandText: "#FFFFFF",

  success: "#248A3D",

  rating: "#B25000",
  dare: "#C93400",
  collection: "#0071E3",

  danger: "#D70015",

  border: "#D1D1D6",

  selected: "#000000",

  selectedText: "#FFFFFF",

  successSoft: "rgba(36, 138, 61, 0.12)",

  surfaceSoft: "rgba(0, 0, 0, 0.05)",

  buttonFill: "#F2F2F7",

  ringFill: "#F2F2F7",

  segmentTrack: "#EEEEF0",
  segmentOn: "#FFFFFF",
  segmentOnText: "#000000",
  // The tabs not open: the same grey as textMuted.
  segmentText: "#6E6E73",

  posterEdge: "rgba(0, 0, 0, 0.1)",
};

// Static default for code that can't call `useColors()`.
export const colors = darkColors;

export default colors;
