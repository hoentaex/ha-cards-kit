// Visual editor (ha-form) of the KPI tile. The form is flat; the card's YAML keeps the nested subline, bar, warn
// and bad. Keys the editor does not know (grid_options, visibility, …) are kept as they are.
import { isEntityId, langOf } from "../shared.js";

const LABELS = {
  de: {
    entity: "Entity",
    name: "Name",
    icon: "Icon",
    unit: "Einheit",
    digits: "Nachkommastellen",
    color: "Farbe",
    g_subline: "Unterzeile",
    g_bar: "Balken",
    g_thresholds: "Schwellen",
    g_action: "Tippen",
    subline_type: "Quelle",
    subline_text: "Text",
    subline_attribute: "Attribut",
    subline_entity: "Entity",
    subline_prefix: "Präfix",
    subline_suffix: "Suffix",
    sl_none: "Keine",
    sl_text: "Fester Text",
    sl_attribute: "Attribut der Entity",
    sl_entity: "Andere Entity",
    sl_changed: "Zuletzt geändert",
    bar_type: "Art",
    bar_none: "Kein Balken",
    bar_percent: "Wert ist Prozent",
    bar_range: "Bereich Min–Max",
    bar_min: "Min",
    bar_max: "Max",
    bar_max_entity: "Max aus Entity",
    bar_marker: "Marker",
    bar_marker_entity: "Marker aus Entity",
    warn_dir: "Warnung wenn",
    warn_value: "Wert",
    bad_dir: "Kritisch wenn",
    bad_value: "Wert",
    above: "über",
    below: "unter",
    tap_action: "Aktion beim Tippen",
    h_subline_type: "Bei 1 Reihe Höhe (Layout-Tab) ohne Unterzeile und Balken",
    h_bar_max_entity: "Statt einer Zahl, z. B. die Tankgröße",
    h_bar_marker: "Strich auf dem Balken, z. B. Reserve oder Ziel",
    h_unit: "Nur die Anzeige; umrechnen (W → kW) in den Entity-Einstellungen",
  },
  en: {
    entity: "Entity",
    name: "Name",
    icon: "Icon",
    unit: "Unit",
    digits: "Decimals",
    color: "Color",
    g_subline: "Sub line",
    g_bar: "Bar",
    g_thresholds: "Thresholds",
    g_action: "Tap",
    subline_type: "Source",
    subline_text: "Text",
    subline_attribute: "Attribute",
    subline_entity: "Entity",
    subline_prefix: "Prefix",
    subline_suffix: "Suffix",
    sl_none: "None",
    sl_text: "Fixed text",
    sl_attribute: "Attribute of the entity",
    sl_entity: "Another entity",
    sl_changed: "Last changed",
    bar_type: "Type",
    bar_none: "No bar",
    bar_percent: "Value is a percentage",
    bar_range: "Range min–max",
    bar_min: "Min",
    bar_max: "Max",
    bar_max_entity: "Max from an entity",
    bar_marker: "Marker",
    bar_marker_entity: "Marker from an entity",
    warn_dir: "Warning when",
    warn_value: "Value",
    bad_dir: "Critical when",
    bad_value: "Value",
    above: "above",
    below: "below",
    tap_action: "Tap action",
    h_subline_type: "At a height of 1 row (Layout tab) without sub line and bar",
    h_bar_max_entity: "Instead of a number, e.g. the tank size",
    h_bar_marker: "Line on the bar, e.g. a reserve or a target",
    h_unit: "Display only; convert (W → kW) in the entity settings",
  },
};

const MANAGED = ["entity", "name", "icon", "unit", "digits", "color", "subline", "bar", "warn", "bad", "tap_action"];
const grid = (...schema) => ({ type: "grid", name: "", schema });
const group = (title, schema) => ({ type: "expandable", name: "", title, flatten: true, schema });
const select = (name, options) => ({ name, selector: { select: { mode: "dropdown", options } } });
const num = (name) => ({ name, selector: { number: { mode: "box", step: "any" } } });
const text = (name) => ({ name, selector: { text: {} } });
const ent = (name) => ({ name, selector: { entity: {} } });

/** The form for the current data: the sub line and bar fields depend on the chosen source and type. */
export const editorSchema = (lang, data = {}) => {
  const L = LABELS[lang] || LABELS.en;
  const opts = (keys, prefix) => keys.map((k) => ({ value: k, label: L[`${prefix}${k}`] }));
  const dirs = [
    { value: "above", label: L.above },
    { value: "below", label: L.below },
  ];
  const sl = data.subline_type || "none";
  const bar = data.bar_type || "none";
  const sublineFields = [select("subline_type", opts(["none", "text", "attribute", "entity", "changed"], "sl_"))];
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
  const barFields = [select("bar_type", opts(["none", "percent", "range"], "bar_"))];
  if (bar === "range") barFields.push(grid(num("bar_min"), num("bar_max")), ent("bar_max_entity"));
  if (bar !== "none") barFields.push(grid(num("bar_marker"), ent("bar_marker_entity")));
  return [
    { name: "entity", required: true, selector: { entity: {} } },
    grid(text("name"), { name: "icon", selector: { icon: {} }, context: { icon_entity: "entity" } }),
    grid(text("unit"), { name: "digits", selector: { number: { min: 0, max: 6, step: 1, mode: "box" } } }),
    { name: "color", selector: { ui_color: {} } },
    group(L.g_subline, sublineFields),
    group(L.g_bar, barFields),
    group(L.g_thresholds, [
      grid(select("warn_dir", dirs), num("warn_value")),
      grid(select("bad_dir", dirs), num("bad_value")),
    ]),
    group(L.g_action, [{ name: "tap_action", selector: { ui_action: {} } }]),
  ];
};

