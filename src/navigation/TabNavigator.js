import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
} from "../components/icons/TabIcons";
import { DecideScreen } from "../screens/DecideScreen";
import { DiscoverScreen } from "../screens/DiscoverScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LibraryScreen } from "../screens/LibraryScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { radius, spacing } from "../theme/spacing";
import { useColors } from "../theme/useColors";

const Tab = createBottomTabNavigator();

// Home's "B" logomark is a single brand mark, always solid — no
// outline/active split. The other tabs' icons are a thin outline when
// inactive and switch to a solid fill when active.
const ICONS = {
  Home: BoardBIcon,
};
const OUTLINE_ICONS = {
  Discover: CompassOutlineIcon,
  Decide: PlayScreenOutlineIcon,
  Library: LibraryOutlineIcon,
  Profile: CircleUserOutlineIcon,
};
const SOLID_ICONS = {
  Discover: CompassIcon,
  Decide: PlayScreenIcon,
  Library: LibraryIcon,
  Profile: CircleUserFilledIcon,
};
const LABELS = {
  Home: "Board",
  Discover: "Discover",
  Decide: "Decide",
  Library: "Library",
  Profile: "Profile",
};
const ICON_SIZES = {
  Discover: 23.5,
  Library: 25,
};
const DEFAULT_ICON_SIZE = 24;

const TabLabel = ({ label, isFocused, styles }) => (
  <Text
    numberOfLines={1}
    style={[styles.label, isFocused && styles.labelActive]}
  >
    {label}
  </Text>
);

const TabBarItem = ({ route, isFocused, styles, colors, onPress }) => {
  const IconComponent =
    ICONS[route.name] ??
    (isFocused ? SOLID_ICONS[route.name] : OUTLINE_ICONS[route.name]);
  const color = isFocused ? colors.accentLight : "#e8e9fa";
  const bg = isFocused ? "#e8e9fa21" : "";

  return (
    <Pressable style={[styles.item, { backgroundColor: bg }]} onPress={onPress}>
      <View style={styles.iconSlot}>
        <IconComponent
          size={ICON_SIZES[route.name] ?? DEFAULT_ICON_SIZE}
          color={color}
        />
      </View>
      <TabLabel
        label={LABELS[route.name]}
        isFocused={isFocused}
        styles={styles}
      />
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
      borderWidth: 1,
      borderColor: colors.border,
      width: "87%",
      alignSelf: "center",
      bottom: Math.max(0, insets.bottom - 10),
      flexDirection: "row",
      backgroundColor: "#101422ea",
      borderRadius: radius.pill,
      paddingLeft: 6,
      paddingRight: 6,
      paddingTop: 6,
      paddingBottom: 6,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 10,
    },
    item: {
      backgroundColor: "red",
      borderRadius: radius.pill,
      paddingTop: 4,
      paddingBottom: 4,
      flex: 1,
      alignItems: "center",
      gap: 2,
    },
    iconSlot: {
      width: 26,
      height: 26,
      justifyContent: "center",
      alignItems: "center",
    },
    label: {
      fontSize: 10,
      fontWeight: "500",
      color: "#e2e3f7",
    },
    labelActive: {
      color: colors.accentLight,
      fontWeight: "500",
    },
  });

export default TabNavigator;
