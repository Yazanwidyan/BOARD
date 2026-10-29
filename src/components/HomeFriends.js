import { ChevronRight, Plus, UserPlus } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { t, useIsRTL } from "../i18n";
import { useActivitySeenStore } from "../store/activitySeenStore";
import { useAuthStore } from "../store/authStore";
import { useFriends } from "../store/friendsStore";
import { useMovieStore } from "../store/movieStore";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getTasteMatch } from "../utils/friends";
import { ActivityFeed } from "./ActivityFeed";
import { Text } from "./AppText";
import { FriendAvatar } from "./FriendAvatar";
import { FriendsNightCard } from "./HomeBento";

const FACE = 64;

// A section's heading, as Home's: big and bold, a › when it opens
// somewhere, and something at the end (`right`).
const Heading = ({ title, onPress, right, styles, colors, rtl }) => (
  <View style={styles.headingRow}>
    <Pressable
      style={({ pressed }) => [styles.heading, pressed && onPress && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={6}
      accessibilityRole={onPress ? "button" : "header"}
    >
      <Text style={styles.headingText} numberOfLines={1}>
        {title}
      </Text>
      {onPress && <ChevronRight size={22} color={colors.textSecondary} strokeWidth={2.6} style={rtl && styles.flipped} />}
    </Pressable>
    {right}
  </View>
);

// The friends page (FriendsHubScreen) — the one place for what your friends
// are doing:
//   requests   a banner when someone's waiting on you
//   friends    their faces, closest taste first, each with how well your
//              taste matches theirs (their page), then ＋ to find and add
//              people (Friends)
//   together   Movie night: start a night for the group, what they loved
//              that you haven't seen
//   activity   everything they've watched, tiered, saved and earned
// Being here clears the bell's activity count.
export const HomeFriends = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const rtl = useIsRTL();
  const { friends, incoming, activity } = useFriends();
  const watched = useMovieStore((state) => state.watched);
  const userId = useAuthStore((state) => state.user?.id);
  const markSeen = useActivitySeenStore((state) => state.markSeen);

  // Looking here clears the bell — again whenever new events arrive.
  useEffect(() => {
    if (userId) markSeen(userId);
  }, [userId, activity, markSeen]);

  const ranked = friends
    .map((friend) => ({ friend, match: getTasteMatch(watched, friend.watched) }))
    .sort((a, b) => (b.match ?? -1) - (a.match ?? -1));

  return (
    <View>
      {/* Requests waiting on you: first, so they don't go unseen. */}
      {incoming.length > 0 && (
        <Pressable
          style={({ pressed }) => [styles.requests, pressed && styles.pressed]}
          onPress={() => navigation.navigate("Friends", { tab: "requests" })}
          accessibilityRole="button"
        >
          <View style={styles.requestsIcon}>
            <UserPlus size={18} color={colors.brandText} strokeWidth={2.2} />
          </View>
          <View style={styles.requestsWords}>
            <Text style={styles.requestsTitle}>{t("{count} requests", { count: incoming.length })}</Text>
            <Text style={styles.requestsHint} numberOfLines={1}>
              {incoming
                .slice(0, 3)
                .map(({ user }) => user.name.split(" ")[0])
                .join(", ")}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textMuted} strokeWidth={2.4} style={rtl && styles.flipped} />
        </Pressable>
      )}

      {/* Your friends: faces, closest taste first, then ＋. First on the
          page when nobody's waiting on you. */}
      <View style={incoming.length > 0 ? styles.section : styles.first}>
        <Heading
          title={t("Your friends")}
          onPress={() => navigation.navigate("Friends")}
          right={friends.length > 0 && <Text style={styles.count}>{friends.length}</Text>}
          styles={styles}
          colors={colors}
          rtl={rtl}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.faces}>
          {ranked.map(({ friend, match }) => (
            <Pressable
              key={friend.id}
              style={({ pressed }) => [styles.face, pressed && styles.pressed]}
              onPress={() => navigation.navigate("FriendProfile", { friendId: friend.id })}
              accessibilityRole="button"
              accessibilityLabel={match != null ? `${friend.name}, ${match}%` : friend.name}
            >
              <FriendAvatar friend={friend} size={FACE} />
              <Text style={styles.faceName} numberOfLines={1}>
                {friend.name.split(" ")[0]}
              </Text>
              {match != null && <Text style={styles.faceMatch}>{t("{match}% taste", { match })}</Text>}
            </Pressable>
          ))}
          <Pressable
            style={({ pressed }) => [styles.face, pressed && styles.pressed]}
            onPress={() => navigation.navigate("Friends")}
            accessibilityRole="button"
            accessibilityLabel={t("Add friends")}
          >
            <View style={styles.addFace}>
              <Plus size={24} color={colors.textSecondary} strokeWidth={2} />
            </View>
            <Text style={[styles.faceName, styles.faceNameOff]} numberOfLines={1}>
              {t("Add")}
            </Text>
          </Pressable>
        </ScrollView>
        {friends.length === 0 && (
          <Text style={styles.hint}>{t("Compare taste and see what they're watching")}</Text>
        )}
      </View>

      {/* Watching together. */}
      {friends.length > 0 && (
        <View style={styles.section}>
          <Heading title={t("Watch together")} styles={styles} colors={colors} rtl={rtl} />
          <FriendsNightCard navigation={navigation} showFaces={false} style={styles.inset} />
        </View>
      )}

      {/* What they've been up to. */}
      <View style={styles.section}>
        <Heading title={t("Activity")} styles={styles} colors={colors} rtl={rtl} />
        <ActivityFeed navigation={navigation} />
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    pressed: {
      opacity: 0.75,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    // The page's gap under the header comes from the screen; each section
    // brings the one above it.
    section: {
      marginTop: spacing.section,
    },
    first: {
      marginTop: spacing.sm,
    },
    inset: {
      marginHorizontal: spacing.md,
    },
    headingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm + 2,
    },
    heading: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 1,
      gap: 2,
    },
    headingText: {
      fontFamily: fonts.extraBold,
      fontSize: 21,
      lineHeight: 27,
      letterSpacing: -0.3,
      flexShrink: 1,
      color: colors.textPrimary,
    },
    count: {
      ...typography.bodyBold,
      color: colors.textMuted,
    },
    hint: {
      ...typography.caption,
      color: colors.textMuted,
      paddingHorizontal: spacing.md,
      marginTop: spacing.sm,
    },
    // Requests: a card with a red badge, first on the page.
    requests: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginHorizontal: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
    },
    requestsIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brand,
    },
    requestsWords: {
      flex: 1,
      gap: 1,
    },
    requestsTitle: {
      ...typography.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    requestsHint: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    // Faces, in a row you scroll.
    faces: {
      gap: spacing.md,
      paddingHorizontal: spacing.md,
    },
    face: {
      width: FACE + 8,
      alignItems: "center",
    },
    faceName: {
      ...typography.caption,
      fontFamily: fonts.semiBold,
      color: colors.textPrimary,
      marginTop: spacing.xs + 2,
    },
    faceNameOff: {
      color: colors.textMuted,
    },
    faceMatch: {
      ...typography.micro,
      color: colors.success,
      marginTop: 1,
    },
    addFace: {
      width: FACE,
      height: FACE,
      borderRadius: FACE / 2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.border,
    },
  });

export default HomeFriends;
