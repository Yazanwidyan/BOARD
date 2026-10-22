// Two palettes — dark is a near-black blue (#04080B) with a pale
// blue-white for main actions and selected states; its cards, sheets,
// borders and greys are lighter steps of the same cool hue. Light is
// neutral. Main actions are white / black;
// colour carries meaning: `rating` gold for XP, levels and scores,
// `success` green for done / saved / matched, `danger` red for hard dares,
// poor scores and destructive actions. Main actions use `accent` (white in
// dark mode, near-black in light mode) with `accentContrast` text; there's
// no coloured brand accent. `isDark` lets the few theme-specific bits (status
// bar, blur tint, glass tab bar) pick their side.
export const darkColors = {
  isDark: true,

  background: "#040E12",

  card: "#0d161b",

  cardElevated: "#142028",

  cardElevatedLight: "#1E2C34",

  textPrimary: "#FFFFFF",

  textSecondary: "#B9C6CF",

  // At least 4.5:1 on every surface, light fills included.
  textMuted: "#8A99A3",

  accent: "#FFFFFF",
  accentLight: "#B9C6CF",

  accentContrast: "#04080B",

  success: "#4ED08A",

  rating: "#F2C14E",

  danger: "#FF8585",

  border: "#1C2B33",

  // Selected tabs and chips, and the main buttons: a pale blue-white.
  selected: "#edf4fa",

  selectedText: "#04080B",

  successSoft: "rgba(78, 208, 138, 0.16)",

  surfaceSoft: "rgba(255, 255, 255, 0.06)",

  // Small square icon buttons (shuffle, trailer): a raised tile with a
  // lighter edge.
  buttonFill: "#19252F",
  buttonEdge: "#2C3F4E",

  // Round icon buttons (a movie's Watchlist / Tonight / Board / Trailer):
  // a quiet fill a step above the page, a faint ring.
  ringFill: "#111C23",
  ringEdge: "#1E2C35",
};

export const lightColors = {
  isDark: false,

  background: "#FFFFFF",

  card: "#F2F2F3",

  // Sheets and popovers: white, lifted by their border.
  cardElevated: "#FFFFFF",

  cardElevatedLight: "#E6E7E9",

  textPrimary: "#111214",

  textSecondary: "#4A4C52",

  textMuted: "#8A8C92",

  accent: "#111214",
  accentLight: "#4A4C52",

  accentContrast: "#FFFFFF",

  success: "#1F9D55",

  rating: "#C99400",

  danger: "#D64545",

  border: "#DCDDE0",

  selected: "#111214",

  selectedText: "#FFFFFF",

  successSoft: "rgba(31, 157, 85, 0.12)",

  surfaceSoft: "rgba(0, 0, 0, 0.05)",

  buttonFill: "#F2F2F3",
  buttonEdge: "#D6D8DC",

  ringFill: "#F7F7F8",
  ringEdge: "#DCDDE0",
};

// Static default for code that can't call `useColors()`.
export const colors = darkColors;

export default colors;
