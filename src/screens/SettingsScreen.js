import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "../components/AppText";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AvatarCropper } from "../components/AvatarCropper";
import { StackHeader } from "../components/ScreenHeader";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { showToast } from "../store/toastStore";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { useSessionStore } from "../store/sessionStore";
import { useThemeStore } from "../store/themeStore";
import { useLanguageStore } from "../store/languageStore";
import { changeLanguage } from "../i18n";
import { useUserStore } from "../store/userStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { resetAppData } from "../utils/resetAppData";
import { t } from "../i18n";

const APP_VERSION = "1.0.0";
const BIO_MAX_LENGTH = 140;
const DEFAULT_AVATAR_SOURCE = require("../../assets/avatar-placholder.png");

// One-line "not yet" notices go to a toast; real confirmations
// (destructive actions) stay native Alerts below.
const showStub = (title, message) => showToast(message || title);

// A plain text row on the page, split from the next by a hairline — no
// icon, no chevron. Destructive rows are red.
const SettingsRow = ({ label, onPress, destructive, value }) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
    >
      <Text
        style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}
      >
        {label}
      </Text>
      {!!value && <Text style={styles.rowValue}>{value}</Text>}
    </Pressable>
  );
};

const confirmAction = (title, message, onConfirm) => {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Confirm", style: "destructive", onPress: onConfirm },
  ]);
};

