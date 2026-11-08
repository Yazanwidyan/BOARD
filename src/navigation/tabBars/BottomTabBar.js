import * as Haptics from "expo-haptics";
import { Bookmark, Compass, Search, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../../components/AppText";
import { ReelBoardIcon } from "../../components/icons/TabIcons";
import { TonightBar } from "../../components/TonightBar";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";
import { t, useIsRTL } from "../../i18n";
import { useSearchStore } from "../../store/searchStore";
import { spacing } from "../../theme/spacing";
import { fonts, typography } from "../../theme/typography";
import { useColors } from "../../theme/useColors";

// The capsule's height, the gap inside it round the open tab's pill, the
// least room under it, and how far it tucks down into the home
// indicator's area (closer to the edge, as iOS's own floating bars sit).
const BAR_HEIGHT = 64;
const BAR_INSET = 5;
const MIN_BOTTOM = 8;
const TUCK = 14;
const ICON = 22;
// Lines: thin at rest, a touch bolder on the open tab.
const STROKE = 1.7;
const STROKE_OPEN = 2.2;
// How the bar changes shape between the tabs and Search: a quick ease,
// settling without any bounce.
const MORPH = LinearTransition.duration(280).easing(Easing.out(Easing.cubic));
const SWAP_IN = FadeIn.duration(180);
const SWAP_OUT = FadeOut.duration(120);
// The open tab's pill: how it settles on a tab, and how much it swells
// while you hold it.
const SETTLE = { duration: 240, easing: Easing.out(Easing.cubic) };
const HELD_SCALE = 1.06;

// Each tab's icon — simple line icons, and the app's own mark for Home —
// and its name, written under it. Profile has no tab (the headers' avatar
// opens it); Search has its own button.
const TABS = {
  Home: { label: "Home", Icon: ReelBoardIcon },
  Discover: { label: "Discover", Icon: Compass },
  Library: { label: "Library", Icon: Bookmark },
};

// The tabs inside the capsule. Tap one, or press and slide: the pill
// follows your finger and the tab under it lights up (a tick as you cross
// into each), but nothing opens until you let go — then the tab you let go
// on does. `tabs`: [{ key, label, Icon }] in order; `open` the open one's
// place; `onSelect(place)`.
const TabStrip = ({ tabs, open, onSelect, rtl, colors, styles }) => {
  const [width, setWidth] = useState(0);
  // The tab under your finger while you hold (null when you're not).
  const [hover, setHover] = useState(null);
  const count = tabs.length;
  const slot = width / count;
  const pillX = useSharedValue(0);
  const held = useSharedValue(0);
  const under = useSharedValue(-1);

  // Places run right to left in Arabic; the pill's x is from the left.
  const xOf = (place) => (rtl ? count - 1 - place : place) * slot;
  useEffect(() => {
    if (width > 0 && under.value < 0) pillX.value = withTiming(xOf(open), SETTLE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, width, rtl]);

  const crossInto = (place) => {
    setHover(place);
    Haptics.selectionAsync();
  };
  const letGo = (place) => {
    setHover(null);
    if (place >= 0) onSelect(place);
  };

  const gesture = Gesture.Pan()
    .minDistance(0)
    .shouldCancelWhenOutside(false)
    .onBegin((event) => {
      if (slot <= 0) return;
      held.value = withTiming(1, { duration: 140 });
      const spot = Math.min(count - 1, Math.max(0, Math.floor(event.x / slot)));
      const place = rtl ? count - 1 - spot : spot;
      under.value = place;
      pillX.value = withTiming(spot * slot, { duration: 120 });
      runOnJS(setHover)(place);
    })
    .onUpdate((event) => {
      if (slot <= 0) return;
      // The pill follows the finger, kept inside the capsule.
      pillX.value = Math.min(width - slot, Math.max(0, event.x - slot / 2));
      const spot = Math.min(count - 1, Math.max(0, Math.floor(event.x / slot)));
      const place = rtl ? count - 1 - spot : spot;
      if (place !== under.value) {
        under.value = place;
        runOnJS(crossInto)(place);
      }
    })
    .onFinalize(() => {
      const place = under.value;
      held.value = withTiming(0, { duration: 160 });
      if (place >= 0) pillX.value = withTiming((rtl ? count - 1 - place : place) * slot, SETTLE);
      under.value = -1;
      runOnJS(letGo)(place);
    });

  const pillStyle = useAnimatedStyle(() => ({
    width: slot,
    transform: [{ translateX: pillX.value }, { scale: 1 + (HELD_SCALE - 1) * held.value }],
  }));

  const lit = hover ?? open;
  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.items} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 && <Animated.View pointerEvents="none" style={[styles.pill, pillStyle]} />}
        {tabs.map((tab, place) => {
          const on = lit === place;
          const ink = on ? colors.textPrimary : colors.textSecondary;
          const { Icon } = tab;
          return (
            <View
              key={tab.key}
              style={styles.item}
              accessible
              accessibilityRole="tab"
              accessibilityLabel={t(tab.label)}
              accessibilityState={{ selected: open === place }}
              onAccessibilityTap={() => onSelect(place)}
            >
              <Icon size={ICON} color={ink} strokeWidth={on ? STROKE_OPEN : STROKE} open={on} />
              <Text style={[styles.label, on && styles.labelOpen, { color: ink }]} numberOfLines={1}>
                {t(tab.label)}
              </Text>
            </View>
          );
        })}
      </View>
    </GestureDetector>
  );
};

