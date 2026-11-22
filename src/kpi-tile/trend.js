// Trend line of the KPI tile, like the trend graph of Home Assistant's tile card but with its own color: the history
// comes from Home Assistant's history/stream and is reduced to a line in a 0–100 box (pure, so it can be tested).

export const DEFAULT_HOURS = 24;
const MAX_HOURS = 24 * 30;
const HOUR = 3_600_000;

/** The trend of the config ({ hours, detail, color }), or null without one. `trend: true` takes the defaults. */
export const trendConfig = (config) => {
  const t = config?.trend;
  if (!t) return null;
  const o = typeof t === "object" ? t : {};
  const h = Number(o.hours_to_show);
  return {
    hours: Number.isFinite(h) && h > 0 ? Math.min(h, MAX_HOURS) : DEFAULT_HOURS,
    detail: o.detail !== false,
    color: o.color,
  };
};

/** Points [ms, value] of one entity in a history/stream message; non-numeric states (unavailable, …) are NaN. */
export const historyPoints = (msg, entity) => {
  const list = msg?.states?.[entity];
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const e of list) {
    const sec = e?.lu ?? e?.lc;
    const ms = Number.isFinite(sec) ? sec * 1000 : Date.parse(e?.last_updated ?? e?.last_changed);
    if (!Number.isFinite(ms)) continue;
    const raw = e.s ?? e.state;
    const v = raw === "" || raw === null || raw === undefined ? Number.NaN : Number(raw);
    out.push([ms, v]);
  }
  return out;
};

/** Known points plus new ones, sorted; older than the window only the last one (the value at the window's start). */
export const mergePoints = (known, added, hours, now = Date.now()) => {
  const all = [...known, ...added].sort((a, b) => a[0] - b[0]);
  const t0 = now - hours * HOUR;
  let first = 0;
  while (first + 1 < all.length && all[first + 1][0] <= t0) first++;
  return all.slice(first);
};

/** Number of points of the line: about one per 10 minutes with detail (24 to 120), one per hour without. */
export const sampleCount = (hours, detail) =>
  detail ? Math.min(120, Math.max(24, Math.round(hours * 6))) : Math.max(10, Math.round(hours));

/** Time-weighted mean of the value in each of `n` equal slices of the window; NaN where there is no value. */
export const sample = (points, hours, n, now = Date.now()) => {
  const span = hours * HOUR;
  const t0 = now - span;
  const vals = [];
  let k = 0;
  let cur = Number.NaN;
  while (k < points.length && points[k][0] <= t0) cur = points[k++][1];
  for (let b = 0; b < n; b++) {
    const a = t0 + (b * span) / n;
    const e = t0 + ((b + 1) * span) / n;
    let area = 0;
    let covered = 0;
    let t = a;
    while (k < points.length && points[k][0] < e) {
      if (Number.isFinite(cur)) {
        area += cur * (points[k][0] - t);
        covered += points[k][0] - t;
      }
      t = points[k][0];
      cur = points[k++][1];
    }
    if (Number.isFinite(cur)) {
      area += cur * (e - t);
      covered += e - t;
    }
    vals.push(covered > 0 ? area / covered : Number.NaN);
  }
  return vals;
};

const f = (n) => Number(n.toFixed(2));

/**
 * The line (`line`) and the area under it (`fill`) as SVG paths in a 0–100 box (y down), or null without a value.
 * Each run of values without a gap is its own piece, stretched to the edges of its first and last slice.
 */
export function trendPath(points, { hours = DEFAULT_HOURS, detail = true } = {}, now = Date.now()) {
  const n = sampleCount(hours, detail);
  const vals = sample(points, hours, n, now);
  const finite = vals.filter(Number.isFinite);
  if (!finite.length) return null;
  let lo = Math.min(...finite);
  let hi = Math.max(...finite);
  if (hi - lo < 1e-9) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.12;
  lo -= pad;
  hi += pad;
  const y = (v) => f(100 - ((v - lo) / (hi - lo)) * 100);
  const lines = [];
  const fills = [];
  let run = [];
  const flush = () => {
    if (!run.length) return;
    const pts = [[f((run[0].b / n) * 100), y(run[0].v)]];
    for (const { b, v } of run) pts.push([f(((b + 0.5) / n) * 100), y(v)]);
    const end = run[run.length - 1];
    pts.push([f(((end.b + 1) / n) * 100), y(end.v)]);
    const d = pts.map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join(" ");
    lines.push(d);
    fills.push(`${d} L${pts[pts.length - 1][0]},100 L${pts[0][0]},100 Z`);
    run = [];
  };
  vals.forEach((v, b) => {
    if (Number.isFinite(v)) run.push({ b, v });
    else flush();
  });
  flush();
  return { line: lines.join(" "), fill: fills.join(" ") };
}

/** The SVG of the line with its fading fill; the color comes from `currentColor`. */
export const trendSVG = (path) =>
  path
    ? `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="kt-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".38"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><path class="f" d="${path.fill}" fill="url(#kt-fill)"/><path class="l" d="${path.line}"/></svg>`
    : "";

/** Subscription message of Home Assistant's history stream for the window of the trend. */
export const historyRequest = (entity, hours, now = Date.now()) => ({
  type: "history/stream",
  entity_ids: [entity],
  start_time: new Date(now - hours * HOUR).toISOString(),
  minimal_response: true,
  no_attributes: true,
  significant_changes_only: false,
});
