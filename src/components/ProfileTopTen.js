import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";

import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { FAVORITE_COUNT } from "../utils/taste";
import { t } from "../i18n";
import { Text } from "./AppText";
import { MoviePoster } from "./MoviePoster";

// Favorite ten: one row of posters, edge to edge, scrolled sideways. About
// three and a half show at once, so the cut-off one says there's more.
const VISIBLE = 3.5;
const GAP = 2;

// A profile's top ten — the signature, always above the tabs. Yours
// (`editable`): empty slots open the picker, long-press takes one out,
// "Edit" opens the picker. A friend's: just their picks (nothing when they
// haven't made any).
export const ProfileTopTen = ({ movies, editable = false, onOpen, onRemove, onPick }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const slotWidth = Math.floor((width - spacing.md - GAP * 3) / VISIBLE);
  const slot = { width: slotWidth, height: slotWidth * 1.5 };
  if (!editable && movies.length === 0) return null;
  const count = editable ? FAVORITE_COUNT : movies.length;

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.rail}
        contentContainerStyle={styles.row}
      >
        {Array.from({ length: count }, (_, index) => {
          const movie = movies[index];
          return movie ? (
            <Pressable
              key={movie.id}
              style={[styles.slot, slot]}
              onPress={() => onOpen(movie.id)}
              onLongPress={editable ? () => onRemove(movie) : undefined}
              accessibilityLabel={t("Number {value}, {title}", {
                value: index + 1,
                title: movie.title,
              })}
            >
              <MoviePoster uri={movie.poster} style={styles.poster} />
              <View style={styles.rank}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>
            </Pressable>
          ) : (
            <Pressable
              key={`empty-${index}`}
              style={[styles.slot, styles.empty, slot]}
              onPress={onPick}
              accessibilityLabel={t("Top ten number {value}, empty. Pick a movie", {
                value: index + 1,
              })}
            >
              <Text style={styles.emptyRank}>{index + 1}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.bar}>
        <Text style={styles.label}>
          {editable ? t("Your top ten") : t("Top ten")}
          {editable &&
            movies.length > 0 &&
            movies.length < FAVORITE_COUNT &&
            t(" · {topTenMoviesCount} of {FAVORITE_COUNT}", {
              topTenMoviesCount: movies.length,
              FAVORITE_COUNT,
            })}
        </Text>
        {editable && (
          <Pressable onPress={onPick} hitSlop={8}>
            <Text style={styles.edit}>{movies.length > 0 ? t("Edit") : t("Pick")}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // Cancels the page's side padding: the row runs edge to edge, and
    // starts and ends in line with the page.
    rail: {
      marginHorizontal: -spacing.md,
    },
    row: {
      gap: GAP,
      paddingHorizontal: spacing.md,
    },
    slot: {
      overflow: "hidden",
    },
    poster: {
      width: "100%",
      height: "100%",
    },
    rank: {
      position: "absolute",
      top: 4,
      start: 4,
      minWidth: 20,
      height: 20,
      paddingHorizontal: 4,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    rankText: {
      ...typography.bodyBold,
      fontSize: 11,
      lineHeight: 14,
      color: "#FFFFFF",
    },
    // Empty slot: a plain card tile with its rank, so the ten still read as
    // a ranked row before they're filled.
    empty: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
    emptyRank: {
      ...typography.display,
      fontSize: 24,
      lineHeight: 28,
      color: colors.cardElevatedLight,
    },
    // Under the row: what it is, and the way to change it.
    bar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.sm + 2,
    },
    label: {
      ...typography.caption,
      color: colors.textMuted,
    },
    edit: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
  });

export default ProfileTopTen;
