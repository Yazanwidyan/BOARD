import { Pencil } from "lucide-react-native";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "./AppText";

import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { AvatarRankRing } from "./AvatarRankRing";
import { RankBadge } from "./RankBadge";
import { t } from "../i18n";

// Your rarest ranks, shown under the bio on the shared image.
const TOP_RANKS = 6;
const TOP_RANK_SIZE = 34;

// The top of Profile — and the header of the shared taste image: who you
// are as a watcher at a glance, laid out like a social profile.
//
//   avatar (ring to your next title)   name
//                                      [ ranks · title ]   (a gold pill)
//   movies   watched   collections   friends
//   your bio ……………………………………………… ✎
//
// mode "profile" is interactive (edit the photo and bio, open sagas);
// mode "share" drops every control so it reads cleanly as an image, and
// adds your rarest ranks under the bio.
// `title` (getTitle() from utils/ranks) and `showcase` (ranks, rarest
// first) are optional: without them it's a plain avatar and no pill.
// `ring` (getTitle()) alone draws the avatar's ring to the next title;
// `rankCount` is the number in the pill; `stats.friends`, when given,
// shows how many friends (tap: `onPressFriends`). `nameTitle` (getTitle())
// names the title in the pill when `title` isn't given.
export const WatcherCard = ({
  mode = "profile",
  displayName,
  handle,
  bio,
  avatarSource,
  title,
  ring = title,
  rankCount = title?.count,
  nameTitle,
  showcase = [],
  stats,
  onPressAvatar,
  onPressBio,
  onPressRanks,
  onPressFriends,
  onPressCollections,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const isShare = mode === "share";
  const Touch = isShare ? View : Pressable;
  // The pill names your title: the given one, or the ring's.
  const pillTitle = title ?? nameTitle ?? ring;
  const pillCount = rankCount ?? pillTitle?.count;

  const statItems = [
    { value: stats.movies, label: stats.movies === 1 ? "movie" : "movies" },
    { value: `${stats.hours}h`, label: "watched" },
    { value: stats.completed, label: "collections", onPress: onPressCollections },
    stats.friends != null && {
      value: stats.friends,
      label: stats.friends === 1 ? "friend" : "friends",
      onPress: onPressFriends,
    },
  ].filter(Boolean);

  return (
    <View>
      {/* The avatar, your name, and your rank in a gold pill */}
      <View style={styles.topRow}>
        <Touch
          onPress={onPressAvatar}
          accessibilityLabel={ring ? t("Your ranks") : t("Change profile photo")}
        >
          {ring ? (
            <AvatarRankRing
              source={avatarSource}
              title={ring}
              avatarSize={76}
              color={colors.success}
              tag={false}
            />
          ) : (
            <Image source={avatarSource} style={styles.avatar} />
          )}
        </Touch>
        <View style={styles.side}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          {isShare && <Text style={styles.handle}>{handle}</Text>}
          {pillTitle && (
            <Touch
              onPress={onPressRanks}
              hitSlop={6}
              style={styles.pill}
              accessibilityLabel={t("Your ranks")}
            >
              <Text style={styles.pillText} numberOfLines={1}>
                {pillCount != null ? `${pillCount} · ` : ""}
                {t(pillTitle.name)}
              </Text>
            </Touch>
          )}
        </View>
      </View>

      {/* The numbers, across */}
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
              <Text style={styles.statLabel} numberOfLines={1}>
                {t(label)}
              </Text>
            </Item>
          );
        })}
      </View>

      {/* Your bio, with a pencil to edit it */}
      {isShare ? (
        !!bio && (
          <Text style={[styles.bioText, styles.bio]} numberOfLines={3}>
            “{bio}”
          </Text>
        )
      ) : (
        <Pressable
          onPress={onPressBio}
          hitSlop={6}
          style={styles.bio}
          accessibilityLabel={bio ? t("Edit bio") : t("Add a bio")}
        >
          <Text style={[styles.bioText, !bio && styles.bioEmpty]} numberOfLines={3}>
            {bio ? `“${bio}”` : t("Add your take — a short bio")}
          </Text>
          <Pencil size={16} color={colors.textSecondary} strokeWidth={1.9} />
        </Pressable>
      )}

      {/* On the shared image: your rarest ranks */}
      {isShare && showcase.length > 0 && (
        <View style={styles.topBadges}>
          {showcase.slice(0, TOP_RANKS).map((rank) => (
            <RankBadge
              key={rank.id}
              track={rank.track}
              step={rank}
              size={TOP_RANK_SIZE}
            />
          ))}
          {showcase.length > TOP_RANKS && (
            <Text style={styles.moreBadges}>
              +{showcase.length - TOP_RANKS}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.card,
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md + 4,
    },
    side: {
      flex: 1,
      alignItems: "flex-start",
      gap: spacing.sm,
    },
    name: {
      ...typography.hero,
      fontSize: 24,
      lineHeight: 30,
      color: colors.textPrimary,
    },
    // Your rank: a gold pill, dark text.
    pill: {
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: 4,
      backgroundColor: colors.rating,
      borderRadius: shape.control - 2,
    },
    pillText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: "#0C1014",
    },
    // Four numbers, evenly across the full width.
    stats: {
      flexDirection: "row",
      marginTop: spacing.lg,
    },
    stat: {
      flex: 1,
      alignItems: "center",
      gap: 2,
    },
    statValue: {
      ...typography.hero,
      fontSize: 18,
      lineHeight: 24,
      color: colors.textPrimary,
    },
    statLabel: {
      ...typography.caption,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
    },
    handle: {
      ...typography.caption,
      color: colors.textMuted,
    },
    bio: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    bioText: {
      ...typography.body,
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
    },
    bioEmpty: {
      color: colors.textMuted,
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
      lineHeight: 18,
      color: colors.textSecondary,
      marginStart: 2,
    },
  });

export default WatcherCard;
