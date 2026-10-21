import { ScrollView, StyleSheet } from "react-native";

import { t } from "../i18n";
import { useDecideStore } from "../store/decideStore";
import { spacing } from "../theme/spacing";
import { BottomSheet } from "./BottomSheet";
import { SourceList } from "./SourceList";

// Wildcard, step one: where from (the same sources as Swipe —
// utils/decidePools), as big rows. Choosing one remembers it and calls
// `onGo` — Decide opens the scratch card (screens/WildcardScreen).
export const WildcardSheet = ({ visible, onClose, onGo }) => {
  const styles = createStyles();
  const setWildcard = useDecideStore((state) => state.setWildcard);

  const go = (source, boardId) => {
    setWildcard({ source, boardId });
    onGo();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("Wildcard")}
      subtitle={t("Where from? You'll scratch one film")}
      size="auto"
      flush
    >
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <SourceList
          kind="wildcard"
          active={visible}
          onGo={go}
          goLabel={() => t("Scratch one")}
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

export default WildcardSheet;
