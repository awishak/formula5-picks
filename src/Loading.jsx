// What a page shows while it waits on Supabase: the five starting lights
// coming on one at a time and going out together, over rows that carry a blue
// sweep where the content will land. Andrew, 2026-11-23: "if the page is
// loading, give it the five lights". The CSS is in src/motion.js.
export default function Loading({ rows = 4 }) {
  return (
    <div role="status" aria-label="Loading">
      <div className="v-lts">
        {[0, 1, 2, 3, 4].map(i => <i key={i} />)}
      </div>
      {Array.from({ length: rows }, (_, i) => <div key={i} className="v-sk" />)}
    </div>
  );
}
