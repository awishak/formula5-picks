// The seal on a pick the randomizer made: "Picked by Fernolo Bort", neon on
// black, Andrew's artwork of 2026-09-25. public/fernolo-seal.png, 192px.
//
// The artwork is on black and the app is on navy. Screen blending drops the
// black into whatever the seal sits on and keeps the neon, so no cut-out was
// needed and the file stays a flat PNG. It is a picture, not a word: at the
// sizes it is drawn the ring is not legible, so every use carries a title
// and a page that has room says it in words too.
export const FERNOLO_SEAL = "/fernolo-seal.png";
export const FERNOLO_TITLE = "Picked by Fernolo Bort";

export default function FernoloSeal({ size = 32, style }) {
  return (
    <img src={FERNOLO_SEAL} alt={FERNOLO_TITLE} title={FERNOLO_TITLE} width={size} height={size}
         style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0,
                  mixBlendMode: "screen", display: "block", ...style }} />
  );
}
