import * as ImagePicker from "expo-image-picker";
import { Camera } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { AvatarCropper } from "../components/AvatarCropper";
import { StackHeader, useStackHeaderScroll } from "../components/ScreenHeader";
import { t } from "../i18n";
import { api } from "../services/api";
import { queryClient, queryKeys } from "../services/queryClient";
import { useAuthStore } from "../store/authStore";
import { useProfileStore } from "../store/profileStore";
import { showToast } from "../store/toastStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

const BIO_MAX_LENGTH = 140;
const NAME_MAX_LENGTH = 50;
const HANDLE_PATTERN = /^[a-zA-Z0-9_.]{3,20}$/;
const AVATAR_SIZE = 104;
const DEFAULT_AVATAR_SOURCE = require("../../assets/avatar-default.png");

// Saves the name and bio drafts — only what actually changed. A blank name
// goes back to "You".
const saveProfileDrafts = ({ name, bio }) => {
  const profile = useProfileStore.getState();
  const nextName = name.trim() || "You";
  if (nextName !== profile.displayName) profile.setDisplayName(nextName);
  const nextBio = bio.trim();
  if (nextBio !== profile.bio) profile.setBio(nextBio);
};

// Your public profile: photo, name, @handle and bio — what friends see.
// Name and bio save when you leave the field (or the screen), not on every
// keystroke. The handle is checked by the server (it has to be free), so
// it saves on its own and says if it's taken.
export const EditProfileScreen = ({ navigation }) => {
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const displayName = useProfileStore((state) => state.displayName);
  const bio = useProfileStore((state) => state.bio);
  const avatarUri = useProfileStore((state) => state.avatarUri);
  const setAvatarUri = useProfileStore((state) => state.setAvatarUri);
  const account = useAuthStore((state) => state.user);

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

  const currentHandle = (account?.handle ?? "").replace(/^@/, "");
  const [handleDraft, setHandleDraft] = useState(currentHandle);
  const [handleState, setHandleState] = useState({ busy: false, error: null });
  const handleValid = HANDLE_PATTERN.test(handleDraft);
  const saveHandle = async () => {
    const next = handleDraft.trim().replace(/^@/, "");
    if (next === currentHandle) return setHandleState({ busy: false, error: null });
    if (!HANDLE_PATTERN.test(next)) {
      return setHandleState({
        busy: false,
        error: t("3–20 letters, numbers, dots or underscores"),
      });
    }
    setHandleState({ busy: true, error: null });
    try {
      const { profile } = await api.patch("/me/profile", { handle: next });
      const user = useAuthStore.getState().user;
      useAuthStore.getState().setUser({ ...user, handle: profile.handle });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      setHandleState({ busy: false, error: null });
      showToast(t("You're {handle} now", { handle: profile.handle }), { tone: "success" });
    } catch (error) {
      setHandleState({ busy: false, error: error.message });
    }
  };

  // The picked photo waiting in the circular cropper.
  const [cropImage, setCropImage] = useState(null);
  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast(t("Allow access to your photos in system settings to set a profile picture."));
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
      setCropImage({ uri: asset.uri, width: asset.width, height: asset.height });
    }
  };

  return (
    <View style={styles.container}>
      <StackHeader
        title={t("Edit profile")}
        onBack={() => navigation.goBack()}
        scrollY={headerScroll.scrollY}
      />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        <Pressable
          style={styles.avatarWrap}
          onPress={pickAvatar}
          accessibilityRole="button"
          accessibilityLabel={t("Change profile photo")}
        >
          <View style={styles.avatar}>
            <Image
              source={avatarUri ? { uri: avatarUri } : DEFAULT_AVATAR_SOURCE}
              style={styles.avatarImage}
            />
          </View>
          <View style={styles.cameraBadge}>
            <Camera size={16} color={colors.selectedText} strokeWidth={2.2} />
          </View>
        </Pressable>
        <Pressable onPress={pickAvatar} hitSlop={8} style={styles.avatarEdit}>
          <Text style={styles.avatarEditText}>{t("Change photo")}</Text>
        </Pressable>

        <Text style={styles.label}>{t("Name")}</Text>
        <View style={styles.field}>
          <TextInput
            value={nameDraft}
            onChangeText={setNameDraft}
            onBlur={saveDrafts}
            placeholder={t("Your name")}
            placeholderTextColor={colors.textMuted}
            maxLength={NAME_MAX_LENGTH}
            autoComplete="name"
            returnKeyType="done"
            style={styles.input}
          />
        </View>

        <Text style={styles.label}>{t("Username")}</Text>
        <View style={[styles.field, !!handleState.error && styles.fieldError]}>
          <Text style={styles.at}>@</Text>
          <TextInput
            value={handleDraft}
            onChangeText={(text) => {
              setHandleDraft(text.replace(/^@/, "").replace(/\s/g, ""));
              if (handleState.error) setHandleState({ busy: false, error: null });
            }}
            onBlur={saveHandle}
            onSubmitEditing={saveHandle}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            returnKeyType="done"
            editable={!handleState.busy}
            style={styles.input}
          />
        </View>
        <Text style={[styles.help, !!handleState.error && styles.helpError]}>
          {handleState.busy
            ? t("Checking…")
            : handleState.error ??
              (handleValid || !handleDraft
                ? t("Friends find you by it.")
                : t("3–20 letters, numbers, dots or underscores"))}
        </Text>

        <View style={styles.labelRow}>
          <Text style={[styles.label, styles.labelInRow]}>{t("Bio")}</Text>
          <Text style={styles.count}>
            {bioDraft.length}/{BIO_MAX_LENGTH}
          </Text>
        </View>
        <View style={[styles.field, styles.fieldTall]}>
          <TextInput
            value={bioDraft}
            onChangeText={setBioDraft}
            onBlur={saveDrafts}
            placeholder={t("Tell people what you love to watch...")}
            placeholderTextColor={colors.textMuted}
            maxLength={BIO_MAX_LENGTH}
            multiline
            style={[styles.input, styles.inputTall]}
          />
        </View>
        <Text style={styles.help}>{t("Shown on your profile, as a quote.")}</Text>
      </Animated.ScrollView>

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
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    avatarWrap: {
      alignSelf: "center",
      marginTop: spacing.lg,
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      overflow: "hidden",
      backgroundColor: colors.card,
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    cameraBadge: {
      position: "absolute",
      end: 0,
      bottom: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.selected,
      borderWidth: 3,
      borderColor: colors.background,
    },
    avatarEdit: {
      alignSelf: "center",
      marginTop: spacing.sm,
    },
    avatarEditText: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    label: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    labelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    labelInRow: {
      marginTop: 0,
      marginBottom: 0,
      paddingHorizontal: 0,
    },
    count: {
      ...typography.caption,
      color: colors.textMuted,
      fontVariant: ["tabular-nums"],
    },
    field: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 50,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.card,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    fieldError: {
      borderBottomColor: colors.danger,
    },
    fieldTall: {
      alignItems: "flex-start",
      minHeight: 96,
    },
    at: {
      ...typography.body,
      fontSize: 15,
      lineHeight: 20,
      color: colors.textMuted,
      marginEnd: 2,
    },
    input: {
      ...typography.body,
      fontSize: 15,
      lineHeight: 20,
      flex: 1,
      color: colors.textPrimary,
      paddingVertical: spacing.sm + 2,
    },
    inputTall: {
      minHeight: 88,
      textAlignVertical: "top",
    },
    help: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    helpError: {
      color: colors.danger,
    },
  });

export default EditProfileScreen;
