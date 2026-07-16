// Shared design tokens for the whole app. Import { DARK, BLUE, ... , FD, FB }
// from here instead of redeclaring the palette per file.
export const BG = "#f4f4f6";
export const BG2 = "#ededef";
export const DARK = "#1e1e2a";
export const BLUE = "#6cb8e0";
export const BLUEDARK = "#2a6fa8";
export const GREEN = "#22cc66";
export const RED = "#e04a4a";
export const ORANGE = "#e08a2e";
export const TEXT = "#1e1e2a";
export const TEXT2 = "#6b6b80";
export const BORDER = "#d8d2c4";
export const GOLD = "#c9a820";
export const SILVER = "#a0a0a0";
export const PURPLE = "#7c5cbf";
export const BRONZE = "#CD7F32";

// Fonts
export const FD = "'Geologica', sans-serif"; // display
export const FB = "'DM Sans', sans-serif";   // body

// F1 constructor colors (single source of truth). The ex-Sauber team is keyed
// under both "Audi" and "Sauber" so lookups work whichever label the data uses.
export const F1_TEAM_COLORS = {
  "Red Bull": "#3671C6", "McLaren": "#FF8000", "Ferrari": "#E8002D",
  "Mercedes": "#27F4D2", "Williams": "#64C4FF", "Aston Martin": "#229971",
  "Alpine": "#FF87BC", "Racing Bulls": "#6692FF",
  "Audi": "#52E252", "Sauber": "#52E252",
  "Haas": "#B6BABD", "Cadillac": "#C0C0C0",
};

// Deterministic avatar color: hash a name to one of a fixed, curated palette.
export const AVATAR_COLORS = ["#6cb8e0", "#e08a2e", "#22cc66", "#e04a4a", "#7B2D8E", "#C5A000", "#2a6fa8", "#e06080", "#40b090", "#d06030", "#6080d0", "#b050a0"];
export function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (name || "").charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
