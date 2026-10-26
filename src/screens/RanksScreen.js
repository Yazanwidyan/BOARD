import { Check, ChevronDown, ChevronUp } from "lucide-react-native";
import { Fragment, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { RankBadge } from "../components/RankBadge";
import { StackHeader, useStackHeaderScroll } from "../components/ScreenHeader";
import { UnderlineTabs } from "../components/UnderlineTabs";
import { t } from "../i18n";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { TITLES, describeNext, formatAmount, getClosestRanks } from "../utils/ranks";
import { useRankRarity, useRankSummary } from "../utils/useRanks";

const CLOSE_TO_NEXT = 3;

// Everything you can earn, in one place — the only progress screen:
//
//   your title   how many ranks, the bar to the next title, the ladder of
//                titles
//   then tabs    Next up (the tracks closest to a rank) · Craft (how you
//                watch: decades, genres, directors…) · Milestones (how
//                much: films watched, films tiered) — each track once
//
// Each track shows where you are and what's next; tap one for its whole
// ladder, with how many watchers have each rank. (Sagas have their own
// ladders, on their collection pages — they aren't ranks.)
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
  const tabs = [
    closest.length > 0 && { key: "next", label: t("Next up"), list: closest },
    { key: "craft", label: t("Craft"), list: craft },
    { key: "milestones", label: t("Milestones"), list: milestones },
  ].filter(Boolean);
  const [tab, setTab] = useState(tabs[0].key);
  const shown = (tabs.find((item) => item.key === tab) ?? tabs[0]).list;
  const haveIt = (id) =>
    rarity[id] != null ? t("{percent}% have it", { percent: rarity[id] }) : null;

  const renderTrack = (track, index) => {
    const isOpen = open === track.id;
    const Chevron = isOpen ? ChevronUp : ChevronDown;
    const have = track.current ? haveIt(track.current.id) : null;
    return (
      <View key={track.id} style={index > 0 && styles.trackDivider}>
        <Pressable
          style={({ pressed }) => [styles.track, pressed && styles.pressed]}
          onPress={() => setOpen(isOpen ? null : track.id)}
          accessibilityRole="button"
          accessibilityState={{ expanded: isOpen }}
        >
          <RankBadge track={track} step={track.current} size={44} />
          <View style={styles.trackText}>
            <View style={styles.trackHead}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {t(track.title)}
              </Text>
              <Text style={styles.trackValue}>{formatAmount(track.value, track.unit)}</Text>
            </View>
            <Text style={styles.trackRank} numberOfLines={1}>
              {track.current ? t(track.current.title) : t("Not yet")}
              {!!have && <Text style={styles.trackHave}>{`  ·  ${have}`}</Text>}
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

        {/* The whole ladder: each rank, what it takes, how many have it. */}
        {isOpen && (
          <Animated.View entering={FadeIn.duration(180)} style={styles.ladder}>
            {!!track.hint && <Text style={styles.ladderHint}>{t(track.hint)}</Text>}
            {track.steps.map((step, stepIndex) => {
              const reached = track.value >= step.at;
              const stepHave = haveIt(step.id);
              return (
                <Fragment key={step.id}>
                  {stepIndex > 0 && <View style={styles.stepDivider} />}
                  <View style={styles.step}>
                    <RankBadge track={track} step={reached ? step : null} size={28} />
                    <View style={styles.stepText}>
                      <Text style={[styles.stepTitle, !reached && styles.stepLocked]} numberOfLines={1}>
                        {t(step.title)}
                      </Text>
                      <Text style={styles.stepMeta} numberOfLines={1}>
                        {formatAmount(step.at, track.unit)}
                        {stepHave ? `  ·  ${stepHave}` : ""}
                      </Text>
                    </View>
                    {reached && <Check size={16} color={colors.success} strokeWidth={2.6} />}
                  </View>
                </Fragment>
              );
            })}
          </Animated.View>
        )}
      </View>
    );
  };

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
        {/* Your title, how far to the next, and the ladder of titles. */}
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{t("Your title")}</Text>
          <Text style={styles.heroTitle}>{t(title.name)}</Text>
          <Text style={styles.heroMeta}>
            {t("{count} ranks", { count: title.count })}
            {"  ·  "}
            {title.next
              ? t("{count} ranks to {title}", { count: title.toNext, title: t(title.next.name) })
              : t("The top title")}
          </Text>
          <View style={styles.heroBar}>
            <View style={[styles.heroFill, { width: `${Math.round(title.progress * 100)}%` }]} />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.titlesRail}
            contentContainerStyle={styles.titles}
          >
            {TITLES.map((item, index) => {
              const current = index + 1 === title.step;
              const reached = index + 1 < title.step;
              return (
                <View key={item.name} style={[styles.titleChip, current && styles.titleChipOn]}>
                  <Text
                    style={[
                      styles.titleChipText,
                      reached && styles.titleChipTextPast,
                      current && styles.titleChipTextOn,
                    ]}
                  >
                    {t(item.name)}
                  </Text>
                  <Text style={[styles.titleChipAt, current && styles.titleChipAtOn]}>
                    {t("{count} ranks", { count: item.at })}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Next up / Craft / Milestones. */}
        <UnderlineTabs
          tabs={tabs.map(({ key, label }) => ({ key, label }))}
          value={tab}
          onChange={(key) => {
            setTab(key);
            setOpen(null);
          }}
          style={styles.tabs}
        />
        <View key={tab} style={styles.list}>
          {shown.map(renderTrack)}
        </View>
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
    eyebrow: {
      ...typography.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 1.2,
      color: colors.textSecondary,
    },
    heroTitle: {
      ...typography.display,
      color: colors.textPrimary,
      marginTop: 4,
    },
    heroMeta: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: 2,
    },
    heroBar: {
      height: 6,
      marginTop: spacing.md,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 3,
      overflow: "hidden",
    },
    heroFill: {
      height: "100%",
      backgroundColor: colors.rating,
      borderRadius: 3,
    },
    // The titles, left to right: yours in the accent, the ones behind you
    // white, the ones ahead grey.
    titlesRail: {
      marginHorizontal: -spacing.md,
      marginTop: spacing.md,
    },
    titles: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    titleChip: {
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.sm,
      gap: 1,
      backgroundColor: colors.card,
      borderRadius: shape.tab,
    },
    titleChipOn: {
      backgroundColor: colors.segmentOn,
    },
    titleChipText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textMuted,
    },
    titleChipTextPast: {
      color: colors.textPrimary,
    },
    titleChipTextOn: {
      color: colors.segmentOnText,
    },
    titleChipAt: {
      ...typography.caption,
      fontSize: 11,
      lineHeight: 14,
      color: colors.textMuted,
    },
    titleChipAtOn: {
      color: colors.segmentOnText,
      opacity: 0.8,
    },
    tabs: {
      marginTop: spacing.lg,
    },
    // The tracks: one full-width band, split by hairlines.
    list: {
      backgroundColor: colors.card,
    },
    trackDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    track: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
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
      lineHeight: 20,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    trackValue: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
      fontVariant: ["tabular-nums"],
    },
    trackRank: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.rating,
    },
    trackHave: {
      ...typography.caption,
      color: colors.textMuted,
    },
    bar: {
      height: 4,
      marginTop: 3,
      backgroundColor: colors.surfaceSoft,
      borderRadius: 2,
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
      backgroundColor: colors.rating,
      borderRadius: 2,
    },
    trackNext: {
      ...typography.caption,
      color: colors.textMuted,
    },
    // The ladder under an open track: a shade deeper, each rank a row.
    ladder: {
      paddingStart: spacing.md + 44 + spacing.md,
      paddingEnd: spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors.cardElevated,
    },
    ladderHint: {
      ...typography.caption,
      color: colors.textSecondary,
      paddingTop: spacing.sm + 2,
      paddingBottom: spacing.xs,
    },
    stepDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    step: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 4,
      paddingVertical: spacing.sm,
    },
    stepText: {
      flex: 1,
      gap: 1,
    },
    stepTitle: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textPrimary,
    },
    stepLocked: {
      color: colors.textMuted,
    },
    stepMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });

export default RanksScreen;
