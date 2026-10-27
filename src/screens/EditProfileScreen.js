import * as ImagePicker from "expo-image-picker";
import { Camera, ChevronRight, ImagePlus } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { AvatarCropper } from "../components/AvatarCropper";
import { CoverPickerSheet } from "../components/CoverPickerSheet";
import { ProBadge } from "../components/ProBadge";
import { StackHeader, useStackHeaderScroll } from "../components/ScreenHeader";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { t, useIsRTL } from "../i18n";
import { api } from "../services/api";
import { queryClient, queryKeys } from "../services/queryClient";
import { useAuthStore } from "../store/authStore";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { PRO_ACCENTS, useIsPro } from "../utils/pro";
import { showToast } from "../store/toastStore";
import { shape, spacing } from "../theme/spacing";
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

// Your public profile: photo, cover (a still from a film you've watched,
// across your profile's top), name, @handle and bio — what friends see.
// Name and bio save when you leave the field (or the screen), not on every
// keystroke. The handle is checked by the server (it has to be free), so
// it saves on its own and says if it's taken.
export const EditProfileScreen = ({ navigation }) => {
  // Re-render when the cover's film arrives (data/movies).
  useMoviesVersion();
  const headerScroll = useStackHeaderScroll();
  const rtl = useIsRTL();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const displayName = useProfileStore((state) => state.displayName);
  const bio = useProfileStore((state) => state.bio);
  const avatarUri = useProfileStore((state) => state.avatarUri);
  const accent = useProfileStore((state) => state.accent);
  const setAccent = useProfileStore((state) => state.setAccent);
  const isPro = useIsPro();
  const setAvatarUri = useProfileStore((state) => state.setAvatarUri);
  const account = useAuthStore((state) => state.user);
  const watched = useMovieStore((state) => state.watched);
  const coverMovieId = useProfileStore((state) => state.coverMovieId);
  const setCoverMovieId = useProfileStore((state) => state.setCoverMovieId);
  const coverMovie = coverMovieId ? getMovieById(coverMovieId) : null;
  const [isCoverOpen, setIsCoverOpen] = useState(false);

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

        {/* Cover: the still, or a way to choose one. */}
        <Text style={styles.label}>{t("Cover")}</Text>
        <Pressable
          style={({ pressed }) => [styles.coverRow, pressed && styles.coverRowPressed]}
          onPress={() => setIsCoverOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={coverMovie ? t("Change cover") : t("Add a cover")}
        >
          <View style={styles.coverThumb}>
            {coverMovie?.backdrop ? (
              <Image source={{ uri: coverMovie.backdrop }} style={styles.coverThumbImage} />
            ) : (
              <ImagePlus size={20} color={colors.textMuted} strokeWidth={1.9} />
            )}
          </View>
          <View style={styles.coverText}>
            <Text style={styles.coverTitle} numberOfLines={1}>
              {coverMovie ? coverMovie.title : t("Add a cover")}
            </Text>
            <Text style={styles.coverHint} numberOfLines={1}>
              {coverMovie ? t("Change cover") : t("A still from a film you've watched")}
            </Text>
          </View>
          <ChevronRight size={18} color={colors.textMuted} style={rtl && styles.flipped} />
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

        {/* Pro: an accent for your ring and your PRO badge. */}
        <View style={styles.labelRow}>
          <Text style={[styles.label, styles.labelInRow]}>{t("Accent")}</Text>
          <ProBadge accent={accent} />
        </View>
        <View style={[styles.accents, !isPro && styles.accentsLocked]}>
          <Pressable
            style={[styles.accent, styles.accentNone, !accent && styles.accentOn]}
            onPress={() => isPro && setAccent(null)}
            disabled={!isPro}
            accessibilityRole="radio"
            accessibilityState={{ selected: !accent, disabled: !isPro }}
            accessibilityLabel={t("None")}
          />
          {PRO_ACCENTS.map((item) => (
            <Pressable
              key={item.key}
              style={[styles.accent, { backgroundColor: item.color }, accent === item.key && styles.accentOn]}
              onPress={() => isPro && setAccent(item.key)}
              disabled={!isPro}
              accessibilityRole="radio"
              accessibilityState={{ selected: accent === item.key, disabled: !isPro }}
              accessibilityLabel={t(item.label)}
            />
          ))}
        </View>
        {isPro ? (
          <Text style={styles.help}>{t("Colours your ring and your PRO badge. Friends see it too.")}</Text>
        ) : (
          <Pressable onPress={() => navigation.navigate("Pro")} hitSlop={6}>
            <Text style={[styles.help, styles.helpLink]}>{t("Part of ReelBoard Pro — see what's in it")}</Text>
          </Pressable>
        )}
      </Animated.ScrollView>

      <CoverPickerSheet
        visible={isCoverOpen}
        onClose={() => setIsCoverOpen(false)}
        watched={watched}
        selectedId={coverMovieId}
        onPick={(movieId) => {
          setCoverMovieId(movieId);
          setIsCoverOpen(false);
        }}
        onRemove={() => {
          setCoverMovieId(null);
          setIsCoverOpen(false);
        }}
      />

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
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    // The cover: a wide thumbnail of the still, its film, and ›.
    coverRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      minHeight: 64,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: shape.control,
      marginHorizontal: spacing.md,
    },
    coverRowPressed: {
      backgroundColor: colors.cardElevated,
    },
    coverThumb: {
      width: 80,
      aspectRatio: 16 / 9,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevatedLight,
      borderRadius: shape.poster,
      overflow: "hidden",
    },
    coverThumbImage: {
      width: "100%",
      height: "100%",
    },
    coverText: {
      flex: 1,
      gap: 2,
    },
    coverTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    coverHint: {
      ...typography.caption,
      color: colors.textMuted,
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
      borderRadius: shape.control,
      marginHorizontal: spacing.md,
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
    helpLink: {
      color: colors.textSecondary,
      textDecorationLine: "underline",
    },
    // The accent swatches: none, then each colour; the chosen one ringed.
    accents: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm + 2,
      paddingHorizontal: spacing.md,
    },
    accentsLocked: {
      opacity: 0.45,
    },
    accent: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: "transparent",
    },
    accentNone: {
      backgroundColor: colors.card,
      borderColor: colors.border,
    },
    accentOn: {
      borderColor: colors.textPrimary,
    },
  });

export default EditProfileScreen;
