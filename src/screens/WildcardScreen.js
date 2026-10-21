import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Dices, Star } from "lucide-react-native";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
// Gesture Handler's, so scratching the card isn't taken as a scroll.
import { ScrollView } from "react-native-gesture-handler";
import Animated, { FadeIn, ZoomIn, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScratchCard } from "../components/ScratchCard";
import { StackHeader } from "../components/ScreenHeader";
import { t } from "../i18n";
import { useMovieStore } from "../store/movieStore";
import { showToast } from "../store/toastStore";
import { spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { SOURCES, dealOne } from "../utils/decidePools";
import { formatRuntime } from "../utils/movieFilters";
import { useDecidePool } from "../utils/useDecidePool";

const CARD_MAX = 280;

// The Wildcard's scratch: one film from where you chose (store/
// decideStore, set by Decide's Wildcard sheet), under gold foil — rub it
// to see. Once it's off, the poster blurs in behind and what it is shows;
// Watch tonight makes it tonight's pick; Roll again deals a fresh card;
// the poster opens the movie.
export const WildcardScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const pickedMovie = useMovieStore((state) => state.pickedMovie);
  const togglePickedMovie = useMovieStore((state) => state.togglePickedMovie);
  const { source, board, pool } = useDecidePool("wildcard");

  // Each deal is a new card: its key, and whether it's been scratched.
  const [current, setCurrent] = useState(() => dealOne(pool, source, null));
  const [dealId, setDealId] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [scratching, setScratching] = useState(false);
  const poolRef = useRef(pool);
  poolRef.current = pool;

  // The first card, once the pool has films (they can arrive after).
  if (!current && pool.length > 0) setCurrent(dealOne(pool, source, null));

  const cardWidth = Math.min(CARD_MAX, Math.round(width * 0.66));
  const cardHeight = Math.round(cardWidth * 1.5);
  const movie = current?.movie;
  const from =
    source === "board" && board ? board.name : t(SOURCES.find((item) => item.key === source)?.label ?? "");

  const rollAgain = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRevealed(false);
    setDealId((value) => value + 1);
    setCurrent((previous) => dealOne(poolRef.current, source, previous?.movie.id));
  };

  const watchTonight = () => {
    if (!current) return;
    if (pickedMovie !== current.movie.id) togglePickedMovie(current.movie.id);
    showToast(t("{title} is tonight's pick", { title: current.movie.title }), { tone: "success" });
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      {/* Behind: a gold glow while it's covered; the poster, blurred, once
          it's scratched. */}
      {revealed && movie ? (
        <Animated.View entering={FadeIn.duration(400)} style={StyleSheet.absoluteFill} pointerEvents="none">
          <MoviePoster uri={movie.poster} blurRadius={28} style={styles.backdrop} />
          <LinearGradient
            colors={[`${colors.background}66`, colors.background]}
            locations={[0, 0.85]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : (
        <LinearGradient
          colors={[`${colors.rating}26`, colors.background]}
          locations={[0, 0.6]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}

      <StackHeader title={t("Wildcard")} close onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.lg }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!scratching}
      >
        <View style={styles.fromTag}>
          <Text style={styles.fromText} numberOfLines={1}>
            {t("From {source}", { source: from })}
          </Text>
        </View>

        <View style={styles.stage}>
          {movie ? (
            <Animated.View key={dealId} entering={reduceMotion ? undefined : ZoomIn.duration(240)}>
              <ScratchCard
                width={cardWidth}
                height={cardHeight}
                onReveal={() => setRevealed(true)}
                onScratchStart={() => setScratching(true)}
                onScratchEnd={() => setScratching(false)}
              >
                <Pressable
                  onPress={() => revealed && navigation.navigate("MovieDetails", { movieId: movie.id })}
                  disabled={!revealed}
                  accessibilityRole="button"
                  accessibilityLabel={t("Open {title}", { title: movie.title })}
                >
                  <MoviePoster uri={movie.poster} shadow style={{ width: cardWidth, height: cardHeight }} />
                  {current.outside && (
                    <View style={styles.stamp}>
                      <Text style={styles.stampText}>{t("Not your usual")}</Text>
                    </View>
                  )}
                </Pressable>
              </ScratchCard>
            </Animated.View>
          ) : (
            <View style={[styles.emptyCard, { width: cardWidth, height: cardHeight }]}>
              <Text style={styles.empty}>
                {source === "filters"
                  ? t("No films match these filters — try fewer.")
                  : t("Nothing here you haven't watched.")}
              </Text>
            </View>
          )}
        </View>

        {movie && !revealed ? (
          <Text style={styles.hint}>{t("Rub the card to see what you got")}</Text>
        ) : movie ? (
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(260)} style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>
              {movie.title}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {[movie.year, movie.genres?.slice(0, 2).join(", "), movie.runtime ? formatRuntime(movie.runtime) : null]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            <View style={styles.chips}>
              {movie.rating != null && (
                <View style={styles.chip}>
                  <Star size={12} color={colors.rating} fill={colors.rating} strokeWidth={2} />
                  <Text style={styles.chipText}>{movie.rating.toFixed(1)}</Text>
                </View>
              )}
              {current.match != null && (
                <View style={styles.chip}>
                  <Text style={[styles.chipText, { color: current.outside ? colors.rating : colors.success }]}>
                    {t("{match}% match", { match: current.match })}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton label={t("Watch tonight")} onPress={watchTonight} disabled={!movie || !revealed} />
          <Pressable
            style={({ pressed }) => [styles.roll, pressed && styles.pressed]}
            onPress={rollAgain}
            disabled={pool.length === 0}
            accessibilityRole="button"
          >
            <Dices size={18} color={colors.textPrimary} strokeWidth={1.9} />
            <Text style={styles.rollText}>{t("Roll again")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      width: "100%",
      height: "100%",
      opacity: 0.55,
    },
    pressed: {
      opacity: 0.7,
    },
    body: {
      alignItems: "stretch",
      gap: spacing.lg,
      paddingTop: spacing.sm,
    },
    fromTag: {
      alignSelf: "center",
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 4,
      backgroundColor: colors.surfaceSoft,
    },
    fromText: {
      ...typography.bodyBold,
      fontSize: 12,
      color: colors.textSecondary,
    },
    stage: {
      alignItems: "center",
    },
    emptyCard: {
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
      backgroundColor: colors.card,
    },
    empty: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: "center",
    },
    // A gold stamp across the face's corner for a film outside your taste.
    stamp: {
      position: "absolute",
      top: spacing.sm + 2,
      end: spacing.sm + 2,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      backgroundColor: colors.rating,
      transform: [{ rotate: "4deg" }],
    },
    stampText: {
      fontFamily: fonts.extraBold,
      fontSize: 11,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      color: "#0C1014",
    },
    hint: {
      ...typography.body,
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      paddingHorizontal: spacing.md,
    },
    info: {
      alignItems: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    title: {
      ...typography.title,
      fontSize: 24,
      lineHeight: 30,
      color: colors.textPrimary,
      textAlign: "center",
    },
    meta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    chips: {
      flexDirection: "row",
      gap: 6,
      marginTop: 2,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      backgroundColor: colors.surfaceSoft,
    },
    chipText: {
      ...typography.bodyBold,
      fontSize: 12,
      color: colors.textPrimary,
      fontVariant: ["tabular-nums"],
    },
    actions: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    roll: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm + 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    rollText: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
  });

export default WildcardScreen;
