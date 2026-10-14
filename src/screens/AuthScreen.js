import { useState } from "react";
import { Image, Pressable, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";

import { Text } from "../components/AppText";
import { PrimaryButton } from "../components/PrimaryButton";
import { t } from "../i18n";
import { API_URL } from "../services/api";
import { register, signIn } from "../services/sync";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

const LOGO_LIGHT = require("../../assets/reelboard-logo-black.png");
const LOGO_DARK = require("../../assets/reelboard-logo-white.png");

const Field = ({ label, styles, colors, ...inputProps }) => (
  <>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={styles.fieldBox}>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={styles.fieldInput}
        {...inputProps}
      />
    </View>
  </>
);

// The way in: sign in, or create an account. Everything in ReelBoard
// belongs to an account on the server, so this comes before anything else.
export const AuthScreen = () => {
  const colors = useColors();
  const styles = createStyles(colors);
  const [mode, setMode] = useState("signIn"); // "signIn" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const isRegister = mode === "register";

  const submit = async () => {
    if (busy) return;
    if (isRegister && !name.trim()) {
      setError(t("Enter your name"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // On success the navigator moves on by itself (the session is set).
      if (isRegister) {
        await register({ displayName: name.trim(), email: email.trim(), password });
      } else {
        await signIn({ email: email.trim(), password });
      }
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={colors.isDark ? LOGO_DARK : LOGO_LIGHT}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.intro}>
          {isRegister
            ? t("Create your account — your library, tiers and boards are saved to it.")
            : t("Welcome back. Sign in to pick up where you left off.")}
        </Text>

        <View style={styles.modeRow}>
          {[
            ["signIn", t("Sign in")],
            ["register", t("Create account")],
          ].map(([key, label]) => {
            const selected = mode === key;
            return (
              <Pressable
                key={key}
                style={[styles.modeOption, selected && styles.modeOptionActive]}
                onPress={() => {
                  setMode(key);
                  setError(null);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.modeText, selected && styles.modeTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isRegister && (
          <Field
            label={t("Name")}
            value={name}
            onChangeText={setName}
            placeholder={t("Your name")}
            autoComplete="name"
            styles={styles}
            colors={colors}
          />
        )}
        <Field
          label={t("Email")}
          value={email}
          onChangeText={setEmail}
          placeholder={t("you@example.com")}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          styles={styles}
          colors={colors}
        />
        <Field
          label={t("Password")}
          value={password}
          onChangeText={setPassword}
          placeholder={isRegister ? t("At least 8 characters") : ""}
          secureTextEntry
          autoComplete={isRegister ? "new-password" : "current-password"}
          onSubmitEditing={submit}
          styles={styles}
          colors={colors}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <PrimaryButton
          label={
            busy ? t("Please wait…") : isRegister ? t("Create account") : t("Sign in")
          }
          onPress={submit}
          disabled={busy || !email.trim() || !password}
          style={styles.submit}
        />

        <Text style={styles.server}>
          {t("Server")}: {API_URL}
        </Text>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingTop: spacing.xl,
      paddingBottom: spacing.xl,
    },
    logo: {
      alignSelf: "center",
      width: 180,
      height: 48,
    },
    intro: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    // Same square, edge-to-edge toggle as Settings' theme picker.
    modeRow: {
      flexDirection: "row",
      gap: 2,
      marginTop: spacing.lg,
    },
    modeOption: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacing.md,
      backgroundColor: colors.card,
    },
    modeOptionActive: {
      backgroundColor: colors.selected,
    },
    modeText: {
      ...typography.bodyBold,
      fontSize: 14,
      color: colors.textSecondary,
    },
    modeTextActive: {
      color: colors.selectedText,
    },
    fieldLabel: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    fieldBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      paddingHorizontal: spacing.md,
      minHeight: 48,
    },
    fieldInput: {
      ...typography.body,
      flex: 1,
      color: colors.textPrimary,
      paddingVertical: spacing.sm,
    },
    error: {
      ...typography.caption,
      color: colors.danger,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    submit: {
      marginTop: spacing.lg,
      marginHorizontal: spacing.md,
    },
    server: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.xl,
      paddingHorizontal: spacing.md,
    },
  });

export default AuthScreen;
