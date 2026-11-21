// Look of the gauge tile, from the theme like the KPI tile: the ha-card is the tile, warn/bad tint its border and
// surface. Normal: column, centered. Compact: row, arc left.
export const STYLE = `
:host { display: block; height: 100%; }
ha-card {
  --kit-text: var(--primary-text-color, #212121);
  --kit-sub: var(--secondary-text-color, #727272);
  --kit-card: var(--ha-card-background, var(--card-background-color, #fff));
  height: 100%; box-sizing: border-box; overflow: hidden; container-type: inline-size; color: var(--kit-text);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; padding: 6px 8px; text-align: center; min-width: 0;
}
ha-card.act { cursor: pointer; }
ha-card.act:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 2px; }
.arc { position: relative; flex: none; display: grid; place-items: center; }
.arcsvg { position: absolute; inset: 0; overflow: visible; }
.arcsvg circle { fill: none; stroke-width: var(--w); stroke-linecap: round; }
.arcsvg .track { stroke: color-mix(in srgb, var(--kit-sub) 22%, transparent); }
.arcsvg .fill { stroke: var(--c); }
.arcsvg .mark { stroke: var(--kit-text); stroke-width: 2; stroke-linecap: round; opacity: .75; }
.gi { display: grid; place-items: center; border-radius: 50%; color: color-mix(in srgb, var(--c) 85%, var(--kit-text));
      width: 44%; height: 44%; --mdc-icon-size: 19px; }
.gi.bg { width: 50%; height: 50%; background: color-mix(in srgb, var(--c) 18%, var(--kit-card)); --mdc-icon-size: 17px; }
.gv { font-size: 19px; font-weight: 500; line-height: 1.15; white-space: nowrap; font-variant-numeric: tabular-nums; margin-top: -6px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.gv small { font-size: 12px; font-weight: 400; color: var(--kit-sub); margin-left: 2px; }
.gk { font-size: 12.5px; line-height: 1.3; color: var(--kit-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.gs { font-size: 11.5px; line-height: 1.35; color: var(--kit-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; margin-top: 1px; }
ha-card.big .gv { font-size: 24px; }
ha-card.big .gi { --mdc-icon-size: 26px; }
ha-card.big .gi.bg { --mdc-icon-size: 24px; }
ha-card.warn, ha-card.bad {
  --ha-card-border-color: color-mix(in srgb, var(--c) 45%, transparent);
  --ha-card-background: color-mix(in srgb, var(--c) 8%, var(--card-background-color, #fff));
}
ha-card.warn .gv, ha-card.bad .gv { color: color-mix(in srgb, var(--c) 70%, var(--kit-text)); }
ha-card.na .arc, ha-card.na .gv { opacity: .6; }
ha-card.na .gv { font-size: 13px; font-weight: 400; color: var(--kit-sub); margin-top: -2px; }

/* compact: arc left, name above the value */
ha-card.compact { flex-direction: row; justify-content: flex-start; gap: 10px; padding: 6px 10px; text-align: left; }
.t { display: flex; flex-direction: column; min-width: 0; }
ha-card.compact .gi { --mdc-icon-size: 14px; }
ha-card.compact .gi.bg { --mdc-icon-size: 12px; }
ha-card.compact .gk { font-size: 11.5px; }
ha-card.compact .gv { font-size: 16px; margin: 0; }
ha-card.compact.na .gv { font-size: 12.5px; margin: 0; }
@container (max-width: 120px) { .gv small { display: none; } ha-card:not(.compact) .gv { font-size: 16px; } }
`;
