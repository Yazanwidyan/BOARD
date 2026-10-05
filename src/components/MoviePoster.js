import { Film } from "lucide-react-native";
import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { shadows } from "../theme/shadows";
import { useColors } from "../theme/useColors";

// Posters are always square-cornered, app-wide — any `radius` a caller
// passes is ignored, and a borderRadius in `style` is overridden, so one
// place decides the look of every poster.
const POSTER_RADIUS = 0;

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
    fallback: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
    },
  });

export default MoviePoster;
