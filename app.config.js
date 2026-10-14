// Extends app.json. Google Sign-In's iOS setup needs your Google iOS client
// id (its reversed form becomes a URL scheme), so its config plugin is only
// added once EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set (e.g. in .env) — until
// then builds work as before and the Google button explains what's missing.
module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (!iosClientId) return config;
  const reversed = iosClientId.replace(/\.apps\.googleusercontent\.com$/, "");
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      [
        "@react-native-google-signin/google-signin",
        { iosUrlScheme: `com.googleusercontent.apps.${reversed}` },
      ],
    ],
  };
};
