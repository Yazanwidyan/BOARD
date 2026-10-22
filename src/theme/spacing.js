export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 28,
  xl: 32,
  xxl: 48,
};

// The app's corners: cards and grouped rows, controls (buttons, inputs),
// tabs and filter chips (the Library tab's pill), round pills and tags,
// posters, and sheets' tops.
export const shape = { card: 10, control: 8, tab: 7, chip: 999, poster: 4, sheet: 14 };

export const radius = {
  xs: 6,
  sm: 11,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
};

// The bottom tab bar is a floating, elevated pill inset from the screen
// edges, sitting a small gap above the safe area (screens add insets.bottom
// to this separately) — clearance needs to cover that gap plus the pill's
// own content height so the last scrollable item isn't hidden behind it.
export const TAB_BAR_HEIGHT = 70;
export const TAB_BAR_BOTTOM_OFFSET = 0;
export const TAB_BAR_CLEARANCE = TAB_BAR_BOTTOM_OFFSET + TAB_BAR_HEIGHT;

export default spacing;
