import { Plus } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { AvatarLevelRing } from "./AvatarLevelRing";
import { Medal, getBadgeLook } from "./BadgeMedal";

// Top badges shown under the bio.
const TOP_BADGES = 6;
const TOP_BADGE_SIZE = 34;

// The top of Profile — and the header of the shared taste image: who you
// are as a watcher at a glance, laid out like a social profile.
//
//   avatar (with level ring)   name · level
//                              movies · hours · collections · badges
//   "bio, as a quote"
//   top badges — your best from each track, most valuable first
//
// Badges are just a number here; tapping it opens the Badges screen.
//
// mode "profile" is interactive (open watcher sheet, edit bio, open badges);
// mode "share" drops every control so it reads cleanly as an image.
export const WatcherCard = ({
  mode = "profile",
  displayName,
  handle,
  bio,
  avatarSource,
  level,
  earnedBadgeCount,
  showcase = [],
  allBadges = [],
  stats,
  onPressAvatar,
  onPressBio,
  onPressBadges,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const isShare = mode === "share";
  const Touch = isShare ? View : Pressable;

  const statItems = [
    { value: stats.movies, label: stats.movies === 1 ? "movie" : "movies" },
    { value: `${stats.hours}h`, label: "watched" },
    { value: stats.completed, label: "collections" },
    {
      value: earnedBadgeCount,
      label: earnedBadgeCount === 1 ? "badge" : "badges",
      onPress: onPressBadges,
    },
  ];

  return (
    <View>
      {/* Avatar beside the headline numbers */}
      <View style={styles.topRow}>
        <Touch
          onPress={onPressAvatar}
          accessibilityLabel="Your watcher profile"
        >
          <AvatarLevelRing
            source={avatarSource}
            level={level}
            avatarSize={76}
          />
        </Touch>
        <View style={styles.side}>
          {/* Name · level, over the numbers */}
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            <Touch onPress={onPressAvatar} hitSlop={6} style={styles.levelWrap}>
              <Text style={styles.levelName} numberOfLines={1}>
                · {level.name}
              </Text>
            </Touch>
          </View>
          {isShare && <Text style={styles.handle}>{handle}</Text>}
          <View style={styles.stats}>
            {statItems.map(({ value, label, onPress }) => {
              const tappable = !isShare && !!onPress;
              const Item = tappable ? Pressable : View;
              return (
                <Item
                  key={label}
                  style={styles.stat}
                  onPress={onPress}
                  hitSlop={6}
                  accessibilityRole={tappable ? "button" : undefined}
                  accessibilityLabel={`${value} ${label}`}
                >
                  <Text style={styles.statValue}>{value}</Text>
                  <View style={styles.statLabelRow}>
                    <Text style={styles.statLabel} numberOfLines={1}>
                      {label}
                    </Text>
                  </View>
                </Item>
              );
            })}
          </View>
        </View>
      </View>

      {/* Bio as a quote — your take, not a description */}
      {isShare ? (
        !!bio && (
          <View style={styles.quote}>
            <Text style={styles.quoteText} numberOfLines={3}>
              “{bio}”
            </Text>
          </View>
        )
      ) : (
        <Pressable
          onPress={onPressBio}
          hitSlop={6}
          style={styles.quote}
          accessibilityLabel={bio ? "Edit bio" : "Add a bio"}
        >
          {bio ? (
            <Text style={styles.quoteText} numberOfLines={3}>
              “{bio}”
            </Text>
          ) : (
            <View style={styles.addBio}>
              <Plus size={12} color={colors.textMuted} strokeWidth={2.4} />
              <Text style={styles.addBioText}>Add your take — a short bio</Text>
            </View>
          )}
        </Pressable>
      )}

      {/* Top badges — tap to see them all */}
      {showcase.length > 0 && (
        <Touch
          style={styles.topBadges}
          onPress={onPressBadges}
          accessibilityLabel="Your badges"
        >
          {showcase.slice(0, TOP_BADGES).map((badge) => {
            const { metal, tierIndex } = getBadgeLook(badge, allBadges);
            return (
              <Medal
                key={badge.id}
                badge={badge}
                metal={metal}
                tierIndex={tierIndex}
                size={TOP_BADGE_SIZE}
                showCheck={false}
              />
            );
          })}
          {showcase.length > TOP_BADGES && (
            <Text style={styles.moreBadges}>
              +{showcase.length - TOP_BADGES}
            </Text>
          )}
        </Touch>
      )}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md + 4,
    },
    side: {
      flex: 1,
    },
    // Natural widths, spread edge to edge: the first number lines up under
    // the name, the last with the right edge.
    stats: {
      flexDirection: "row",
      marginTop: spacing.sm + 2,
      paddingRight: spacing.xs,
      justifyContent: "space-between",
    },
    stat: {
      alignItems: "flex-start",
    },
    statValue: {
      ...typography.hero,
      fontSize: 19,
      lineHeight: 24,
      color: colors.textPrimary,
    },
    statLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 1,
    },
    statLabel: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 6,
    },
    name: {
      ...typography.title,
      fontSize: 18,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    levelWrap: {
      flexShrink: 0,
    },
    levelName: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    handle: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 2,
    },
    topBadges: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    moreBadges: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
      marginLeft: 2,
    },
    quote: {
      marginTop: spacing.md,
    },
    quoteText: {
      ...typography.body,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    addBio: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    addBioText: {
      ...typography.body,
      fontSize: 13,
      color: colors.textMuted,
    },
  });

export default WatcherCard;
