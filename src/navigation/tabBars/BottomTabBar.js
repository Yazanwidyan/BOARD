import * as Haptics from "expo-haptics";
import { CirclePlus, House, User } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../../components/AppText";
import {
  CompassIcon,
  CompassOutlineIcon,
  LibraryIcon,
  LibraryOutlineIcon,
} from "../../components/icons/TabIcons";
import { t } from "../../i18n";
import { typography } from "../../theme/typography";
import { useColors } from "../../theme/useColors";

const BAR_HEIGHT = 60;
// The open tab: a vivid green.
const ACTIVE = "#1ED760";

// Each tab's icon — its outline, and (where it has one) its filled
// version for when it's open — and its name. The ＋ (Log) is an action,
// not a place: never open, no name, bigger.
const TABS = {
  Home: {
    label: "Home",
    Icon: ({ size, color }) => <House size={size} color={color} strokeWidth={1.8} />,
  },
  Discover: { label: "Discover", Icon: CompassOutlineIcon, ActiveIcon: CompassIcon },
  Log: {
    label: "Add",
    action: true,
    Icon: ({ size, color }) => <CirclePlus size={size} color={color} strokeWidth={1.5} />,
  },
  Library: { label: "Boards", Icon: LibraryOutlineIcon, ActiveIcon: LibraryIcon },
  Profile: {
    label: "Profile",
    Icon: ({ size, color }) => <User size={size} color={color} strokeWidth={1.8} />,
  },
};

// The app's bottom tabs: a dark bar docked along the bottom edge, square,
// with a hairline on top. Each tab is its icon over its name — grey, or
// green when it's the open one — and the ＋ is big and white in the middle.
export const BottomTabBar = ({ state, navigation }) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);
  const inactive = colors.isDark ? "rgba(255, 255, 255, 0.55)" : "rgba(0, 0, 0, 0.5)";

  const select = (route, index) => {
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (index !== state.index && !event.defaultPrevented) navigation.navigate(route.name);
    Haptics.selectionAsync();
  };

  return (
    <View style={[styles.bar, { height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const open = state.index === index && !tab.action;
        const color = tab.action ? colors.textPrimary : open ? ACTIVE : inactive;
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
            <Icon size={tab.action ? 34 : 22} color={color} />
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
      backgroundColor: colors.card,
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
