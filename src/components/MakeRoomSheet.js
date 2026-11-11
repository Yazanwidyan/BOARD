import * as Haptics from "expo-haptics";
import { StyleSheet, View } from "react-native";

import { getMovieById, useMoviesVersion } from "../data/movies";
import { t } from "../i18n";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { showToast } from "../store/toastStore";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { getTen, makeRoom, useTenStore } from "../utils/myTen";
import { Text } from "./AppText";
import { BottomSheet } from "./BottomSheet";
import { TenGrid } from "./MyTen";
import { PrimaryButton } from "./PrimaryButton";

// A new S when your Ten is full (utils/myTen): "Your Ten is full. What
// makes room?" — tap one of the ten to swap it out (it stays S, just
// behind the Ten), or keep the new film outside. Mounted once at the
// navigation root.
export const MakeRoomSheet = () => {
  useMoviesVersion();
  const colors = useColors();
  const styles = createStyles(colors);
  const waiting = useTenStore((state) => state.waiting);
  const watched = useMovieStore((state) => state.watched);
  const order = useProfileStore((state) => state.topTen) ?? [];
  const movie = waiting ? getMovieById(waiting) : null;
  const { ten } = getTen(watched, order);

  const choose = (bumped) => {
    Haptics.selectionAsync();
    const line = makeRoom(bumped?.id ?? null);
    if (line) showToast(line, { tone: "success" });
  };

  return (
    <BottomSheet
      visible={!!movie}
      onClose={() => choose(null)}
      size="auto"
      title={t("Your Ten is full. What makes room?")}
      subtitle={movie ? t("{title} is your new S. Tap the film it replaces.", { title: movie.title }) : null}
      footer={<PrimaryButton label={t("Keep it outside the Ten")} onPress={() => choose(null)} variant="secondary" />}
    >
      <View style={styles.body}>
        <TenGrid movies={ten} onPressSlot={choose} />
        <Text style={styles.note}>{t("The one you swap out stays S.")}</Text>
      </View>
    </BottomSheet>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    body: {
      gap: spacing.md,
    },
    note: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: "center",
    },
  });

export default MakeRoomSheet;
