import { LinearGradient } from "expo-linear-gradient";
import { Check, ImagePlus, Search, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { getMovieById } from "../data/movies";
import { t } from "../i18n";
import { useProfileStore } from "../store/profileStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getTier } from "../utils/tiers";
import { Text } from "./AppText";
import { BottomSheet } from "./BottomSheet";
import { PrimaryButton } from "./PrimaryButton";

const COLUMNS = 2;
const GAP = spacing.sm;
const PREVIEW_AVATAR = 56;
const DEFAULT_AVATAR_SOURCE = require("../../assets/avatar-default.png");
// A small copy of a TMDB still for the grid (…/w1280/… → …/w300/…).
const thumbOf = (url) => url?.replace(/\/w(780|1280)\//, "/w300/") ?? null;
// The tiers whose films come first.
const FAVOURITE_TIERS = new Set(["S", "A"]);
// The search field shows once there are more films than this.
const SEARCH_FROM = 8;

// One still in the grid: the picked one gets a check, the others dim.
const Still = ({ movie, width, selected, dimmed, onPress, styles, colors }) => (
  <Pressable
    style={({ pressed }) => [{ width }, dimmed && styles.dimmed, pressed && styles.pressed]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityState={{ selected }}
    accessibilityLabel={movie.title}
  >
    <View style={styles.thumbWrap}>
      <Image
        source={{ uri: thumbOf(movie.backdrop) }}
        style={styles.thumb}
        resizeMode="cover"
      />
      {selected && (
        <View style={styles.check}>
          <Check size={14} color={colors.background} strokeWidth={3.2} />
        </View>
      )}
    </View>
    <Text style={[styles.title, selected && styles.titleSelected]} numberOfLines={1}>
      {movie.title}
    </Text>
  </Pressable>
);

// Choose your profile's cover: a still from a film you've watched. At the
// top, a preview of your profile's top with the one you're looking at
// behind your avatar; under it the stills — your favourites (S and A
// tiers) first, then the rest, newest first, two across — with a search
// by title above them once there are more than a few. Tap one to try it;
// "Use this cover" sets it. "Remove cover" takes the current one off.
// `watched`: your watch history. `selectedId`: the cover's film now.
export const CoverPickerSheet = ({ visible, onClose, watched, selectedId, onPick, onRemove }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const avatarUri = useProfileStore((state) => state.avatarUri);
  // The one being tried — the current cover until you tap another.
  const [draft, setDraft] = useState(selectedId);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (visible) {
      setDraft(selectedId);
      setQuery("");
    }
  }, [visible, selectedId]);

  // Whole points, a hair under — a fraction over and the second tile
  // wraps onto its own row.
  const tile = Math.floor((width - spacing.md * 2 - GAP * (COLUMNS - 1)) / COLUMNS) - 1;
  const entries = [...watched]
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
    .map((entry) => ({ entry, movie: getMovieById(entry.movieId) }))
    .filter(({ movie }) => movie?.backdrop)
    .filter(({ movie }, index, all) => all.findIndex((other) => other.movie.id === movie.id) === index);
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? entries.filter(({ movie }) => movie.title.toLowerCase().includes(needle))
    : entries;
  const favourites = shown.filter(({ entry }) => FAVOURITE_TIERS.has(getTier(entry)));
  const rest = shown.filter(({ entry }) => !FAVOURITE_TIERS.has(getTier(entry)));
  const draftMovie = draft ? getMovieById(draft) : null;
  const changed = !!draft && draft !== selectedId;

  const grid = (items) => (
    <View style={styles.grid}>
      {items.map(({ movie }) => (
        <Still
          key={movie.id}
          movie={movie}
          width={tile}
          selected={movie.id === draft}
          dimmed={!!draft && movie.id !== draft}
          onPress={() => setDraft(movie.id)}
          styles={styles}
          colors={colors}
        />
      ))}
    </View>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("Choose a cover")}
      subtitle={t("A still from a film you've watched")}
      footer={
        entries.length > 0 ? (
          <View style={styles.footer}>
            <PrimaryButton
              label={changed || !selectedId ? t("Use this cover") : t("Current cover")}
              disabled={!changed}
              onPress={() => onPick(draft)}
            />
            {!!selectedId && (
              <Pressable onPress={onRemove} hitSlop={8} style={styles.remove} accessibilityRole="button">
                <Text style={styles.removeText}>{t("Remove cover")}</Text>
              </Pressable>
            )}
          </View>
        ) : null
      }
    >
      {entries.length === 0 ? (
        <Text style={styles.empty}>{t("Watch a film and its stills show up here.")}</Text>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* How your profile's top would look. */}
          <View style={styles.preview}>
            {draftMovie?.backdrop ? (
              <Animated.Image
                key={draftMovie.id}
                entering={FadeIn.duration(220)}
                source={{ uri: draftMovie.backdrop }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.previewEmpty}>
                <ImagePlus size={26} color={colors.textMuted} strokeWidth={1.8} />
                <Text style={styles.previewEmptyText}>{t("Tap a still to try it")}</Text>
              </View>
            )}
            <LinearGradient
              colors={[`${colors.cardElevated}00`, `${colors.cardElevated}80`, colors.cardElevated]}
              locations={[0, 0.6, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.previewAvatarWrap} pointerEvents="none">
              <Image
                source={avatarUri ? { uri: avatarUri } : DEFAULT_AVATAR_SOURCE}
                style={styles.previewAvatar}
              />
            </View>
            {!!draftMovie && (
              <Text style={styles.previewCredit} numberOfLines={1}>
                {draftMovie.title}
              </Text>
            )}
          </View>

          {/* Find a film by title. */}
          {entries.length > SEARCH_FROM && (
            <View style={styles.search}>
              <Search size={16} color={colors.textMuted} strokeWidth={2} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t("Search your films")}
                placeholderTextColor={colors.textMuted}
                style={styles.searchInput}
                autoCorrect={false}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable
                  onPress={() => setQuery("")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("Clear")}
                >
                  <X size={16} color={colors.textMuted} strokeWidth={2.2} />
                </Pressable>
              )}
            </View>
          )}
          {needle && shown.length === 0 && (
            <Text style={styles.noMatch}>{t("No film by that name.")}</Text>
          )}

          {favourites.length > 0 && (
            <>
              <Text style={styles.label}>{t("Your favourites")}</Text>
              {grid(favourites)}
            </>
          )}
          {rest.length > 0 && (
            <>
              <Text style={styles.label}>
                {favourites.length > 0 ? t("More you've watched") : t("Recently watched")}
              </Text>
              {grid(rest)}
            </>
          )}
        </ScrollView>
      )}
    </BottomSheet>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    content: {
      paddingBottom: spacing.lg,
    },
    // The preview: a wide still, fading into the sheet, your avatar on its
    // foot — as your profile shows it.
    preview: {
      aspectRatio: 2,
      borderRadius: shape.card,
      overflow: "hidden",
      backgroundColor: colors.card,
    },
    previewEmpty: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingBottom: PREVIEW_AVATAR / 2,
    },
    previewEmptyText: {
      ...typography.caption,
      color: colors.textMuted,
    },
    previewAvatarWrap: {
      position: "absolute",
      bottom: spacing.sm,
      start: 0,
      end: 0,
      alignItems: "center",
    },
    previewAvatar: {
      width: PREVIEW_AVATAR,
      height: PREVIEW_AVATAR,
      borderRadius: PREVIEW_AVATAR / 2,
      borderWidth: 2,
      borderColor: colors.cardElevated,
      backgroundColor: colors.card,
    },
    previewCredit: {
      position: "absolute",
      top: spacing.sm,
      end: spacing.sm,
      maxWidth: "60%",
      ...typography.caption,
      fontSize: 11,
      color: "rgba(255, 255, 255, 0.8)",
    },
    // The search: a filled field, a step lighter than the sheet.
    search: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      minHeight: 42,
      marginTop: spacing.md,
      paddingHorizontal: spacing.sm + 4,
      backgroundColor: colors.buttonFill,
      borderRadius: shape.control,
    },
    searchInput: {
      ...typography.body,
      flex: 1,
      paddingVertical: spacing.sm,
      color: colors.textPrimary,
    },
    noMatch: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.lg,
    },
    // Small grey caps over each group.
    label: {
      ...typography.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 1.2,
      color: colors.textSecondary,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: GAP,
      rowGap: spacing.md,
    },
    pressed: {
      opacity: 0.75,
    },
    // While one's picked, the others step back.
    dimmed: {
      opacity: 0.5,
    },
    thumbWrap: {
      borderRadius: shape.control,
      overflow: "hidden",
      backgroundColor: colors.card,
    },
    thumb: {
      width: "100%",
      aspectRatio: 16 / 9,
    },
    check: {
      position: "absolute",
      top: 6,
      end: 6,
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.textPrimary,
      borderRadius: 12,
    },
    title: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 6,
    },
    titleSelected: {
      color: colors.textPrimary,
    },
    footer: {
      gap: spacing.sm,
    },
    remove: {
      alignSelf: "center",
      paddingVertical: spacing.xs,
    },
    removeText: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 19,
      color: colors.danger,
    },
    empty: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.xl,
    },
  });

export default CoverPickerSheet;
