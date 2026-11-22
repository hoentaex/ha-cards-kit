// Fake `hass` and demo sections for the demo page and the screenshots: Heizöl, Energie, a Proxmox node and trends.
const at = "2026-11-20T17:48:00Z";
const s = (entity_id, state, attributes = {}) => ({
  entity_id,
  state: String(state),
  attributes,
  last_changed: at,
  last_updated: at,
});

// Made-up history for the trend lines: a curve per entity that ends in the current state, one point every 10 minutes.
const HOUR = 3_600_000;
const hourOf = (t) => new Date(t).getHours() + new Date(t).getMinutes() / 60;
const wobble = (t, seed) => Math.sin(t / 600_000 + seed) * Math.sin(t / 1_700_000 + seed * 3);
const CURVES = {
  "sensor.aussentemperatur": (t) => 5.5 + 4.3 * Math.sin(((hourOf(t) - 9) / 24) * 2 * Math.PI) + 0.3 * wobble(t, 1),
  "sensor.hausverbrauch": (t) => {
    const h = hourOf(t);
    return 380 + 160 * Math.abs(wobble(t, 2)) + (h > 6.5 && h < 8 ? 900 : 0) + (h > 17.5 && h < 20.5 ? 700 : 0);
  },
  "sensor.strompreis": (t) => {
    const h = Math.floor(hourOf(t));
    return 0.22 + 0.06 * Math.max(0, Math.sin(((h - 5) / 24) * 2 * Math.PI)) + (h >= 17 && h <= 20 ? 0.07 : 0);
  },
  "sensor.speicher_soc": (t) => {
    const h = hourOf(t);
    return Math.max(15, Math.min(100, 25 + 70 * Math.max(0, Math.sin(((h - 9) / 10) * Math.PI)) - (h > 19 ? 8 : 0)));
  },
};
function fakeHistory(states) {
  return {
    subscribeMessage(callback, msg) {
      const id = msg.entity_ids[0];
      const curve = CURVES[id];
      const st = states[id];
      if (curve && st) {
        const now = Date.now();
        const end = Number(st.state);
        const shift = Number.isFinite(end) ? end - curve(now) : 0;
        const list = [];
        for (let t = Date.parse(msg.start_time) - HOUR; t < now; t += 600_000)
          list.push({ s: String(Number((curve(t) + shift).toFixed(3))), lu: t / 1000 });
        list.push({ s: st.state, lu: now / 1000 });
        setTimeout(() => callback({ states: { [id]: list } }), 0);
      }
      return Promise.resolve(() => {});
    },
  };
}

