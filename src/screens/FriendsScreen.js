import * as Clipboard from "expo-clipboard";
import {
  Activity,
  Check,
  ChevronRight,
  Copy,
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
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FriendAvatar } from "../components/FriendAvatar";
import { PrimaryButton } from "../components/PrimaryButton";
import {
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
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getTasteMatch } from "../utils/friends";
import { getTitleName } from "../utils/ranks";
import { t, useIsRTL } from "../i18n";

const AVATAR = 44;
const SMALL_AVATAR = 40;
const MY_AVATAR = 60;
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

// Friends, laid out like Settings: you (your handle to copy or share),
// adding someone, requests waiting on you and on them, where to go
// together (Activity, Clubs), then your friends, closest taste first.
// Tap a friend for their page.
export const FriendsScreen = ({ navigation }) => {
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
  const [handleInput, setHandleInput] = useState("");
  const [sending, setSending] = useState(false);

  const myHandle = account?.handle;
  const friends = friendList
    .map((friend) => ({ ...friend, match: getTasteMatch(watched, friend.watched) }))
    .sort((a, b) => (b.match ?? -1) - (a.match ?? -1));
  const canSend = handleInput.trim().length > 0 && !sending;

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
    const raw = handleInput.trim().replace(/^@/, "");
    if (!HANDLE_PATTERN.test(raw)) {
      showToast(t("Enter a handle like @sam"));
      return;
    }
    setSending(true);
    try {
      const relationship = await sendRequest(raw);
      setHandleInput("");
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

  return (
    <View style={styles.container}>
      <StackHeader
        title={t("Friends")}
        onBack={() => navigation.goBack()}
        scrollY={headerScroll.scrollY}
      />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* You: the handle friends add you by — copy it (the icon by it)
            or send it (the one button). */}
        <View style={styles.meCard}>
          <View style={styles.meTop}>
            <Image
              source={avatarUri ? { uri: avatarUri } : DEFAULT_AVATAR_SOURCE}
              style={styles.meAvatar}
            />
            <View style={styles.meText}>
              <Text style={styles.meLabel}>{t("Your handle")}</Text>
              <Text style={styles.meHandle} numberOfLines={1}>
                {myHandle ?? displayName}
              </Text>
              <Text style={styles.meHint} numberOfLines={1}>
                {t("Friends add you by this")}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.copyButton, pressed && styles.rowPressed]}
              onPress={copyHandle}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t("Copy handle")}
            >
              <Copy size={18} color={colors.textPrimary} strokeWidth={1.9} />
            </Pressable>
          </View>
          <PrimaryButton label={t("Invite a friend")} onPress={invite} />
        </View>

        {/* Add by handle: a Settings row with the field in it. */}
        <SettingsGroup title={t("Add a friend")}>
          <View style={styles.addRow}>
            <UserPlus size={20} color={colors.textSecondary} strokeWidth={1.9} />
            <TextInput
              value={handleInput}
              onChangeText={setHandleInput}
              placeholder={t("Their handle, e.g. @sam")}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={send}
              editable={!sending}
              style={styles.addInput}
            />
            <Pressable
              onPress={send}
              disabled={!canSend}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={[styles.addText, !canSend && styles.addTextOff]}>
                {sending ? t("Sending…") : t("Add")}
              </Text>
            </Pressable>
          </View>
        </SettingsGroup>

        {/* Requests to you: accept or decline in place. */}
        {incoming.length > 0 && (
          <SettingsGroup
            title={t("Requests · {count}", { count: incoming.length })}
            inset={spacing.md + SMALL_AVATAR + spacing.md}
          >
            {incoming.map(({ user }) => (
              <View key={user.id} style={styles.personRow}>
                <FriendAvatar friend={user} size={SMALL_AVATAR} />
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
                  <X size={18} color={colors.textSecondary} strokeWidth={2.2} />
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.acceptButton, pressed && styles.pressed]}
                  onPress={() =>
                    act(
                      () => acceptRequest(user.id),
                      t("You're now friends with {handle}", { handle: user.handle }),
                    )
                  }
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
          <SettingsGroup
            title={t("Sent")}
            inset={spacing.md + SMALL_AVATAR + spacing.md}
          >
            {outgoing.map(({ user }) => (
              <View key={user.id} style={styles.personRow}>
                <FriendAvatar friend={user} size={SMALL_AVATAR} />
                <View style={styles.personText}>
                  <Text style={styles.personName} numberOfLines={1}>
                    {user.name ?? user.handle}
                  </Text>
                  <Text style={styles.personMeta} numberOfLines={1}>
                    {t("Waiting for them to accept")}
                  </Text>
                </View>
                <Pressable
                  onPress={() => act(() => dropRequest(user.id))}
                  hitSlop={8}
                  accessibilityRole="button"
                >
                  <Text style={styles.cancelText}>{t("Cancel")}</Text>
                </Pressable>
              </View>
            ))}
          </SettingsGroup>
        )}

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

        {/* Your friends, closest taste first. */}
        {friends.length > 0 && (
          <SettingsGroup
            title={t("Friends · {count}", { count: friends.length })}
            inset={PEOPLE_INSET}
          >
            {friends.map((friend) => (
              <Pressable
                key={friend.id}
                style={({ pressed }) => [styles.personRow, pressed && styles.rowPressed]}
                onPress={() => navigation.navigate("FriendProfile", { friendId: friend.id })}
                accessibilityRole="button"
              >
                <FriendAvatar friend={friend} size={AVATAR} />
                <View style={styles.personText}>
                  <Text style={styles.personName} numberOfLines={1}>
                    {friend.name}
                  </Text>
                  <Text style={styles.personMeta} numberOfLines={1}>
                    {describe(friend)}
                  </Text>
                </View>
                <View style={styles.match}>
                  <Text style={[styles.matchValue, friend.match == null && styles.matchNone]}>
                    {friend.match != null ? `${friend.match}%` : "—"}
                  </Text>
                  <View style={styles.matchTrack}>
                    <View style={[styles.matchFill, { width: `${friend.match ?? 0}%` }]} />
                  </View>
                  <Text style={styles.matchLabel}>{t("match")}</Text>
                </View>
                <ChevronRight
                  size={18}
                  color={colors.textMuted}
                  style={rtl && styles.flipped}
                />
              </Pressable>
            ))}
          </SettingsGroup>
        )}

        {/* No friends yet: one way forward. */}
        {loaded && friends.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyRing}>
              <Users size={28} color={colors.textPrimary} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>{t("No friends yet")}</Text>
            <Text style={styles.emptyText}>
              {t("Share your handle — once they add you, you can compare tiers and see what they're watching.")}
            </Text>
            <Pressable onPress={invite} hitSlop={10} accessibilityRole="button">
              <Text style={styles.emptyAction}>{t("Invite a friend")}</Text>
            </Pressable>
          </View>
        )}
        {!loaded && loading && (
          <Text style={styles.footnote}>{t("Loading…")}</Text>
        )}
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
      opacity: 0.85,
    },
    rowPressed: {
      backgroundColor: colors.cardElevated,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    // Like Settings' profile card, with copy beside the handle and the
    // invite button under it.
    meCard: {
      marginTop: spacing.md,
      padding: spacing.md,
      gap: spacing.md,
      backgroundColor: colors.card,
    },
    meTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    meAvatar: {
      width: MY_AVATAR,
      height: MY_AVATAR,
      borderRadius: MY_AVATAR / 2,
      backgroundColor: colors.cardElevated,
    },
    meText: {
      flex: 1,
      gap: 1,
    },
    meLabel: {
      ...typography.caption,
      color: colors.textMuted,
    },
    meHandle: {
      ...typography.title,
      color: colors.textPrimary,
    },
    meHint: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    copyButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    addRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 52,
      paddingHorizontal: spacing.md,
    },
    addInput: {
      ...typography.body,
      fontSize: 15,
      flex: 1,
      paddingVertical: spacing.sm + 2,
      color: colors.textPrimary,
    },
    addText: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    addTextOff: {
      color: colors.textMuted,
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
      color: colors.textPrimary,
    },
    personMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    iconButton: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    acceptButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      height: 34,
      paddingHorizontal: spacing.sm + 2,
      backgroundColor: colors.selected,
    },
    acceptText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.selectedText,
    },
    cancelText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    // Taste match: the number, a thin green bar under it, "match".
    match: {
      alignItems: "flex-end",
      gap: 3,
      minWidth: 48,
    },
    matchValue: {
      ...typography.bodyBold,
      color: colors.success,
      fontVariant: ["tabular-nums"],
    },
    matchNone: {
      color: colors.textMuted,
    },
    matchTrack: {
      width: 48,
      height: 3,
      backgroundColor: colors.border,
    },
    matchFill: {
      height: 3,
      backgroundColor: colors.success,
    },
    matchLabel: {
      ...typography.caption,
      fontSize: 10,
      color: colors.textMuted,
    },
    empty: {
      alignItems: "center",
      marginTop: spacing.xl,
      paddingHorizontal: spacing.xl,
    },
    emptyRing: {
      width: 68,
      height: 68,
      borderRadius: 34,
      borderWidth: 1.5,
      borderColor: colors.textPrimary,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTitle: {
      ...typography.title,
      color: colors.textPrimary,
      marginTop: spacing.md,
    },
    emptyText: {
      ...typography.body,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.xs,
      maxWidth: 290,
    },
    emptyAction: {
      ...typography.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
      marginTop: spacing.md,
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
