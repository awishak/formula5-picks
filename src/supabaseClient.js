import { createClient } from "@supabase/supabase-js";

// Single shared Supabase client for the whole app. Import { supabase } from here
// instead of calling createClient() per file (avoids many independent clients).
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
