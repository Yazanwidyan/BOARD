// A Letterboxd export, read on the phone. Letterboxd (Settings → Data →
// Export your data) gives a zip of CSVs; the ones that matter here:
//   watched.csv    Date, Name, Year, Letterboxd URI
//   diary.csv      … plus Rating, Rewatch, Tags, Watched Date
//   ratings.csv    Date, Name, Year, Letterboxd URI, Rating (0.5–5)
//   watchlist.csv  Date, Name, Year, Letterboxd URI
// The server matches each film by title and year (POST
// /api/me/import/letterboxd); this only turns the files into rows.

// RFC 4180-ish: quoted fields, "" inside quotes, CRLF or LF.
export const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
};

// "2023-04-18" → its time (UTC midnight), or null.
const toTime = (value) => {
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) ? time : null;
};

// A file's rows as objects, by its header's column names.
const readRows = (text) => {
  const [header = [], ...rows] = parseCsv(text.replace(/^﻿/, ""));
  const names = header.map((name) => name.trim());
  return rows.map((values) => Object.fromEntries(names.map((name, i) => [name, (values[i] ?? "").trim()])));
};

// `files`: [{ name, text }]. Returns { watched: [{ title, year, stars,
// watchedAt }], watchlist: [{ title, year, addedAt }] } — each film once,
// with its rating from whichever file has one and its earliest date.
export const readLetterboxdExport = (files) => {
  const watched = new Map();
  const watchlist = new Map();
  const keyOf = (title, year) => `${title.toLowerCase()}|${year ?? ""}`;

  files.forEach(({ name, text }) => {
    const isWatchlist = /watchlist/i.test(name);
    readRows(text).forEach((row) => {
      const title = row.Name;
      if (!title) return;
      const year = Number.parseInt(row.Year, 10) || null;
      const key = keyOf(title, year);
      const date = toTime(row["Watched Date"]) ?? toTime(row.Date);
      if (isWatchlist) {
        if (!watchlist.has(key)) watchlist.set(key, { title, year, addedAt: date });
        return;
      }
      const stars = Number.parseFloat(row.Rating) || null;
      const entry = watched.get(key) ?? { title, year, stars: null, watchedAt: null };
      if (stars) entry.stars = stars;
      if (date && (!entry.watchedAt || date < entry.watchedAt)) entry.watchedAt = date;
      watched.set(key, entry);
    });
  });

  // A film you've watched isn't one you're saving for later.
  watched.forEach((_, key) => watchlist.delete(key));
  return { watched: [...watched.values()], watchlist: [...watchlist.values()] };
};
