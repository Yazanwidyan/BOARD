import { Platform, Share } from "react-native";

import { api } from "./api";

// Shares a link to a ReelBoard page anyone can open in a browser — a movie,
// a collection, your list or your profile (the server makes it: POST
// /api/shares). `type`: "movie" | "collection" | "list" | "profile"; `id`:
// what (not for your profile); `message`: the words that go with it.
// Without a connection, the words go alone.
export const shareLink = async ({ type, id, message }) => {
  let url = null;
  try {
    url = (await api.post("/shares", { type, ...(id ? { id } : {}) })).url;
  } catch {
    url = null;
  }
  // iOS takes the link separately (it previews it); Android only reads
  // the message, so it goes in there.
  return Share.share(
    Platform.OS === "ios" && url
      ? { message, url }
      : { message: url ? `${message}\n${url}` : message },
  );
};
