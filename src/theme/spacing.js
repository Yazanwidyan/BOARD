export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 16,
  xl: 28,
  xxl: 32,
  // Between the cards of every sideways row (Top picks, Recently watched,
  // collections, Discover's rails…).
  rail: 12,
  // Above each section of a page (Home, Discover, Library, Profile).
  section: 32,
  // Between a tab's header and the page's first content.
  underHeader: 20,
};

// The app's corners, on iOS's scale — the bigger the surface, the rounder:
// posters and all artwork (collection and list covers, Top picks) 8,
// tabs 8, controls (buttons, inputs) 10, cards and
// grouped rows 14, sheets' tops 20, round pills and tags fully round.
// Something inside a card or a control takes the outer corner less its
// inset (e.g. `shape.control - 4`), so the two curves run parallel.
export const shape = {
  card: 14,
  control: 10,
  tab: 8,
  chip: 999,
  poster: 8,
  sheet: 20,
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
// (navigation/tabBars/BottomTabBar: a 60pt pill, at least 16pt up.)
export const TAB_BAR_HEIGHT = 88;
export const TAB_BAR_BOTTOM_OFFSET = 0;
export const TAB_BAR_CLEARANCE = TAB_BAR_BOTTOM_OFFSET + TAB_BAR_HEIGHT;

export default spacing;
