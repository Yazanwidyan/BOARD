import { ChevronRight, UserPlus, Users } from "lucide-react-native";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { t, useIsRTL } from "../i18n";
import { useActivitySeenStore } from "../store/activitySeenStore";
import { useAuthStore } from "../store/authStore";
import { useFriends } from "../store/friendsStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { ActivityFeed } from "./ActivityFeed";
import { Text } from "./AppText";
import { FriendAvatar } from "./FriendAvatar";
import { ActionList } from "./QuickPickBento";

const AVATARS_SHOWN = 4;

// A section's title — as Home's other sections.
const SectionTitle = ({ label, styles }) => (
  <View style={styles.titleRow}>
    <Text style={styles.title} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

// Home's Friends tab — the one place for what your friends are doing:
//   your friends   a row of faces (and requests waiting on you), opening
//                  Friends, where people are found, added and answered
//   together       Watch together: start a night for the group (one phone
//                  or everyone's), or join one with a code
//   activity       everything they've watched, tiered, saved and earned
// Being here clears the bell's activity count.
export const HomeFriends = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const rtl = useIsRTL();
  const { friends, incoming, activity } = useFriends();
  const userId = useAuthStore((state) => state.user?.id);
  const markSeen = useActivitySeenStore((state) => state.markSeen);

  // Looking here clears the bell — again whenever new events arrive.
  useEffect(() => {
    if (userId) markSeen(userId);
  }, [userId, activity, markSeen]);

  return (
    <View style={styles.container}>
      {/* Your friends — and requests waiting on you — in one row. */}
      <Pressable
        style={({ pressed }) => [styles.friendsRow, pressed && styles.pressed]}
        onPress={() => navigation.navigate("Friends", incoming.length > 0 ? { tab: "requests" } : undefined)}
        accessibilityRole="button"
      >
        {friends.length > 0 ? (
          <View style={styles.avatarStack}>
            {friends.slice(0, AVATARS_SHOWN).map((friend, index) => (
              <FriendAvatar
                key={friend.id}
                friend={friend}
                size={34}
                style={[index > 0 && styles.avatarOverlap, { borderColor: colors.card }]}
              />
            ))}
          </View>
        ) : (
          <View style={styles.addIcon}>
            <UserPlus size={18} color={colors.textPrimary} strokeWidth={2} />
          </View>
        )}
        <View style={styles.friendsText}>
          <Text style={styles.friendsTitle} numberOfLines={1}>
            {friends.length > 0 ? t("{count} friends", { count: friends.length }) : t("Add friends")}
          </Text>
          <Text style={styles.friendsHint} numberOfLines={1}>
            {friends.length > 0 ? t("Find, add and manage friends") : t("Compare taste and see what they're watching")}
          </Text>
        </View>
        {incoming.length > 0 && (
          <View style={styles.requestsPill}>
            <Text style={styles.requestsText}>{t("{count} requests", { count: incoming.length })}</Text>
          </View>
        )}
        <ChevronRight size={18} color={colors.textMuted} style={rtl && styles.flipped} />
      </Pressable>

      <View style={styles.section}>
        <SectionTitle label={t("Watch together")} styles={styles} />
        <View style={styles.padded}>
          <ActionList
            rows={[
              {
                key: "together",
                Icon: Users,
                label: t("Watch together"),
                hint: t("Start a night for the group, or join one with a code"),
                onPress: () => navigation.navigate("WatchTogether"),
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle label={t("What your friends are watching")} styles={styles} />
        <ActivityFeed navigation={navigation} />
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // The page's gap under the tabs comes from Home; the sections bring
    // their own lines and gaps.
    container: {},
    pressed: {
      backgroundColor: colors.cardElevated,
    },
    // Your friends: a full-width band, first so requests don't go unseen.
    friendsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 60,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      backgroundColor: colors.card,
    },
    avatarStack: {
      flexDirection: "row",
    },
    avatarOverlap: {
      marginStart: -12,
    },
    addIcon: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevatedLight,
      borderRadius: shape.chip,
    },
    friendsText: {
      flex: 1,
      gap: 2,
    },
    friendsTitle: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    friendsHint: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    requestsPill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      backgroundColor: colors.selected,
      borderRadius: shape.chip,
    },
    requestsText: {
      ...typography.bodyBold,
      fontSize: 11,
      lineHeight: 15,
      color: colors.selectedText,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    section: {
      marginTop: spacing.md + 4,
      paddingTop: spacing.md + 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    padded: {
      paddingHorizontal: spacing.md,
    },
    titleRow: {
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm + 2,
    },
    title: {
      ...typography.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 1.2,
      color: colors.textSecondary,
    },
  });

export default HomeFriends;
