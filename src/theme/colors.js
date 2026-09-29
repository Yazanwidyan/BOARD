// Static re-export for non-component code that can't call the `useColors()`
// hook. Components should still prefer `useColors()`.
import { colors } from './palettes';

export { colors };

export default colors;
