import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FriendAvatar } from "../components/FriendAvatar";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { StackHeader } from "../components/ScreenHeader";
import { MOCK_FRIENDS } from "../data/mockFriends";
import { getMovieById } from "../data/movies";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { showToast } from "../store/toastStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getTasteMatch } from "../utils/friends";
import { getLevelName } from "../utils/xp";

const POSTERS_SHOWN = 5;

const toHandle = (name) =>
  `@${
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "") || "you"
  }`;

// Friends (MOCK — see data/mockFriends): your handle to share, adding by
// handle (sends a pretend request), and your friends with how close their
// taste is to yours and their top-tiered posters. Tap one for their page.
export const FriendsScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const watched = useMovieStore((state) => state.watched);
  const displayName = useProfileStore((state) => state.displayName);
  const [handleInput, setHandleInput] = useState("");
  const [pending, setPending] = useState([]);

  const myHandle = toHandle(displayName);
  const friends = MOCK_FRIENDS.map((friend) => ({
    ...friend,
    match: getTasteMatch(watched, friend.watched),
    topPosters: [...friend.watched]
      .sort((a, b) => (a.tier === "S" ? 0 : 1) - (b.tier === "S" ? 0 : 1))
      .slice(0, POSTERS_SHOWN)
      .map((entry) => getMovieById(entry.movieId))
      .filter(Boolean),
  })).sort((a, b) => (b.match ?? 0) - (a.match ?? 0));

  const sendRequest = () => {
    const raw = handleInput.trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_.]{2,24}$/.test(raw)) {
      showToast("Enter a handle like @sam");
      return;
    }
    const handle = `@${raw}`;
    if (pending.includes(handle)) {
      showToast(`Already sent to ${handle}`);
      return;
    }
    setPending((current) => [handle, ...current]);
    setHandleInput("");
    showToast(`Request sent to ${handle}`, { tone: "success" });
  };

  return (
    <View style={styles.container}>
      <StackHeader title="Friends" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Invite */}
        <View style={styles.inviteCard}>
          <Text style={styles.inviteLabel}>YOUR HANDLE</Text>
          <Pressable
            onPress={async () => {
              await Clipboard.setStringAsync(myHandle);
              showToast("Handle copied", { tone: "success" });
            }}
            hitSlop={6}
          >
            <Text style={styles.inviteHandle}>{myHandle}</Text>
          </Pressable>
          <Text style={styles.inviteHint}>
            Friends add you by this — tap it to copy.
          </Text>
          <PrimaryButton
            label="Invite a friend"
            onPress={() =>
              Share.share({
                message: `Join me on Reelboard — I'm ${myHandle}. Let's compare tier lists.`,
              })
            }
            style={styles.inviteButton}
          />
        </View>

        {/* Add by handle */}
        <View style={styles.addRow}>
          <TextInput
            value={handleInput}
            onChangeText={setHandleInput}
            placeholder="Add by handle, e.g. @sam"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            onSubmitEditing={sendRequest}
            style={styles.addInput}
          />
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.pressed,
            ]}
            onPress={sendRequest}
          >
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
        {pending.map((handle) => (
          <View key={handle} style={styles.pendingRow}>
            <Text style={styles.pendingHandle}>{handle}</Text>
            <Text style={styles.pendingState}>Request sent</Text>
          </View>
        ))}

        {/* Friends */}
        <View style={styles.tag}>
          <Text style={styles.tagText}>FRIENDS</Text>
          <Text style={styles.tagCount}>{friends.length}</Text>
        </View>
        {friends.map((friend) => (
          <Pressable
            key={friend.id}
            style={({ pressed }) => [
              styles.friendCard,
              pressed && styles.pressed,
            ]}
            onPress={() =>
              navigation.navigate("FriendProfile", { friendId: friend.id })
            }
          >
            <View style={styles.friendTop}>
              <FriendAvatar friend={friend} size={46} />
              <View style={styles.friendText}>
                <Text style={styles.friendName} numberOfLines={1}>
                  {friend.name}
                </Text>
                <Text style={styles.friendMeta} numberOfLines={1}>
                  {friend.handle} · Lv {friend.level}{" "}
                  {getLevelName(friend.level)}
                </Text>
              </View>
              <View style={styles.matchPill}>
                <Text style={styles.matchValue}>
                  {friend.match != null ? `${friend.match}%` : "—"}
                </Text>
                <Text style={styles.matchLabel}>taste match</Text>
              </View>
            </View>
            <View style={styles.posterRow}>
              {friend.topPosters.map((movie) => (
                <MoviePoster
                  key={movie.id}
                  uri={movie.poster}
                  style={styles.miniPoster}
                />
              ))}
            </View>
          </Pressable>
        ))}

        <Text style={styles.footnote}>
          Friends is a preview: these are sample profiles for now.
        </Text>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // Bands run edge to edge; text and controls keep the inset.
    content: {
      paddingVertical: spacing.md,
    },
    pressed: {
      opacity: 0.8,
    },
    inviteCard: {
      alignItems: "center",
      padding: spacing.lg,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: `${colors.accent}66`,
    },
    inviteLabel: {
      ...typography.label,
      color: colors.accentLight,
      letterSpacing: 1.5,
    },
    inviteHandle: {
      ...typography.hero,
      fontSize: 28,
      lineHeight: 34,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    inviteHint: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 2,
    },
    inviteButton: {
      alignSelf: "stretch",
      marginTop: spacing.md,
    },
    addRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
    },
    addInput: {
      ...typography.body,
      flex: 1,
      height: 44,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.card,
      color: colors.textPrimary,
    },
    addButton: {
      height: 44,
      paddingHorizontal: spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.sm,
      backgroundColor: colors.selected,
    },
    addButtonText: {
      ...typography.bodyBold,
      color: colors.selectedText,
    },
    pendingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md + spacing.sm,
      paddingTop: spacing.sm,
    },
    pendingHandle: {
      ...typography.bodyBold,
      color: colors.textSecondary,
    },
    pendingState: {
      ...typography.caption,
      color: colors.textMuted,
    },
    tag: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: spacing.sm,
      marginLeft: spacing.md,
      marginTop: spacing.lg,
      marginBottom: spacing.sm + 2,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 4,
      borderRadius: radius.xs,
      backgroundColor: colors.cardElevated,
    },
    tagText: {
      ...typography.label,
      color: colors.textSecondary,
      letterSpacing: 1.2,
    },
    tagCount: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
    },
    friendCard: {
      padding: spacing.md,
      marginBottom: 2,
      backgroundColor: colors.card,
    },
    friendTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
    },
    friendText: {
      flex: 1,
    },
    friendName: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    friendMeta: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 1,
    },
    matchPill: {
      alignItems: "center",
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceSoft,
    },
    matchValue: {
      ...typography.bodyBold,
      color: colors.success,
    },
    matchLabel: {
      ...typography.caption,
      fontSize: 10,
      color: colors.textMuted,
    },
    posterRow: {
      flexDirection: "row",
      gap: 6,
      marginTop: spacing.sm + 2,
    },
    miniPoster: {
      width: 44,
      height: 66,
    },
    footnote: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
    },
  });

export default FriendsScreen;
