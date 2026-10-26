// Two palettes — "Midnight Teal". Dark: a blue-black page (#151D21) under
// near-black bars, cards and sheets a step lighter; #23807A teal for
// selected states (the open tab, a picked chip); the main buttons the
// page's contrast colour (white). Text is white, then two blue-grey greys —
// textSecondary, and textMuted (also the tabs not open) — and light mode
// uses the same tone, every grey readable at 4.5 : 1 or better on the page,
// cards and sheets. Colour carries meaning on top: `rating` (a light teal)
// for ranks, scores and collections, `success` green for done / saved / matched, `danger` red for
// hard dares, poor scores and destructive actions. `isDark` lets the few
// theme-specific bits (status bar, blur tint) pick their side.
export const darkColors = {
  isDark: true,

  // The page under the header: a blue-black, not black.
  background: "#151D21",

  // The header bars (and the tab bars pinned under them): near-black.
  headerBackground: "#080B0D",

  card: "#1B2429",

  cardElevated: "#202A30",

  // Empty tiles and light fills — muted text still reads 4.5:1 on it.
  cardElevatedLight: "#28343B",

  textPrimary: "#FFFFFF",

  textSecondary: "#B3C5CB",

  textMuted: "#97A9AF",

  accent: "#FFFFFF",
  accentLight: "#B3C5CB",

  accentContrast: "#080B0D",

  success: "#4ED08A",

  // Ranks, scores, collections: a light teal.
  rating: "#6FD1C7",

  danger: "#FF8585",

  border: "#2A363C",

  // Selected tabs and chips: teal, white text.
  selected: "#23807A",

  selectedText: "#FFFFFF",

  successSoft: "rgba(78, 208, 138, 0.16)",

  surfaceSoft: "rgba(255, 255, 255, 0.06)",

  // Every grey button (Sign in, skips, ⇄, the sheets' actions…): a
  // neutral grey a clear step above the page and the sheets alike, text
  // in textPrimary.
  buttonFill: "#2F3C43",

  // Round icon buttons (a movie's Watchlist / Tonight / Board / Trailer):
  // a quiet fill a step above the page.
  ringFill: "#1B2429",

  // Segmented tabs (For you / Friends, Browse / Reels…): a dark track, the
  // open one a teal pill with white text.
  segmentTrack: "#151D21",
  segmentOn: "#23807A",
  segmentOnText: "#FFFFFF",
  // The tabs not open: the same grey as textMuted.
  segmentText: "#97A9AF",

  // Every poster's thin frame.
  posterEdge: "#253036",
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

  // The greys share dark mode's blue-grey tone.
  textSecondary: "#3F5257",

  textMuted: "#566A70",

  accent: "#111214",
  accentLight: "#3F5257",

  accentContrast: "#FFFFFF",

  success: "#1F9D55",

  rating: "#1F6F6A",

  danger: "#D64545",

  border: "#DCDDE0",

  selected: "#111214",

  selectedText: "#FFFFFF",

  successSoft: "rgba(31, 157, 85, 0.12)",

  surfaceSoft: "rgba(0, 0, 0, 0.05)",

  buttonFill: "#E8E9EC",

  ringFill: "#F7F7F8",

  segmentTrack: "#EDEEF0",
  segmentOn: "#1F7873",
  segmentOnText: "#FFFFFF",
  // The tabs not open: the same grey as textMuted.
  segmentText: "#566A70",

  posterEdge: "rgba(0, 0, 0, 0.1)",
};

// Static default for code that can't call `useColors()`.
export const colors = darkColors;

export default colors;
