import { Plus } from "lucide-react-native";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { Text } from "./AppText";

import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { t } from "../i18n";

// The top of Profile — and the header of the shared taste image: who you
// are as a watcher at a glance, centred like a social profile.
//
//                         avatar
//                          name
//     movies    hours    collections    friends
//                   "bio, as a quote"
//
// mode "profile" is interactive (edit the photo and bio, open sagas);
// mode "share" drops every control so it reads cleanly as an image.
// `stats.friends`, when given, shows how many friends (tap:
// `onPressFriends`).
export const WatcherCard = ({
  mode = "profile",
  displayName,
  handle,
  bio,
  avatarSource,
  stats,
  onPressAvatar,
  onPressBio,
  onPressFriends,
  onPressCollections,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const isShare = mode === "share";
  const Touch = isShare ? View : Pressable;

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
      {/* Avatar beside the headline numbers */}
      <View style={styles.topRow}>
        <Touch onPress={onPressAvatar} accessibilityLabel={t("Change profile photo")}>
          <Image source={avatarSource} style={styles.avatar} />
        </Touch>
        <View style={styles.side}>
          {/* The name, over the numbers */}
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
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
    // Centred: the avatar on top, everything under it.
    topRow: {
      alignItems: "center",
      gap: spacing.md,
    },
    side: {
      alignSelf: "stretch",
      alignItems: "center",
    },
    // Evenly across the full width, under the name.
    stats: {
      flexDirection: "row",
      alignSelf: "stretch",
      justifyContent: "space-around",
      marginTop: spacing.md,
    },
    stat: {
      alignItems: "center",
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
      justifyContent: "center",
      gap: spacing.sm,
    },
    name: {
      ...typography.title,
      fontSize: 22,
      lineHeight: 28,
      color: colors.textPrimary,
      flexShrink: 1,
      textAlign: "center",
    },
    handle: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 2,
      textAlign: "center",
    },
    quote: {
      marginTop: spacing.md,
      alignItems: "center",
    },
    quoteText: {
      ...typography.body,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      textAlign: "center",
    },
    addBio: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    addBioText: {
      ...typography.body,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
    },
  });

export default WatcherCard;
