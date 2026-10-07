import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Linking,
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { MOVIES, getMovieById } from "../data/movies";
import { REEL_CLIPS, getYoutubeThumbnail } from "../data/reelClips";
import { useMovieStore } from "../store/movieStore";
import { showToast } from "../store/toastStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import {
  giveWatchedFeedback,
  toggleBucketListWithFeedback,
} from "../utils/achievementFeedback";
import { formatRuntime } from "../utils/movieFilters";
import { getTastePicks } from "../utils/tasteEngine";
import { getTier, getTierInfo } from "../utils/tiers";

const CLIPS_BY_MOVIE = new Map(REEL_CLIPS.map((clip) => [clip.movieId, clip]));
const VIDEO_RATIO = 9 / 16;

// ---------- hand-drawn rail marks (no icon set) ----------

export const SaveMark = ({ color, filled }) => (
  <Svg width={28} height={28} viewBox="0 0 28 28">
    <Path
      d="M8 4 H20 A2 2 0 0 1 22 6 V24 L14 19 L6 24 V6 A2 2 0 0 1 8 4 Z"
      fill={filled ? color : "none"}
      stroke={color}
      strokeWidth={2.2}
      strokeLinejoin="round"
    />
  </Svg>
);

// A ticket stub with a check: "seen it".
export const SeenMark = ({ color, filled }) => (
  <Svg width={30} height={28} viewBox="0 0 30 28">
    <Path
      d="M4 8 H26 V12 A2.5 2.5 0 0 0 26 17 V21 H4 V17 A2.5 2.5 0 0 0 4 12 Z"
      fill={filled ? color : "none"}
      stroke={color}
      strokeWidth={2.2}
      strokeLinejoin="round"
    />
    <Path
      d="M10.5 14.5 l3 3 l6 -6.5"
      stroke={filled ? "#16152A" : color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

// A film frame with an "i": details.
export const InfoMark = ({ color }) => (
  <Svg width={28} height={28} viewBox="0 0 28 28">
    <Rect
      x={4}
      y={5}
      width={20}
      height={18}
      rx={3}
      fill="none"
      stroke={color}
      strokeWidth={2.2}
    />
    <Circle cx={14} cy={10.5} r={1.6} fill={color} />
    <Line
      x1={14}
      y1={14}
      x2={14}
      y2={19}
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
    />
  </Svg>
);

export const ShareMark = ({ color }) => (
  <Svg width={28} height={28} viewBox="0 0 28 28">
    <Path
      d="M14 4 V17"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
    />
    <Path
      d="M9 9 L14 4 L19 9"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M7 14 V22 A2 2 0 0 0 9 24 H19 A2 2 0 0 0 21 22 V14"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      fill="none"
    />
  </Svg>
);

const NotForMeMark = ({ color }) => (
  <Svg width={28} height={28} viewBox="0 0 28 28">
    <Circle
      cx={14}
      cy={14}
      r={10}
      fill="none"
      stroke={color}
      strokeWidth={2.2}
    />
    <Path
      d="M10 10 L18 18 M18 10 L10 18"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
    />
  </Svg>
);

// Speaker with or without sound waves.
const SoundMark = ({ color, muted }) => (
  <Svg width={18} height={18} viewBox="0 0 18 18">
    <Path d="M3 7 H6 L10 3.5 V14.5 L6 11 H3 Z" fill={color} />
    {muted ? (
      <Path
        d="M12.5 7 L16 10.5 M16 7 L12.5 10.5"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    ) : (
      <Path
        d="M12.5 6 Q14.5 9 12.5 12"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
    )}
  </Svg>
);

// ---------- feed ordering ----------

// Clips for movies you haven't seen come first, ranked by the taste engine
// (with its reason, e.g. "this is Nolan too"); ones you've seen follow.
const buildFeed = (watched, bucketList) => {
  const picks = getTastePicks(watched, {
    watchlist: bucketList.map((entry) => entry.movieId),
    count: MOVIES.length,
  });
  const unseen = picks
    .filter((pick) => CLIPS_BY_MOVIE.has(pick.movie.id))
    .map((pick) => ({
      clip: CLIPS_BY_MOVIE.get(pick.movie.id),
      movie: pick.movie,
      reason: pick.reasons[0] ?? null,
      match: pick.match,
    }));
  const seenIds = new Set(watched.map((entry) => entry.movieId));
  const seen = REEL_CLIPS.filter((clip) => seenIds.has(clip.movieId)).map(
    (clip) => ({
      clip,
      movie: getMovieById(clip.movieId),
      reason: "You've seen it — relive it.",
      match: null,
    }),
  );
  return [...unseen, ...seen].filter((item) => item.movie);
};

// ---------- one reel ----------

const RailButton = ({ label, onPress, children, styles }) => (
  <Pressable
    style={({ pressed }) => [styles.railButton, pressed && styles.pressed]}
    onPress={onPress}
    hitSlop={6}
    accessibilityLabel={label}
  >
    {children}
    <Text style={styles.railLabel}>{label}</Text>
  </Pressable>
);

const Reel = ({
  item,
  height,
  isActive,
  muted,
  onToggleMute,
  onNotForMe,
  navigation,
  bottomInset,
  styles,
  colors,
}) => {
  const { width } = useWindowDimensions();
  const { movie, clip, reason, match } = item;
  const playerRef = useRef(null);
  const [failed, setFailed] = useState(null); // YouTube error code, if any
  // What the player is doing (drives "tap to play" vs sound toggling).
  const [playerState, setPlayerState] = useState("loading");
  // Play is only sent once the player says it's ready — a play command
  // given before that is dropped, which left clips sitting on "ready".
  const [playRequested, setPlayRequested] = useState(false);
  const isPlaying = playerState === "playing";

  // Leaving the reel resets it, so coming back starts it cleanly again.
  useEffect(() => {
    if (!isActive) {
      setPlayRequested(false);
      setPlayerState("loading");
    }
  }, [isActive]);

  // Re-sends play by flipping the prop off and on (the player only acts on
  // changes).
  const kickPlay = () => {
    setPlayRequested(false);
    setTimeout(() => setPlayRequested(true), 60);
  };

  // Tap: start it if it isn't playing yet, otherwise sound on/off.
  const handleVideoTap = () => {
    if (!isPlaying) kickPlay();
    else onToggleMute();
  };
  const watchedEntry = useMovieStore((state) =>
    state.watched.find((entry) => entry.movieId === movie.id),
  );
  const isSaved = useMovieStore((state) =>
    state.bucketList.some((entry) => entry.movieId === movie.id),
  );
  const tier = watchedEntry ? getTier(watchedEntry) : null;
  const videoHeight = width * VIDEO_RATIO;
  const details = movie.details ?? {};

  const openDetails = () =>
    navigation.navigate("MovieDetails", { movieId: movie.id });

  const handleSeen = () => {
    if (watchedEntry) {
      showToast(`You've already seen ${movie.title}`);
      return;
    }
    const { watched: watchedBefore, bucketList: bucketListBefore } =
      useMovieStore.getState();
    useMovieStore.getState().toggleWatched(movie.id);
    // Opens the reward dialog, where it can be tiered right away.
    giveWatchedFeedback(movie.id, watchedBefore, bucketListBefore);
  };

  return (
    <View style={{ height, width }}>
      {/* Blurred poster behind everything */}
      <Image
        source={{ uri: movie.poster }}
        blurRadius={24}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.dim]} />

      {/* The clip, centred */}
      <View style={[styles.videoBox, { height: videoHeight }]}>
        {isActive && !failed ? (
          <YoutubePlayer
            ref={playerRef}
            height={videoHeight}
            width={width}
            videoId={clip.youtubeId}
            play={isActive && playRequested}
            mute={muted}
            initialPlayerParams={{
              start: clip.start,
              end: clip.end,
              controls: false,
              modestbranding: true,
              rel: false,
              preventFullScreen: true,
              iv_load_policy: 3,
            }}
            webViewProps={{
              allowsInlineMediaPlayback: true,
              mediaPlaybackRequiresUserAction: false,
            }}
            // Android blocks autoplay in a web view unless forced.
            forceAndroidAutoplay
            onReady={() => {
              setPlayerState("ready");
              // Give the player a beat after ready, then start (muted).
              setTimeout(() => setPlayRequested(true), 250);
            }}
            onChangeState={(state) => {
              setPlayerState(state);
              // Loop the highlight window.
              if (state === "ended")
                playerRef.current?.seekTo(clip.start, true);
            }}
            onError={(error) => setFailed(String(error || "error"))}
          />
        ) : (
          <Image
            source={{ uri: getYoutubeThumbnail(clip.youtubeId) }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        )}
        {failed && (
          <View style={[StyleSheet.absoluteFill, styles.unavailable]}>
            <Text style={styles.unavailableText}>
              This clip can&apos;t play here
            </Text>
            <Pressable
              style={styles.youtubeButton}
              onPress={() =>
                Linking.openURL(
                  `https://www.youtube.com/watch?v=${clip.youtubeId}`,
                )
              }
            >
              <Text style={styles.youtubeButtonText}>Watch on YouTube</Text>
            </Pressable>
          </View>
        )}
        {/* Once it's playing, this layer catches taps (sound on/off) and
            keeps swipes for the feed — the web player would otherwise
            swallow them. Until then it's left off, so a tap lands on
            YouTube's own player: many phones only start video from a real
            tap inside the player. */}
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            (failed || !isPlaying) && styles.hidden,
          ]}
          onPress={handleVideoTap}
          accessibilityLabel={
            !isPlaying
              ? "Play clip"
              : muted
                ? "Turn sound on"
                : "Turn sound off"
          }
        />
        <View style={styles.soundPill} pointerEvents="none">
          <SoundMark color="#FFFFFF" muted={muted} />
          <Text style={styles.soundText}>
            {!isPlaying
              ? "Tap the video to play"
              : muted
                ? "Tap for sound"
                : "Sound on"}
          </Text>
        </View>
      </View>

      {/* Bottom gradient for the text */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.85)"]}
        style={styles.bottomFade}
      />

      {/* What it is — always on screen */}
      <View style={[styles.info, { bottom: bottomInset + spacing.md }]}>
        {reason && (
          <Text style={styles.reason} numberOfLines={2}>
            {reason}
          </Text>
        )}
        <Pressable onPress={openDetails} hitSlop={6}>
          <Text style={styles.title} numberOfLines={2}>
            {movie.title}
          </Text>
        </Pressable>
        <Text style={styles.meta} numberOfLines={1}>
          {movie.year} · {movie.genres[0]} · {formatRuntime(movie.runtime)} ·{" "}
          {movie.director}
        </Text>
        <View style={styles.chips}>
          <View style={styles.chip}>
            <Text style={styles.chipStrong}>
              IMDb {movie.rating.toFixed(1)}
            </Text>
          </View>
          {details.rottenTomatoes != null && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>RT {details.rottenTomatoes}%</Text>
            </View>
          )}
          {tier ? (
            <View
              style={[
                styles.chip,
                { backgroundColor: getTierInfo(tier).color },
              ]}
            >
              <Text style={[styles.chipStrong, styles.chipTierText]}>
                Your tier {tier}
              </Text>
            </View>
          ) : match != null ? (
            <View style={[styles.chip, styles.chipMatch]}>
              <Text style={styles.chipStrong}>{match}% your taste</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Action rail */}
      <View style={[styles.rail, { bottom: bottomInset + spacing.md }]}>
        <RailButton
          label={isSaved ? "Saved" : "Save"}
          onPress={() => {
            Haptics.selectionAsync();
            toggleBucketListWithFeedback(movie.id);
          }}
          styles={styles}
        >
          <SaveMark
            color={isSaved ? colors.accentLight : "#FFFFFF"}
            filled={isSaved}
          />
        </RailButton>
        <RailButton
          label={watchedEntry ? "Seen" : "Seen it"}
          onPress={handleSeen}
          styles={styles}
        >
          <SeenMark
            color={watchedEntry ? colors.success : "#FFFFFF"}
            filled={!!watchedEntry}
          />
        </RailButton>
        <RailButton label="Details" onPress={openDetails} styles={styles}>
          <InfoMark color="#FFFFFF" />
        </RailButton>
        <RailButton
          label="Share"
          onPress={() =>
            Share.share({
              message: `${movie.title} (${movie.year}) — IMDb ${movie.rating.toFixed(1)}. Found it on Reelboard. https://youtu.be/${clip.youtubeId}`,
            })
          }
          styles={styles}
        >
          <ShareMark color="#FFFFFF" />
        </RailButton>
        <RailButton label="Not for me" onPress={onNotForMe} styles={styles}>
          <NotForMeMark color="#FFFFFF" />
        </RailButton>
      </View>
    </View>
  );
};

