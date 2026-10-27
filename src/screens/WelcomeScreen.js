import { useIsFocused } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Mail } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { BottomSheet } from "../components/BottomSheet";
import { EmailAuthSheet } from "../components/EmailAuthSheet";
import { AppleLogo, GoogleLogo } from "../components/icons/BrandIcons";
import { ReelBoardIcon } from "../components/icons/TabIcons";
import { Wordmark } from "../components/Wordmark";
import { t } from "../i18n";
import { loadWallMovies } from "../services/movieData";
import {
  SignInUnavailable,
  appleSignInSupported,
  getAppleCredentials,
  getGoogleCredentials,
  googleSignInConfigured,
} from "../services/socialAuth";
import { signInWith } from "../services/sync";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import {
  SIGN_IN_WALL,
  WALL_SIZE,
  getSignInWallMovies,
} from "../utils/posterWalls";

// How long a sheet takes to slide away before the next one rises.
const SHEET_HANDOFF_MS = 260;

// Each still shows this long, drifting slowly closer, then fades into the
// next.
const STILL_MS = 7000;
const FADE_MS = 1400;
const DRIFT_MS = 14000;
// The beat's words: up to two lines of the big line (28) and one of the
// quiet one (21), and the gap between.
const BEAT_HEIGHT = 28 * 2 + 21 + 4;
// The longest film title the landing will name.
const MAX_TITLE = 15;
// The mark turns like a reel, slowly: one full turn this long.
const SPIN_MS = 16000;

// What ReelBoard does, one beat per still, told with the film on screen
// (`title`) — or, before the films load, without one.
const BEATS = [
  {
    line: (title) =>
      title ? t("Tier {title}.", { title }) : t("Tier the films you watch."),
    sub: "S to F, your way. Your tier list becomes your profile.",
  },
  {
    line: (title) =>
      title
        ? t("See how {title} fits your taste.", { title })
        : t("See how films fit your taste."),
    sub: "Every film gets a match, and the reasons why.",
  },
  {
    line: (title) =>
      title ? t("Tonight: {title}.", { title }) : t("Let it pick tonight."),
    sub: "One film for tonight, picked from your taste.",
  },
];

