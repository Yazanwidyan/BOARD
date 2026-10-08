// Two neutral, Instagram-style palettes. Main actions use `accent` (white in
// dark mode, near-black in light mode) with `accentContrast` text; there's
// no coloured brand accent. `isDark` lets the few theme-specific bits (status
// bar, blur tint, glass tab bar) pick their side.
export const darkColors = {
  isDark: true,

  background: "#161719",

  card: "#202124",

  cardElevated: "#292B2F",

  cardElevatedLight: "#383B40",

  textPrimary: "#FFFFFF",

  textSecondary: "#C8C9CC",

  textMuted: "#92949A",

  accent: "#FFFFFF",
  accentLight: "#C8C9CC",

  accentContrast: "#161719",

  success: "#8BD39A",

  rating: "#F4CC63",

  danger: "#F08086",

  border: "#37393E",

  selected: "#FFFFFF",

  selectedText: "#161719",

  successSoft: "rgba(139, 211, 154, 0.14)",

  surfaceSoft: "rgba(255, 255, 255, 0.08)",
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

  success: "#2E9E57",

  rating: "#D49A0E",

  danger: "#E0414F",

  border: "#DCDDE0",

  selected: "#111214",

  selectedText: "#FFFFFF",

  successSoft: "rgba(46, 158, 87, 0.12)",

  surfaceSoft: "rgba(0, 0, 0, 0.05)",
};

// Static default for code that can't call `useColors()`.
export const colors = darkColors;

export default colors;
