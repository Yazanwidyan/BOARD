import { MoreHorizontal, Share2, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Text } from "../components/AppText";
import Animated from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BoardMoviesSheet } from "../components/BoardMoviesSheet";
import { BoardNameSheet } from "../components/BoardNameSheet";
import { BoardShareSheet } from "../components/BoardShareSheet";
import { EmptyState } from "../components/EmptyState";
import { MoviePoster } from "../components/MoviePoster";
import { Popover } from "../components/Popover";
import {
  HEADER_BAR_HEIGHT,
  HeaderIconButton,
  StackHeader,
  useStackHeaderScroll,
} from "../components/ScreenHeader";
import { getMovieById } from "../data/movies";
import { useBoardStore } from "../store/boardStore";
import { useMovieStore } from "../store/movieStore";
import { useSessionStore } from "../store/sessionStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { shuffle } from "../utils/shuffle";
import { t } from "../i18n";

const COLUMNS = 3;
const GAP = 2;
const SWIPE_MAX = 10;
const SWIPE_MIN = 2;
const MOVIE_NIGHT_MIN = 4;
const MENU_WIDTH = 200;

// One board: its posters edge to edge, with the things you'd do with a
// list — add to it, swipe it down to one, swipe it together, share it as
// an image. "Edit" turns the grid into tap-to-remove.
export const BoardDetailsScreen = ({ route, navigation }) => {
  const headerScroll = useStackHeaderScroll();
  const { boardId } = route.params;
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const board = useBoardStore((state) =>
    state.boards.find((item) => item.id === boardId),
  );
  const renameBoard = useBoardStore((state) => state.renameBoard);
  const deleteBoard = useBoardStore((state) => state.deleteBoard);
  const toggleBoardMovie = useBoardStore((state) => state.toggleBoardMovie);
  const watched = useMovieStore((state) => state.watched);
  const startSession = useSessionStore((state) => state.startSession);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Deleted (here or elsewhere) — nothing left to show.
  useEffect(() => {
    if (!board) navigation.goBack();
  }, [board, navigation]);

  if (!board) return <View style={styles.container} />;

  const movies = board.movieIds.map(getMovieById).filter(Boolean);
  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const unwatched = movies.filter((movie) => !watchedIds.has(movie.id));
  const seenCount = movies.length - unwatched.length;
  const tile = (width - GAP * (COLUMNS - 1)) / COLUMNS;

  const handleSwipe = () => {
    startSession(shuffle(unwatched).slice(0, SWIPE_MAX));
    navigation.navigate("Swipe");
  };

  const confirmDelete = () => {
    setIsMenuOpen(false);
    Alert.alert(
      t("Delete {name}?", { name: board.name }),
      t("The movies stay in your library — only the board goes."),
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Delete"),
          style: "destructive",
          onPress: () => deleteBoard(board.id),
        },
      ],
    );
  };

  const actions = [
    { key: "add", label: t("Add movies"), onPress: () => setIsAddOpen(true) },
    unwatched.length >= SWIPE_MIN && {
      key: "swipe",
      label: t("Swipe this board"),
      onPress: handleSwipe,
    },
    unwatched.length >= MOVIE_NIGHT_MIN && {
      key: "night",
      label: t("Movie night"),
      onPress: () => navigation.navigate("MovieNight", { boardId: board.id }),
    },
  ].filter(Boolean);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StackHeader
        scrollY={headerScroll.scrollY}
        title={board.name}
        onBack={() => navigation.goBack()}
        right={
          <>
            <HeaderIconButton
              onPress={() => movies.length > 0 && setIsShareOpen(true)}
              accessibilityLabel={t("Share board")}
            >
              <Share2
                size={22}
                color={
                  movies.length === 0 ? colors.textMuted : colors.textPrimary
                }
                strokeWidth={1.75}
              />
            </HeaderIconButton>
            <HeaderIconButton
              onPress={() => setIsMenuOpen(true)}
              accessibilityLabel={t("More")}
            >
              <MoreHorizontal
                size={22}
                color={colors.textPrimary}
                strokeWidth={1.75}
              />
            </HeaderIconButton>
          </>
        }
      />

      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        <View style={styles.intro}>
          <View style={styles.introText}>
            <Text style={styles.count}>
              {t("{count} movies", { count: movies.length })}
            </Text>
            {seenCount > 0 && (
              <Text style={styles.meta}>
                {t("{count} watched", { count: seenCount })}
              </Text>
            )}
          </View>
          {movies.length > 0 && (
            <Pressable onPress={() => setIsEditing((value) => !value)} hitSlop={8}>
              <Text style={styles.editText}>
                {isEditing ? t("Done") : t("Edit")}
              </Text>
            </Pressable>
          )}
        </View>

        {!isEditing && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actions}
          >
            {actions.map(({ key, label, onPress }) => (
              <Pressable
                key={key}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.action,
                  key === "add" && styles.actionPrimary,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.actionText,
                    key === "add" && styles.actionTextPrimary,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {movies.length === 0 ? (
          <EmptyState
            art="emptyShelf"
            title={t("Nothing on this board yet")}
            subtitle={t(
              "Add movies here, or use “Board” on any movie's page.",
            )}
            actionLabel={t("Add movies")}
            onAction={() => setIsAddOpen(true)}
          />
        ) : (
          <View style={styles.grid}>
            {movies.map((movie) => (
              <Pressable
                key={movie.id}
                onPress={() =>
                  isEditing
                    ? toggleBoardMovie(board.id, movie.id)
                    : navigation.navigate("MovieDetails", { movieId: movie.id })
                }
                style={({ pressed }) => [
                  { width: tile, height: tile * 1.5 },
                  pressed && styles.pressed,
                ]}
                accessibilityLabel={
                  isEditing
                    ? t("Remove {title}", { title: movie.title })
                    : movie.title
                }
              >
                <MoviePoster
                  uri={movie.poster}
                  style={[
                    StyleSheet.absoluteFill,
                    watchedIds.has(movie.id) && !isEditing && styles.seen,
                  ]}
                />
                {isEditing && (
                  <View style={styles.removeBadge}>
                    <X size={16} color="#FFFFFF" strokeWidth={2.4} />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </Animated.ScrollView>

      <Popover
        visible={isMenuOpen}
        width={MENU_WIDTH}
        anchor={{
          top: insets.top + HEADER_BAR_HEIGHT + spacing.sm,
          right: spacing.md,
        }}
        onClose={() => setIsMenuOpen(false)}
      >
        <Pressable
          style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
          onPress={() => {
            setIsMenuOpen(false);
            setIsRenameOpen(true);
          }}
        >
          <Text style={styles.menuText}>{t("Rename")}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
          onPress={confirmDelete}
        >
          <Text style={[styles.menuText, styles.menuDanger]}>
            {t("Delete board")}
          </Text>
        </Pressable>
      </Popover>

      <BoardMoviesSheet
        visible={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        boardId={board.id}
      />
      <BoardNameSheet
        visible={isRenameOpen}
        initialName={board.name}
        onClose={() => setIsRenameOpen(false)}
        onSave={(name) => {
          renameBoard(board.id, name);
          setIsRenameOpen(false);
        }}
      />
      <BoardShareSheet
        visible={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        board={board}
        movies={movies}
      />
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
      opacity: 0.7,
    },
    intro: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    introText: {
      flex: 1,
      flexDirection: "row",
      alignItems: "baseline",
      gap: spacing.sm,
    },
    count: {
      ...typography.title,
      fontSize: 18,
      color: colors.textPrimary,
    },
    meta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    editText: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    actions: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    action: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.card,
    },
    actionPrimary: {
      backgroundColor: colors.selected,
    },
    actionText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
    actionTextPrimary: {
      color: colors.selectedText,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: GAP,
      marginTop: spacing.md,
    },
    seen: {
      opacity: 0.5,
    },
    // On a poster, so fixed dark + white.
    removeBadge: {
      position: "absolute",
      top: spacing.xs + 2,
      end: spacing.xs + 2,
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
    },
    menuRow: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
    },
    menuText: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    menuDanger: {
      color: colors.danger,
    },
  });

export default BoardDetailsScreen;
