// KPI tile: what the card shows for its config and the states (pure, so it can be tested), and its HTML.
//
// One tile is one card. Position and size come from Home Assistant's sections grid; the look follows the height:
// 1 row compact (icon left, value only), 2 rows standard (sub line and bar), 3 rows large (icon on top, as the tiles
// inside the sibling cards). A missing or unavailable entity keeps the tile in place, greyed out, so the grid never
// shows a gap.
import { cssColor, esc, fmtAgo, fmtNumber, langOf, localeOf, numberOf } from "../shared.js";

export const STRINGS = {
  de: {
    unavailable: "nicht verfügbar",
    unknown: "unbekannt",
    missing: "Entity nicht gefunden",
    no_entity: "Entity wählen",
  },
  en: { unavailable: "unavailable", unknown: "unknown", missing: "Entity not found", no_entity: "Choose an entity" },
};

const WARN = "var(--warning-color, #ffa600)";
const BAD = "var(--error-color, #db4437)";

// Tile color when none is configured: by device class, then by domain, else the theme's primary color.
const CLASS_COLOR = {
  temperature: "deep-orange",
  humidity: "light-blue",
  moisture: "light-blue",
  power: "amber",
  energy: "amber",
  apparent_power: "amber",
  current: "amber",
  voltage: "amber",
  battery: "green",
  monetary: "teal",
  volume: "blue",
  volume_storage: "blue",
  water: "blue",
  gas: "orange",
  pressure: "purple",
  carbon_dioxide: "blue-grey",
  pm25: "blue-grey",
  data_rate: "indigo",
  data_size: "indigo",
  duration: "cyan",
  illuminance: "yellow",
};
const DOMAIN_COLOR = { binary_sensor: "blue-grey", input_number: "primary", number: "primary", counter: "indigo" };

export const autoColor = (stateObj) => {
  const dc = stateObj?.attributes?.device_class;
  const domain = stateObj?.entity_id?.split(".")[0];
  return cssColor(CLASS_COLOR[dc] || DOMAIN_COLOR[domain] || "primary");
};

/** Height in grid rows → look: 1 compact, 2 standard (also for "auto" and masonry views), 3 or more large. */
export const rowsOf = (config) => {
  const r = Number(config?.grid_options?.rows);
  if (!Number.isFinite(r)) return 2;
  return r <= 1 ? 1 : r >= 3 ? 3 : 2;
};

const pct = (v) => Math.max(0, Math.min(100, v));

/** Threshold { above: x } or { below: x } (a number or an entity) hit by `n`. */
const hits = (hass, th, n) => {
  if (!th || typeof th !== "object") return false;
  const above = numberOf(hass, th.above);
  const below = numberOf(hass, th.below);
  return (Number.isFinite(above) && n > above) || (Number.isFinite(below) && n < below);
};

/** A state as text: numeric states with the locale (and `digits`), others as Home Assistant shows them. */
const stateText = (hass, st, locale, digits) => {
  const n = Number(st.state);
  if (st.state !== "" && Number.isFinite(n)) {
    const d = Number.isInteger(digits) ? digits : hass?.entities?.[st.entity_id]?.display_precision;
    return { text: fmtNumber(n, locale, d), unit: st.attributes?.unit_of_measurement || "", num: n };
  }
  return { text: hass?.formatEntityState ? hass.formatEntityState(st) : st.state, unit: "", num: null };
};

