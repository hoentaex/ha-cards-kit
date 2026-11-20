// Cards Kit: small single-purpose cards in one HACS file. Each card registers its own element; this file lists
// them in the card picker and prints the version once.
import "./kpi-tile/kpi-tile-card.js";

const VERSION = __VERSION__;
const DOCS = "https://github.com/hoentaex/ha-cards-kit";

window.customCards = window.customCards || [];
for (const [type, name, description] of [
  ["kpi-tile-card", "KPI Tile", "One value as a tile: icon, name, the value large, a sub line and a bar."],
]) {
  if (!window.customCards.some((c) => c.type === type))
    window.customCards.push({ type, name, description, preview: true, documentationURL: DOCS });
}

console.info(`%c CARDS-KIT %c v${VERSION} `, "color:#fff;background:#2f6fb3;font-weight:700", "color:#2f6fb3");
