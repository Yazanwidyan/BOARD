import { AtSign, KeyRound, Mail, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { Alert, StyleSheet, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { FriendAvatar } from "../components/FriendAvatar";
import { PrimaryButton } from "../components/PrimaryButton";
import { SettingsGroup, SettingsRow } from "../components/SettingsList";
import {
  StackHeader,
  useStackHeaderScroll,
} from "../components/ScreenHeader";
import { t } from "../i18n";
import { deleteAccount } from "../services/sync";
import { useAuthStore } from "../store/authStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

// The signed-in account: its email, username and how you sign in, then
// deleting it, on its own (asks for the password — or, for an account made
// with Google / Apple, which has none, for the word DELETE). Signing out
// is on the Settings screen, kept apart from this.
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

  const confirmDelete = () =>
    Alert.alert(
      t("Delete account?"),
      t(
        "This permanently deletes your account and everything in it — watched, tiers, lists, friends. This can't be undone.",
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

        <SettingsGroup title={t("Details")}>
          <SettingsRow Icon={Mail} label={t("Email")} value={user.email} />
          <SettingsRow
            Icon={AtSign}
            label={t("Username")}
            value={user.handle}
            onPress={() => navigation.navigate("EditProfile")}
          />
          <SettingsRow
            Icon={KeyRound}
            label={t("Sign-in")}
            value={hasPassword ? t("Email and password") : t("Google or Apple")}
          />
        </SettingsGroup>

        <SettingsGroup
          title={t("Danger zone")}
          footnote={t("Permanently deletes your account and everything in it.")}
        >
          <SettingsRow
            Icon={Trash2}
            label={t("Delete account")}
            destructive
            onPress={() => setDeleting((open) => !open)}
          />
        </SettingsGroup>
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
      borderRadius: shape.control,
      marginHorizontal: spacing.md,
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
