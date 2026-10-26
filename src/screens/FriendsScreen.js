import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import {
  Activity,
  Check,
  ChevronRight,
  Copy,
  Search,
  Share2,
  UserPlus,
  Users,
  X,
} from "lucide-react-native";
import { useState } from "react";
import {
  Image,
  Pressable,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "../components/AppText";
import { EmptyState } from "../components/EmptyState";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FriendAvatar } from "../components/FriendAvatar";
import {
  HeaderIconButton,
  StackHeader,
  useStackHeaderScroll,
} from "../components/ScreenHeader";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { SettingsGroup, SettingsRow } from "../components/SettingsList";
import { useMoviesVersion } from "../data/movies";
import { useAuthStore } from "../store/authStore";
import { useClubs } from "../store/clubsStore";
import { useFriends } from "../store/friendsStore";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { showToast } from "../store/toastStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getTasteMatch } from "../utils/friends";
import { getTitleName } from "../utils/ranks";
import { t, useIsRTL } from "../i18n";

const AVATAR = 44;
const MY_AVATAR = 40;
const DEFAULT_AVATAR_SOURCE = require("../../assets/avatar-default.png");
// Hairlines in a list of people start after the avatar.
const PEOPLE_INSET = spacing.md + AVATAR + spacing.md;
const HANDLE_PATTERN = /^[a-zA-Z0-9_.]{3,20}$/;

