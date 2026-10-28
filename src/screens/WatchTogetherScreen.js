import * as Haptics from "expo-haptics";
import { Plus, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { BottomSheet } from "../components/BottomSheet";
import { FriendAvatar } from "../components/FriendAvatar";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { StackHeader, useStackHeaderScroll } from "../components/ScreenHeader";
import { useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import { useBoardStore } from "../store/boardStore";
import { useFriends } from "../store/friendsStore";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { showToast } from "../store/toastStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { GROUP_ANGLES, buildGroup, getTimeOptions, rankForGroup, shortlistSize } from "../utils/groupPick";
import { MOODS } from "../utils/moods";
import { formatRuntime } from "../utils/movieFilters";
import { shuffle } from "../utils/shuffle";

// Most people a night holds: on one phone, and on everyone's (Group night).
const MAX_SAME_PHONE = 6;
const MAX_ONLINE = 8;
const GUEST_NAME_MAX = 20;
// A group night's code (GroupNightScreen's).
const CODE_LENGTH = 6;

// A choice in a row of choices.
const Chip = ({ label, selected, onPress, styles }) => (
  <Pressable
    style={[styles.chip, selected && styles.chipOn]}
    onPress={onPress}
    accessibilityRole="radio"
    accessibilityState={{ selected }}
  >
    <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
  </Pressable>
);

const Section = ({ label, children, styles }) => (
  <View style={styles.section}>
    <Text style={styles.label}>{label}</Text>
    {children}
  </View>
);

// Watch together: deciding for a group, with what ReelBoard knows about
// everyone's taste (utils/groupPick). Joining a friend's night — their code
// — is the card at the top; everything under it starts one.
//   who      you, the friends who are here (their tiers count), and guests
//   where    one phone passed round (2–6), or everyone's own (Group night)
//   tonight  a mood, how long you've got, and an angle
// Then "Just pick one" — the group's best fit, with how well it suits each
// of you — or "Swipe a shortlist", sized for the group, not a number to
// choose. Opened with { boardId } to pick from one of your lists.
export const WatchTogetherScreen = ({ navigation, route }) => {
  useMoviesVersion();
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const myName = useProfileStore((state) => state.displayName);
  const watched = useMovieStore((state) => state.watched);
  const bucketList = useMovieStore((state) => state.bucketList);
  const setPickedMovie = useMovieStore((state) => state.setPickedMovie);
  const { friends } = useFriends();
  const board = useBoardStore((state) => state.boards.find((item) => item.id === route?.params?.boardId));

  const [friendIds, setFriendIds] = useState([]);
  const [guests, setGuests] = useState([]);
  const [guestDraft, setGuestDraft] = useState("");
  const [where, setWhere] = useState("phone");
  const [mood, setMood] = useState(null);
  const [time, setTime] = useState("any");
  const [angle, setAngle] = useState(board ? "list" : "blend");
  const [pick, setPick] = useState(null);
  const [code, setCode] = useState("");
  const timeOptions = useMemo(() => getTimeOptions(), []);

  const angles = board ? [{ key: "list", label: board.name, hint: "One of your lists" }, ...GROUP_ANGLES] : GROUP_ANGLES;
  const people = 1 + friendIds.length + guests.length;
  const limit = where === "phone" ? MAX_SAME_PHONE : MAX_ONLINE;
  const isFull = people >= limit;
  const me = myName && myName !== "You" ? myName : t("You");

  const toggleFriend = (id) => {
    Haptics.selectionAsync();
    setFriendIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : isFull ? current : [...current, id],
    );
  };
  const addGuest = () => {
    const name = guestDraft.trim().slice(0, GUEST_NAME_MAX);
    if (!name || isFull) return;
    setGuests((current) => [...current, name]);
    setGuestDraft("");
  };

  // Everyone, scored, for the night as set.
  const rank = () =>
    rankForGroup({
      members: buildGroup({
        name: me,
        watched,
        friends: friends.filter((friend) => friendIds.includes(friend.id)),
        guests,
      }),
      mood,
      maxRuntime: timeOptions.find((option) => option.key === time)?.maxRuntime ?? null,
      angle,
      watchlistIds: bucketList.map((entry) => entry.movieId),
      listMovieIds: board?.movieIds ?? null,
    });

  const nothing = () => showToast(t("Nothing fits all of that — try a looser time, mood or angle."));

  const pickOne = () => {
    const ranked = rank();
    if (ranked.length === 0) return nothing();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPick({ ranked, at: 0 });
  };

  const swipeShortlist = () => {
    const ranked = rank();
    const shortlist = ranked.slice(0, shortlistSize(people));
    if (shortlist.length < 2) return nothing();
    const movieIds = shuffle(shortlist.map((item) => item.movie.id));
    if (where === "online") {
      navigation.navigate("GroupNight", { movieIds });
      return;
    }
    if (people < 2) {
      showToast(t("Add who's watching with you first."));
      return;
    }
    navigation.navigate("MovieNight", {
      movieIds,
      players: [me, ...friends.filter((friend) => friendIds.includes(friend.id)).map((friend) => friend.name), ...guests],
      fits: Object.fromEntries(shortlist.map((item) => [item.movie.id, item.fit])),
    });
  };

  const current = pick?.ranked[pick.at] ?? null;

  return (
    <View style={styles.container}>
      <StackHeader title={t("Watch together")} onBack={() => navigation.goBack()} scrollY={headerScroll.scrollY} />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Someone else is hosting: join with their code. */}
        <View style={styles.join}>
          <View style={styles.joinText}>
            <Text style={styles.joinTitle}>{t("Got a code?")}</Text>
            <Text style={styles.hint}>{t("Join a friend's night on your phone")}</Text>
          </View>
          <TextInput
            value={code}
            onChangeText={(text) => setCode(text.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, CODE_LENGTH))}
            onSubmitEditing={() => code.length === CODE_LENGTH && navigation.navigate("GroupNight", { code })}
            placeholder="ABC123"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="go"
            style={styles.codeInput}
          />
          <Pressable
            style={[styles.joinButton, code.length !== CODE_LENGTH && styles.disabled]}
            onPress={() => navigation.navigate("GroupNight", { code })}
            disabled={code.length !== CODE_LENGTH}
            accessibilityRole="button"
          >
            <Text style={styles.joinButtonText}>{t("Join")}</Text>
          </Pressable>
        </View>

        <Section label={t("Or start one — who's watching")} styles={styles}>
          <View style={styles.people}>
            <View style={[styles.person, styles.personOn]}>
              <Text style={[styles.personText, styles.personTextOn]}>{me}</Text>
            </View>
            {friends.map((friend) => {
              const on = friendIds.includes(friend.id);
              return (
                <Pressable
                  key={friend.id}
                  style={[styles.person, on && styles.personOn]}
                  onPress={() => toggleFriend(friend.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                >
                  <FriendAvatar friend={friend} size={22} />
                  <Text style={[styles.personText, on && styles.personTextOn]} numberOfLines={1}>
                    {friend.name.split(" ")[0]}
                  </Text>
                </Pressable>
              );
            })}
            {guests.map((guest, index) => (
              <Pressable
                key={`${guest}-${index}`}
                style={[styles.person, styles.personOn]}
                onPress={() => setGuests((current) => current.filter((_, i) => i !== index))}
                accessibilityLabel={t("Remove {name}", { name: guest })}
              >
                <Text style={[styles.personText, styles.personTextOn]}>{guest}</Text>
                <X size={14} color={colors.segmentOnText} strokeWidth={2.2} />
              </Pressable>
            ))}
          </View>
          <View style={styles.guestRow}>
            <TextInput
              value={guestDraft}
              onChangeText={setGuestDraft}
              onSubmitEditing={addGuest}
              placeholder={t("Add someone not on ReelBoard")}
              placeholderTextColor={colors.textMuted}
              maxLength={GUEST_NAME_MAX}
              returnKeyType="done"
              editable={!isFull}
              style={styles.guestInput}
            />
            <Pressable
              style={[styles.guestAdd, (!guestDraft.trim() || isFull) && styles.disabled]}
              onPress={addGuest}
              disabled={!guestDraft.trim() || isFull}
              accessibilityLabel={t("Add")}
            >
              <Plus size={18} color={colors.textPrimary} strokeWidth={2.2} />
            </Pressable>
          </View>
          <Text style={styles.hint}>
            {friends.length > 0
              ? t("Friends' tiers count — the more they've tiered, the better the pick.")
              : t("Add friends on ReelBoard and their taste counts too.")}
          </Text>
        </Section>

        <Section label={t("Where")} styles={styles}>
          <View style={styles.chips}>
            <Chip label={t("Same phone")} selected={where === "phone"} onPress={() => setWhere("phone")} styles={styles} />
            <Chip label={t("Everyone's phone")} selected={where === "online"} onPress={() => setWhere("online")} styles={styles} />
          </View>
          <Text style={styles.hint}>
            {where === "phone"
              ? t("Pass the phone round — up to {count} people.", { count: MAX_SAME_PHONE })
              : t("Everyone swipes on their own phone, with a code to join — up to {count}.", { count: MAX_ONLINE })}
          </Text>
        </Section>

        <Section label={t("Mood")} styles={styles}>
          <View style={styles.chips}>
            <Chip label={t("Any")} selected={!mood} onPress={() => setMood(null)} styles={styles} />
            {MOODS.map((item) => (
              <Chip
                key={item.key}
                label={`${item.emoji} ${t(item.label)}`}
                selected={mood === item.key}
                onPress={() => setMood(item.key)}
                styles={styles}
              />
            ))}
          </View>
        </Section>

        <Section label={t("How long")} styles={styles}>
          <View style={styles.chips}>
            {timeOptions.map((option) => (
              <Chip key={option.key} label={option.label} selected={time === option.key} onPress={() => setTime(option.key)} styles={styles} />
            ))}
          </View>
        </Section>

        <Section label={t("Pick from")} styles={styles}>
          <View style={styles.chips}>
            {angles.map((option) => (
              <Chip key={option.key} label={t(option.label)} selected={angle === option.key} onPress={() => setAngle(option.key)} styles={styles} />
            ))}
          </View>
          <Text style={styles.hint}>{t(angles.find((option) => option.key === angle)?.hint ?? "")}</Text>
        </Section>
      </Animated.ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <PrimaryButton label={t("Just pick one")} onPress={pickOne} />
        <PrimaryButton
          label={t("Swipe a shortlist")}
          variant="secondary"
          onPress={swipeShortlist}
        />
        <Text style={styles.footnote}>
          {t("A short stack, sized for {count} — about three minutes.", { count: people })}
        </Text>
      </View>

      {/* The group's pick: how well it suits each of you, and the next. */}
      <BottomSheet
        visible={!!current}
        onClose={() => setPick(null)}
        size="auto"
        title={t("For all of you")}
        footer={
          <View style={styles.sheetButtons}>
            <PrimaryButton
              label={t("Pick for tonight")}
              onPress={() => {
                setPickedMovie(current.movie.id);
                showToast(t("{title} is tonight's pick", { title: current.movie.title }), { tone: "success" });
                setPick(null);
              }}
            />
            <PrimaryButton
              label={pick && pick.at < pick.ranked.length - 1 ? t("Not this — next") : t("Start over")}
              variant="secondary"
              onPress={() =>
                setPick((state) => ({ ...state, at: state.at < state.ranked.length - 1 ? state.at + 1 : 0 }))
              }
            />
          </View>
        }
      >
        {current && (
          <View style={styles.pick}>
            <Pressable onPress={() => navigation.navigate("MovieDetails", { movieId: current.movie.id })}>
              <MoviePoster uri={current.movie.poster} style={styles.pickPoster} />
            </Pressable>
            <View style={styles.pickText}>
              <Text style={styles.pickTitle} numberOfLines={2}>
                {current.movie.title}
              </Text>
              <Text style={styles.pickMeta}>
                {[current.movie.year, current.movie.runtime ? formatRuntime(current.movie.runtime) : null].filter(Boolean).join(" · ")}
              </Text>
              <Text style={styles.pickReason}>{current.reason}</Text>
              <View style={styles.matches}>
                {current.matches
                  .filter((item) => item.match != null)
                  .map((item) => (
                    <View key={item.key} style={styles.matchChip}>
                      <Text style={styles.matchText}>
                        {item.key === "me" ? t("You") : item.name.split(" ")[0]} {item.match}%
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          </View>
        )}
      </BottomSheet>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.lg,
    },
    section: {
      gap: spacing.sm,
    },
    label: {
      ...typography.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 1.2,
      color: colors.textSecondary,
    },
    hint: {
      ...typography.caption,
      color: colors.textMuted,
    },
    // Joining someone's night: a card above the rest.
    join: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.sm + 4,
      backgroundColor: colors.card,
      borderRadius: shape.card,
    },
    joinText: {
      flex: 1,
      gap: 2,
    },
    joinTitle: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    codeInput: {
      ...typography.bodyBold,
      width: 96,
      textAlign: "center",
      letterSpacing: 2,
      color: colors.textPrimary,
      backgroundColor: colors.background,
      borderRadius: shape.control,
      paddingVertical: spacing.sm,
    },
    joinButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.textPrimary,
      borderRadius: shape.control,
    },
    joinButtonText: {
      ...typography.bodyBold,
      color: colors.background,
    },
    // People: you (always in), friends to tap in, guests.
    people: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    person: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      maxWidth: 160,
      paddingStart: 6,
      paddingEnd: spacing.sm + 4,
      paddingVertical: 5,
      backgroundColor: colors.card,
      borderRadius: shape.chip,
      borderWidth: 1,
      borderColor: colors.border,
    },
    personOn: {
      backgroundColor: colors.segmentOn,
      borderColor: colors.segmentOn,
    },
    personText: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 18,
      color: colors.textPrimary,
      flexShrink: 1,
      paddingStart: 4,
    },
    personTextOn: {
      color: colors.segmentOnText,
    },
    guestRow: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    guestInput: {
      ...typography.body,
      flex: 1,
      color: colors.textPrimary,
      backgroundColor: colors.card,
      borderRadius: shape.control,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    guestAdd: {
      width: 44,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.card,
      borderRadius: shape.control,
    },
    disabled: {
      opacity: 0.4,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.md - 2,
      paddingVertical: 7,
      backgroundColor: colors.card,
      borderRadius: shape.tab,
    },
    chipOn: {
      backgroundColor: colors.segmentOn,
    },
    chipText: {
      ...typography.bodyBold,
      fontSize: 14,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    chipTextOn: {
      color: colors.segmentOnText,
    },
    footer: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      backgroundColor: colors.background,
    },
    footnote: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
    },
    // The pick, in its sheet.
    pick: {
      flexDirection: "row",
      gap: spacing.md,
      paddingBottom: spacing.md,
    },
    pickPoster: {
      width: 96,
      height: 144,
    },
    pickText: {
      flex: 1,
      gap: 4,
    },
    pickTitle: {
      ...typography.bodyBold,
      fontSize: 18,
      lineHeight: 24,
      color: colors.textPrimary,
    },
    pickMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    pickReason: {
      ...typography.body,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    matches: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: spacing.xs,
    },
    matchChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      backgroundColor: colors.successSoft,
      borderRadius: shape.chip,
    },
    matchText: {
      ...typography.bodyBold,
      fontSize: 12,
      lineHeight: 16,
      color: colors.success,
    },
    sheetButtons: {
      gap: spacing.sm,
    },
  });

export default WatchTogetherScreen;
