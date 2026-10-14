import { useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { FriendAvatar } from "../components/FriendAvatar";
import { PrimaryButton } from "../components/PrimaryButton";
import {
  StackHeader,
  useStackHeaderScroll,
} from "../components/ScreenHeader";
import { t } from "../i18n";
import { deleteAccount, signOut } from "../services/sync";
import { useAuthStore } from "../store/authStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

const Row = ({ label, value, onPress, destructive, styles }) => (
  <Pressable
    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    onPress={onPress}
    disabled={!onPress}
    accessibilityRole={onPress ? "button" : undefined}
  >
    <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>
      {label}
    </Text>
    {!!value && <Text style={styles.rowValue}>{value}</Text>}
  </Pressable>
);

// The signed-in account: who you are, sign out, or delete the account (asks for the password — or, for an account made
// with Google / Apple, which has none, for the word DELETE).
export const AccountScreen = ({ navigation }) => {
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState(null);

  if (!user) return <View style={styles.container} />;
  const hasPassword = user.hasPassword !== false;
  const canDelete = hasPassword
    ? confirmation.length > 0
    : confirmation.trim().toUpperCase() === "DELETE";

  const confirmSignOut = () =>
    Alert.alert(t("Sign out?"), "", [
      { text: t("Cancel"), style: "cancel" },
      { text: t("Sign out"), style: "destructive", onPress: signOut },
    ]);

  const confirmDelete = () =>
    Alert.alert(
      t("Delete account?"),
      t(
        "This permanently deletes your account and everything in it — watched, tiers, boards, friends. This can't be undone.",
      ),
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Delete"),
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            setError(null);
            try {
              await deleteAccount(
                hasPassword ? { password: confirmation } : { confirm: "DELETE" },
              );
            } catch (err) {
              setError(err.message);
              setBusy(false);
            }
          },
        },
      ],
    );

  return (
    <View style={styles.container}>
      <StackHeader
        title={t("Account")}
        onBack={() => navigation.goBack()}
        scrollY={headerScroll.scrollY}
      />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <FriendAvatar
            friend={{ name: user.displayName, color: user.color }}
            size={72}
          />
          <Text style={styles.name}>{user.displayName}</Text>
          <Text style={styles.handle}>
            {user.handle} · {user.email}
          </Text>
        </View>

        <View style={[styles.section, styles.gap]}>
          <Row label={t("Sign out")} onPress={confirmSignOut} styles={styles} />
        </View>

        <View style={[styles.section, styles.gap]}>
          <Row
            label={t("Delete account")}
            destructive
            onPress={() => setDeleting((open) => !open)}
            styles={styles}
          />
        </View>
        {deleting && (
          <>
            <Text style={styles.fieldLabel}>
              {hasPassword
                ? t("Enter your password to confirm")
                : t("Type DELETE to confirm")}
            </Text>
            <View style={styles.fieldBox}>
              <TextInput
                value={confirmation}
                onChangeText={setConfirmation}
                secureTextEntry={hasPassword}
                autoComplete={hasPassword ? "current-password" : "off"}
                autoCapitalize={hasPassword ? "none" : "characters"}
                autoCorrect={false}
                placeholder={hasPassword ? "" : "DELETE"}
                placeholderTextColor={colors.textMuted}
                style={styles.fieldInput}
              />
            </View>
            {!!error && <Text style={styles.error}>{error}</Text>}
            <PrimaryButton
              label={t("Delete account forever")}
              variant="outline"
              onPress={confirmDelete}
              disabled={busy || !canDelete}
              style={styles.deleteButton}
              textStyle={styles.deleteText}
            />
          </>
        )}
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
    hero: {
      alignItems: "center",
      paddingTop: spacing.lg,
      paddingHorizontal: spacing.md,
    },
    name: {
      ...typography.hero,
      fontSize: 24,
      lineHeight: 30,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    handle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    section: {
      backgroundColor: colors.card,
    },
    gap: {
      marginTop: spacing.lg,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.background,
    },
    rowPressed: {
      backgroundColor: colors.cardElevated,
    },
    rowLabel: {
      ...typography.body,
      color: colors.textPrimary,
      flex: 1,
    },
    rowLabelDestructive: {
      color: colors.danger,
    },
    rowValue: {
      ...typography.caption,
      color: colors.textMuted,
      flexShrink: 1,
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
    deleteButton: {
      marginTop: spacing.lg,
      marginHorizontal: spacing.md,
    },
    deleteText: {
      color: colors.danger,
    },
  });

export default AccountScreen;
