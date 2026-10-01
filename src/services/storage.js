import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEYS = {
  ONBOARDING: "board:onboarding",
  PREFERENCES: "board:preferences",
  MOVIE_STORE: "board:movie-store",
  SESSION_STORE: "board:session-store",
};

export const loadJSON = async (key, fallback = null) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
};

export const saveJSON = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
};

export const removeKey = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    return false;
  }
};
