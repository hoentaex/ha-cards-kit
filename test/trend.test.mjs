import assert from "node:assert/strict";
import { test } from "node:test";
import { computeTile, tileHTML } from "../src/kpi-tile/tile.js";
import {
  historyPoints,
  historyRequest,
  mergePoints,
  sample,
  sampleCount,
  trendConfig,
  trendPath,
  trendSVG,
} from "../src/kpi-tile/trend.js";

const NOW = Date.parse("2026-11-20T18:00:00Z");
const H = 3_600_000;
const st = (entity_id, state, attributes = {}) => ({
  entity_id,
  state: String(state),
  attributes,
  last_changed: "2026-11-20T17:48:00Z",
  last_updated: "2026-11-20T17:48:00Z",
});
const hassOf = (...states) => ({
  locale: { language: "de" },
  states: Object.fromEntries(states.map((s) => [s.entity_id, s])),
  entities: {},
});
const PV = st("sensor.pv", 3.4, { unit_of_measurement: "kW", device_class: "power" });

test("trendConfig: defaults, true, hours and limits", () => {
  assert.equal(trendConfig({}), null);
  assert.deepEqual(trendConfig({ trend: true }), { hours: 24, detail: true, color: undefined });
  assert.deepEqual(trendConfig({ trend: { hours_to_show: 6, detail: false, color: "teal" } }), {
    hours: 6,
    detail: false,
    color: "teal",
  });
  assert.equal(trendConfig({ trend: { hours_to_show: -3 } }).hours, 24);
  assert.equal(trendConfig({ trend: { hours_to_show: 99999 } }).hours, 720);
});

test("historyPoints reads the compressed and the long form; unavailable is NaN", () => {
  const msg = {
    states: {
      "sensor.pv": [
        { s: "1.5", lu: 1000 },
        { s: "unavailable", lu: 1060 },
        { state: "2", last_updated: "1970-01-01T00:20:00Z" },
      ],
    },
  };
  const p = historyPoints(msg, "sensor.pv");
  assert.deepEqual(p[0], [1_000_000, 1.5]);
  assert.ok(Number.isNaN(p[1][1]));
  assert.deepEqual(p[2], [1_200_000, 2]);
  assert.deepEqual(historyPoints(msg, "sensor.other"), []);
  assert.deepEqual(historyPoints(undefined, "sensor.pv"), []);
});

test("mergePoints sorts and keeps only the last point before the window", () => {
  const out = mergePoints(
    [[NOW - 30 * H, 1]],
    [
      [NOW - 1 * H, 3],
      [NOW - 26 * H, 2],
      [NOW - 2 * H, 4],
    ],
    24,
    NOW,
  );
  assert.deepEqual(out, [
    [NOW - 26 * H, 2],
    [NOW - 2 * H, 4],
    [NOW - H, 3],
  ]);
});

test("sample: time-weighted means, the value before the window counts, NaN without a value", () => {
  // 4 slices of 1 h: 10 until 1.5 h ago, then 20.
  const pts = [
    [NOW - 10 * H, 10],
    [NOW - 1.5 * H, 20],
  ];
  assert.deepEqual(sample(pts, 4, 4, NOW), [10, 10, 15, 20]);
  // Starts 2 h ago: the first slices have no value; unavailable makes a gap.
  const late = [
    [NOW - 2 * H, 5],
    [NOW - 1 * H, Number.NaN],
  ];
  const v = sample(late, 4, 4, NOW);
  assert.ok(Number.isNaN(v[0]) && Number.isNaN(v[1]) && Number.isNaN(v[3]));
  assert.equal(v[2], 5);
});

test("sampleCount: about 10 minutes with detail, hours without", () => {
  assert.equal(sampleCount(24, true), 120);
  assert.equal(sampleCount(6, true), 36);
  assert.equal(sampleCount(1, true), 24);
  assert.equal(sampleCount(24, false), 24);
  assert.equal(sampleCount(6, false), 10);
});

