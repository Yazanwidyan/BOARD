import { ChevronRight, Plus } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { AvatarLevelRing } from "./AvatarLevelRing";
import { Medal, getBadgeLook } from "./BadgeMedal";

const BADGE_COLUMNS = 4;
const MEDAL_SIZE = 46;

// The top of Profile — and the header of the shared taste image: who you
// are as a watcher at a glance. Avatar + level, your best badge from
// every track, and the headline numbers — in Profile's plain style (no
// card around it).
//
// mode "profile" is interactive (copy handle, edit bio, open badges);
// mode "share" drops every control so it reads cleanly as an image.
export const WatcherCard = ({
  mode = "profile",
  displayName,
  handle,
  bio,
  avatarSource,
  level,
  xpToNextLevel,
  showcase,
  allBadges,
  earnedBadgeCount,
  stats,
  onPressAvatar,
  onCopyHandle,
  onPressBio,
  onPressBadges,
  onPressBadge,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const isShare = mode === "share";
  const Touch = isShare ? View : Pressable;

  return (
    <View>
      {/* Identity: avatar (with its level ring) beside name, level, handle,
          bio. Tapping the avatar or level opens the watcher profile sheet. */}
      <View style={styles.identityRow}>
        <Touch onPress={onPressAvatar} accessibilityLabel="Your watcher profile">
          <AvatarLevelRing source={avatarSource} level={level} avatarSize={72} />
        </Touch>
        <View style={styles.identityText}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          <Touch onPress={onPressAvatar} hitSlop={6}>
            <Text style={styles.rankLine} numberOfLines={1}>
              <Text style={styles.levelName}>{level.name}</Text>
              {isShare
                ? ` · Level ${level.level}`
                : ` · ${xpToNextLevel.toLocaleString()} XP to Level ${level.level + 1}`}
            </Text>
          </Touch>
          {isShare ? (
            <Text style={styles.handle}>{handle}</Text>
          ) : (
            <Pressable onPress={onCopyHandle} hitSlop={6}>
              <Text style={styles.handle}>{handle} · Copy</Text>
            </Pressable>
          )}
          {isShare ? (
            !!bio && (
              <Text style={[styles.bio, styles.bioShare]} numberOfLines={2}>
                {bio}
              </Text>
            )
          ) : (
            <Pressable onPress={onPressBio} hitSlop={6} style={styles.bioButton}>
              {!bio && (
                <Plus size={12} color={colors.accentLight} strokeWidth={2.4} />
              )}
              <Text
                style={[styles.bio, !bio && styles.bioPlaceholder]}
                numberOfLines={2}
              >
                {bio || "Add a bio"}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Headline numbers — one compact line, like a social profile */}
      <View style={styles.statsInline}>
        {[
          [stats.movies, stats.movies === 1 ? "movie" : "movies"],
          [`${stats.hours}h`, "watched"],
          [stats.completed, "full sets"],
        ].map(([value, label], index) => (
          <View key={label} style={styles.statInlineWrap}>
            {index > 0 && <View style={styles.statDivider} />}
            <View style={styles.statInline}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Badges — your best from every track */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Badges</Text>
        <Text style={styles.badgeCount}>{earnedBadgeCount} earned</Text>
        <View style={styles.spacer} />
        {!isShare && (
          <Pressable
            onPress={onPressBadges}
            hitSlop={8}
            style={styles.allButton}
          >
            <Text style={styles.allText}>All</Text>
            <ChevronRight size={14} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
      {showcase.length > 0 ? (
        <View style={styles.badgeRow}>
          {showcase.map((badge) => {
            const { metal, tierIndex } = getBadgeLook(badge, allBadges);
            return (
              <Touch
                key={badge.id}
                style={styles.badgeSlot}
                onPress={() => onPressBadge?.(badge)}
              >
                <Medal
                  badge={badge}
                  metal={metal}
                  tierIndex={tierIndex}
                  size={MEDAL_SIZE}
                  showCheck={false}
                />
                <Text style={styles.badgeLabel} numberOfLines={2}>
                  {badge.label}
                </Text>
              </Touch>
            );
          })}
        </View>
      ) : (
        <Text style={styles.badgeEmpty}>Badges you earn show up here.</Text>
      )}

    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    identityRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    identityText: {
      flex: 1,
      gap: 2,
    },
    name: {
      ...typography.title,
      fontSize: 20,
      color: colors.textPrimary,
    },
    rankLine: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    levelName: {
      ...typography.bodyBold,
      fontSize: 12,
      color: colors.accentLight,
    },
    handle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    bioButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: spacing.xs,
    },
    bio: {
      ...typography.body,
      fontSize: 13,
      color: colors.textPrimary,
      lineHeight: 17,
      flexShrink: 1,
    },
    bioShare: {
      marginTop: spacing.xs,
    },
    bioPlaceholder: {
      color: colors.accentLight,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textSecondary,
    },
    badgeCount: {
      ...typography.caption,
      color: colors.textMuted,
    },
    spacer: {
      flex: 1,
    },
    allButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    allText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    // Four per row, wrapping — every track you've earned in gets a spot.
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      rowGap: spacing.sm + 2,
    },
    badgeSlot: {
      width: `${100 / BADGE_COLUMNS}%`,
      alignItems: "center",
      paddingHorizontal: 2,
    },
    badgeLabel: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 14,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: spacing.xs + 2,
    },
    badgeEmpty: {
      ...typography.caption,
      color: colors.textMuted,
    },
    statsInline: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing.md,
    },
    statInlineWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    statDivider: {
      width: 1,
      height: 28,
      backgroundColor: colors.border,
    },
    statInline: {
      flex: 1,
      alignItems: "center",
    },
    statValue: {
      ...typography.hero,
      fontSize: 20,
      lineHeight: 24,
      color: colors.textPrimary,
    },
    statLabel: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
  });

export default WatcherCard;
