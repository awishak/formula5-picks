// How a person's name is written when the whole of it will not fit.
//
// One form: first initial, then the last name. "F. Soldavini". A surname on
// its own is not it, and neither is a first name on its own. Andrew set this
// 2026-08-26 after the standings, and the standings themselves carry the whole
// name because there was room to fit it.
//
// The league is why. Three of the 48 are Ishaks, so "ISHAK" under a bar names
// three different people, and there are two Andrews, so a first name is no
// better. The initial is what separates them.
//
// The two-letter initials drawn inside an avatar with no photo are not this.
// They are a monogram standing in for a face, they never sit next to the name
// they came from, and they are left alone.
//
// Drivers keep their surname. That is how the sport writes them on a timing
// screen and it is what the pick grid, the board and the pools all use.

/** "Francisco Soldavini" -> "F. Soldavini". A single word comes back whole. */
export function shortName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || "";
  // Middle names go. "Andrea Kimi Antonelli" is "A. Antonelli", not "A. K.".
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

/** Roughly how wide a short name is, for laying out a pill before it renders. */
export const shortNameLen = (name) => shortName(name).length;
