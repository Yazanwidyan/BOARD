// Static fallback (dark palette). Components should use `useColors()`
// instead so they react to the light/dark mode setting; this export exists
// only for non-component code that can't call a hook.
import { dark } from './palettes';

export const colors = dark;

export default colors;
