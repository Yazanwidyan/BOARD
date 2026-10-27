import { Platform } from "react-native";

import { t } from "../i18n";

// Google and Apple's own sign-in sheets. Each returns the token the
// backend checks (POST /api/auth/google, /api/auth/apple), or null when the
// person backs out.
//
// Setup (until it's done, the buttons explain what's missing):
//   Google  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
//           in .env (OAuth client ids from Google Cloud), and the web client
//           id in the backend's GOOGLE_CLIENT_IDS
//   Apple   iPhone only; needs the app's Apple Developer team (EAS sets up
//           the capability from app.json)
// Both are native modules, so they need a build of the app made after they
// were added — a new dev build, not an older one.

// Loaded on demand: in an older build the native side is missing, and that
// should mean a clear message rather than a crash at start-up.
const loadGoogle = () => {
  try {
    return require("@react-native-google-signin/google-signin");
  } catch {
    return null;
  }
};

const loadApple = () => {
  try {
    return require("expo-apple-authentication");
  } catch {
    return null;
  }
};

// Thrown when sign-in can't even start (not set up, or needs a new build) —
// the message says which.
export class SignInUnavailable extends Error {}

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// Sign in with Apple is built into iPhones; on Android it would need a
// separate web-based setup, so the button is iPhone-only.
export const appleSignInSupported = Platform.OS === "ios";
// The Google button shows only once the build has its client ids — so
// nobody meets a sign-in that can't work.
export const googleSignInConfigured = Boolean(GOOGLE_WEB_CLIENT_ID);

export const getGoogleCredentials = async () => {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new SignInUnavailable(
      t("Google sign-in isn't set up yet — it needs the app's Google client ids."),
    );
  }
  const google = loadGoogle();
  if (!google) {
    throw new SignInUnavailable(t("Google sign-in needs a new build of the app."));
  }
  const { GoogleSignin, statusCodes } = google;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (response.type !== "success") return null;
    if (!response.data.idToken) {
      throw new Error(t("Google didn't send a sign-in token — check the web client id."));
    }
    return { idToken: response.data.idToken };
  } catch (error) {
    if (
      error.code === statusCodes.SIGN_IN_CANCELLED ||
      error.code === statusCodes.IN_PROGRESS
    ) {
      return null;
    }
    throw error;
  }
};

export const getAppleCredentials = async () => {
  const apple = loadApple();
  if (!appleSignInSupported || !apple || !(await apple.isAvailableAsync())) {
    throw new SignInUnavailable(
      t("Sign in with Apple needs an iPhone and a new build of the app."),
    );
  }
  try {
    const credential = await apple.signInAsync({
      requestedScopes: [
        apple.AppleAuthenticationScope.FULL_NAME,
        apple.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      throw new Error(t("Apple didn't send a sign-in token — try again."));
    }
    // Apple only shares the name the very first time.
    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(" ");
    return {
      identityToken: credential.identityToken,
      ...(fullName ? { fullName } : {}),
    };
  } catch (error) {
    if (error.code === "ERR_REQUEST_CANCELED") return null;
    throw error;
  }
};

// So the next Google sign-in shows the account picker again.
export const signOutOfProviders = () => {
  if (!GOOGLE_WEB_CLIENT_ID) return;
  loadGoogle()
    ?.GoogleSignin.signOut()
    .catch(() => {});
};
