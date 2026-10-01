import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  CompassIcon,
  HomeIcon,
  LibraryIcon,
  TargetIcon,
  UserIcon,
} from "../components/icons/TabIcons";
import { DecideScreen } from "../screens/DecideScreen";
import { DiscoverScreen } from "../screens/DiscoverScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LibraryScreen } from "../screens/LibraryScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { spacing } from "../theme/spacing";
import { useColors } from "../theme/useColors";

const Tab = createBottomTabNavigator();

// Deliberately plain — five equal, identically-styled tabs. No blur, no
// raised badge, no gradients: just an icon, a label, and a color change on
// the active one. Decide holds Swipe, Spin, and Challenges together — all
// three are "I don't know what to watch, decide for me," just with
// different textures — instead of Swipe/Spin being secondary cards buried
// on Home. Library holds Watched, Watchlist, and Collections as three tabs
// on one screen — neither gets its own bottom-tab slot anymore.
const ICONS = {
  Home: HomeIcon,
  Discover: CompassIcon,
  Decide: TargetIcon,
  Library: LibraryIcon,
  Profile: UserIcon,
};
const LABELS = {
  Home: "Home",
  Discover: "Discover",
  Decide: "Decide",
  Library: "Library",
  Profile: "Profile",
};

const TabBarItem = ({ route, isFocused, styles, colors, onPress }) => {
  const IconComponent = ICONS[route.name];
  const color = isFocused ? colors.accentLight : colors.textMuted;

  return (
    <Pressable style={styles.item} onPress={onPress}>
      <IconComponent size={22} color={color} />
      <Text numberOfLines={1} style={[styles.label, { color }]}>
        {LABELS[route.name]}
      </Text>
    </Pressable>
  );
};

const BottomTabBar = ({ state, navigation }) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets);

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
    <View style={styles.container}>
      {state.routes.map((route, index) => (
        <TabBarItem
          key={route.key}
          route={route}
          isFocused={state.index === index}
          styles={styles}
          colors={colors}
          onPress={() => selectIndex(index)}
        />
      ))}
    </View>
  );
};

export const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{ headerShown: false, animation: "fade" }}
    tabBar={(props) => <BottomTabBar {...props} />}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Discover" component={DiscoverScreen} />
    <Tab.Screen name="Decide" component={DecideScreen} />
    <Tab.Screen name="Library" component={LibraryScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const createStyles = (colors, insets) =>
  StyleSheet.create({
    container: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.sm,
      paddingBottom: insets.bottom + spacing.xs,
    },
    item: {
      flex: 1,
      alignItems: "center",
      gap: 4,
    },
    label: {
      fontSize: 11,
      fontWeight: "600",
    },
  });

export default TabNavigator;
