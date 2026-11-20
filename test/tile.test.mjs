import assert from "node:assert/strict";
import { test } from "node:test";
import { computeTile, rowsOf, tileHTML } from "../src/kpi-tile/tile.js";
import { cssColor, fmtAgo, numberOf } from "../src/shared.js";

const NOW = Date.parse("2026-11-20T18:00:00Z");
const st = (entity_id, state, attributes = {}, extra = {}) => ({
  entity_id,
  state: String(state),
  attributes,
  last_changed: "2026-11-20T17:48:00Z",
  last_updated: "2026-11-20T17:48:00Z",
  ...extra,
});
const hassOf = (...states) => ({
  locale: { language: "de" },
  states: Object.fromEntries(states.map((s) => [s.entity_id, s])),
  entities: {},
});

const LEVEL = st("sensor.heizoel_fuellstand", 1840, {
  unit_of_measurement: "L",
  friendly_name: "Heizöl Füllstand",
  reichweite_tage: 132,
});
const RESERVE = st("sensor.heizoel_reserve", 500, { unit_of_measurement: "L" });

test("value with the locale, unit and name from the entity", () => {
  const t = computeTile({ entity: LEVEL.entity_id }, hassOf(LEVEL), NOW);
  assert.equal(t.value, "1.840");
  assert.equal(t.unit, "L");
  assert.equal(t.name, "Heizöl Füllstand");
  assert.equal(t.na, false);
  assert.equal(t.rows, 2);
});

test("digits from the config, else the entity's display precision", () => {
  const s = st("sensor.vorlauf", 48.456, { unit_of_measurement: "°C" });
  assert.equal(computeTile({ entity: s.entity_id, digits: 1 }, hassOf(s)).value, "48,5");
  const h = hassOf(s);
  h.entities = { "sensor.vorlauf": { display_precision: 0 } };
  assert.equal(computeTile({ entity: s.entity_id }, h).value, "48");
  assert.equal(computeTile({ entity: s.entity_id }, hassOf(s)).value, "48,46");
});

test("name, unit and icon from the config win", () => {
  const t = computeTile({ entity: LEVEL.entity_id, name: "Füllstand", unit: "Liter", icon: "mdi:oil" }, hassOf(LEVEL));
  assert.equal(t.name, "Füllstand");
  assert.equal(t.unit, "Liter");
  assert.equal(t.icon, "mdi:oil");
});

test("text states go through Home Assistant's formatter and have no unit", () => {
  const s = st("sensor.letzte_lieferung", "2026-09-12");
  const h = { ...hassOf(s), formatEntityState: () => "12. September 2026" };
  const t = computeTile({ entity: s.entity_id }, h);
  assert.equal(t.value, "12. September 2026");
  assert.equal(t.unit, "");
  assert.equal(t.p, undefined);
});

test("sub line: text, attribute with prefix and suffix, another entity, last changed", () => {
  const h = hassOf(LEVEL, RESERVE);
  const id = LEVEL.entity_id;
  assert.equal(computeTile({ entity: id, subline: "Tank im Keller" }, h).sub, "Tank im Keller");
  assert.equal(
    computeTile({ entity: id, subline: { attribute: "reichweite_tage", prefix: "reicht noch ", suffix: " Tage" } }, h)
      .sub,
    "reicht noch 132 Tage",
  );
  assert.equal(
    computeTile({ entity: id, subline: { entity: RESERVE.entity_id, prefix: "Reserve " } }, h).sub,
    "Reserve 500 L",
  );
  assert.equal(computeTile({ entity: id, subline: { last_changed: true } }, h, NOW).sub, "vor 12 Minuten");
  assert.equal(computeTile({ entity: id, subline: { attribute: "fehlt", prefix: "x " } }, h).sub, "");
});

test("bar: percent, range with numbers, range with entities, marker", () => {
  const soc = st("sensor.speicher", 76, { unit_of_measurement: "%" });
  const p = computeTile({ entity: soc.entity_id, bar: { percent: true, marker: 20 } }, hassOf(soc));
  assert.equal(p.p, 76);
  assert.equal(p.m, 20);
  const cap = st("sensor.tankgroesse", 3000, { unit_of_measurement: "L" });
  const r = computeTile(
    { entity: LEVEL.entity_id, bar: { max: "sensor.tankgroesse", marker: "sensor.heizoel_reserve" } },
    hassOf(LEVEL, RESERVE, cap),
  );
  assert.ok(Math.abs(r.p - (1840 / 3000) * 100) < 1e-9);
  assert.ok(Math.abs(r.m - (500 / 3000) * 100) < 1e-9);
  const v = st("sensor.vorlauf", 80, {});
  assert.equal(computeTile({ entity: v.entity_id, bar: { min: 20, max: 75 } }, hassOf(v)).p, 100);
  assert.equal(computeTile({ entity: v.entity_id, bar: { min: 20 } }, hassOf(v)).p, undefined);
});

