// Nationality, for players and for teams. Single source of truth, the way
// drivers.js is for drivers and teams.js is for team identity.
//
// Every player and every team is American until Andrew says otherwise. That is
// a placeholder, not a claim: the map is here so the flags have somewhere to
// come from and so changing one is a one-line edit rather than a hunt through
// components.
//
// A team's nationality is its own entry rather than something inferred from its
// two players, because a team can be named for one place and rostered from
// another.

// The flags the league is likely to need. Each is drawn from plain shapes so it
// scales cleanly at 16px and needs no image request.
export const NATIONS = {
  US: { name: "United States", short: "USA" },
  GB: { name: "United Kingdom", short: "GBR" },
  CA: { name: "Canada", short: "CAN" },
  MX: { name: "Mexico", short: "MEX" },
  BR: { name: "Brazil", short: "BRA" },
  NL: { name: "Netherlands", short: "NED" },
  IT: { name: "Italy", short: "ITA" },
  FR: { name: "France", short: "FRA" },
  DE: { name: "Germany", short: "GER" },
  ES: { name: "Spain", short: "ESP" },
  AU: { name: "Australia", short: "AUS" },
  JP: { name: "Japan", short: "JPN" },
  EG: { name: "Egypt", short: "EGY" },
  IN: { name: "India", short: "IND" },
  PH: { name: "Philippines", short: "PHI" },
};

export const DEFAULT_NATION = "US";

// Overrides go here. An empty map means everybody is on the default, which is
// where the league starts.
export const PLAYER_NATIONS = {};
export const TEAM_NATIONS = {};

export const nationOf = name => PLAYER_NATIONS[name] || DEFAULT_NATION;
export const teamNationOf = name => TEAM_NATIONS[name] || DEFAULT_NATION;
export const nationName = code => (NATIONS[code] || NATIONS[DEFAULT_NATION]).name;
export const nationShort = code => (NATIONS[code] || NATIONS[DEFAULT_NATION]).short;
