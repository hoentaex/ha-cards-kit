# Changelog

## 0.3.0 (2026-11-22)

- **KPI tile: trend line** (`trend`), like the trend graph of Home Assistant's tile card but with its own color:
  the history of the last hours (`hours_to_show`, default 24) as a line with a fading fill, flush across the bottom
  of the tile. `detail: false` draws one point per hour. Data from Home Assistant's history stream, live.
- A bar **or** a trend at the bottom, never both: with both configured the trend wins. The editor's group "Bar" is
  now "Bottom" with *nothing / bar (percent) / bar (range) / trend*.
- The line takes the warning or critical color with the tile; without `color` it uses the tile's color. No trend at
  1 row, for text states or without the history integration.

## 0.2.0 (2026-11-21)

- **Gauge tile** (`custom:gauge-tile-card`): one value as an open 270° arc with the icon inside, one card per value
  like the KPI tile. Two layouts: **normal** (arc centered, value and name below, 4 × 2; from 3 rows a bigger arc and
  the sub line) and **compact** (small arc left, name and value beside it, 4 × 1).
- Range from `min` / `max` (`max` also an entity), % values 0–100 without them; an optional **marker** as a line on
  the arc (number or entity).
- Icon with a tinted background by default (`icon_background: false` turns it off). Colors, warning/critical
  thresholds, tap action and greyed-out missing values as in the KPI tile. Visual editor in German and English.

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
