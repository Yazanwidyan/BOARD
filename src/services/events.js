import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuthStore } from "../store/authStore";
import { api } from "./api";

// The few things the app tells the server, for the launch numbers on the
// admin dashboard (the server's routes/events.js): how far onboarding
// goes, picks taken and watched, the morning question answered, the app
// opened. Fire and forget — a lost one doesn't matter, and the server
// keeps one per person, event and day.
export const logEvent = (name) => {
  if (!useAuthStore.getState().token) return;
  api.post("/events", { name }).catch(() => {});
};

// Before there's an account — the welcome screen seen, a sign-in button
// tapped, signed in — counted by a random id this phone makes for itself
// once (nothing about the person). It's what shows how many leave before
// signing in.
const DEVICE_KEY = "board:device-id";
let deviceId = null;
const getDeviceId = async () => {
  if (deviceId) return deviceId;
  deviceId = await AsyncStorage.getItem(DEVICE_KEY).catch(() => null);
  if (!deviceId) {
    deviceId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    await AsyncStorage.setItem(DEVICE_KEY, deviceId).catch(() => {});
  }
  return deviceId;
};

export const logDeviceEvent = (name) => {
  getDeviceId()
    .then((id) => api.post("/device-events", { deviceId: id, name }))
    .catch(() => {});
};
