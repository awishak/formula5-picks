import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";

// Load env from the pulled file (values never printed)
const env = Object.fromEntries(
  readFileSync("scratch.env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      let v = l.slice(i + 1).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      return [l.slice(0, i).trim(), v];
    })
);

const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_ANON_KEY;
if (!URL || !KEY) throw new Error("Missing Supabase env vars");

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// 1. Fetch name + photo_url for all players
const res = await fetch(
  `${URL}/rest/v1/players?select=name,photo_url`,
  { headers }
);
if (!res.ok) throw new Error(`players query failed: ${res.status} ${await res.text()}`);
const players = await res.json();

const outDir = resolve("avatars");
mkdirSync(outDir, { recursive: true });

const sanitize = (n) => n.replace(/[\/\\:*?"<>|]/g, "-").trim();

let downloaded = 0;
const skipped = [];
for (const p of players) {
  if (!p.photo_url) {
    skipped.push(p.name);
    continue;
  }
  try {
    const imgRes = await fetch(p.photo_url);
    if (!imgRes.ok) {
      skipped.push(`${p.name} (HTTP ${imgRes.status})`);
      continue;
    }
    const ct = imgRes.headers.get("content-type") || "";
    let ext = extname(new globalThis.URL(p.photo_url).pathname);
    if (!ext) ext = ct.includes("png") ? ".png" : ct.includes("webp") ? ".webp" : ".jpg";
    const buf = Buffer.from(await imgRes.arrayBuffer());
    writeFileSync(resolve(outDir, `${sanitize(p.name)}${ext}`), buf);
    downloaded++;
  } catch (e) {
    skipped.push(`${p.name} (${e.message})`);
  }
}

console.log(`Total players: ${players.length}`);
console.log(`Downloaded: ${downloaded}`);
if (skipped.length) {
  console.log(`No avatar / failed (${skipped.length}):`);
  for (const s of skipped) console.log(`  - ${s}`);
}
