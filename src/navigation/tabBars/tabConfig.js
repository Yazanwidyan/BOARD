import {
  BoardBIcon,
  CircleUserFilledIcon,
  CircleUserOutlineIcon,
  CompassIcon,
  CompassOutlineIcon,
  LibraryIcon,
  LibraryOutlineIcon,
  PlayScreenIcon,
  PlayScreenOutlineIcon,
} from "../../components/icons/TabIcons";

// Tab icons and labels, used by GlassTabBar.
// Home's "B" logomark is a single brand mark, always solid — no
// outline/active split. The other tabs' icons are a thin outline when
// inactive and switch to a solid fill when active.
export const ICONS = {
  Home: BoardBIcon,
};
export const OUTLINE_ICONS = {
  Discover: CompassOutlineIcon,
  Decide: PlayScreenOutlineIcon,
  Library: LibraryOutlineIcon,
  Profile: CircleUserOutlineIcon,
};
export const SOLID_ICONS = {
  Discover: CompassIcon,
  Decide: PlayScreenIcon,
  Library: LibraryIcon,
  Profile: CircleUserFilledIcon,
};
export const LABELS = {
  Home: "Home",
  Discover: "Discover",
  Decide: "Decide",
  Library: "Library",
  Profile: "Profile",
};
export const ICON_SIZES = {
  Discover: 23.5,
  Library: 25,
};
export const DEFAULT_ICON_SIZE = 24;

export const getTabIcon = (routeName, isFocused) =>
  ICONS[routeName] ??
  (isFocused ? SOLID_ICONS[routeName] : OUTLINE_ICONS[routeName]);
