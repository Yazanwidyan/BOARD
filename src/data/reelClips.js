import { MOVIES } from "./movies";

// PROTOTYPE clip list for Reels — official trailers on YouTube, played
// through YouTube's own embed player (never downloaded or re-hosted).
// Each entry plays a ~30-second window starting at `start` seconds.
//
// Hand-picked IDs: any that's wrong or gets taken down just shows "Clip
// unavailable" in the feed. For the full catalog, replace this file with
// trailer keys from a data source like TMDB (/movie/{id}/videos).
const CLIPS = [
  ["Inception", "YoHD9XEInc0", 20],
  ["The Dark Knight", "EXeTwQWrcwY", 15],
  ["Interstellar", "zSWdZVtXT7E", 30],
  ["The Matrix", "vKQi3bBA1y8", 20],
  ["Parasite", "5xH0HfJHsaY", 15],
  ["Pulp Fiction", "s7EdQ4FqbhY", 10],
  ["Fight Club", "SUXWAEX2jlg", 10],
  ["The Shawshank Redemption", "6hB3S9bIaco", 15],
  ["The Godfather", "sY1S34973zA", 10],
  ["Whiplash", "7d_jQycdQGo", 10],
  ["Mad Max: Fury Road", "hEJnMQG9ev8", 20],
  ["Get Out", "DzfpyUB60YY", 15],
  ["Spirited Away", "ByXuk9QqQkk", 10],
  ["Dune", "8g18jFHCLXk", 30],
  ["La La Land", "0pdqf4P9MB8", 10],
  ["Arrival", "tFMo3UJ4B4g", 20],
  ["Spider-Man: Into the Spider-Verse", "g4Hbz2jLxvQ", 15],
  ["Everything Everywhere All at Once", "wxN1T1uxQ2g", 15],
];

export const CLIP_SECONDS = 30;

// [{ movieId, youtubeId, start, end }] — only movies found in the catalog.
export const REEL_CLIPS = CLIPS.map(([title, youtubeId, start]) => {
  const movie = MOVIES.find((item) => item.title === title);
  return movie
    ? { movieId: movie.id, youtubeId, start, end: start + CLIP_SECONDS }
    : null;
}).filter(Boolean);

export const getYoutubeThumbnail = (youtubeId) =>
  `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
