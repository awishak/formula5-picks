import { createClient } from "@supabase/supabase-js";

// Single shared Supabase client for the whole app. Import { supabase } from here
// instead of calling createClient() per file (avoids many independent clients).
// import.meta.env only exists under Vite. scripts/smoke.jsx bundles this file
// for Node through esbuild, where it is undefined, and reading a key off it
// threw before the first component rendered.
const env = (typeof import.meta !== "undefined" && import.meta.env) || {};

export const supabase = createClient(
  env.VITE_SUPABASE_URL || "http://localhost",
  env.VITE_SUPABASE_ANON_KEY || "anon"
);

// Every row of a table, read in pages.
//
// Supabase hands back at most 1,000 rows a request and says nothing about the
// rest. picks passed 1,000 in round 21 (48 players, 21 rounds) and Admin's
// missing-picks list started naming people who had picked; scores passes it
// one round later. Any read of a whole season-long table goes through here.
// Ordered on id so the pages cannot overlap or skip. Resolves to the same
// { data, error } shape as a query, so it drops into a Promise.all.
const PAGE = 1000;
export async function selectAll(table, columns = "*") {
  const rows = [];
  for (let page = 0; page < 50; page++) {
    const { data, error } = await supabase.from(table).select(columns)
      .order("id").range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) return { data: null, error };
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return { data: rows, error: null };
}
