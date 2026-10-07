// Sora everywhere. Each `fontFamily` points at a specific weight file
// (loaded in App.js via @expo-google-fonts/sora), so `fontWeight` is
// intentionally omitted — pairing a numeric fontWeight with an
// already-weighted custom font file makes Android ignore the custom font
// and fall back to the system one.
export const fonts = {
  regular: "Sora_400Regular",
  medium: "Sora_500Medium",
  semiBold: "Sora_600SemiBold",
  bold: "Sora_700Bold",
  extraBold: "Sora_800ExtraBold",
};

export const typography = {
  display: {
    fontFamily: fonts.extraBold,
    fontSize: 32,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  hero: {
    fontFamily: fonts.extraBold,
    fontSize: 26,
    letterSpacing: -0.6,
    lineHeight: 31,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  bodyBold: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
  caption: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  // The smallest text in the app (badges on posters, tiny meta). Nothing
  // goes below 11px — 9–10px labels were hard to read.
  micro: {
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
};

export default typography;
