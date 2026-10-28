import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Dices, Heart, X } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { BackButton } from "../components/BackButton";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { StorySwipeCard } from "../components/StorySwipeCard";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { useMovieStore } from "../store/movieStore";
import { showToast } from "../store/toastStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { formatRuntime } from "../utils/movieFilters";
import { shuffle } from "../utils/shuffle";
import { t } from "../i18n";

// Movie night on one phone: everyone in the room (2–6) swipes the same
// stack, one after the other — the app hands it over in between so nobody
// sees anyone else's picks — then reveals the films you all kept, the best
// fit for the group first.
//
//   handoff (1) → swipe (1) → … → handoff (n) → swipe (n) → reveal → results
//
// Opened from Watch together, which picks the stack for the group:
// params { movieIds, players: [names], fits: { [movieId]: 0–100 } }.
// Everything lives in this screen's state: a movie night is one sitting,
// so nothing is persisted. No match? Swipe the maybes (what most of you
// kept) together for another go.

const CARDS_RENDERED = 3;
const POSTER_ASPECT = 1.5;
// Each person's colour — decorative, on dark avatars, so fixed.
const PLAYER_COLORS = ["#8FD3F5", "#F5B38F", "#A4E59B", "#F2A7C3", "#C9B6F2", "#F8E08E"];

const initial = (name) => (name.trim()[0] ?? "?").toUpperCase();

const Avatar = ({ name, index, size = 44, styles }) => (
  <View
    style={[
      styles.avatar,
      {
        width: size,
        height: size,
        backgroundColor: PLAYER_COLORS[index % PLAYER_COLORS.length],
      },
    ]}
  >
    <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>
      {initial(name)}
    </Text>
  </View>
);

const Backdrop = ({ uri, colors }) => (
  <View style={StyleSheet.absoluteFill} pointerEvents="none">
    {!!uri && (
      <Animated.View
        key={uri}
        entering={FadeIn.duration(300)}
        style={StyleSheet.absoluteFill}
      >
        <Image source={{ uri }} blurRadius={30} style={StyleSheet.absoluteFill} />
      </Animated.View>
    )}
    <LinearGradient
      colors={[
        `${colors.background}99`,
        `${colors.background}CC`,
        colors.background,
      ]}
      locations={[0, 0.55, 1]}
      style={StyleSheet.absoluteFill}
    />
  </View>
);