// The ReelBoard mark, turning slowly like a reel on a projector — still
// with Reduce Motion on.
const SpinningMark = ({ size, color }) => {
  const reduceMotion = useReducedMotion();
  const turn = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    turn.value = withRepeat(
      withTiming(360, { duration: SPIN_MS, easing: Easing.linear }),
      -1,
      false,
    );
  }, [reduceMotion, turn]);
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value}deg` }],
  }));
  return (
    <Animated.View style={spinStyle}>
      <ReelBoardIcon size={size} color={color} />
    </Animated.View>
  );
};

// One full-width button: filled, no edge.
const SignInButton = ({
  label,
  icon,
  onPress,
  busy,
  disabled,
  style,
  textStyle,
  colors,
  styles,
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      styles.button,
      style,
      pressed && styles.pressed,
      disabled && !busy && styles.dimmed,
    ]}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    {busy ? (
      <ActivityIndicator color={textStyle?.color ?? colors.textPrimary} />
    ) : (
      icon
    )}
    <Text style={[styles.buttonText, textStyle]}>{label}</Text>
  </Pressable>
);

// The film stills behind everything, one at a time: each drifts slowly
// closer, then fades into the next — the last one stays put underneath
// while the next fades in over it, so it never dips dark between them. The
// stills fade into the page colour itself at their foot, so there's no
// seam. (The film is named in the words under the mark, not on the still.)
// `tick`: how many times it has moved on (the screen keeps the time) — the
// open still is that one, the one under it the one before.
const Stills = ({ movies, tick, styles, background }) => {
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(
      withTiming(1, { duration: DRIFT_MS, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [drift]);
  useEffect(() => {
    movies.forEach((movie) => Image.prefetch(movie.backdrop).catch(() => {}));
  }, [movies]);

  const driftStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1.03 + drift.value * 0.07 }],
  }));

  if (movies.length === 0) return null;
  const movie = movies[tick % movies.length];
  const under = tick > 0 ? movies[(tick - 1) % movies.length] : null;
  return (
    <View style={styles.stills} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, driftStyle]}>
        {under && under.id !== movie.id && (
          <Image
            key={`under-${under.id}`}
            source={{ uri: under.backdrop }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}
        <Animated.Image
          key={movie.id}
          entering={FadeIn.duration(FADE_MS).easing(Easing.inOut(Easing.quad))}
          source={{ uri: movie.backdrop }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      </Animated.View>
      {/* A shade at the top for the clock; then a long, soft fade into
          the page colour. */}
      <LinearGradient
        colors={[
          "rgba(0, 0, 0, 0.45)",
          "rgba(0, 0, 0, 0)",
          `${background}00`,
          `${background}59`,
          `${background}CC`,
          background,
        ]}
        locations={[0, 0.22, 0.45, 0.68, 0.86, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
};

// The way in — the first thing anyone sees, Letterboxd-style: film stills
// crossfading across the top two-thirds, then the ReelBoard mark and name,
// a line about the film on screen that changes with it (tier it, see how
// it fits you, tonight's pick), and two buttons: Get started (Apple,
// Google or email, in a sheet) and Sign in.
// Email sign-in and sign-up open in a sheet too, over the stills.
export const WelcomeScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  // The films are public, so they can show before anyone signs in.
  const [wallReady, setWallReady] = useState(
    () => getSignInWallMovies().length >= WALL_SIZE,
  );
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  // The email sheet: closed, or open to "signIn" / "register".
  const [emailMode, setEmailMode] = useState(null);
  const [lastEmailMode, setLastEmailMode] = useState("signIn");
  const openEmail = (mode) => {
    setLastEmailMode(mode);
    setEmailMode(mode);
  };
  const [busy, setBusy] = useState(null); // "google" | "apple" | null
  const [message, setMessage] = useState(null);

  // Light status-bar icons over the stills (even in light mode) — only
  // while this screen is in front.
  const isFocused = useIsFocused();

  useEffect(() => {
    if (wallReady) return;
    loadWallMovies(SIGN_IN_WALL)
      .then(() => setWallReady(true))
      .catch(() => {}); // no stills without the server — the rest still shows
  }, [wallReady]);

  // The same list each render, so the stills keep their place.
  // Only short titles, so the line about each film stays short.
  const stillMovies = useMemo(
    () =>
      wallReady
        ? getSignInWallMovies().filter(
            (movie) => movie.backdrop && movie.title.length <= MAX_TITLE,
          )
        : [],
    [wallReady],
  );
  // The story's clock: a new still — and a new beat — every few seconds.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), STILL_MS);
    return () => clearInterval(timer);
  }, []);
  const beat = BEATS[tick % BEATS.length];
  const beatMovie = stillMovies.length
    ? stillMovies[tick % stillMovies.length]
    : null;

  const continueWith = async (provider, getCredentials) => {
    setBusy(provider);
    setMessage(null);
    try {
      const credentials = await getCredentials();
      // Backed out of the Google / Apple sheet — nothing to say.
      if (!credentials) return setBusy(null);
      // On success the navigator moves on by itself (the session is set).
      await signInWith(provider, credentials);
    } catch (error) {
      setMessage({
        text: error.message,
        isError: !(error instanceof SignInUnavailable),
      });
      setBusy(null);
    }
  };

  return (
    // No top inset: the stills run up behind the (see-through) status bar.
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {isFocused && <StatusBar style="light" />}
      <Stills
        movies={stillMovies}
        tick={tick}
        styles={styles}
        background={colors.background}
      />

      <View style={[styles.content, { paddingTop: insets.top }]}>
        {/* The mark and the name, then what it does. */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(700)}
          style={styles.brand}
        >
          <View style={styles.brandRow}>
            <SpinningMark size={40} color={colors.textPrimary} />
            <Wordmark size={46} style={styles.brandName} />
          </View>
          {/* The beat: one line about the film on screen, a quiet one under
              it — crossfading with the still. */}
          <View style={styles.beat}>
            <Animated.View
              key={tick}
              entering={FadeIn.duration(FADE_MS / 2)}
              exiting={FadeOut.duration(FADE_MS / 3)}
              style={styles.beatWords}
            >
              <Text style={styles.beatLine} numberOfLines={2}>
                {beat.line(beatMovie?.title)}
              </Text>
              <Text style={styles.beatSub} numberOfLines={1}>
                {t(beat.sub)}
              </Text>
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeIn.delay(500).duration(700)}
          style={styles.footer}
        >
          <SignInButton
            label={t("Get started")}
            onPress={() => setIsSignUpOpen(true)}
            disabled={!!busy}
            style={styles.filled}
            textStyle={styles.filledText}
            colors={colors}
            styles={styles}
          />
          <SignInButton
            label={t("Sign in")}
            onPress={() => openEmail("signIn")}
            disabled={!!busy}
            style={styles.neutral}
            textStyle={styles.neutralText}
            colors={colors}
            styles={styles}
          />
        </Animated.View>
      </View>

      {/* Get started: the ways in. */}
      <BottomSheet
        visible={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
        size="auto"
        title={t("Create your account")}
        subtitle={t("Free, and your tiers follow you to any phone.")}
      >
        <View style={styles.sheetButtons}>
          {!!message && (
            <Text
              style={[styles.message, message.isError && styles.messageError]}
            >
              {message.text}
            </Text>
          )}
          {appleSignInSupported && (
            <SignInButton
              label={t("Continue with Apple")}
              icon={<AppleLogo size={18} color={colors.background} />}
              onPress={() => continueWith("apple", getAppleCredentials)}
              busy={busy === "apple"}
              disabled={!!busy}
              style={styles.filled}
              textStyle={styles.filledText}
              colors={colors}
              styles={styles}
            />
          )}
          {googleSignInConfigured && (
            <SignInButton
              label={t("Continue with Google")}
              icon={<GoogleLogo size={18} />}
              onPress={() => continueWith("google", getGoogleCredentials)}
              busy={busy === "google"}
              disabled={!!busy}
              style={appleSignInSupported ? styles.grey : styles.filled}
              textStyle={
                appleSignInSupported ? styles.greyText : styles.filledText
              }
              colors={colors}
              styles={styles}
            />
          )}
          <SignInButton
            label={t("Sign up with email")}
            icon={
              <Mail size={18} color={colors.textPrimary} strokeWidth={2.2} />
            }
            onPress={() => {
              // This sheet goes first; the email one rises once it's gone.
              setIsSignUpOpen(false);
              setTimeout(() => openEmail("register"), SHEET_HANDOFF_MS);
            }}
            disabled={!!busy}
            style={styles.grey}
            textStyle={styles.greyText}
            colors={colors}
            styles={styles}
          />
        </View>
      </BottomSheet>

      {/* Email: sign in or create an account, over the stills. */}
      <EmailAuthSheet
        visible={emailMode != null}
        mode={emailMode ?? lastEmailMode}
        onClose={() => setEmailMode(null)}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // The stills: the top two-thirds, fading to black at their foot.
    stills: {
      position: "absolute",
      top: 0,
      start: 0,
      end: 0,
      height: "66%",
      overflow: "hidden",
    },
    content: {
      flex: 1,
      justifyContent: "flex-end",
    },
    // The same side margins as the buttons under it.
    brand: {
      paddingHorizontal: spacing.md,
      gap: spacing.md,
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
    },
    // The wordmark (components/Wordmark): marquee capitals, opened up a
    // touch, centred on the reel beside it.
    brandName: {
      letterSpacing: 1,
      color: colors.textPrimary,
    },
    // A fixed height — two lines, then one — so the mark and the buttons
    // never move as the beats change; the old and new beats sit on top of
    // each other while they crossfade.
    beat: {
      height: BEAT_HEIGHT,
    },
    beatWords: {
      position: "absolute",
      top: 0,
      start: 0,
      end: 0,
      gap: 4,
    },
    beatLine: {
      ...typography.title,
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.3,
      color: colors.textPrimary,
    },
    beatSub: {
      ...typography.body,
      fontSize: 15,
      lineHeight: 21,
      color: colors.textSecondary,
    },
    footer: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    sheetButtons: {
      gap: spacing.sm,
      paddingBottom: spacing.sm,
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 50,
      paddingHorizontal: spacing.md,
      borderRadius: shape.control,
      overflow: "hidden",
    },
    buttonText: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    // The main way in: solid, in the page's contrast colour (white on
    // dark, black on light) — Apple's too, as its guidelines ask.
    filled: {
      backgroundColor: colors.textPrimary,
    },
    filledText: {
      color: colors.background,
    },
    // Sign in: the panel grey (#2C3440), quieter than the button slate.
    neutral: {
      backgroundColor: colors.cardElevatedLight,
    },
    neutralText: {
      color: colors.textPrimary,
    },
    // The other ways in: the button slate, white text.
    grey: {
      backgroundColor: colors.buttonFill,
    },
    greyText: {
      color: colors.textPrimary,
    },
    pressed: {
      opacity: 0.8,
    },
    dimmed: {
      opacity: 0.5,
    },
    message: {
      ...typography.caption,
      color: colors.textSecondary,
      textAlign: "center",
    },
    messageError: {
      color: colors.danger,
    },
  });

export default WelcomeScreen;
