import { api } from "./api";

// Movie night across phones (the backend's /api/movie-nights). Each call
// resolves to the night as this person sees it:
//   { id, code, isHost, movieIds, status, members: [{ user, isHost, done }],
//     me: { kept, done }, results: null | { matches, counts, voters, everyoneDone } }
// Other people's picks stay hidden until `results` arrives.

const night = async (request) => (await request).night;

export const createMovieNight = (movieIds) =>
  night(api.post("/movie-nights", { movieIds }));

export const joinMovieNight = (code) =>
  night(api.post("/movie-nights/join", { code: code.trim().toUpperCase() }));

export const getMovieNight = (id) => night(api.get(`/movie-nights/${id}`));

export const sendMovieNightPicks = (id, kept) =>
  night(api.put(`/movie-nights/${id}/picks`, { kept }));

export const endMovieNight = (id) => night(api.post(`/movie-nights/${id}/close`));

export const leaveMovieNight = (id) => api.delete(`/movie-nights/${id}/members/me`);

// The link a friend can tap to open the app straight into the room
// (see the linking config in navigation/AppNavigator.js).
export const movieNightLink = (code) => `reelboard://night/${code}`;
