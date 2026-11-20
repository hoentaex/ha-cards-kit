// Look of the KPI tile, from the theme. The card's own ha-card is the tile: background, border and radius stay the
// theme's; only the warn/bad state tints them. Classes r1/r2/r3 follow the height in grid rows.
export const STYLE = `
:host { display: block; height: 100%; }
ha-card {
  --kit-text: var(--primary-text-color, #212121);
  --kit-sub: var(--secondary-text-color, #727272);
  --kit-card: var(--ha-card-background, var(--card-background-color, #fff));
  height: 100%; box-sizing: border-box; overflow: hidden; container-type: inline-size;
  display: flex; flex-direction: column; gap: 3px; min-width: 0; padding: 10px 12px; color: var(--kit-text);
}
ha-card.act { cursor: pointer; }
ha-card.act:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 2px; }
.top { display: flex; align-items: center; gap: 8px; min-width: 0; }
.ki { width: 28px; height: 28px; flex: none; border-radius: 50%; display: grid; place-items: center;
      color: color-mix(in srgb, var(--c) 82%, var(--kit-text)); background: color-mix(in srgb, var(--c) 18%, var(--kit-card));
      --mdc-icon-size: 16px; }
.kk { font-size: 12.5px; line-height: 1.3; color: var(--kit-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.kv { font-size: 22px; font-weight: 500; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      font-variant-numeric: tabular-nums; }
.kv small { font-size: 12px; font-weight: 400; color: var(--kit-sub); margin-left: 4px; }
.ks { font-size: 11.5px; line-height: 1.35; color: var(--kit-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.kb { position: relative; flex: none; height: 4px; margin-top: auto; border-radius: 2px; background: color-mix(in srgb, var(--kit-sub) 25%, transparent); }
.kb i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 2px; background: var(--c); }
.kb b { position: absolute; top: -3px; bottom: -3px; width: 2px; margin-left: -1px; border-radius: 1px; background: var(--kit-text); opacity: .7; }
ha-card.warn, ha-card.bad {
  --ha-card-border-color: color-mix(in srgb, var(--c) 45%, transparent);
  --ha-card-background: color-mix(in srgb, var(--c) 8%, var(--card-background-color, #fff));
}
ha-card.warn .kv, ha-card.bad .kv { color: color-mix(in srgb, var(--c) 70%, var(--kit-text)); }
ha-card.na .top, ha-card.na .kv { opacity: .6; }
ha-card.na .kv { font-size: 14px; font-weight: 400; color: var(--kit-sub); }
@container (min-width: 220px) { ha-card.r2 .kv, ha-card.r3 .kv { font-size: 28px; } }
@container (max-width: 110px) { .kv { font-size: 17px; } .kv small { display: block; margin: 0; } }

/* 1 row: icon left, label above the value; no sub line, no bar. */
ha-card.r1 { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 10px; row-gap: 0; align-content: center; padding: 6px 10px; }
ha-card.r1 .top { display: contents; }
ha-card.r1 .ki { grid-row: span 2; }
ha-card.r1 .kk { font-size: 11.5px; }
ha-card.r1 .kv { font-size: 16px; }
ha-card.r1 .ks, ha-card.r1 .kb { display: none; }

/* 3 rows: big icon on top, label under it. */
ha-card.r3 { padding: 11px 12px 12px; gap: 4px; }
ha-card.r3 .top { flex-direction: column; align-items: flex-start; gap: 6px; }
ha-card.r3 .ki { width: 32px; height: 32px; --mdc-icon-size: 18px; }
ha-card.r3 .ks { white-space: normal; }
`;
