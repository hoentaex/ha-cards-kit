// custom:gauge-tile-card – one value as an open arc: normal (arc centered, value and name below) or compact.
import { computeGauge, gaugeHTML, gaugeRows, gridOptionsOf } from "./gauge.js";
import { STYLE } from "./styles.js";
import "./editor.js";

const DEFAULT_TAP = { action: "more-info" };

export class GaugeTileCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._sig = "";
  }

  static getConfigElement() {
    return document.createElement("gauge-tile-card-editor");
  }

  /** A new card starts with the first sensor in %, else the first numeric sensor with a unit. */
  static getStubConfig(hass) {
    const states = hass?.states || {};
    const ids = Object.keys(states).filter((k) => k.startsWith("sensor.") && Number.isFinite(Number(states[k].state)));
    const unit = (k) => states[k].attributes?.unit_of_measurement;
    return { entity: ids.find((k) => unit(k) === "%") || ids.find((k) => unit(k)) || "" };
  }

  setConfig(config) {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    this._config = { ...config };
    this._sig = "";
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const sig = this._signature();
    if (sig !== this._sig) {
      this._sig = sig;
      this._render();
    } else if (this._icon) this._icon.hass = hass;
  }

  get hass() {
    return this._hass;
  }

  getCardSize() {
    return gaugeRows(this._config);
  }

  getGridOptions() {
    return gridOptionsOf(this._config);
  }

  connectedCallback() {
    if (!this._timer)
      this._timer = setInterval(() => {
        if (this._config?.subline?.last_changed) this._render();
      }, 60_000);
  }

  disconnectedCallback() {
    clearInterval(this._timer);
    this._timer = null;
  }

  /** Re-render only when a state the tile reads (or the language) changed. */
  _signature() {
    const c = this._config || {};
    const st = this._hass?.states || {};
    const ids = [
      c.entity,
      c.subline?.entity,
      c.min,
      c.max,
      c.marker,
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
    const g = computeGauge(this._config, this._hass);
    const act = !g.na && this._tap().action !== "none";
    const cls = [g.layout, g.big ? "big" : "", g.level, g.na ? "na" : "", act ? "act" : ""].filter(Boolean).join(" ");
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
    this._card.style.setProperty("--c", g.color);
    this._card.innerHTML = gaugeHTML(g);
    if (act) {
      this._card.setAttribute("tabindex", "0");
      this._card.setAttribute("role", "button");
    } else {
      this._card.removeAttribute("tabindex");
      this._card.removeAttribute("role");
    }
    this._icon = this._icon || document.createElement("ha-state-icon");
    this._icon.hass = this._hass;
    this._icon.stateObj = g.stateObj;
    this._icon.icon = g.icon || undefined;
    this._card.querySelector(".gi").append(this._icon);
  }

  _action() {
    if (!this._card.classList.contains("act")) return;
    const config = { entity: this._config.entity, tap_action: this._tap() };
    this.dispatchEvent(
      new CustomEvent("hass-action", { detail: { config, action: "tap" }, bubbles: true, composed: true }),
    );
  }
}

if (!customElements.get("gauge-tile-card")) customElements.define("gauge-tile-card", GaugeTileCard);
