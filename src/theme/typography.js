import { I18nManager } from "react-native";

// Sora for English; IBM Plex Sans Arabic when the app runs in Arabic (the
// app restarts when the language changes direction, so checking RTL once
// at load is enough). Each `fontFamily` points at a specific weight file
// (loaded in App.js), so `fontWeight` is intentionally omitted — pairing a
// numeric fontWeight with an already-weighted custom font file makes
// Android ignore the custom font and fall back to the system one.
export const isArabicLayout = I18nManager.isRTL;

export const fonts = isArabicLayout
  ? {
      regular: "IBMPlexSansArabic_400Regular",
      medium: "IBMPlexSansArabic_500Medium",
      semiBold: "IBMPlexSansArabic_600SemiBold",
      bold: "IBMPlexSansArabic_700Bold",
      // Plex Arabic tops out at bold.
      extraBold: "IBMPlexSansArabic_700Bold",
    }
  : {
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

// Arabic letters join up, so letter spacing (and uppercase) would break
// words apart — both are dropped in Arabic.
if (isArabicLayout) {
  Object.values(typography).forEach((style) => {
    if (style.letterSpacing) style.letterSpacing = 0;
    delete style.textTransform;
  });
}

export default typography;
