import { LinearGradient } from "expo-linear-gradient";
import { Image, StyleSheet, View } from "react-native";
import { shape } from "../theme/spacing";
import { Text } from "./AppText";

import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { ReelBoardIcon } from "./icons/TabIcons";
import { ArtworkEdge, MoviePoster } from "./MoviePoster";
import { t } from "../i18n";

// An actor's or a director's collection, as Apple Music's artist covers: a
// gradient in one of a few colours, darker at the top, their photo in
// black and white in a big circle, and the ReelBoard mark in the corner.
const PERSON_GRADIENTS = [
  ["#2E2E30", "#7C7C80"],
  ["#0B2A4A", "#3D7BC4"],
  ["#3A0E12", "#C2414B"],
  ["#0F2E22", "#3F9B70"],
  ["#24123D", "#7C4FC0"],
  ["#3D1F0A", "#D07A2E"],
  ["#0A2E33", "#2F9AA6"],
  ["#3A1028", "#C0508A"],
];

// A person's colours, [dark, light] — always the same for the same
// collection (from its id).
export const personColors = (collection) => {
  const id = String(collection?.id ?? "");
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  return PERSON_GRADIENTS[hash % PERSON_GRADIENTS.length];
};

// A person's photo, in black and white, in a circle. Their photo is a tall
// head-and-shoulders portrait (2 : 3): it fills the circle's width — no
// closer — from just below its top, so the circle shows their head and
// shoulders rather than a close-up of the middle.
const PORTRAIT_RATIO = 1.5;
const PORTRAIT_TOP = 0.04;
export const PersonPhoto = ({ uri, size, style }) => (
  <View style={[{ width: size, height: size, borderRadius: size / 2 }, personStyles.photo, style]}>
    <Image
      source={{ uri }}
      style={[
        personStyles.grey,
        { position: "absolute", top: -size * PORTRAIT_TOP, start: 0, width: size, height: size * PORTRAIT_RATIO },
      ]}
      resizeMode="cover"
    />
  </View>
);

export const PersonCover = ({ photo, size, gradient }) => (
  <LinearGradient colors={gradient} style={[personStyles.cover, { width: size, height: size }]}>
    <View style={[personStyles.mark, { top: size * 0.06, end: size * 0.06 }]}>
      <ReelBoardIcon size={Math.round(size * 0.09)} color="#FFFFFF" />
    </View>
    <PersonPhoto uri={photo} size={Math.round(size * 0.68)} />
  </LinearGradient>
);

const personStyles = StyleSheet.create({
  cover: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  // In the corner, over the gradient — the photo stays centred.
  mark: {
    position: "absolute",
  },
  photo: {
    overflow: "hidden",
    backgroundColor: "#1C1C1E",
  },
  grey: {
    filter: [{ grayscale: 1 }],
  },
});

// A collection as a square poster collage (its first four posters, 2 × 2)
// — or, for an actor's or a director's, their PersonCover — with a slim
// progress bar along the bottom edge. Finished sets get a green bar and a
// small "Complete" tag; untouched collages sit slightly dimmed.
export const CollectionCollage = ({ collection, watchedIds, size }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const movies = collection.movies;
  const seen = movies.filter((movie) => watchedIds.has(movie.id)).length;
  const progress = movies.length ? seen / movies.length : 0;
  const isComplete = progress === 1;
  const cell = size / 2;
  const photo = collection.person ? collection.art?.photo : null;

  return (
    <View style={[styles.collage, { width: size, height: size }]}>
      {photo ? (
        <PersonCover photo={photo} size={size} gradient={personColors(collection)} />
      ) : (
        [0, 1, 2, 3].map((index) => (
          <MoviePoster
            key={index}
            tile
            uri={movies[index % movies.length]?.poster}
            style={[{ width: cell, height: cell }, progress === 0 && styles.dim]}
          />
        ))
      )}
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: isComplete ? colors.success : colors.collection,
            },
          ]}
        />
      </View>
      {isComplete && (
        <View style={styles.completeTag}>
          <Text style={styles.completeText}>{t("Completed")}</Text>
        </View>
      )}
      <ArtworkEdge />
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    // A poster's corners and frame, clipping the posters (or the person's
    // cover) and the progress bar inside.
    collage: {
      flexDirection: "row",
      flexWrap: "wrap",
      overflow: "hidden",
      backgroundColor: colors.card,
      borderRadius: shape.poster,
    },
    dim: {
      opacity: 0.55,
    },
    track: {
      position: "absolute",
      start: 0,
      end: 0,
      bottom: 0,
      height: 4,
      backgroundColor: "rgba(2, 0, 2, 0.6)",
    },
    fill: {
      height: "100%",
    },
    completeTag: {
      position: "absolute",
      top: 6,
      start: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: shape.chip,
      backgroundColor: colors.success,
    },
    completeText: {
      ...typography.label,
      fontSize: 11,
      color: colors.background,
    },
  });

export default CollectionCollage;
