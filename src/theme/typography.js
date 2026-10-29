import { I18nManager } from "react-native";

// Inter for English (the closest free match to Apple's SF Pro, as in Apple
// Music); IBM Plex Sans Arabic when the app runs in Arabic (the
// app restarts when the language changes direction, so checking RTL once
// at load is enough). Each `fontFamily` points at a specific weight file
// (loaded in App.js), so `fontWeight` is intentionally omitted — pairing a
// numeric fontWeight with an already-weighted custom font file makes
// Android ignore the custom font and fall back to the system one.
export const isArabicLayout = I18nManager.isRTL;

// The "ReelBoard" wordmark's own face: Bebas Neue — tall condensed
// capitals, like a cinema marquee. Latin only (the name stays in Latin
// letters in Arabic too), capitals only, and used for the name alone.
export const WORDMARK_FONT = "BebasNeue_400Regular";

export const fonts = isArabicLayout
  ? {
      regular: "IBMPlexSansArabic_400Regular",
      medium: "IBMPlexSansArabic_500Medium",
      semiBold: "IBMPlexSansArabic_600SemiBold",
      bold: "IBMPlexSansArabic_700Bold",
      // Plex Arabic tops out at bold.
      extraBold: "IBMPlexSansArabic_700Bold",
      display: "IBMPlexSansArabic_700Bold",
    }
  : {
      regular: "Inter_400Regular",
      medium: "Inter_500Medium",
      semiBold: "Inter_600SemiBold",
      bold: "Inter_700Bold",
      extraBold: "Inter_800ExtraBold",
      // Film titles (a movie's page, the mixes): Fraunces, a soft serif —
      // editorial, like a film poster's credits. Latin only.
      display: "Fraunces_700Bold",
    };

// The scale: Heading 1 (hero) 24/36, Heading 2 (title) 20/28, Body
// (subtitle) 16/24, Body small (body, bodyBold) 14/22 — with a bigger
// display above, and captions and labels below.
export const typography = {
  display: {
    fontFamily: fonts.extraBold,
    fontSize: 32,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  hero: {
    fontFamily: fonts.bold,
    fontSize: 24,
    letterSpacing: -0.3,
    lineHeight: 36,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 20,
    letterSpacing: -0.2,
    lineHeight: 28,
  },
  subtitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 24,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 22,
  },
  bodyBold: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 22,
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
  // Every section's heading: small capitals, spaced (grey, at the use).
  section: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
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
