import {
  CalendarDays,
  Check,
  Clapperboard,
  Film,
  Layers,
  Sparkles,
  Star,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getMovieById } from "../data/movies";
import { t } from "../i18n";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { ALL_DECADES, ALL_GENRES } from "../utils/movieFilters";
import { isRated } from "../utils/tiers";
import {
  DIRECTOR_DEPTH_FILMS,
  DIRECTOR_DEPTH_XP,
  LEVEL_NAMES,
  NEW_DECADE_XP,
  NEW_GENRE_XP,
  RANK_XP,
  RATE_XP,
  WATCH_XP,
  getLevel,
  getXPBreakdown,
} from "../utils/xp";
import { Text } from "./AppText";
import { AvatarLevelRing } from "./AvatarLevelRing";
import { BottomSheet } from "./BottomSheet";

// "Your watcher profile", reimagined: not a rules card but a picture of
// you as a watcher, top to bottom —
//
//   who you are    avatar in its level ring, the big level, the rank, a
//                  bar that fills as it opens, and what's left in movies
//   the ladder     all six ranks, yours lit, past ones ticked
//   your XP        where it actually came from — one bar split by source,
//                  then a row each with the count behind it
//   easy wins      real next steps from your own history (genres and
//                  decades you've never tried, a director one film from
//                  depth, movies waiting for a tier)
//   how it works   the earning rules, compact, and the no-decay promise
//
// Everything is derived from the watched list, like XP itself.

const EASE = { duration: 700, easing: Easing.out(Easing.cubic) };
const SECTION_IN = (index) =>
  FadeInDown.duration(320)
    .easing(Easing.out(Easing.cubic))
    .delay(80 + index * 70);

// One colour per XP source — the tier palette, so it sits with the app.
const SOURCES = [
  { key: "watched", label: "Movies watched", Icon: Film, color: "#8FD3F5" },
  { key: "genres", label: "Genres explored", Icon: Sparkles, color: "#A4E59B" },
  {
    key: "decades",
    label: "Decades explored",
    Icon: CalendarDays,
    color: "#F8E08E",
  },
  {
    key: "directors",
    label: "Directors known",
    Icon: Clapperboard,
    color: "#F5B98F",
  },
  {
    key: "collections",
    label: "Saga ranks reached",
    Icon: Layers,
    color: "#F6A0AC",
  },
  { key: "rated", label: "Movies tiered", Icon: Star, color: "#C8C9CC" },
];

const RULES = [
  { label: "Watch a movie", xp: WATCH_XP, Icon: Film },
  { label: "First of a genre", xp: NEW_GENRE_XP, Icon: Sparkles },
  { label: "First of a decade", xp: NEW_DECADE_XP, Icon: CalendarDays },
  {
    label: "3 films by a director",
    xp: DIRECTOR_DEPTH_XP,
    Icon: Clapperboard,
  },
  { label: "Reach a saga rank", xp: RANK_XP, Icon: Layers },
  { label: "Tier a movie", xp: RATE_XP, Icon: Star },
];

// Every genre and decade there is to try.
const catalogGenres = () => ALL_GENRES;
const catalogDecades = () => ALL_DECADES;

const listNames = (names, max = 3) =>
  names.length > max
    ? `${names.slice(0, max).map((name) => t(name)).join(", ")} +${names.length - max}`
    : names.map((name) => t(name)).join(", ");

// The next few cheap XP moves, from the user's own history.
const getEasyWins = (watched, breakdown) => {
  const wins = [];
  const untriedGenres = catalogGenres().filter(
    (genre) => !breakdown.genres.includes(genre),
  );
  if (untriedGenres.length > 0) {
    wins.push({
      key: "genre",
      Icon: Sparkles,
      color: "#A4E59B",
      title: t("{count} genres you haven't tried", {
        count: untriedGenres.length,
      }),
      detail: listNames(untriedGenres),
      xp: NEW_GENRE_XP,
    });
  }
  const untriedDecades = catalogDecades().filter(
    (decade) => !breakdown.decades.includes(decade),
  );
  if (untriedDecades.length > 0) {
    wins.push({
      key: "decade",
      Icon: CalendarDays,
      color: "#F8E08E",
      title: t("{count} decades to visit", { count: untriedDecades.length }),
      detail: listNames(untriedDecades.map((decade) => t("The {decade}", { decade }))),
      xp: NEW_DECADE_XP,
    });
  }
  // Directors one film short of depth.
  const counts = new Map();
  watched.forEach((entry) => {
    const movie = getMovieById(entry.movieId);
    if (movie) counts.set(movie.director, (counts.get(movie.director) ?? 0) + 1);
  });
  const close = [...counts.entries()]
    .filter(([, count]) => count === DIRECTOR_DEPTH_FILMS - 1)
    .map(([director]) => director);
  if (close.length > 0) {
    wins.push({
      key: "director",
      Icon: Clapperboard,
      color: "#F5B98F",
      title:
        close.length === 1
          ? t("1 film from knowing {director}", { director: close[0] })
          : t("{count} directors one film away", { count: close.length }),
      detail: close.length === 1 ? null : listNames(close),
      xp: DIRECTOR_DEPTH_XP,
    });
  }
  const untiered = watched.filter((entry) => !isRated(entry)).length;
  if (untiered > 0) {
    wins.push({
      key: "tier",
      Icon: Star,
      color: "#C8C9CC",
      title: t("{count} watched movies to tier", { count: untiered }),
      detail: null,
      xp: RATE_XP,
    });
  }
  return wins;
};

