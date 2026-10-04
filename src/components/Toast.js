import { CheckCircle, Info } from "lucide-react-native";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useToastStore } from "../store/toastStore";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { useColors } from "../theme/useColors";

// A small pill that drops in under the status bar and leaves on its own
// (see toastStore). Tapping it dismisses early.
export const Toast = () => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const toast = useToastStore((state) => state.toast);
  const hideToast = useToastStore((state) => state.hideToast);

  if (!toast) return null;

  const isSuccess = toast.tone === "success";

  return (
    <Animated.View
      key={toast.id}
      entering={FadeInUp.springify().damping(18)}
      exiting={FadeOutUp.duration(160)}
      style={[styles.wrap, { top: insets.top + spacing.sm }]}
      pointerEvents="box-none"
    >
      <Pressable style={styles.pill} onPress={hideToast}>
        {isSuccess ? (
          <CheckCircle size={16} color={colors.success} />
        ) : (
          <Info size={16} color={colors.accentLight} />
        )}
        <Text style={styles.text} numberOfLines={2}>
          {toast.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      position: "absolute",
      left: spacing.md,
      right: spacing.md,
      alignItems: "center",
      zIndex: 1000,
      elevation: 1000,
    },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      maxWidth: "100%",
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      backgroundColor: colors.cardElevatedLight,
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.1)",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
    },
    text: {
      ...typography.bodyBold,
      flexShrink: 1,
      color: colors.textPrimary,
    },
  });

export default Toast;
