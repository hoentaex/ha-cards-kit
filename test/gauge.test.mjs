import assert from "node:assert/strict";
import { test } from "node:test";

globalThis.HTMLElement ??= class {};
const { arcSVG, computeGauge, gaugeHTML, gaugeRows, gridOptionsOf } = await import("../src/gauge-tile/gauge.js");
const { editorSchema, fromFormData, toFormData } = await import("../src/gauge-tile/editor.js");

const st = (entity_id, state, attributes = {}) => ({
  entity_id,
  state: String(state),
  attributes,
  last_changed: "2026-11-21T10:00:00Z",
  last_updated: "2026-11-21T10:00:00Z",
});
const hassOf = (...states) => ({
  locale: { language: "de" },
  states: Object.fromEntries(states.map((s) => [s.entity_id, s])),
  entities: {},
});
const RAM = st("sensor.ram", 61.2, { unit_of_measurement: "%", friendly_name: "RAM", belegt: "19,6 / 32 GB" });
const TEMP = st("sensor.temp", 48, { unit_of_measurement: "°C", device_class: "temperature" });
const SOC = st("sensor.soc", 76, { unit_of_measurement: "%", device_class: "battery" });
const LIMIT = st("sensor.limit", 20, { unit_of_measurement: "%" });

test("% values fill the arc 0–100 without min/max, no marker unless one is set", () => {
  const g = computeGauge({ entity: "sensor.ram" }, hassOf(RAM));
  assert.ok(Math.abs(g.p - 61.2) < 1e-9);
  assert.equal(g.m, undefined);
  assert.equal(g.value, "61,2");
  assert.equal(g.layout, "normal");
  assert.doesNotMatch(arcSVG(62, 4, g.p, g.m), /class="mark"/);
});

test("other units need max; without a range the arc stays empty", () => {
  assert.equal(computeGauge({ entity: "sensor.temp" }, hassOf(TEMP)).p, 0);
  assert.equal(computeGauge({ entity: "sensor.temp", max: 100 }, hassOf(TEMP)).p, 48);
  assert.equal(computeGauge({ entity: "sensor.temp", min: 20, max: 80 }, hassOf(TEMP)).p, (28 / 60) * 100);
});

test("marker as a number or an entity, drawn across the arc", () => {
  const h = hassOf(SOC, LIMIT);
  assert.equal(computeGauge({ entity: "sensor.soc", marker: 30 }, h).m, 30);
  const g = computeGauge({ entity: "sensor.soc", marker: "sensor.limit" }, h);
  assert.equal(g.m, 20);
  assert.match(arcSVG(62, 4, g.p, g.m), /<line class="mark"/);
});

test("thresholds and colors as in the KPI tile", () => {
  const h = hassOf(RAM);
  assert.equal(computeGauge({ entity: "sensor.ram", warn: { above: 60 } }, h).level, "warn");
  assert.match(computeGauge({ entity: "sensor.ram", bad: { above: 60 } }, h).color, /--error-color/);
  assert.equal(computeGauge({ entity: "sensor.temp" }, hassOf(TEMP)).color, "var(--deep-orange-color)");
});

test("layout and rows: compact 1 row, normal 2, big from 3 rows with the sub line", () => {
  const h = hassOf(RAM);
  const sub = { attribute: "belegt" };
  assert.equal(gaugeRows({ layout: "compact" }), 1);
  assert.equal(gaugeRows({}), 2);
  assert.equal(computeGauge({ entity: "sensor.ram", subline: sub }, h).sub, "");
  const big = computeGauge({ entity: "sensor.ram", subline: sub, grid_options: { rows: 3 } }, h);
  assert.equal(big.big, true);
  assert.equal(big.sub, "19,6 / 32 GB");
  const compact = computeGauge({ entity: "sensor.ram", layout: "compact", subline: sub, grid_options: { rows: 2 } }, h);
  assert.equal(compact.big, false);
  assert.equal(compact.sub, "");
  assert.deepEqual(gridOptionsOf({ layout: "compact" }).rows, 1);
  assert.deepEqual(gridOptionsOf({}).rows, 2);
  assert.match(gaugeHTML(compact), /<span class="t">/);
});

test("missing or unavailable: greyed out, empty arc, no marker", () => {
  const off = st("sensor.ram", "unavailable", { friendly_name: "RAM" });
  const g = computeGauge({ entity: "sensor.ram", marker: 50 }, hassOf(off));
  assert.equal(g.na, true);
  assert.equal(g.p, 0);
  assert.equal(g.m, undefined);
  assert.equal(g.value, "nicht verfügbar");
  assert.equal(computeGauge({ entity: "sensor.fehlt" }, hassOf()).value, "Entity nicht gefunden");
});

test("icon background on by default, off when set to false", () => {
  assert.match(gaugeHTML(computeGauge({ entity: "sensor.ram" }, hassOf(RAM))), /class="gi bg"/);
  assert.doesNotMatch(gaugeHTML(computeGauge({ entity: "sensor.ram", icon_background: false }, hassOf(RAM))), /gi bg/);
});

test("editor: config → form → config keeps everything, defaults dropped, unknown keys kept", () => {
  for (const config of [
    { entity: "sensor.ram" },
    { entity: "sensor.ram", layout: "compact", warn: { above: 80 }, bad: { above: 95 } },
    { entity: "sensor.temp", min: 20, max: 100, marker: 70, icon_background: false, color: "orange" },
    { entity: "sensor.soc", max: "sensor.cap", marker: "sensor.limit", subline: { attribute: "x", suffix: " frei" } },
    { entity: "sensor.ram", tap_action: { action: "navigate", navigation_path: "/server" } },
  ])
    assert.deepEqual(fromFormData(toFormData(config)), config);
  const base = { entity: "sensor.ram", grid_options: { columns: 6, rows: 3 }, visibility: [{ condition: "state" }] };
  assert.deepEqual(fromFormData({ ...toFormData(base), name: "Neu" }, base), { ...base, name: "Neu" });
  assert.deepEqual(fromFormData({ ...toFormData({ entity: "sensor.ram" }), min: 0, marker: "" }), {
    entity: "sensor.ram",
  });
});

test("editor: compact drops the sub line, schema hides it", () => {
  const d = { ...toFormData({ entity: "sensor.ram", subline: "x" }), layout: "compact" };
  assert.equal(fromFormData(d).subline, undefined);
  const names = (s) => s.flatMap((x) => (x.schema ? names(x.schema) : [x.name])).filter(Boolean);
  assert.ok(!names(editorSchema("de", d)).includes("subline_type"));
  assert.ok(names(editorSchema("de", { layout: "normal" })).includes("subline_type"));
  assert.ok(names(editorSchema("en", {})).includes("marker"));
});
