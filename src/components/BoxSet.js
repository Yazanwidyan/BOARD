import { LinearGradient } from "expo-linear-gradient";
import { Trophy } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { MoviePoster } from "./MoviePoster";

// More spines than this get scaled down to this many (lit in proportion),
// so a 20-film genre set still reads at a glance.
const MAX_SPINES = 14;
const SPINE_HEIGHT = 16;
const SPINE_PEEK = 11; // how much of each spine shows above the box
const FRAME = 3;
const SIDE_DEPTH = 5;
const GOLD = ["#F8E08E", "#E8B94E", "#B98A2E"];

// A collection as a DVD box set:
// - the box art is its first four posters (2 × 2), in a black frame with a
//   darker side edge for depth and a gloss across the front;
// - disc spines peek out of the top, one per movie — lit when you've seen
//   it, dark when you haven't — so progress is physical;
// - state "sealed" (not started) adds a shrink-wrap sheen and a SEALED
//   sticker; "complete" lights every spine gold and adds a gold foil seal.
export const BoxSet = ({ collection, watchedIds, state, size }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const movies = collection.movies;
  const isComplete = state === "complete";
  const isSealed = state === "sealed";

  const spineCount = Math.min(movies.length, MAX_SPINES);
  const watchedCount = movies.filter((movie) =>
    watchedIds.has(movie.id),
  ).length;
  const litCount =
    movies.length > MAX_SPINES
      ? Math.round((watchedCount / movies.length) * MAX_SPINES)
      : null;
  const spineLit = (index) =>
    litCount != null ? index < litCount : watchedIds.has(movies[index].id);

  const art = size - FRAME * 2 - SIDE_DEPTH;
  const cell = art / 2;

  return (
    <View style={{ width: size }}>
      {/* Spines — drawn first so the box covers their lower part */}
      <View style={[styles.spines, { height: SPINE_HEIGHT }]}>
        {Array.from({ length: spineCount }, (_, index) => {
          const lit = isComplete || spineLit(index);
          return (
            <View
              key={index}
              style={[
                styles.spine,
                lit
                  ? {
                      backgroundColor: isComplete
                        ? GOLD[1]
                        : colors.accentLight,
                    }
                  : styles.spineDark,
              ]}
            />
          );
        })}
      </View>

      {/* The box */}
      <View
        style={[
          styles.box,
          { width: size, height: size - SIDE_DEPTH },
          isComplete && { borderColor: GOLD[1] },
        ]}
      >
        <View style={[styles.art, isSealed && styles.artSealed]}>
          {[0, 1, 2, 3].map((index) => (
            <MoviePoster
              key={index}
              uri={movies[index % movies.length]?.poster}
              style={{ width: cell, height: cell }}
            />
          ))}
        </View>
        {/* Side edge — the box's depth */}
        <LinearGradient
          colors={["#1A1A24", "#050508"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.side}
        />
        {/* Front gloss */}
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.2)", "rgba(255, 255, 255, 0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 0.55 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {isSealed && (
          <>
            {/* Shrink-wrap: streaky plastic sheen over the whole box */}
            <LinearGradient
              colors={[
                "rgba(255, 255, 255, 0.28)",
                "rgba(255, 255, 255, 0.04)",
                "rgba(255, 255, 255, 0.2)",
                "rgba(255, 255, 255, 0.02)",
              ]}
              locations={[0, 0.35, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={styles.sealedSticker}>
              <Text style={styles.sealedText}>SEALED</Text>
            </View>
          </>
        )}

        {isComplete && (
          <LinearGradient
            colors={GOLD}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.goldSeal}
          >
            <Trophy size={14} color="#5A3F0C" strokeWidth={2.4} />
          </LinearGradient>
        )}
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    spines: {
      flexDirection: "row",
      gap: 2,
      paddingHorizontal: 8,
      marginBottom: -(SPINE_HEIGHT - SPINE_PEEK),
    },
    spine: {
      flex: 1,
      maxWidth: 10,
      borderTopLeftRadius: 2,
      borderTopRightRadius: 2,
      borderTopWidth: 1,
      borderTopColor: "rgba(255, 255, 255, 0.35)",
    },
    spineDark: {
      backgroundColor: "#2A2B44",
      borderTopColor: "rgba(255, 255, 255, 0.08)",
    },
    box: {
      flexDirection: "row",
      padding: FRAME,
      borderRadius: 3,
      backgroundColor: "#0D0D12",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.08)",
      shadowColor: "#000000",
      shadowOpacity: 0.5,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    art: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignSelf: "center",
      overflow: "hidden",
    },
    artSealed: {
      opacity: 0.8,
    },
    side: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      width: SIDE_DEPTH + FRAME,
      borderTopRightRadius: 3,
      borderBottomRightRadius: 3,
    },
    sealedSticker: {
      position: "absolute",
      top: 8,
      right: SIDE_DEPTH + 4,
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 3,
      backgroundColor: colors.danger,
      transform: [{ rotate: "6deg" }],
    },
    sealedText: {
      ...typography.label,
      fontSize: 9,
      letterSpacing: 1,
      color: "#FFFFFF",
    },
    goldSeal: {
      position: "absolute",
      right: SIDE_DEPTH + 4,
      bottom: 6,
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#FFF3C4",
    },
  });

export default BoxSet;
