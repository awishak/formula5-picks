// Every song the league has, newest first. The one list: the jukebox popup
// draws it top to bottom, the second deck's playlist is its keys in this
// order, card 1's NEW SONG and the last card's advert both sell SONGS[0], and
// the first deck's TRACKS is the same rows keyed by name. Pure: no React, no
// Supabase, no audio. Adding a song means adding a row at the top and dropping
// the file in public/.
//
//   key      what the decks and ROUND_SONG call it
//   src      the file in public/
//   name     the title, printed as written
//   date     when Andrew dropped the file, which is what "newest" means
//   line     one line under the title, in Andrew's words, or "" until he
//            writes one. Never written here.
//   cover    the album art, if the song has one. A song without one gets a
//            drawn sleeve in the jukebox.
//   review   the advert's one-line review and who wrote it, Andrew's copy or
//            nothing
//   lyrics   the English lyrics, as blocks of lines with a heading each, or
//            nothing when the song has none written down. Kimi El Hijo is sung
//            in Spanish; these are the translation, Andrew's, 2026-10-27.
export const SONGS = [
  {
    key: "kimi",
    src: "/kimi-el-hijo.mp3",
    name: "Kimi El Hijo",
    date: "2026-10-27",
    // No line and no review yet: those are Andrew's to write, never ours
    // (2026-10-27). The row and the advert leave the space empty until he does.
    line: "",
    file: "kimi-el-hijo.mp3",
    lyrics: [
      ["Verse 1", [
        "We’re going to Mexico, my love,",
        "your lips are very pretty,",
        "but Checo is at the back, my racer,",
        "and Kimi, my son, is the fastest little guy.",
        "(Very good, Kimi!)",
      ]],
      ["Chorus", [
        "Run, run, Kimi the Son,",
        "with love and with heart,",
        "I am Toto, your boss, but I love you, mijo,",
        "like a dad, no conditions.",
        "(Let’s go, Kimi!)",
      ]],
      ["Verse 2", [
        "Jorge Russell has",
        "a car that is not good, how sad,",
        "and that idiot Stroll is lost,",
        "(Where is the library?)",
        "he crashes again, how sad.",
        "(Champion! Champion!)",
      ]],
      ["Final Chorus", [
        "Run, run, Kimi the Son,",
        "world champion, yes,",
        "with love and acrobatics he does it,",
        "and nothing more, like that.",
        "(Very pretty! Long live the Son!)",
      ]],
    ],
  },
  {
    // Tubey's song for the United States Grand Prix, round 18. Andrew's file,
    // 2026-10-11, 134 seconds; named by him. The cover is Andrew's artwork,
    // Tubey with a guitar on South Congress, shrunk to a 480px JPEG from the
    // 1024px PNG he sent.
    key: "texas",
    src: "/tubey-texas-time.mp3",
    name: "Tubey Texas Time",
    date: "2026-10-11",
    line: "Live from South Congress, Austin, Texas",
    file: "tubey-texas-time.mp3",
    cover: "/tubey-texas-time.jpg",
    review: { quote: "this actually would make the country charts", by: "Mascot Songs Monthly" },
  },
  {
    // Tubey's song for the Bahlaysian Grand Prix, offered on round 15's last
    // card and left playing over the picker. Named by Andrew 2026-09-28.
    key: "bahlaysia",
    src: "/bahlaysian-gp.mp3",
    name: "Welcome to Bahlaysia!",
    date: "2026-09-28",
    line: "For the Bahrain Grand Prix in Malaysia",
    file: "bahlaysian-gp.mp3",
  },
  {
    // The F5 theme since 2026-09-13: still Velvet Thunder, now featuring Tubey
    // the Worm. Andrew's review: "this song probably doesn't need
    // lyrics--especially these lyrics".
    key: "tubey",
    src: "/tubey-the-worm.mp3",
    name: "Velvet Thunder (feat. Tubey)",
    date: "2026-09-13",
    line: "The F5 theme song, featuring Tubey the Worm",
    file: "tubey-the-worm.mp3",
    review: { quote: "this song probably doesn't need lyrics--especially these lyrics", by: "Andrew" },
  },
  {
    // The original. Written by Andrea Buttacavoli, majority owner of
    // Prestissimo Veloce. Live 2026-08-28.
    key: "velvet",
    src: "/velvet-thunder.mp3",
    name: "Velvet Thunder",
    date: "2026-08-28",
    line: "Written by Andrea Buttacavoli, majority owner of Prestissimo Veloce",
    file: "velvet-thunder.mp3",
  },
];

/** The rows keyed by name, the shape the first deck has always read. */
export const TRACKS = Object.fromEntries(SONGS.map(s => [s.key, s]));

/** The keys, newest first. The second deck's playlist. */
export const PLAYLIST = SONGS.map(s => s.key);

/** The song a src belongs to, or null. themeSong.js knows only the src. */
export const songBySrc = src => SONGS.find(s => s.src === src) || null;
