import { Pressable, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useThemeStore } from '../store/themeStore';
import { radius } from '../theme/spacing';

// Same solid black/white treatment as the bottom tab bar, so every back
// button in the app reads as one consistent control — just the chevron,
// no label.
export const BackButton = ({ onPress, size = 40 }) => {
  const mode = useThemeStore((state) => state.mode);
  const badgeColor = mode === 'dark' ? '#000000' : '#FFFFFF';
  const iconColor = mode === 'dark' ? '#FFFFFF' : '#000000';

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[
        styles.button,
        { width: size, height: size, borderRadius: radius.md, backgroundColor: badgeColor },
      ]}
    >
      <ChevronLeft size={size * 0.55} color={iconColor} strokeWidth={2.4} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BackButton;
