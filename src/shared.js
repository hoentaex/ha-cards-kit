// Helpers every card of the kit uses: language, escaping, numbers, relative times and Home Assistant's color names.

export const LANGS = ["de", "en"];

/** "de" or "en": the card's `language`, else Home Assistant's, else English. */
export const langOf = (hass, config) => {
  const lang = String(config?.language || hass?.locale?.language || hass?.language || "en").slice(0, 2);
  return LANGS.includes(lang) ? lang : "en";
};

/** Locale for numbers: Home Assistant's own language tag when there is one, else one for `lang`. */
export const localeOf = (hass, lang) => hass?.locale?.language || (lang === "de" ? "de-DE" : "en-GB");

export const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Number with `digits` decimals; without `digits` up to two decimals, as many as the value has. */
export const fmtNumber = (n, locale, digits) => {
  const d = Number.isInteger(digits) ? Math.max(0, Math.min(6, digits)) : undefined;
  const opts = d === undefined ? { maximumFractionDigits: 2 } : { minimumFractionDigits: d, maximumFractionDigits: d };
  try {
    return new Intl.NumberFormat(locale, opts).format(n);
  } catch {
    return new Intl.NumberFormat("en-GB", opts).format(n);
  }
};

const NOW_TEXT = { de: "gerade eben", en: "just now" };

/** "vor 5 Minuten" / "5 minutes ago" for a time `ms` milliseconds back. */
export const fmtAgo = (ms, lang) => {
  const s = Math.max(0, ms / 1000);
  if (s < 45) return NOW_TEXT[lang] || NOW_TEXT.en;
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  return rtf.format(-Math.round(s / 86400), "day");
};

// Color names of Home Assistant's ui_color selector; each is a --<name>-color variable of the theme.
export const THEME_COLORS = new Set([
  "primary",
  "accent",
  "red",
  "pink",
  "purple",
  "deep-purple",
  "indigo",
  "blue",
  "light-blue",
  "cyan",
  "teal",
  "green",
  "light-green",
  "lime",
  "yellow",
  "amber",
  "orange",
  "deep-orange",
  "brown",
  "light-grey",
  "grey",
  "dark-grey",
  "blue-grey",
  "black",
  "white",
  "disabled",
]);

/** A color name of the theme → its CSS variable; a CSS color (#hex, rgb(), …) as it is; anything else → null. */
export const cssColor = (color) => {
  if (!color || typeof color !== "string") return null;
  const c = color.trim();
  if (THEME_COLORS.has(c)) return `var(--${c}-color)`;
  return /^(#[0-9a-f]{3,8}|(rgb|rgba|hsl|hsla)\([0-9.,%\s]+\)|[a-z]+)$/i.test(c) ? c : null;
};

/** Whether a config value names an entity ("sensor.x") rather than being a number. */
export const isEntityId = (v) => typeof v === "string" && /^[a-z_]+\.[a-z0-9_]+$/.test(v.trim());

/** A number from the config, or the numeric state of the entity it names; NaN when there is none. */
export const numberOf = (hass, v) => {
  if (v === undefined || v === null || v === "") return Number.NaN;
  if (isEntityId(v)) {
    const st = hass?.states?.[v.trim()]?.state;
    return st === undefined || st === "" ? Number.NaN : Number(st);
  }
  return Number(v);
};
