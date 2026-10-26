# Thebes 8.1, Track B (the top bar, explainers and the City page): rulings 1220-1239

## The lock ids (shared contract, published first)

1220. The top bar's controls carry these `data-lock` ids, each on the element a tap lands on (a button):
   - `stat-gold`, `stat-people`, `stat-mood`, `stat-date` and `stat-score`: one button per stat in the top bar (src/ui/hud.js). The date button is also the flood icon.
   - `papyrus`: the scroll button (src/ui/hud.js), which opens Messages and its City tab.
   - `speed`: the speed control, on every button it is made of (src/ui/speed.js): the corner's main button and chevron on a phone, and each step of the wide bar's speed buttons. The wrapper that holds them carries it too, so a lock may dim the group as one.
   - `menu`: the menu button (☰) lives in the top bar (src/ui/hud.js), so Track B puts `data-lock="menu"` on it; Track D need not touch hud.js.
   - The explainer popover and the City tab carry no lock id: they open only from a stat or the papyrus, which a lock already refuses.
   — Cost if wrong: a lesson that dims by these ids misses a control and lets a stray tap through; the fix is one attribute.
