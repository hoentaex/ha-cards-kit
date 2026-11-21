// Visual editor (ha-form) of the gauge tile. Shared fields (entity, name, icon, color, sub line, thresholds, tap)
// map like the KPI tile's; the gauge adds layout, icon background, min / max and the optional marker.
import { isEntityId, langOf } from "../shared.js";
import {
  fromFormData as kpiFromForm,
  helperFor as kpiHelper,
  labelFor as kpiLabel,
  toFormData as kpiToForm,
} from "../kpi-tile/editor.js";

const LABELS = {
  de: {
    layout: "Darstellung",
    lay_normal: "Normal – Bogen mittig, Wert und Name darunter",
    lay_compact: "Kompakt – kleiner Bogen links, eine Reihe hoch",
    icon_background: "Icon mit getöntem Hintergrund",
    g_range: "Bereich des Bogens",
    g_subline: "Unterzeile (nur Normal ab 3 Reihen)",
    min: "Min",
    max: "Max",
    max_entity: "Max aus Entity",
    marker: "Marker (optional)",
    marker_entity: "Marker aus Entity",
    h_max: "Leer bei %: 0–100",
    h_marker: "Strich auf dem Bogen, z. B. Ziel oder Grenze. Leer = kein Marker",
    h_layout: "Die Größe stellst du im Layout-Tab ein; Normal ab 3 Reihen mit großem Bogen",
  },
  en: {
    layout: "Layout",
    lay_normal: "Normal – arc centered, value and name below",
    lay_compact: "Compact – small arc left, one row high",
    icon_background: "Icon with a tinted background",
    g_range: "Range of the arc",
    g_subline: "Sub line (normal layout from 3 rows only)",
    min: "Min",
    max: "Max",
    max_entity: "Max from an entity",
    marker: "Marker (optional)",
    marker_entity: "Marker from an entity",
    h_max: "Empty for %: 0–100",
    h_marker: "Line on the arc, e.g. a target or a limit. Empty = no marker",
    h_layout: "Set the size in the Layout tab; normal from 3 rows has a big arc",
  },
};
const GAUGE_KEYS = ["layout", "icon_background", "min", "max", "marker"];
const HELPERS = { max: "h_max", marker: "h_marker", layout: "h_layout" };

export const labelFor = (lang, name) => (LABELS[lang] || LABELS.en)[name] ?? kpiLabel(lang, name);
export const helperFor = (lang, name) =>
  HELPERS[name] ? (LABELS[lang] || LABELS.en)[HELPERS[name]] : kpiHelper(lang, name);

const grid = (...schema) => ({ type: "grid", name: "", schema });
const group = (title, schema) => ({ type: "expandable", name: "", title, flatten: true, schema });
const select = (name, options) => ({ name, selector: { select: { mode: "dropdown", options } } });
const num = (name) => ({ name, selector: { number: { mode: "box", step: "any" } } });
const text = (name) => ({ name, selector: { text: {} } });
const ent = (name) => ({ name, selector: { entity: {} } });

