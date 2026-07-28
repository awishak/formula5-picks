import { readFileSync, writeFileSync } from "node:fs";
const SP = new URL("./", import.meta.url);
const data = JSON.parse(readFileSync(new URL("chart-data.json", SP), "utf8"));
const raw = JSON.parse(readFileSync(process.env.F5_DATA || (process.env.HOME + "/Downloads/formula5_data_2026-07-27.json"), "utf8"));

// calendar (including Malaysia) is built by prep2.mjs; do not regenerate it here

// trim chart 9 payload: keep what the scatter needs
data.c9 = data.c9.map(p => ({ player:p.player, round:p.round, hours:p.hours, late:p.late, score:p.score }));

const tpl = readFileSync(new URL("template.html", SP), "utf8");
const out = tpl.replace("/*__DATA__*/", JSON.stringify(data));
writeFileSync(new URL("../../public/recaps/round11.html", import.meta.url), out);
console.log("round11.html written,", (out.length/1024).toFixed(0), "KB");
console.log("calendar rounds:", data.cal.map(c=>c.round).join(","));
