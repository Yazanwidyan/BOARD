import { Check } from "lucide-react-native";
import { Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";

import { getMovieById } from "../data/movies";
import { t } from "../i18n";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";
import { BottomSheet } from "./BottomSheet";
import { PrimaryButton } from "./PrimaryButton";

const COLUMNS = 2;
const GAP = spacing.sm;
// A small copy of a TMDB still for the grid (…/w1280/… → …/w300/…).
const thumbOf = (url) => url?.replace(/\/w(780|1280)\//, "/w300/") ?? null;

// Choose your profile's cover: a still from any film you've watched,
// newest first, two across. Tapping one sets it; Remove takes it off.
// `watched`: your watch history. `selectedId`: the cover's film now.
export const CoverPickerSheet = ({ visible, onClose, watched, selectedId, onPick, onRemove }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const tile = (width - spacing.md * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const films = [...watched]
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
    .map((entry) => getMovieById(entry.movieId))
    .filter((movie) => movie?.backdrop)
    .filter((movie, index, all) => all.findIndex((other) => other.id === movie.id) === index);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("Choose a cover")}
      subtitle={t("A still from a film you've watched")}
      footer={
        selectedId ? (
          <PrimaryButton label={t("Remove cover")} variant="secondary" onPress={onRemove} />
        ) : null
      }
    >
      {films.length === 0 ? (
        <Text style={styles.empty}>{t("Watch a film and its stills show up here.")}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {films.map((movie) => {
            const selected = movie.id === selectedId;
            return (
              <Pressable
                key={movie.id}
                style={({ pressed }) => [{ width: tile }, pressed && styles.pressed]}
                onPress={() => onPick(movie.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={movie.title}
              >
                <View style={[styles.thumbWrap, selected && styles.thumbSelected]}>
                  <Image
                    source={{ uri: thumbOf(movie.backdrop) }}
                    style={{ width: "100%", aspectRatio: 16 / 9 }}
                    resizeMode="cover"
                  />
                  {selected && (
                    <View style={styles.check}>
                      <Check size={14} color={colors.selectedText} strokeWidth={3} />
                    </View>
                  )}
                </View>
                <Text style={styles.title} numberOfLines={1}>
                  {movie.title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </BottomSheet>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: GAP,
      rowGap: spacing.md,
      paddingBottom: spacing.lg,
    },
    pressed: {
      opacity: 0.75,
    },
    thumbWrap: {
      borderRadius: shape.control,
      overflow: "hidden",
      backgroundColor: colors.card,
    },
    // The chosen one: a slate frame and a check.
    thumbSelected: {
      borderWidth: 2,
      borderColor: colors.selected,
    },
    check: {
      position: "absolute",
      top: 6,
      end: 6,
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.selected,
      borderRadius: shape.chip,
    },
    title: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 6,
    },
    empty: {
      ...typography.body,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.xl,
    },
  });

export default CoverPickerSheet;