export const editorSchema = (lang, data = {}) => {
  const L = LABELS[lang] || LABELS.en;
  const K = (n) => kpiLabel(lang, n);
  const sl = data.subline_type || "none";
  const sublineFields = [
    select(
      "subline_type",
      ["none", "text", "attribute", "entity", "changed"].map((v) => ({ value: v, label: K(`sl_${v}`) })),
    ),
  ];
  if (sl === "text") sublineFields.push(text("subline_text"));
  if (sl === "attribute")
    sublineFields.push({
      name: "subline_attribute",
      selector: { attribute: {} },
      context: { filter_entity: "entity" },
    });
  if (sl === "entity") sublineFields.push(ent("subline_entity"));
  if (["attribute", "entity", "changed"].includes(sl))
    sublineFields.push(grid(text("subline_prefix"), text("subline_suffix")));
  const dirs = [
    { value: "above", label: K("above") },
    { value: "below", label: K("below") },
  ];
  return [
    { name: "entity", required: true, selector: { entity: {} } },
    {
      name: "layout",
      selector: {
        select: {
          mode: "list",
          options: [
            { value: "normal", label: L.lay_normal },
            { value: "compact", label: L.lay_compact },
          ],
        },
      },
    },
    grid(text("name"), { name: "icon", selector: { icon: {} }, context: { icon_entity: "entity" } }),
    grid(text("unit"), { name: "digits", selector: { number: { min: 0, max: 6, step: 1, mode: "box" } } }),
    grid({ name: "color", selector: { ui_color: {} } }, { name: "icon_background", selector: { boolean: {} } }),
    group(L.g_range, [grid(num("min"), num("max")), ent("max_entity"), grid(num("marker"), ent("marker_entity"))]),
    ...(data.layout === "compact" ? [] : [group(L.g_subline, sublineFields)]),
    group(K("g_thresholds"), [
      grid(select("warn_dir", dirs), num("warn_value")),
      grid(select("bad_dir", dirs), num("bad_value")),
    ]),
    group(K("g_action"), [{ name: "tap_action", selector: { ui_action: {} } }]),
  ];
};

/** Card config → flat form data. */
export const toFormData = (config = {}) => {
  const d = kpiToForm(config);
  delete d.bar_type;
  d.layout = config.layout === "compact" ? "compact" : "normal";
  d.icon_background = config.icon_background !== false;
  if (config.min !== undefined) d.min = config.min;
  if (isEntityId(config.max)) d.max_entity = config.max;
  else if (config.max !== undefined) d.max = config.max;
  if (isEntityId(config.marker)) d.marker_entity = config.marker;
  else if (config.marker !== undefined) d.marker = config.marker;
  return d;
};

const filled = (v) => v !== undefined && v !== null && v !== "";

/** Flat form data → card config: defaults and empty fields dropped, unknown keys of `base` kept. */
export const fromFormData = (d, base = {}) => {
  const rest = Object.fromEntries(Object.entries(base).filter(([k]) => !GAUGE_KEYS.includes(k)));
  const config = kpiFromForm({ ...d, bar_type: "none" }, rest);
  delete config.bar;
  if (d.layout === "compact") {
    config.layout = "compact";
    delete config.subline;
  }
  if (d.icon_background === false) config.icon_background = false;
  if (filled(d.min) && Number(d.min) !== 0) config.min = Number(d.min);
  if (filled(d.max_entity)) config.max = d.max_entity;
  else if (filled(d.max)) config.max = Number(d.max);
  if (filled(d.marker_entity)) config.marker = d.marker_entity;
  else if (filled(d.marker)) config.marker = Number(d.marker);
  return config;
};

export class GaugeTileCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _lang() {
    return langOf(this._hass, this._config);
  }

  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => labelFor(this._lang(), s.name);
      this._form.computeHelper = (s) => helperFor(this._lang(), s.name);
      this._form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._uiSubline = ev.detail.value.subline_type;
        const { type, ...rest } = this._config;
        this._config = { type, ...fromFormData(ev.detail.value, rest) };
        this._render();
        this.dispatchEvent(
          new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }),
        );
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    const data = toFormData(this._config);
    if (!this._config.subline && this._uiSubline) data.subline_type = this._uiSubline;
    const key = JSON.stringify(data);
    if (key !== this._dataKey) {
      this._dataKey = key;
      this._form.data = data;
    }
    const schemaKey = `${this._lang()}|${data.subline_type}|${data.layout}`;
    if (schemaKey !== this._schemaKey) {
      this._schemaKey = schemaKey;
      this._form.schema = editorSchema(this._lang(), data);
    }
  }
}

if (typeof customElements !== "undefined" && !customElements.get("gauge-tile-card-editor"))
  customElements.define("gauge-tile-card-editor", GaugeTileCardEditor);
