// `scrim`/`overlay` back text/icons sitting on top of movie posters (not
// app chrome), so they stay a fixed dark translucent value in both
// palettes — a photo isn't aware of the app's theme.
const PHOTO_SCRIM = {
  overlay: 'rgba(2, 0, 2, 0.75)',
  scrim: 'rgba(2, 0, 2, 0.6)',
};

export const dark = {
  background: '#252525',
  backgroundSecondary: '#131313',
  card: '#000000',
  cardElevated: '#000000',
  textPrimary: '#FFFFFF',
  textSecondary: '#A5A5B0',
  textMuted: '#6E6E7A',
  // No brand color — the "primary" fill is just white in dark mode, black
  // in light mode.
  accent: '#FFFFFF',
  accentContrast: '#000000',
  success: '#22C55E',
  border: '#2A2A35',
  borderStrong: '#37374A',
  ...PHOTO_SCRIM,
  successSoft: 'rgba(34, 197, 94, 0.14)',
  // Neutral icon-badge background, used everywhere the accent used to fill
  // that role, now that the accent is reserved for primary buttons only.
  surfaceSoft: 'rgba(255, 255, 255, 0.08)',
};

export const light = {
  background: '#F5F5F5',
  backgroundSecondary: '#E4E4E4',
  card: '#FFFFFF',
  cardElevated: '#F5F4EC',
  textPrimary: '#131313',
  textSecondary: '#5B5B60',
  textMuted: '#8D8D93',
  accent: '#000000',
  accentContrast: '#FFFFFF',
  success: '#16A34A',
  border: '#E4E2D6',
  borderStrong: '#CFCDBE',
  ...PHOTO_SCRIM,
  successSoft: 'rgba(22, 163, 74, 0.12)',
  // Dark tint instead of dark mode's white one, so icon badges still read
  // as a subtle recess against a light background.
  surfaceSoft: 'rgba(19, 19, 19, 0.06)',
};

export const palettes = { dark, light };

export default palettes;
