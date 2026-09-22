import { useThemeStore } from '../store/themeStore';
import { palettes } from './palettes';

export const useColors = () => {
  const mode = useThemeStore((state) => state.mode);
  return palettes[mode];
};

export default useColors;