// "@sam · Critic · 15 ranks" — who they are, under their name.
const describe = (person) =>
  [
    person.handle,
    person.title || person.level != null ? t(person.title ?? getTitleName(person.level)) : null,
    person.ranks != null ? t("{count} ranks", { count: person.ranks }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

// Friends: Friends / Requests under the header (Requests first when
// someone's waiting on you, or when opened with `tab: "requests"`).
//   Friends: one field that finds a friend as you type — or, for a handle
//   that isn't one yet, adds them — then your friends, closest taste first,
//   where to go together (Activity, Clubs) and your own handle to copy.
//   Requests: the ones waiting on you (accept / decline) and the ones you
//   sent (cancel).
// Invite is the header's share button.
export const FriendsScreen = ({ navigation, route }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const rtl = useIsRTL();
  const watched = useMovieStore((state) => state.watched);
  const account = useAuthStore((state) => state.user);
  const displayName = useProfileStore((state) => state.displayName);
  const avatarUri = useProfileStore((state) => state.avatarUri);
  const {
    friends: friendList,
    incoming,
    outgoing,
    loaded,
    loading,
    error,
    sendRequest,
    acceptRequest,
    dropRequest,
  } = useFriends();
  const { clubs } = useClubs();
  const [query, setQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState(
    route?.params?.tab ?? (incoming.length > 0 ? "requests" : "friends"),
  );

  const myHandle = account?.handle;
  const friends = friendList
    .map((friend) => ({ ...friend, match: getTasteMatch(watched, friend.watched) }))
    .sort((a, b) => (b.match ?? -1) - (a.match ?? -1));
  const requestCount = incoming.length + outgoing.length;

  // The field finds friends by name or handle as you type…
  const needle = query.trim().replace(/^@/, "").toLowerCase();
  const shown = needle
    ? friends.filter(
        (friend) =>
          friend.name.toLowerCase().includes(needle) ||
          friend.handle.toLowerCase().includes(needle),
      )
    : friends;
  // …and offers to add a handle that isn't a friend yet.
  const isFriendHandle = friends.some(
    (friend) => friend.handle.toLowerCase() === `@${needle}`,
  );
  const canAdd = HANDLE_PATTERN.test(needle) && !isFriendHandle && !sending;

  const copyHandle = async () => {
    if (!myHandle) return;
    await Clipboard.setStringAsync(myHandle);
    showToast(t("Handle copied"), { tone: "success" });
  };
  const invite = () =>
    Share.share({
      message: t(
        "Join me on ReelBoard — I'm {myHandle}. Let's compare tier lists.",
        { myHandle },
      ),
    }).catch(() => {});

  const send = async () => {
    const raw = query.trim().replace(/^@/, "");
    if (!HANDLE_PATTERN.test(raw)) {
      showToast(t("Enter a handle like @sam"));
      return;
    }
    setSending(true);
    try {
      const relationship = await sendRequest(raw);
      setQuery("");
      showToast(
        relationship === "friends"
          ? t("You're now friends with {handle}", { handle: `@${raw}` })
          : t("Request sent to {handle}", { handle: `@${raw}` }),
        { tone: "success" },
      );
    } catch (err) {
      showToast(err.message);
    } finally {
      setSending(false);
    }
  };

  const act = async (action, message) => {
    try {
      await action();
      if (message) showToast(message, { tone: "success" });
    } catch (err) {
      showToast(err.message);
    }
  };

  const tabs = [
    { key: "friends", label: t("Friends"), count: friends.length },
    { key: "requests", label: t("Requests"), count: incoming.length, alert: incoming.length > 0 },
  ];

  const friendsTab = (
    <>
      {/* Find or add: one field. */}
      <View style={styles.searchBand}>
        <Search size={18} color={colors.textMuted} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("Find a friend or add @handle")}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={canAdd ? "send" : "search"}
          onSubmitEditing={() => canAdd && send()}
          editable={!sending}
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => setQuery("")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t("Clear")}
          >
            <X size={16} color={colors.textMuted} strokeWidth={2.2} />
          </Pressable>
        )}
      </View>

      {/* A handle that isn't a friend yet: add them. */}
      {canAdd && (
        <Pressable
          style={({ pressed }) => [styles.addBand, pressed && styles.rowPressed]}
          onPress={send}
          accessibilityRole="button"
        >
          <View style={styles.addIcon}>
            <UserPlus size={18} color={colors.selectedText} strokeWidth={2} />
          </View>
          <Text style={styles.addText} numberOfLines={1}>
            {sending
              ? t("Sending…")
              : t("Add {handle}", { handle: `@${needle}` })}
          </Text>
        </Pressable>
      )}

      {/* Your friends, closest taste first. */}
      {shown.length > 0 && (
        <SettingsGroup
          title={
            needle
              ? t("Matches · {count}", { count: shown.length })
              : t("Friends · {count}", { count: friends.length })
          }
          inset={PEOPLE_INSET}
        >
          {shown.map((friend) => (
            <Pressable
              key={friend.id}
              style={({ pressed }) => [styles.personRow, pressed && styles.rowPressed]}
              onPress={() => navigation.navigate("FriendProfile", { friendId: friend.id })}
              accessibilityRole="button"
            >
              <FriendAvatar friend={friend} size={AVATAR} style={{ borderColor: colors.card }} />
              <View style={styles.personText}>
                <Text style={styles.personName} numberOfLines={1}>
                  {friend.name}
                </Text>
                <Text style={styles.personMeta} numberOfLines={1}>
                  {describe(friend)}
                </Text>
              </View>
              {friend.match != null && (
                <View style={styles.matchChip}>
                  <Text style={styles.matchText}>{`${friend.match}%`}</Text>
                </View>
              )}
              <ChevronRight size={18} color={colors.textMuted} style={rtl && styles.flipped} />
            </Pressable>
          ))}
        </SettingsGroup>
      )}
      {needle && shown.length === 0 && !canAdd && (
        <Text style={styles.footnote}>{t("No friend by that name.")}</Text>
      )}

      {/* No friends yet: one way forward. */}
      {loaded && friends.length === 0 && !needle && (
        <EmptyState
          Icon={Users}
          title={t("No friends yet")}
          subtitle={t("Share your handle — once they add you, you can compare tiers and see what they're watching.")}
          actionLabel={t("Invite a friend")}
          onAction={invite}
        />
      )}

      {!needle && (
        <SettingsGroup title={t("Together")}>
          <SettingsRow
            Icon={Activity}
            label={t("Activity")}
            hint={t("What your friends are watching and tiering")}
            onPress={() => navigation.navigate("Activity")}
          />
          <SettingsRow
            Icon={Users}
            label={t("Clubs")}
            hint={
              clubs.length > 0
                ? t("{count} clubs · watch together", { count: clubs.length })
                : t("Watch together — start a club or join one")
            }
            onPress={() => navigation.navigate("Clubs")}
          />
        </SettingsGroup>
      )}

      {/* You: the handle friends add you by. */}
      {!needle && (
        <SettingsGroup title={t("Your handle")} footnote={t("Friends add you by this")}>
          <Pressable
            style={({ pressed }) => [styles.meRow, pressed && styles.rowPressed]}
            onPress={copyHandle}
            accessibilityRole="button"
            accessibilityLabel={t("Copy handle")}
          >
            <Image
              source={avatarUri ? { uri: avatarUri } : DEFAULT_AVATAR_SOURCE}
              style={styles.meAvatar}
            />
            <Text style={styles.meHandle} numberOfLines={1}>
              {myHandle ?? displayName}
            </Text>
            <Copy size={18} color={colors.textSecondary} strokeWidth={1.9} />
          </Pressable>
        </SettingsGroup>
      )}
    </>
  );

  const requestsTab = (
    <>
      {/* Requests to you: accept or decline in place. */}
      {incoming.length > 0 && (
        <SettingsGroup
          title={t("Waiting on you · {count}", { count: incoming.length })}
          inset={PEOPLE_INSET}
        >
          {incoming.map(({ user }) => (
            <View key={user.id} style={styles.personRow}>
              <FriendAvatar friend={user} size={AVATAR} style={{ borderColor: colors.card }} />
              <View style={styles.personText}>
                <Text style={styles.personName} numberOfLines={1}>
                  {user.name}
                </Text>
                <Text style={styles.personMeta} numberOfLines={1}>
                  {describe(user)}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                onPress={() => act(() => dropRequest(user.id))}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={t("Decline")}
              >
                <X size={18} color={colors.textPrimary} strokeWidth={2.2} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.acceptButton, pressed && styles.pressed]}
                onPress={() => {
                  Haptics.selectionAsync();
                  act(
                    () => acceptRequest(user.id),
                    t("You're now friends with {handle}", { handle: user.handle }),
                  );
                }}
                hitSlop={4}
                accessibilityRole="button"
              >
                <Check size={16} color={colors.selectedText} strokeWidth={2.4} />
                <Text style={styles.acceptText}>{t("Accept")}</Text>
              </Pressable>
            </View>
          ))}
        </SettingsGroup>
      )}

      {/* Requests you sent, until they answer. */}
      {outgoing.length > 0 && (
        <SettingsGroup title={t("Sent")} inset={PEOPLE_INSET}>
          {outgoing.map(({ user }) => (
            <View key={user.id} style={styles.personRow}>
              <FriendAvatar friend={user} size={AVATAR} style={{ borderColor: colors.card }} />
              <View style={styles.personText}>
                <Text style={styles.personName} numberOfLines={1}>
                  {user.name ?? user.handle}
                </Text>
                <Text style={styles.personMeta} numberOfLines={1}>
                  {t("Waiting for them to accept")}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
                onPress={() => act(() => dropRequest(user.id))}
                hitSlop={4}
                accessibilityRole="button"
              >
                <Text style={styles.cancelText}>{t("Cancel")}</Text>
              </Pressable>
            </View>
          ))}
        </SettingsGroup>
      )}

      {requestCount === 0 && (
        <EmptyState
          Icon={UserPlus}
          title={t("No requests")}
          subtitle={t("When someone adds you, they'll wait here for you to accept.")}
        />
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <StackHeader
        title={t("Friends")}
        onBack={() => navigation.goBack()}
        scrollY={headerScroll.scrollY}
        right={
          <HeaderIconButton onPress={invite} accessibilityLabel={t("Invite a friend")}>
            <Share2 size={21} color={colors.textPrimary} strokeWidth={1.8} />
          </HeaderIconButton>
        }
      />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Friends / Requests: the Library tab style. */}
        <View style={styles.tabs} accessibilityRole="tablist">
          {tabs.map((item) => {
            const selected = item.key === tab;
            return (
              <Pressable
                key={item.key}
                style={[styles.tab, selected && styles.tabOn]}
                onPress={() => setTab(item.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.tabText, selected && styles.tabTextOn]}>{item.label}</Text>
                {item.count > 0 && (
                  <View
                    style={[
                      styles.tabCount,
                      selected && styles.tabCountOn,
                      item.alert && styles.tabCountAlert,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabCountText,
                        selected && styles.tabCountTextOn,
                        item.alert && styles.tabCountTextAlert,
                      ]}
                    >
                      {item.count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {tab === "friends" ? friendsTab : requestsTab}

        {!loaded && loading && <Text style={styles.footnote}>{t("Loading…")}</Text>}
        {!!error && (
          <Text style={styles.footnote}>
            {t("Couldn't load friends: {error}", { error })}
          </Text>
        )}
      </Animated.ScrollView>
      <ScreenBottomFade />
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
      opacity: 0.8,
    },
    rowPressed: {
      backgroundColor: colors.cardElevated,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    tabs: {
      flexDirection: "row",
      gap: 2,
      padding: 2,
      marginTop: spacing.md,
      marginHorizontal: spacing.md,
      // On the page, so the card colour (the dark track would vanish).
      backgroundColor: colors.card,
      borderRadius: 6,
    },
    tab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 4,
      borderRadius: 7,
    },
    tabOn: {
      backgroundColor: colors.segmentOn,
    },
    tabText: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 18,
      color: colors.segmentText,
    },
    tabTextOn: {
      color: colors.segmentOnText,
    },
    tabCount: {
      minWidth: 18,
      paddingHorizontal: 5,
      alignItems: "center",
      backgroundColor: colors.surfaceSoft,
      borderRadius: shape.chip,
    },
    // In the open tab (the accent pill): a darker tint, its own text.
    tabCountOn: {
      backgroundColor: "rgba(0, 0, 0, 0.12)",
    },
    tabCountTextOn: {
      color: colors.segmentOnText,
    },
    // Someone's waiting on you: red, so it's not missed.
    tabCountAlert: {
      backgroundColor: colors.danger,
    },
    tabCountText: {
      ...typography.bodyBold,
      fontSize: 11,
      lineHeight: 16,
      color: colors.textSecondary,
    },
    tabCountTextAlert: {
      color: "#FFFFFF",
    },
    // The find / add field: a full-width band.
    searchBand: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      minHeight: 48,
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
    },
    searchInput: {
      ...typography.body,
      fontSize: 15,
      lineHeight: 20,
      flex: 1,
      paddingVertical: spacing.sm + 2,
      color: colors.textPrimary,
    },
    addBand: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 56,
      marginTop: StyleSheet.hairlineWidth * 2,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
    },
    addIcon: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.selected,
      borderRadius: 16,
    },
    addText: {
      ...typography.bodyBold,
      flex: 1,
      color: colors.textPrimary,
    },
    personRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 64,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    personText: {
      flex: 1,
      gap: 2,
    },
    personName: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    personMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    // Taste match: a small green chip.
    matchChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      backgroundColor: colors.successSoft,
      borderRadius: shape.chip,
    },
    matchText: {
      ...typography.bodyBold,
      fontSize: 12,
      lineHeight: 16,
      color: colors.success,
      fontVariant: ["tabular-nums"],
    },
    iconButton: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: shape.control,
      backgroundColor: colors.buttonFill,
    },
    acceptButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      height: 34,
      paddingHorizontal: spacing.sm + 2,
      backgroundColor: colors.selected,
      borderRadius: shape.control,
    },
    acceptText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.selectedText,
    },
    cancelButton: {
      height: 34,
      justifyContent: "center",
      paddingHorizontal: spacing.sm + 2,
      backgroundColor: colors.buttonFill,
      borderRadius: shape.control,
    },
    cancelText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
    },
    meRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 56,
      paddingHorizontal: spacing.md,
    },
    meAvatar: {
      width: MY_AVATAR,
      height: MY_AVATAR,
      borderRadius: MY_AVATAR / 2,
      backgroundColor: colors.cardElevated,
    },
    meHandle: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      flex: 1,
      color: colors.textPrimary,
    },
    footnote: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.lg,
      paddingHorizontal: spacing.md,
    },
  });

export default FriendsScreen;
