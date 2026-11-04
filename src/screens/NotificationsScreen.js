import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Bell, Check, ChevronLeft, Users, X } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { Linking, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { EmptyState } from "../components/EmptyState";
import { FriendAvatar } from "../components/FriendAvatar";
import { MoviePoster } from "../components/MoviePoster";
import { DockHeader, HeaderIconButton, useDockHeader } from "../components/ScreenHeader";
import { TierNudgeCard } from "../components/TierNudgeCard";
import { t, useIsRTL } from "../i18n";
import { useFriends, useNotifications } from "../store/friendsStore";
import { showToast } from "../store/toastStore";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { timeAgo } from "../utils/friends";

const AVATAR = 44;

// The bell's page: everything the app has to tell you, in one place.
//   Needs you   the morning question (did you watch it? tier it), and
//               friend requests — accept or decline right here.
//   Recent      what the server told you (a request accepted, a friend's
//               S on a film you saved…), kept whether or not your phone
//               showed it; new ones marked with a dot. Tap one to open it.
// Opening the page marks them seen (the dots stay until you leave).
// The people button opens Friends.
export const NotificationsScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const rtl = useIsRTL();
  const header = useDockHeader();
  const { incoming, acceptRequest, dropRequest, refresh: refreshFriends } = useFriends();
  const { notifications, loaded, markRead, refresh } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  // Requests are under "Needs you"; the rest is the list.
  const recent = notifications.filter((item) => item.kind !== "friendRequest");

  // Seen once you're here — the new ones keep their dot while you look.
  const fresh = useRef(null);
  if (fresh.current === null && loaded) {
    fresh.current = new Set(notifications.filter((item) => !item.read).map((item) => item.id));
  }
  useFocusEffect(
    useCallback(() => {
      if (loaded && notifications.some((item) => !item.read)) markRead();
    }, [loaded, notifications, markRead]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.selectionAsync();
    try {
      await Promise.all([refresh(), refreshFriends()]);
    } finally {
      setRefreshing(false);
    }
  };
  const act = async (run, done) => {
    try {
      await run();
      if (done) showToast(done, { tone: "success" });
    } catch {
      showToast(t("Can't reach ReelBoard right now — check your connection."));
    }
  };
  const open = (item) => {
    if (item.movie) navigation.navigate("MovieDetails", { movieId: item.movie.id });
    else if (item.url === "reelboard://friends") navigation.navigate("FriendsHub");
    else if (item.url) Linking.openURL(item.url).catch(() => {});
  };

  const requests = incoming.length > 0 && (
    <View style={styles.block}>
      <Text style={styles.heading}>{t("Friend requests")}</Text>
      {incoming.map(({ user }) => (
        <View key={user.id} style={styles.request}>
          <Pressable onPress={() => navigation.navigate("FriendProfile", { friendId: user.id })} hitSlop={4}>
            <FriendAvatar friend={user} size={AVATAR} />
          </Pressable>
          <View style={styles.words}>
            <Text style={styles.title} numberOfLines={1}>
              {user.name}
            </Text>
            <Text style={styles.body} numberOfLines={1}>
              {t("{handle} wants to be friends", { handle: user.handle })}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.decline, pressed && styles.pressed]}
            onPress={() => act(() => dropRequest(user.id))}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={t("Decline")}
          >
            <X size={17} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.accept, pressed && styles.pressed]}
            onPress={() => {
              Haptics.selectionAsync();
              act(() => acceptRequest(user.id), t("You're now friends with {handle}", { handle: user.handle }));
            }}
            hitSlop={4}
            accessibilityRole="button"
          >
            <Check size={15} color={colors.selectedText} strokeWidth={2.6} />
            <Text style={styles.acceptText}>{t("Accept")}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );

  const list = recent.length > 0 && (
    <View style={styles.block}>
      <Text style={styles.heading}>{t("Recent")}</Text>
      {recent.map((item, index) => {
        const isNew = fresh.current?.has(item.id);
        return (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            onPress={() => open(item)}
            accessibilityRole="button"
            accessibilityLabel={item.title}
          >
            {item.from ? (
              <FriendAvatar friend={item.from} size={AVATAR} />
            ) : (
              <View style={styles.icon}>
                <Bell size={20} color={colors.textSecondary} strokeWidth={2} />
              </View>
            )}
            <View style={[styles.itemWords, index < recent.length - 1 && styles.rule]}>
              <View style={styles.words}>
                <Text style={[styles.title, !isNew && styles.titleRead]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.body} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </View>
              {item.movie?.poster ? <MoviePoster uri={item.movie.poster} style={styles.poster} /> : null}
              {isNew && <View style={styles.dot} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  const empty = incoming.length === 0 && recent.length === 0;

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        onScroll={header.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={header.barBottom}
            tintColor={colors.textSecondary}
            colors={[colors.textPrimary]}
            progressBackgroundColor={colors.card}
          />
        }
        contentContainerStyle={{
          paddingTop: header.barBottom + spacing.sm,
          paddingBottom: insets.bottom + spacing.xl,
        }}
      >
        {/* The morning question, when there is one (it shows itself). */}
        <TierNudgeCard navigation={navigation} style={styles.nudge} />
        {requests}
        {list}
        {empty && (
          <EmptyState
            Icon={Bell}
            title={t("You're all caught up")}
            subtitle={t("Friend requests, the morning question and news from friends show up here.")}
          />
        )}
      </Animated.ScrollView>
      <DockHeader
        {...header.props}
        title={t("Notifications")}
        compact
        avatar={false}
        back={
          <HeaderIconButton round onPress={() => navigation.goBack()} accessibilityLabel={t("Back")}>
            <ChevronLeft size={22} color={colors.textPrimary} strokeWidth={2} style={rtl && styles.flipped} />
          </HeaderIconButton>
        }
        right={
          <HeaderIconButton onPress={() => navigation.navigate("FriendsHub")} accessibilityLabel={t("Friends")}>
            <Users size={20} color={colors.textPrimary} strokeWidth={1.9} />
          </HeaderIconButton>
        }
      />
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    pressed: {
      opacity: 0.7,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    nudge: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.lg,
    },
    block: {
      marginBottom: spacing.lg + spacing.sm,
    },
    // As Home's section headings.
    heading: {
      fontFamily: fonts.extraBold,
      fontSize: 21,
      lineHeight: 27,
      letterSpacing: -0.3,
      color: colors.textPrimary,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    // A request: face, name, ✕ and Accept.
    request: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    decline: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderRadius: shape.chip,
    },
    accept: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      height: 36,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.selected,
      borderRadius: shape.chip,
    },
    acceptText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.selectedText,
    },
    // One notification: face (or a bell), what it says, when, the film's
    // poster, and a dot while it's new.
    item: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md,
      paddingStart: spacing.md,
      paddingTop: spacing.sm + 2,
    },
    icon: {
      width: AVATAR,
      height: AVATAR,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderRadius: AVATAR / 2,
    },
    itemWords: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm + 2,
      paddingEnd: spacing.md,
      paddingBottom: spacing.sm + 2,
    },
    rule: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    words: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    titleRead: {
      fontFamily: fonts.medium,
    },
    body: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    time: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    poster: {
      width: 36,
      height: 54,
    },
    dot: {
      width: 8,
      height: 8,
      marginTop: 6,
      backgroundColor: colors.brand,
      borderRadius: 4,
    },
  });

export default NotificationsScreen;
