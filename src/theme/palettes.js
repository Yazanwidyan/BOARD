const PHOTO_SCRIM = {
  overlay: "rgba(2, 0, 2, 0.75)",
  scrim: "rgba(2, 0, 2, 0.6)",
};

export const colors = {
  background: "#252746",
  card: "#333661",
  // Between background and card — it used to equal background exactly,
  // which made anything "elevated" invisible against the page.
  cardElevated: "#2C2E54",
  cardElevatedLight: "#4A4D84",
  textPrimary: "#FFFFFF",
  // Nudged up so it reads as a distinct step between primary and muted.
  textSecondary: "#C9CBE0",
  // A real third text level (it used to equal textSecondary). Still clears
  // WCAG AA for small text (≥4.6:1) on background, cardElevated and card.
  textMuted: "#A0A3C2",
  accent: "#8D60E2",
  accentLight: "#D6BBFF",
  accentContrast: "#FFFFFF",
  success: "#A4E59B",
  rating: "#F8E08E",
  danger: "#F6A0AC",
  border: "#414374",
  // One rule for "this is selected" on every chip, segment and filter:
  // white fill, dark text. Purple (accent) stays reserved for actions.
  selected: "#FFFFFF",
  selectedText: "#252746",
  ...PHOTO_SCRIM,
  successSoft: "rgba(164, 229, 155, 0.14)",
  surfaceSoft: "rgba(255, 255, 255, 0.08)",
};

export default colors;
