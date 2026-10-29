import * as Haptics from "expo-haptics";
import { UserPlus } from "lucide-react-native";
import { useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HomeFriends } from "../components/HomeFriends";
import { HeaderIconButton, StackHeader, useStackHeaderScroll } from "../components/ScreenHeader";
import { t } from "../i18n";
import { useFriends } from "../store/friendsStore";
import { spacing } from "../theme/spacing";
import { useColors } from "../theme/useColors";

// Your friends (and requests), watching together and what they've been up
// to (HomeFriends) — opened from Home's Friends and Activity tiles and its
// bell. The ＋ person finds and adds people.
export const FriendsHubScreen = ({ navigation }) => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const headerScroll = useStackHeaderScroll();
  const { refresh } = useFriends();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.selectionAsync();
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StackHeader
        title={t("Friends")}
        onBack={() => navigation.goBack()}
        scrollY={headerScroll.scrollY}
        right={
          <HeaderIconButton
            onPress={() => navigation.navigate("Friends")}
            accessibilityLabel={t("Find friends")}
          >
            <UserPlus size={20} strokeWidth={1.75} color={colors.textPrimary} />
          </HeaderIconButton>
        }
      />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.textSecondary}
            colors={[colors.textPrimary]}
            progressBackgroundColor={colors.card}
          />
        }
        contentContainerStyle={{ paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.xl }}
      >
        <HomeFriends navigation={navigation} />
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
  });

export default FriendsHubScreen;
