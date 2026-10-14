import { onlineManager } from "@tanstack/react-query";
import Constants from "expo-constants";
import { AppState } from "react-native";

import { useAuthStore } from "../store/authStore";

// Where the ReelBoard backend lives (see ../Reelboard-backend).
//
// Set EXPO_PUBLIC_API_URL (e.g. in a .env file) to point anywhere. Without
// it, in development the API is assumed to run on the same computer as the
// Expo dev server, port 4000 — using that computer's LAN address, so a real
// phone on the same Wi-Fi reaches it too ("localhost" on a phone is the
// phone itself).
const devApiUrl = () => {
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return host ? `http://${host}:4000/api` : "http://localhost:4000/api";
};

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || devApiUrl()
).replace(/\/$/, "");

const TIMEOUT_MS = 15000;

// `status` is the HTTP status, or 0 when the server couldn't be reached
// (offline, wrong address, timed out) — callers retry those later.
export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const isOfflineError = (error) =>
  error instanceof ApiError && (error.status === 0 || error.status >= 500);

// ---- Online / offline ------------------------------------------------------
//
// TanStack Query pauses queries and queued changes while its onlineManager
// says we're offline, and resumes them when we're back. React Native has no
// built-in network events, so the server itself is the signal: a request
// that can't reach it marks the app offline, and from then on /health is
// polled (and checked whenever the app comes to the front) until it answers.

const PROBE_INTERVAL_MS = 5000;
let probeTimer = null;

const probe = async () => {
  try {
    const response = await fetch(`${API_URL}/health`);
    if (response.ok) setOnline(true);
  } catch {
    // Still offline — try again on the next tick.
  }
};

const setOnline = (online) => {
  if (online) {
    clearInterval(probeTimer);
    probeTimer = null;
  } else if (!probeTimer) {
    probeTimer = setInterval(probe, PROBE_INTERVAL_MS);
  }
  if (onlineManager.isOnline() !== online) onlineManager.setOnline(online);
};

AppState.addEventListener("change", (status) => {
  if (status === "active" && !onlineManager.isOnline()) probe();
});

// ---- Requests --------------------------------------------------------------

// `idempotencyKey`: sent as Idempotency-Key, so the server applies a change
// once however many times it's sent (see services/queryClient.js).
// `etag`: sent as If-None-Match; a 304 then resolves to NOT_MODIFIED.
export const NOT_MODIFIED = Symbol("not modified");

const send = async (
  method,
  path,
  body,
  { token, idempotencyKey, etag } = {},
) => {
  const authToken = token ?? useAuthStore.getState().token;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response;
  try {
    response = await fetch(API_URL + path, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        ...(etag ? { "If-None-Match": etag } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    setOnline(false);
    throw new ApiError("Can't reach the ReelBoard server", 0);
  } finally {
    clearTimeout(timer);
  }
  setOnline(true);
  if (response.status === 304) return { response, data: NOT_MODIFIED };

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    // A rejected token means the session is over — sign out locally so the
    // app stops sending it.
    if (response.status === 401 && authToken && path !== "/auth/login") {
      useAuthStore.getState().clearSession();
    }
    throw new ApiError(
      data?.error?.message ?? `Request failed (${response.status})`,
      response.status,
      data?.error?.details,
    );
  }
  return { response, data };
};

export const request = async (method, path, body, options) =>
  (await send(method, path, body, options)).data;

// A GET that the server can answer with "unchanged": resolves to
// NOT_MODIFIED when `etag` still matches, or { data, etag } otherwise.
export const requestIfChanged = async (path, etag) => {
  const { response, data } = await send("GET", path, undefined, { etag });
  return data === NOT_MODIFIED
    ? NOT_MODIFIED
    : { data, etag: response.headers.get("etag") };
};

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body ?? {}),
  put: (path, body) => request("PUT", path, body ?? {}),
  patch: (path, body) => request("PATCH", path, body ?? {}),
  delete: (path, body) => request("DELETE", path, body),
};

export default api;
