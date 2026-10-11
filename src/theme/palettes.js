// Two Instagram-style palettes — dark is a cool blue-black (#0C1014) with
// greys tinted to match, light is neutral. Main actions use `accent` (white in
// dark mode, near-black in light mode) with `accentContrast` text; there's
// no coloured brand accent. `isDark` lets the few theme-specific bits (status
// bar, blur tint, glass tab bar) pick their side.
export const darkColors = {
  isDark: true,

  background: "#0C1014",

  card: "#161B21",

  cardElevated: "#1D232A",

  cardElevatedLight: "#2B323A",

  textPrimary: "#FFFFFF",

  textSecondary: "#C2C8CF",

  textMuted: "#89919B",

  accent: "#FFFFFF",
  accentLight: "#C2C8CF",

  accentContrast: "#0C1014",

  success: "#8BD39A",

  rating: "#F4CC63",

  danger: "#F08086",

  border: "#262D35",

  selected: "#FFFFFF",

  selectedText: "#0C1014",

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
