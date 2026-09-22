// `fontFamily` points at a specific Sora weight file (loaded in App.js via
// expo-font), so `fontWeight` is intentionally omitted — pairing a numeric
// fontWeight with an already-weighted custom font file makes Android ignore
// the custom font and fall back to the system one.
export const typography = {
  display: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 32,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  hero: {
    fontFamily: 'Sora_800ExtraBold',
    fontSize: 26,
    letterSpacing: -0.6,
    lineHeight: 31,
  },
  title: {
    fontFamily: 'Sora_700Bold',
    fontSize: 19,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 15,
  },
  body: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
  },
  bodyBold: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 14,
  },
  caption: {
    fontFamily: 'Sora_500Medium',
    fontSize: 12,
  },
  label: {
    fontFamily: 'Sora_700Bold',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
};

export default typography;
