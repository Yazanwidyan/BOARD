import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { DiscoverScreen } from "../screens/DiscoverScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LibraryScreen } from "../screens/LibraryScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { BottomTabBar } from "./tabBars/BottomTabBar";

const Tab = createBottomTabNavigator();

// Home, Discover and Library have tabs (navigation/tabBars); Search is a
// tab too, opened from its round button beside them — the bar turns into
// its field.
// Profile isn't one of them: the headers' avatar opens it as a page of
// its own, over the tabs (navigation/AppNavigator).
export const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{ headerShown: false, animation: "fade" }}
    tabBar={(props) => <BottomTabBar {...props} />}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Discover" component={DiscoverScreen} />
    <Tab.Screen name="Library" component={LibraryScreen} />
    <Tab.Screen name="Search" component={SearchScreen} />
  </Tab.Navigator>
);

export default TabNavigator;
