import { MOVIES } from "./movies";

// MOCK DATA — friends and their activity, until there's a real backend.
// Everything Friends / Activity shows comes from here; nothing is sent
// anywhere. Movies are referenced by title and resolved against the
// catalog (anything not found is skipped).

const byTitle = (title) => MOVIES.find((movie) => movie.title === title);

const tiers = (list) =>
  list
    .map(([title, tier]) => {
      const movie = byTitle(title);
      return movie ? { movieId: movie.id, tier } : null;
    })
    .filter(Boolean);

const HOUR = 60 * 60 * 1000;

export const MOCK_FRIENDS = [
  {
    id: "f1",
    name: "Sam Rivera",
    handle: "@samr",
    color: "#8FD3F5",
    level: 18,
    watched: tiers([
      ["Inception", "S"],
      ["The Dark Knight", "S"],
      ["Interstellar", "A"],
      ["Mad Max: Fury Road", "A"],
      ["The Matrix", "S"],
      ["Blade Runner", "B"],
      ["Arrival", "A"],
      ["Dune", "A"],
      ["Titanic", "D"],
      ["Gladiator", "B"],
      ["Alien", "A"],
      ["Memento", "A"],
    ]),
  },
  {
    id: "f3",
    name: "Omar Saleh",
    handle: "@omar",
    color: "#F8E08E",
    level: 31,
    watched: tiers([
      ["The Godfather", "S"],
      ["Goodfellas", "S"],
      ["Pulp Fiction", "A"],
      ["Heat", "A"],
      ["No Country for Old Men", "S"],
      ["There Will Be Blood", "A"],
      ["Zodiac", "A"],
      ["Se7en", "A"],
      ["Casablanca", "B"],
      ["Psycho", "B"],
      ["Jaws", "C"],
      ["The Social Network", "B"],
    ]),
  },
  {
    id: "f4",
    name: "Maya Chen",
    handle: "@mayac",
    color: "#A4E59B",
    level: 9,
    watched: tiers([
      ["Parasite", "S"],
      ["Get Out", "S"],
      ["Knives Out", "A"],
      ["Everything Everywhere All at Once", "S"],
      ["Whiplash", "A"],
      ["Prisoners", "B"],
      ["The Truman Show", "A"],
    ]),
  },
  {
    id: "f5",
    name: "Jonah Brooks",
    handle: "@jonahb",
    color: "#D6BBFF",
    level: 14,
    watched: tiers([
      ["The Lord of the Rings: The Fellowship of the Ring", "S"],
      ["The Lord of the Rings: The Two Towers", "S"],
      ["The Lord of the Rings: The Return of the King", "S"],
      ["Back to the Future", "A"],
      ["Spider-Man: Into the Spider-Verse", "A"],
      ["Toy Story", "A"],
      ["The Matrix", "B"],
      ["Gladiator", "A"],
    ]),
  },
  {
    id: "f6",
    name: "Noor Aziz",
    handle: "@noor",
    color: "#F5B98F",
    level: 6,
    watched: tiers([
      ["The Shawshank Redemption", "S"],
      ["Interstellar", "A"],
      ["Coco", "A"],
      ["Whiplash", "B"],
      ["La La Land", "C"],
    ]),
  },
];

export const getMockFriend = (id) =>
  MOCK_FRIENDS.find((friend) => friend.id === id) ?? null;

// The feed. `hoursAgo` is turned into a timestamp when read, so the mock
// always looks recent.
const RAW_ACTIVITY = [
  { friendId: "f1", type: "watched", title: "Dune", hoursAgo: 3 },
  {
    friendId: "f5",
    type: "set",
    set: "The Lord of the Rings",
    count: 3,
    hoursAgo: 5,
  },
  {
    friendId: "f4",
    type: "tier",
    title: "Everything Everywhere All at Once",
    tier: "S",
    hoursAgo: 8,
  },
  { friendId: "f3", type: "badge", badge: "Cinephile", hoursAgo: 11 },
  { friendId: "f6", type: "watchlist", title: "Interstellar", hoursAgo: 20 },
  { friendId: "f1", type: "tier", title: "Titanic", tier: "D", hoursAgo: 30 },
  {
    friendId: "f3",
    type: "set",
    set: "Martin Scorsese",
    count: 4,
    hoursAgo: 44,
  },
  { friendId: "f4", type: "badge", badge: "Rising Critic", hoursAgo: 70 },
  {
    friendId: "f5",
    type: "tier",
    title: "Spider-Man: Into the Spider-Verse",
    tier: "A",
    hoursAgo: 96,
  },
  {
    friendId: "f6",
    type: "tier",
    title: "The Shawshank Redemption",
    tier: "S",
    hoursAgo: 120,
  },
  { friendId: "f3", type: "watchlist", title: "Parasite", hoursAgo: 170 },
  { friendId: "f1", type: "badge", badge: "Film Fan", hoursAgo: 220 },
];

export const getMockActivity = (now = Date.now()) =>
  RAW_ACTIVITY.map((event, index) => {
    const movie = event.title ? byTitle(event.title) : null;
    return {
      ...event,
      id: `a${index}`,
      movieId: movie?.id ?? null,
      timestamp: now - event.hoursAgo * HOUR,
      friend: getMockFriend(event.friendId),
    };
  }).filter((event) => event.friend && (!event.title || event.movieId));