export const SettingsScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const clearBucketList = useMovieStore((state) => state.clearBucketList);
  const clearPickedMovie = useMovieStore((state) => state.clearPickedMovie);
  const clearWatched = useMovieStore((state) => state.clearWatched);
  const endSession = useSessionStore((state) => state.endSession);
  const replayOnboarding = useUserStore((state) => state.replayOnboarding);
  const displayName = useProfileStore((state) => state.displayName);
  const setDisplayName = useProfileStore((state) => state.setDisplayName);
  const bio = useProfileStore((state) => state.bio);
  const setBio = useProfileStore((state) => state.setBio);
  const email = useProfileStore((state) => state.email);
  const setEmail = useProfileStore((state) => state.setEmail);
  const avatarUri = useProfileStore((state) => state.avatarUri);
  const setAvatarUri = useProfileStore((state) => state.setAvatarUri);
  const insets = useSafeAreaInsets();
  const themeMode = useThemeStore((state) => state.mode);
  const setThemeMode = useThemeStore((state) => state.setMode);
  const language = useLanguageStore((state) => state.language);

  const handleNameBlur = () => {
    if (!displayName.trim()) setDisplayName("You");
  };

  const handleBioBlur = () => {
    if (bio.trim() !== bio) setBio(bio.trim());
  };

  // The picked photo waiting in the circular cropper.
  const [cropImage, setCropImage] = useState(null);

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showStub(
        t("Photo Access Needed"),
        t(
          "Allow access to your photos in system settings to set a profile picture.",
        ),
      );
      return;
    }
    // No system crop (it's square-only) — the photo goes to our own
    // circular cropper instead.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.9,
    });
    const asset = result.assets?.[0];
    if (!result.canceled && asset?.uri) {
      setCropImage({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StackHeader title={t("Settings")} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarWrap}>
          <Pressable
            onPress={handlePickAvatar}
            accessibilityLabel={t("Change profile photo")}
          >
            <View style={styles.avatar}>
              <Image
                source={avatarUri ? { uri: avatarUri } : DEFAULT_AVATAR_SOURCE}
                style={styles.avatarImage}
              />
            </View>
          </Pressable>
          <Pressable onPress={handlePickAvatar} hitSlop={8}>
            <Text style={styles.avatarEdit}>{t("Edit picture")}</Text>
          </Pressable>
        </View>

        <Text style={styles.fieldLabel}>{t("Name")}</Text>
        <View style={styles.fieldBox}>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            onBlur={handleNameBlur}
            placeholder={t("Your name")}
            placeholderTextColor={colors.textMuted}
            style={styles.fieldInput}
          />
        </View>

        <View style={styles.fieldLabelRow}>
          <Text style={[styles.fieldLabel, styles.fieldLabelInRow]}>
            {t("Bio")}
          </Text>
          <Text style={styles.fieldCount}>
            {bio.length}/{BIO_MAX_LENGTH}
          </Text>
        </View>
        <View style={styles.fieldBox}>
          <TextInput
            value={bio}
            onChangeText={setBio}
            onBlur={handleBioBlur}
            placeholder={t("Tell people what you love to watch...")}
            placeholderTextColor={colors.textMuted}
            style={styles.fieldInput}
            maxLength={BIO_MAX_LENGTH}
          />
        </View>

        <Text style={styles.fieldLabel}>{t("Email")}</Text>
        <View style={styles.fieldBox}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t("you@example.com")}
            placeholderTextColor={colors.textMuted}
            style={styles.fieldInput}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <Text style={styles.sectionLabel}>{t("Discovery")}</Text>
        <View style={styles.section}>
          <SettingsRow
            label={t("Preferences")}
            onPress={() => navigation.navigate("Preferences")}
          />
          <SettingsRow
            label={t("Reset recommendations")}
            onPress={() =>
              confirmAction(
                t("Reset Recommendations"),
                t("This will end your current pick session."),
                endSession,
              )
            }
          />
        </View>

        <Text style={styles.sectionLabel}>{t("Your data")}</Text>
        <View style={styles.section}>
          <SettingsRow
            label={t("Clear watchlist")}
            destructive
            onPress={() =>
              confirmAction(
                t("Clear Watchlist"),
                t("This will remove all movies from your watchlist."),
                clearBucketList,
              )
            }
          />
          <SettingsRow
            label={t("Clear current pick")}
            destructive
            onPress={() =>
              confirmAction(
                t("Clear Current Pick"),
                t("This will remove tonight’s pick from your Home screen."),
                clearPickedMovie,
              )
            }
          />
          <SettingsRow
            label={t("Clear watched history")}
            destructive
            onPress={() =>
              confirmAction(
                t("Clear Watched History"),
                t("This will remove all movies marked as watched."),
                clearWatched,
              )
            }
          />
        </View>

        {/* Language: each shown in its own script. Switching is instant —
            Arabic also mirrors the layout right-to-left. */}
        <Text style={styles.sectionLabel}>{t("Language")}</Text>
        <View style={styles.themeRow}>
          {[
            ["en", "English"],
            ["ar", "العربية"],
          ].map(([code, name]) => {
            const selected = language === code;
            return (
              <Pressable
                key={code}
                style={[
                  styles.themeOption,
                  selected && styles.themeOptionActive,
                ]}
                onPress={() => {
                  if (!selected) changeLanguage(code);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[styles.themeText, selected && styles.themeTextActive]}
                >
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Appearance: follow the phone, or always light / dark. */}
        <Text style={styles.sectionLabel}>{t("Appearance")}</Text>
        <View style={styles.themeRow}>
          {[
            ["system", "System"],
            ["light", "Light"],
            ["dark", "Dark"],
          ].map(([key, label]) => {
            const selected = themeMode === key;
            return (
              <Pressable
                key={key}
                style={[
                  styles.themeOption,
                  selected && styles.themeOptionActive,
                ]}
                onPress={() => setThemeMode(key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[styles.themeText, selected && styles.themeTextActive]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionLabel}>{t("App")}</Text>
        <View style={styles.section}>
          <SettingsRow
            label={t("Replay onboarding")}
            onPress={replayOnboarding}
          />
          <SettingsRow
            label={t("About")}
            onPress={() =>
              Alert.alert(
                t("ReelBoard"),
                t(
                  "ReelBoard turns deciding what to watch into a game — discover, build progress, unlock collections, and complete challenges as you go.",
                ),
              )
            }
          />
        </View>

        <Text style={styles.sectionLabel}>{t("Friend invites")}</Text>
        <View style={styles.section}>
          <SettingsRow
            label={t("Enter referral code")}
            onPress={() =>
              showStub(
                t("Referral Codes"),
                t("ReelBoard doesn't have referral codes yet."),
              )
            }
          />
        </View>

        <View style={[styles.section, styles.dangerSection]}>
          <SettingsRow
            label={t("Delete account")}
            destructive
            onPress={() =>
              confirmAction(
                t("Delete Account"),
                t(
                  "ReelBoard doesn't have accounts on a server — this wipes everything on this device instead: watched, watchlist, XP, badges, challenges, profile. This can't be undone.",
                ),
                resetAppData,
              )
            }
          />
        </View>

        <Text style={styles.footerText}>
          {t("Version")} {APP_VERSION}
        </Text>
      </ScrollView>
      <ScreenBottomFade />
      {cropImage && (
        <AvatarCropper
          key={cropImage.uri}
          image={cropImage}
          onCancel={() => setCropImage(null)}
          onDone={(uri) => {
            setAvatarUri(uri);
            setCropImage(null);
          }}
        />
      )}
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // Filled boxes, edge to edge with square corners; labels sit above
    // them in the page inset. Rows are plain text (no icons or chevrons),
    // split by hairlines inside their box.
    scrollContent: {
      paddingTop: spacing.md,
    },
    sectionLabel: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    section: {
      backgroundColor: colors.card,
    },
    // Three square boxes edge to edge, 2px apart; the chosen one filled.
    themeRow: {
      flexDirection: "row",
      gap: 2,
    },
    themeOption: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacing.md,
      backgroundColor: colors.card,
    },
    themeOptionActive: {
      backgroundColor: colors.selected,
    },
    themeText: {
      ...typography.bodyBold,
      fontSize: 14,
      color: colors.textSecondary,
    },
    themeTextActive: {
      color: colors.selectedText,
    },
    dangerSection: {
      marginTop: spacing.lg,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
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
      color: colors.textSecondary,
    },
    footerText: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.lg,
    },
    avatarWrap: {
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.card,
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarEdit: {
      ...typography.bodyBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    fieldLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    fieldLabel: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    fieldLabelInRow: {
      marginTop: 0,
      marginBottom: 0,
      paddingHorizontal: 0,
    },
    fieldCount: {
      ...typography.caption,
      color: colors.textMuted,
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
  });

export default SettingsScreen;
