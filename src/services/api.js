import Constants from "expo-constants";

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

export const request = async (method, path, body, { token } = {}) => {
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
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError("Can't reach the ReelBoard server", 0);
  } finally {
    clearTimeout(timer);
  }

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
  return data;
};

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body ?? {}),
  put: (path, body) => request("PUT", path, body ?? {}),
  patch: (path, body) => request("PATCH", path, body ?? {}),
  delete: (path, body) => request("DELETE", path, body),
};

export default api;
