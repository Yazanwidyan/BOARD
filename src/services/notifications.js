import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Linking, Platform } from "react-native";

import { getMovieById } from "../data/movies";
import { t } from "../i18n";
import { useMovieStore } from "../store/movieStore";
import { api } from "./api";
import { queryClient } from "./queryClient";

// Notifications — off until switched on in Settings (which asks the phone
// for permission).
//
//   On this phone (no account setup needed):
//     · 7:30 pm every day — tonight's pick, or a nudge to pick one
//     · the 1st of each month — "your month on ReelBoard" (the recap)
//   From the server (friend requests, movie night) — only once the app has
//   an EAS project id (`eas init`); until then that part is skipped.
//
// Tapping one opens its reelboard:// link (see the linking config in
// navigation/AppNavigator.js). Whether they're on is a setting of this
// phone, so it's kept here rather than on the account.

// Loaded on demand: older builds don't have the native side.
const load = () => {
  try {
    return require("expo-notifications");
  } catch {
    return null;
  }
};

const SETTING_KEY = "board:notifications";
const REMINDER_ID = "reelboard-tonight";
const RECAP_ID = "reelboard-recap";
const CHANNEL_ID = "default";
const REMINDER_TIME = { hour: 19, minute: 30 };

export class NotificationsUnavailable extends Error {}

const projectId = () =>
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;

export const getNotificationsEnabled = async () =>
  (await AsyncStorage.getItem(SETTING_KEY).catch(() => null)) === "on";

const ensureChannel = async (N) => {
  if (Platform.OS !== "android") return;
  await N.setNotificationChannelAsync(CHANNEL_ID, {
    name: "ReelBoard",
    importance: N.AndroidImportance.DEFAULT,
  });
};

// (Re)schedules this phone's reminders from the current pick.
export const refreshReminders = async () => {
  const N = load();
  if (!N || !(await getNotificationsEnabled())) return;
  await ensureChannel(N);
  await N.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
  await N.cancelScheduledNotificationAsync(RECAP_ID).catch(() => {});

  const pick = getMovieById(useMovieStore.getState().pickedMovie);
  await N.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: {
      title: pick
        ? t("Tonight's pick: {title}", { title: pick.title })
        : t("Can't decide what to watch?"),
      body: pick
        ? t("Ready when you are. Enjoy the movie.")
        : t("Swipe ten movies and let ReelBoard pick."),
      data: { url: "reelboard://decide" },
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.DAILY,
      channelId: CHANNEL_ID,
      ...REMINDER_TIME,
    },
  });
  await N.scheduleNotificationAsync({
    identifier: RECAP_ID,
    content: {
      title: t("Your month on ReelBoard"),
      body: t("What you watched, your top genre and your best-tiered movies."),
      data: { url: "reelboard://recap" },
    },
    trigger: {
      type: N.SchedulableTriggerInputTypes.MONTHLY,
      channelId: CHANNEL_ID,
      day: 1,
      hour: 10,
      minute: 0,
    },
  });
};

// Server push needs an Expo push token, which needs the EAS project id.
const currentPushToken = async () => {
  const N = load();
  const id = projectId();
  if (!N || !id) return null;
  return (await N.getExpoPushTokenAsync({ projectId: id })).data;
};

export const registerPushToken = async () => {
  if (!(await getNotificationsEnabled())) return;
  const token = await currentPushToken().catch(() => null);
  if (token) await api.post("/me/push-tokens", { token, platform: Platform.OS });
};

// Before signing out, or when switched off — this phone stops getting the
// account's notifications.
export const unregisterPushToken = async () => {
  const token = await currentPushToken().catch(() => null);
  if (token) await api.delete("/me/push-tokens", { token }).catch(() => {});
};

export const enableNotifications = async () => {
  const N = load();
  if (!N) throw new NotificationsUnavailable(t("Notifications need a new build of the app."));
  const { status } = await N.requestPermissionsAsync();
  if (status !== "granted") {
    throw new NotificationsUnavailable(
      t("Allow notifications for ReelBoard in your phone's settings."),
    );
  }
  await AsyncStorage.setItem(SETTING_KEY, "on");
  await refreshReminders();
  await registerPushToken().catch(() => {});
};

export const disableNotifications = async () => {
  await unregisterPushToken();
  await AsyncStorage.setItem(SETTING_KEY, "off");
  await load()?.cancelAllScheduledNotificationsAsync().catch(() => {});
};

// Each time an account has loaded: bring its reminders and push token up to
// date. The first time, also: show notifications that arrive while the app
// is open, open a tapped one's link (also one that launched the app), and
// keep the evening reminder in step with tonight's pick.
let started = false;
export const startNotifications = () => {
  const N = load();
  if (!N) return;
  refreshReminders().catch(() => {});
  registerPushToken().catch(() => {});
  if (started) return;
  started = true;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  const open = (response) => {
    const url = response?.notification?.request?.content?.data?.url;
    if (typeof url === "string" && url.startsWith("reelboard://")) Linking.openURL(url);
  };
  N.addNotificationResponseReceivedListener(open);
  N.getLastNotificationResponseAsync?.().then(open).catch(() => {});
  // The stores read the TanStack Query cache, so watch that for the pick.
  let lastPick = useMovieStore.getState().pickedMovie;
  queryClient.getQueryCache().subscribe(() => {
    const pick = useMovieStore.getState().pickedMovie;
    if (pick === lastPick) return;
    lastPick = pick;
    refreshReminders().catch(() => {});
  });
};
