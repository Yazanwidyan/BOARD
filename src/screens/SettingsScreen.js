import {
  Bell,
  ChevronRight,
  Info,
  Languages,
  Lightbulb,
  LogOut,
  Moon,
  Palette,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sun,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  Share,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import {
  StackHeader,
  useStackHeaderScroll,
} from "../components/ScreenHeader";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import {
  SettingsChoice,
  SettingsGroup,
  SettingsRow,
} from "../components/SettingsList";
import {
  disableNotifications,
  enableNotifications,
  getNotificationsEnabled,
} from "../services/notifications";
import { signOut } from "../services/sync";
import { showToast } from "../store/toastStore";
import { useAuthStore } from "../store/authStore";
import { useProfileStore } from "../store/profileStore";
import { useThemeStore } from "../store/themeStore";
import { useTipsStore } from "../store/tipsStore";
import { useLanguageStore } from "../store/languageStore";
import { changeLanguage, t, useIsRTL } from "../i18n";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

const APP_VERSION = "1.0.0";
const AVATAR_SIZE = 60;
const DEFAULT_AVATAR_SOURCE = require("../../assets/avatar-default.png");

// Settings, by what you'd come here for: you (your profile card — tap to
// edit it), your taste, how the app looks and talks to you, help, and the
// account (with signing out at the very end). Each row has an icon and,
// when it opens something, a chevron; choices with two or three options
// are picked in place.
export const SettingsScreen = ({ navigation }) => {
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const rtl = useIsRTL();
  const displayName = useProfileStore((state) => state.displayName);
  const bio = useProfileStore((state) => state.bio);
  const avatarUri = useProfileStore((state) => state.avatarUri);
  const themeMode = useThemeStore((state) => state.mode);
  const setThemeMode = useThemeStore((state) => state.setMode);
  const language = useLanguageStore((state) => state.language);
  const resetTips = useTipsStore((state) => state.resetTips);
  const account = useAuthStore((state) => state.user);

  // Reminders and push are a setting of this phone, not the account.
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [notificationsBusy, setNotificationsBusy] = useState(false);
  useEffect(() => {
    getNotificationsEnabled().then(setNotificationsOn);
  }, []);
  const toggleNotifications = async (on) => {
    if (notificationsBusy) return;
    setNotificationsBusy(true);
    setNotificationsOn(on);
    try {
      if (on) await enableNotifications();
      else await disableNotifications();
    } catch (error) {
      setNotificationsOn(!on);
      showToast(error?.message || t("Couldn't change notifications"));
    } finally {
      setNotificationsBusy(false);
    }
  };

  const invite = () =>
    Share.share({
      message: account?.handle
        ? t("I'm picking movies on ReelBoard. Add me: {handle}", { handle: account.handle })
        : t("I'm picking movies on ReelBoard. Come tier with me."),
    }).catch(() => {});

  const confirmSignOut = () =>
    Alert.alert(t("Sign out?"), t("Your library stays saved to your account."), [
      { text: t("Cancel"), style: "cancel" },
      { text: t("Sign out"), style: "destructive", onPress: signOut },
    ]);

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
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* You: the profile card. Editing it is a page of its own. */}
        <Pressable
          style={({ pressed }) => [styles.profileCard, pressed && styles.pressed]}
          onPress={() => navigation.navigate("EditProfile")}
          accessibilityRole="button"
          accessibilityLabel={t("Edit profile")}
        >
          <Image
            source={avatarUri ? { uri: avatarUri } : DEFAULT_AVATAR_SOURCE}
            style={styles.avatar}
          />
          <View style={styles.profileText}>
            <Text style={styles.profileName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.profileHandle} numberOfLines={1}>
              {account?.handle ?? ""}
            </Text>
            <Text style={styles.profileBio} numberOfLines={1}>
              {bio ? `“${bio}”` : t("Add a bio")}
            </Text>
          </View>
          <View style={styles.profileEdit}>
            <Text style={styles.profileEditText}>{t("Edit")}</Text>
            <ChevronRight
              size={16}
              color={colors.textSecondary}
              style={rtl && styles.flipped}
            />
          </View>
        </Pressable>

        <SettingsGroup title={t("Your taste")}>
          <SettingsRow
            Icon={SlidersHorizontal}
            label={t("Discovery preferences")}
            hint={t("Genres, decades and runtimes you'd rather see")}
            onPress={() => navigation.navigate("Preferences")}
          />
        </SettingsGroup>

        <SettingsGroup title={t("App")}>
          <SettingsChoice
            Icon={Palette}
            label={t("Appearance")}
            value={themeMode}
            onChange={setThemeMode}
            options={[
              { key: "system", label: t("System"), Icon: Smartphone },
              { key: "light", label: t("Light"), Icon: Sun },
              { key: "dark", label: t("Dark"), Icon: Moon },
            ]}
          />
          {/* Each language in its own script. Switching is instant —
              Arabic also mirrors the layout right-to-left. */}
          <SettingsChoice
            Icon={Languages}
            label={t("Language")}
            value={language}
            onChange={changeLanguage}
            options={[
              { key: "en", label: "English" },
              { key: "ar", label: "العربية" },
            ]}
          />
          <SettingsRow
            Icon={Bell}
            label={t("Notifications")}
            hint={t("Tonight's pick at 7:30 pm, your monthly recap, friend requests and movie nights.")}
            right={
              <Switch
                value={notificationsOn}
                onValueChange={toggleNotifications}
                disabled={notificationsBusy}
                accessibilityLabel={t("Notifications")}
              />
            }
          />
        </SettingsGroup>

        <SettingsGroup title={t("Help")}>
          <SettingsRow
            Icon={Share2}
            label={t("Invite friends")}
            hint={t("Share your handle so they can add you")}
            onPress={invite}
          />
          <SettingsRow
            Icon={Lightbulb}
            label={t("Show tips again")}
            onPress={() => {
              resetTips();
              showToast(t("Tips will show again on each screen"), {
                tone: "success",
              });
            }}
          />
          <SettingsRow
            Icon={Info}
            label={t("About ReelBoard")}
            value={t("Version {version}", { version: APP_VERSION })}
            onPress={() =>
              Alert.alert(
                t("ReelBoard"),
                t(
                  "ReelBoard turns deciding what to watch into a game — discover, climb collection ranks, and complete challenges as you go.",
                ),
              )
            }
          />
        </SettingsGroup>

        {/* The account: its details and deleting it are on the Account
            screen, kept apart from signing out. */}
        <SettingsGroup title={t("Account")}>
          <SettingsRow
            Icon={ShieldCheck}
            label={t("Account")}
            value={account?.email}
            onPress={() => navigation.navigate("Account")}
          />
          <SettingsRow
            Icon={LogOut}
            label={t("Sign out")}
            destructive
            onPress={confirmSignOut}
          />
        </SettingsGroup>

        {/* Required by TMDB's API terms wherever its data is used. */}
        <Text style={styles.attribution}>
          {t(
            "Movie data and images from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.",
          )}
        </Text>
      </Animated.ScrollView>
      <ScreenBottomFade />
    </SafeAreaView>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    pressed: {
      opacity: 0.85,
    },
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      marginHorizontal: spacing.md,
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: colors.cardElevated,
    },
    profileText: {
      flex: 1,
      gap: 1,
    },
    profileName: {
      ...typography.title,
      color: colors.textPrimary,
    },
    profileHandle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    profileBio: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 2,
    },
    profileEdit: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    profileEditText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    attribution: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.lg,
      paddingHorizontal: spacing.xl,
    },
  });

export default SettingsScreen;
