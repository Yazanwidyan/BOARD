import { ChevronRight, Dices, Plus } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";

import { getMovieById } from "../data/movies";
import { t, useIsRTL } from "../i18n";
import { useLanguageStore } from "../store/languageStore";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getInProgressCollections } from "../utils/collections";
import { getTier, getTierInfo } from "../utils/tiers";
import { Text } from "./AppText";
import { BoardCover } from "./BoardCover";
import { CollectionCollage } from "./CollectionCollage";
import { MoviePoster } from "./MoviePoster";

const SHELF_POSTER = 96;
const DIARY_POSTER = 76;
const TIER_POSTER = 64;
const SHOWN = 12;
// The tiers shown as shelves, and how many months of the diary.
const TIER_SHELVES = ["S", "A", "B"];
const DIARY_MONTHS = 2;
const COLLECTION_TILE = 118;
const LISTS_SHOWN = 3;

// A section's heading, as Home's: big and bold, a › when it opens its
// full page, and something at the end (`right`).
const Heading = ({ title, onPress, right, styles, colors, rtl }) => (
  <View style={styles.headingRow}>
    <Pressable
      style={({ pressed }) => [styles.heading, pressed && onPress && styles.pressed]}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={6}
      accessibilityRole={onPress ? "button" : "header"}
    >
      <Text style={styles.headingText} numberOfLines={1}>
        {title}
      </Text>
      {onPress && <ChevronRight size={22} color={colors.textSecondary} strokeWidth={2.6} style={rtl && styles.flipped} />}
    </Pressable>
    {right}
  </View>
);

// A sideways row of posters, each opening its film; `caption` (optional)
// puts a line under each.
const PosterRow = ({ movies, width, caption, onOpen, styles }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
    {movies.map((movie, index) => (
      <Pressable
        key={`${movie.id}-${index}`}
        style={({ pressed }) => [{ width }, pressed && styles.pressed]}
        onPress={() => onOpen(movie.id)}
        accessibilityRole="button"
        accessibilityLabel={movie.title}
      >
        <MoviePoster uri={movie.poster} style={{ width, height: width * 1.5 }} />
        {!!caption && (
          <Text style={styles.caption} numberOfLines={1}>
            {caption(movie, index)}
          </Text>
        )}
      </Pressable>
    ))}
  </ScrollView>
);

