// Fake `hass` and demo sections for the demo page and the screenshots: Heizöl, Energie and a Proxmox node.
const at = "2026-11-20T17:48:00Z";
const s = (entity_id, state, attributes = {}) => ({
  entity_id,
  state: String(state),
  attributes,
  last_changed: at,
  last_updated: at,
});

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
  ];
  return {
    language: lang,
    locale: { language: lang },
    states: Object.fromEntries(list.map((x) => [x.entity_id, x])),
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
