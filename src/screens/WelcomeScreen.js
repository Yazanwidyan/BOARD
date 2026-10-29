import { useIsFocused } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Mail } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeInDown,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
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
import { EmailAuthSheet } from "../components/EmailAuthSheet";
import { AppleLogo, GoogleLogo } from "../components/icons/BrandIcons";
import { ReelBoardIcon } from "../components/icons/TabIcons";
import { MoviePoster } from "../components/MoviePoster";
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
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import {
  SIGN_IN_WALL,
  WALL_SIZE,
  getSignInWallMovies,
} from "../utils/posterWalls";

// The poster wall: four columns, tilted, each a loop of posters drifting
// (every other one the other way), slow enough to read as calm. The tilt
// turns a frame a little bigger than the wall, so no corner shows empty.
const COLUMNS = 4;
const WALL_HEIGHT = 0.68;
const FRAME_OVERSIZE = 0.35;
const COLUMN_GAP = 10;
const PER_COLUMN = 5;
const DRIFT_MS = 38000;
const TILT = "-9deg";
// What ReelBoard is, in three slides you swipe — or that move on by
// themselves every few seconds until you touch them.
const SLIDES = [
  {
    key: "tonight",
    title: "Know what to watch tonight.",
    body: "Picks made from your taste, with the reasons why — ready when you are.",
  },
  {
    key: "tier",
    title: "Tier every film you watch.",
    body: "S to F, your way. Your tiers teach ReelBoard your taste and build your profile.",
  },
  {
    key: "together",
    title: "Decide together.",
    body: "Bring friends in, swipe a short stack, and land on one film you'll all enjoy.",
  },
];
const SLIDE_MS = 5000;

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

// A slide's dot: it follows the swipe as it happens — stretching and
// turning red as its slide comes in, shrinking back to grey as it leaves.
const Dot = ({ index, scrollX, slideWidth, colors, styles }) => {
  const style = useAnimatedStyle(() => {
    const at = scrollX.value / slideWidth;
    const range = [index - 1, index, index + 1];
    return {
      width: interpolate(at, range, [6, 18, 6], Extrapolation.CLAMP),
      backgroundColor: interpolateColor(at, range, [colors.buttonFill, colors.brand, colors.buttonFill]),
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
};

// One column of the wall: its posters twice over, moving one set's height
// and starting again — so it never ends. Still with Reduce Motion on.
const WallColumn = ({ movies, width, reverse, styles }) => {
  const reduceMotion = useReducedMotion();
  const posterHeight = width * 1.5;
  const loop = movies.length * (posterHeight + COLUMN_GAP);
  const move = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion || loop === 0) return;
    move.value = withRepeat(withTiming(1, { duration: DRIFT_MS, easing: Easing.linear }), -1, false);
  }, [reduceMotion, loop, move]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: reverse ? -loop + move.value * loop : -move.value * loop }],
  }));
  return (
    <Animated.View style={[styles.column, { width }, style]}>
      {[...movies, ...movies].map((movie, index) => (
        <MoviePoster key={`${movie.id}-${index}`} uri={movie.poster} style={{ width, height: posterHeight }} />
      ))}
    </Animated.View>
  );
};

