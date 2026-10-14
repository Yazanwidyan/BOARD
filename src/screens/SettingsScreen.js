import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "../components/AppText";
import Animated from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AvatarCropper } from "../components/AvatarCropper";
import {
  StackHeader,
  useStackHeaderScroll,
} from "../components/ScreenHeader";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { signOut } from "../services/sync";
import { showToast } from "../store/toastStore";
import { useAuthStore } from "../store/authStore";
import { useProfileStore } from "../store/profileStore";
import { useThemeStore } from "../store/themeStore";
import { useTipsStore } from "../store/tipsStore";
import { useLanguageStore } from "../store/languageStore";
import { changeLanguage } from "../i18n";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { t } from "../i18n";

const APP_VERSION = "1.0.0";
const BIO_MAX_LENGTH = 140;
const DEFAULT_AVATAR_SOURCE = require("../../assets/avatar-default.png");

// One-line notices (e.g. photo access needed) go to a toast.
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

// Saves the name and bio drafts — only what actually changed. A blank name
// goes back to "You".
const saveProfileDrafts = ({ name, bio }) => {
  const profile = useProfileStore.getState();
  const nextName = name.trim() || "You";
  if (nextName !== profile.displayName) profile.setDisplayName(nextName);
  const nextBio = bio.trim();
  if (nextBio !== profile.bio) profile.setBio(nextBio);
};

export const SettingsScreen = ({ navigation }) => {
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const styles = createStyles(colors);
  const displayName = useProfileStore((state) => state.displayName);
  const bio = useProfileStore((state) => state.bio);
  const avatarUri = useProfileStore((state) => state.avatarUri);
  const setAvatarUri = useProfileStore((state) => state.setAvatarUri);
  const insets = useSafeAreaInsets();
  const themeMode = useThemeStore((state) => state.mode);
  const setThemeMode = useThemeStore((state) => state.setMode);
  const language = useLanguageStore((state) => state.language);
  const resetTips = useTipsStore((state) => state.resetTips);
  const account = useAuthStore((state) => state.user);

  // Name and bio are edited as drafts and saved when you're done — leaving
  // the field or the screen — not on every keystroke (each save is a
  // request to the server).
  const [nameDraft, setNameDraft] = useState(displayName);
  const [bioDraft, setBioDraft] = useState(bio);
  const drafts = useRef(null);
  drafts.current = { name: nameDraft, bio: bioDraft };

  const saveDrafts = () => {
    saveProfileDrafts(drafts.current);
    setNameDraft((name) => name.trim() || "You");
    setBioDraft((text) => text.trim());
  };

  // Leaving the screen with the keyboard still up doesn't blur the field.
  useEffect(() => () => saveProfileDrafts(drafts.current), []);

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
      <StackHeader
        title={t("Settings")}
        onBack={() => navigation.goBack()}
        scrollY={headerScroll.scrollY}
      />

      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
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
            value={nameDraft}
            onChangeText={setNameDraft}
            onBlur={saveDrafts}
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
            {bioDraft.length}/{BIO_MAX_LENGTH}
          </Text>
        </View>
        <View style={styles.fieldBox}>
          <TextInput
            value={bioDraft}
            onChangeText={setBioDraft}
            onBlur={saveDrafts}
            placeholder={t("Tell people what you love to watch...")}
            placeholderTextColor={colors.textMuted}
            style={styles.fieldInput}
            maxLength={BIO_MAX_LENGTH}
          />
        </View>

        {/* The account's email is its sign-in, so it's shown, not edited. */}
        <Text style={styles.sectionLabel}>{t("Account")}</Text>
        <View style={styles.section}>
          <SettingsRow
            label={t("Signed in as {handle}", { handle: account?.handle ?? "" })}
            value={account?.email}
            onPress={() => navigation.navigate("Account")}
          />
        </View>

        <Text style={styles.sectionLabel}>{t("Discovery")}</Text>
        <View style={styles.section}>
          <SettingsRow
            label={t("Preferences")}
            onPress={() => navigation.navigate("Preferences")}
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
            label={t("Show tips again")}
            onPress={() => {
              resetTips();
              showToast(t("Tips will show again on each screen"), {
                tone: "success",
              });
            }}
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

        {/* Signing out is here, on its own. Deleting the account is kept
            apart, on the Account screen ("Signed in as…" above). */}
        <View style={[styles.section, styles.dangerSection]}>
          <SettingsRow
            label={t("Sign out")}
            onPress={() =>
              Alert.alert(t("Sign out?"), "", [
                { text: t("Cancel"), style: "cancel" },
                { text: t("Sign out"), style: "destructive", onPress: signOut },
              ])
            }
          />
        </View>

        <Text style={styles.footerText}>
          {t("Version")} {APP_VERSION}
        </Text>
      </Animated.ScrollView>
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