// A bar that fills from empty once, as the sheet opens.
const FillBar = ({ progress, color, styles }) => {
  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withDelay(200, withTiming(progress, EASE));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    width: `${Math.max(fill.value, 0.015) * 100}%`,
  }));
  return (
    <View style={styles.barTrack}>
      <Animated.View style={[styles.barFill, { backgroundColor: color }, style]} />
    </View>
  );
};

// One bar split by XP source, revealed left to right.
const SourceBar = ({ parts, total, styles }) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = withDelay(350, withTiming(1, EASE));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ width: `${reveal.value * 100}%` }));
  return (
    <View
      style={styles.sourceTrack}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.sourceReveal, style]}>
        <View style={[styles.sourceRow, { width: trackWidth }]}>
          {parts.map((part) => (
            <View
              key={part.key}
              style={{
                flex: part.xp / total,
                backgroundColor: part.color,
              }}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

export const WatcherProfileSheet = ({
  visible,
  onClose,
  watched,
  avatarSource,
  displayName,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();

  const breakdown = getXPBreakdown(watched);
  const total = breakdown.total;
  const level = getLevel(total);
  const toGo = Math.max(0, Math.ceil(level.requiredXP - level.currentXP));
  const moviesAway = Math.max(1, Math.ceil(toGo / WATCH_XP));

  const counts = {
    watched: breakdown.xp.watched / WATCH_XP,
    genres: breakdown.genres.length,
    decades: breakdown.decades.length,
    directors: breakdown.deepDirectors.length,
    collections: breakdown.xp.collections / RANK_XP,
    rated: breakdown.xp.rated / RATE_XP,
  };
  const parts = SOURCES.map((source) => ({
    ...source,
    xp: breakdown.xp[source.key],
    count: counts[source.key],
  })).filter((part) => part.xp > 0);
  const wins = getEasyWins(watched, breakdown);

  // The ladder: each rank's level range, and where you are on it.
  const ladder = LEVEL_NAMES.map(({ through, name }, index) => {
    const from = index === 0 ? 1 : LEVEL_NAMES[index - 1].through + 1;
    return {
      name,
      range: Number.isFinite(through) ? `${from}–${through}` : `${from}+`,
      state:
        level.level > through
          ? "past"
          : level.level >= from
            ? "current"
            : "future",
    };
  });

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("Your watcher profile")}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Who you are */}
        <Animated.View entering={SECTION_IN(0)} style={styles.hero}>
          <AvatarLevelRing source={avatarSource} level={level} avatarSize={72} />
          <View style={styles.heroText}>
            <Text style={styles.heroName} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.levelLine}>
              <Text style={styles.levelNumber}>{level.level}</Text>
              <View style={styles.levelCaption}>
                <Text style={styles.levelLabel}>{t("Level")}</Text>
                <Text style={[styles.rankName, { color: colors.rating }]}>
                  {level.name}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={SECTION_IN(1)} style={styles.progressBlock}>
          <View style={styles.progressTop}>
            <Text style={styles.progressXP}>
              {total.toLocaleString()} {t("XP")}
            </Text>
            <Text style={styles.progressNext}>
              {t("{count} XP to level {level}", {
                count: toGo.toLocaleString(),
                level: level.level + 1,
              })}
            </Text>
          </View>
          <FillBar progress={level.progress} color={colors.rating} styles={styles} />
          <Text style={styles.progressHint}>
            {moviesAway === 1
              ? t("About one more movie")
              : t("About {count} more movies — fewer if they're new to you", {
                  count: moviesAway,
                })}
          </Text>
        </Animated.View>

        {/* The ladder */}
        <Animated.View entering={SECTION_IN(2)}>
          <Text style={styles.sectionLabel}>{t("Rank ladder")}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ladder}
          >
            {ladder.map((rank) => (
              <View
                key={rank.name}
                style={[
                  styles.rank,
                  rank.state === "current" && {
                    borderColor: colors.rating,
                    backgroundColor: `${colors.rating}1F`,
                  },
                  rank.state === "future" && styles.rankFuture,
                ]}
              >
                <View style={styles.rankTop}>
                  <Text style={styles.rankRange}>
                    {t("Lv")} {rank.range}
                  </Text>
                  {rank.state === "past" && (
                    <Check size={14} color={colors.success} strokeWidth={3} />
                  )}
                </View>
                <Text
                  style={[
                    styles.rankTitle,
                    rank.state === "current" && { color: colors.rating },
                  ]}
                  numberOfLines={2}
                >
                  {rank.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Your XP */}
        {parts.length > 0 && (
          <Animated.View entering={SECTION_IN(3)}>
            <Text style={styles.sectionLabel}>{t("Where your XP comes from")}</Text>
            <SourceBar parts={parts} total={total} styles={styles} />
            <View style={styles.list}>
              {parts.map(({ key, label, Icon, color, xp, count }) => (
                <View key={key} style={styles.listRow}>
                  <View style={[styles.iconTile, { backgroundColor: `${color}26` }]}>
                    <Icon size={18} color={color} strokeWidth={2.2} />
                  </View>
                  <View style={styles.listText}>
                    <Text style={styles.listTitle}>{label}</Text>
                    <Text style={styles.listDetail}>
                      {count} · {Math.round((xp / total) * 100)}%
                    </Text>
                  </View>
                  <Text style={[styles.listXP, { color }]}>
                    {xp.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Easy wins */}
        {wins.length > 0 && (
          <Animated.View entering={SECTION_IN(4)}>
            <Text style={styles.sectionLabel}>{t("Easy wins")}</Text>
            <View style={styles.list}>
              {wins.map(({ key, Icon, color, title, detail, xp }) => (
                <View key={key} style={styles.listRow}>
                  <View style={[styles.iconTile, { backgroundColor: `${color}26` }]}>
                    <Icon size={18} color={color} strokeWidth={2.2} />
                  </View>
                  <View style={styles.listText}>
                    <Text style={styles.listTitle} numberOfLines={1}>
                      {title}
                    </Text>
                    {!!detail && (
                      <Text style={styles.listDetail} numberOfLines={1}>
                        {detail}
                      </Text>
                    )}
                  </View>
                  <View style={styles.xpPill}>
                    <Text style={styles.xpPillText}>
                      {t("+{xp} each", { xp })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* How it works */}
        <Animated.View entering={SECTION_IN(5)}>
          <Text style={styles.sectionLabel}>{t("How XP is earned")}</Text>
          <View style={styles.rules}>
            {RULES.map(({ label, xp, Icon }) => (
              <View key={label} style={styles.rule}>
                <Icon size={16} color={colors.textSecondary} strokeWidth={2} />
                <Text style={styles.ruleXP}>+{xp}</Text>
                <Text style={styles.ruleLabel} numberOfLines={2}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.note}>
            {t(
              "XP only grows from what you watch — it never decays, and there are no streaks or deadlines.",
            )}
          </Text>
        </Animated.View>

        <View style={{ height: insets.bottom + spacing.lg }} />
      </ScrollView>
    </BottomSheet>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // Who you are
    hero: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingTop: spacing.xs,
    },
    heroText: {
      flex: 1,
    },
    heroName: {
      ...typography.bodyBold,
      color: colors.textSecondary,
    },
    levelLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
    },
    levelNumber: {
      ...typography.display,
      fontSize: 52,
      lineHeight: 58,
      letterSpacing: -1.5,
      color: colors.textPrimary,
    },
    levelCaption: {
      flex: 1,
    },
    levelLabel: {
      ...typography.caption,
      color: colors.textMuted,
    },
    rankName: {
      ...typography.title,
      fontSize: 18,
    },

    // Progress
    progressBlock: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
      gap: spacing.sm,
    },
    progressTop: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    progressXP: {
      ...typography.title,
      fontSize: 18,
      color: colors.textPrimary,
    },
    progressNext: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    barTrack: {
      height: 10,
      backgroundColor: colors.surfaceSoft,
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
    },
    progressHint: {
      ...typography.caption,
      color: colors.textMuted,
    },

    // Sections
    sectionLabel: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },

    // Ladder
    ladder: {
      gap: spacing.sm,
    },
    rank: {
      width: 112,
      padding: spacing.sm + 2,
      gap: 4,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    rankFuture: {
      opacity: 0.45,
    },
    rankTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    rankRange: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
    },
    rankTitle: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 18,
      color: colors.textPrimary,
    },

    // XP sources
    sourceTrack: {
      height: 14,
      backgroundColor: colors.surfaceSoft,
      overflow: "hidden",
      marginBottom: spacing.sm,
    },
    sourceReveal: {
      height: "100%",
      overflow: "hidden",
    },
    // The split itself is laid out at full width inside the reveal, so the
    // proportions don't squash while it opens.
    sourceRow: {
      flexDirection: "row",
      height: "100%",
      gap: 2,
    },

    // Rows (sources and wins)
    list: {
      gap: 2,
    },
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.sm + 4,
      backgroundColor: colors.card,
    },
    iconTile: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
    },
    listText: {
      flex: 1,
      gap: 2,
    },
    listTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    listDetail: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    listXP: {
      ...typography.title,
      fontSize: 16,
    },
    xpPill: {
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: `${colors.rating}66`,
    },
    xpPillText: {
      ...typography.bodyBold,
      fontSize: 12,
      color: colors.rating,
    },

    // How it works
    rules: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 2,
    },
    // Three to a row.
    rule: {
      flexGrow: 1,
      flexBasis: "30%",
      padding: spacing.sm + 2,
      gap: 4,
      backgroundColor: colors.card,
    },
    ruleXP: {
      ...typography.title,
      fontSize: 16,
      color: colors.rating,
    },
    ruleLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    note: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.md,
    },
  });

export default WatcherProfileSheet;
