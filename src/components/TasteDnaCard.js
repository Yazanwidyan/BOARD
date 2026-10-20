import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { t } from "../i18n";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";
import { MoviePoster } from "./MoviePoster";
import { TasteDnaBars } from "./TasteDnaBars";

const SIGNATURE_GAP = 2;

// Profile's taste card, built on Taste DNA (see utils/tasteDna): the six
// sliders, the themes you love, the films that sum
// your taste up, then the plain facts (director, decade, genres) — genre
// is one line at the bottom now, not the headline.
export const TasteDnaCard = ({
  dna,
  director,
  decade,
  topGenres,
  onOpenMovie,
  onOpenCollection,
  onSeeUntiered,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  // Edge to edge (it cancels Profile's padding), so the posters share the
  // screen width minus the card's own padding.
  const inner = width - spacing.md * 2;
  const posterWidth =
    (inner - SIGNATURE_GAP * (Math.max(dna.signature.length, 4) - 1)) /
    Math.max(dna.signature.length, 4);

  if (!dna.hasDna) {
    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>{t("Your taste DNA")}</Text>
        <Text style={styles.emptyTitle}>{t("Not mapped yet")}</Text>
        <Text style={styles.line}>
          {t(
            "Tier a few movies and we'll map it — how dark, how fast, how twisty you like them.",
          )}
        </Text>
        <Pressable onPress={onSeeUntiered} hitSlop={8} style={styles.link}>
          <Text style={styles.linkText}>{t("See untiered")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{t("Your taste DNA")}</Text>

      <View style={styles.section}>
        <TasteDnaBars fingerprint={dna.fingerprint} />
      </View>

      {dna.themes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>{t("Themes you love")}</Text>
          <View style={styles.chips}>
            {dna.themes.map((theme) => (
              <View key={theme.key} style={styles.chip}>
                <Text style={styles.chipText}>{t(theme.label)}</Text>
                <Text style={styles.chipCount}>{theme.loved}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {dna.signature.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>{t("Films that sum you up")}</Text>
          <View style={styles.posters}>
            {dna.signature.map((movie) => (
              <Pressable
                key={movie.id}
                onPress={() => onOpenMovie(movie.id)}
                accessibilityLabel={movie.title}
              >
                <MoviePoster
                  uri={movie.poster}
                  style={{ width: posterWidth, height: posterWidth * 1.5 }}
                />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {(director || decade) && (
        <View style={[styles.section, styles.facts]}>
          {director && (
            <Pressable
              style={styles.fact}
              disabled={!director.collectionId}
              onPress={() => onOpenCollection(director.collectionId)}
            >
              <Text style={styles.factLabel}>{t("Most-watched director")}</Text>
              <Text style={styles.factValue} numberOfLines={1}>
                {director.name} · {director.count}
              </Text>
            </Pressable>
          )}
          {decade && (
            <Pressable
              style={styles.fact}
              disabled={!decade.collectionId}
              onPress={() => onOpenCollection(decade.collectionId)}
            >
              <Text style={styles.factLabel}>{t("Favorite decade")}</Text>
              <Text style={styles.factValue}>
                {t("The {decade}", { decade: decade.label })}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {topGenres.length > 0 && (
        <Text style={styles.genres} numberOfLines={1}>
          {t("Genres")}
          {": "}
          {topGenres.map(({ genre }) => t(genre)).join(" · ")}
        </Text>
      )}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      marginHorizontal: -spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
    },
    eyebrow: {
      ...typography.caption,
      color: colors.textMuted,
    },
    emptyTitle: {
      ...typography.title,
      fontSize: 20,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    line: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    link: {
      alignSelf: "flex-start",
      marginTop: spacing.md,
    },
    linkText: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    section: {
      marginTop: spacing.lg,
    },
    label: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs + 2,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 6,
      backgroundColor: colors.surfaceSoft,
    },
    chipText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    chipCount: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.rating,
    },
    posters: {
      flexDirection: "row",
      gap: SIGNATURE_GAP,
    },
    facts: {
      flexDirection: "row",
      gap: 2,
    },
    fact: {
      flex: 1,
      padding: spacing.sm + 2,
      backgroundColor: colors.surfaceSoft,
      gap: 2,
    },
    factLabel: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
    },
    factValue: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    genres: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.md,
    },
  });

export default TasteDnaCard;