// A labelled row of small posters — the near misses on the results.
const PosterStrip = ({ label, movies, onPress, styles }) =>
  movies.length === 0 ? null : (
    <View style={styles.stripBlock}>
      <Text style={styles.stripLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stripRow}
      >
        {movies.map((movie) => (
          <Pressable key={movie.id} onPress={() => onPress(movie)}>
            <MoviePoster uri={movie.poster} style={styles.stripPoster} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );

export const MovieNightScreen = ({ navigation, route }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const pickedMovie = useMovieStore((state) => state.pickedMovie);
  const setPickedMovie = useMovieStore((state) => state.setPickedMovie);

  const params = route?.params ?? {};
  const players = params.players?.length >= 2 ? params.players : [t("Player 1"), t("Player 2")];
  const fits = params.fits ?? {};
  const byFit = (a, b) => (fits[b.id] ?? 0) - (fits[a.id] ?? 0);

  const [phase, setPhase] = useState("handoff");
  const [player, setPlayer] = useState(0);
  const [stack, setStack] = useState(() => (params.movieIds ?? []).map(getMovieById).filter(Boolean));
  const [index, setIndex] = useState(0);
  const [kept, setKept] = useState(() => players.map(() => []));
  const [round, setRound] = useState(1);
  const [chosenId, setChosenId] = useState(null);
  const [stage, setStage] = useState(null);
  const frontCardRef = useRef(null);

  const playerName = (which) => players[which];
  const everyone = players.length;

  const beginRound = (movies, roundNumber) => {
    setStack(movies);
    setKept(players.map(() => []));
    setIndex(0);
    setPlayer(0);
    setRound(roundNumber);
    setChosenId(null);
    setPhase("handoff");
  };

  const record = useCallback(
    (keep) => {
      const movie = stack[index];
      if (!movie) return;
      if (keep) {
        Haptics.selectionAsync();
        setKept((current) =>
          current.map((ids, which) =>
            which === player ? [...ids, movie.id] : ids,
          ),
        );
      }
      const next = index + 1;
      if (next < stack.length) {
        setIndex(next);
      } else if (player < everyone - 1) {
        setPlayer(player + 1);
        setIndex(0);
        setPhase("handoff");
      } else {
        setPhase("reveal");
      }
    },
    [stack, index, player, everyone],
  );
  const handleKeep = useCallback(() => record(true), [record]);
  const handlePass = useCallback(() => record(false), [record]);

  // How many kept each film; matches are the ones everyone kept — the
  // group's best fit first.
  const keptBy = (movie) => kept.filter((ids) => ids.includes(movie.id)).length;
  const matches = stack.filter((movie) => keptBy(movie) === everyone).sort(byFit);
  // Near misses: everyone but one. Maybes for another round: what most kept.
  const almost = stack.filter((movie) => keptBy(movie) === everyone - 1 && everyone > 2).sort(byFit);
  const maybes = stack
    .filter((movie) => keptBy(movie) < everyone && keptBy(movie) >= Math.max(1, Math.ceil(everyone / 2)))
    .sort(byFit);
  const chosen =
    matches.find((movie) => movie.id === chosenId) ?? matches[0] ?? null;

  const openDetails = (movie) =>
    navigation.navigate("MovieDetails", { movieId: movie.id });

  // Mid-game, leaving throws the picks away — ask first.
  const handleBack = useCallback(() => {
    if (phase === "results") {
      navigation.goBack();
      return;
    }
    Alert.alert(
      t("Leave movie night?"),
      t("The picks so far will be lost."),
      [
        { text: t("Stay"), style: "cancel" },
        {
          text: t("Leave"),
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ],
    );
  }, [phase, navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          handleBack();
          return true;
        },
      );
      return () => subscription.remove();
    }, [handleBack]),
  );

  const topBar = (title, right) => (
    <View style={styles.topBar}>
      <BackButton onPress={handleBack} floating />
      <Text style={styles.topTitle} numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );

  // ---------- Pass the phone ----------
  if (phase === "handoff") {
    const name = playerName(player);
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
        {topBar(round > 1 ? t("The maybes") : t("Movie night"))}
        <Animated.View
          key={player}
          entering={FadeIn.duration(300)}
          style={styles.centerBody}
        >
          <Avatar name={name} index={player} size={88} styles={styles} />
          <Text style={styles.caption}>
            {player === 0
              ? t("First up")
              : t("{name} is done", { name: playerName(player - 1) })}
          </Text>
          <Text style={styles.bigTitle}>
            {t("Pass the phone to {name}", { name })}
          </Text>
          <Text style={styles.message}>
            {player === 0
              ? t("{count} movies. Swipe up to keep, down to pass.", {
                  count: stack.length,
                })
              : t("Same {count} movies. No peeking at each other's picks.", {
                  count: stack.length,
                })}
          </Text>
          <PrimaryButton
            label={t("I'm {name} — start", { name })}
            onPress={() => setPhase("swipe")}
            style={styles.fullButton}
          />
        </Animated.View>
      </View>
    );
  }

  // ---------- Everyone done ----------
  if (phase === "reveal") {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
        {topBar(t("Movie night"))}
        <Animated.View entering={FadeIn.duration(300)} style={styles.centerBody}>
          <View style={styles.avatarPair}>
            {players.map((name, which) => (
              <View key={which} style={which > 0 && styles.avatarOverlap}>
                <Avatar name={name} index={which} size={everyone > 3 ? 56 : 72} styles={styles} />
              </View>
            ))}
          </View>
          <Text style={styles.bigTitle}>
            {everyone === 2 ? t("You're both done") : t("You're all done")}
          </Text>
          <Text style={styles.message}>
            {t("Put the phone where everyone can see it.")}
          </Text>
          <PrimaryButton
            label={t("Reveal matches")}
            onPress={() => {
              Haptics.notificationAsync(
                matches.length > 0
                  ? Haptics.NotificationFeedbackType.Success
                  : Haptics.NotificationFeedbackType.Warning,
              );
              setPhase("results");
            }}
            style={styles.fullButton}
          />
        </Animated.View>
      </View>
    );
  }

  // ---------- Results ----------
  if (phase === "results") {
    const isChosenPicked = !!chosen && pickedMovie === chosen.id;
    const makePick = () => {
      if (!chosen) return;
      setPickedMovie(chosen.id);
      showToast(t("{title} is tonight's pick", { title: chosen.title }), {
        tone: "success",
      });
    };
    const fate = () => {
      const others = matches.filter((movie) => movie.id !== chosen?.id);
      const pool = others.length > 0 ? others : matches;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setChosenId(pool[Math.floor(Math.random() * pool.length)].id);
    };

    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
        <Backdrop uri={chosen?.poster} colors={colors} />
        {topBar(
          matches.length > 0
            ? t("{count} matched", { count: matches.length })
            : t("No matches"),
        )}
        <ScrollView
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
        >
          {chosen ? (
            <Animated.View
              key={chosen.id}
              entering={ZoomIn.duration(360)}
              style={styles.matchHero}
            >
              <Pressable onPress={() => openDetails(chosen)}>
                <MoviePoster uri={chosen.poster} style={styles.winnerPoster} />
                <View style={styles.matchBadge}>
                  <Heart size={14} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.matchBadgeText}>{t("Match")}</Text>
                </View>
              </Pressable>
              <Text style={styles.caption}>
                {matches.length > 1
                  ? t("Your best match of {count}", { count: matches.length })
                  : everyone === 2
                    ? t("You both want to watch")
                    : t("All {count} of you want to watch", { count: everyone })}
              </Text>
              <Text style={styles.bigTitle} numberOfLines={2}>
                {chosen.title}
              </Text>
              <Text style={styles.meta}>
                {chosen.year} · {formatRuntime(chosen.runtime)}
                {fits[chosen.id] != null ? ` · ${t("{fit}% group fit", { fit: fits[chosen.id] })}` : ""}
              </Text>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(300)} style={styles.noMatch}>
              <Text style={styles.bigTitle}>{t("No matches this time")}</Text>
              <Text style={styles.message}>
                {maybes.length >= 2
                  ? t("But most of you liked a few. Swipe those together and meet in the middle.")
                  : t("Nothing you all liked. Try a different night?")}
              </Text>
            </Animated.View>
          )}

          {matches.length > 1 && (
            <View style={styles.stripBlock}>
              <Text style={styles.stripLabel}>{t("All your matches")}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.stripRow}
              >
                {matches.map((movie) => (
                  <Pressable key={movie.id} onPress={() => setChosenId(movie.id)}>
                    <MoviePoster
                      uri={movie.poster}
                      style={[
                        styles.stripPoster,
                        movie.id === chosen?.id && styles.stripPosterChosen,
                      ]}
                    />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {everyone === 2 ? (
            <PosterStrip
              label={t("Only one of you kept")}
              movies={maybes}
              onPress={openDetails}
              styles={styles}
            />
          ) : (
            <PosterStrip
              label={t("Everyone but one kept")}
              movies={almost}
              onPress={openDetails}
              styles={styles}
            />
          )}
        </ScrollView>

        <View
          style={[
            styles.actionsStack,
            { paddingBottom: insets.bottom + spacing.md },
          ]}
        >
          {chosen ? (
            <>
              <PrimaryButton
                label={
                  isChosenPicked
                    ? t("Tonight's pick ✓")
                    : t("Pick for tonight")
                }
                variant={isChosenPicked ? "secondary" : "primary"}
                disabled={isChosenPicked}
                onPress={makePick}
              />
              <View style={styles.actionsRow}>
                {matches.length > 1 && (
                  <PrimaryButton
                    label={t("Let fate pick")}
                    variant="secondary"
                    icon={<Dices size={16} color={colors.textPrimary} />}
                    onPress={fate}
                    style={styles.flex}
                  />
                )}
                <PrimaryButton
                  label={t("New night")}
                  variant="secondary"
                  onPress={() => navigation.goBack()}
                  style={styles.flex}
                />
              </View>
            </>
          ) : (
            <>
              {maybes.length >= 2 && (
                <PrimaryButton
                  label={t("Swipe the maybes ({count})", {
                    count: maybes.length,
                  })}
                  onPress={() => beginRound(shuffle(maybes), round + 1)}
                />
              )}
              <PrimaryButton
                label={t("Try a different night")}
                variant={maybes.length >= 2 ? "secondary" : "primary"}
                onPress={() => navigation.goBack()}
              />
            </>
          )}
        </View>
      </View>
    );
  }

  // ---------- Swiping ----------
  const activeMovie = stack[index];
  const waiting = stack.slice(index, index + CARDS_RENDERED);
  const cardSize = stage
    ? (() => {
        const maxWidth = stage.width - spacing.md * 2;
        const maxHeight = stage.height - spacing.md;
        const cardWidth = Math.min(maxWidth, maxHeight / POSTER_ASPECT);
        return {
          width: Math.floor(cardWidth),
          height: Math.floor(cardWidth * POSTER_ASPECT),
        };
      })()
    : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
      <Backdrop uri={activeMovie?.poster} colors={colors} />
      <View style={styles.bars}>
        {stack.map((movie, barIndex) => (
          <View
            key={movie.id}
            style={[
              styles.bar,
              barIndex <= index && {
                backgroundColor: PLAYER_COLORS[player],
              },
            ]}
          />
        ))}
      </View>
      {topBar(
        t("{name}'s turn", { name: playerName(player) }),
        <Text style={styles.topRight}>
          {index + 1}/{stack.length}
        </Text>,
      )}

      <View
        style={styles.stage}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setStage({ width, height });
        }}
      >
        {cardSize &&
          [...waiting].reverse().map((movie) => {
            const front = movie.id === activeMovie?.id;
            return (
              <StorySwipeCard
                key={`${round}-${player}-${movie.id}`}
                ref={front ? frontCardRef : undefined}
                movie={movie}
                width={cardSize.width}
                height={cardSize.height}
                front={front}
                onKeep={handleKeep}
                onPass={handlePass}
                onPress={() => openDetails(movie)}
              />
            );
          })}
      </View>

      {activeMovie && (
        <View style={styles.info}>
          <Text style={styles.infoTitle} numberOfLines={1}>
            {activeMovie.title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {activeMovie.year} · {t(activeMovie.genres[0])} ·{" "}
            {formatRuntime(activeMovie.runtime)}
          </Text>
        </View>
      )}

      <View
        style={[styles.controls, { paddingBottom: insets.bottom + spacing.md }]}
      >
        {[
          { key: "pass", label: t("Pass"), Icon: X },
          { key: "keep", label: t("Keep"), Icon: Check },
        ].map(({ key, label, Icon }) => (
          <View key={key} style={styles.control}>
            <Pressable
              style={({ pressed }) => [
                styles.controlButton,
                key === "keep" && styles.controlKeep,
                pressed && styles.pressed,
              ]}
              onPress={() => frontCardRef.current?.trigger(key)}
              disabled={!activeMovie}
              accessibilityLabel={label}
            >
              <Icon
                size={24}
                strokeWidth={2}
                color={key === "keep" ? colors.selectedText : colors.textPrimary}
              />
            </Pressable>
            <Text style={styles.controlLabel}>{label}</Text>
          </View>
        ))}
      </View>
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
      opacity: 0.7,
    },
    flex: {
      flex: 1,
    },
    // The round back button, with a little room under it.
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm + 2,
      height: 48 + spacing.sm + 2,
    },
    topTitle: {
      ...typography.title,
      fontSize: 17,
      lineHeight: 23,
      flex: 1,
      color: colors.textPrimary,
    },
    topRight: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },

    // Avatars sit on fixed light colours, so dark text.
    avatar: {
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      ...typography.title,
      color: "#111111",
    },
    avatarPair: {
      flexDirection: "row",
      marginBottom: spacing.md,
    },
    avatarOverlap: {
      marginStart: -16,
      borderWidth: 3,
      borderColor: colors.background,
      marginTop: -3,
    },


    // Handoff / reveal
    centerBody: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      gap: spacing.xs,
    },
    caption: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.md,
    },
    bigTitle: {
      ...typography.display,
      fontSize: 30,
      lineHeight: 36,
      color: colors.textPrimary,
      textAlign: "center",
    },
    message: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.xs,
    },
    meta: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
    },
    fullButton: {
      alignSelf: "stretch",
      marginTop: spacing.xl,
    },

    // Swiping
    bars: {
      flexDirection: "row",
      gap: 3,
      paddingHorizontal: spacing.md,
    },
    bar: {
      flex: 1,
      height: 3,
      backgroundColor: colors.surfaceSoft,
      borderRadius: shape.chip,
    },
    stage: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    info: {
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      gap: 2,
    },
    infoTitle: {
      ...typography.title,
      fontSize: 19,
      lineHeight: 26,
      color: colors.textPrimary,
    },
    controls: {
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.xxl,
      paddingTop: spacing.md,
    },
    control: {
      alignItems: "center",
      gap: 6,
    },
    controlButton: {
      width: 56,
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderRadius: shape.control,
    },
    controlKeep: {
      backgroundColor: colors.selected,
    },
    controlLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },

    // Results
    resultsContent: {
      paddingBottom: spacing.lg,
    },
    matchHero: {
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      gap: spacing.xs,
    },
    winnerPoster: {
      width: 168,
      height: 252,
    },
    // On the poster, so fixed white on the success colour.
    matchBadge: {
      position: "absolute",
      bottom: -12,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: 6,
      backgroundColor: colors.success,
      borderRadius: shape.chip,
    },
    matchBadgeText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: "#FFFFFF",
    },
    noMatch: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.md,
    },
    stripBlock: {
      marginTop: spacing.lg,
    },
    stripLabel: {
      ...typography.caption,
      color: colors.textMuted,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    stripRow: {
      gap: 2,
      paddingHorizontal: spacing.md,
    },
    stripPoster: {
      width: 64,
      height: 96,
    },
    stripPosterChosen: {
      borderWidth: 2,
      borderColor: colors.textPrimary,
    },
    actionsStack: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      gap: 2,
    },
    actionsRow: {
      flexDirection: "row",
      gap: 2,
    },
  });

export default MovieNightScreen;
