import * as Haptics from "expo-haptics";
import { CirclePlus, User } from "lucide-react-native";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../../components/AppText";
import {
  CompassIcon,
  CompassOutlineIcon,
  LibraryIcon,
  LibraryOutlineIcon,
  ReelBoardIcon,
} from "../../components/icons/TabIcons";
import { t } from "../../i18n";
import { useProfileStore } from "../../store/profileStore";
import { typography } from "../../theme/typography";
import { useColors } from "../../theme/useColors";

const BAR_HEIGHT = 60;
// Less room under the tabs than the full home-indicator area, but never
// touching the bottom edge.
const BOTTOM_TRIM = 12;
const BOTTOM_MIN = 6;

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
// version for when it's open — and its name. The ＋ (Log) is an action,
// not a place: never open, no name, bigger.
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
    Icon: ({ size, color }) => <CirclePlus size={size} color={color} strokeWidth={1.5} />,
  },
  Library: { label: "Library", Icon: LibraryOutlineIcon, ActiveIcon: LibraryIcon },
  Profile: { label: "Profile", Icon: ProfileTabIcon },
};

// The app's bottom tabs: a dark bar docked along the bottom edge, square,
// with a hairline on top. Each tab is its icon over its name — grey, or
// white when it's the open one — and the ＋ is big and white in the middle.
export const BottomTabBar = ({ state, navigation }) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);
  const bottomRoom = Math.max(BOTTOM_MIN, insets.bottom - BOTTOM_TRIM);

  const select = (route, index) => {
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (index !== state.index && !event.defaultPrevented) navigation.navigate(route.name);
    Haptics.selectionAsync();
  };

  return (
    <View
      style={[
        styles.bar,
        {
          height: BAR_HEIGHT + bottomRoom,
          paddingBottom: bottomRoom,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const open = state.index === index && !tab.action;
        // Like the tab tracks: the open one white, the rest the muted grey.
        const color = tab.action || open ? colors.textPrimary : colors.segmentText;
        const Icon = open && tab.ActiveIcon ? tab.ActiveIcon : tab.Icon;
        return (
          <Pressable
            key={route.key}
            style={styles.item}
            onPress={() => select(route, index)}
            accessibilityRole="button"
            accessibilityLabel={t(tab.label)}
            accessibilityState={{ selected: open }}
          >
            <Icon size={tab.action ? 34 : 22} color={color} open={open} />
            {!tab.action && (
              <Text style={[styles.label, { color }]} numberOfLines={1}>
                {tab.label}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    bar: {
      position: "absolute",
      start: 0,
      end: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      // Near-black like the header, so the page's grey sits between them.
      backgroundColor: colors.headerBackground,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
      // Above the page's cards on Android.
      elevation: 12,
    },
    item: {
      flex: 1,
      alignSelf: "stretch",
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
    },
    label: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 14,
    },
  });

export default BottomTabBar;
