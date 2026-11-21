// Gauge tile: one value as an open 270° arc (gap at the bottom) with the icon inside. What it shows is worked out
// like the KPI tile (value, unit, sub line, thresholds, colors, missing values); the arc's range comes from
// min / max (% values 0–100 without them) and an optional marker.
//
// Layout "normal": arc centered, value and name below; from 3 grid rows a bigger arc and the sub line.
// Layout "compact": small arc left, name and value beside it, one grid row.
import { esc } from "../shared.js";
import { computeTile } from "../kpi-tile/tile.js";

export const LAYOUTS = ["normal", "compact"];

export const layoutOf = (config) => (config?.layout === "compact" ? "compact" : "normal");

/** Height in grid rows; without grid_options the layout's default (normal 2, compact 1). */
export const gaugeRows = (config) => {
  const r = Number(config?.grid_options?.rows);
  if (Number.isFinite(r) && r >= 1) return Math.round(r);
  return layoutOf(config) === "compact" ? 1 : 2;
};

export const gridOptionsOf = (config) =>
  layoutOf(config) === "compact"
    ? { columns: 4, rows: 1, min_columns: 3, min_rows: 1, max_rows: 2 }
    : { columns: 4, rows: 2, min_columns: 2, min_rows: 2, max_rows: 4 };

/** The bar config the KPI logic understands: a range from min/max, % → 0–100, nothing without a range. */
const rangeOf = (config, hass) => {
  const st = hass?.states?.[config?.entity];
  const unit = config?.unit ?? st?.attributes?.unit_of_measurement;
  const marker = config?.marker;
  const has = (v) => v !== undefined && v !== null && v !== "";
  if (has(config?.max)) return { min: config.min ?? 0, max: config.max, ...(has(marker) ? { marker } : {}) };
  if (unit === "%")
    return has(config?.min)
      ? { min: config.min, max: 100, ...(has(marker) ? { marker } : {}) }
      : { percent: true, ...(has(marker) ? { marker } : {}) };
  return null;
};

/**
 * Everything the gauge shows: the KPI tile's model plus the layout, whether it is big (normal, 3+ rows), the arc's
 * fill `p` (0–100, 0 without a range or value) and the marker `m` (0–100, only when one is configured).
 */
export function computeGauge(config, hass, now = Date.now()) {
  const layout = layoutOf(config);
  const rows = gaugeRows(config);
  const bar = rangeOf(config, hass);
  const t = computeTile({ ...config, bar: bar || undefined, grid_options: undefined }, hass, now);
  const big = layout === "normal" && rows >= 3;
  return {
    ...t,
    layout,
    rows,
    big,
    sub: big && !t.na ? t.sub : "",
    p: !t.na && Number.isFinite(t.p) ? t.p : 0,
    m: !t.na && Number.isFinite(t.m) ? t.m : undefined,
    iconBackground: config?.icon_background !== false,
  };
}

/** Point on the arc's circle for a share 0–100 of the 270° sweep that starts bottom left. */
const at = (c, r, share) => {
  const a = ((135 + 2.7 * share) * Math.PI) / 180;
  return [c + r * Math.cos(a), c + r * Math.sin(a)];
};

/** The arc as SVG: track, fill in the tile color and, when set, the marker as a short line across the arc. */
export function arcSVG(size, width, p, m) {
  const c = size / 2;
  const r = (size - width) / 2 - 0.5;
  const C = 2 * Math.PI * r;
  const L = 0.75 * C;
  const rot = `rotate(135 ${c} ${c})`;
  const fill =
    p > 0
      ? `<circle class="fill" cx="${c}" cy="${c}" r="${r}" stroke-dasharray="${((L * p) / 100).toFixed(2)} ${C.toFixed(2)}" transform="${rot}"/>`
      : "";
  let mark = "";
  if (Number.isFinite(m)) {
    const [x1, y1] = at(c, r - width * 1.1, m);
    const [x2, y2] = at(c, r + width * 1.1, m);
    mark = `<line class="mark" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`;
  }
  return `<svg class="arcsvg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" style="--w:${width}px">
    <circle class="track" cx="${c}" cy="${c}" r="${r}" stroke-dasharray="${L.toFixed(2)} ${C.toFixed(2)}" transform="${rot}"/>${fill}${mark}</svg>`;
}

/** Arc size and stroke for a layout. */
export const arcSize = (g) => (g.layout === "compact" ? [36, 3] : g.big ? [92, 5] : [62, 4]);

/** The tile's inner HTML. The icon element (ha-state-icon) is put into `.gi` by the card. */
export function gaugeHTML(g) {
  const [size, width] = arcSize(g);
  const arc = `<span class="arc" style="width:${size}px;height:${size}px">${arcSVG(size, width, g.p, g.m)}<span class="gi${g.iconBackground ? " bg" : ""}"></span></span>`;
  const value = g.na
    ? `<span class="gv">${esc(g.value)}</span>`
    : `<span class="gv">${esc(g.value)}${g.unit ? `<small>${esc(g.unit)}</small>` : ""}</span>`;
  const name = `<span class="gk" title="${esc(g.name)}">${esc(g.name)}</span>`;
  if (g.layout === "compact") return `${arc}<span class="t">${name}${value}</span>`;
  return `${arc}${value}${name}${g.sub ? `<span class="gs" title="${esc(g.sub)}">${esc(g.sub)}</span>` : ""}`;
}
