import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Check, Share2, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { FriendAvatar } from "../components/FriendAvatar";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { StackHeader } from "../components/ScreenHeader";
import { StorySwipeCard } from "../components/StorySwipeCard";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import {
  createMovieNight,
  endMovieNight,
  getMovieNight,
  joinMovieNight,
  leaveMovieNight,
  movieNightLink,
  sendMovieNightPicks,
} from "../services/movieNights";
import { useMovieStore } from "../store/movieStore";
import { showToast } from "../store/toastStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { formatRuntime } from "../utils/movieFilters";

const POLL_MS = 3000;
const CARDS_RENDERED = 3;
const POSTER_ASPECT = 1.5;
const CODE_LENGTH = 6;

// Movie night on everyone's own phone (the one-phone version is
// MovieNightScreen). Opened three ways:
//   { movieIds }  host a new one with this stack
//   { code }      join one — typed in, or from a reelboard://night/CODE link
//   {}            ask for a code
// Then: waiting room (the code to share, who's in) → swipe → wait for the
// others → the movies everyone kept. Nobody sees anyone else's picks until
// all are done or the host reveals early. While waiting it re-checks every
// few seconds.
export const GroupNightScreen = ({ navigation, route }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const setPickedMovie = useMovieStore((state) => state.setPickedMovie);
  const pickedMovie = useMovieStore((state) => state.pickedMovie);

  const params = route?.params ?? {};
  const [phase, setPhase] = useState(
    params.movieIds || params.code ? "connecting" : "entry",
  );
  const [night, setNight] = useState(null);
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [index, setIndex] = useState(0);
  const [kept, setKept] = useState([]);
  const [stage, setStage] = useState(null);
  const frontCardRef = useRef(null);

  // Where a fresh copy of the night puts you.
  const applyNight = useCallback((next) => {
    setNight(next);
    setPhase((current) => {
      if (next.results) return "results";
      if (current === "swipe" || current === "sending") return current;
      if (next.me.done) return "waiting";
      return current === "connecting" || current === "entry" ? "lobby" : current;
    });
  }, []);

  const fail = (err) => {
    setError(err.message);
    setPhase("error");
  };

  // Start: create, or join with the code from the link.
  useEffect(() => {
    if (params.movieIds) createMovieNight(params.movieIds).then(applyNight, fail);
    else if (params.code) joinMovieNight(params.code).then(applyNight, fail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the room fresh while people are joining or still swiping.
  useEffect(() => {
    if (!night || !["lobby", "waiting", "swipe"].includes(phase)) return undefined;
    const timer = setInterval(() => {
      getMovieNight(night.id).then(applyNight, (err) => {
        if (err.status === 404) fail(err);
      });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [night, phase, applyNight]);

  const join = async () => {
    if (codeInput.trim().length !== CODE_LENGTH) {
      setError(t("Codes are {count} letters and numbers", { count: CODE_LENGTH }));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      applyNight(await joinMovieNight(codeInput));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const shareInvite = () =>
    Share.share({
      message: t(
        "Join my ReelBoard movie night — we each swipe, then see what we all want to watch. Code: {code}\n{link}",
        { code: night.code, link: movieNightLink(night.code) },
      ),
    });

  const stack = (night?.movieIds ?? []).map(getMovieById).filter(Boolean);

  const finishSwiping = async (finalKept) => {
    setPhase("sending");
    try {
      const next = await sendMovieNightPicks(night.id, finalKept);
      setNight(next);
      setPhase(next.results ? "results" : "waiting");
    } catch (err) {
      showToast(err.message);
      setPhase("swipe");
    }
  };

  const record = useCallback(
    (keep) => {
      const movie = stack[index];
      if (!movie) return;
      const nextKept = keep ? [...kept, movie.id] : kept;
      if (keep) Haptics.selectionAsync();
      setKept(nextKept);
      if (index + 1 < stack.length) setIndex(index + 1);
      else finishSwiping(nextKept);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stack, index, kept],
  );
  const handleKeep = useCallback(() => record(true), [record]);
  const handlePass = useCallback(() => record(false), [record]);

  const revealNow = async () => {
    setBusy(true);
    try {
      applyNight(await endMovieNight(night.id));
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusy(false);
    }
  };

  // Leaving mid-way: ask first. The host leaving ends it for everyone.
  const handleBack = useCallback(() => {
    if (!night || phase === "results" || phase === "error" || phase === "entry") {
      navigation.goBack();
      return;
    }
    Alert.alert(
      t("Leave movie night?"),
      night.isHost
        ? t("You're the host — leaving ends it for everyone.")
        : t("Your picks so far will be lost."),
      [
        { text: t("Stay"), style: "cancel" },
        {
          text: t("Leave"),
          style: "destructive",
          onPress: () => {
            leaveMovieNight(night.id).catch(() => {});
            navigation.goBack();
          },
        },
      ],
    );
  }, [night, phase, navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        handleBack();
        return true;
      });
      return () => subscription.remove();
    }, [handleBack]),
  );

  const header = (title, right) => (
    <StackHeader title={title} onBack={handleBack} right={right} />
  );

  const renderMembers = () => (
    <View style={styles.members}>
      {night.members.map(({ user, isHost, done }) => (
        <View key={user.id} style={styles.memberRow}>
          <FriendAvatar friend={user} size={36} />
          <View style={styles.memberText}>
            <Text style={styles.memberName} numberOfLines={1}>
              {user.name}
            </Text>
            <Text style={styles.memberMeta}>
              {isHost ? t("Host") : user.handle}
            </Text>
          </View>
          {phase !== "lobby" && (
            <Text style={[styles.memberState, done && styles.memberDone]}>
              {done ? t("Done") : t("Swiping…")}
            </Text>
          )}
        </View>
      ))}
    </View>
  );

  // ---------- Enter a code ----------
  if (phase === "entry") {
    return (
      <View style={styles.container}>
        {header(t("Join a movie night"))}
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.message}>
            {t("Ask whoever's hosting for the code on their screen.")}
          </Text>
          <TextInput
            value={codeInput}
            onChangeText={(text) =>
              setCodeInput(text.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, CODE_LENGTH))
            }
            placeholder="ABC123"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus
            onSubmitEditing={join}
            style={styles.codeInput}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton
            label={busy ? t("Joining…") : t("Join")}
            onPress={join}
            disabled={busy || codeInput.length !== CODE_LENGTH}
            style={styles.fullButton}
          />
        </ScrollView>
      </View>
    );
  }

  // ---------- Couldn't open it, or it ended ----------
  if (phase === "error") {
    return (
      <View style={styles.container}>
        {header(t("Movie night"))}
        <View style={styles.center}>
          <Text style={styles.bigTitle}>
            {night ? t("This movie night has ended") : t("Can't open this movie night")}
          </Text>
          <Text style={styles.message}>{error}</Text>
          <PrimaryButton label={t("Back")} onPress={() => navigation.goBack()} style={styles.fullButton} />
        </View>
      </View>
    );
  }

  // ---------- Loading / sending ----------
  if (phase === "connecting" || phase === "sending" || !night) {
    return (
      <View style={styles.container}>
        {header(t("Movie night"))}
        <View style={styles.center}>
          <ActivityIndicator color={colors.textPrimary} />
        </View>
      </View>
    );
  }

  // ---------- Waiting room ----------
  if (phase === "lobby") {
    return (
      <View style={styles.container}>
        {header(t("Movie night"))}
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}>
          <Text style={styles.caption}>{t("Room code")}</Text>
          <Text style={styles.code} selectable>
            {night.code}
          </Text>
          <Text style={styles.message}>
            {t("Everyone swipes the same {count} movies on their own phone. When you're all done, you'll see the ones you all want.", {
              count: stack.length,
            })}
          </Text>
          <PrimaryButton
            label={t("Invite friends")}
            icon={<Share2 size={16} color={colors.textPrimary} />}
            variant="secondary"
            onPress={shareInvite}
            style={styles.fullButton}
          />
          <Text style={styles.sectionLabel}>
            {t("In the room · {count}", { count: night.members.length })}
          </Text>
          {renderMembers()}
          <PrimaryButton
            label={t("Start swiping")}
            onPress={() => {
              setIndex(0);
              setKept([]);
              setPhase("swipe");
            }}
            style={styles.fullButton}
          />
        </ScrollView>
      </View>
    );
  }

  // ---------- Waiting for the others ----------
  if (phase === "waiting") {
    const doneCount = night.members.filter((member) => member.done).length;
    return (
      <View style={styles.container}>
        {header(t("Movie night"))}
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}>
          <Text style={styles.bigTitle}>{t("You're done")}</Text>
          <Text style={styles.message}>
            {night.members.length < 2
              ? t("Nobody else is in yet — share the code {code}.", { code: night.code })
              : t("Waiting for the others · {done} of {total} done", {
                  done: doneCount,
                  total: night.members.length,
                })}
          </Text>
          {renderMembers()}
          {night.members.length < 2 && (
            <PrimaryButton
              label={t("Invite friends")}
              variant="secondary"
              onPress={shareInvite}
              style={styles.fullButton}
            />
          )}
          {night.isHost && doneCount >= 2 && (
            <PrimaryButton
              label={busy ? t("Revealing…") : t("Reveal now")}
              onPress={revealNow}
              disabled={busy}
              style={styles.fullButton}
            />
          )}
        </ScrollView>
      </View>
    );
  }

  // ---------- Results ----------
  if (phase === "results") {
    const { matches, counts, voters } = night.results;
    const matchMovies = matches.map(getMovieById).filter(Boolean);
    const almost = stack
      .filter((movie) => !matches.includes(movie.id) && voters > 1 && counts[movie.id] === voters - 1)
      .slice(0, 6);
    const makePick = (movie) => {
      setPickedMovie(movie.id);
      showToast(t("{title} is tonight's pick", { title: movie.title }), { tone: "success" });
    };
    return (
      <View style={styles.container}>
        {header(
          matchMovies.length > 0
            ? t("{count} matched", { count: matchMovies.length })
            : t("No matches"),
        )}
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}>
          <Animated.View entering={FadeIn.duration(300)}>
            <Text style={styles.bigTitle}>
              {matchMovies.length > 0
                ? t("You all want to watch")
                : t("No movie everyone kept")}
            </Text>
            {matchMovies.length === 0 && (
              <Text style={styles.message}>
                {almost.length > 0
                  ? t("These came closest — everyone but one kept them.")
                  : t("Try a new stack together.")}
              </Text>
            )}
            {[...matchMovies, ...(matchMovies.length === 0 ? almost : [])].map((movie) => {
              const isPick = pickedMovie === movie.id;
              return (
                <Pressable
                  key={movie.id}
                  style={styles.resultRow}
                  onPress={() => navigation.navigate("MovieDetails", { movieId: movie.id })}
                >
                  <MoviePoster uri={movie.poster} style={styles.resultPoster} />
                  <View style={styles.memberText}>
                    <Text style={styles.memberName} numberOfLines={2}>
                      {movie.title}
                    </Text>
                    <Text style={styles.memberMeta}>
                      {movie.year} · {formatRuntime(movie.runtime)} ·{" "}
                      {t("{count} of {total} kept it", { count: counts[movie.id], total: voters })}
                    </Text>
                  </View>
                  <Pressable onPress={() => makePick(movie)} hitSlop={8} disabled={isPick}>
                    <Text style={[styles.pickText, isPick && styles.memberMeta]}>
                      {isPick ? t("Tonight's pick ✓") : t("Pick")}
                    </Text>
                  </Pressable>
                </Pressable>
              );
            })}
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // ---------- Swiping ----------
  const activeMovie = stack[index];
  const waiting = stack.slice(index, index + CARDS_RENDERED);
  const cardSize = stage
    ? (() => {
        const cardWidth = Math.min(stage.width - spacing.md * 2, (stage.height - spacing.md) / POSTER_ASPECT);
        return { width: Math.floor(cardWidth), height: Math.floor(cardWidth * POSTER_ASPECT) };
      })()
    : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.swipeTop}>
        <Pressable onPress={handleBack} hitSlop={10}>
          <X size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.memberName}>
          {index + 1}/{stack.length}
        </Text>
        <Text style={styles.memberMeta}>
          {t("{count} kept", { count: kept.length })}
        </Text>
      </View>
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
                key={movie.id}
                ref={front ? frontCardRef : undefined}
                movie={movie}
                width={cardSize.width}
                height={cardSize.height}
                front={front}
                onKeep={handleKeep}
                onPass={handlePass}
                onPress={() => navigation.navigate("MovieDetails", { movieId: movie.id })}
              />
            );
          })}
      </View>
      {activeMovie && (
        <View style={styles.info}>
          <Text style={styles.memberName} numberOfLines={1}>
            {activeMovie.title}
          </Text>
          <Text style={styles.memberMeta} numberOfLines={1}>
            {activeMovie.year} · {t(activeMovie.genres[0])} · {formatRuntime(activeMovie.runtime)}
          </Text>
        </View>
      )}
      <View style={[styles.controls, { paddingBottom: insets.bottom + spacing.md }]}>
        {[
          { key: "pass", label: t("Pass"), Icon: X },
          { key: "keep", label: t("Keep"), Icon: Check },
        ].map(({ key, label, Icon }) => (
          <Pressable
            key={key}
            style={({ pressed }) => [
              styles.controlButton,
              key === "keep" && styles.controlKeep,
              pressed && styles.pressed,
            ]}
            onPress={() => frontCardRef.current?.trigger(key)}
            disabled={!activeMovie}
            accessibilityLabel={label}
          >
            <Icon size={24} strokeWidth={2} color={key === "keep" ? colors.selectedText : colors.textPrimary} />
          </Pressable>
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
    body: {
      padding: spacing.md,
      gap: spacing.md,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
      gap: spacing.md,
    },
    caption: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
    },
    code: {
      ...typography.display,
      fontSize: 44,
      lineHeight: 52,
      letterSpacing: 8,
      color: colors.textPrimary,
      textAlign: "center",
    },
    codeInput: {
      ...typography.display,
      fontSize: 32,
      letterSpacing: 6,
      textAlign: "center",
      color: colors.textPrimary,
      backgroundColor: colors.card,
      paddingVertical: spacing.md,
    },
    bigTitle: {
      ...typography.title,
      color: colors.textPrimary,
      textAlign: "center",
    },
    message: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 21,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
      textAlign: "center",
    },
    fullButton: {
      alignSelf: "stretch",
    },
    sectionLabel: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.sm,
    },
    members: {
      gap: 2,
    },
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      padding: spacing.sm + 2,
      backgroundColor: colors.card,
    },
    memberText: {
      flex: 1,
    },
    memberName: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    memberMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    memberState: {
      ...typography.caption,
      color: colors.textMuted,
    },
    memberDone: {
      color: colors.success,
    },
    resultRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      paddingVertical: spacing.sm,
      marginTop: spacing.sm,
    },
    resultPoster: {
      width: 56,
      height: 84,
    },
    pickText: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    swipeTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    stage: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    info: {
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
    },
    controls: {
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.xl,
      paddingTop: spacing.md,
    },
    controlButton: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
    controlKeep: {
      backgroundColor: colors.selected,
    },
    pressed: {
      opacity: 0.8,
    },
  });

export default GroupNightScreen;
