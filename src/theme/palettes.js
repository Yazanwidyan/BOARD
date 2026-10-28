// Two palettes, Letterboxd's. Dark: its blue-grey page (#14181C) under
// darker bars, cards a step lighter and panels #2C3440; its slate buttons
// (#445566) with white text — the open tab too. Text is white, then #99AABB
// and #8899AA (also the tabs not open). Its three colours carry meaning:
// green (`brand`, `success`) — the main buttons, done, matched; blue
// (`rating`, `collection`) — ranks, scores and collections; orange (`dare`)
// — dares. `danger` red for hard dares, poor scores and destructive
// actions. Light mode borrows the same, deeper.
// `isDark` lets the few theme-specific bits (status bar, blur tint) pick
// their side.
export const darkColors = {
  isDark: true,

  // The page under the header: Letterboxd's blue-grey.
  background: "#171c20",

  // The header bars (and the tab bars pinned under them): near-black.
  headerBackground: "#0d0f13",

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

  // The signature: Letterboxd green — main buttons, an action that's on —
  // with dark text on it.
  brand: "#00E054",
  brandText: "#14181C",

  // Done and matched: green.
  success: "#00E054",

  // A colour per feature, used on its icons, chips and "on" states;
  // everything else stays grey.
  // Ranks, titles and scores: Letterboxd blue.
  rating: "#40BCF4",
  // Dares: Letterboxd orange.
  dare: "#FF8000",
  // Collections: blue, like ranks.
  collection: "#40BCF4",

  danger: "#FF8585",

  border: "#2C3440",

  // Grey fills that mark something chosen, white text.
  selected: "#445566",

  selectedText: "#FFFFFF",

  successSoft: "rgba(0, 224, 84, 0.16)",

  surfaceSoft: "rgba(255, 255, 255, 0.06)",

  // Every grey button (Sign in, skips, ⇄, the sheets' actions…):
  // Letterboxd's slate, white text.
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

  brand: "#00873A",
  brandText: "#FFFFFF",

  success: "#00873A",

  rating: "#17729E",
  dare: "#C25E00",
  collection: "#17729E",

  danger: "#D64545",

  border: "#DDDDDD",

  selected: "#111111",

  selectedText: "#FFFFFF",

  successSoft: "rgba(0, 135, 58, 0.12)",

  surfaceSoft: "rgba(0, 0, 0, 0.05)",

  buttonFill: "#E8E8E8",

  ringFill: "#F7F7F7",

  segmentTrack: "#EDEDED",
  segmentOn: "#445566",
  segmentOnText: "#FFFFFF",
  // The tabs not open: the same grey as textMuted.
  segmentText: "#666666",

  posterEdge: "rgba(0, 0, 0, 0.1)",
};

// Static default for code that can't call `useColors()`.
export const colors = darkColors;

export default colors;
