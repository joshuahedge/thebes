# Thebes 8.1, Track D (building: drag to build, the layered tray, no page zoom): rulings 1240-1259

## The lock ids (shared contract, published first)

1240. The build tray carries these `data-lock` ids, each on the element a tap lands on (a button), in every layout (the phone's dock, the wide panel's tabs and grid, the compact rail and its drawer):
   - `tray-cat-<category>` on each category button (the dock's `.cat`, the rail's `.cat`, the panel's `.tab`): `tray-cat-roads`, `tray-cat-homes`, `tray-cat-food`, `tray-cat-industry`, `tray-cat-services`, `tray-cat-defence`, `tray-cat-monuments`.
   - `tray-item-<type>` on each card, where type is the item id the data uses (`src/data/ui.js` CATEGORIES): `tray-item-road`, `tray-item-ferry`, `tray-item-demolish`, `tray-item-house` (the Housing plot card), `tray-item-large_plot`, `tray-item-gate`, `tray-item-farm_grain`, `tray-item-well` and so on, one per building type.
   - `tray-more-<category>` on the "More" / "Fewer" button that ends a layered tray (1246).
   - `tray-handle` on the dock's handle and `tray-pill` on the tucked "Build" pill (not in the brief's list: a lesson that dims the tray needs to dim these too).
   - `layers` on the Layers button (the phone's corner button and the wide panel's button); `minimap` on the Map button (the phone's corner button) and on the wide panel's minimap box.
   - `menu` is carried by Track B (`src/ui/hud.js`, its ruling 1220), not by Track D.
   - The drag proxy (1245) carries no lock id: it exists only during a drag that started on an unlocked card.
   — Cost if wrong: a lesson that dims by these ids misses a control and lets a stray tap through, or dims one it should not; the fix is one attribute.
