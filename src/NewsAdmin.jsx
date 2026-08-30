import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
// The Vegas kit under the names this file already uses, the same remap Admin
// takes. DARK is heading ink and a faint tint in the same file, and V.text is
// both on a dark ground.
import { V, FD as FD_V, FB as FB_V } from "./theme.vegas";
const DARK = V.text;
const BLUE = V.blue, BLUEDARK = V.blueDim;
const GREEN = V.green, RED = V.pink, ORANGE = V.amber;
const TEXT = V.text, TEXT2 = V.text2, BORDER = V.border;
const FD = FD_V, FB = FB_V;
const SURFACE = V.bg2, ONNEON = V.bg;
import { NEWS } from "./news";

// Prose blocks are editable as plain fields. Matchup blocks expose the parts
// worth rewording (tag, what they're playing for, the bullets). Charts are data,
// not prose, so they get a raw JSON escape hatch rather than a fake form.
const PROSE = { p: "Paragraph", h: "Section header", sub: "Subheader", note: "Callout" };

const inp = { width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontFamily: FB, fontSize: 13, color: TEXT, background: SURFACE, outline: "none", boxSizing: "border-box" };
const lbl = { fontFamily: FD, fontWeight: 700, fontSize: 10, color: TEXT2, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", margin: "10px 0 4px" };
const btn = (bg) => ({ padding: "8px 12px", borderRadius: 8, border: "none", background: bg, color: ONNEON, fontFamily: FD, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer" });

function Textarea({ value, onChange, rows = 3 }) {
  return <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} />;
}

// Bullet points edited as one blank-line-separated string. The raw text is held
// here and split without trimming or filtering, so typing a space or opening a
// new line is never undone mid-keystroke. Cleanup happens once, on save.
function NotesEditor({ initial, onChange }) {
  const [text, setText] = useState((initial || []).join("\n\n"));
  return (
    <Textarea rows={6} value={text} onChange={v => { setText(v); onChange(v.split(/\n\s*\n/)); }} />
  );
}

function BlockEditor({ block, onChange, onDelete, onMove, index, total }) {
  const [rawErr, setRawErr] = useState("");
  const isProse = !!PROSE[block.t];
  const isMatchup = block.t === "m";

  const set = (k, v) => onChange({ ...block, [k]: v });
  const setTeam = (i, k, v) => {
    const teams = block.teams.map((t, j) => j === i ? { ...t, [k]: v } : t);
    onChange({ ...block, teams });
  };

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px", marginBottom: 10, background: SURFACE }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 10, color: BLUEDARK, textTransform: "uppercase", letterSpacing: "0.07em", flex: 1 }}>
          {PROSE[block.t] || (isMatchup ? `Matchup — ${block.title}` : `Chart (${block.t})`)}
        </span>
        <button onClick={() => onMove(index, -1)} disabled={index === 0} style={{ ...btn(index === 0 ? BORDER : TEXT2), padding: "4px 8px" }}>↑</button>
        <button onClick={() => onMove(index, 1)} disabled={index === total - 1} style={{ ...btn(index === total - 1 ? BORDER : TEXT2), padding: "4px 8px" }}>↓</button>
        <button onClick={() => { if (window.confirm("Delete this block?")) onDelete(index); }} style={{ ...btn(RED), padding: "4px 8px" }}>×</button>
      </div>

      {isProse && (
        <>
          {block.t === "note" && (
            <>
              <label style={lbl}>Callout title</label>
              <input style={inp} value={block.title || ""} onChange={e => set("title", e.target.value)} />
            </>
          )}
          <label style={lbl}>Text</label>
          <Textarea value={block.text || ""} onChange={v => set("text", v)} rows={block.t === "p" || block.t === "note" ? 4 : 1} />
        </>
      )}

      {isMatchup && (
        <>
          <label style={lbl}>Matchup title</label>
          <input style={inp} value={block.title || ""} onChange={e => set("title", e.target.value)} />
          <label style={lbl}>Side story (optional)</label>
          <Textarea value={block.story?.text || ""} onChange={v => set("story", { ...(block.story || {}), text: v })} rows={3} />
          {block.teams.map((tm, i) => (
            <div key={i} style={{ borderLeft: `3px solid ${BLUE}`, paddingLeft: 10, marginTop: 12 }}>
              <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 12, color: DARK, margin: 0 }}>{tm.label || tm.name}</p>
              <label style={lbl}>Playing for</label>
              <input style={inp} value={tm.playing || ""} onChange={e => setTeam(i, "playing", e.target.value)} />
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Status chip</label>
                  <input style={inp} value={tm.tag || ""} onChange={e => setTeam(i, "tag", e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Tone</label>
                  <select style={inp} value={tm.tone || "warn"} onChange={e => setTeam(i, "tone", e.target.value)}>
                    <option value="good">good (green)</option>
                    <option value="warn">warn (orange)</option>
                    <option value="bad">bad (red)</option>
                    <option value="dead">dead (grey)</option>
                  </select>
                </div>
              </div>
              <label style={lbl}>Points below the box — leave a blank line between each</label>
              <NotesEditor initial={tm.notes} onChange={arr => setTeam(i, "notes", arr)} />
            </div>
          ))}
        </>
      )}

      {!isProse && !isMatchup && (
        <>
          <label style={lbl}>Raw JSON — this block is data, edit with care</label>
          <Textarea rows={8}
            value={block.__raw !== undefined ? block.__raw : JSON.stringify(block, null, 1)}
            onChange={v => {
              try { const parsed = JSON.parse(v); setRawErr(""); onChange({ ...parsed, __raw: v }); }
              catch (e) { setRawErr(e.message); onChange({ ...block, __raw: v }); }
            }} />
          {rawErr && <p style={{ fontFamily: FB, fontSize: 11, color: RED, margin: "4px 0 0" }}>Invalid JSON: {rawErr}</p>}
        </>
      )}
    </div>
  );
}

export default function NewsAdmin() {
  const [stories, setStories] = useState([]);
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [missingTable, setMissingTable] = useState(false);

  async function load() {
    const { data, error } = await supabase.from("news").select("*").order("published_date", { ascending: false });
    if (error) {
      // 42P01 = relation does not exist
      if (String(error.message).includes("does not exist") || error.code === "42P01") setMissingTable(true);
      else setStatus("Error: " + error.message);
      return;
    }
    setMissingTable(false);
    setStories(data || []);
  }
  useEffect(() => { load(); }, []);

  function edit(s) {
    setSel(s.id);
    let k = 0;
    setDraft({ ...s, body: (JSON.parse(JSON.stringify(s.body || []))).map(b => ({ ...b, __k: ++k })) });
    setStatus("");
  }

  async function seedFromCode() {
    if (!window.confirm("Import the story currently hardcoded in news.js into the database? It will be created as a draft.")) return;
    setBusy(true);
    const s = NEWS[0];
    const row = {
      slug: s.id, headline: s.headline, dek: s.dek, author: s.author,
      author_type: s.authorType, published_date: s.date, body: s.body, is_published: false
    };
    const { data, error } = await supabase.from("news").insert(row).select();
    setBusy(false);
    if (error) return setStatus("Error: " + error.message);
    if (!data || !data.length) return setStatus("Error: insert returned no rows — check the RLS policy on news.");
    setStatus("Imported as a draft. Edit it, then publish.");
    load();
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    const body = (draft.body || []).map(b => {
      const { __raw, __k, ...rest } = b;
      if (rest.teams) rest.teams = rest.teams.map(t => ({ ...t, notes: (t.notes || []).map(x => x.trim()).filter(Boolean) }));
      return rest;
    });
    const { data, error } = await supabase.from("news").update({
      headline: draft.headline, dek: draft.dek, author: draft.author,
      author_type: draft.author_type, published_date: draft.published_date,
      body, is_published: draft.is_published
    }).eq("id", draft.id).select();
    setBusy(false);
    if (error) return setStatus("Error: " + error.message);
    if (!data || !data.length) return setStatus("Error: update returned no rows — check the RLS policy on news.");
    setStatus("Saved.");
    load();
  }

  const setB = (i, b) => setDraft({ ...draft, body: draft.body.map((x, j) => j === i ? b : x) });
  const delB = (i) => setDraft({ ...draft, body: draft.body.filter((_, j) => j !== i) });
  const moveB = (i, d) => {
    const b = [...draft.body], j = i + d;
    if (j < 0 || j >= b.length) return;
    [b[i], b[j]] = [b[j], b[i]];
    setDraft({ ...draft, body: b });
  };
  const addB = (t) => setDraft({ ...draft, body: [...draft.body, { ...(t === "note" ? { t, title: "", text: "" } : { t, text: "" }), __k: Date.now() }] });

  if (missingTable) return (
    <div style={{ border: `1px solid ${ORANGE}`, background: `${ORANGE}12`, borderRadius: 10, padding: "14px 16px" }}>
      <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 13, color: DARK, margin: "0 0 6px" }}>The news table does not exist yet</p>
      <p style={{ fontFamily: FB, fontSize: 12.5, color: TEXT, lineHeight: 1.6, margin: 0 }}>
        Run <code>sql/001_news_table.sql</code> in the Supabase SQL editor, then reload this page.
        Until then the site keeps serving the story hardcoded in <code>news.js</code>, so nothing is broken.
      </p>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <p style={{ fontFamily: FB, fontSize: 13, color: TEXT2, flex: 1, margin: 0 }}>
          {stories.length} {stories.length === 1 ? "story" : "stories"}. Unpublished stories are not visible on the Garage.
        </p>
        <button onClick={seedFromCode} disabled={busy} style={btn(TEXT2)}>Import from code</button>
      </div>

      {stories.map(s => (
        <div key={s.id} style={{ border: `1px solid ${sel === s.id ? BLUE : BORDER}`, borderRadius: 10, padding: "10px 12px", marginBottom: 8, background: SURFACE }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: FD, fontWeight: 800, fontSize: 13, color: DARK, margin: 0 }}>{s.headline}</p>
              <p style={{ fontFamily: FB, fontSize: 11, color: TEXT2, margin: "2px 0 0" }}>
                {s.published_date} · {s.author} · {(s.body || []).length} blocks
              </p>
            </div>
            <span style={{ fontFamily: FD, fontWeight: 800, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.06em", padding: "3px 7px", borderRadius: 5, color: s.is_published ? GREEN : ORANGE, background: s.is_published ? `${GREEN}18` : `${ORANGE}18` }}>
              {s.is_published ? "Live" : "Draft"}
            </span>
            <button onClick={() => (sel === s.id ? (setSel(null), setDraft(null)) : edit(s))} style={btn(BLUEDARK)}>
              {sel === s.id ? "Close" : "Edit"}
            </button>
          </div>

          {sel === s.id && draft && (
            <div style={{ marginTop: 14, borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
              <label style={lbl}>Headline</label>
              <input style={inp} value={draft.headline} onChange={e => setDraft({ ...draft, headline: e.target.value })} />
              <label style={lbl}>Standfirst</label>
              <Textarea value={draft.dek || ""} onChange={v => setDraft({ ...draft, dek: v })} rows={2} />
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 2 }}>
                  <label style={lbl}>Author</label>
                  <input style={inp} value={draft.author} onChange={e => setDraft({ ...draft, author: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Avatar</label>
                  <select style={inp} value={draft.author_type} onChange={e => setDraft({ ...draft, author_type: e.target.value })}>
                    <option value="human">Player photo</option>
                    <option value="auto">F5 logo</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Date</label>
                  <input type="date" style={inp} value={draft.published_date} onChange={e => setDraft({ ...draft, published_date: e.target.value })} />
                </div>
              </div>

              <label style={lbl}>Body — {draft.body.length} blocks</label>
              {draft.body.map((b, i) => (
                <BlockEditor key={b.__k ?? i} block={b} index={i} total={draft.body.length}
                  onChange={nb => setB(i, nb)} onDelete={delB} onMove={moveB} />
              ))}

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {Object.entries(PROSE).map(([t, label]) => (
                  <button key={t} onClick={() => addB(t)} style={btn(TEXT2)}>+ {label}</button>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, paddingTop: 12, borderTop: `1px solid ${BORDER}` }}>
                <label style={{ fontFamily: FB, fontSize: 13, color: TEXT, display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                  <input type="checkbox" checked={draft.is_published} onChange={e => setDraft({ ...draft, is_published: e.target.checked })} />
                  Published on the Garage
                </label>
                <button onClick={save} disabled={busy} style={btn(busy ? BORDER : GREEN)}>{busy ? "Saving…" : "Save"}</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {status && (
        <p style={{ fontFamily: FB, fontSize: 12, textAlign: "center", margin: "12px 0 0", color: status.startsWith("Error") ? RED : GREEN }}>{status}</p>
      )}
    </div>
  );
}
