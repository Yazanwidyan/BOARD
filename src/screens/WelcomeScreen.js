import { useIsFocused } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { Crown, ListOrdered, Mail, Sparkles } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { AppleLogo, GoogleLogo } from "../components/icons/BrandIcons";
import { ReelBoardIcon } from "../components/icons/TabIcons";
import { PosterWall } from "../components/PosterWall";
import { t } from "../i18n";
import { loadWallMovies } from "../services/movieData";
import {
  SignInUnavailable,
  appleSignInSupported,
  getAppleCredentials,
  getGoogleCredentials,
} from "../services/socialAuth";
import { signInWith } from "../services/sync";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { SIGN_IN_WALL, WALL_SIZE, getSignInWallMovies } from "../utils/posterWalls";

const WALL_COLUMNS = 3;

// One full-width, square-cornered sign-in button, like onboarding's footer.
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

// The way in — the first thing anyone sees: the poster wall from
// onboarding, what ReelBoard does in three words, and Continue with
// Google / Apple (iPhone), Sign up with email — and, for anyone coming
// back, "I already have an account", straight to signing in.
const FEATURES = [
  { key: "tier", label: "Tier what you watch", Icon: ListOrdered },
  { key: "collections", label: "Climb collections", Icon: Crown },
  { key: "pick", label: "Get tonight's pick", Icon: Sparkles },
];

export const WelcomeScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  // The wall's movies are public, so it can show before anyone signs in.
  const [wallReady, setWallReady] = useState(
    () => getSignInWallMovies().length >= WALL_SIZE,
  );
  const [busy, setBusy] = useState(null); // "google" | "apple" | null
  const [message, setMessage] = useState(null);
  const insets = useSafeAreaInsets();

  // Light status-bar icons over the posters (even in light mode) — only
  // while this screen is in front, so the app's own style comes back on
  // the email screen.
  const isFocused = useIsFocused();

  useEffect(() => {
    if (wallReady) return;
    loadWallMovies(SIGN_IN_WALL)
      .then(() => setWallReady(true))
      .catch(() => {}); // no wall without the server — the buttons still show
  }, [wallReady]);

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
    // No top inset: the wall runs up behind the (see-through) status bar.
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {isFocused && <StatusBar style="light" />}
      <View style={styles.welcome}>
        {wallReady && (
          <Animated.View entering={FadeIn.duration(600)} style={StyleSheet.absoluteFill}>
            <PosterWall
              movies={getSignInWallMovies()}
              columns={WALL_COLUMNS}
            />
          </Animated.View>
        )}
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(2, 0, 2, 0.35)", colors.background]}
          locations={[0, 0.72]}
          style={StyleSheet.absoluteFill}
        />
        {/* A soft shade under the status bar, so the clock and battery
            stay readable over the posters. */}
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(0, 0, 0, 0.55)", "rgba(0, 0, 0, 0)"]}
          style={[styles.statusShade, { height: insets.top + spacing.xl }]}
        />
        <View style={styles.welcomeText}>
          <ReelBoardIcon size={56} color={colors.textPrimary} />
          <Text style={styles.title}>{t("Bored? Let's fix that.")}</Text>
          <Text style={styles.subtitle}>
            {t("Track what you watch, tier it with friends, and let ReelBoard pick tonight's movie.")}
          </Text>
          <View style={styles.features}>
            {FEATURES.map(({ key, label, Icon }) => (
              <View key={key} style={styles.feature}>
                <Icon size={14} color={colors.rating} strokeWidth={2.2} />
                <Text style={styles.featureText}>{t(label)}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        {!!message && (
          <Text style={[styles.message, message.isError && styles.messageError]}>
            {message.text}
          </Text>
        )}
        <SignInButton
          label={t("Continue with Google")}
          icon={<GoogleLogo size={18} />}
          onPress={() => continueWith("google", getGoogleCredentials)}
          busy={busy === "google"}
          disabled={!!busy}
          style={styles.outlined}
          colors={colors}
          styles={styles}
        />
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
          label={t("Sign up with email")}
          icon={<Mail size={18} color={colors.textPrimary} strokeWidth={2.2} />}
          onPress={() => navigation.navigate("EmailAuth", { mode: "register" })}
          disabled={!!busy}
          style={styles.outlined}
          colors={colors}
          styles={styles}
        />
        <Pressable
          onPress={() => navigation.navigate("EmailAuth", { mode: "signIn" })}
          disabled={!!busy}
          hitSlop={6}
          style={styles.signInLink}
          accessibilityRole="button"
        >
          <Text style={styles.signInText}>
            {t("Already have an account?")}{" "}
            <Text style={styles.signInStrong}>{t("Sign in")}</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    welcome: {
      flex: 1,
      justifyContent: "flex-end",
      overflow: "hidden",
    },
    statusShade: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
    },
    welcomeText: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.lg,
      gap: spacing.sm,
    },
    title: {
      ...typography.display,
      color: colors.textPrimary,
      marginTop: spacing.md,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      lineHeight: 21,
    },
    footer: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    // Square corners and 50pt tall, like onboarding's "Get started".
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      minHeight: 50,
      paddingHorizontal: spacing.md,
    },
    buttonText: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    // Apple's: solid, in the page's contrast colour (white on dark, black
    // on light), as Apple's guidelines ask.
    filled: {
      backgroundColor: colors.textPrimary,
    },
    filledText: {
      color: colors.background,
    },
    outlined: {
      backgroundColor: colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    pressed: {
      opacity: 0.8,
    },
    dimmed: {
      opacity: 0.5,
    },
    features: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    feature: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 6,
      backgroundColor: colors.surfaceSoft,
    },
    featureText: {
      ...typography.caption,
      color: colors.textPrimary,
    },
    signInLink: {
      alignSelf: "center",
      paddingVertical: spacing.sm,
    },
    signInText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    signInStrong: {
      ...typography.bodyBold,
      color: colors.textPrimary,
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
