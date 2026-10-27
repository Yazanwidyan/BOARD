import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { DiscoverScreen } from "../screens/DiscoverScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LibraryScreen } from "../screens/LibraryScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { BottomTabBar } from "./tabBars/BottomTabBar";

const Tab = createBottomTabNavigator();

// The ＋ tab never shows a page of its own — pressing it opens quick log.
const LogTab = () => null;

export const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{ headerShown: false, animation: "fade" }}
    tabBar={(props) => <BottomTabBar {...props} />}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Discover" component={DiscoverScreen} />
    <Tab.Screen
      name="Log"
      component={LogTab}
      listeners={({ navigation }) => ({
        tabPress: (event) => {
          event.preventDefault();
          navigation.navigate("QuickLog");
        },
      })}
    />
    <Tab.Screen name="Library" component={LibraryScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default TabNavigator;
