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
import { AppleLogo, GoogleLogo } from "../components/icons/BrandIcons";
import { ReelBoardIcon } from "../components/icons/TabIcons";
import { t } from "../i18n";
import { loadWallMovies } from "../services/movieData";
import {
  SignInUnavailable,
  appleSignInSupported,
  getAppleCredentials,
  getGoogleCredentials,
} from "../services/socialAuth";
import { signInWith } from "../services/sync";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { SIGN_IN_WALL, WALL_SIZE, getSignInWallMovies } from "../utils/posterWalls";

// Each still shows this long, drifting slowly closer, then fades into the
// next.
const STILL_MS = 7000;
const FADE_MS = 1400;
const DRIFT_MS = 14000;

// What ReelBoard does, a line each.
const LINES = [
  "Tier the films you watch.",
  "See how well every film fits your taste.",
  "Let it pick tonight's movie.",
];

// One full-width button: filled, no edge.
const SignInButton = ({ label, icon, onPress, busy, disabled, style, textStyle, colors, styles }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [styles.button, style, pressed && styles.pressed, disabled && !busy && styles.dimmed]}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    {busy ? <ActivityIndicator color={textStyle?.color ?? colors.textPrimary} /> : icon}
    <Text style={[styles.buttonText, textStyle]}>{label}</Text>
  </Pressable>
);

// The film stills behind everything, one at a time: each drifts slowly
// closer, then fades into the next — the last one stays put underneath
// while the next fades in over it, so it never dips dark between them —
// with its film named small at the still's foot, as a credit. The stills
// fade into the page colour itself at their foot, so there's no seam.
const Stills = ({ movies, styles, background }) => {
  // How many times it has moved on: the open still is that one, the one
  // under it the one before.
  const [tick, setTick] = useState(0);
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
    if (movies.length < 2) return undefined;
    const timer = setInterval(() => setTick((value) => value + 1), STILL_MS);
    return () => clearInterval(timer);
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
      <Animated.Text
        key={`credit-${movie.id}`}
        entering={FadeIn.duration(FADE_MS)}
        exiting={FadeOut.duration(FADE_MS / 2)}
        style={styles.credit}
        numberOfLines={1}
      >
        {movie.title}
        {movie.year ? ` (${movie.year})` : ""}
      </Animated.Text>
    </View>
  );
};

// The way in — the first thing anyone sees, Letterboxd-style: film stills
// crossfading across the top two-thirds (each credited at its foot), then
// the ReelBoard mark and name, what it does in three short lines, and two
// buttons: Get started (Apple, Google or email, in a sheet) and Sign in.
export const WelcomeScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  // The films are public, so they can show before anyone signs in.
  const [wallReady, setWallReady] = useState(
    () => getSignInWallMovies().length >= WALL_SIZE,
  );
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [busy, setBusy] = useState(null); // "google" | "apple" | null
  const [message, setMessage] = useState(null);

  // Light status-bar icons over the stills (even in light mode) — only
  // while this screen is in front, so the app's own style comes back on
  // the email screen.
  const isFocused = useIsFocused();

  useEffect(() => {
    if (wallReady) return;
    loadWallMovies(SIGN_IN_WALL)
      .then(() => setWallReady(true))
      .catch(() => {}); // no stills without the server — the rest still shows
  }, [wallReady]);

  // The same list each render, so the stills keep their place.
  const stillMovies = useMemo(
    () => (wallReady ? getSignInWallMovies().filter((movie) => movie.backdrop) : []),
    [wallReady],
  );

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
      setMessage({ text: error.message, isError: !(error instanceof SignInUnavailable) });
      setBusy(null);
    }
  };

  return (
    // No top inset: the stills run up behind the (see-through) status bar.
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {isFocused && <StatusBar style="light" />}
      <Stills movies={stillMovies} styles={styles} background={colors.background} />

      <View style={[styles.content, { paddingTop: insets.top }]}>
        {/* The mark and the name, then what it does. */}
        <Animated.View entering={FadeInDown.delay(200).duration(700)} style={styles.brand}>
          <View style={styles.brandRow}>
            <ReelBoardIcon size={40} color={colors.textPrimary} />
            <Text style={styles.brandName}>ReelBoard</Text>
          </View>
          <View style={styles.lines}>
            {LINES.map((line) => (
              <Text key={line} style={styles.line}>
                {t(line)}
              </Text>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(500).duration(700)} style={styles.footer}>
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
            onPress={() => navigation.navigate("EmailAuth", { mode: "signIn" })}
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
            <Text style={[styles.message, message.isError && styles.messageError]}>
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
          <SignInButton
            label={t("Continue with Google")}
            icon={<GoogleLogo size={18} />}
            onPress={() => continueWith("google", getGoogleCredentials)}
            busy={busy === "google"}
            disabled={!!busy}
            style={appleSignInSupported ? styles.grey : styles.filled}
            textStyle={appleSignInSupported ? styles.greyText : styles.filledText}
            colors={colors}
            styles={styles}
          />
          <SignInButton
            label={t("Sign up with email")}
            icon={<Mail size={18} color={colors.textPrimary} strokeWidth={2.2} />}
            onPress={() => {
              setIsSignUpOpen(false);
              navigation.navigate("EmailAuth", { mode: "register" });
            }}
            disabled={!!busy}
            style={styles.grey}
            textStyle={styles.greyText}
            colors={colors}
            styles={styles}
          />
        </View>
      </BottomSheet>
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
    // The film's name, small and quiet, at the still's foot.
    credit: {
      position: "absolute",
      bottom: spacing.sm,
      end: spacing.md,
      maxWidth: "70%",
      fontFamily: fonts.medium,
      fontSize: 11,
      lineHeight: 14,
      color: "rgba(255, 255, 255, 0.6)",
    },
    content: {
      flex: 1,
      justifyContent: "flex-end",
    },
    brand: {
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
    },
    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
    },
    brandName: {
      fontFamily: fonts.extraBold,
      fontSize: 34,
      lineHeight: 40,
      letterSpacing: -0.6,
      color: colors.textPrimary,
    },
    lines: {
      gap: 2,
    },
    line: {
      ...typography.body,
      fontSize: 17,
      lineHeight: 25,
      color: colors.textSecondary,
    },
    footer: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xl,
      paddingBottom: spacing.md,
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
    // Sign in: a quiet neutral grey.
    neutral: {
      backgroundColor: colors.buttonFill,
    },
    neutralText: {
      color: colors.textPrimary,
    },
    // The other ways in: the button grey, normal text.
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
