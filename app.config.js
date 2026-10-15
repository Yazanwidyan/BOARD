// Extends app.json.
//
// Google Sign-In's iOS setup needs your Google iOS client id (its reversed
// form becomes a URL scheme), so its config plugin is only added once
// EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set (e.g. in .env) — until then
// builds work as before and the Google button explains what's missing.
//
// Release builds block plain-http requests on Android. A test build
// pointed at a backend on your own network (EXPO_PUBLIC_API_URL=
// http://192.168.x.x:4000/api) allows them; an https backend doesn't need to.
module.exports = ({ config }) => {
  const plugins = [...(config.plugins ?? [])];

  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (iosClientId) {
    const reversed = iosClientId.replace(/\.apps\.googleusercontent\.com$/, "");
    plugins.push([
      "@react-native-google-signin/google-signin",
      { iosUrlScheme: `com.googleusercontent.apps.${reversed}` },
    ]);
  }

  if (process.env.EXPO_PUBLIC_API_URL?.startsWith("http://")) {
    plugins.push([
      "expo-build-properties",
      { android: { usesCleartextTraffic: true } },
    ]);
  }

  return { ...config, plugins };
};
