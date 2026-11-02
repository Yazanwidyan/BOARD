import { StyleSheet, View } from "react-native";

import { useColors } from "../theme/useColors";

// How far through a collection, as a set: a slot for each of its films,
// filled for the ones you've seen — never a bar, which reads as time spent
// in one film. `movieIds` in the collection's order; `watchedIds` a Set;
// `fresh`: a film just watched, its slot lit brighter. In Arabic the row
// runs right to left with the layout.
export const SlotStrip = ({ movieIds, watchedIds, fresh = null, height = 6, style }) => {
  const colors = useColors();
  return (
    <View style={[styles.strip, { height }, style]} accessible={false}>
      {movieIds.map((id) => (
        <View
          key={id}
          style={[
            styles.slot,
            { borderRadius: Math.min(2, height / 2), backgroundColor: colors.cardElevated },
            watchedIds.has(id) && { backgroundColor: colors.collection },
            id === fresh && { backgroundColor: colors.textPrimary },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    flexDirection: "row",
    gap: 2,
  },
  slot: {
    flex: 1,
  },
});

export default SlotStrip;
