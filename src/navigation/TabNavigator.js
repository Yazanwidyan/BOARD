import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { DiscoverScreen } from "../screens/DiscoverScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LibraryScreen } from "../screens/LibraryScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { BottomTabBar } from "./tabBars/BottomTabBar";

const Tab = createBottomTabNavigator();

// Home, Discover, Library and Search have tabs (navigation/tabBars).
// Profile is a tab screen with no tab of its own: the headers' avatar
// opens it, with the tabs still under it.
export const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{ headerShown: false, animation: "fade" }}
    tabBar={(props) => <BottomTabBar {...props} />}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Discover" component={DiscoverScreen} />
    <Tab.Screen name="Library" component={LibraryScreen} />
    <Tab.Screen name="Search" component={SearchScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default TabNavigator;
