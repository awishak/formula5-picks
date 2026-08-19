import { V, FM, FD, FB, label, body, card, textGlow, edgeGlow, titleFit, titleBox } from "./theme.vegas";

// The fifth tab. Everything that does not have a page of its own yet ends up
// here, so for now it is a holding page with the one link that has to work.
//
// The old home page is still in App.jsx, unrouted, at ?page=home-v1. It carried
// the next race, a season summary, a week by week and the league news; the news
// itself lives on in src/news.js and none of it is lost.

const WRAP = { maxWidth: 480, margin: "0 auto", padding: "0 16px 96px" };
const TITLE_SIZE = titleFit("MORE", { fill: 0.42 });

export default function MorePage({ onNavigate }) {
  return (
    <div style={{ background: V.bg, minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Encode+Sans+Semi+Condensed:wght@400;600;700&family=Chakra+Petch:wght@600;700&display=swap');`}</style>
      <div style={WRAP}>
        <div style={titleBox({ padding: "14px 0 18px" })}>
          <div style={{
            fontFamily: FM, fontWeight: 400, fontSize: TITLE_SIZE,
            lineHeight: 1.15, letterSpacing: "0.02em", whiteSpace: "nowrap",
            ...textGlow(V.pink),
          }}>MORE</div>
        </div>

        <div style={{ ...card({ padding: 18, marginBottom: 14 }), ...edgeGlow(V.blue, 0.6) }}>
          <div style={label({ color: V.blue, fontSize: 15, marginBottom: 8 })}>Coming soon</div>
          <div style={body("body", { color: V.text2 })}>
            The rest of the app lands here: results, the rules, the calendar and the rest of the second half.
          </div>
        </div>

        <button onClick={() => onNavigate("admin")} style={{
          ...card({ padding: "16px 18px" }),
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          cursor: "pointer", border: `1px solid ${V.border2}`,
        }}>
          <span style={{
            fontFamily: FD, fontWeight: 700, fontSize: 18, letterSpacing: "0.04em",
            textTransform: "uppercase", color: V.text,
          }}>Admin</span>
          <span style={{ fontFamily: FB, fontSize: 18, color: V.text2 }}>&rsaquo;</span>
        </button>
      </div>
    </div>
  );
}
