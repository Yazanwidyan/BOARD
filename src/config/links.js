// Where people get ReelBoard — printed on the shared taste cards and added
// to what's shared with them. Set EXPO_PUBLIC_APP_URL (a short link that
// sends each phone to its store, e.g. https://reelboard.app) once the store
// listings exist; until then the cards carry your handle and the name only.
export const APP_URL = (process.env.EXPO_PUBLIC_APP_URL || "").replace(/\/$/, "") || null;

// The link as it reads on an image: no "https://".
export const APP_URL_LABEL = APP_URL ? APP_URL.replace(/^https?:\/\//, "") : null;

// Words to share, with the link to get the app when there is one.
export const withAppLink = (message) => (APP_URL ? `${message}\n${APP_URL}` : message);