export function makeHass({ lang = "de", cpuOff = false } = {}) {
  const list = [
    s("sensor.heizoel_fuellstand", 1840, {
      unit_of_measurement: "L",
      friendly_name: "Heizöl Füllstand",
      icon: "mdi:storage-tank",
      reichweite_tage: 132,
    }),
    s("sensor.heizoel_reserve", 500, { unit_of_measurement: "L" }),
    s("sensor.heizoel_tank", 3000, { unit_of_measurement: "L" }),
    s("sensor.heizoel_verbrauch_30d", 142, { unit_of_measurement: "L", icon: "mdi:water", schnitt: "4,7 L/Tag" }),
    s("sensor.heizoel_preis", 98.4, {
      unit_of_measurement: "€/100 L",
      device_class: "monetary",
      icon: "mdi:currency-eur",
      trend: "fallend",
    }),
    s("sensor.heizoel_letzte_lieferung", "2026-09-12", { icon: "mdi:truck", menge: "2.100 L" }),
    s("sensor.pv_leistung", 3.42, {
      unit_of_measurement: "kW",
      device_class: "power",
      icon: "mdi:solar-power",
      peak_heute: "4,9 kW",
    }),
    s("sensor.hausverbrauch", 640, { unit_of_measurement: "W", device_class: "power", icon: "mdi:home" }),
    s("sensor.netzbezug_heute", 6.84, {
      unit_of_measurement: "kWh",
      device_class: "energy",
      icon: "mdi:transmission-tower",
    }),
    s("sensor.einspeisung_heute", 12.3, { unit_of_measurement: "kWh", device_class: "energy", icon: "mdi:upload" }),
    s("sensor.autarkie_heute", 83, { unit_of_measurement: "%", icon: "mdi:leaf" }),
    s("sensor.pve_cpu", cpuOff ? "unavailable" : 23.4, {
      unit_of_measurement: "%",
      friendly_name: "CPU",
      icon: "mdi:chip",
      kerne: 8,
    }),
    s("sensor.pve_ram", 61.2, { unit_of_measurement: "%", icon: "mdi:chip", belegt: "19,6 / 32 GB" }),
    s("sensor.pve_storage", 87.5, { unit_of_measurement: "%", icon: "mdi:storage-tank", frei: "117 GB" }),
    s("sensor.pve_vms", 7, { icon: "mdi:server", gesamt: 9 }),
    s("sensor.pve_updates", 3, { icon: "mdi:update" }),
    s("sensor.gateway_cpu", cpuOff ? 91 : 23, {
      unit_of_measurement: "%",
      friendly_name: "CPU",
      icon: "mdi:chip",
      kerne: 4,
    }),
    s("sensor.gateway_ram", 61, { unit_of_measurement: "%", friendly_name: "RAM", icon: "mdi:memory" }),
    s("sensor.gateway_temperatur", cpuOff ? 74 : 48, {
      unit_of_measurement: "°C",
      friendly_name: "Temperatur",
      device_class: "temperature",
      icon: "mdi:thermometer",
    }),
    s("sensor.pve_01_cpu", 14, { unit_of_measurement: "%", friendly_name: "CPU", icon: "mdi:chip" }),
    s("sensor.pve_01_ram", cpuOff ? 96 : 59, { unit_of_measurement: "%", friendly_name: "RAM", icon: "mdi:memory" }),
    s("sensor.pve_01_disk", 18, { unit_of_measurement: "%", friendly_name: "Disk", icon: "mdi:harddisk" }),
    s("sensor.pve_02_cpu", 1, { unit_of_measurement: "%", friendly_name: "CPU", icon: "mdi:chip" }),
    s("sensor.pve_02_ram", 28, { unit_of_measurement: "%", friendly_name: "RAM", icon: "mdi:memory" }),
    s("sensor.pve_02_disk", cpuOff ? "unavailable" : 1, {
      unit_of_measurement: "%",
      friendly_name: "Disk",
      icon: "mdi:harddisk",
    }),
    s("sensor.speicher_soc", cpuOff ? 12 : 76, {
      unit_of_measurement: "%",
      friendly_name: "Speicher",
      device_class: "battery",
      icon: "mdi:battery",
      reichweite: "bis 06:40",
    }),
    s("sensor.speicher_reserve", 20, { unit_of_measurement: "%" }),
    s("sensor.aussentemperatur", 4.3, {
      unit_of_measurement: "°C",
      friendly_name: "Außen",
      device_class: "temperature",
      icon: "mdi:thermometer",
      min_max: "1,2 / 9,8 °C",
    }),
    s("sensor.strompreis", cpuOff ? 0.342 : 0.268, {
      unit_of_measurement: "€/kWh",
      friendly_name: "Strompreis",
      device_class: "monetary",
      icon: "mdi:currency-eur",
    }),
  ];
  const states = Object.fromEntries(list.map((x) => [x.entity_id, x]));
  return {
    language: lang,
    locale: { language: lang },
    states,
    config: { components: ["history"] },
    connection: fakeHistory(states),
    entities: { "sensor.pv_leistung": { display_precision: 2 }, "sensor.heizoel_preis": { display_precision: 2 } },
    formatEntityState: (st) =>
      /^\d{4}-\d\d-\d\d$/.test(st.state)
        ? new Date(`${st.state}T12:00:00Z`).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB")
        : st.state,
    themes: { darkMode: false },
  };
}

const tile = (entity, columns, rows, extra = {}) => ({ entity, grid_options: { columns, rows }, ...extra });

