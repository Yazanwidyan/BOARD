import { StyleSheet, View } from "react-native";

import { APP_URL_LABEL } from "../config/links";
import { t } from "../i18n";
import { spacing } from "../theme/spacing";
import { fonts, typography } from "../theme/typography";
import { useColors } from "../theme/useColors";
import { Text } from "./AppText";

// The foot of a shared taste card — what turns a picture into a way in:
// whose it is ("Find @sam on ReelBoard") and where to get the app (its
// link, once there is one — config/links).
export const ShareCardFooter = ({ handle, align = "center", style }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const alignItems = align === "end" ? "flex-end" : "center";
  return (
    <View style={[styles.wrap, { alignItems }, style]}>
      <Text style={styles.brand} numberOfLines={1}>
        {handle ? t("Find {handle} on ReelBoard", { handle }) : t("on ReelBoard")}
      </Text>
      {!!APP_URL_LABEL && (
        <Text style={styles.link} numberOfLines={1}>
          {APP_URL_LABEL}
        </Text>
      )}
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    wrap: {
      gap: 1,
    },
    brand: {
      ...typography.caption,
      fontFamily: fonts.bold,
      color: colors.textPrimary,
    },
    link: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
    },
  });

export default ShareCardFooter;
