import { Check, Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react-native";
import { forwardRef, useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { Text } from "../components/AppText";
import { PrimaryButton } from "../components/PrimaryButton";
import {
  StackHeader,
  useStackHeaderScroll,
} from "../components/ScreenHeader";
import { t } from "../i18n";
import { register, signIn } from "../services/sync";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

const PASSWORD_MIN = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// One field: an icon, the input, and (for a password) show / hide. The
// box lights up while you're in it, and goes red with `error`.
const Field = forwardRef(
  ({ Icon, label, error, secure, styles, colors, onBlur, ...inputProps }, ref) => {
    const [focused, setFocused] = useState(false);
    const [hidden, setHidden] = useState(true);
    return (
      <View style={styles.fieldWrap}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View
          style={[
            styles.fieldBox,
            focused && styles.fieldBoxFocused,
            !!error && styles.fieldBoxError,
          ]}
        >
          <Icon
            size={18}
            color={focused ? colors.textPrimary : colors.textMuted}
            strokeWidth={1.9}
          />
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
  },
);

// Sign in or create an account with email and password — reached from the
// welcome screen (`mode`: "register" from "Sign up with email", "signIn"
// from "I already have an account"). A big heading says which; the link at
// the bottom switches. Fields say what's wrong as you go (an email that
// doesn't look like one, a password that's too short) rather than after a
// failed try.
export const EmailAuthScreen = ({ navigation, route }) => {
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState(route?.params?.mode ?? "signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [headingBottom, setHeadingBottom] = useState(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const isRegister = mode === "register";
  const emailValid = EMAIL_PATTERN.test(email.trim());
  const passwordLongEnough = password.length >= PASSWORD_MIN;
  const canSubmit =
    !busy &&
    emailValid &&
    (isRegister ? passwordLongEnough && name.trim().length > 0 : password.length > 0);

  const submit = async () => {
    if (!canSubmit) {
      setEmailTouched(true);
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
  };

  return (
    <View style={styles.container}>
      <StackHeader
        title={isRegister ? t("Create account") : t("Sign in")}
        onBack={() => navigation.goBack()}
        scrollY={headerScroll.scrollY}
        titleRevealAt={headingBottom}
      />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View
          style={styles.heading}
          onLayout={(event) => {
            const { y, height } = event.nativeEvent.layout;
            setHeadingBottom(y + height);
          }}
        >
          <Text style={styles.title}>
            {isRegister ? t("Create your account") : t("Welcome back")}
          </Text>
          <Text style={styles.intro}>
            {isRegister
              ? t("Your library, tiers, boards and collection ranks are saved to it — on any phone.")
              : t("Sign in to pick up where you left off.")}
          </Text>
        </View>

        {isRegister && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
            <Field
              Icon={UserRound}
              label={t("Name")}
              value={name}
              onChangeText={setName}
              placeholder={t("What friends call you")}
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
          Icon={Mail}
          label={t("Email")}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (error) setError(null);
          }}
          onBlur={() => setEmailTouched(true)}
          error={
            emailTouched && email.trim() && !emailValid
              ? t("That doesn't look like an email address")
              : null
          }
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
        <Field
          ref={passwordRef}
          Icon={Lock}
          label={t("Password")}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            if (error) setError(null);
          }}
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

        {!!error && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </Animated.View>
        )}

        <PrimaryButton
          label={busy ? t("Please wait…") : isRegister ? t("Create account") : t("Sign in")}
          onPress={submit}
          disabled={!canSubmit}
          style={styles.submit}
        />

        <Pressable onPress={switchMode} hitSlop={8} style={styles.switch} accessibilityRole="button">
          <Text style={styles.switchText}>
            {isRegister ? t("Already have an account?") : t("New to ReelBoard?")}{" "}
            <Text style={styles.switchLink}>
              {isRegister ? t("Sign in") : t("Create an account")}
            </Text>
          </Text>
        </Pressable>
      </Animated.ScrollView>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingTop: spacing.sm,
    },
    heading: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.xs + 2,
    },
    title: {
      ...typography.display,
      color: colors.textPrimary,
    },
    intro: {
      ...typography.body,
      color: colors.textSecondary,
      lineHeight: 21,
    },
    fieldWrap: {
      marginTop: spacing.md,
    },
    fieldLabel: {
      ...typography.caption,
      color: colors.textMuted,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    // A filled band; a line along the bottom while you're typing in it.
    fieldBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      minHeight: 52,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
      borderRadius: shape.control,
      marginHorizontal: spacing.md,
    },
    fieldBoxFocused: {
      borderBottomColor: colors.textPrimary,
    },
    fieldBoxError: {
      borderBottomColor: colors.danger,
    },
    fieldInput: {
      ...typography.body,
      fontSize: 15,
      lineHeight: 20,
      flex: 1,
      color: colors.textPrimary,
      paddingVertical: spacing.sm + 2,
    },
    fieldError: {
      ...typography.caption,
      color: colors.danger,
      marginTop: spacing.xs + 2,
      paddingHorizontal: spacing.md,
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
    errorBox: {
      marginTop: spacing.md,
      marginHorizontal: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      backgroundColor: `${colors.danger}1F`,
      borderRadius: shape.control,
    },
    errorText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.danger,
    },
    submit: {
      marginTop: spacing.lg,
      marginHorizontal: spacing.md,
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
  });

export default EmailAuthScreen;
