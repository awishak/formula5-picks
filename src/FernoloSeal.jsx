// The seal on a pick the randomizer made: "Picked by Fernolo Bort", neon on
// black, Andrew's artwork of 2026-09-25. public/fernolo-seal.png, 360px.
//
// Drawn opaque, black disc and all, like a sticker on the card. It shipped
// screen-blended so the black would drop into the navy, and Andrew's read the
// same day was too transparent and not clear: the blend lifted the dark parts
// of the neon into the card and the ring went faint. The disc is the seal.
// It is a picture, not a word: at these sizes the ring is not legible, so
// every use carries a title and a page that has room says it in words too.
export const FERNOLO_SEAL = "/fernolo-seal.png";
export const FERNOLO_TITLE = "Picked by Fernolo Bort";

export default function FernoloSeal({ size = 44, style }) {
  return (
    <img src={FERNOLO_SEAL} alt={FERNOLO_TITLE} title={FERNOLO_TITLE} width={size} height={size}
         style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, display: "block",
                  boxShadow: "0 0 0 1.5px #000, 0 0 10px rgba(255, 60, 170, 0.45)", ...style }} />
  );
}
