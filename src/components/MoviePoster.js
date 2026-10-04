import { Film } from "lucide-react-native";
import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { shadows } from "../theme/shadows";
import { useColors } from "../theme/useColors";

export const MoviePoster = ({
  uri,
  style,
  radius: cornerRadius = 0,
  shadow = false,
  blurRadius,
}) => {
  const [failed, setFailed] = useState(false);
  const colors = useColors();
  const styles = createStyles(colors);

  const content = (
    <View
      style={[
        styles.container,
        { borderRadius: cornerRadius },
        !shadow && style,
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
    <View style={[{ borderRadius: cornerRadius }, shadows.md, style]}>
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
