import AsyncStorage from "@react-native-async-storage/async-storage";
import { Users, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";

import { withAppLink } from "../config/links";
import { t } from "../i18n";
import { logEvent } from "../services/events";
import { useAuthStore } from "../store/authStore";
import { useFriends } from "../store/friendsStore";
import { useMovieStore } from "../store/movieStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { FRIEND_MATCH_TIERS, countTiered } from "../utils/tasteWords";
import { Text } from "./AppText";

const ICON = 46;
const DISMISSED_KEY = "board:invite-card-dismissed";

// Sends your invite: your handle, and the link to get the app when there
// is one. Friends' "Invite a friend" sends the same.
export const inviteFriend = (handle) =>
  Share.share({
    message: withAppLink(t("Join me on ReelBoard — I'm {myHandle}. Let's compare tier lists.", { myHandle: handle })),
  }).catch(() => {});

// Friends, on Home, for someone who has none yet — once there's something
// to share: FRIEND_MATCH_TIERS tiers, when a friend's match becomes a real
// number. "See how your taste matches a friend's" [Invite a friend]
// [Add by handle]. It goes with your first friend; ✕ puts it away for good.
export const InviteFriendCard = ({ navigation, style }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const handle = useAuthStore((state) => state.user?.handle);
  const tiered = useMovieStore((state) => countTiered(state.watched));
  const { friends, loaded } = useFriends();
  // Unknown until it's read, so the card doesn't flash up and away.
  const [dismissed, setDismissed] = useState(null);
  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((value) => setDismissed(value === "1"))
      .catch(() => setDismissed(false));
  }, []);

  if (dismissed !== false || !loaded || friends.length > 0 || tiered < FRIEND_MATCH_TIERS || !handle) return null;

  const dismiss = () => {
    setDismissed(true);
    AsyncStorage.setItem(DISMISSED_KEY, "1").catch(() => {});
  };
  const invite = () => {
    logEvent("invite_sent");
    inviteFriend(handle);
  };

  return (
    <View style={[styles.card, style]}>
      <View style={styles.top}>
        <View style={styles.icon}>
          <Users size={22} color={colors.brand} strokeWidth={2.2} />
        </View>
        <View style={styles.words}>
          <Text style={styles.title} numberOfLines={2}>
            {t("See how your taste matches a friend's")}
          </Text>
          <Text style={styles.hint} numberOfLines={3}>
            {t("You've tiered {count} films — enough to compare. Invite someone and you'll both see your match.", {
              count: tiered,
            })}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          onPress={dismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t("Dismiss")}
        >
          <X size={16} color={colors.textSecondary} strokeWidth={2.2} />
        </Pressable>
      </View>
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.button, styles.buttonMain, pressed && styles.pressed]}
          onPress={invite}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, styles.buttonMainText]} numberOfLines={1}>
            {t("Invite a friend")}
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.button, styles.buttonQuiet, pressed && styles.pressed]}
          onPress={() => navigation.navigate("Friends")}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText} numberOfLines={1}>
            {t("Add by handle")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    card: {
      padding: spacing.sm + 2,
      gap: spacing.sm + 2,
      backgroundColor: colors.card,
      borderRadius: shape.card,
    },
    top: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
    },
    icon: {
      width: ICON,
      height: ICON,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardElevated,
      borderRadius: ICON / 2,
    },
    words: {
      flex: 1,
    },
    title: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    hint: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    actions: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    button: {
      flex: 1,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.sm,
      borderRadius: shape.chip,
    },
    buttonMain: {
      backgroundColor: colors.brand,
    },
    buttonQuiet: {
      borderWidth: 1,
      borderColor: colors.outline,
    },
    buttonText: {
      ...typography.bodyBold,
      fontSize: 13,
      lineHeight: 17,
      color: colors.textPrimary,
    },
    buttonMainText: {
      color: colors.brandText,
    },
    close: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "flex-start",
    },
    pressed: {
      opacity: 0.75,
    },
  });

export default InviteFriendCard;