test("warn and bad: above and below, bad wins, colors from the theme", () => {
  const h = hassOf(LEVEL, RESERVE);
  const id = LEVEL.entity_id;
  assert.equal(computeTile({ entity: id, warn: { below: 2000 } }, h).level, "warn");
  assert.equal(computeTile({ entity: id, warn: { below: 2000 }, bad: { below: 1900 } }, h).level, "bad");
  assert.equal(computeTile({ entity: id, warn: { above: 2000 } }, h).level, "");
  assert.equal(computeTile({ entity: id, bad: { below: "sensor.heizoel_reserve" } }, h).level, "");
  assert.match(computeTile({ entity: id, bad: { above: 0 } }, h).color, /--error-color/);
  assert.match(computeTile({ entity: id, warn: { above: 0 } }, h).color, /--warning-color/);
});

test("color: configured name, CSS color, device class, primary", () => {
  const temp = st("sensor.aussen", 6.2, { device_class: "temperature" });
  const h = hassOf(temp, LEVEL);
  assert.equal(computeTile({ entity: temp.entity_id, color: "teal" }, h).color, "var(--teal-color)");
  assert.equal(computeTile({ entity: temp.entity_id, color: "#ff0000" }, h).color, "#ff0000");
  assert.equal(computeTile({ entity: temp.entity_id }, h).color, "var(--deep-orange-color)");
  assert.equal(computeTile({ entity: LEVEL.entity_id }, h).color, "var(--primary-color)");
  assert.equal(cssColor("red;background:url(x)"), null);
});

test("missing, unavailable and unknown keep the tile, greyed out", () => {
  const off = st("sensor.cpu", "unavailable", { friendly_name: "CPU" });
  const unk = st("sensor.ram", "unknown");
  const h = hassOf(off, unk);
  const a = computeTile({ entity: "sensor.cpu", bar: { percent: true }, subline: "x" }, h);
  assert.equal(a.na, true);
  assert.equal(a.value, "nicht verfügbar");
  assert.equal(a.name, "CPU");
  assert.equal(computeTile({ entity: "sensor.ram" }, h).value, "unbekannt");
  assert.equal(computeTile({ entity: "sensor.gibtsnicht" }, h).value, "Entity nicht gefunden");
  assert.equal(computeTile({}, h).value, "Entity wählen");
  const html = tileHTML(a);
  assert.doesNotMatch(html, /class="kb"/);
  assert.doesNotMatch(html, /class="ks"/);
});

test("English with an English Home Assistant", () => {
  const off = st("sensor.cpu", "unavailable");
  const h = { ...hassOf(off), locale: { language: "en" } };
  assert.equal(computeTile({ entity: "sensor.cpu" }, h).value, "unavailable");
  assert.equal(fmtAgo(3 * 3600e3, "en"), "3 hours ago");
});

test("rows from grid_options decide the look", () => {
  assert.equal(rowsOf({}), 2);
  assert.equal(rowsOf({ grid_options: { rows: "auto" } }), 2);
  assert.equal(rowsOf({ grid_options: { rows: 1 } }), 1);
  assert.equal(rowsOf({ grid_options: { rows: 3 } }), 3);
  assert.equal(rowsOf({ grid_options: { rows: 5 } }), 3);
});

test("HTML is escaped", () => {
  const s = st("sensor.x", 1, { friendly_name: '<img src=x onerror="1">' });
  const html = tileHTML(computeTile({ entity: "sensor.x", subline: "<b>" }, hassOf(s)));
  assert.doesNotMatch(html, /<img|<b>/);
  assert.match(html, /&lt;img/);
});

test("numberOf reads numbers and entity states", () => {
  const h = hassOf(RESERVE);
  assert.equal(numberOf(h, 5), 5);
  assert.equal(numberOf(h, "7.5"), 7.5);
  assert.equal(numberOf(h, "sensor.heizoel_reserve"), 500);
  assert.ok(Number.isNaN(numberOf(h, "sensor.fehlt")));
  assert.ok(Number.isNaN(numberOf(h, "")));
});