// Library's front page — your films, the ones you act on (who you are —
// your taste, achievements, Replay — is Profile's): what you keep in three
// numbers (each opening its section), Up next (your watchlist, newest
// first, with Pick to sort it), your diary (what you watched, month by
// month, with the day under each), your tiers as shelves (S, A, B — and how
// many aren't tiered yet), your lists and your collections under way. Each
// heading's › opens the full section (`onOpenSection`), the films their
// pages.
export const LibraryHome = ({
  navigation,
  watched,
  bucketListMovies,
  boards,
  collectionsCount,
  canPick,
  onPick,
  onNewList,
  onSeeUntiered,
  onOpenSection,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const rtl = useIsRTL();
  const { width } = useWindowDimensions();
  const language = useLanguageStore((state) => state.language);
  const locale = language === "ar" ? "ar" : "en";
  const openMovie = (movieId) => navigation.navigate("MovieDetails", { movieId });

  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const byNewest = [...watched].filter((entry) => entry.timestamp).sort((a, b) => b.timestamp - a.timestamp);
  const withMovie = (entries) =>
    entries.map((entry) => ({ entry, movie: getMovieById(entry.movieId) })).filter(({ movie }) => movie);

  // Your tiers: the films in each, newest first.
  const tiers = TIER_SHELVES.map((key) => ({
    key,
    info: getTierInfo(key),
    items: withMovie(byNewest.filter((entry) => getTier(entry) === key)),
  })).filter((tier) => tier.items.length > 0);
  const untiered = watched.filter((entry) => !getTier(entry)).length;

  // Your diary: the last months you watched anything in.
  const months = [];
  byNewest.forEach((entry) => {
    const date = new Date(entry.timestamp);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    let month = months.find((item) => item.key === key);
    if (!month) {
      if (months.length === DIARY_MONTHS) return;
      month = { key, date, entries: [] };
      months.push(month);
    }
    month.entries.push(entry);
  });

  const inProgress = getInProgressCollections(watchedIds, 8);
  const listWidth = Math.floor((width - spacing.md * 2 - spacing.rail * (LISTS_SHOWN - 1)) / LISTS_SHOWN);

  // What you keep (your public numbers — films, friends, ranks — are on
  // Profile).
  const numbers = [
    { key: "bucketlist", value: bucketListMovies.length, label: t("Watchlist") },
    { key: "boards", value: boards.length, label: t("Lists") },
    { key: "collections", value: collectionsCount, label: t("Collections") },
  ];

  return (
    <View>
      {/* Your shelf in numbers. */}
      <View style={styles.numbers}>
        {numbers.map((item, index) => (
          <Pressable
            key={item.key}
            style={({ pressed }) => [styles.number, index > 0 && styles.numberRule, pressed && styles.pressed]}
            onPress={() => onOpenSection(item.key)}
            accessibilityRole="button"
            accessibilityLabel={`${item.value} ${item.label}`}
          >
            <Text style={styles.numberValue} numberOfLines={1} adjustsFontSizeToFit>
              {item.value}
            </Text>
            <Text style={styles.numberLabel} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Up next: your watchlist, and Pick to sort it. */}
      {bucketListMovies.length > 0 && (
        <View style={styles.section}>
          <Heading
            title={t("Up next")}
            onPress={() => onOpenSection("bucketlist")}
            right={
              canPick && (
                <Pressable
                  style={({ pressed }) => [styles.pick, pressed && styles.pressed]}
                  onPress={onPick}
                  accessibilityRole="button"
                >
                  <Dices size={15} color={colors.brand} strokeWidth={2.2} />
                  <Text style={styles.pickText}>{t("Pick for me")}</Text>
                </Pressable>
              )
            }
            styles={styles}
            colors={colors}
            rtl={rtl}
          />
          <PosterRow
            movies={bucketListMovies.slice(0, SHOWN)}
            width={SHELF_POSTER}
            onOpen={openMovie}
            styles={styles}
          />
        </View>
      )}

      {/* Your diary: month by month, the day under each. */}
      {months.length > 0 && (
        <View style={styles.section}>
          <Heading
            title={t("Diary")}
            onPress={() => onOpenSection("watched")}
            styles={styles}
            colors={colors}
            rtl={rtl}
          />
          {months.map((month) => {
            const items = withMovie(month.entries).slice(0, SHOWN);
            return (
              <View key={month.key} style={styles.month}>
                <Text style={styles.monthLabel}>
                  {month.date.toLocaleDateString(locale, { month: "long", year: "numeric" })}
                  <Text style={styles.monthCount}>
                    {"  ·  "}
                    {t("{count} films", { count: month.entries.length })}
                  </Text>
                </Text>
                <PosterRow
                  movies={items.map(({ movie }) => movie)}
                  width={DIARY_POSTER}
                  caption={(movie, index) => new Date(items[index].entry.timestamp).getDate()}
                  onOpen={openMovie}
                  styles={styles}
                />
              </View>
            );
          })}
        </View>
      )}

      {/* Your tiers, as shelves. */}
      {(tiers.length > 0 || untiered > 0) && (
        <View style={styles.section}>
          <Heading
            title={t("Your tiers")}
            onPress={() => navigation.navigate("TierList")}
            styles={styles}
            colors={colors}
            rtl={rtl}
          />
          {tiers.map((tier) => (
            <View key={tier.key} style={styles.tierShelf}>
              <View style={[styles.tierBadge, { backgroundColor: tier.info.color }]}>
                <Text style={styles.tierBadgeText}>{tier.key}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tierRow}>
                {tier.items.slice(0, SHOWN).map(({ movie }) => (
                  <Pressable
                    key={movie.id}
                    onPress={() => openMovie(movie.id)}
                    style={({ pressed }) => pressed && styles.pressed}
                    accessibilityRole="button"
                    accessibilityLabel={`${movie.title}, ${tier.key}`}
                  >
                    <MoviePoster uri={movie.poster} style={{ width: TIER_POSTER, height: TIER_POSTER * 1.5 }} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ))}
          {untiered > 0 && (
            <Pressable onPress={onSeeUntiered} hitSlop={6} style={styles.untiered} accessibilityRole="button">
              <Text style={styles.untieredText}>
                {untiered === 1
                  ? t("1 watched movie isn't tiered yet")
                  : t("{untieredCount} watched movies aren't tiered yet", { untieredCount: untiered })}
                {" ›"}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Your lists, and a new one. */}
      <View style={styles.section}>
        <Heading
          title={t("Lists")}
          onPress={boards.length > 0 ? () => onOpenSection("boards") : undefined}
          styles={styles}
          colors={colors}
          rtl={rtl}
        />
        <View style={styles.lists}>
          {boards.slice(0, LISTS_SHOWN - 1).map((board) => (
            <Pressable
              key={board.id}
              style={({ pressed }) => [{ width: listWidth }, pressed && styles.pressed]}
              onPress={() => navigation.navigate("BoardDetails", { boardId: board.id })}
              accessibilityRole="button"
            >
              <BoardCover movies={board.movieIds.map(getMovieById).filter(Boolean)} size={listWidth} />
              <Text style={styles.listName} numberOfLines={1}>
                {board.name}
              </Text>
              <Text style={styles.caption} numberOfLines={1}>
                {t("{count} movies", { count: board.movieIds.length })}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={({ pressed }) => [{ width: listWidth }, pressed && styles.pressed]}
            onPress={onNewList}
            accessibilityRole="button"
          >
            <View style={[styles.newList, { width: listWidth, height: listWidth }]}>
              <Plus size={28} color={colors.textSecondary} strokeWidth={1.6} />
            </View>
            <Text style={styles.listName} numberOfLines={1}>
              {t("New list")}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Your collections under way. */}
      {inProgress.length > 0 && (
        <View style={styles.section}>
          <Heading
            title={t("Collections")}
            onPress={() => onOpenSection("collections")}
            styles={styles}
            colors={colors}
            rtl={rtl}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {inProgress.map((collection) => {
              const seen = collection.movieIds.filter((id) => watchedIds.has(id)).length;
              return (
                <Pressable
                  key={collection.id}
                  style={({ pressed }) => [{ width: COLLECTION_TILE }, pressed && styles.pressed]}
                  onPress={() => navigation.navigate("CollectionDetails", { collectionId: collection.id })}
                  accessibilityRole="button"
                >
                  <CollectionCollage collection={collection} watchedIds={watchedIds} size={COLLECTION_TILE} />
                  <Text style={styles.listName} numberOfLines={1}>
                    {collection.title}
                  </Text>
                  <Text style={styles.caption} numberOfLines={1}>
                    {t("{seen} of {moviesCount} watched", { seen, moviesCount: collection.movieIds.length })}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    pressed: {
      opacity: 0.75,
    },
    flipped: {
      transform: [{ scaleX: -1 }],
    },
    // The numbers in one rounded strip, thin rules between them.
    numbers: {
      flexDirection: "row",
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      paddingVertical: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
    },
    number: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: spacing.xs,
    },
    numberRule: {
      borderStartWidth: StyleSheet.hairlineWidth,
      borderStartColor: colors.border,
    },
    numberValue: {
      fontFamily: fonts.extraBold,
      fontSize: 22,
      lineHeight: 28,
      color: colors.textPrimary,
      fontVariant: ["tabular-nums"],
    },
    numberLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    section: {
      marginTop: spacing.section,
    },
    headingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm + 2,
    },
    heading: {
      flexDirection: "row",
      alignItems: "center",
      flexShrink: 1,
      gap: 2,
    },
    headingText: {
      fontFamily: fonts.extraBold,
      fontSize: 21,
      lineHeight: 27,
      letterSpacing: -0.3,
      flexShrink: 1,
      color: colors.textPrimary,
    },
    // Pick: a small grey pill, its words in the signature colour.
    pick: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      height: 32,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.buttonFill,
      borderRadius: shape.chip,
    },
    pickText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.brand,
    },
    row: {
      gap: spacing.rail,
      paddingHorizontal: spacing.md,
    },
    caption: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs + 2,
    },
    // A tier's shelf: its letter, then its films.
    tierShelf: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingStart: spacing.md,
      marginBottom: spacing.sm + 2,
    },
    tierBadge: {
      width: 32,
      height: TIER_POSTER * 1.5,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: shape.poster,
    },
    tierBadgeText: {
      fontFamily: fonts.extraBold,
      fontSize: 18,
      color: "#14181C",
    },
    tierRow: {
      gap: spacing.sm,
      paddingEnd: spacing.md,
    },
    untiered: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.xs,
    },
    untieredText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.brand,
    },
    month: {
      marginBottom: spacing.md,
    },
    monthLabel: {
      ...typography.section,
      color: colors.textPrimary,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    monthCount: {
      color: colors.textMuted,
    },
    lists: {
      flexDirection: "row",
      gap: spacing.rail,
      paddingHorizontal: spacing.md,
    },
    listName: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textPrimary,
      marginTop: spacing.sm,
    },
    newList: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderRadius: shape.poster,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
    },
  });

export default LibraryHome;