const HELPERS = {
  subline_type: "h_subline_type",
  bar_max_entity: "h_bar_max_entity",
  bar_marker: "h_bar_marker",
  unit: "h_unit",
};
export const helperFor = (lang, name) => (HELPERS[name] ? (LABELS[lang] || LABELS.en)[HELPERS[name]] : undefined);
export const labelFor = (lang, name) => (LABELS[lang] || LABELS.en)[name] ?? name;

const threshold = (th) => {
  if (!th || typeof th !== "object") return { dir: "above", value: undefined };
  if (th.below !== undefined) return { dir: "below", value: th.below };
  return { dir: "above", value: th.above };
};

/** Card config → flat form data. */
export const toFormData = (config = {}) => {
  const d = {};
  for (const k of ["entity", "name", "icon", "unit", "digits", "color", "tap_action"])
    if (config[k] !== undefined) d[k] = config[k];
  const s = config.subline;
  d.subline_type = "none";
  if (typeof s === "string" && s) Object.assign(d, { subline_type: "text", subline_text: s });
  else if (s && typeof s === "object") {
    if (s.text) Object.assign(d, { subline_type: "text", subline_text: s.text });
    else if (s.attribute) Object.assign(d, { subline_type: "attribute", subline_attribute: s.attribute });
    else if (s.entity) Object.assign(d, { subline_type: "entity", subline_entity: s.entity });
    else if (s.last_changed) d.subline_type = "changed";
    if (s.prefix) d.subline_prefix = s.prefix;
    if (s.suffix) d.subline_suffix = s.suffix;
  }
  const b = config.bar;
  d.bar_type = "none";
  if (b && typeof b === "object") {
    d.bar_type = b.percent ? "percent" : "range";
    if (!b.percent) {
      if (b.min !== undefined) d.bar_min = b.min;
      if (isEntityId(b.max)) d.bar_max_entity = b.max;
      else if (b.max !== undefined) d.bar_max = b.max;
    }
    if (isEntityId(b.marker)) d.bar_marker_entity = b.marker;
    else if (b.marker !== undefined) d.bar_marker = b.marker;
  }
  for (const lv of ["warn", "bad"]) {
    const th = threshold(config[lv]);
    d[`${lv}_dir`] = th.dir;
    if (th.value !== undefined) d[`${lv}_value`] = th.value;
  }
  return d;
};

const filled = (v) => v !== undefined && v !== null && v !== "";

/** Flat form data → card config: unused fields and defaults dropped, keys of `base` the editor does not manage kept. */
export const fromFormData = (d, base = {}) => {
  const config = {};
  for (const [k, v] of Object.entries(base)) if (!MANAGED.includes(k)) config[k] = v;
  for (const k of ["entity", "name", "icon", "unit", "color"]) if (filled(d[k])) config[k] = d[k];
  if (filled(d.digits)) config.digits = Number(d.digits);
  const affix = (o) => {
    if (filled(d.subline_prefix)) o.prefix = d.subline_prefix;
    if (filled(d.subline_suffix)) o.suffix = d.subline_suffix;
    return o;
  };
  if (d.subline_type === "text" && filled(d.subline_text)) config.subline = d.subline_text;
  if (d.subline_type === "attribute" && filled(d.subline_attribute))
    config.subline = affix({ attribute: d.subline_attribute });
  if (d.subline_type === "entity" && filled(d.subline_entity)) config.subline = affix({ entity: d.subline_entity });
  if (d.subline_type === "changed") config.subline = affix({ last_changed: true });
  if (d.bar_type === "percent" || d.bar_type === "range") {
    const bar = d.bar_type === "percent" ? { percent: true } : {};
    if (d.bar_type === "range") {
      if (filled(d.bar_min) && Number(d.bar_min) !== 0) bar.min = Number(d.bar_min);
      if (filled(d.bar_max_entity)) bar.max = d.bar_max_entity;
      else if (filled(d.bar_max)) bar.max = Number(d.bar_max);
    }
    if (filled(d.bar_marker_entity)) bar.marker = d.bar_marker_entity;
    else if (filled(d.bar_marker)) bar.marker = Number(d.bar_marker);
    config.bar = bar;
  }
  for (const lv of ["warn", "bad"])
    if (filled(d[`${lv}_value`]))
      config[lv] = { [d[`${lv}_dir`] === "below" ? "below" : "above"]: Number(d[`${lv}_value`]) };
  if (d.tap_action && d.tap_action.action !== "more-info") config.tap_action = d.tap_action;
  return config;
};

export class KpiTileCardEditor extends HTMLElement {
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
    // Keep a chosen sub line source while its field is still empty (the config has no sub line yet).
    if (!this._config.subline && this._uiSubline) data.subline_type = this._uiSubline;
    const key = JSON.stringify(data);
    if (key !== this._dataKey) {
      this._dataKey = key;
      this._form.data = data;
    }
    const schemaKey = `${this._lang()}|${data.subline_type}|${data.bar_type}`;
    if (schemaKey !== this._schemaKey) {
      this._schemaKey = schemaKey;
      this._form.schema = editorSchema(this._lang(), data);
    }
  }
}

if (typeof customElements !== "undefined" && !customElements.get("kpi-tile-card-editor"))
  customElements.define("kpi-tile-card-editor", KpiTileCardEditor);
