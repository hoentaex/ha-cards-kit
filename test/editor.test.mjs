import assert from "node:assert/strict";
import { test } from "node:test";

globalThis.HTMLElement ??= class {};
const { editorSchema, fromFormData, toFormData } = await import("../src/kpi-tile/editor.js");

const names = (schema) => schema.flatMap((s) => (s.schema ? names(s.schema) : [s.name])).filter(Boolean);

const FULL = {
  entity: "sensor.heizoel_fuellstand",
  name: "Füllstand",
  icon: "mdi:oil",
  digits: 0,
  color: "orange",
  subline: { attribute: "reichweite_tage", prefix: "reicht noch ", suffix: " Tage" },
  bar: { max: 3000, marker: "sensor.heizoel_reserve" },
  warn: { below: 800 },
  bad: { below: 500 },
  tap_action: { action: "navigate", navigation_path: "/lovelace/heizung" },
};

test("config → form → config keeps everything", () => {
  assert.deepEqual(fromFormData(toFormData(FULL)), FULL);
  for (const config of [
    { entity: "sensor.a", subline: "fester Text" },
    { entity: "sensor.a", subline: { entity: "sensor.b", suffix: " frei" } },
    { entity: "sensor.a", subline: { last_changed: true } },
    { entity: "sensor.a", bar: { percent: true, marker: 20 } },
    { entity: "sensor.a", bar: { min: 20, max: "sensor.max" } },
    { entity: "sensor.a", warn: { above: 70 }, bad: { above: 90 } },
  ])
    assert.deepEqual(fromFormData(toFormData(config)), config);
});

test("defaults and empty fields are dropped", () => {
  const d = { ...toFormData({ entity: "sensor.a" }), name: "", unit: "", tap_action: { action: "more-info" } };
  assert.deepEqual(fromFormData(d), { entity: "sensor.a" });
  assert.deepEqual(fromFormData({ ...d, bar_type: "range", bar_min: 0, bar_max: 100 }), {
    entity: "sensor.a",
    bar: { max: 100 },
  });
});

test("keys the editor does not manage (grid_options, visibility) are kept", () => {
  const base = { entity: "sensor.a", grid_options: { columns: 6, rows: 3 }, visibility: [{ condition: "state" }] };
  const out = fromFormData({ ...toFormData(base), name: "Neu" }, base);
  assert.deepEqual(out.grid_options, base.grid_options);
  assert.deepEqual(out.visibility, base.visibility);
  assert.equal(out.name, "Neu");
});

test("schema shows only the fields of the chosen sub line source and bar type", () => {
  const plain = names(editorSchema("de", toFormData({ entity: "sensor.a" })));
  assert.ok(plain.includes("subline_type") && plain.includes("bar_type") && plain.includes("tap_action"));
  assert.ok(!plain.includes("subline_attribute") && !plain.includes("bar_marker"));
  const full = names(editorSchema("de", toFormData(FULL)));
  for (const n of ["subline_attribute", "subline_prefix", "bar_min", "bar_max", "bar_max_entity", "bar_marker"])
    assert.ok(full.includes(n), n);
  const pct = names(editorSchema("en", { subline_type: "changed", bar_type: "percent" }));
  assert.ok(pct.includes("subline_suffix") && pct.includes("bar_marker") && !pct.includes("bar_max"));
});
