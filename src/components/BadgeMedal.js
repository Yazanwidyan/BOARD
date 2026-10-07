import {
  Bookmark,
  Check,
  Film,
  Layers,
  Lock,
  RotateCw,
  Sparkles,
  Star,
} from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useColors } from "../theme/useColors";
import { BadgeArt, badgeTrackColor } from "./BadgeArt";
import { TargetIcon } from "./icons/TabIcons";

// One track per badge category: its medal icon, what the count measures
// (for "3 more movies" / "Watch 10 movies"), and where "How to earn" goes.
export const BADGE_CATEGORIES = [
  {
    key: "watched",
    title: "Watching",
    Icon: Film,
    verb: "Watch",
    unit: "movies",
    cta: { label: "Find something to watch", route: "Discover" },
  },
  {
    key: "critic",
    title: "Critic",
    Icon: Star,
    verb: "Tier",
    unit: "movies",
    cta: {
      label: "Tier what you've watched",
      route: "Library",
      params: { showUntiered: true },
    },
  },
  {
    key: "rewatch",
    title: "Rewatch",
    Icon: RotateCw,
    verb: "Rewatch",
    unit: "different movies",
    cta: {
      label: "Revisit a favorite",
      route: "Library",
      params: { initialTab: "watched" },
    },
  },
  {
    key: "collections",
    title: "Collections",
    Icon: Layers,
    verb: "Complete",
    unit: "collections",
    cta: {
      label: "Continue a collection",
      route: "Library",
      params: { initialTab: "collections" },
    },
  },
  {
    key: "challenges",
    title: "Challenges",
    Icon: TargetIcon,
    verb: "Complete",
    unit: "challenges",
    cta: { label: "Start a challenge", route: "Decide" },
  },
  {
    key: "watchlist",
    title: "Watchlist",
    Icon: Bookmark,
    verb: "Save",
    unit: "movies to your watchlist",
    cta: { label: "Build your watchlist", route: "Discover" },
  },
];
export const BADGE_CATEGORY_BY_KEY = Object.fromEntries(
  BADGE_CATEGORIES.map((category) => [category.key, category]),
);

// Tier "metal" — bronze, silver, gold, platinum, diamond, master — so a
// higher badge in a track looks more valuable than a lower one.
const METALS = [
  "#C97C4B",
  "#B9BBD2",
  "#E8B94E",
  "#7FE0D6",
  "#8D9FFF",
  "#8D60E2",
];
export const metalFor = (tierIndex) =>
  METALS[Math.min(tierIndex, METALS.length - 1)];
// Marquee (named franchise) badges count as gold-level brags.
const MARQUEE_TIER_INDEX = 2;

// How a badge looks anywhere outside its ladder: its icon, its track
// colour (still called `metal` by callers), and
// how high up its track it sits (used to rank the auto showcase).
export const getBadgeLook = (badge, badges) => {
  if (badge.category === "marquee") {
    return {
      Icon: Sparkles,
      metal: badgeTrackColor("marquee"),
      tierIndex: MARQUEE_TIER_INDEX,
    };
  }
  const tierIndex = badges
    .filter((other) => other.category === badge.category)
    .findIndex((other) => other.id === badge.id);
  return {
    Icon: BADGE_CATEGORY_BY_KEY[badge.category]?.Icon ?? Sparkles,
    metal: badgeTrackColor(badge.category),
    tierIndex,
  };
};

// The badges on the Watcher card: your highest earned badge from every
// track, plus each earned marquee badge — most valuable first.
export const getShowcaseBadges = (badges) => {
  const bestPerTrack = new Map();
  badges
    .filter((badge) => badge.earned)
    .forEach((badge) => {
      const key = badge.category === "marquee" ? badge.id : badge.category;
      bestPerTrack.set(key, badge); // ladders are ordered low → high
    });
  return [...bestPerTrack.values()]
    .map((badge) => ({ badge, look: getBadgeLook(badge, badges) }))
    .sort((a, b) => b.look.tierIndex - a.look.tierIndex)
    .map(({ badge }) => badge);
};

const ProgressRing = ({ size, stroke, progress, color, trackColor }) => {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={trackColor}
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - Math.min(1, progress))}
        fill="none"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
};
export { ProgressRing };

// A badge medal (see BadgeArt): earned → full metal; current (next to
// earn) → grey medal inside a progress ring; locked → dim with a lock.
// `showCheck` adds the small earned tick.
export const Medal = ({
  badge,
  metal,
  tierIndex,
  state = "earned",
  size,
  showCheck = true,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const cornerSize = Math.max(16, Math.round(size * 0.34));
  // How fancy the frame is. Marquee badges and metals outside the ladder
  // (e.g. the theme's gold) draw as a gold-tier rosette.
  const tier =
    tierIndex ??
    (badge.category === "marquee"
      ? MARQUEE_TIER_INDEX
      : METALS.indexOf(metal) === -1
        ? MARQUEE_TIER_INDEX
        : METALS.indexOf(metal));
  return (
    <View style={{ width: size, height: size }}>
      {state === "current" && (
        <ProgressRing
          size={size}
          stroke={4}
          progress={badge.progress / badge.threshold}
          color={colors.accentLight}
          trackColor={colors.surfaceSoft}
        />
      )}
      <View
        style={[
          styles.art,
          state === "current" && styles.artCurrent,
          state === "locked" && styles.artLocked,
        ]}
      >
        <BadgeArt
          emblem={badge.category}
          tier={tier}
          metal={metal}
          earned={state === "earned"}
          size={size}
        />
      </View>
      {state === "locked" && (
        <View
          style={[
            styles.corner,
            styles.lockBadge,
            {
              width: cornerSize,
              height: cornerSize,
              borderRadius: cornerSize / 2,
            },
          ]}
        >
          <Lock
            size={cornerSize * 0.5}
            color={colors.textMuted}
            strokeWidth={2.5}
          />
        </View>
      )}
      {state === "earned" && showCheck && (
        <View
          style={[
            styles.corner,
            styles.checkBadge,
            {
              width: cornerSize,
              height: cornerSize,
              borderRadius: cornerSize / 2,
              backgroundColor: metal,
            },
          ]}
        >
          <Check
            size={cornerSize * 0.5}
            color={colors.background}
            strokeWidth={3.5}
          />
        </View>
      )}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    art: {
      alignItems: "center",
      justifyContent: "center",
    },
    artCurrent: {
      transform: [{ scale: 0.78 }],
    },
    artLocked: {
      opacity: 0.45,
    },
    corner: {
      position: "absolute",
      right: -2,
      bottom: -2,
      alignItems: "center",
      justifyContent: "center",
    },
    lockBadge: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    checkBadge: {
      borderWidth: 2,
      borderColor: colors.background,
    },
  });

export default Medal;
