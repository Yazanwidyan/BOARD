import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity } from 'lucide-react-native';
import { useColors } from '../theme/useColors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { EmptyState } from '../components/EmptyState';
import { ScreenBottomFade } from '../components/ScreenBottomFade';

export const ActivityScreen = () => {
  const colors = useColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.title}>Activity</Text>
      </View>

      <EmptyState
        icon={<Activity size={40} color={colors.textMuted} />}
        title="Coming Soon"
        subtitle="We're working on it — check back later."
      />

      <ScreenBottomFade />
    </SafeAreaView>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});

export default ActivityScreen;
