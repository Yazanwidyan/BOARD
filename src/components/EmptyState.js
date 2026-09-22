import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme/useColors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { PrimaryButton } from './PrimaryButton';

export const EmptyState = ({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}) => {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {icon}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <PrimaryButton
          label={actionLabel}
          onPress={onAction}
          style={styles.action}
        />
      ) : null}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.md,
    minWidth: 200,
  },
});

export default EmptyState;
