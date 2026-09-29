import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { MoviePoster } from "../components/MoviePoster";
import { ScreenBottomFade } from "../components/ScreenBottomFade";
import { useMovieStore } from "../store/movieStore";
import { TAB_BAR_CLEARANCE, radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import {
  getCollectionProgress,
  getCollectionSections,
  getCurrentCollection,
} from "../utils/collections";

const CollectionCollage = ({ movies, styles }) => (
  <View style={styles.collectionCollage}>
    {movies.slice(0, 3).map((movie, index) => (
      <MoviePoster
        key={movie.id}
        uri={movie.poster}
        radius={radius.xs}
        style={[
          styles.collectionCollagePoster,
          { left: index * 16, zIndex: 3 - index },
        ]}
      />
    ))}
  </View>
);

const CONTINUE_TYPE_LABELS = {
  franchise: "Franchise",
  decade: "Decade",
  genre: "Genre",
};

const ContinueCard = ({ collection, watchedIds, onPress, styles }) => {
  const { progress } = getCollectionProgress(collection, watchedIds);

  return (
    <View style={styles.continueFrame}>
      <Pressable style={styles.continueCard} onPress={onPress}>
        <Text style={styles.continueLabel}>
          {CONTINUE_TYPE_LABELS[collection.type] ?? "Collection"}
        </Text>
        <Text style={styles.continueTitle} numberOfLines={1}>
          {collection.title}
        </Text>
        <View style={styles.continueBarTrack}>
          <View
            style={[styles.continueBarFill, { width: `${progress * 100}%` }]}
          />
        </View>
      </Pressable>
    </View>
  );
};

const CollectionCard = ({ collection, watchedIds, onPress, styles }) => {
  const { watchedCount, total, progress } = getCollectionProgress(
    collection,
    watchedIds,
  );

  return (
    <Pressable style={styles.collectionCard} onPress={onPress}>
      <CollectionCollage movies={collection.movies} styles={styles} />
      <View style={styles.collectionInfo}>
        <Text style={styles.collectionTitle} numberOfLines={1}>
          {collection.title}
        </Text>
        <View style={styles.collectionBarTrack}>
          <View
            style={[styles.collectionBarFill, { width: `${progress * 100}%` }]}
          />
        </View>
        <Text style={styles.collectionProgressText}>
          {watchedCount}/{total} watched
        </Text>
      </View>
    </Pressable>
  );
};

export const CollectionsScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const watched = useMovieStore((state) => state.watched);

  const watchedIds = new Set(watched.map((entry) => entry.movieId));
  const currentCollection = getCurrentCollection(watchedIds);
  const collectionSections = getCollectionSections();

  const openCollection = (collectionId) =>
    navigation.navigate("CollectionDetails", { collectionId });

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Collections</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
        }}
      >
        {currentCollection && (
          <View style={styles.continueSection}>
            <Text style={styles.sectionTitle}>Continue</Text>
            <ContinueCard
              collection={currentCollection}
              watchedIds={watchedIds}
              styles={styles}
              onPress={() => openCollection(currentCollection.id)}
            />
          </View>
        )}

        {collectionSections.map((section) => (
          <View key={section.type} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                watchedIds={watchedIds}
                styles={styles}
                onPress={() => openCollection(collection.id)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
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
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      ...typography.title,
      color: colors.textPrimary,
    },
    continueSection: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
    },
    section: {
      paddingHorizontal: spacing.md,
      marginTop: spacing.xl,
    },
    sectionTitle: {
      ...typography.label,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    // Nested double-card "frame" look: a darker outer shape with a fixed
    // padding gap, and the lighter card floating inside it — the gap
    // itself is the frame, not a drawn border.
    continueFrame: {
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: 4,
      paddingBottom: 10, // extra padding to make room for the progress bar
    },
    continueCard: {
      backgroundColor: colors.cardElevatedLight,
      borderRadius: radius.lg,
      padding: 20,
    },
    continueLabel: {
      ...typography.body,
      color: colors.textSecondary,
    },
    continueTitle: {
      ...typography.title,
      fontSize: 21,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    continueBarTrack: {
      height: 8,
      borderRadius: 3,
      backgroundColor: colors.card,
      overflow: "hidden",
      marginTop: 18,
    },
    continueBarFill: {
      height: "100%",
      backgroundColor: colors.accentLight,
    },
    collectionCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      backgroundColor: colors.card,
      borderRadius: radius.sm,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    collectionCollage: {
      width: 76,
      height: 60,
    },
    collectionCollagePoster: {
      position: "absolute",
      top: 0,
      width: 44,
      aspectRatio: 2 / 3,
    },
    collectionInfo: {
      flex: 1,
      gap: 6,
    },
    collectionTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    collectionBarTrack: {
      height: 6,
      borderRadius: 2,
      backgroundColor: colors.surfaceSoft,
      overflow: "hidden",
    },
    collectionBarFill: {
      height: "100%",
      borderRadius: 2,
      backgroundColor: colors.accentLight,
    },
    collectionProgressText: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
    },
  });

export default CollectionsScreen;