export const SECTIONS = [
  {
    title: "Heizöl",
    icon: "mdi:storage-tank",
    cards: [
      tile("sensor.heizoel_fuellstand", 8, 3, {
        name: "Füllstand",
        subline: { attribute: "reichweite_tage", prefix: "reicht noch ", suffix: " Tage" },
        bar: { max: "sensor.heizoel_tank", marker: "sensor.heizoel_reserve" },
        warn: { below: 800 },
        bad: { below: 500 },
      }),
      tile("sensor.heizoel_verbrauch_30d", 4, 3, { name: "30 Tage", subline: { attribute: "schnitt", prefix: "Ø " } }),
      tile("sensor.heizoel_preis", 6, 2, { name: "Preis", subline: { attribute: "trend", prefix: "Trend " } }),
      tile("sensor.heizoel_letzte_lieferung", 6, 2, { name: "Letzte Lieferung", subline: { attribute: "menge" } }),
    ],
  },
  {
    title: "Energie heute",
    icon: "mdi:flash",
    cards: [
      tile("sensor.pv_leistung", 6, 2, {
        name: "PV jetzt",
        subline: { attribute: "peak_heute", prefix: "Spitze heute " },
        bar: { max: 9.8 },
        color: "amber",
      }),
      tile("sensor.hausverbrauch", 6, 2, { name: "Verbrauch", subline: { last_changed: true } }),
      tile("sensor.netzbezug_heute", 4, 1, { name: "Netzbezug", color: "purple" }),
      tile("sensor.einspeisung_heute", 4, 1, { name: "Einspeisung", color: "green" }),
      tile("sensor.autarkie_heute", 4, 1, { name: "Autarkie", color: "green" }),
    ],
  },
  {
    title: "pve-01",
    icon: "mdi:server",
    cards: [
      tile("sensor.pve_cpu", 4, 2, {
        bar: { percent: true },
        subline: { attribute: "kerne", suffix: " Kerne" },
        warn: { above: 70 },
        bad: { above: 90 },
      }),
      tile("sensor.pve_ram", 4, 2, {
        name: "RAM",
        bar: { percent: true },
        subline: { attribute: "belegt" },
        warn: { above: 80 },
        bad: { above: 95 },
      }),
      tile("sensor.pve_storage", 4, 2, {
        name: "Storage",
        bar: { percent: true },
        subline: { attribute: "frei", suffix: " frei" },
        warn: { above: 80 },
        bad: { above: 95 },
      }),
      tile("sensor.pve_vms", 6, 1, { name: "VMs" }),
      tile("sensor.pve_updates", 6, 1, { name: "Updates", warn: { above: 0 } }),
    ],
  },
  {
    title: "Verlauf",
    icon: "mdi:flash",
    cards: [
      tile("sensor.aussentemperatur", 6, 2, { subline: { attribute: "min_max", prefix: "Min / Max " }, trend: true }),
      tile("sensor.hausverbrauch", 6, 2, { name: "Verbrauch", trend: { hours_to_show: 24, color: "teal" } }),
      tile("sensor.strompreis", 6, 3, {
        digits: 3,
        subline: "Ab 21 Uhr günstiger",
        warn: { above: 0.3 },
        trend: { hours_to_show: 24, color: "blue", detail: false },
      }),
      tile("sensor.speicher_soc", 6, 3, {
        name: "Speicher",
        subline: { attribute: "reichweite", prefix: "reicht " },
        trend: { hours_to_show: 24, color: "green" },
      }),
    ],
  },
];

const gauge = (entity, columns, rows, extra = {}) => ({
  type: "gauge-tile-card",
  entity,
  grid_options: { columns, rows },
  ...extra,
});
const cpu = { warn: { above: 70 }, bad: { above: 90 } };
const mem = { warn: { above: 80 }, bad: { above: 95 } };

export const GAUGE_SECTIONS = [
  {
    title: "System",
    icon: "mdi:thermometer",
    cards: [
      gauge("sensor.gateway_cpu", 4, 2, cpu),
      gauge("sensor.gateway_ram", 4, 2, mem),
      gauge("sensor.gateway_temperatur", 4, 2, { max: 100, warn: { above: 70 }, bad: { above: 85 } }),
    ],
  },
  {
    title: "pve-01",
    icon: "mdi:server",
    cards: [
      gauge("sensor.pve_01_cpu", 4, 1, { layout: "compact", ...cpu }),
      gauge("sensor.pve_01_ram", 4, 1, { layout: "compact", ...mem }),
      gauge("sensor.pve_01_disk", 4, 1, { layout: "compact", ...mem }),
    ],
  },
  {
    title: "pve-02",
    icon: "mdi:server",
    cards: [
      gauge("sensor.pve_02_cpu", 4, 1, { layout: "compact", ...cpu }),
      gauge("sensor.pve_02_ram", 4, 1, { layout: "compact", ...mem }),
      gauge("sensor.pve_02_disk", 4, 1, { layout: "compact", ...mem }),
    ],
  },
  {
    title: "Energie heute",
    icon: "mdi:flash",
    cards: [
      gauge("sensor.autarkie_heute", 6, 3, { name: "Autarkie", color: "green" }),
      gauge("sensor.speicher_soc", 6, 3, {
        marker: "sensor.speicher_reserve",
        subline: { attribute: "reichweite", prefix: "reicht " },
        warn: { below: 30 },
        bad: { below: 15 },
      }),
    ],
  },
];
