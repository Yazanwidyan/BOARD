import * as Haptics from "expo-haptics";
import { Compass, Library, Search } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ReelBoardIcon } from "../../components/icons/TabIcons";
import { TonightBar } from "../../components/TonightBar";
import { t } from "../../i18n";
import { useColors } from "../../theme/useColors";

// The bar's own height, above the home indicator.
const BAR_HEIGHT = 52;
// How far in from each side the icons start — the tabs share the rest.
const SIDE_INSET = 14;
const ICON = 24;
// Lines: thin at rest, a touch bolder on the open tab.
const STROKE = 1.7;
const STROKE_OPEN = 2.2;

// Each tab's icon — simple line icons, and the app's own mark for Home —
// and its name (for screen readers; nothing is written under the icons).
// Profile has no tab (the headers' avatar opens it).
const TABS = {
  Home: { label: "Home", Icon: ReelBoardIcon },
  Discover: { label: "Discover", Icon: Compass },
  Library: { label: "Library", Icon: Library },
  Search: { label: "Search", Icon: Search },
};

// The app's bottom tabs: a plain bar along the bottom, its icons evenly
// across. The open tab's icon is white and a little bolder; the rest grey. Tonight's pick, when there is one, docks above it.
export const BottomTabBar = ({ state, navigation }) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors);

  const select = (route, index) => {
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (index !== state.index && !event.defaultPrevented) navigation.navigate(route.name);
    Haptics.selectionAsync();
  };

  return (
    <View style={styles.dock}>
      <TonightBar navigation={navigation} />
      <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const open = state.index === index;
          const { Icon } = tab;
          return (
            <Pressable
              key={route.key}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
              onPress={() => select(route, index)}
              accessibilityRole="tab"
              accessibilityLabel={t(tab.label)}
              accessibilityState={{ selected: open }}
            >
              <Icon
                size={ICON}
                color={open ? colors.textPrimary : colors.textMuted}
                strokeWidth={open ? STROKE_OPEN : STROKE}
                open={open}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // Along the bottom, edge to edge: Tonight's bar, then the tabs.
    dock: {
      position: "absolute",
      start: 0,
      end: 0,
      bottom: 0,
    },
    bar: {
      flexDirection: "row",
      // In from the sides, so the icons sit closer together.
      paddingHorizontal: SIDE_INSET,
      backgroundColor: colors.headerBackground,
    },
    item: {
      flex: 1,
      height: BAR_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: {
      opacity: 0.6,
    },
  });

export default BottomTabBar;
