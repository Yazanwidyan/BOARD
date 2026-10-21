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
import { DecideTile } from "./QuickPickBento";

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
          onPress={openFriends}
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

      <View style={styles.section}>
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
        <View style={[styles.padded, styles.together]}>
          <DecideTile
            Icon={Users}
            label={t("Movie night")}
            hint={t("Two people, one phone")}
            onPress={() => navigation.navigate("MovieNight")}
          />
          <DecideTile
            Icon={Smartphone}
            label={t("Group night")}
            hint={t("Everyone on their own phone")}
            onPress={() => navigation.navigate("GroupNight")}
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
    container: {
      paddingTop: spacing.md,
    },
    pressed: {
      opacity: 0.75,
    },
    // Requests waiting on you: first, so they don't go unseen.
    requests: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 4,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.sm + 4,
      backgroundColor: colors.card,
      borderRadius: shape.card,
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
      marginTop: spacing.lg,
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
      ...typography.title,
      fontSize: 18,
      lineHeight: 24,
      letterSpacing: -0.3,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    link: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
    },
    together: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    feed: {
      backgroundColor: colors.card,
      borderRadius: shape.card,
      overflow: "hidden",
    },
    empty: {
      ...typography.body,
      color: colors.textMuted,
    },
  });

export default HomeFriends;