/** The sub line: fixed text, an attribute, another entity's state or the time since the last change. */
const sublineOf = (config, hass, st, locale, lang, now) => {
  const s = config.subline;
  if (!s) return "";
  if (typeof s === "string") return s;
  let x = "";
  if (s.text) x = String(s.text);
  else if (s.attribute) {
    const v = st.attributes?.[s.attribute];
    if (v !== undefined && v !== null && v !== "") {
      x =
        typeof v === "number"
          ? fmtNumber(v, locale)
          : hass?.formatEntityAttributeValue
            ? hass.formatEntityAttributeValue(st, s.attribute)
            : String(v);
    }
  } else if (s.entity) {
    const other = hass?.states?.[s.entity];
    if (other && !["unavailable", "unknown"].includes(other.state)) {
      const o = stateText(hass, other, locale);
      x = o.unit ? `${o.text} ${o.unit}` : o.text;
    }
  } else if (s.last_changed) {
    const t = Date.parse(st.last_changed);
    if (Number.isFinite(t)) x = fmtAgo(now - t, lang);
  }
  return x ? `${s.prefix ?? ""}${x}${s.suffix ?? ""}` : "";
};

/** Fill (0–100) and marker of the bar: { percent: true } or a range { min, max }; min, max and marker may be entities. */
const barOf = (config, hass, n) => {
  const b = config.bar;
  if (!b || typeof b !== "object" || n === null) return {};
  const lo = b.percent ? 0 : Number.isFinite(numberOf(hass, b.min)) ? numberOf(hass, b.min) : 0;
  const hi = b.percent ? 100 : numberOf(hass, b.max);
  if (!Number.isFinite(hi) || hi <= lo) return {};
  const mk = numberOf(hass, b.marker);
  return {
    p: pct(((n - lo) / (hi - lo)) * 100),
    m: Number.isFinite(mk) ? pct(((mk - lo) / (hi - lo)) * 100) : undefined,
  };
};

/**
 * Everything the tile shows: name, value and unit, sub line, bar, warn/bad level, color, icon and look (rows).
 * `na` marks a tile without a value (no entity, not found, unavailable, unknown): greyed out, text in place of it.
 */
export function computeTile(config, hass, now = Date.now()) {
  const lang = langOf(hass, config);
  const T = STRINGS[lang];
  const locale = localeOf(hass, lang);
  const rows = rowsOf(config);
  const id = config?.entity;
  const st = id ? hass?.states?.[id] : undefined;
  const name = config?.name || st?.attributes?.friendly_name || id || "";
  const base = { name, rows, entity: id || "", icon: config?.icon || "", stateObj: st };
  if (!id) return { ...base, na: true, value: T.no_entity, color: cssColor("disabled") };
  if (!st) return { ...base, na: true, value: T.missing, color: cssColor("disabled") };
  if (st.state === "unavailable" || st.state === "unknown")
    return { ...base, na: true, value: T[st.state], color: cssColor("disabled") };
  const digits = config.digits === undefined || config.digits === "" ? undefined : Number(config.digits);
  const v = stateText(hass, st, locale, Number.isInteger(digits) ? digits : undefined);
  const unit = config.unit ?? v.unit;
  const level =
    v.num === null ? "" : hits(hass, config.bad, v.num) ? "bad" : hits(hass, config.warn, v.num) ? "warn" : "";
  const color = level === "bad" ? BAD : level === "warn" ? WARN : cssColor(config.color) || autoColor(st);
  return {
    ...base,
    na: false,
    value: v.text,
    unit,
    sub: sublineOf(config, hass, st, locale, lang, now),
    ...barOf(config, hass, v.num),
    level,
    color,
  };
}

/** The tile's inner HTML. The icon element (ha-state-icon) is put into `.ki` by the card. */
export function tileHTML(t) {
  const bar = Number.isFinite(t.p)
    ? `<span class="kb"><i style="width:${t.p.toFixed(1)}%"></i>${Number.isFinite(t.m) ? `<b style="left:${t.m.toFixed(1)}%"></b>` : ""}</span>`
    : "";
  return `<div class="top"><span class="ki"></span><span class="kk" title="${esc(t.name)}">${esc(t.name)}</span></div>
    <span class="kv">${esc(t.value)}${!t.na && t.unit ? `<small>${esc(t.unit)}</small>` : ""}</span>
    ${!t.na && t.sub ? `<span class="ks" title="${esc(t.sub)}">${esc(t.sub)}</span>` : ""}
    ${t.na ? "" : bar}`;
}
