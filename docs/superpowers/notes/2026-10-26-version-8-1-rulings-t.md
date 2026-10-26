# Version 8.1 "The vizier", Track T: the story, Ipi and the tutorial (rulings 1200-1219)

Design: docs/superpowers/specs/2026-10-24-thebes-version-8-0-design.md, sections 2, 3 and 7b. Track brief: tracks-v81.md, "Track T".

## The shared contract (published first, so Tracks B and D can rely on it)

1200. **The lock** is `src/ui/v81/lessonLock.js`: `lockTo(allowed, { root, onRefused })` and `unlock()`. `allowed` is a list of control ids.
   - A control that can be dimmed carries `data-lock="<id>"` (one id, or several separated by spaces). The ids:
     - Track B (top bar): `stat-gold`, `stat-people`, `stat-mood`, `stat-date`, `stat-score`, `papyrus` (the scroll that opens Messages and the City tab), `speed` (the speed control, wherever the layout puts it).
     - Track D (build): `tray-cat-<category>` on each category button (the category ids of src/data/ui.js, e.g. `tray-cat-roads`, `tray-cat-homes`), `tray-item-<type>` on each card (the card's item, e.g. `tray-item-road`, `tray-item-house`, `tray-item-farm_grain`), `layers`, `minimap`, `menu`.
   - While a lock holds, every `[data-lock]` element none of whose ids is in `allowed` gets `data-locked` and `aria-disabled="true"`. Track T's CSS (`css/v81-t.css`, `[data-locked]`) dims it, and one capture listener on the document refuses a pointer press, a click or Enter/Space on it or anything inside it, and calls `onRefused(id)` (the lesson has Ipi say one line). Nothing else about the control changes: B and D need no code for the lock beyond the attribute.
   - A control without `data-lock` is never dimmed or refused. The map is never locked (it stays pannable and zoomable). `menu` is always allowed during the lesson, since Leave the lesson lives there (8.0, ruling 1171).
   - The lock follows the DOM: a tray or bar drawn afresh is marked again at once (a MutationObserver), so B and D may re-render freely.
   - `unlock()` clears every mark and the listener. The lesson calls it when it ends or is left.
   - Cost if wrong: an id renamed on one side dims the wrong control; the ids are one list here and one map in lessonLock.js.

1201. **The scribe** is `src/ui/v81/scribe.js`: `say(text, { anchor, ms, onDone })` returns `{ close() }`.
   - One bubble at a time: a new `say` replaces the one showing (whose `onDone` runs then).
   - `anchor`: an element, and the bubble is pinned beside it (above it when there is room, else below), kept 16 px inside the screen's edges. No anchor: the bubble docks under the top bar, in the guidance place, never over the middle of the map.
   - `ms`: it fades by itself after that many milliseconds (default 2600). `ms: 0` keeps it until it is closed or replaced.
   - `onDone()` runs once, when it fades, is replaced or is closed.
   - Before the game mounts the scribe (`mountScribe(root)`, done by the interface), `say` does nothing and returns a handle whose `close` does nothing, so a caller never has to check.
   - `portrait(px)` returns Ipi's drawn portrait (an SVG element, decoration: `aria-hidden`); the bubble carries it at its left. The bubble is a polite live region, so a screen reader hears each line once.
   - Cost if wrong: Track D's two calls change with the signature.
