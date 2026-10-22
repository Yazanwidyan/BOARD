import {
  Clapperboard,
  Clock,
  Crown,
  Film,
  Gavel,
  Hourglass,
  ListOrdered,
  RotateCcw,
  Shapes,
  Target,
  Timer,
  Zap,
} from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { useColors } from "../theme/useColors";
import { getRankMetal } from "../utils/ranks";

// One icon per track (utils/ranks' `icon`).
const ICONS = {
  saga: Crown,
  film: Film,
  tier: ListOrdered,
  decades: Clock,
  genres: Shapes,
  directors: Clapperboard,
  classic: Hourglass,
  critic: Gavel,
  long: Timer,
  marathon: Zap,
  rewatch: RotateCcw,
  dare: Target,
};

const METALS = {
  bronze: "#D9A066",
  silver: "#C8C9CC",
};

// A rank as a small square tile: its track's icon on the metal of where
// the rank sits on its ladder — bronze low, silver past the middle, gold at
// the top. `step` null (nothing reached yet) draws it locked: grey.
export const RankBadge = ({ track, step, size = 40 }) => {
  const colors = useColors();
  const Icon = ICONS[track.icon] ?? Crown;
  const metal = step ? getRankMetal(step, track) : null;
  const color = metal === "gold" ? colors.rating : metal ? METALS[metal] : colors.textMuted;
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.28),
          backgroundColor: step ? `${color}29` : colors.surfaceSoft,
          borderColor: step ? `${color}80` : "transparent",
        },
      ]}
    >
      <Icon size={Math.round(size * 0.5)} color={color} strokeWidth={2.1} />
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});

export default RankBadge;
