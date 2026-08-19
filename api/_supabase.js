// Supabase over REST, for the cron functions.
//
// The anon key is enough: Admin writes driver pools from the browser with it,
// so RLS already allows the update these jobs make. That is the whole reason
// this needs no service-role key and no new secret.
const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_ANON_KEY;

const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

export const ready = () => Boolean(URL && KEY);

export async function select(path) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers: H });
  if (!r.ok) throw new Error(`select ${path} -> ${r.status} ${await r.text()}`);
  return r.json();
}

// Always returns the rows it changed. A policy mismatch swallows a write with
// no error otherwise, which is a known way to lose a change here silently.
export async function patch(path, body) {
  const r = await fetch(`${URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`patch ${path} -> ${r.status} ${await r.text()}`);
  return r.json();
}

export async function upsert(path, rows, onConflict) {
  const r = await fetch(`${URL}/rest/v1/${path}${onConflict ? `?on_conflict=${onConflict}` : ""}`, {
    method: "POST",
    headers: { ...H, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`upsert ${path} -> ${r.status} ${await r.text()}`);
  return r.json();
}

// Vercel signs its cron calls with this header. CRON_SECRET, when set, lets the
// same endpoint be triggered by hand without opening it to the world.
export function authorized(req) {
  if (req.headers["x-vercel-cron"]) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.authorization === `Bearer ${secret}`;
}