test("trendPath: a line from edge to edge with padding, a flat value in the middle, null without data", () => {
  assert.equal(trendPath([], { hours: 24 }, NOW), null);
  const flat = trendPath([[NOW - 30 * H, 7]], { hours: 24, detail: false }, NOW);
  assert.match(flat.line, /^M0,50 L/);
  assert.match(flat.line, /L100,50$/);
  assert.match(flat.fill, /L100,100 L0,100 Z$/);
  const rise = trendPath(
    [
      [NOW - 30 * H, 0],
      [NOW - 12 * H, 10],
    ],
    { hours: 24, detail: false },
    NOW,
  );
  const ys = [...rise.line.matchAll(/,([\d.]+)/g)].map((m) => Number(m[1]));
  assert.ok(Math.max(...ys) < 100 && Math.min(...ys) > 0, "padding keeps the line inside");
  assert.ok(ys[0] > ys.at(-1), "higher values are drawn higher");
});

test("trendPath: a gap splits the line into pieces", () => {
  const p = trendPath(
    [
      [NOW - 30 * H, 1],
      [NOW - 12 * H, Number.NaN],
      [NOW - 6 * H, 2],
    ],
    { hours: 24, detail: false },
    NOW,
  );
  assert.equal(p.line.match(/M/g).length, 2);
  assert.equal(p.fill.match(/Z/g).length, 2);
});

test("trendSVG and historyRequest", () => {
  assert.equal(trendSVG(null), "");
  assert.match(trendSVG({ line: "M0,0", fill: "M0,0 Z" }), /<path class="l" d="M0,0"\/>/);
  assert.deepEqual(historyRequest("sensor.pv", 6, NOW), {
    type: "history/stream",
    entity_ids: ["sensor.pv"],
    start_time: "2026-11-20T12:00:00.000Z",
    minimal_response: true,
    no_attributes: true,
    significant_changes_only: false,
  });
});

test("tile: a trend replaces the bar and takes its own color, else the tile's", () => {
  const t = computeTile({ entity: PV.entity_id, bar: { max: 10 }, trend: { color: "teal" } }, hassOf(PV), NOW);
  assert.equal(t.p, undefined);
  assert.deepEqual(t.trend, { hours: 24, detail: true, color: "var(--teal-color)" });
  assert.match(tileHTML(t), /<span class="kt" style="--tc:var\(--teal-color\)"><\/span>/);
  assert.doesNotMatch(tileHTML(t), /class="kb"/);
  const own = computeTile({ entity: PV.entity_id, color: "purple", trend: true }, hassOf(PV), NOW);
  assert.equal(own.trend.color, "var(--purple-color)");
  const auto = computeTile({ entity: PV.entity_id, trend: true }, hassOf(PV), NOW);
  assert.equal(auto.trend.color, auto.color);
});

test("tile: on warn and bad the line takes that color", () => {
  const warn = computeTile({ entity: PV.entity_id, warn: { above: 3 }, trend: { color: "teal" } }, hassOf(PV), NOW);
  assert.equal(warn.level, "warn");
  assert.equal(warn.trend.color, warn.color);
  const bad = computeTile({ entity: PV.entity_id, bad: { above: 3 }, trend: { color: "teal" } }, hassOf(PV), NOW);
  assert.equal(bad.trend.color, bad.color);
});

test("tile: no trend at 1 row, for text states or without a value; the bar stays then", () => {
  const one = computeTile(
    { entity: PV.entity_id, bar: { max: 10 }, trend: true, grid_options: { rows: 1 } },
    hassOf(PV),
    NOW,
  );
  assert.equal(one.trend, undefined);
  assert.equal(one.p, 34);
  const text = st("sensor.mode", "eco");
  assert.equal(computeTile({ entity: text.entity_id, trend: true }, hassOf(text), NOW).trend, undefined);
  const na = computeTile({ entity: "sensor.pv", trend: true }, hassOf(st("sensor.pv", "unavailable")), NOW);
  assert.equal(na.trend, undefined);
  assert.doesNotMatch(tileHTML(na), /class="kt"/);
});