// ---------- the feed ----------

// Reels: full-screen vertical clips (official trailers via YouTube), one
// at a time, swipe up for the next. Only the visible reel plays; the rest
// show the trailer's thumbnail. The movie's name, rating and your tier /
// taste match are always on screen — no digging through comments.
//
// bottomInset: space to keep clear at the bottom (the floating tab bar).
// active: false pauses everything (e.g. the screen isn't in front).
// initialMovieId: start the feed on this movie's reel.
export const ReelsFeed = ({
  navigation,
  bottomInset = 0,
  active = true,
  initialMovieId = null,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const [height, setHeight] = useState(0);
  // Built once when the feed opens, so saving / marking seen doesn't
  // reshuffle it under your thumb.
  const [feed, setFeed] = useState(() => {
    const built = buildFeed(
      useMovieStore.getState().watched,
      useMovieStore.getState().bucketList,
    );
    // Opened from a reel tile: start on that movie.
    const startIndex = built.findIndex(
      (item) => item.movie.id === initialMovieId,
    );
    return startIndex > 0
      ? [built[startIndex], ...built.filter((_, index) => index !== startIndex)]
      : built;
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const listRef = useRef(null);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const first = viewableItems.find((entry) => entry.isViewable);
    if (first?.index != null) setActiveIndex(first.index);
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;

  const handleNotForMe = useCallback((movieId) => {
    showToast("Got it — fewer like that", { tone: "success" });
    setFeed((current) => current.filter((item) => item.movie.id !== movieId));
  }, []);

  return (
    <View
      style={styles.container}
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
    >
      {height > 0 && (
        <FlatList
          ref={listRef}
          data={feed}
          keyExtractor={(item) => item.movie.id}
          renderItem={({ item, index }) => (
            <Reel
              item={item}
              height={height}
              isActive={active && index === activeIndex}
              muted={muted}
              onToggleMute={() => setMuted((value) => !value)}
              onNotForMe={() => handleNotForMe(item.movie.id)}
              navigation={navigation}
              bottomInset={bottomInset}
              styles={styles}
              colors={colors}
            />
          )}
          pagingEnabled
          snapToInterval={height}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          getItemLayout={(_, index) => ({
            length: height,
            offset: height * index,
            index,
          })}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          removeClippedSubviews
          ListEmptyComponent={
            <View style={[styles.empty, { height, width }]}>
              <Text style={styles.emptyText}>
                You&apos;ve been through every reel. More coming soon.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#000000",
    },
    dim: {
      backgroundColor: "rgba(0, 0, 0, 0.55)",
    },
    videoBox: {
      position: "absolute",
      left: 0,
      right: 0,
      top: "30%",
      backgroundColor: "#000000",
      overflow: "hidden",
    },
    unavailable: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
    },
    hidden: {
      display: "none",
    },
    youtubeButton: {
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.selected,
    },
    youtubeButtonText: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.selectedText,
    },
    unavailableText: {
      ...typography.bodyBold,
      color: colors.textSecondary,
    },
    soundPill: {
      position: "absolute",
      right: spacing.sm,
      top: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    soundText: {
      ...typography.caption,
      fontSize: 11,
      color: "#FFFFFF",
    },
    bottomFade: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "45%",
    },
    info: {
      position: "absolute",
      left: spacing.md,
      right: 84,
    },
    reason: {
      ...typography.caption,
      color: colors.accentLight,
      marginBottom: spacing.xs,
    },
    title: {
      ...typography.hero,
      fontSize: 26,
      lineHeight: 31,
      color: "#FFFFFF",
    },
    meta: {
      ...typography.caption,
      color: "rgba(255, 255, 255, 0.8)",
      marginTop: 4,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs + 2,
      marginTop: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: "rgba(255, 255, 255, 0.16)",
    },
    chipMatch: {
      backgroundColor: colors.accent,
    },
    chipText: {
      ...typography.caption,
      fontSize: 12,
      color: "#FFFFFF",
    },
    chipStrong: {
      ...typography.bodyBold,
      fontSize: 12,
      color: "#FFFFFF",
    },
    chipTierText: {
      color: "#16152A",
    },
    rail: {
      position: "absolute",
      right: spacing.sm,
      alignItems: "center",
      gap: spacing.md,
      width: 68,
    },
    railButton: {
      alignItems: "center",
      gap: 3,
    },
    railLabel: {
      ...typography.caption,
      fontSize: 11,
      color: "#FFFFFF",
      textAlign: "center",
    },
    pressed: {
      opacity: 0.6,
    },
    empty: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
    },
    emptyText: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
    },
  });

export default ReelsFeed;
