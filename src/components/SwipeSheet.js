import { ScrollView, StyleSheet } from "react-native";

import { t } from "../i18n";
import { useDecideStore } from "../store/decideStore";
import { showToast } from "../store/toastStore";
import { spacing } from "../theme/spacing";
import { dealSet } from "../utils/decidePools";
import { getPoolNow } from "../utils/useDecidePool";
import { BottomSheet } from "./BottomSheet";
import { SourceList } from "./SourceList";

// A swipe session's size (as everywhere else that starts one).
const SWIPE_MAX = 10;

// Swipe: where from (the same sources as Wildcard — utils/decidePools), as
// big rows; tapping one deals its ten and starts. Swiping takes it down to
// one. `onStart(movies)` starts the session.
export const SwipeSheet = ({ visible, onClose, onStart }) => {
  const styles = createStyles();
  const setSwipe = useDecideStore((state) => state.setSwipe);

  const go = (source, boardId) => {
    setSwipe({ source, boardId });
    const movies = dealSet(getPoolNow(source, boardId), source, SWIPE_MAX);
    if (movies.length < 2) {
      showToast(t("Not enough here to swipe"));
      return;
    }
    onStart(movies);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("Swipe")}
      subtitle={t("Where from? Ten at a time, down to one")}
      size="auto"
      flush
    >
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <SourceList
          kind="swipe"
          active={visible}
          least={2}
          onGo={go}
          goLabel={(count) => t("Swipe these · {count}", { count: Math.min(count, SWIPE_MAX) })}
        />
      </ScrollView>
    </BottomSheet>
  );
};

const createStyles = () =>
  StyleSheet.create({
    body: {
      paddingBottom: spacing.lg,
    },
  });

export default SwipeSheet;
