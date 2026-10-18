// Clips for Reels — official trailers on YouTube, played through YouTube's
// own embed player (never downloaded or re-hosted). Each plays a window of
// CLIP_SECONDS starting at `start`.
//
// Served by GET /api/movies/reels (with the clips' movies) and loaded by
// services/movieData.js once a day; the list is maintained in the
// backend's data/catalog.json. Any clip that's wrong or taken down just shows "Clip
// unavailable" in the feed.

// [{ movieId, youtubeId, start, end }] — filled in place.
export const REEL_CLIPS = [];

export let CLIP_SECONDS = 30;

export const setReelClips = (clips, clipSeconds) => {
  REEL_CLIPS.splice(0, REEL_CLIPS.length, ...clips);
  if (clipSeconds) CLIP_SECONDS = clipSeconds;
};

export const getYoutubeThumbnail = (youtubeId) =>
  `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