// The way in — the first thing anyone sees: a tilted wall of posters
// drifting up the top of the screen, fading to black; the ReelBoard mark,
// what it's for in three short slides (with dots), and the ways in right
// there — Apple (white), Google (grey), email (a red link) — with Sign in
// for an account you already have. Email opens in a sheet over the wall.
export const WelcomeScreen = () => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // The films are public, so they can show before anyone signs in.
  const [wallReady, setWallReady] = useState(
    () => getSignInWallMovies().length >= WALL_SIZE,
  );
  // The email sheet: closed, or open to "signIn" / "register".
  const [emailMode, setEmailMode] = useState(null);
  const [lastEmailMode, setLastEmailMode] = useState("signIn");
  const openEmail = (mode) => {
    setLastEmailMode(mode);
    setEmailMode(mode);
  };
  const [busy, setBusy] = useState(null); // "google" | "apple" | null
  // The slides: which one shows, moving on by itself until you swipe.
  const slidesRef = useRef(null);
  const [slide, setSlide] = useState(0);
  const [slidesTouched, setSlidesTouched] = useState(false);
  // Where the slides are, as they move — for the dots.
  const scrollX = useSharedValue(0);
  const onSlidesScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });
  // A slide is the screen's width (its words inside the page's margins),
  // so each swipe lands exactly on the next.
  const slideWidth = width;
  useEffect(() => {
    if (slidesTouched) return undefined;
    const timer = setInterval(() => setSlide((current) => (current + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, [slidesTouched]);
  // Moving on by itself: scroll to the slide.
  useEffect(() => {
    if (!slidesTouched) slidesRef.current?.scrollTo({ x: slide * slideWidth, animated: true });
  }, [slide, slidesTouched, slideWidth]);
  const [message, setMessage] = useState(null);

  // Light status-bar icons over the wall (even in light mode) — only while
  // this screen is in front.
  const isFocused = useIsFocused();

  useEffect(() => {
    if (wallReady) return;
    loadWallMovies(SIGN_IN_WALL)
      .then(() => setWallReady(true))
      .catch(() => {}); // no wall without the server — the rest still shows
  }, [wallReady]);

  // The wall's columns, each starting at a different film.
  const columns = useMemo(() => {
    const movies = wallReady ? getSignInWallMovies() : [];
    if (movies.length === 0) return [];
    return Array.from({ length: COLUMNS }, (_, column) =>
      Array.from({ length: PER_COLUMN }, (_, index) => movies[(column * 3 + index) % movies.length]),
    );
  }, [wallReady]);
  // The frame the tilt turns: bigger than the wall on every side, centred
  // on it, so the turned columns still cover all of it.
  const wallHeight = height * WALL_HEIGHT;
  const frame = {
    width: width * (1 + FRAME_OVERSIZE),
    height: wallHeight * (1 + FRAME_OVERSIZE),
    top: -(wallHeight * FRAME_OVERSIZE) / 2,
    start: -(width * FRAME_OVERSIZE) / 2,
  };
  const columnWidth = (frame.width - COLUMN_GAP * (COLUMNS - 1)) / COLUMNS;

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

  // No Apple or Google here: email is the main way in.
  const emailFirst = !appleSignInSupported && !googleSignInConfigured;

  return (
    // No top inset: the wall runs up behind the (see-through) status bar.
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {isFocused && <StatusBar style="light" />}

      {/* The wall, fading into black. */}
      <View style={styles.wall} pointerEvents="none">
        <View style={[styles.wallTilt, frame]}>
          {columns.map((movies, index) => (
            <WallColumn key={index} movies={movies} width={columnWidth} reverse={index % 2 === 1} styles={styles} />
          ))}
        </View>
        <LinearGradient
          colors={["rgba(0, 0, 0, 0.55)", "rgba(0, 0, 0, 0.1)", `${colors.background}99`, colors.background]}
          locations={[0, 0.25, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={[styles.content, { paddingTop: insets.top }]}>
        {/* The mark, then what it's for. */}
        <Animated.View entering={FadeInDown.delay(200).duration(700)} style={styles.brand}>
          <View style={styles.brandRow}>
            <ReelBoardIcon size={30} color={colors.textPrimary} />
            <Wordmark size={34} style={styles.brandName} />
          </View>
        </Animated.View>
        {/* What it's for, slide by slide. */}
        <Animated.View entering={FadeInDown.delay(350).duration(700)}>
          <Animated.ScrollView
            ref={slidesRef}
            onScroll={onSlidesScroll}
            scrollEventThrottle={16}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.slides}
            onScrollBeginDrag={() => setSlidesTouched(true)}
            onMomentumScrollEnd={(event) => setSlide(Math.round(event.nativeEvent.contentOffset.x / slideWidth))}
          >
            {SLIDES.map(({ key, title, body }) => (
              <View key={key} style={[styles.slide, { width: slideWidth }]}>
                <Text style={styles.headline}>{t(title)}</Text>
                <Text style={styles.sub}>{t(body)}</Text>
              </View>
            ))}
          </Animated.ScrollView>
          <View style={styles.dots}>
            {SLIDES.map((item, index) => (
              <Dot key={item.key} index={index} scrollX={scrollX} slideWidth={slideWidth} colors={colors} styles={styles} />
            ))}
          </View>
        </Animated.View>

        {/* The ways in, right here. */}
        <Animated.View entering={FadeIn.delay(500).duration(700)} style={styles.footer}>
          {!!message && (
            <Text style={[styles.message, message.isError && styles.messageError]}>{message.text}</Text>
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
              textStyle={appleSignInSupported ? styles.greyText : styles.filledText}
              colors={colors}
              styles={styles}
            />
          )}
          {emailFirst ? (
            <SignInButton
              label={t("Sign up with email")}
              icon={<Mail size={18} color={colors.background} strokeWidth={2.2} />}
              onPress={() => openEmail("register")}
              disabled={!!busy}
              style={styles.filled}
              textStyle={styles.filledText}
              colors={colors}
              styles={styles}
            />
          ) : (
            <Pressable
              onPress={() => openEmail("register")}
              disabled={!!busy}
              hitSlop={8}
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Mail size={16} color={colors.brand} strokeWidth={2.2} />
              <Text style={styles.linkText}>{t("Continue with email")}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => openEmail("signIn")}
            disabled={!!busy}
            hitSlop={8}
            style={({ pressed }) => [styles.signIn, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <Text style={styles.signInText}>
              {t("Have an account?")} <Text style={styles.signInStrong}>{t("Sign in")}</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* Email: sign in or create an account, over the wall. */}
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
    // The wall: the top two-thirds, fading to black at its foot.
    wall: {
      position: "absolute",
      top: 0,
      start: 0,
      end: 0,
      height: `${WALL_HEIGHT * 100}%`,
      overflow: "hidden",
    },
    // Placed and sized per screen (see `frame`); turned about its own centre.
    wallTilt: {
      position: "absolute",
      flexDirection: "row",
      gap: COLUMN_GAP,
      transform: [{ rotate: TILT }],
    },
    column: {
      gap: COLUMN_GAP,
    },
    content: {
      flex: 1,
      justifyContent: "flex-end",
    },
    brand: {
      paddingHorizontal: spacing.md,
    },
    slides: {
      flexGrow: 0,
    },
    // A fixed height, so the buttons under it never move between slides.
    slide: {
      height: 150,
      paddingHorizontal: spacing.md,
    },
    dots: {
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: spacing.md,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.buttonFill,
    },

    brandRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    // The wordmark (components/Wordmark), beside the mark.
    brandName: {
      letterSpacing: 1,
      color: colors.textPrimary,
    },
    // What it's for: big and bold, then a quiet line.
    headline: {
      fontFamily: fonts.extraBold,
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: -0.9,
      color: colors.textPrimary,
    },
    sub: {
      ...typography.body,
      fontSize: 16,
      lineHeight: 23,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    footer: {
      gap: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 52,
      paddingHorizontal: spacing.md,
      borderRadius: shape.card,
      overflow: "hidden",
    },
    buttonText: {
      ...typography.bodyBold,
      fontSize: 16,
      lineHeight: 21,
      color: colors.textPrimary,
    },
    // The main way in: solid, in the page's contrast colour (white on
    // dark) — Apple's too, as its guidelines ask.
    filled: {
      backgroundColor: colors.textPrimary,
    },
    filledText: {
      color: colors.background,
    },
    grey: {
      backgroundColor: colors.buttonFill,
    },
    greyText: {
      color: colors.textPrimary,
    },
    // Email: a link in the signature colour.
    link: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    linkText: {
      ...typography.bodyBold,
      fontSize: 15,
      color: colors.brand,
    },
    signIn: {
      alignSelf: "center",
      paddingVertical: spacing.xs,
    },
    signInText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    signInStrong: {
      fontFamily: fonts.bold,
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
