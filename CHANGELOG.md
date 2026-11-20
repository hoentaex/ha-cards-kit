# Changelog

## 0.1.0 (2026-11-21)

First release of the kit: one HACS file, `ha-cards-kit.js`, for small single-purpose cards.

- **KPI Tile** (`custom:kpi-tile-card`): one value as one card, in the look of the KPI tiles of the sibling cards
  (oil, heating, energy, Tibber): a round icon, the name, the value large with a small unit, a sub line and a thin bar.
- Made for the **sections view**: the heading comes from Home Assistant's heading card, size and position from the
  grid (default 4 columns × 2 rows), hiding from the visibility conditions. The look follows the height: 1 row
  compact (icon left, value only), 2 rows standard, 3 rows large (icon on top).
- **Sub line** from a fixed text, an attribute, another entity or the time since the last change, with prefix and
  suffix. **Bar** as a percentage or a range; min, max and a marker (reserve, target) as numbers or entities.
- **Thresholds** for warning and critical, above or below a value (or an entity): the tile turns the theme's warning
  or error color with a tinted border.
- Name, icon, unit, decimals and color default to the entity (friendly name, icon, unit, display precision, device
  class); colors are Home Assistant's color names.
- A missing, unavailable or unknown entity keeps its tile, greyed out with the reason, so the grid never shows a gap.
- Tap: Home Assistant's actions (more-info by default). Visual editor in German and English.
