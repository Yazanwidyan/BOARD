import * as Haptics from "expo-haptics";
import { CirclePlus, User } from "lucide-react-native";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  CompassIcon,
  CompassOutlineIcon,
  LibraryIcon,
  LibraryOutlineIcon,
  ReelBoardIcon,
} from "../../components/icons/TabIcons";
import { t } from "../../i18n";
import { useProfileStore } from "../../store/profileStore";
import { useColors } from "../../theme/useColors";

// The pill: each tab a wide, low slot; the open one's icon on a grey
// capsule.
// The capsule sits close to the pill's edge — about 6pt in.
const BAR_PADDING = 4;
const SLOT_WIDTH = 66;
const SLOT_HEIGHT = 50;
const ACTIVE_WIDTH = 60;
const ACTIVE_HEIGHT = 46;
const ICON = 25;
// It floats a touch into the home-indicator area, clear of the bottom
// edge.
const BOTTOM_TRIM = 6;
const BOTTOM_MIN = 16;

// The Profile tab: your photo if you've set one (ringed in white when it's
// the open tab), else the person outline.
const ProfileTabIcon = ({ size, color, open }) => {
  const avatarUri = useProfileStore((state) => state.avatarUri);
  if (!avatarUri) return <User size={size} color={color} strokeWidth={1.8} />;
  const ring = size + 4;
  return (
    <View
      style={{
        width: ring,
        height: ring,
        borderRadius: ring / 2,
        borderWidth: 1.5,
        borderColor: open ? color : "transparent",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Image
        source={{ uri: avatarUri }}
        style={{ width: size - 2, height: size - 2, borderRadius: (size - 2) / 2 }}
      />
    </View>
  );
};

// Each tab's icon — its outline, and (where it has one) its filled
// version for when it's open — and its name (for screen readers; nothing
// is written under the icons). The ＋ (Log) is an action, not a place:
// never open.
const TABS = {
  Home: {
    label: "Home",
    // The ReelBoard reel: one mark, the same open or not.
    Icon: ReelBoardIcon,
  },
  Discover: { label: "Discover", Icon: CompassOutlineIcon, ActiveIcon: CompassIcon },
  Log: {
    label: "Add",
    action: true,
    Icon: ({ size, color }) => <CirclePlus size={size} color={color} strokeWidth={1.8} />,
  },
  Library: { label: "Library", Icon: LibraryOutlineIcon, ActiveIcon: LibraryIcon },
  Profile: { label: "Profile", Icon: ProfileTabIcon },
};

// The app's bottom tabs: a dark pill floating over the page, centred and
// only as wide as its icons. Icons only, all white — the open tab's on a
// grey capsule — and the ＋ in the middle.
export const BottomTabBar = ({ state, navigation }) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);
  const bottom = Math.max(BOTTOM_MIN, insets.bottom - BOTTOM_TRIM);

  const select = (route, index) => {
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (index !== state.index && !event.defaultPrevented) navigation.navigate(route.name);
    Haptics.selectionAsync();
  };

  return (
    <View style={[styles.dock, { bottom }]} pointerEvents="box-none">
      <View style={styles.bar}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const open = state.index === index && !tab.action;
        // White, all of them; the open one on its grey capsule.
        const color = colors.textPrimary;
        const Icon = open && tab.ActiveIcon ? tab.ActiveIcon : tab.Icon;
        return (
          <Pressable
            key={route.key}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            onPress={() => select(route, index)}
            accessibilityRole="button"
            accessibilityLabel={t(tab.label)}
            accessibilityState={{ selected: open }}
          >
            <View style={[styles.iconWrap, open && styles.iconWrapOn]}>
              <Icon size={ICON} color={color} open={open} />
            </View>
          </Pressable>
        );
      })}
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // Spans the width only to centre the pill; touches pass through.
    dock: {
      position: "absolute",
      start: 0,
      end: 0,
      alignItems: "center",
    },
    // The pill: near-black like the header, a faint edge, a soft shadow.
    bar: {
      flexDirection: "row",
      alignItems: "center",
      padding: BAR_PADDING,
      backgroundColor: colors.headerBackground,
      borderRadius: (SLOT_HEIGHT + BAR_PADDING * 2) / 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
      shadowColor: "#000",
      shadowOpacity: colors.isDark ? 0.5 : 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      // Above the page's cards on Android.
      elevation: 14,
    },
    item: {
      width: SLOT_WIDTH,
      height: SLOT_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: {
      opacity: 0.7,
    },
    iconWrap: {
      width: ACTIVE_WIDTH,
      height: ACTIVE_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: ACTIVE_HEIGHT / 2,
    },
    // The open tab: a grey capsule behind its icon, a few steps lighter
    // than the pill.
    iconWrapOn: {
      backgroundColor: colors.cardElevatedLight,
    },
  });

export default BottomTabBar;
