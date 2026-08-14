// Where each round's recap lives.
//
// One list, because two screens ask the question and they were both guessing.
// They built the URL from the round number and assumed a file was there, but a
// round shows up as soon as it has been SCORED, not when someone writes it up.
// Rounds 8 and 10 were never written, so both screens have been offering a
// recap that does not exist.
//
// That used to 404, which at least looked broken. Since vercel.json started
// serving the app for unmatched paths it quietly returns the app shell instead,
// so the iframe fills with a copy of Formula 5. Hence a real list.
//
// Round 11 is the odd one: its recap is the personalised card deck at /deck,
// not a static page. Anything with no entry here has no recap and gets no
// button.

const STATIC = [1, 2, 3, 4, 5, 6, 7, 9];

export const RECAP_URL = {
  ...Object.fromEntries(STATIC.map(r => [r, `/recaps/round${r}.html`])),
  11: "/deck",
};

/** The recap URL for a round, or null when there isn't one. */
export const recapUrl = (round) => RECAP_URL[round] || null;

/** True when the recap is the card deck rather than a static page. */
export const isDeck = (round) => recapUrl(round) === "/deck";
