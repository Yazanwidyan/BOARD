import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  Activity as ActivityIcon,
  Bookmark,
  Compass,
  Dices,
  Settings as SettingsIcon,
} from "lucide-react-native";
import { Fragment } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ActivityScreen } from "../screens/ActivityScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LibraryScreen } from "../screens/LibraryScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { useThemeStore } from "../store/themeStore";
import { TAB_BAR_BOTTOM_OFFSET, radius, spacing } from "../theme/spacing";
import { useColors } from "../theme/useColors";

const CENTER_BADGE_SIZE = 48;
const CENTER_BADGE_LIFT = 18;
const CENTER_BADGE_OUTER_PADDING = 7;

const Tab = createBottomTabNavigator();

const ICONS = {
  Discover: Compass,
  Library: Bookmark,
  Activity: ActivityIcon,
  Settings: SettingsIcon,
};

const FloatingTabBar = ({ state, navigation, onPickTenPress }) => {
  const colors = useColors();
  const mode = useThemeStore((themeState) => themeState.mode);
  const styles = createStyles(colors, mode);

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const IconComponent = ICONS[route.name];
          const tintColor = isFocused ? colors.textPrimary : colors.textMuted;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Fragment key={route.key}>
              {index === 2 && (
                <View style={styles.centerBadgeOuter}>
                  <Pressable
                    onPress={onPickTenPress}
                    style={styles.centerBadge}
                  >
                    <Dices
                      size={21}
                      color={colors.background}
                      strokeWidth={2.2}
                    />
                  </Pressable>
                </View>
              )}
              <Pressable onPress={onPress} style={styles.item}>
                <IconComponent size={20} color={tintColor} strokeWidth={2.2} />
              </Pressable>
            </Fragment>
          );
        })}
      </View>
    </View>
  );
};

export const TabNavigator = ({ navigation }) => {
  const handlePickTen = () => {
    navigation.navigate("Preferences");
  };

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, animation: "shift" }}
      tabBar={(props) => (
        <FloatingTabBar {...props} onPickTenPress={handlePickTen} />
      )}
    >
      <Tab.Screen name="Discover" component={HomeScreen} />
      <Tab.Screen name="Library" component={LibraryScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const createStyles = (colors, mode) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: TAB_BAR_BOTTOM_OFFSET,
      alignItems: "center",
    },
    bar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      backgroundColor: mode === "dark" ? "#000000" : "#FFFFFF",
      borderRadius: radius.md,
      paddingHorizontal: 26,
      paddingVertical: spacing.sm,
      // Not clipped — the center badge is meant to poke out above this box.
      overflow: "visible",
      // Explicit here (not the shared `shadows` preset, which is disabled
      // app-wide) since the floating bar needs to visually lift off the
      // screen behind it, unlike everything else.
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    item: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    // Same fill as the bar itself, sized a bit larger than the badge it
    // wraps, so the badge reads as poking through a cutout in the bar
    // rather than just floating above a hard edge. Pulled up via negative
    // margin so it pokes above the bar's own top edge.
    centerBadgeOuter: {
      width: CENTER_BADGE_SIZE + CENTER_BADGE_OUTER_PADDING * 2,
      height: CENTER_BADGE_SIZE + CENTER_BADGE_OUTER_PADDING * 2,
      borderRadius: radius.xl + CENTER_BADGE_OUTER_PADDING,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: mode === "dark" ? "#000000" : "#FFFFFF",
      marginTop: -(CENTER_BADGE_LIFT + CENTER_BADGE_OUTER_PADDING),
    },
    centerBadge: {
      width: CENTER_BADGE_SIZE,
      height: CENTER_BADGE_SIZE,
      borderRadius: radius.xl,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.textPrimary,
    },
  });

export default TabNavigator;
