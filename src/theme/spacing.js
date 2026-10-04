export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 28,
  xl: 32,
  xxl: 48,
};

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
