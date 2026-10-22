import { ChevronRight, Smartphone, UserPlus, Users } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { t, useIsRTL } from "../i18n";
import { useFriends } from "../store/friendsStore";
import { useMovieStore } from "../store/movieStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { ActivityEvent } from "./ActivityEvent";
import { Text } from "./AppText";
import { FriendsRail, SectionEmpty } from "./ProfileSections";
import { ActionList } from "./QuickPickBento";

const FEED_COUNT = 6;

// A section's title, with a link on the right — as Home's other sections.
const SectionTitle = ({ label, linkLabel, onLink, styles }) => (
  <View style={styles.titleRow}>
    <Text style={styles.title} numberOfLines={1}>
      {label}
    </Text>
    {onLink && (
      <Pressable onPress={onLink} hitSlop={8} accessibilityRole="button">
        <Text style={styles.link}>{linkLabel ?? t("See all")}</Text>
      </Pressable>
    )}
  </View>
);

// Home's Friends tab: requests waiting on you, your friends (most like you
// first), the ways to watch together — Movie night on one phone, Group
// night on everyone's — then the latest from your friends.
export const HomeFriends = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const rtl = useIsRTL();
  const { friends, incoming, activity } = useFriends();
  const watched = useMovieStore((state) => state.watched);
  const openFriends = () => navigation.navigate("Friends");
  const now = Date.now();
  const feed = [...activity].sort((a, b) => b.timestamp - a.timestamp).slice(0, FEED_COUNT);

  return (
    <View style={styles.container}>
      {incoming.length > 0 && (
        <Pressable
          style={({ pressed }) => [styles.requests, pressed && styles.pressed]}
          onPress={() => navigation.navigate("Friends", { tab: "requests" })}
          accessibilityRole="button"
        >
          <View style={styles.requestsIcon}>
            <UserPlus size={18} color={colors.selectedText} strokeWidth={2} />
          </View>
          <Text style={styles.requestsText} numberOfLines={1}>
            {t("{count} friend requests", { count: incoming.length })}
          </Text>
          <ChevronRight size={18} color={colors.textMuted} style={rtl && styles.flipped} />
        </Pressable>
      )}

      <View style={[styles.section, incoming.length === 0 && styles.sectionFirst]}>
        <SectionTitle
          label={t("Your friends")}
          onLink={friends.length > 0 ? openFriends : undefined}
          styles={styles}
        />
        {friends.length > 0 ? (
          <FriendsRail
            friends={friends}
            myWatched={watched}
            onOpen={(friend) => navigation.navigate("FriendProfile", { friendId: friend.id })}
            onAdd={openFriends}
          />
        ) : (
          <View style={styles.padded}>
            <SectionEmpty
              line={t("Add friends to compare taste and see what they're watching.")}
              actionLabel={t("Add friends")}
              onPress={openFriends}
            />
          </View>
        )}
      </View>

      <View style={styles.section}>
        <SectionTitle label={t("Watch together")} styles={styles} />
        <View style={styles.padded}>
          <ActionList
            rows={[
              {
                key: "movieNight",
                Icon: Users,
                label: t("Movie night"),
                hint: t("Two people, one phone"),
                onPress: () => navigation.navigate("MovieNight"),
              },
              {
                key: "groupNight",
                Icon: Smartphone,
                label: t("Group night"),
                hint: t("Everyone on their own phone"),
                onPress: () => navigation.navigate("GroupNight"),
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.section}>
        <SectionTitle
          label={t("What your friends are watching")}
          onLink={feed.length > 0 ? () => navigation.navigate("Activity") : undefined}
          styles={styles}
        />
        <View style={styles.padded}>
          {feed.length > 0 ? (
            <View style={styles.feed}>
              {feed.map((event, index) => (
                <ActivityEvent
                  key={event.id}
                  event={event}
                  now={now}
                  divider={index < feed.length - 1}
                  onPress={() => navigation.navigate("FriendProfile", { friendId: event.friendId })}
                  onOpenMovie={(movieId) => navigation.navigate("MovieDetails", { movieId })}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>
              {t("When your friends watch, tier or save films, it shows here.")}
            </Text>
          )}
        </View>
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
      opacity: 0.75,
    },
    // Requests waiting on you: first, so they don't go unseen — a
    // full-width band.
    requests: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 4,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
      backgroundColor: colors.card,
    },
    requestsIcon: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.selected,
      borderRadius: shape.chip,
    },
    requestsText: {
      ...typography.bodyBold,
      flex: 1,
      color: colors.textPrimary,
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
    // The first under the tabs: no line.
    sectionFirst: {
      marginTop: 0,
      paddingTop: 0,
      borderTopWidth: 0,
    },
    padded: {
      paddingHorizontal: spacing.md,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm + 2,
    },
    title: {
      ...typography.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 1.2,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    link: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    feed: {
      marginHorizontal: -spacing.md,
      backgroundColor: colors.card,
      overflow: "hidden",
    },
    empty: {
      ...typography.body,
      color: colors.textMuted,
    },
  });

export default HomeFriends;
