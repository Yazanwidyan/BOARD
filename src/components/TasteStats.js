import { Lock } from "lucide-react-native";
import { Fragment } from "react";
import { StyleSheet, View } from "react-native";

import { getMovieById } from "../data/movies";
import { t } from "../i18n";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { TIERS, getTier, getTierInfo } from "../utils/tiers";
import { Text } from "./AppText";
import { PrimaryButton } from "./PrimaryButton";

// A Pro perk: how you tier each genre, decade and director — the average of
// your tiers there (S = 5 … F = 0) as a tier and a bar, best first, from
// groups of two films or more. Not Pro: what it would show, and the way to
// Pro. `watched`: your watched entries.

const MIN_FILMS = 2;
const SHOWN = 5;
const BEST = TIERS.length - 1;
const scoreOf = (tier) => BEST - TIERS.findIndex((item) => item.key === tier);
const tierOfScore = (score) => TIERS[BEST - Math.round(score)].key;

// { genre, decade, director }: [{ name, average, tier, count }], best first.
const groupTiers = (watched) => {
  const groups = { genre: new Map(), decade: new Map(), director: new Map() };
  const add = (kind, name, score) => {
    if (!name) return;
    const group = groups[kind].get(name) ?? { name, sum: 0, count: 0 };
    group.sum += score;
    group.count += 1;
    groups[kind].set(name, group);
  };
  watched.forEach((entry) => {
    const tier = getTier(entry);
    const movie = getMovieById(entry.movieId);
    if (!tier || !movie) return;
    const score = scoreOf(tier);
    (movie.genres ?? []).forEach((genre) => add("genre", genre, score));
    if (movie.year) add("decade", `${Math.floor(movie.year / 10) * 10}s`, score);
    add("director", movie.director, score);
  });
  return Object.fromEntries(
    Object.entries(groups).map(([kind, map]) => [
      kind,
      [...map.values()]
        .filter((group) => group.count >= MIN_FILMS)
        .map((group) => ({ ...group, average: group.sum / group.count, tier: tierOfScore(group.sum / group.count) }))
        .sort((a, b) => b.average - a.average || b.count - a.count)
        .slice(0, SHOWN),
    ]),
  );
};

const KINDS = [
  { key: "genre", label: "By genre", translate: true },
  { key: "decade", label: "By decade" },
  { key: "director", label: "By director" },
];

export const TasteStats = ({ watched, isPro, onSeePro }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  if (!isPro) {
    return (
      <View style={styles.locked}>
        <View style={styles.lockedHead}>
          <Lock size={16} color={colors.textSecondary} strokeWidth={2} />
          <Text style={styles.lockedTitle}>{t("Deeper taste stats")}</Text>
        </View>
        <Text style={styles.lockedText}>
          {t("How you tier each genre, decade and director — your favourites and your blind spots.")}
        </Text>
        <PrimaryButton label={t("See ReelBoard Pro")} variant="secondary" dense onPress={onSeePro} style={styles.lockedButton} />
      </View>
    );
  }

  const groups = groupTiers(watched);
  const any = KINDS.some(({ key }) => groups[key].length > 0);
  if (!any) {
    return <Text style={styles.empty}>{t("Tier a few more films to see how you tier each genre, decade and director.")}</Text>;
  }

  return (
    <View style={styles.wrap}>
      {KINDS.filter(({ key }) => groups[key].length > 0).map(({ key, label, translate }) => (
        <View key={key}>
          <Text style={styles.kind}>{t(label)}</Text>
          <View style={styles.card}>
            {groups[key].map((group, index) => {
              const info = getTierInfo(group.tier);
              return (
                <Fragment key={group.name}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.row}>
                    <View style={[styles.tier, { backgroundColor: info.color }]}>
                      <Text style={styles.tierText}>{group.tier}</Text>
                    </View>
                    <View style={styles.rowText}>
                      <View style={styles.rowHead}>
                        <Text style={styles.name} numberOfLines={1}>
                          {translate ? t(group.name) : group.name}
                        </Text>
                        <Text style={styles.count}>{t("{count} films", { count: group.count })}</Text>
                      </View>
                      <View style={styles.bar}>
                        <View style={[styles.barFill, { width: `${(group.average / BEST) * 100}%` }]} />
                      </View>
                    </View>
                  </View>
                </Fragment>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      gap: spacing.md,
    },
    kind: {
      ...typography.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 1.2,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: shape.card,
      overflow: "hidden",
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginStart: spacing.md + 28 + spacing.md,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    tier: {
      width: 28,
      height: 28,
      borderRadius: 6,
      alignItems: "center",
      justifyContent: "center",
    },
    tierText: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 18,
      color: "#14181C",
    },
    rowText: {
      flex: 1,
      gap: 5,
    },
    rowHead: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    name: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 18,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    count: {
      ...typography.caption,
      color: colors.textMuted,
    },
    bar: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.surfaceSoft,
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
      borderRadius: 2,
      backgroundColor: colors.textSecondary,
    },
    empty: {
      ...typography.body,
      color: colors.textMuted,
    },
    // Not Pro: what it is, and the way in.
    locked: {
      gap: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
    },
    lockedHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    lockedTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    lockedText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    lockedButton: {
      alignSelf: "flex-start",
      marginTop: spacing.xs,
    },
  });

export default TasteStats;
