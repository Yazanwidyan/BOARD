import { Fragment } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { PrimaryButton } from "../components/PrimaryButton";
import { ProBadge } from "../components/ProBadge";
import { StackHeader, useStackHeaderScroll } from "../components/ScreenHeader";
import { Wordmark } from "../components/Wordmark";
import { t } from "../i18n";
import { useProfileStore } from "../store/profileStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

// What Pro unlocks — the perks themselves live where they're used: the
// stats on Profile's Stats tab, the style in Edit profile.
const PERKS = [
  {
    title: "Deeper taste stats",
    body: "How you tier each genre, decade and director — your favourites and your blind spots — on your Stats.",
  },
  {
    title: "Profile style",
    body: "A PRO badge by your name and an accent colour for your profile, which your friends see too.",
  },
];

const formatDay = (timestamp) =>
  new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

// ReelBoard Pro: what it is, and whether you have it. It isn't sold yet —
// for now it's given (by the admin site) — so the button says it's coming.
export const ProScreen = ({ navigation }) => {
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const pro = useProfileStore((state) => state.pro);
  const accent = useProfileStore((state) => state.accent);
  const isPro = Boolean(pro?.active);

  return (
    <View style={styles.container}>
      <StackHeader title={t("ReelBoard Pro")} onBack={() => navigation.goBack()} scrollY={headerScroll.scrollY} />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <View style={styles.hero}>
          <View style={styles.brand}>
            <Wordmark size={40} style={styles.wordmark} />
            <ProBadge accent={accent} style={styles.heroBadge} />
          </View>
          <Text style={styles.tagline}>{t("More of your taste, and a profile that's yours.")}</Text>
        </View>

        <View style={styles.perks}>
          {PERKS.map((perk, index) => (
            <Fragment key={perk.title}>
              <View style={styles.perk}>
                <Text style={styles.perkTitle}>{t(perk.title)}</Text>
                <Text style={styles.perkBody}>{t(perk.body)}</Text>
              </View>
            </Fragment>
          ))}
        </View>

        {isPro ? (
          <View style={styles.status}>
            <Text style={styles.statusTitle}>{t("You're Pro")}</Text>
            <Text style={styles.statusBody}>
              {pro.until
                ? t("Since {since}, until {until}.", { since: formatDay(pro.since), until: formatDay(pro.until) })
                : t("Since {since}.", { since: formatDay(pro.since) })}
            </Text>
            <PrimaryButton
              label={t("Choose your accent")}
              variant="secondary"
              onPress={() => navigation.navigate("EditProfile")}
              style={styles.statusButton}
            />
          </View>
        ) : (
          <View style={styles.status}>
            <PrimaryButton label={t("Coming soon")} disabled />
            <Text style={styles.soon}>{t("Pro isn't on sale yet — it's on its way.")}</Text>
          </View>
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
    content: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      gap: spacing.lg,
    },
    hero: {
      alignItems: "center",
      gap: spacing.sm,
    },
    brand: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    wordmark: {
      letterSpacing: 1,
      color: colors.textPrimary,
    },
    heroBadge: {
      transform: [{ scale: 1.3 }],
      marginStart: 4,
    },
    tagline: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
    },
    perks: {
      backgroundColor: colors.card,
      borderRadius: shape.card,
      overflow: "hidden",
    },
    perk: {
      gap: 4,
      padding: spacing.md,
    },
    perkTitle: {
      ...typography.bodyBold,
      fontSize: 16,
      lineHeight: 22,
      color: colors.textPrimary,
    },
    perkBody: {
      ...typography.body,
      color: colors.textSecondary,
    },
    status: {
      gap: spacing.sm,
    },
    statusTitle: {
      ...typography.bodyBold,
      fontSize: 18,
      lineHeight: 24,
      color: colors.textPrimary,
      textAlign: "center",
    },
    statusBody: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
    },
    statusButton: {
      marginTop: spacing.sm,
    },
    soon: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
    },
  });

export default ProScreen;
