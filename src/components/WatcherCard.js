import { Plus, Star } from "lucide-react-native";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "./AppText";

import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { AvatarRankRing } from "./AvatarRankRing";
import { RankBadge } from "./RankBadge";
import { t } from "../i18n";

// Your rarest ranks, shown under the bio.
const TOP_RANKS = 6;
const TOP_RANK_SIZE = 34;

// The top of Profile — and the header of the shared taste image: who you
// are as a watcher at a glance, laid out like a social profile.
//
//   avatar (ring to your next title)   name
//                                      movies · hours · ranks · sagas
//                                      TITLE · ranks to the next one
//   "bio, as a quote"
//   your rarest ranks
//
// mode "profile" is interactive (edit the photo and bio, open sagas);
// mode "share" drops every control so it reads cleanly as an image.
// `title` (getTitle() from utils/ranks) and `showcase` (ranks, rarest
// first) are optional: without them it's a plain avatar, no title line and
// no rank tiles. `ring` (getTitle()) alone draws the avatar's ring to the
// next title; `rankCount` alone shows the ranks number in the stats;
// `nameTitle` (getTitle()) puts your title in a small gold tag after your
// name.
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
  onPressCollections,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const isShare = mode === "share";
  const Touch = isShare ? View : Pressable;

  const statItems = [
    { value: stats.movies, label: stats.movies === 1 ? "movie" : "movies" },
    { value: `${stats.hours}h`, label: "watched" },
    rankCount != null && {
      value: rankCount,
      label: rankCount === 1 ? "rank" : "ranks",
      onPress: onPressRanks,
    },
    { value: stats.completed, label: "sagas", onPress: onPressCollections },
  ].filter(Boolean);

  return (
    <View>
      {/* Avatar beside the headline numbers */}
      <View style={styles.topRow}>
        <Touch
          onPress={onPressAvatar}
          accessibilityLabel={ring ? t("Your ranks") : t("Change profile photo")}
        >
          {ring ? (
            <AvatarRankRing source={avatarSource} title={ring} avatarSize={76} />
          ) : (
            <Image source={avatarSource} style={styles.avatar} />
          )}
        </Touch>
        <View style={styles.side}>
          {/* The name (and your title in a gold tag), over the numbers */}
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            {nameTitle && (
              <Touch
                onPress={onPressRanks}
                hitSlop={6}
                style={styles.titleTag}
                accessibilityLabel={t(nameTitle.name)}
              >
                <Star size={11} color={colors.rating} fill={colors.rating} strokeWidth={2} />
                <Text style={styles.titleTagText} numberOfLines={1}>
                  {t(nameTitle.name)}
                </Text>
              </Touch>
            )}
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
                      {t(label)}
                    </Text>
                  </View>
                </Item>
              );
            })}
          </View>
          {/* Your title, and how far to the next — under the numbers */}
          {title && (
          <Touch
            onPress={onPressAvatar}
            hitSlop={6}
            style={styles.rankRow}
            accessibilityLabel={t("Your ranks")}
          >
            <Text style={styles.rankName} numberOfLines={1}>
              {t(title.name)}
              {!isShare && (
                <Text style={styles.rankNext}>
                  {" · "}
                  {title.next
                    ? t("{count} ranks to {title}", {
                        count: title.toNext,
                        title: t(title.next.name),
                      })
                    : t("The top title")}
                </Text>
              )}
            </Text>
          </Touch>
          )}
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
          accessibilityLabel={bio ? t("Edit bio") : t("Add a bio")}
        >
          {bio ? (
            <Text style={styles.quoteText} numberOfLines={3}>
              “{bio}”
            </Text>
          ) : (
            <View style={styles.addBio}>
              <Plus size={12} color={colors.textMuted} strokeWidth={2.4} />
              <Text style={styles.addBioText}>
                {t("Add your take — a short bio")}
              </Text>
            </View>
          )}
        </Pressable>
      )}

      {/* Your rarest ranks — tap to see them all */}
      {showcase.length > 0 && (
        <Touch
          style={styles.topBadges}
          onPress={onPressRanks}
          accessibilityLabel={t("Your ranks")}
        >
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
        </Touch>
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
    },
    // Natural widths, spread edge to edge: the first number lines up under
    // the name, the last with the right edge.
    stats: {
      flexDirection: "row",
      marginTop: spacing.sm + 2,
      paddingEnd: spacing.xs,
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
      alignItems: "center",
      gap: spacing.sm,
    },
    name: {
      ...typography.title,
      fontSize: 18,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    // Your title after your name: gold on a tint of it.
    titleTag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      flexShrink: 0,
      paddingHorizontal: 7,
      paddingVertical: 2,
      backgroundColor: `${colors.rating}24`,
    },
    titleTagText: {
      ...typography.bodyBold,
      fontSize: 11,
      lineHeight: 14,
      color: colors.rating,
    },
    rankRow: {
      marginTop: spacing.sm,
      alignSelf: "flex-start",
    },
    rankName: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.rating,
    },
    rankNext: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textMuted,
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
      marginStart: 2,
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
