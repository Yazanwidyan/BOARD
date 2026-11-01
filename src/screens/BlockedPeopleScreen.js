import { Alert, Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Text } from "../components/AppText";
import { FriendAvatar } from "../components/FriendAvatar";
import { StackHeader, useStackHeaderScroll } from "../components/ScreenHeader";
import { t } from "../i18n";
import { useBlocked } from "../store/friendsStore";
import { showToast } from "../store/toastStore";
import { shape, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

const AVATAR = 44;

// Settings → Blocked people: everyone you blocked, each with Unblock.
// Blocked people can't find you, see your profile or send you requests.
export const BlockedPeopleScreen = ({ navigation }) => {
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const { blocked, loaded, unblock } = useBlocked();

  const confirmUnblock = (user) =>
    Alert.alert(
      t("Unblock {name}?", { name: user.name }),
      t("They'll be able to find you and send you a friend request again."),
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Unblock"),
          onPress: async () => {
            try {
              await unblock(user.id);
            } catch (err) {
              showToast(err.message);
            }
          },
        },
      ],
    );

  return (
    <View style={styles.container}>
      <StackHeader
        title={t("Blocked people")}
        onBack={() => navigation.goBack()}
        scrollY={headerScroll.scrollY}
      />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {loaded && blocked.length === 0 && (
          <Text style={styles.empty}>
            {t("You haven't blocked anyone. You can block someone from the ⋯ on their profile.")}
          </Text>
        )}
        {blocked.map((user) => (
          <View key={user.id} style={styles.row}>
            <FriendAvatar friend={user} size={AVATAR} />
            <View style={styles.words}>
              <Text style={styles.name} numberOfLines={1}>
                {user.name}
              </Text>
              <Text style={styles.handle} numberOfLines={1}>
                {user.handle}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.unblock, pressed && styles.pressed]}
              onPress={() => confirmUnblock(user)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={t("Unblock {name}", { name: user.name })}
            >
              <Text style={styles.unblockText}>{t("Unblock")}</Text>
            </Pressable>
          </View>
        ))}
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
    content: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      gap: spacing.md,
    },
    empty: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.xl,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    words: {
      flex: 1,
    },
    name: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    handle: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    unblock: {
      paddingHorizontal: spacing.md,
      minHeight: 34,
      justifyContent: "center",
      borderRadius: shape.chip,
      borderWidth: 1,
      borderColor: colors.outline,
    },
    unblockText: {
      ...typography.bodyBold,
      color: colors.textPrimary,
    },
    pressed: {
      opacity: 0.7,
    },
  });

export default BlockedPeopleScreen;
