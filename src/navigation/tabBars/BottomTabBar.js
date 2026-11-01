import * as Haptics from "expo-haptics";
import { Bookmark, Compass, Search } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../../components/AppText";
import { ReelBoardIcon } from "../../components/icons/TabIcons";
import { TonightBar } from "../../components/TonightBar";
import { t } from "../../i18n";
import { spacing } from "../../theme/spacing";
import { fonts } from "../../theme/typography";
import { useColors } from "../../theme/useColors";

// The capsule's height, the gap inside it round the open tab's pill, and
// the least room under it (above the home indicator).
const BAR_HEIGHT = 64;
const BAR_INSET = 5;
const MIN_BOTTOM = 8;
const ICON = 22;
// Lines: thin at rest, a touch bolder on the open tab.
const STROKE = 1.7;
const STROKE_OPEN = 2.2;

// Each tab's icon — simple line icons, and the app's own mark for Home —
// and its name, written under it. Profile has no tab (the headers' avatar
// opens it).
const TABS = {
  Home: { label: "Home", Icon: ReelBoardIcon },
  Discover: { label: "Discover", Icon: Compass },
  Library: { label: "Library", Icon: Bookmark },
};

// The app's bottom tabs: a floating dark capsule, in from the screen's
// edges, each tab its icon with its name under it — the open one in a
// lighter pill, white and a little bolder; the rest grey — and Search on
// its own beside it, a round button the capsule's height that opens Search
// as a sheet over the page. Tonight's pick, when there is one, docks above
// them.
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
    <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, MIN_BOTTOM) }]} pointerEvents="box-none">
      <TonightBar navigation={navigation} />
      <View style={styles.row}>
        <View style={styles.bar}>
          {state.routes.map((route, index) => {
            const tab = TABS[route.name];
            if (!tab) return null;
            const open = state.index === index;
            const { Icon } = tab;
            const ink = open ? colors.textPrimary : colors.textSecondary;
            return (
              <Pressable
                key={route.key}
                style={({ pressed }) => [styles.item, open && styles.itemOpen, pressed && styles.pressed]}
                onPress={() => select(route, index)}
                accessibilityRole="tab"
                accessibilityLabel={t(tab.label)}
                accessibilityState={{ selected: open }}
              >
                <Icon size={ICON} color={ink} strokeWidth={open ? STROKE_OPEN : STROKE} open={open} />
                <Text style={[styles.label, open && styles.labelOpen, { color: ink }]} numberOfLines={1}>
                  {t(tab.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {/* Search, on its own: opens as a sheet. */}
        <Pressable
          style={({ pressed }) => [styles.search, pressed && styles.pressed]}
          onPress={() => {
            Haptics.selectionAsync();
            navigation.navigate("Search");
          }}
          accessibilityRole="button"
          accessibilityLabel={t("Search")}
        >
          <Search size={ICON + 2} color={colors.textPrimary} strokeWidth={STROKE + 0.3} />
        </Pressable>
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // Along the bottom: Tonight's bar, then the capsule.
    dock: {
      position: "absolute",
      start: 0,
      end: 0,
      bottom: 0,
    },
    // The capsule and Search side by side, in from the edges.
    row: {
      flexDirection: "row",
      gap: spacing.sm + 2,
      marginHorizontal: spacing.md,
    },
    // The capsule: dark, fully rounded, a soft shadow under it so it floats
    // over the page.
    bar: {
      flex: 1,
      flexDirection: "row",
      height: BAR_HEIGHT,
      padding: BAR_INSET,
      backgroundColor: colors.card,
      borderRadius: BAR_HEIGHT / 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      shadowColor: "#000000",
      shadowOpacity: 0.4,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12,
    },
    item: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      borderRadius: (BAR_HEIGHT - BAR_INSET * 2) / 2,
    },
    // The open tab: a lighter pill behind its icon and name.
    itemOpen: {
      backgroundColor: colors.cardElevatedLight,
    },
    // Search: a round button the capsule's height, in its colours.
    search: {
      width: BAR_HEIGHT,
      height: BAR_HEIGHT,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderRadius: BAR_HEIGHT / 2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      shadowColor: "#000000",
      shadowOpacity: 0.4,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12,
    },
    label: {
      fontFamily: fonts.medium,
      fontSize: 11,
      lineHeight: 14,
    },
    labelOpen: {
      fontFamily: fonts.bold,
    },
    pressed: {
      opacity: 0.6,
    },
  });

export default BottomTabBar;