// The app's bottom tabs, as Apple TV's:
//   on a tab     a floating dark capsule with the tabs (the open one in a
//                lighter pill — press and slide to move it, it opens the
//                tab you let go on: TabStrip) and Search beside it, a round
//                button.
//   on Search    the capsule shrinks to a round button with the tab you
//                came from (tap to go back) and Search's button stretches
//                into the search field.
//   typing       the field rises above the keyboard; ✕ beside it puts the
//                keyboard away and clears what's typed.
// Tonight's pick, when there is one, docks above the tabs (not on Search).
export const BottomTabBar = ({ state, navigation }) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const rtl = useIsRTL();
  const styles = createStyles(colors);
  const input = useRef(null);
  const { lift } = useKeyboardHeight();
  const query = useSearchStore((store) => store.query);
  const setQuery = useSearchStore((store) => store.setQuery);
  const focused = useSearchStore((store) => store.focused);
  const setFocused = useSearchStore((store) => store.setFocused);
  const from = useSearchStore((store) => store.from);
  const setFrom = useSearchStore((store) => store.setFrom);

  const current = state.routes[state.index].name;
  const searching = current === "Search";
  const typing = searching && focused;
  const bottom = Math.max(insets.bottom - TUCK, MIN_BOTTOM);

  // Over the keyboard while typing in Search — only then (other pages'
  // fields leave the tabs where they are).
  const dockStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateY: searching ? -Math.max(0, lift.value - bottom + spacing.sm) : 0 }],
    }),
    [searching, bottom],
  );

  const select = (route, index) => {
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (index !== state.index && !event.defaultPrevented) navigation.navigate(route.name);
    Haptics.selectionAsync();
  };
  const openSearch = () => {
    Haptics.selectionAsync();
    setFrom(current);
    navigation.navigate("Search");
  };
  const leaveSearch = () => {
    Haptics.selectionAsync();
    input.current?.blur();
    navigation.navigate(TABS[from] ? from : "Home");
  };
  const stopTyping = () => {
    Haptics.selectionAsync();
    setQuery("");
    input.current?.blur();
  };

  const BackIcon = (TABS[from] ?? TABS.Home).Icon;
  // The tabs the capsule shows, in order (Search has its own button).
  const tabRoutes = state.routes
    .map((route, index) => ({ route, index, tab: TABS[route.name] }))
    .filter((item) => item.tab);
  const openPlace = tabRoutes.findIndex((item) => item.index === state.index);

  return (
    <Animated.View style={[styles.dock, { paddingBottom: bottom }, dockStyle]} pointerEvents="box-none">
      {!searching && <TonightBar navigation={navigation} />}
      <View style={styles.row}>
        {/* The tabs — or, on Search, a round button back to the tab. */}
        {!typing && (
          <Animated.View
            key="tabs"
            layout={MORPH}
            exiting={SWAP_OUT}
            entering={SWAP_IN}
            style={[styles.surface, searching ? styles.round : styles.bar]}
          >
            {searching ? (
              <Animated.View key="back" entering={SWAP_IN} exiting={SWAP_OUT} style={styles.fill}>
                <Pressable
                  style={({ pressed }) => [styles.fill, pressed && styles.pressed]}
                  onPress={leaveSearch}
                  accessibilityRole="button"
                  accessibilityLabel={t((TABS[from] ?? TABS.Home).label)}
                >
                  <BackIcon size={ICON + 2} color={colors.textPrimary} strokeWidth={STROKE_OPEN} open />
                </Pressable>
              </Animated.View>
            ) : (
              <Animated.View key="items" entering={SWAP_IN} exiting={SWAP_OUT} style={styles.items}>
                <TabStrip
                  tabs={tabRoutes.map(({ route, tab }) => ({ key: route.key, ...tab }))}
                  open={openPlace}
                  onSelect={(place) => select(tabRoutes[place].route, tabRoutes[place].index)}
                  rtl={rtl}
                  colors={colors}
                  styles={styles}
                />
              </Animated.View>
            )}
          </Animated.View>
        )}

        {/* Search: a round button on the tabs; the field on Search. */}
        <Animated.View
          key="search"
          layout={MORPH}
          style={[styles.surface, searching ? styles.field : styles.round]}
        >
          {searching ? (
            <Animated.View key="field" entering={SWAP_IN} style={styles.fieldInner}>
              <Search size={20} color={colors.textSecondary} strokeWidth={2.2} />
              <TextInput
                ref={input}
                value={query}
                onChangeText={setQuery}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={t("Films, directors, actors")}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, rtl && styles.inputRtl]}
                autoCorrect={false}
                returnKeyType="search"
                accessibilityLabel={t("Search")}
              />
              {query.length > 0 && (
                <Pressable
                  onPress={() => setQuery("")}
                  hitSlop={10}
                  style={styles.clear}
                  accessibilityRole="button"
                  accessibilityLabel={t("Clear")}
                >
                  <X size={12} color={colors.background} strokeWidth={3} />
                </Pressable>
              )}
            </Animated.View>
          ) : (
            <Animated.View key="button" entering={SWAP_IN} style={styles.fill}>
              <Pressable
                style={({ pressed }) => [styles.fill, pressed && styles.pressed]}
                onPress={openSearch}
                accessibilityRole="button"
                accessibilityLabel={t("Search")}
              >
                <Search size={ICON + 2} color={colors.textPrimary} strokeWidth={STROKE + 0.3} />
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>

        {/* Typing: ✕ to stop. */}
        {typing && (
          <Animated.View key="close" layout={MORPH} entering={SWAP_IN} exiting={SWAP_OUT} style={[styles.surface, styles.round]}>
            <Pressable
              style={({ pressed }) => [styles.fill, pressed && styles.pressed]}
              onPress={stopTyping}
              accessibilityRole="button"
              accessibilityLabel={t("Close search")}
            >
              <X size={ICON + 2} color={colors.textPrimary} strokeWidth={2} />
            </Pressable>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // Along the bottom: Tonight's bar, then the tabs.
    dock: {
      position: "absolute",
      start: 0,
      end: 0,
      bottom: 0,
    },
    // Side by side, in from the edges.
    row: {
      flexDirection: "row",
      gap: spacing.sm + 2,
      marginHorizontal: spacing.md,
    },
    // Every piece of the bar: dark, fully rounded, a soft shadow under it so
    // it floats over the page.
    surface: {
      height: BAR_HEIGHT,
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
    // The tabs' capsule.
    bar: {
      flex: 1,
      padding: BAR_INSET,
    },
    // A round button the capsule's height.
    round: {
      width: BAR_HEIGHT,
    },
    // Search's field: all the room there is.
    field: {
      flex: 1,
    },
    fill: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    items: {
      flex: 1,
      flexDirection: "row",
    },
    item: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
      borderRadius: (BAR_HEIGHT - BAR_INSET * 2) / 2,
    },
    // The open tab's pill, behind its icon and name — it slides between
    // the tabs.
    pill: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      backgroundColor: colors.cardElevatedLight,
      borderRadius: (BAR_HEIGHT - BAR_INSET * 2) / 2,
    },
    fieldInner: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      paddingHorizontal: spacing.lg + 2,
    },
    input: {
      ...typography.subtitle,
      fontSize: 17,
      flex: 1,
      height: "100%",
      color: colors.textPrimary,
    },
    inputRtl: {
      textAlign: "right",
    },
    // ✕ in the field: a small filled circle.
    clear: {
      width: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.textMuted,
      borderRadius: 10,
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
