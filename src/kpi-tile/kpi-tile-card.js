// custom:kpi-tile-card – one KPI as one card: icon, name, the value large, a sub line and a bar or a trend line.
import { computeTile, rowsOf, tileHTML } from "./tile.js";
import { historyPoints, historyRequest, mergePoints, trendConfig, trendPath, trendSVG } from "./trend.js";
import { STYLE } from "./styles.js";
import "./editor.js";

const DEFAULT_TAP = { action: "more-info" };

export class KpiTileCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._sig = "";
    this._trendKey = "";
    this._points = [];
  }

  static getConfigElement() {
    return document.createElement("kpi-tile-card-editor");
  }

  /** A new card starts with the first numeric sensor that has a unit. */
  static getStubConfig(hass) {
    const states = hass?.states || {};
    const id =
      Object.keys(states).find(
        (k) =>
          k.startsWith("sensor.") &&
          states[k].attributes?.unit_of_measurement &&
          Number.isFinite(Number(states[k].state)),
      ) || "";
    return { entity: id };
  }

  setConfig(config) {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    this._config = { ...config };
    this._sig = "";
    this._render();
    this._syncTrend();
  }

  set hass(hass) {
    this._hass = hass;
    const sig = this._signature();
    if (sig !== this._sig) {
      this._sig = sig;
      this._render();
    } else if (this._icon) this._icon.hass = hass;
    this._syncTrend();
  }

  get hass() {
    return this._hass;
  }

  getCardSize() {
    return rowsOf(this._config);
  }

  getGridOptions() {
    return { columns: 4, rows: 2, min_columns: 2, min_rows: 1, max_rows: 3 };
  }

  connectedCallback() {
    // The "x minutes ago" sub line ages and the trend's window moves on without a state change.
    if (!this._timer)
      this._timer = setInterval(() => {
        if (this._config?.subline?.last_changed || this._trendKey) this._render();
      }, 60_000);
    this._syncTrend();
  }

  disconnectedCallback() {
    clearInterval(this._timer);
    this._timer = null;
    this._syncTrend();
  }

  /**
   * Keeps one subscription to Home Assistant's history stream while the card is shown with a trend: a new one when
   * the entity or the window changes, none without a trend, at 1 row, without the history integration or when hidden.
   */
  _syncTrend() {
    const c = this._config;
    const t = c && trendConfig(c);
    const comps = this._hass?.config?.components;
    const ok =
      t &&
      c.entity &&
      this.isConnected &&
      this._hass?.connection &&
      rowsOf(c) > 1 &&
      (!comps || comps.includes("history"));
    const key = ok ? `${c.entity}|${t.hours}` : "";
    if (key === this._trendKey) return;
    this._trendSub?.then((unsub) => unsub?.()).catch(() => undefined);
    this._trendSub = null;
    this._trendKey = key;
    this._points = [];
    if (!key) return;
    const entity = c.entity;
    this._trendSub = this._hass.connection
      .subscribeMessage(
        (msg) => {
          if (this._trendKey !== key) return;
          this._points = mergePoints(this._points, historyPoints(msg, entity), t.hours);
          this._render();
        },
        historyRequest(entity, t.hours),
      )
      .catch(() => undefined);
  }

  /** Re-render only when a state the tile reads (or the language) changed. */
  _signature() {
    const c = this._config || {};
    const st = this._hass?.states || {};
    const ids = [
      c.entity,
      c.subline?.entity,
      c.bar?.min,
      c.bar?.max,
      c.bar?.marker,
      c.warn?.above,
      c.warn?.below,
      c.bad?.above,
      c.bad?.below,
    ];
    const parts = ids
      .filter((v) => typeof v === "string" && v.includes("."))
      .map((id) => `${id}=${st[id]?.state}@${st[id]?.last_updated ?? ""}`);
    const main = st[c.entity];
    if (main && c.subline?.attribute) parts.push(JSON.stringify(main.attributes?.[c.subline.attribute] ?? null));
    return [this._hass?.locale?.language, this._hass?.language, ...parts].join("|");
  }

  _tap() {
    return this._config.tap_action || DEFAULT_TAP;
  }

  _render() {
    if (!this._config || !this._hass) return;
    const t = computeTile(this._config, this._hass);
    const act = !t.na && this._tap().action !== "none";
    const cls = [`r${t.rows}`, t.level, t.na ? "na" : "", act ? "act" : ""].filter(Boolean).join(" ");
    if (!this._card) {
      this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card></ha-card>`;
      this._card = this.shadowRoot.querySelector("ha-card");
      this._card.addEventListener("click", () => this._action());
      this._card.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          this._action();
        }
      });
    }
    this._card.className = cls;
    this._card.style.setProperty("--c", t.color);
    this._card.innerHTML = tileHTML(t);
    if (act) {
      this._card.setAttribute("tabindex", "0");
      this._card.setAttribute("role", "button");
    } else {
      this._card.removeAttribute("tabindex");
      this._card.removeAttribute("role");
    }
    // Home Assistant's own icon element: the entity's icon (device class, state) unless one is configured.
    this._icon = this._icon || document.createElement("ha-state-icon");
    this._icon.hass = this._hass;
    this._icon.stateObj = t.stateObj;
    this._icon.icon = t.icon || undefined;
    this._card.querySelector(".ki").append(this._icon);
    const kt = this._card.querySelector(".kt");
    if (kt) kt.innerHTML = trendSVG(trendPath(this._points, t.trend));
  }

  /** Tap: handed to Home Assistant's action handling (more-info by default, navigate, perform-action, …). */
  _action() {
    if (!this._card.classList.contains("act")) return;
    const config = { entity: this._config.entity, tap_action: this._tap() };
    this.dispatchEvent(
      new CustomEvent("hass-action", { detail: { config, action: "tap" }, bubbles: true, composed: true }),
    );
  }
}

if (!customElements.get("kpi-tile-card")) customElements.define("kpi-tile-card", KpiTileCard);
