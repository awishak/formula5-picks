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
