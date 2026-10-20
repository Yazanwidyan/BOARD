import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { RankBadge } from "../components/RankBadge";
import { StackHeader, useStackHeaderScroll } from "../components/ScreenHeader";
import { t } from "../i18n";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { TITLES, describeNext, formatAmount, getClosestRanks } from "../utils/ranks";
import { useRankRarity, useRankSummary } from "../utils/useRanks";

const CLOSE_TO_NEXT = 3;

// Everything you can earn, in one place — the only progress screen:
//
//   your title     how many ranks, the bar to the next title, the ladder
//   close to next  the tracks one or two steps from a rank
//   craft          how you watch (decades, genres, directors…)
//   milestones     how much (films watched, films tiered)
//
// Each track shows where you are and what's next; tap one to see its whole
// ladder, with how rare each rank is. (Sagas have their own ladders, in
// Library — they aren't ranks.)
export const RanksScreen = ({ navigation }) => {
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const summary = useRankSummary();
  const rarity = useRankRarity();
  const [open, setOpen] = useState(null);
  const { title, tracks } = summary;

  const craft = tracks.filter((track) => track.kind === "craft");
  const milestones = tracks.filter((track) => track.kind === "milestone");
  const closest = getClosestRanks(tracks, CLOSE_TO_NEXT);

  const renderTrack = (track) => {
    const isOpen = open === track.id;
    const onPress = () => setOpen(isOpen ? null : track.id);
    const Chevron = isOpen ? ChevronUp : ChevronDown;
    return (
      <View key={track.id}>
        <Pressable
          style={({ pressed }) => [styles.track, pressed && styles.pressed]}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityState={{ expanded: isOpen }}
        >
          <RankBadge track={track} step={track.current} size={44} />
          <View style={styles.trackText}>
            <View style={styles.trackHead}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {t(track.title)}
              </Text>
              {track.current && rarity[track.current.id] != null && (
                <Text style={styles.rarity}>
                  {t("{percent}%", { percent: rarity[track.current.id] })}
                </Text>
              )}
            </View>
            <Text style={styles.trackRank} numberOfLines={1}>
              {track.current ? t(track.current.title) : t("Not yet")}
              <Text style={styles.trackValue}>
                {"  ·  "}
                {formatAmount(track.value, track.unit)}
              </Text>
            </Text>
            <View style={styles.bar}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.round((track.next ? track.progress : 1) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.trackNext} numberOfLines={1}>
              {track.next ? describeNext(track) : t("Every rank earned")}
            </Text>
          </View>
          <Chevron size={18} color={colors.textMuted} />
        </Pressable>

        {/* The whole ladder: each rank, what it needs, how rare it is. */}
        {isOpen && (
          <View style={styles.ladder}>
            {!!track.hint && <Text style={styles.ladderHint}>{t(track.hint)}</Text>}
            {track.steps.map((step) => {
              const reached = track.value >= step.at;
              return (
                <View key={step.id} style={styles.step}>
                  <RankBadge track={track} step={reached ? step : null} size={28} />
                  <Text style={[styles.stepTitle, !reached && styles.stepLocked]} numberOfLines={1}>
                    {t(step.title)}
                  </Text>
                  <Text style={styles.stepAt}>{formatAmount(step.at, track.unit)}</Text>
                  <Text style={styles.stepRarity}>
                    {rarity[step.id] != null ? t("{percent}%", { percent: rarity[step.id] }) : "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const Section = ({ label, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StackHeader
        title={t("Ranks")}
        onBack={() => navigation.goBack()}
        scrollY={headerScroll.scrollY}
      />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        {/* Your title */}
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>
            {t("{count} ranks", { count: title.count })}
          </Text>
          <Text style={styles.heroTitle}>{t(title.name)}</Text>
          <View style={styles.heroBar}>
            <View style={[styles.heroFill, { width: `${Math.round(title.progress * 100)}%` }]} />
          </View>
          <Text style={styles.heroNext}>
            {title.next
              ? t("{count} ranks to {title}", { count: title.toNext, title: t(title.next.name) })
              : t("The top title")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.ladderRail}
            contentContainerStyle={styles.titles}
          >
            {TITLES.map((item, index) => {
              const current = index + 1 === title.step;
              const reached = index + 1 < title.step;
              return (
                <View
                  key={item.name}
                  style={[styles.titleChip, current && styles.titleChipOn, reached && styles.titleChipPast]}
                >
                  <Text style={[styles.titleChipText, current && styles.titleChipTextOn]}>
                    {t(item.name)}
                  </Text>
                  <Text style={[styles.titleChipAt, current && styles.titleChipTextOn]}>
                    {item.at}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {closest.length > 0 && <Section label={t("Close to next")}>{closest.map(renderTrack)}</Section>}
        <Section label={t("Craft · how you watch")}>{craft.map(renderTrack)}</Section>
        <Section label={t("Milestones")}>{milestones.map(renderTrack)}</Section>
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
      backgroundColor: colors.cardElevated,
    },
    hero: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    heroEyebrow: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    heroTitle: {
      ...typography.display,
      color: colors.rating,
      marginTop: 2,
    },
    heroBar: {
      height: 8,
      marginTop: spacing.md,
      backgroundColor: colors.surfaceSoft,
    },
    heroFill: {
      height: "100%",
      backgroundColor: colors.rating,
    },
    heroNext: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    ladderRail: {
      marginHorizontal: -spacing.md,
      marginTop: spacing.md,
    },
    titles: {
      gap: 2,
      paddingHorizontal: spacing.md,
    },
    titleChip: {
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm,
      backgroundColor: colors.card,
      gap: 2,
    },
    titleChipPast: {
      backgroundColor: `${colors.rating}29`,
    },
    titleChipOn: {
      backgroundColor: colors.rating,
    },
    titleChipText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    titleChipTextOn: {
      color: colors.background,
    },
    titleChipAt: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
    },
    section: {
      marginTop: spacing.lg,
    },
    sectionLabel: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    sectionBody: {
      gap: 2,
    },
    track: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
      backgroundColor: colors.card,
    },
    trackText: {
      flex: 1,
      gap: 3,
    },
    trackHead: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    trackTitle: {
      ...typography.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    rarity: {
      ...typography.caption,
      color: colors.rating,
    },
    trackRank: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.rating,
    },
    trackValue: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    bar: {
      height: 4,
      marginTop: 3,
      backgroundColor: colors.surfaceSoft,
    },
    barFill: {
      height: "100%",
      backgroundColor: colors.rating,
    },
    trackNext: {
      ...typography.caption,
      color: colors.textMuted,
    },
    ladder: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      paddingTop: spacing.xs,
      gap: spacing.sm,
      backgroundColor: colors.card,
    },
    ladderHint: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    step: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 4,
    },
    stepTitle: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
      flex: 1,
    },
    stepLocked: {
      color: colors.textMuted,
    },
    stepAt: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    stepRarity: {
      ...typography.caption,
      color: colors.textMuted,
      minWidth: 34,
      textAlign: "right",
    },
  });

export default RanksScreen;
