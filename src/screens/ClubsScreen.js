import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { BoardCover } from "../components/BoardCover";
import {
  StackHeader,
  useStackHeaderScroll,
} from "../components/ScreenHeader";
import { getMovieById, useMoviesVersion } from "../data/movies";
import { CLUB_NAME_MAX, useClubActions, useClubs } from "../store/clubsStore";
import { showToast } from "../store/toastStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { useRefetchOnFocus } from "../utils/useRefetchOnFocus";
import { t } from "../i18n";

const COVER_SIZE = 56;

// Clubs: the groups you're in, starting a new one, and joining one with an
// invite code. Tap a club for its board, now watching, tier list and feed.
export const ClubsScreen = ({ navigation }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { clubs, isLoading, error, refetch } = useClubs();
  const { createClub, joinClub, busy } = useClubActions();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  useRefetchOnFocus(refetch);

  const openClub = (club) =>
    navigation.navigate("ClubDetails", { clubId: club.id });

  const create = async () => {
    if (!name.trim() || busy) return;
    try {
      const club = await createClub({ name: name.trim() });
      setName("");
      openClub(club);
    } catch (err) {
      showToast(err.message);
    }
  };

  const join = async () => {
    if (!code.trim() || busy) return;
    try {
      const club = await joinClub(code.trim());
      setCode("");
      showToast(t("Welcome to {name}", { name: club.name }), {
        tone: "success",
      });
      openClub(club);
    } catch (err) {
      showToast(err.message);
    }
  };

  return (
    <View style={styles.container}>
      <StackHeader
        title={t("Clubs")}
        onBack={() => navigation.goBack()}
        scrollY={headerScroll.scrollY}
      />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Text style={styles.introText}>
            {t(
              "Watch together: a shared board, one movie everyone watches next, and the club's own tier list.",
            )}
          </Text>
        </View>

        <Text style={styles.tagText}>{t("Start a club")}</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t("Club name, e.g. Horror Nights")}
            placeholderTextColor={colors.textMuted}
            maxLength={CLUB_NAME_MAX}
            returnKeyType="done"
            onSubmitEditing={create}
            editable={!busy}
            style={styles.input}
          />
          <Pressable onPress={create} disabled={busy} style={styles.action}>
            <Text style={styles.actionText}>{t("Create")}</Text>
          </Pressable>
        </View>

        <Text style={styles.tagText}>{t("Join with a code")}</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={code}
            onChangeText={(value) => setCode(value.toUpperCase())}
            placeholder={t("Invite code")}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
            returnKeyType="go"
            onSubmitEditing={join}
            editable={!busy}
            style={styles.input}
          />
          <Pressable onPress={join} disabled={busy} style={styles.action}>
            <Text style={styles.actionText}>{t("Join")}</Text>
          </Pressable>
        </View>

        <Text style={styles.tagText}>
          {t("Your clubs ·")} {clubs.length}
        </Text>
        {clubs.map((club) => {
          const movies = club.movieIds.map(getMovieById).filter(Boolean);
          const nowWatching = club.nowWatching
            ? getMovieById(club.nowWatching)
            : null;
          return (
            <Pressable
              key={club.id}
              style={({ pressed }) => [styles.clubRow, pressed && styles.pressed]}
              onPress={() => openClub(club)}
            >
              <BoardCover movies={movies} size={COVER_SIZE} />
              <View style={styles.clubText}>
                <Text style={styles.clubName} numberOfLines={1}>
                  {club.name}
                </Text>
                <Text style={styles.clubMeta} numberOfLines={1}>
                  {t("{members} members · {movies} movies", {
                    members: club.memberCount,
                    movies: movies.length,
                  })}
                </Text>
                {nowWatching && (
                  <Text style={styles.clubNow} numberOfLines={1}>
                    {t("Now watching: {title}", { title: nowWatching.title })}
                  </Text>
                )}
              </View>
              {club.role === "owner" && (
                <Text style={styles.ownerTag}>{t("Owner")}</Text>
              )}
            </Pressable>
          );
        })}

        {!isLoading && !error && clubs.length === 0 && (
          <Text style={styles.footnote}>
            {t("No clubs yet — start one, or ask a friend for their code.")}
          </Text>
        )}
        {isLoading && <Text style={styles.footnote}>{t("Loading…")}</Text>}
        {!!error && (
          <Text style={styles.footnote}>
            {t("Couldn't load clubs: {error}", { error: error.message })}
          </Text>
        )}
      </Animated.ScrollView>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    pressed: {
      opacity: 0.8,
    },
    intro: {
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      marginHorizontal: spacing.md,
    },
    introText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    // Section caption, like Settings.
    tagText: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    // A filled box edge to edge, with the action as plain text inside it
    // (like Friends' "Add").
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      minHeight: 48,
      backgroundColor: colors.card,
      borderRadius: shape.control,
      marginHorizontal: spacing.md,
    },
    input: {
      ...typography.body,
      flex: 1,
      paddingVertical: spacing.sm,
      color: colors.textPrimary,
    },
    action: {
      paddingStart: spacing.md,
      paddingVertical: spacing.sm,
    },
    actionText: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    clubRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      marginBottom: 2,
      backgroundColor: colors.card,
      borderRadius: shape.card,
      marginHorizontal: spacing.md,
    },
    clubText: {
      flex: 1,
      gap: 2,
    },
    clubName: {
      ...typography.subtitle,
      color: colors.textPrimary,
    },
    clubMeta: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    clubNow: {
      ...typography.caption,
      color: colors.textPrimary,
    },
    ownerTag: {
      ...typography.caption,
      color: colors.textMuted,
    },
    footnote: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.lg,
      paddingHorizontal: spacing.md,
    },
  });

export default ClubsScreen;
