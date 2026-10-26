import { Check, Eye, EyeOff } from "lucide-react-native";
import { forwardRef, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";

import { t } from "../i18n";
import { register, signIn } from "../services/sync";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";
import { BottomSheet } from "./BottomSheet";

const PASSWORD_MIN = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// One field: a rounded box sunk a step darker than the sheet, the
// placeholder its only label; it lifts a shade while you're in it. With
// `error`, a red line under it says what's wrong. Passwords get show / hide.
const Field = forwardRef(({ error, secure, styles, colors, onBlur, ...inputProps }, ref) => {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.fieldWrap}>
      <View style={[styles.field, focused && styles.fieldFocused]}>
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          style={styles.fieldInput}
          secureTextEntry={secure && hidden}
          {...inputProps}
          onFocus={() => setFocused(true)}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden((value) => !value)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? t("Show password") : t("Hide password")}
          >
            {hidden ? (
              <Eye size={18} color={colors.textMuted} />
            ) : (
              <EyeOff size={18} color={colors.textMuted} />
            )}
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
});

// Sign in or create an account with email, in a sheet over the welcome
// screen's stills (`mode`: "signIn" or "register" — the link at the foot
// switches). Fields say what's wrong once you've left them; the button
// always works — pressed too early, it points at what's missing.
export const EmailAuthSheet = ({ visible, onClose, mode: initialMode = "signIn" }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Which fields have been left (or the button pressed): only then do they
  // say what's wrong.
  const [touched, setTouched] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  // Each opening starts in the mode it was opened for, messages cleared.
  useEffect(() => {
    if (!visible) return;
    setMode(initialMode);
    setTouched({});
    setError(null);
    setBusy(false);
  }, [visible, initialMode]);

  const isRegister = mode === "register";
  const emailValid = EMAIL_PATTERN.test(email.trim());
  const passwordLongEnough = password.length >= PASSWORD_MIN;
  const problems = {
    name: isRegister && !name.trim() ? t("Add your name") : null,
    email: !email.trim()
      ? t("Add your email")
      : !emailValid
        ? t("That doesn't look like an email address")
        : null,
    password: !password
      ? t("Add a password")
      : isRegister && !passwordLongEnough
        ? t("At least 8 characters")
        : null,
  };
  const shown = (key) => (touched[key] ? problems[key] : null);
  const ready = !problems.name && !problems.email && !problems.password;
  const touch = (key) => setTouched((value) => ({ ...value, [key]: true }));

  const submit = async () => {
    if (busy) return;
    if (!ready) {
      // Show what's missing, and go to the first of it.
      setTouched({ name: true, email: true, password: true });
      if (problems.name) nameRef.current?.focus();
      else if (problems.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
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

  const switchMode = () => {
    setMode(isRegister ? "signIn" : "register");
    setError(null);
    setTouched({});
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      size="auto"
      title={isRegister ? t("Create your account") : t("Sign in")}
      subtitle={
        isRegister
          ? t("Your library, tiers, lists and collection ranks, on any phone.")
          : t("Pick up where you left off.")
      }
    >
      <Animated.View layout={LinearTransition.duration(200)} style={styles.form}>
        {isRegister && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
            <Field
              ref={nameRef}
              value={name}
              onChangeText={setName}
              onBlur={() => touch("name")}
              error={shown("name")}
              placeholder={t("Name")}
              accessibilityLabel={t("Name")}
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              blurOnSubmit={false}
              styles={styles}
              colors={colors}
            />
          </Animated.View>
        )}
        <Field
          ref={emailRef}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (error) setError(null);
          }}
          onBlur={() => email.trim() && touch("email")}
          error={shown("email")}
          placeholder={t("Email")}
          accessibilityLabel={t("Email")}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          blurOnSubmit={false}
          styles={styles}
          colors={colors}
        />
        <Field
          ref={passwordRef}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (error) setError(null);
          }}
          error={shown("password")}
          placeholder={t("Password")}
          accessibilityLabel={t("Password")}
          secure
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={isRegister ? "new-password" : "current-password"}
          textContentType={isRegister ? "newPassword" : "password"}
          returnKeyType="go"
          onSubmitEditing={submit}
          styles={styles}
          colors={colors}
        />

        {/* The one rule, ticked as you type. */}
        {isRegister && (
          <View style={styles.rule}>
            <Check
              size={14}
              color={passwordLongEnough ? colors.success : colors.textMuted}
              strokeWidth={2.5}
            />
            <Text style={[styles.ruleText, passwordLongEnough && { color: colors.success }]}>
              {t("At least 8 characters")}
            </Text>
          </View>
        )}

        {/* What the server said (wrong password, email taken…). */}
        {!!error && (
          <Animated.View entering={FadeIn.duration(200)}>
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}

        <Pressable
          style={({ pressed }) => [styles.submit, pressed && styles.pressed]}
          onPress={submit}
          accessibilityRole="button"
          accessibilityState={{ busy }}
        >
          {busy ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.submitText}>
              {isRegister ? t("Create account") : t("Sign in")}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={switchMode} hitSlop={8} style={styles.switch} accessibilityRole="button">
          <Text style={styles.switchText}>
            {isRegister ? t("Already have an account?") : t("New to ReelBoard?")}{" "}
            <Text style={styles.switchLink}>
              {isRegister ? t("Sign in") : t("Create an account")}
            </Text>
          </Text>
        </Pressable>
      </Animated.View>
    </BottomSheet>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    form: {
      gap: spacing.sm + 2,
      paddingBottom: spacing.sm,
    },
    fieldWrap: {
      gap: 6,
    },
    // Sunk a step darker than the sheet; lifted while you type in it.
    field: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minHeight: 52,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.control,
    },
    fieldFocused: {
      backgroundColor: colors.cardElevatedLight,
    },
    fieldInput: {
      ...typography.body,
      fontSize: 16,
      lineHeight: 21,
      flex: 1,
      paddingVertical: spacing.sm + 2,
      color: colors.textPrimary,
    },
    fieldError: {
      ...typography.caption,
      color: colors.danger,
      paddingHorizontal: spacing.xs,
    },
    rule: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: spacing.xs,
    },
    ruleText: {
      ...typography.caption,
      color: colors.textMuted,
    },
    errorText: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 19,
      color: colors.danger,
      textAlign: "center",
    },
    // White, like every main button — full strength even before the form's
    // ready (pressed early, it points at what's missing).
    submit: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 50,
      marginTop: spacing.xs,
      backgroundColor: colors.textPrimary,
      borderRadius: shape.control,
    },
    pressed: {
      opacity: 0.8,
    },
    submitText: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.background,
    },
    switch: {
      alignSelf: "center",
      paddingVertical: spacing.sm,
    },
    switchText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    switchLink: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
  });

export default EmailAuthSheet;
