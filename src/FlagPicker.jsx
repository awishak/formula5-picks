// Choosing a flag.
//
// 323 options is too many to scroll, so the list is searchable and the search
// is the primary control rather than an afterthought. Typing "eg" finds Egypt,
// typing "texas" finds Texas, typing nothing shows everything under headings.
//
// Every row carries the flag AND the name. A grid of flags on their own is a
// quiz: half the world's tricolours differ by one stripe.
import { useState, useMemo, useEffect, useRef } from "react";
import { V, FD, FB, display, body, label as labelType, card, edgeGlow } from "./theme.vegas";
import { GROUPS, NAME_OF } from "./nationList.js";
import Flag from "./Flag.jsx";

/**
 * @param value    current code, "" for no flag, null for never chosen
 * @param onPick   called with the new code
 * @param onClose  called when the sheet should go away
 * @param title    what is being changed, so the sheet says whose flag it is
 */
export default function FlagPicker({ value, onPick, onClose, title = "Choose a flag" }) {
  const [q, setQ] = useState("");
  const box = useRef(null);
  const input = useRef(null);

  useEffect(() => { if (input.current) input.current.focus(); }, []);

  // Escape closes it, because a full-screen sheet with no way back is a trap.
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return GROUPS;
    return GROUPS.map(g => ({
      ...g,
      items: g.items.filter(it =>
        it.name.toLowerCase().includes(needle) ||
        it.code.toLowerCase().replace("us-", "").startsWith(needle)),
    })).filter(g => g.items.length);
  }, [q]);

  const total = groups.reduce((a, g) => a + g.items.length, 0);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 200, background: "rgba(4,4,9,0.86)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        ...card({ width: "100%", maxWidth: 480, maxHeight: "88vh",
          borderRadius: "18px 18px 0 0", padding: "14px 12px 0" }),
        ...edgeGlow(V.blue, 0.6),
        display: "flex", flexDirection: "column", minHeight: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ ...display("h3", { fontSize: 18, color: V.text, flex: 1,
            textAlign: "left" }) }}>{title}</span>
          <button onClick={onClose} style={{
            ...labelType({ fontSize: 12, color: V.text3 }), background: "transparent",
            border: "none", cursor: "pointer", padding: "6px 4px",
          }}>CLOSE</button>
        </div>

        <input ref={input} value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search countries and states"
          style={{
            width: "100%", padding: "11px 13px", borderRadius: 10,
            background: V.bg3, border: `1px solid ${V.border2}`, color: V.text,
            fontFamily: FB, fontSize: 15, outline: "none", marginBottom: 8,
          }} />

        <div ref={box} className="v-scroll" style={{ overflowY: "auto", flex: 1,
          minHeight: 0, paddingBottom: 16 }}>
          {total === 0 && (
            <p style={{ ...body("bodySm", { color: V.text3 }), padding: "18px 6px" }}>
              Nothing matches "{q}".
            </p>
          )}
          {groups.map(g => (
            <div key={g.label || "none"}>
              {g.label && (
                <div style={{ ...labelType({ fontSize: 10, color: V.text3 }),
                  padding: "12px 8px 5px", position: "sticky", top: 0,
                  background: V.bg2 }}>{g.label}</div>
              )}
              {g.items.map(it => {
                const on = value === it.code || (value == null && it.code === "");
                return (
                  <button key={it.code || "none"} onClick={() => { onPick(it.code); onClose(); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 11, width: "100%",
                      padding: "9px 8px", borderRadius: 9, cursor: "pointer",
                      background: on ? V.bg4 : "transparent",
                      border: `1px solid ${on ? V.blue : "transparent"}`,
                      textAlign: "left", marginBottom: 2,
                    }}>
                    <span style={{ width: 26, display: "inline-flex", justifyContent: "center" }}>
                      {it.code
                        ? <Flag nation={it.code} size={24} />
                        : <span style={{ ...labelType({ fontSize: 10, color: V.text3 }) }}>—</span>}
                    </span>
                    <span style={{ flex: 1, minWidth: 0,
                      ...body("bodySm", { fontSize: 15, color: on ? V.text : V.text2 }),
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {it.name}
                    </span>
                    {on && <span style={{ ...labelType({ fontSize: 10, color: V.blue }) }}>
                      CURRENT
                    </span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * The row that opens the picker. Shows the flag, the name, and what it is for.
 *
 * @param nation  current code, or null for never chosen
 */
export function FlagRow({ cap, who, nation, onOpen, disabled = false, note }) {
  const chosen = nation != null && nation !== "";
  return (
    <button onClick={disabled ? undefined : onOpen} disabled={disabled} style={{
      display: "flex", alignItems: "center", gap: 12, width: "100%",
      padding: "11px 12px", borderRadius: 12, background: V.bg3,
      border: `1px solid ${V.border}`, cursor: disabled ? "default" : "pointer",
      textAlign: "left", opacity: disabled ? 0.55 : 1,
    }}>
      <span style={{ width: 32, display: "inline-flex", justifyContent: "center" }}>
        {chosen ? <Flag nation={nation} size={30} />
          : <span style={{ ...labelType({ fontSize: 10, color: V.text3 }) }}>—</span>}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        {cap && <span style={{ display: "block",
          ...labelType({ fontSize: 10, color: V.text3 }) }}>{cap}</span>}
        <span style={{ display: "block", ...body("bodySm", { fontSize: 15, color: V.text }),
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {who}
        </span>
        <span style={{ display: "block", ...body("bodySm", { fontSize: 12, color: V.text2 }) }}>
          {nation === "" ? "No flag"
            : chosen ? (NAME_OF[nation] || nation)
            : (note || "Not chosen yet")}
        </span>
      </span>
      {!disabled && (
        <span style={{ ...labelType({ fontSize: 11, color: V.blue }) }}>CHANGE</span>
      )}
    </button>
  );
}
