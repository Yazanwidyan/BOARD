import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../components/AppText";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActivityEvent } from "../components/ActivityEvent";
import { FriendAvatar } from "../components/FriendAvatar";
import {
  StackHeader,
  useStackHeaderScroll,
} from "../components/ScreenHeader";
import { useFriends } from "../store/friendsStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { t } from "../i18n";

const DAY = 24 * 60 * 60 * 1000;
const AVATARS_SHOWN = 5;

// Activity: what your friends have been watching, tiering, saving and
// finishing, newest first, grouped by age (from the ReelBoard server).
// Tap an event for that friend's page, a poster for the movie.
export const ActivityScreen = ({ navigation }) => {
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { friends, activity, loaded, loading, error } = useFriends();

  const now = Date.now();
  const groups = groupByAge(
    [...activity].sort((a, b) => b.timestamp - a.timestamp),
    now,
  );
  const openMovie = (movieId) =>
    navigation.navigate("MovieDetails", { movieId });

  return (
    <View style={styles.container}>
      <StackHeader
        title={t("Activity")}
        onBack={() => navigation.goBack()}
        scrollY={headerScroll.scrollY}
      />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Your friends */}
        <Pressable
          style={({ pressed }) => [
            styles.friendsStrip,
            pressed && styles.pressed,
          ]}
          onPress={() => navigation.navigate("Friends")}
        >
          <View style={styles.avatarStack}>
            {friends.slice(0, AVATARS_SHOWN).map((friend, index) => (
              <FriendAvatar
                key={friend.id}
                friend={friend}
                size={34}
                style={index > 0 && styles.avatarOverlap}
              />
            ))}
          </View>
          <View style={styles.friendsText}>
            <Text style={styles.friendsTitle}>
              {t("{count} friends", { count: friends.length })}
            </Text>
            <Text style={styles.friendsSubtitle}>
              {t("Compare tiers · invite more")}
            </Text>
          </View>
          <Text style={styles.friendsLink}>{t("See all")}</Text>
        </Pressable>

        {groups.map((group) => (
          <View key={group.key}>
            <Text style={styles.tagText}>{group.label}</Text>
            <View style={styles.feed}>
              {group.items.map((event, index) => (
                <ActivityEvent
                  key={event.id}
                  event={event}
                  now={now}
                  divider={index > 0}
                  onPress={() =>
                    navigation.navigate("FriendProfile", {
                      friendId: event.friendId,
                    })
                  }
                  onOpenMovie={openMovie}
                />
              ))}
            </View>
          </View>
        ))}

        {loaded && activity.length === 0 && (
          <Text style={styles.footnote}>
            {friends.length === 0
              ? t("Add friends to see what they're watching.")
              : t("Nothing yet — your friends' watches and tiers show up here.")}
          </Text>
        )}
        {!loaded && loading && (
          <Text style={styles.footnote}>{t("Loading…")}</Text>
        )}
        {!!error && (
          <Text style={styles.footnote}>
            {t("Couldn't load activity: {error}", { error })}
          </Text>
        )}
      </Animated.ScrollView>
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
    friendsStrip: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      padding: spacing.md,
      backgroundColor: colors.card,
    },
    avatarStack: {
      flexDirection: "row",
    },
    avatarOverlap: {
      marginStart: -10,
    },
    friendsText: {
      flex: 1,
    },
    friendsTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    friendsSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    friendsLink: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    // Section caption, like Settings.
    tagText: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    // Edge to edge, square corners.
    feed: {
      backgroundColor: colors.card,
    },
    footnote: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.lg,
      paddingHorizontal: spacing.md,
    },
  });

export default ActivityScreen;
