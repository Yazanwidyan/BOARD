import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import {
  CompassIcon,
  LayersIcon,
  LibraryIcon,
  SearchAltIcon,
  ShuffleIcon,
  UserIcon,
} from "../components/icons/TabIcons";
import { CollectionsScreen } from "../screens/CollectionsScreen";
import { DecideScreen } from "../screens/DecideScreen";
import { ExploreScreen } from "../screens/ExploreScreen";
import { LibraryScreen } from "../screens/LibraryScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { TAB_BAR_BOTTOM_OFFSET, radius, spacing } from "../theme/spacing";
import { useColors } from "../theme/useColors";

// Side margin the floating row keeps from the screen edges.
const TAB_BAR_MARGIN = spacing.md;
const SEARCH_BUTTON_SIZE = 52;

const Tab = createBottomTabNavigator();

const ICONS = {
  Explore: CompassIcon,
  Decide: ShuffleIcon,
  Collections: LayersIcon,
  Library: LibraryIcon,
  Profile: UserIcon,
};

const TabBarItem = ({ isFocused, IconComponent, styles, onPress }) => {
  const progress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(isFocused ? 1 : 0, {
      damping: 16,
      stiffness: 220,
    });
  }, [isFocused, progress]);

  const contentStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ["rgba(0, 0, 0, 0)", "#000000"],
    ),
    transform: [{ scale: 1 + progress.value * 0.06 }],
  }));

  return (
    <Pressable style={styles.item} onPress={onPress}>
      <Animated.View style={[styles.itemContent, contentStyle]}>
        <IconComponent size={20} color={isFocused ? "#FFFFFF" : "#000000"} />
      </Animated.View>
    </Pressable>
  );
};

const FloatingTabBar = ({ state, navigation, onSearchPress }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  const handleSearchPress = () => {
    Haptics.selectionAsync();
    onSearchPress();
  };

  const selectIndex = (index) => {
    const route = state.routes[index];
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (index !== state.index && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
    Haptics.selectionAsync();
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.row}>
        <View style={styles.barShadowWrap}>
          <View style={styles.bar}>
            {state.routes.map((route, index) => {
              const isFocused = state.index === index;
              const IconComponent = ICONS[route.name];

              return (
                <TabBarItem
                  key={route.key}
                  isFocused={isFocused}
                  IconComponent={IconComponent}
                  styles={styles}
                  onPress={() => selectIndex(index)}
                />
              );
            })}
          </View>
        </View>

        <Pressable onPress={handleSearchPress} style={styles.searchButtonWrap}>
          <View style={styles.searchButton}>
            <SearchAltIcon size={20} color="#000000" />
          </View>
        </Pressable>
      </View>
    </View>
  );
};

export const TabNavigator = ({ navigation }) => (
  <Tab.Navigator
    // "fade" instead of "shift" — with drag-through selection, a fast swipe
    // fires navigate() for every tab it crosses, and "shift"'s sliding
    // transition per intermediate stop is what read as flicker. "fade" is
    // the only other built-in option besides "none" for @react-navigation/
    // bottom-tabs, so it's this or no animation at all.
    screenOptions={{ headerShown: false, animation: "fade" }}
    tabBar={(props) => (
      <FloatingTabBar
        {...props}
        onSearchPress={() => navigation.navigate("Search")}
      />
    )}
  >
    <Tab.Screen name="Explore" component={ExploreScreen} />
    <Tab.Screen name="Decide" component={DecideScreen} />
    <Tab.Screen name="Collections" component={CollectionsScreen} />
    <Tab.Screen name="Library" component={LibraryScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: TAB_BAR_BOTTOM_OFFSET,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "center",
      marginHorizontal: TAB_BAR_MARGIN,
      gap: spacing.sm,
    },
    // Shadows and `overflow: hidden` (needed to clip the blur to the pill
    // shape) fight each other on iOS, so the shadow lives on this
    // non-clipping wrapper and the blur/radius lives on the child below.
    barShadowWrap: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },
    bar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      backgroundColor: "#FFFFFF",
      borderRadius: radius.sm,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(2, 0, 2, 0.1)",
      paddingHorizontal: 3,
      paddingVertical: 3,
    },
    item: {
      alignItems: "center",
      justifyContent: "center",
    },
    itemContent: {
      width: 54,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.sm,
    },
    searchButtonWrap: {
      width: SEARCH_BUTTON_SIZE,
      height: SEARCH_BUTTON_SIZE,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 10,
    },
    searchButton: {
      width: "100%",
      height: "100%",
      backgroundColor: "#FFFFFF",
      borderRadius: radius.sm,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(2, 0, 2, 0.1)",
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default TabNavigator;
