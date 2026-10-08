import { Children, forwardRef } from "react";
import { StyleSheet, Text as NativeText } from "react-native";

import { translateExact } from "../i18n";
import { useLanguageStore } from "../store/languageStore";

// The app's Text: React Native's Text, plus two things for Arabic.
//
// 1. Any plain string child that has an Arabic translation is shown
//    translated. This covers text that comes from data rather than the
//    screen itself — tab and sort labels, genres, tier meanings, badge and
//    level names — without wrapping every use. Strings already passed
//    through t() (or with no translation, like movie titles) show as they
//    are.
// 2. In Arabic, Sora is swapped for IBM Plex Sans Arabic at the matching
//    weight, and letter spacing / uppercase are dropped (they break joined
//    Arabic letters). This follows the language itself, so it works even
//    where the layout can't flip right-to-left (Expo Go).
const ARABIC_FONT = {
  Sora_400Regular: "IBMPlexSansArabic_400Regular",
  Sora_500Medium: "IBMPlexSansArabic_500Medium",
  Sora_600SemiBold: "IBMPlexSansArabic_600SemiBold",
  Sora_700Bold: "IBMPlexSansArabic_700Bold",
  // Plex Arabic tops out at bold.
  Sora_800ExtraBold: "IBMPlexSansArabic_700Bold",
};

// Only overrides what the style actually sets, so nested text without its
// own font keeps inheriting its parent's (e.g. a bold run inside a line).
const arabicStyle = (style) => {
  const flat = StyleSheet.flatten(style);
  if (!flat) return style;
  const override = {};
  if (ARABIC_FONT[flat.fontFamily])
    override.fontFamily = ARABIC_FONT[flat.fontFamily];
  if (flat.letterSpacing) override.letterSpacing = 0;
  if (flat.textTransform && flat.textTransform !== "none") {
    override.textTransform = "none";
  }
  return Object.keys(override).length ? [style, override] : style;
};

const translateChild = (child) =>
  typeof child === "string" ? translateExact(child) : child;

export const Text = forwardRef(({ children, style, ...props }, ref) => {
  const isArabic = useLanguageStore((state) => state.language === "ar");
  return (
    <NativeText
      ref={ref}
      style={isArabic ? arabicStyle(style) : style}
      {...props}
    >
      {typeof children === "string"
        ? translateExact(children)
        : Children.map(children, translateChild)}
    </NativeText>
  );
});

Text.displayName = "Text";

export default Text;
