import { CirclePlus } from "lucide-react-native";

import {
  ReelBoardIcon,
  CircleUserFilledIcon,
  CircleUserOutlineIcon,
  CompassIcon,
  CompassOutlineIcon,
  LibraryIcon,
  LibraryOutlineIcon,
} from "../../components/icons/TabIcons";

// Tab icons and labels, used by GlassTabBar.
// Home's ReelBoard logo is a single brand mark, always solid — no
// outline/active split. The other tabs' icons are a thin outline when
// inactive and switch to a solid fill when active.
// The ＋ (Log) is an action, not a place — never "active", so one icon.
const LogIcon = ({ size, color }) => <CirclePlus size={size} color={color} strokeWidth={1.8} />;

export const ICONS = {
  Home: ReelBoardIcon,
  Log: LogIcon,
};
export const OUTLINE_ICONS = {
  Discover: CompassOutlineIcon,
  Library: LibraryOutlineIcon,
  Profile: CircleUserOutlineIcon,
};
export const SOLID_ICONS = {
  Discover: CompassIcon,
  Library: LibraryIcon,
  Profile: CircleUserFilledIcon,
};
export const LABELS = {
  Home: "Home",
  Discover: "Discover",
  Log: "Log",
  Library: "Library",
  Profile: "Profile",
};
export const ICON_SIZES = {
  // The ReelBoard logo is a full ring, so it reads bigger than the others
  // at the same size.
  Home: 22.5,
  Discover: 23.5,
  Library: 25,
  Log: 26,
};
export const DEFAULT_ICON_SIZE = 24;

export const getTabIcon = (routeName, isFocused) =>
  ICONS[routeName] ??
  (isFocused ? SOLID_ICONS[routeName] : OUTLINE_ICONS[routeName]);
