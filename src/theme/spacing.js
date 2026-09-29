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

// The bottom tab bar floats above content (position: absolute) and is now
// translucent, so screens only need enough clearance to keep buttons out of
// its touch zone — the last bit of scrollable content is meant to peek up
// behind the bar and show through it, not stop short of it entirely.
export const TAB_BAR_HEIGHT = 74;
export const TAB_BAR_BOTTOM_OFFSET = 27;
export const TAB_BAR_CLEARANCE = TAB_BAR_BOTTOM_OFFSET + TAB_BAR_HEIGHT;

export default spacing;
