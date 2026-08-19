// Canonical team identity. Names, short names, three-letter codes.
//
// Single source of truth for anything team-shaped, the same way drivers.js is
// for anything driver-shaped. Three names per team, each with a job:
//
//   name   what the team is called. Matches teams.name in Supabase exactly.
//   short  for tight spots: the promotion board, the division list, fixtures.
//   code   three letters, for URLs (/teams/CAR) and anywhere a name cannot fit.
//
// Codes were set by Andrew on 2026-08-18. They are part of the URL scheme now,
// so changing one breaks a link somebody has.
export const TEAMS = [
  { code: "VAN", name: "Van City Corsa", short: "Van City" },
  { code: "XRT", name: "XLIX Racing Team", short: "XLIX Racing" },
  { code: "TEX", name: "Drivetex", short: "Drivetex" },
  { code: "HWT", name: "HomeworkTubes.Com", short: "HomeworkTubes" },
  { code: "CAR", name: "Cal Aggie Racing", short: "Cal Aggie" },
  { code: "EBR", name: "East Bay Racing", short: "East Bay" },
  { code: "JSV", name: "Juicero Silicon Valley", short: "Juicero SV" },
  { code: "CSC", name: "Cascadia Motorsport", short: "Cascadia" },
  { code: "PEL", name: "Peloton Aubergine", short: "Peloton" },
  { code: "COU", name: "Cougar Autosport", short: "Cougar Auto" },
  { code: "MEA", name: "Meatballs", short: "Meatballs" },
  { code: "TNT", name: "TNT Roku F5 Team", short: "TNT Roku" },
  { code: "ECR", name: "El Camino Rapido", short: "El Camino" },
  { code: "STL", name: "Stalloni 1851", short: "Stalloni" },
  { code: "GAR", name: "Garra Dynamics", short: "Garra" },
  { code: "WLD", name: "Wildcat Motors", short: "Wildcat" },
  { code: "TJP", name: "TJ Premium", short: "TJ Premium" },
  { code: "BRO", name: "Bronco SCUderia", short: "Bronco" },
  { code: "SHO", name: "Shoey Time! w/ Max and Danny", short: "Shoey Time!" },
  { code: "MKR", name: "Magic Kingdom Racing", short: "Magic Kingdom" },
  { code: "LUX", name: "Luxor Motorsport", short: "Luxor" },
  { code: "PRS", name: "Prestissimo Veloce", short: "Prestissimo" },
  { code: "AGS", name: "Aggie Slipstream", short: "AgSlipstream" },
  { code: "ISK", name: "Scuderia Iskandaraya", short: "Iskandaraya" },
];

export const TEAM_BY_CODE = Object.fromEntries(TEAMS.map(t => [t.code, t]));
export const TEAM_BY_NAME = Object.fromEntries(TEAMS.map(t => [t.name, t]));

export const codeOf = (name) => (TEAM_BY_NAME[name] || {}).code || null;
export const shortOf = (name) => (TEAM_BY_NAME[name] || {}).short || name;
export const nameOfCode = (code) => (TEAM_BY_CODE[String(code || "").toUpperCase()] || {}).name || null;
