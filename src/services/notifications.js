import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Alert, Linking, Platform } from "react-native";

import { features } from "../config/features";
import { getMovieById } from "../data/movies";
import { t } from "../i18n";
import { useMovieStore } from "../store/movieStore";
import { api } from "./api";
import { logEvent } from "./events";
import { queryClient } from "./queryClient";

// Notifications — offered once at the end of onboarding ("Want a nudge
// tonight?"), and switched on or off in Settings (either asks the phone for
// permission).
//
//   On this phone (no account setup needed):
//     · 7:30 pm every day — tonight's pick, or a nudge to pick one
//     · the morning after you watch something — "How was Inception?",
//       until you tier it (and, notifications on or not, a card on Home)
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
// Set once onboarding has offered them, so it's only asked the once.
const ASKED_KEY = "board:notifications-asked";
// The film to ask about the next morning: { movieId, at }.
const NUDGE_KEY = "board:tier-nudge";
const REMINDER_ID = "reelboard-tonight";
const TIER_ID = "reelboard-tier";
const RECAP_ID = "reelboard-recap";
const CHANNEL_ID = "default";
const REMINDER_TIME = { hour: 19, minute: 30 };
const NUDGE_TIME = { hour: 10, minute: 0 };

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
  // The recap opens Replay — only while it's switched on.
  if (!features.replay) return;
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

// ---- The morning after -----------------------------------------------------

// The film you last watched and haven't tiered yet — { movieId, at } — or
// null. Asked about the next morning: a notification when they're on, and
// a card on Home either way (components/TierNudgeCard).
let nudgeMovieId = null;

export const getTierNudge = async () => {
  try {
    const nudge = JSON.parse(await AsyncStorage.getItem(NUDGE_KEY));
    return nudge?.movieId ? nudge : null;
  } catch {
    return null;
  }
};

// Tomorrow at NUDGE_TIME.
const nextMorning = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(NUDGE_TIME.hour, NUDGE_TIME.minute, 0, 0);
  return date;
};

// Just watched `movieId`: ask how it was tomorrow morning (it replaces any
// film asked about before).
export const scheduleTierNudge = async (movieId) => {
  nudgeMovieId = movieId;
  await AsyncStorage.setItem(NUDGE_KEY, JSON.stringify({ movieId, at: Date.now() })).catch(() => {});
  const N = load();
  if (!N || !(await getNotificationsEnabled())) return;
  await ensureChannel(N);
  await N.cancelScheduledNotificationAsync(TIER_ID).catch(() => {});
  const title = getMovieById(movieId)?.title;
  await N.scheduleNotificationAsync({
    identifier: TIER_ID,
    content: {
      title: title ? t("How was {title}?", { title }) : t("How was last night's film?"),
      body: t("Tier it while it's fresh — it sharpens your picks."),
      data: { url: `reelboard://tier/${movieId}` },
    },
    trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: nextMorning(), channelId: CHANNEL_ID },
  });
};

// Tiered (or dismissed): nothing more to ask.
export const clearTierNudge = async () => {
  nudgeMovieId = null;
  await AsyncStorage.removeItem(NUDGE_KEY).catch(() => {});
  await load()?.cancelScheduledNotificationAsync(TIER_ID).catch(() => {});
};

// The film asked about has its tier now (or isn't watched any more).
const settleTierNudge = () => {
  if (!nudgeMovieId) return;
  const entry = useMovieStore.getState().watched.find((item) => item.movieId === nudgeMovieId);
  if (!entry || entry.tier || entry.rating != null) clearTierNudge();
};

// ---- Asked once ------------------------------------------------------------

// At the end of onboarding: what they'd get, in a word, then the phone's
// own prompt — once (Settings has the switch after that). `pickTitle`:
// the film just picked for tonight, or null. Resolves to whether they're on.
export const askForReminders = async (pickTitle) => {
  const N = load();
  if (!N || (await AsyncStorage.getItem(ASKED_KEY).catch(() => null))) return getNotificationsEnabled();
  await AsyncStorage.setItem(ASKED_KEY, "1").catch(() => {});
  if (await getNotificationsEnabled()) return true;
  const yes = await new Promise((resolve) =>
    Alert.alert(
      pickTitle ? t("A nudge for {title}?", { title: pickTitle }) : t("A nudge tonight?"),
      t("We'll remind you at 7:30 pm, and ask how it was the next morning."),
      [
        { text: t("Not now"), style: "cancel", onPress: () => resolve(false) },
        { text: t("Remind me"), onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
  if (!yes) return false;
  try {
    await enableNotifications();
    logEvent("notifications_allowed");
    return true;
  } catch {
    return false;
  }
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
// is open, open a tapped one's link (also one that launched the app), keep
// the evening reminder in step with tonight's pick, and drop the morning
// question once its film is tiered.
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
  getTierNudge().then((nudge) => {
    nudgeMovieId = nudge?.movieId ?? null;
    settleTierNudge();
  });
  // The stores read the TanStack Query cache, so watch that for the pick —
  // and for the film asked about getting its tier.
  let lastPick = useMovieStore.getState().pickedMovie;
  queryClient.getQueryCache().subscribe(() => {
    settleTierNudge();
    const pick = useMovieStore.getState().pickedMovie;
    if (pick === lastPick) return;
    lastPick = pick;
    refreshReminders().catch(() => {});
  });
};
