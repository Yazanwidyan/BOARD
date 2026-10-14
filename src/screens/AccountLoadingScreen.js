import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Text } from "../components/AppText";
import { PrimaryButton } from "../components/PrimaryButton";
import { t } from "../i18n";
import { loadAccount, signOut } from "../services/sync";
import { useAuthStore } from "../store/authStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

// Shown while the signed-in account loads from the server — or, if the
// server can't be reached, why not, with a retry.
export const AccountLoadingScreen = () => {
  const colors = useColors();
  const styles = createStyles(colors);
  const status = useAuthStore((state) => state.status);
  const statusError = useAuthStore((state) => state.statusError);

  if (status !== "error") {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("Couldn't load your account")}</Text>
      <Text style={styles.message}>{statusError}</Text>
      <PrimaryButton
        label={t("Try again")}
        onPress={loadAccount}
        style={styles.button}
      />
      <PrimaryButton
        label={t("Sign out")}
        variant="ghost"
        onPress={signOut}
        style={styles.button}
      />
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
      backgroundColor: colors.background,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
      textAlign: "center",
    },
    message: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.sm,
    },
    button: {
      alignSelf: "stretch",
      marginTop: spacing.md,
    },
  });

export default AccountLoadingScreen;
