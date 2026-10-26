import { Check, Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react-native";
import { forwardRef, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { StackHeader } from "../components/ScreenHeader";
import { t } from "../i18n";
import { register, signIn } from "../services/sync";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

const PASSWORD_MIN = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ICON_COLUMN = 18;

// One row of the fields group: an icon, a small label over the input, and
// (for a password) show / hide. The row lifts a shade while you're in it;
// with `error` its label turns red and says what's wrong.
const Field = forwardRef(
  ({ Icon, label, error, secure, styles, colors, onBlur, ...inputProps }, ref) => {
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(true);
    return (
      <Pressable
        style={[styles.field, focused && styles.fieldFocused]}
        onPress={() => ref?.current?.focus()}
        accessible={false}
      >
        <Icon
          size={ICON_COLUMN}
          color={error ? colors.danger : focused ? colors.textPrimary : colors.textMuted}
          strokeWidth={1.9}
        />
        <View style={styles.fieldText}>
          <Text style={[styles.fieldLabel, !!error && styles.fieldLabelError]} numberOfLines={1}>
            {error ?? label}
          </Text>
          <TextInput
            ref={ref}
            placeholderTextColor={colors.textMuted}
            style={styles.fieldInput}
            secureTextEntry={secure && hidden}
            accessibilityLabel={label}
            {...inputProps}
            onFocus={() => setFocused(true)}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
          />
        </View>
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
      </Pressable>
    );
  },
);

// Sign in or create an account with email and password — reached from the
// welcome screen (`mode`: "register" from "Sign up with email", "signIn"
// from "Sign in"). Plain: back and the title in the header, a line on
// what it's for, the fields as one full-width group, the button, and a
// link to switch. Fields say what's wrong once
// you've left them, and the button always works — pressed too early it
// points at what's missing instead of doing nothing.
export const EmailAuthScreen = ({ navigation, route }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState(route?.params?.mode ?? "signIn");
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
    <View style={styles.container}>
      {/* The title in the header's middle. */}
      <StackHeader
        title={isRegister ? t("Create your account") : t("Welcome back")}
        onBack={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        // Android resizes the window for the keyboard by itself.
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heading}>
            <Text style={styles.intro}>
              {isRegister
                ? t("Your library, tiers, lists and collection ranks are saved to it — on any phone.")
                : t("Sign in to pick up where you left off.")}
            </Text>
          </View>

          {/* The fields: one full-width group, split by hairlines. */}
          <Animated.View layout={LinearTransition.duration(200)} style={styles.group}>
            {isRegister && (
              <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
                <Field
                  ref={nameRef}
                  Icon={UserRound}
                  label={t("Name")}
                  value={name}
                  onChangeText={setName}
                  onBlur={() => touch("name")}
                  error={shown("name")}
                  placeholder={t("What friends call you")}
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  blurOnSubmit={false}
                  styles={styles}
                  colors={colors}
                />
                <View style={styles.divider} />
              </Animated.View>
            )}
            <Field
              ref={emailRef}
              Icon={Mail}
              label={t("Email")}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError(null);
              }}
              onBlur={() => email.trim() && touch("email")}
              error={shown("email")}
              placeholder={t("you@example.com")}
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
            <View style={styles.divider} />
            <Field
              ref={passwordRef}
              Icon={Lock}
              label={t("Password")}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) setError(null);
              }}
              error={shown("password")}
              placeholder={isRegister ? t("At least 8 characters") : t("Your password")}
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
          </Animated.View>

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
            <Animated.View entering={FadeIn.duration(200)} style={styles.errorBand}>
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.submit,
              !ready && styles.submitWaiting,
              pressed && styles.pressed,
            ]}
            onPress={submit}
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: !ready }}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    heading: {
      paddingTop: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    intro: {
      ...typography.body,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
      textAlign: "center",
    },
    // The fields: a full-width band.
    group: {
      marginTop: spacing.lg,
      backgroundColor: colors.card,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      marginStart: spacing.md + ICON_COLUMN + spacing.md,
      backgroundColor: colors.border,
    },
    field: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 62,
      paddingHorizontal: spacing.md,
    },
    fieldFocused: {
      backgroundColor: colors.cardElevated,
    },
    fieldText: {
      flex: 1,
      paddingVertical: spacing.sm,
    },
    fieldLabel: {
      ...typography.caption,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textMuted,
    },
    fieldLabelError: {
      color: colors.danger,
    },
    fieldInput: {
      ...typography.body,
      fontSize: 16,
      lineHeight: 21,
      color: colors.textPrimary,
      paddingVertical: 2,
    },
    rule: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    ruleText: {
      ...typography.caption,
      color: colors.textMuted,
    },
    // The server's answer: a full-width red-tinted band.
    errorBand: {
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
      backgroundColor: `${colors.danger}1F`,
    },
    errorText: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 19,
      color: colors.danger,
    },
    // The button: white, like the welcome screen's Get started; dimmed
    // (but still pressable) until the form is ready.
    submit: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 50,
      marginTop: spacing.lg,
      marginHorizontal: spacing.md,
      backgroundColor: colors.textPrimary,
      borderRadius: shape.control,
    },
    submitWaiting: {
      opacity: 0.45,
    },
    pressed: {
      opacity: 0.8,
    },
    switch: {
      alignSelf: "center",
      marginTop: spacing.lg,
      padding: spacing.sm,
    },
    switchText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    switchLink: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    submitText: {
      ...typography.bodyBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.background,
    },
  });

export default EmailAuthScreen;
