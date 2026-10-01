export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
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

// The bottom tab bar is a plain, flush full-width row (its own safe-area
// padding is added inside the bar itself) — screens just need enough
// scroll clearance to clear its content height so the last item isn't
// hidden behind it.
export const TAB_BAR_HEIGHT = 52;
export const TAB_BAR_BOTTOM_OFFSET = 0;
export const TAB_BAR_CLEARANCE = TAB_BAR_BOTTOM_OFFSET + TAB_BAR_HEIGHT;

export default spacing;
