import * as Haptics from "expo-haptics";
import { Check, Plus, Smartphone, Ticket, UsersRound } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { BottomSheet } from "../components/BottomSheet";
import { FriendAvatar } from "../components/FriendAvatar";
import { MoviePoster } from "../components/MoviePoster";
import { PrimaryButton } from "../components/PrimaryButton";
import { HeaderIconButton, StackHeader, useStackHeaderScroll } from "../components/ScreenHeader";
import { useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import { useBoardStore } from "../store/boardStore";
import { useFriends } from "../store/friendsStore";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { showToast } from "../store/toastStore";
import { shape, spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
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

const FACE = 56;

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

// One of tonight's settings: its name, then its choices in a row you scroll.
const Setting = ({ label, children, styles }) => (
  <View style={styles.setting}>
    <Text style={styles.settingLabel}>{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {children}
    </ScrollView>
  </View>
);

// Someone who might watch: their face (a ✓ in the signature colour when
// they're in) and their first name. `face`: what goes in the circle.
const Face = ({ face, name, on, onPress, styles, colors, accessibilityLabel }) => (
  <Pressable
    style={({ pressed }) => [styles.face, pressed && styles.pressed]}
    onPress={onPress}
    disabled={!onPress}
    accessibilityRole={onPress ? "checkbox" : undefined}
    accessibilityState={onPress ? { checked: on } : undefined}
    accessibilityLabel={accessibilityLabel ?? name}
  >
    <View style={[styles.faceRing, on && styles.faceRingOn]}>{face}</View>
    {on && (
      <View style={styles.faceCheck}>
        <Check size={12} color={colors.brandText} strokeWidth={3} />
      </View>
    )}
    <Text style={[styles.faceName, !on && styles.faceNameOff]} numberOfLines={1}>
      {name}
    </Text>
  </Pressable>
);

const Initial = ({ name, styles }) => (
  <View style={styles.initial}>
    <Text style={styles.initialText}>{name.trim().charAt(0).toUpperCase()}</Text>
  </View>
);

// Watch together: deciding for a group, with what ReelBoard knows about
// everyone's taste (utils/groupPick), in three steps on one page:
//   who's watching   faces — you, your friends (tap to bring them in; their
//                    tiers count) and guests (a name, for anyone not on
//                    ReelBoard)
//   where            two cards: one phone passed round (2–6), or everyone's
//                    own (Group night, with a code)
//   tonight          a mood, how long you've got and what to pick from, in
//                    one card
// Then Swipe together — a shortlist sized for the group — or, under it,
// "just pick one for us": the group's best fit, with how well it suits each
// of you. Joining someone else's night is the ticket in the header (their
// code). Opened with { boardId } to pick from one of your lists.
export const WatchTogetherScreen = ({ navigation, route }) => {
  useMoviesVersion();
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const myName = useProfileStore((state) => state.displayName);
  const myAvatar = useProfileStore((state) => state.avatarUri);
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
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isAddingGuest, setIsAddingGuest] = useState(false);
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
    setIsAddingGuest(false);
  };
  const join = () => {
    if (code.length !== CODE_LENGTH) return;
    setIsJoinOpen(false);
    navigation.navigate("GroupNight", { code });
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

  const whereOptions = [
    {
      key: "phone",
      Icon: Smartphone,
      title: t("Same phone"),
      hint: t("Pass the phone round — up to {count} people.", { count: MAX_SAME_PHONE }),
    },
    {
      key: "online",
      Icon: UsersRound,
      title: t("Everyone's phone"),
      hint: t("Everyone swipes on their own phone, with a code to join — up to {count}.", { count: MAX_ONLINE }),
    },
  ];

  return (
    <View style={styles.container}>
      <StackHeader
        title={t("Watch together")}
        onBack={() => navigation.goBack()}
        scrollY={headerScroll.scrollY}
        right={
          <HeaderIconButton onPress={() => setIsJoinOpen(true)} accessibilityLabel={t("Got a code?")}>
            <Ticket size={20} color={colors.textPrimary} strokeWidth={2} />
          </HeaderIconButton>
        }
      />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Who's watching: faces — tap to bring someone in. */}
        <View style={styles.headingRow}>
          <Text style={styles.heading}>{t("Who's watching")}</Text>
          <Text style={styles.count}>{t("{count} watching", { count: people })}</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.facesRow}
          contentContainerStyle={styles.faces}
        >
          <Face
            face={myAvatar ? <Image source={{ uri: myAvatar }} style={styles.faceImage} /> : <Initial name={me} styles={styles} />}
            name={t("You")}
            on
            styles={styles}
            colors={colors}
          />
          {friends.map((friend) => (
            <Face
              key={friend.id}
              face={<FriendAvatar friend={friend} size={FACE} style={styles.noBorder} />}
              name={friend.name.split(" ")[0]}
              on={friendIds.includes(friend.id)}
              onPress={() => toggleFriend(friend.id)}
              styles={styles}
              colors={colors}
            />
          ))}
          {guests.map((guest, index) => (
            <Face
              key={`${guest}-${index}`}
              face={<Initial name={guest} styles={styles} />}
              name={guest}
              on
              onPress={() => setGuests((current) => current.filter((_, i) => i !== index))}
              accessibilityLabel={t("Remove {name}", { name: guest })}
              styles={styles}
              colors={colors}
            />
          ))}
          {!isFull && (
            <Pressable
              style={({ pressed }) => [styles.face, pressed && styles.pressed]}
              onPress={() => setIsAddingGuest(true)}
              accessibilityRole="button"
              accessibilityLabel={t("Add someone not on ReelBoard")}
            >
              <View style={[styles.faceRing, styles.addRing]}>
                <Plus size={24} color={colors.textSecondary} strokeWidth={2} />
              </View>
              <Text style={[styles.faceName, styles.faceNameOff]} numberOfLines={1}>
                {t("Guest")}
              </Text>
            </Pressable>
          )}
        </ScrollView>
        {isAddingGuest && (
          <View style={styles.guestRow}>
            <TextInput
              value={guestDraft}
              onChangeText={setGuestDraft}
              onSubmitEditing={addGuest}
              placeholder={t("Add someone not on ReelBoard")}
              placeholderTextColor={colors.textMuted}
              maxLength={GUEST_NAME_MAX}
              returnKeyType="done"
              autoFocus
              style={styles.guestInput}
            />
            <Pressable
              style={[styles.guestAdd, !guestDraft.trim() && styles.disabled]}
              onPress={addGuest}
              disabled={!guestDraft.trim()}
              accessibilityLabel={t("Add")}
            >
              <Plus size={18} color={colors.brandText} strokeWidth={2.4} />
            </Pressable>
          </View>
        )}
        <Text style={styles.hint}>
          {friends.length > 0
            ? t("Friends' tiers count — the more they've tiered, the better the pick.")
            : t("Add friends on ReelBoard and their taste counts too.")}
        </Text>

        {/* Where: one phone, or everyone's. */}
        <Text style={[styles.heading, styles.gap]}>{t("Where")}</Text>
        <View style={styles.whereRow}>
          {whereOptions.map(({ key, Icon, title, hint }) => {
            const on = where === key;
            return (
              <Pressable
                key={key}
                style={({ pressed }) => [styles.where, on && styles.whereOn, pressed && styles.pressed]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setWhere(key);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <View style={styles.whereTop}>
                  <Icon size={22} color={on ? colors.brand : colors.textSecondary} strokeWidth={2} />
                  {on && (
                    <View style={styles.whereCheck}>
                      <Check size={12} color={colors.brandText} strokeWidth={3} />
                    </View>
                  )}
                </View>
                <Text style={styles.whereTitle}>{title}</Text>
                <Text style={styles.whereHint} numberOfLines={3}>
                  {hint}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Tonight: mood, how long, what to pick from — one card. */}
        <Text style={[styles.heading, styles.gap]}>{t("Tonight")}</Text>
        <View style={styles.tonight}>
          <Setting label={t("Mood")} styles={styles}>
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
          </Setting>
          <Setting label={t("How long")} styles={styles}>
            {timeOptions.map((option) => (
              <Chip key={option.key} label={option.label} selected={time === option.key} onPress={() => setTime(option.key)} styles={styles} />
            ))}
          </Setting>
          <Setting label={t("Pick from")} styles={styles}>
            {angles.map((option) => (
              <Chip key={option.key} label={t(option.label)} selected={angle === option.key} onPress={() => setAngle(option.key)} styles={styles} />
            ))}
          </Setting>
          <Text style={[styles.hint, styles.tonightHint]}>
            {t(angles.find((option) => option.key === angle)?.hint ?? "")}
          </Text>
        </View>
      </Animated.ScrollView>

      {/* One main button; picking for you is the quieter way. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <PrimaryButton label={t("Swipe together")} onPress={swipeShortlist} />
        <Text style={styles.footnote}>
          {t("A short stack, sized for {count} — about three minutes.", { count: people })}
        </Text>
        <Pressable onPress={pickOne} hitSlop={8} accessibilityRole="button" style={styles.pickLink}>
          <Text style={styles.pickLinkText}>{t("Or just pick one for us")}</Text>
        </Pressable>
      </View>

      {/* Joining someone else's night: their code. */}
      <BottomSheet
        visible={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        size="auto"
        title={t("Got a code?")}
        subtitle={t("Join a friend's night on your phone")}
        footer={<PrimaryButton label={t("Join")} onPress={join} disabled={code.length !== CODE_LENGTH} />}
      >
        <TextInput
          value={code}
          onChangeText={(text) => setCode(text.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, CODE_LENGTH))}
          onSubmitEditing={join}
          placeholder="ABC123"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          returnKeyType="go"
          style={styles.codeInput}
        />
      </BottomSheet>

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
    },
    pressed: {
      opacity: 0.75,
    },
    headingRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    // A step's name, as Home's headings.
    heading: {
      fontFamily: fonts.extraBold,
      fontSize: 21,
      lineHeight: 27,
      letterSpacing: -0.3,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    gap: {
      marginTop: spacing.section,
    },
    count: {
      ...typography.bodyBold,
      fontSize: 13,
      color: colors.brand,
    },
    hint: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.sm,
    },
    disabled: {
      opacity: 0.4,
    },
    // Faces, in a row you scroll: the row runs to the screen's edges, its
    // faces starting at the page's margin.
    facesRow: {
      marginHorizontal: -spacing.md,
      flexGrow: 0,
    },
    faces: {
      gap: spacing.md,
      paddingHorizontal: spacing.md,
    },
    face: {
      width: FACE + 8,
      alignItems: "center",
    },
    faceRing: {
      width: FACE + 6,
      height: FACE + 6,
      borderRadius: (FACE + 6) / 2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "transparent",
      opacity: 0.55,
    },
    faceRingOn: {
      borderColor: colors.brand,
      opacity: 1,
    },
    addRing: {
      opacity: 1,
      borderColor: colors.border,
      borderStyle: "dashed",
    },
    // The avatar's own border off — the face's ring is the only one.
    noBorder: {
      borderWidth: 0,
    },
    faceImage: {
      width: FACE,
      height: FACE,
      borderRadius: FACE / 2,
    },
    faceCheck: {
      position: "absolute",
      top: FACE - 14,
      end: 2,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brand,
      borderWidth: 2,
      borderColor: colors.background,
    },
    faceName: {
      ...typography.caption,
      fontFamily: fonts.semiBold,
      color: colors.textPrimary,
      marginTop: spacing.xs + 2,
    },
    faceNameOff: {
      color: colors.textMuted,
    },
    initial: {
      width: FACE,
      height: FACE,
      borderRadius: FACE / 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.buttonFill,
    },
    initialText: {
      fontFamily: fonts.bold,
      fontSize: 20,
      color: colors.textPrimary,
    },
    guestRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    guestInput: {
      ...typography.body,
      flex: 1,
      minHeight: 44,
      paddingHorizontal: spacing.md,
      color: colors.textPrimary,
      backgroundColor: colors.card,
      borderRadius: shape.control,
    },
    guestAdd: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brand,
      borderRadius: shape.control,
    },
    // Where: two cards side by side, the chosen one ringed in red.
    whereRow: {
      flexDirection: "row",
      gap: spacing.rail,
    },
    where: {
      flex: 1,
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    whereOn: {
      borderColor: colors.brand,
    },
    whereTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.sm,
    },
    whereCheck: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brand,
    },
    whereTitle: {
      ...typography.bodyBold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    whereHint: {
      ...typography.caption,
      lineHeight: 16,
      color: colors.textSecondary,
      marginTop: 2,
    },
    // Tonight: one card, a row of choices per setting.
    tonight: {
      paddingVertical: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      gap: spacing.md,
    },
    setting: {
      gap: spacing.sm,
    },
    settingLabel: {
      ...typography.caption,
      fontFamily: fonts.semiBold,
      color: colors.textSecondary,
      paddingHorizontal: spacing.md,
    },
    tonightHint: {
      paddingHorizontal: spacing.md,
      marginTop: 0,
    },
    chips: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    chip: {
      paddingVertical: 7,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.buttonFill,
      borderRadius: shape.chip,
    },
    chipOn: {
      backgroundColor: colors.brand,
    },
    chipText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textPrimary,
    },
    chipTextOn: {
      color: colors.brandText,
    },
    footer: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      gap: spacing.sm,
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    footnote: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
    },
    pickLink: {
      alignSelf: "center",
      paddingVertical: spacing.xs,
    },
    pickLinkText: {
      ...typography.bodyBold,
      fontSize: 14,
      color: colors.brand,
    },
    codeInput: {
      fontFamily: fonts.bold,
      fontSize: 28,
      letterSpacing: 6,
      textAlign: "center",
      color: colors.textPrimary,
      paddingVertical: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.control,
    },
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
