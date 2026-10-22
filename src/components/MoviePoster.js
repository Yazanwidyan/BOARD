import { Film } from "lucide-react-native";
import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { shadows } from "../theme/shadows";
import { useColors } from "../theme/useColors";
import { shape } from "../theme/spacing";

// Every poster looks the same, app-wide: slightly rounded corners and a
// thin dark frame drawn over the image's edge (so it never changes the
// poster's size). Any `radius` a caller passes is ignored, and a
// borderRadius in `style` is overridden, so one place decides the look.
const POSTER_RADIUS = shape.poster;
const POSTER_EDGE_WIDTH = 1.5;

export const MoviePoster = ({ uri, style, shadow = false, blurRadius }) => {
  const cornerRadius = POSTER_RADIUS;
  const [failed, setFailed] = useState(false);
  const colors = useColors();
  const styles = createStyles(colors);

  const content = (
    <View
      style={[
        styles.container,
        !shadow && style,
        { borderRadius: cornerRadius },
      ]}
    >
      {failed || !uri ? (
        <View style={[styles.fallback, { borderRadius: cornerRadius }]}>
          <Film size={28} color={colors.textMuted} />
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={[styles.image, { borderRadius: cornerRadius }]}
          onError={() => setFailed(true)}
          blurRadius={blurRadius}
        />
      )}
      <View pointerEvents="none" style={[styles.edge, { borderRadius: cornerRadius }]} />
    </View>
  );

  if (!shadow) return content;

  return (
    <View style={[shadows.md, style, { borderRadius: cornerRadius }]}>
      {content}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      overflow: "hidden",
      backgroundColor: colors.card,
    },
    image: {
      width: "100%",
      height: "100%",
    },
    edge: {
      ...StyleSheet.absoluteFill,
      borderWidth: POSTER_EDGE_WIDTH,
      borderColor: colors.posterEdge,
    },
    fallback: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
  });

export default MoviePoster;
