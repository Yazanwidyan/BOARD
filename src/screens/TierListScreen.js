import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StackHeader, useStackHeaderScroll } from "../components/ScreenHeader";
import { STierOrderSheet } from "../components/STierOrderSheet";
import { TierListRows } from "../components/TierListRows";
import { useMoviesVersion } from "../data/movies";
import { useFriends } from "../store/friendsStore";
import { useMovieStore } from "../store/movieStore";
import { useProfileStore } from "../store/profileStore";
import { spacing } from "../theme/spacing";
import { useColors } from "../theme/useColors";
import { t } from "../i18n";

// A whole tier list, S to F — yours, or a friend's (`friendId`). Opened
// from the tier summary on a profile. S, the favourites, is in its owner's
// order; on yours its letter opens the sheet that sets it.
export const TierListScreen = ({ navigation, route }) => {
  // Re-render when movies this screen asked for arrive (data/movies).
  useMoviesVersion();
  const headerScroll = useStackHeaderScroll();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const friendId = route?.params?.friendId;
  const ownWatched = useMovieStore((state) => state.watched);
  const { friends } = useFriends();
  const friend = friendId ? friends.find((item) => item.id === friendId) : null;
  const entries = friendId ? friend?.watched ?? [] : ownWatched;
  const ownOrder = useProfileStore((state) => state.topTen) ?? [];
  const sOrder = friendId ? friend?.topTen ?? [] : ownOrder;
  const [isOrdering, setIsOrdering] = useState(false);
  const openMovie = (movieId) => navigation.push("MovieDetails", { movieId });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StackHeader
        title={friend ? t("{name}'s tier list", { name: friend.name.split(" ")[0] }) : t("Your tier list")}
        onBack={() => navigation.goBack()}
        scrollY={headerScroll.scrollY}
      />
      <Animated.ScrollView
        onScroll={headerScroll.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + spacing.xl,
        }}
      >
        <TierListRows
          entries={entries}
          onOpen={openMovie}
          onSeeUntiered={
            friendId ? undefined : () => navigation.navigate("Library", { showUntiered: true })
          }
          sOrder={sOrder}
          onOrderS={friendId ? undefined : () => setIsOrdering(true)}
        />
      </Animated.ScrollView>
      {!friendId && <STierOrderSheet visible={isOrdering} onClose={() => setIsOrdering(false)} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default TierListScreen;
