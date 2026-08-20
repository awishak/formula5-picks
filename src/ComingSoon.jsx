import { V, FM, label, card, textGlow, edgeGlow, titleFit, titleBox } from "./theme.vegas";

// A page that has a tab and a URL but no content yet. The old version of each
// one is still in the tree, unrouted, so nothing is lost by parking it here.

const WRAP = { maxWidth: 480, margin: "0 auto", padding: "0 16px 96px" };

export default function ComingSoon({ title }) {
  return (
    <div style={{ background: V.bg, minHeight: "100vh" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Encode+Sans+Semi+Condensed:wght@400;600;700&display=swap');`}</style>
      <div style={WRAP}>
        <div style={titleBox({ padding: "14px 0 18px" })}>
          <div style={{
            fontFamily: FM, fontWeight: 400, fontSize: titleFit(title, { fill: 0.7 }),
            lineHeight: 1.15, letterSpacing: "0.02em", whiteSpace: "nowrap",
            ...textGlow(V.pink),
          }}>{title.toUpperCase()}</div>
        </div>
        <div style={{ ...card({ padding: 18 }), ...edgeGlow(V.blue, 0.6) }}>
          <div style={label({ color: V.blue, fontSize: 15 })}>Coming soon</div>
        </div>
      </div>
    </div>
  );
}
