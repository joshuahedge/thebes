# Thebes Stage 1c: Interface and Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the rendered world into a playable game: the real page shell, the three layouts (portrait dock, wide side panel, compact rail), touch, mouse and keyboard input, the modes table (browse, selected, placing, drawing, demolishing, overlay), the build dock and cards, placement with the confirm bar and reasons, undo, info sheets, the city summary, the minimap, alerts, toasts, the ☰ menu and settings, all accessible and all driving the world only through `src/sim/commands.js`.

**Architecture:** `src/ui/` is a set of small DOM components around one plain state store (`src/ui/store.js`). Pure logic (mode transitions, gesture recognition, placement previews, layout choice, copy tables, alert triage, settings, the back stack, camera tweens) lives in modules with no DOM so it is unit-tested directly; DOM components subscribe to the store and re-render their own element. Input turns pointer and key events into store changes and commands; the render loop reads the store every frame for the overlay, ghost, grid, selection and camera tween. `index.html` is the real shell and `src/main.js` wires everything (`createUI`). The dev page and `src/dev/devControls.js` go; `src/dev/sampleCity.js` stays for tests and for 1d's title card.

**Tech Stack:** HTML + CSS + JavaScript ES modules, Canvas 2D (map and minimap), DOM for every control, Pointer Events, the in-house test harness in headless Edge, `tests/serve.py`.

**Spec:** `docs/superpowers/specs/2026-10-09-thebes-design.md` sections 4.1 (start paused, camera on fertile land, start road), 4.3 (speeds, pause when hidden), 4.5 (tap start and end, L-path with flip, reach highlight, auto overlay), 4.8 ("employed" means assigned), 4.11, 5.3 (tap areas), 5.4, 6.1–6.8 (the whole interface), 7.2–7.3, 9 (modes tests, play-testing sizes, accessibility checks). Also binding: the "Plan 1c" sections of `docs/superpowers/notes/2026-10-09-stage-1a-followups.md` and `docs/superpowers/notes/2026-10-10-stage-1b-followups.md` (both folded into tasks below), and the real code in `src/sim`, `src/render`, `src/data`.

**Out of scope (Plan 1d):** the title card, goals list, welcome-back card, saving and loading, export/import, PWA and install flows, sound and haptics, the "update ready" toast, publishing. Menu entries for those exist here as hooks that 1d fills.

## Global Constraints

- No build step, no npm, no frameworks, no third-party code. Plain ES modules, plain CSS in `css/ui.css`.
- Target browsers: iOS Safari 16+, current Android Chrome, current desktop Chrome, Edge, Firefox, Safari. Pointer Events, `ResizeObserver`, `matchMedia`, `history.pushState`, CSS `env(safe-area-inset-*)`, `dvh` with a `vh` fallback. No `:has()`-dependent layout, no container queries.
- The UI changes the world **only** through `src/sim/commands.js` (`place`, `drawRoad`, `paintHouses`, `demolishAt`, `demolishArea`, `setPaused`, `setSpeed`) and `src/sim/undo.js` (`undo`), plus `assignLabour(world)` right after any command so derived state is fresh while paused (1a follow-up). Never assign a world field from `src/ui`. The sim stays deterministic; the UI may use `Math.random` only to pick a new city's seed and `Date`/`performance.now` for animation.
- `src/render` is consumed through its public API: `createRenderer`, `createGameLoop`, `walkersAt(world, timeDays, range)`, `drawOverlay`, `drawReachHighlight`, `drawGhost`, `createEffects`, `createCamera`, `panBy`, `zoomAt`, `screenToTile`, `screenToTileIndex`, `tileToScreen`, `visibleTileRange`, `clampZoom`, `MIN_ZOOM`, `MAX_ZOOM`.
- Spec 6.1: things you read sit at the top, things you tap at the bottom (or in the side panel on wide screens); nothing floats over the middle of the map; one panel open at a time; every mode has a visible exit (✕, Back, Esc, right-click); meaning never carried by colour alone; text is dark ink on parchment at 4.5:1 or better, body 16 px, nothing below 12 px, text-size setting 100/125/150%; touch targets at least 44×44 CSS px; layouts respect safe areas.
- Spec 6.2 breakpoints, exactly: **portrait** = taller than wide and under 900 px wide; **wide** = at least 900×520 px; **compact** = everything else. Rotating keeps the camera and any placement in progress.
- Spec 6.4: one mode at a time, except overlays, which combine with browse. The confirm bar never tucks away. Each open sheet or mode adds a browser-history entry so Back closes it instead of leaving the game.
- Spec 6.5: placement validity shown three ways: **ok** = blue outline + ✓; **bad** = coral hatching + ✕ + a reason in the confirm bar; **warn** ("won't work yet") = amber, placing allowed with a warning. Undo: the last 10 actions until the month ends, full refund, Ctrl+Z / Cmd+Z, in the confirm bar and in a toast after each action.
- Spec 6.6/6.7: one-finger drag pans (except a drag that starts on the ghost while placing); two fingers always pan or zoom; double-tap zooms in; every pinch/drag has a single-tap alternative (+/− buttons, tap start then end). Mouse: wheel zooms towards the cursor, drag on empty ground pans, right- or middle-drag pans while drawing, hover shows tooltips and reach. Keyboard: Space, +/−, 1–7, arrows/WASD, R, M, O, Enter, Esc, Ctrl+Z, ?. The input type is decided when each press starts. On touch devices buttons keep touch sizes even with a mouse. Single-key shortcuts switch off while a text field has focus and can be turned off in settings.
- Spec 6.8: real DOM buttons with labels; the canvas carries a text summary; alerts announced through an `aria-live` region; focus visible; tab order follows the screen layout.
- Copy rules: game text is plain English, sentence case, no jargon; the word "Pharaoh" never appears in code or text. "Employed" in the sim means *assigned*, so the HUD says "working" for staffed buildings and "jobless" for the gap.
- Commit identity for this repo only: `Joshua Hedge <181878008+joshuahedge@users.noreply.github.com>` (already set in `.git/config`; never change it or the global config). Every commit message ends with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (the project's standing line; it overrides any attribution rule of the implementing model).
- LF line endings. Run all commands from `C:\dev\thebes` in PowerShell. The suite is `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1` and must print `ALL PASSED` at the end of every task (259 tests now, about 100 more by the end).

## File Structure

```
thebes/
  index.html                       the real page shell: map canvas plus the DOM containers every component mounts into
  css/ui.css                       parchment theme tokens, layouts by [data-layout], safe areas, text-size scale, focus rings
  src/main.js                      boot: world, renderer, loop, createUI(...), hooks for 1d
  src/data/ui.js                   categories and card order, overlay list and legend copy, keyboard map, speed labels
  src/sim/alerts.js                MODIFY: pure alertsFor(world); computeAlerts keeps writing world.alerts
  src/render/terrainBaker.js       MODIFY: maxChunks 32, purge other-scale entries, stale-sprite fallback (1b follow-ups)
  src/render/overlays.js           MODIFY: memoised marks, unioned and range-culled tints, dark outer stroke, unknown-kind guard
  src/render/walkers.js            MODIFY: TILES_PER_DAY 2 (1b follow-up)
  src/render/camera.js             MODIFY: clampZoom guards NaN; visibleTileRange merges pad
  src/ui/
    store.js                       createStore: get / set / subscribe; the one UI state object
    modes.js                       pure mode transitions: select, startTool, openSheet, back, toggleOverlay, ...
    text.js                        every string the UI shows: names, reasons, needs, alerts, tooltips
    layout.js                      pickLayout(width, height), applyLayout, watchLayout (ResizeObserver)
    theme.js                       the colour tokens as JS (mirrors ui.css) plus a WCAG contrast helper
    backstack.js                   browser-history entries per sheet/mode so Back goes one step
    settings.js                    settings store with defaults, storage injection, apply-to-document
    cameraControl.js               tweened panTo/zoomTo, keepVisible above a sheet, reduced motion
    gestures.js                    pure pointer-stream recogniser: tap, double-tap, drag, pinch
    input.js                       canvas pointer/wheel/context events -> gestures -> map actions
    keyboard.js                    shortcut handling per spec 6.7 with the settings toggle
    pick.js                        tile and building under a screen point (nearest-centre rule)
    placement.js                   tools (building, road line, house area, demolish area): previews, confirm, undo
    components.js                  tiny DOM helpers: el(), button(), icon(), clear()
    hud.js                         top bar (both variants) and the city summary sheet content
    speed.js                       pause/speed corner button and top-bar speed buttons; pause on hidden page
    cards.js                       building cards (cost, unaffordable, locked) shared by dock, panel and rail
    dock.js                        portrait build dock: slim bar, tray, tucked pill, swipe handle
    confirmBar.js                  placing / drawing / demolishing bar (never tucks)
    sidePanel.js                   wide layout: minimap, tabs, card grid, details card, fold
    rail.js                        compact landscape: rail, drawer, ✕ ✓ at the bottom
    corners.js                     corner buttons: speed (bottom-left), minimap with badge and overlay (bottom-right)
    sheets.js                      bottom sheet container: building, house, summary, minimap, menu, settings, help, about
    minimap.js                     minimap drawing and minimap-to-tile mapping
    alerts.js                      alert triage: filter, severity, badge count, banner, aria-live announcer
    overlayUi.js                   legend strip and overlay cycling
    toasts.js                      toasts with an optional action (Undo)
    menu.js                        the ☰ menu sheet and the New city confirmation
    createUI.js                    wires every component to the store, world, camera, renderer and loop
  src/dev/devControls.js           DELETE (replaced by src/ui/input.js and keyboard.js)
  dev.html                         DELETE (index.html?seed=N&stress=1 covers it)
  tests/
    helpers/dom.js                 mount(), fire(), key(), flush()
    helpers/uiWorld.js             a small world with a road, plots and one of each service for UI tests
    ui/*.test.js                   one file per module above
    screenshot.ps1                 MODIFY: nothing; used by the final task at the four spec sizes
```

## Conventions every task relies on

- **Store shape** (`src/ui/store.js`), the single UI state; every component reads from it and writes through `modes.js` or the component's own `set`:
  ```js
  {
    layout: 'portrait' | 'wide' | 'compact',
    inputType: 'touch' | 'mouse' | 'pen',
    mode: 'browse' | 'selected' | 'placing' | 'drawing' | 'demolishing',
    selectedId: null | number,
    hoverId: null | number,                       // mouse only
    tool: null | { kind: 'building', type } | { kind: 'road' } | { kind: 'houses' } | { kind: 'demolish' },
    ghost: null | { x, y },                       // placing: the ghost's origin tile
    line: null | { x0, y0, x1, y1, flip },        // drawing: x1/y1 null until the end is set
    area: null | { x0, y0, x1, y1 },              // houses or demolish: x1/y1 null until the end is set
    overlay: null | 'water' | 'food' | 'religion' | 'housing',
    sheet: null | { kind: 'info' | 'summary' | 'minimap' | 'menu' | 'settings' | 'help' | 'about', id: number | null },  // info = building or house sheet
    dock: 'slim' | 'tray' | 'tucked',
    category: 'roads' | 'homes' | 'food' | 'industry' | 'services' | 'defence' | 'monuments',
    panelFolded: boolean,
    lastSpeed: 1 | 2 | 3,
    confirmDialog: null | { text, confirmLabel, onConfirm },
  }
  ```
- **Commands only.** A component that wants to change the world calls a function in `placement.js` or `speed.js`, which calls `src/sim/commands.js`, then `assignLabour(world)`, then `ui.afterCommand()` (toast, effects, alerts refresh, re-render).
- **Screen coordinates** are CSS px relative to the canvas's top-left (the canvas fills the viewport, so they equal `clientX/clientY`). `view()` is `{ width, height }` of the canvas in CSS px.
- **Copy** comes from `src/ui/text.js`; components never contain literal game text.
- **Elements** are built with `el(tag, props, children)` from `components.js`; every interactive control is a `<button>` with a text label or `aria-label`.
- **Tests** that need the DOM use `mount()` from `tests/helpers/dom.js`, which appends a container to the test page and removes it in `cleanup()`. Pointer events are dispatched with `fire(el, 'pointerdown', { clientX, clientY, pointerId, pointerType })`.

## How to run tests

- `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1` runs everything; `-Grep "ui modes"` runs one group.
- `python tests/serve.py 8000 .` then `http://localhost:8000/` is the game; `?seed=7` picks a map, `?stress=1` a full city, `?speed=0` starts paused (the default anyway).

---

### Task 1: Page shell, theme tokens, layout picker and DOM helpers

**Files:**
- Create: `index.html`, `css/ui.css`, `src/main.js` (boot only; Task 17 replaces it), `src/ui/theme.js`, `src/ui/layout.js`, `src/ui/components.js`
- Create: `tests/helpers/dom.js`
- Test: `tests/ui/layout.test.js`, `tests/ui/theme.test.js`, `tests/ui/components.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `createWorld`, `createRenderer`, `createGameLoop`, `createCamera`, `walkersAt`, `visibleTileRange`, `buildSampleCity`, `buildStressCity` (existing).
- Produces (`theme.js`): `TOKENS` (the colour tokens, same values as `css/ui.css`), `luminance(hex)`, `contrastRatio(hexA, hexB)`, `TEXT_PAIRS` (every foreground/background pair the UI uses for text).
- Produces (`layout.js`): `pickLayout(width, height) → 'portrait' | 'wide' | 'compact'`, `applyLayout(root, layout)` (sets `root.dataset.layout`), `watchLayout({ root, getSize, onChange, subscribe }) → stop` where `subscribe(fn)` registers a resize source (defaults to `window` resize + orientationchange) and `onChange(layout)` fires on every change after an initial call.
- Produces (`components.js`): `el(tag, props, children)`, `button(label, props)`, `iconButton(label, glyph, props)`, `icon(glyph)`, `clear(node)`, `setText(node, text)`.
- Produces (`tests/helpers/dom.js`): `mount() → { root, cleanup }`, `fire(target, type, init) → event`, `key(target, key, init)`, `flush() → Promise` (one animation frame).
- Produces (`index.html`): the containers every later component mounts into, by id: `map` (canvas), `ui`, `topbar`, `banner`, `legend`, `panel`, `rail`, `corners`, `dock`, `sheet`, `toasts`, `live`, `dialog`.

- [ ] **Step 1: Write the DOM helper and the failing tests**

`tests/helpers/dom.js`:
```js
// A fresh container per test, parked off-screen so layout still runs but nothing covers the results.
export function mount(html = '') {
  const root = document.createElement('div');
  root.className = 'test-mount';
  root.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:600px;';
  if (html) root.innerHTML = html;
  document.body.appendChild(root);
  return { root, cleanup() { root.remove(); } };
}

export function fire(target, type, init = {}) {
  const base = { bubbles: true, cancelable: true, composed: true, ...init };
  let ev;
  if (type.startsWith('pointer')) ev = new PointerEvent(type, { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: 1, ...base });
  else if (type.startsWith('key')) ev = new KeyboardEvent(type, base);
  else if (type === 'wheel') ev = new WheelEvent(type, base);
  else if (type === 'click' || type.startsWith('mouse')) ev = new MouseEvent(type, base);
  else ev = new Event(type, base);
  target.dispatchEvent(ev);
  return ev;
}

export const key = (target, k, init = {}) => fire(target, 'keydown', { key: k, ...init });

export const flush = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
```

`tests/ui/layout.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { pickLayout, applyLayout, watchLayout } from '../../src/ui/layout.js';
import { mount } from '../helpers/dom.js';

describe('ui layout', () => {
  it('picks the layout from the viewport size exactly as spec 6.2 says', () => {
    expect(pickLayout(390, 844)).toBe('portrait');
    expect(pickLayout(899, 1200)).toBe('portrait');
    expect(pickLayout(900, 1200)).toBe('wide');
    expect(pickLayout(1280, 800)).toBe('wide');
    expect(pickLayout(900, 520)).toBe('wide');
    expect(pickLayout(844, 390)).toBe('compact');
    expect(pickLayout(1000, 500)).toBe('compact');
    expect(pickLayout(768, 1024)).toBe('portrait');
  });
  it('writes the layout onto the root element', () => {
    const { root, cleanup } = mount();
    applyLayout(root, 'wide');
    expect(root.dataset.layout).toBe('wide');
    cleanup();
  });
  it('watches a size source and reports changes once each', () => {
    const { root, cleanup } = mount();
    let size = { width: 390, height: 844 };
    const listeners = [];
    const changes = [];
    const stop = watchLayout({
      root, getSize: () => size, onChange: (l) => changes.push(l),
      subscribe: (fn) => { listeners.push(fn); return () => listeners.splice(listeners.indexOf(fn), 1); },
    });
    expect(changes).toEqual(['portrait']);
    listeners[0]();
    expect(changes).toEqual(['portrait']);
    size = { width: 1280, height: 800 };
    listeners[0]();
    expect(changes).toEqual(['portrait', 'wide']);
    expect(root.dataset.layout).toBe('wide');
    stop();
    expect(listeners.length).toBe(0);
    cleanup();
  });
});
```

`tests/ui/theme.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { TOKENS, contrastRatio, TEXT_PAIRS, cssName } from '../../src/ui/theme.js';

describe('ui theme', () => {
  it('computes WCAG contrast', () => {
    expect(Math.abs(contrastRatio('#000000', '#FFFFFF') - 21) < 0.01).toBe(true);
    expect(Math.abs(contrastRatio('#FFFFFF', '#FFFFFF') - 1) < 0.01).toBe(true);
  });
  it('keeps every text pair at 4.5:1 or better (spec 6.1)', () => {
    const failing = TEXT_PAIRS
      .filter(([fg, bg]) => contrastRatio(TOKENS[fg], TOKENS[bg]) < 4.5)
      .map(([fg, bg]) => `${fg} on ${bg} = ${contrastRatio(TOKENS[fg], TOKENS[bg]).toFixed(2)}`);
    expect(failing).toEqual([]);
  });
  it('matches the stylesheet tokens', async () => {
    const css = (await (await fetch('/css/ui.css')).text()).toUpperCase();
    const missing = Object.entries(TOKENS).filter(([name, hex]) => !css.includes(`${cssName(name).toUpperCase()}: ${hex.toUpperCase()}`)).map(([n]) => n);
    expect(missing).toEqual([]);
  });
});
```

`tests/ui/components.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { el, button, iconButton, clear, setText } from '../../src/ui/components.js';
import { mount, fire } from '../helpers/dom.js';

describe('ui components', () => {
  it('builds elements with classes, attributes, data, handlers and children', () => {
    let clicks = 0;
    const node = el('div', { class: 'box', 'aria-label': 'Box', dataset: { id: '7' }, onClick: () => clicks++ }, ['hi', el('b', { text: '!' })]);
    expect(node.className).toBe('box');
    expect(node.getAttribute('aria-label')).toBe('Box');
    expect(node.dataset.id).toBe('7');
    expect(node.textContent).toBe('hi!');
    fire(node, 'click');
    expect(clicks).toBe(1);
  });
  it('makes real buttons with labels', () => {
    const b = button('Place', { class: 'primary' });
    expect(b.tagName).toBe('BUTTON');
    expect(b.type).toBe('button');
    expect(b.textContent).toBe('Place');
    const i = iconButton('Minimap', '▣');
    expect(i.getAttribute('aria-label')).toBe('Minimap');
    expect(i.querySelector('.icon').getAttribute('aria-hidden')).toBe('true');
  });
  it('clears and sets text', () => {
    const { root, cleanup } = mount('<p>a</p><p>b</p>');
    clear(root);
    expect(root.childNodes.length).toBe(0);
    const p = el('p', { text: 'x' });
    setText(p, 'y');
    expect(p.textContent).toBe('y');
    cleanup();
  });
});
```

Append to `tests/all.js`:
```js
import './ui/layout.test.js';
import './ui/theme.test.js';
import './ui/components.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui layout"`
Expected: `LOAD ERROR` naming `tests/all.js` (the modules do not exist yet).

- [ ] **Step 3: Write the page shell**

`index.html` (repo root):
```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#F3E7CB">
<title>Thebes</title>
<link rel="stylesheet" href="./css/ui.css">
</head>
<body data-layout="portrait" data-input="touch" data-hand="right" data-text-size="100">
<canvas id="map" role="img" aria-label="City map" aria-describedby="map-summary" tabindex="-1"></canvas>
<div id="ui">
  <header id="topbar" aria-label="City status"></header>
  <div id="banner" role="region" aria-label="Critical alerts"></div>
  <div id="legend" role="region" aria-label="Overlay legend"></div>
  <aside id="panel" aria-label="Build panel"></aside>
  <aside id="rail" aria-label="Build rail"></aside>
  <div id="corners"></div>
  <nav id="dock" aria-label="Build dock"></nav>
  <section id="sheet" aria-label="Details" hidden></section>
  <div id="toasts" role="status" aria-live="polite"></div>
  <div id="dialog" role="dialog" aria-modal="true" hidden></div>
  <p id="live" class="sr-only" aria-live="polite"></p>
  <p id="map-summary" class="sr-only"></p>
</div>
<noscript><p class="noscript">Thebes needs JavaScript to run.</p></noscript>
<script type="module" src="./src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Write the stylesheet (part 1: tokens, base, top bar, corners)**

`css/ui.css`:
```css
/* Thebes interface. Parchment and ink, teal accents, coral for problems, amber for warnings (spec 6.1). */
:root {
  --parchment: #F3E7CB; --parchment-2: #EADBB9; --parchment-3: #DCC9A0;
  --ink: #2B1F0E; --ink-soft: #5A4832;
  --teal: #1F6F66; --teal-ink: #FFFFFF; --teal-soft: #CFE6E2;
  --coral: #E2604C; --coral-text: #A33624; --coral-soft: #F6D5CE;
  --amber: #E0A030; --amber-text: #7A5200; --amber-soft: #F6E7C2;
  --blue: #2F6FA8; --gold: #E2B13C;
  --shadow: 0 4px 16px rgba(43, 31, 14, 0.25);
  --radius: 12px; --tap: 44px;
  --ui-scale: 1;
  --font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --topbar-h: calc(48px * var(--ui-scale));
  --dock-slim: calc(76px * var(--ui-scale)); --dock-tray: calc(232px * var(--ui-scale)); --dock-tucked: 52px;
  --panel-w: 320px; --rail-w: 56px; --drawer-w: 268px;
  --safe-top: env(safe-area-inset-top, 0px); --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px); --safe-right: env(safe-area-inset-right, 0px);
}
[data-text-size="125"] { --ui-scale: 1.25; }
[data-text-size="150"] { --ui-scale: 1.5; }

html, body { margin: 0; height: 100%; background: var(--parchment-3); color: var(--ink); overflow: hidden; overscroll-behavior: none; -webkit-text-size-adjust: 100%; }
body { font: calc(16px * var(--ui-scale)) / 1.4 var(--font); }
#map { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh; display: block; touch-action: none; }
#ui { position: fixed; inset: 0; pointer-events: none; }
#ui > * { pointer-events: auto; }
[hidden] { display: none !important; }

button { font: inherit; color: inherit; background: var(--parchment); border: 1px solid var(--parchment-3); border-radius: var(--radius); min-width: var(--tap); min-height: var(--tap); padding: 0 12px; cursor: pointer; }
button.primary { background: var(--teal); color: var(--teal-ink); border-color: var(--teal); }
button.danger { background: var(--coral-text); color: #FFFFFF; border-color: var(--coral-text); }
button.quiet { background: transparent; border-color: transparent; }
button[disabled] { opacity: 0.5; cursor: default; }
button[aria-pressed="true"] { border-color: var(--teal); box-shadow: inset 0 0 0 2px var(--teal); }
:focus-visible { outline: 3px solid var(--teal); outline-offset: 2px; }
h2, h3 { margin: 0; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.small { font-size: calc(12px * var(--ui-scale)); }   /* 12 px is the floor (spec 6.1) */
.muted { color: var(--ink-soft); }
.coral { color: var(--coral-text); }
.amber { color: var(--amber-text); }
.teal { color: var(--teal); }
.icon { display: inline-block; width: 1.25em; text-align: center; }
.row { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--parchment-2); }
.actions { display: flex; gap: 8px; padding-top: 12px; flex-wrap: wrap; }
.noscript { margin: 24px; }

/* Top bar: things you read sit at the top. */
#topbar { position: fixed; top: 0; left: 0; right: 0; padding: var(--safe-top) 8px 0; min-height: var(--topbar-h); background: var(--parchment); border-bottom: 1px solid var(--parchment-3); box-shadow: var(--shadow); display: flex; align-items: center; gap: 10px; }
#topbar .stat { display: flex; align-items: center; gap: 4px; white-space: nowrap; }
#topbar .stat .label { font-size: calc(12px * var(--ui-scale)); color: var(--ink-soft); }
#topbar .spacer { flex: 1; }
#topbar .speed { display: flex; gap: 4px; }
#topbar button { min-height: 40px; }
body[data-layout="portrait"] .wide-only, body[data-layout="compact"] .wide-only { display: none; }
body[data-layout="compact"] #topbar { --topbar-h: calc(40px * var(--ui-scale)); }

/* Critical banner and overlay legend, under the top bar. The banner wins; the legend shrinks to its icon. */
#banner, #legend { position: fixed; left: 8px; right: 8px; top: calc(var(--safe-top) + var(--topbar-h) + 6px); display: flex; flex-direction: column; gap: 6px; align-items: flex-start; pointer-events: none; }
#banner > *, #legend > * { pointer-events: auto; }
#banner .critical { background: var(--coral-soft); border: 1px solid var(--coral-text); border-radius: var(--radius); padding: 6px 8px 6px 12px; display: flex; align-items: center; gap: 8px; max-width: 100%; }
#legend .strip { display: inline-flex; align-items: center; gap: 10px; background: var(--parchment); border-radius: var(--radius); padding: 4px 6px 4px 12px; box-shadow: var(--shadow); }
#legend .dot, #legend .ring { display: inline-block; width: 12px; height: 12px; border-radius: 50%; box-sizing: border-box; }
#legend .dot { background: currentColor; }
#legend .ring { border: 2px solid currentColor; }
body.has-banner #legend { top: calc(var(--safe-top) + var(--topbar-h) + 56px); }
body.has-banner #legend .strip .text { display: none; }

/* Corner buttons: speed bottom-left, minimap and overlay bottom-right. Never in the middle. */
#corners { position: fixed; left: var(--safe-left); right: var(--safe-right); bottom: calc(var(--safe-bottom) + var(--dock-slim) + 8px); display: flex; justify-content: space-between; padding: 0 8px; pointer-events: none; }
#corners > * { pointer-events: auto; }
#corners .group { display: flex; gap: 8px; }
body[data-dock="tray"] #corners { bottom: calc(var(--safe-bottom) + var(--dock-tray) + 8px); }
body[data-dock="tucked"] #corners { bottom: calc(var(--safe-bottom) + var(--dock-tucked) + 8px); }
body[data-hand="left"] #corners { flex-direction: row-reverse; }
.has-badge { position: relative; }
.badge { position: absolute; top: -6px; right: -6px; min-width: 20px; height: 20px; border-radius: 10px; background: var(--coral-text); color: #FFFFFF; font-size: 12px; line-height: 20px; text-align: center; padding: 0 5px; }
```

- [ ] **Step 5: Write the stylesheet (part 2: dock, cards, confirm bar, panel, rail)**

Append to `css/ui.css`:
```css
/* Portrait build dock: slim bar, tray, or tucked to a pill (spec 6.3). */
#dock { position: fixed; left: 0; right: 0; bottom: 0; background: var(--parchment); border-top: 1px solid var(--parchment-3); border-radius: 16px 16px 0 0; box-shadow: var(--shadow); padding-bottom: var(--safe-bottom); display: flex; flex-direction: column; }
#dock .handle { align-self: center; width: 44px; height: 24px; border: none; background: transparent; min-width: 0; min-height: 0; padding: 0; box-shadow: none; }
#dock .handle::before { content: ""; display: block; width: 40px; height: 5px; border-radius: 3px; background: var(--parchment-3); margin: 8px auto; }
#dock .cats { display: flex; justify-content: space-around; padding: 0 4px 6px; }
#dock .cat { display: flex; flex-direction: column; align-items: center; gap: 2px; border: none; background: none; min-width: var(--tap); padding: 2px 4px; font-size: calc(12px * var(--ui-scale)); border-radius: 8px; box-shadow: none; }
#dock .cat[aria-pressed="true"] { color: var(--teal); font-weight: 600; box-shadow: none; }
#dock .cat .icon { font-size: calc(20px * var(--ui-scale)); }
#dock .tray { display: flex; gap: 8px; overflow-x: auto; padding: 4px 12px 10px; scroll-snap-type: x proximity; }
#dock .pill { align-self: center; margin: 6px 0 8px; }
#dock[data-height="slim"] .tray, #dock[data-height="slim"] .pill { display: none; }
#dock[data-height="tray"] .pill { display: none; }
#dock[data-height="tucked"] .tray, #dock[data-height="tucked"] .cats, #dock[data-height="tucked"] .handle { display: none; }

/* Building cards, shared by the dock tray, the side panel grid and the rail drawer. */
.card { flex: 0 0 auto; width: 124px; min-height: 84px; scroll-snap-align: start; display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between; padding: 8px; text-align: left; white-space: normal; }
.card .name { font-weight: 600; }
.card .cost { font-size: calc(12px * var(--ui-scale)); color: var(--ink-soft); }
.card.unaffordable .cost { color: var(--coral-text); }
.card.locked { opacity: 0.75; }
.cards.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 8px; }
.cards.grid .card { width: auto; }
.cards .empty { padding: 12px; color: var(--ink-soft); }

/* Confirm bar for placing, drawing and demolishing. It never tucks away (spec 6.4). */
.confirm { display: flex; align-items: center; gap: 8px; padding: 8px 12px calc(8px + var(--safe-bottom)); background: var(--parchment); border-top: 1px solid var(--parchment-3); border-radius: 16px 16px 0 0; }
.confirm .info { flex: 1; min-width: 0; }
.confirm .info .title { font-weight: 600; }
.confirm .info .reason { font-size: calc(12px * var(--ui-scale)); }
.confirm.demolish { background: var(--coral-soft); }
body[data-layout="wide"] .confirm, body[data-layout="compact"] .confirm { padding-bottom: 8px; border-radius: 0; }

/* Wide layout: the right-hand panel. */
#panel { position: fixed; top: calc(var(--safe-top) + var(--topbar-h)); right: 0; bottom: 0; width: var(--panel-w); background: var(--parchment); border-left: 1px solid var(--parchment-3); display: flex; flex-direction: column; overflow: hidden; }
#panel .foldbar { display: flex; justify-content: flex-start; padding: 6px; border-bottom: 1px solid var(--parchment-3); }
#panel .minimap { align-self: center; margin: 8px; }
#panel .tabs { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 8px 8px; }
#panel .tab { min-height: 36px; min-width: 0; padding: 0 10px; font-size: calc(12px * var(--ui-scale)); }
#panel .tab[aria-pressed="true"] { background: var(--teal); color: var(--teal-ink); box-shadow: none; }
#panel .cards { overflow-y: auto; flex: 1; }
#panel .details { border-top: 1px solid var(--parchment-3); padding: 8px 12px; min-height: 64px; }
body.panel-folded #panel { width: 56px; }
body.panel-folded #panel > :not(.foldbar) { display: none; }

/* Compact landscape: a slim rail on the right, trays as a drawer beside it. */
#rail { position: fixed; top: calc(var(--safe-top) + var(--topbar-h)); right: 0; bottom: 0; width: calc(var(--rail-w) + var(--safe-right)); padding: 6px var(--safe-right) calc(6px + var(--safe-bottom)) 0; background: var(--parchment); border-left: 1px solid var(--parchment-3); display: flex; flex-direction: column; align-items: center; gap: 4px; overflow-y: auto; }
#rail .cat { min-width: var(--tap); padding: 0; font-size: calc(18px * var(--ui-scale)); }
#rail .bottom { margin-top: auto; display: flex; flex-direction: column; gap: 6px; }
#rail .drawer { position: fixed; top: calc(var(--safe-top) + var(--topbar-h)); right: calc(var(--rail-w) + var(--safe-right)); bottom: 0; width: var(--drawer-w); background: var(--parchment-2); border-left: 1px solid var(--parchment-3); overflow-y: auto; }
```

Then append the sheet, layout-visibility, toast and dialog rules to `css/ui.css`:
```css
/* Sheets: a bottom sheet in portrait, a drawer in compact, the lower part of the panel column in wide. */
#sheet { position: fixed; background: var(--parchment); box-shadow: var(--shadow); overflow-y: auto; display: flex; flex-direction: column; }
#sheet .head { display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 16px; position: sticky; top: 0; background: var(--parchment); border-bottom: 1px solid var(--parchment-3); }
#sheet .head h2 { flex: 1; font-size: calc(18px * var(--ui-scale)); }
#sheet .body { padding: 8px 16px calc(16px + var(--safe-bottom)); }
#sheet ul { padding-left: 20px; margin: 6px 0; }
#sheet .tick { color: var(--teal); }
#sheet .cross { color: var(--coral-text); }
body[data-layout="portrait"] #sheet { left: 0; right: 0; bottom: 0; max-height: 60vh; max-height: 60dvh; border-radius: 16px 16px 0 0; }
body[data-layout="compact"] #sheet { top: calc(var(--safe-top) + var(--topbar-h)); right: calc(var(--rail-w) + var(--safe-right)); bottom: 0; width: var(--drawer-w); }
body[data-layout="wide"] #sheet { right: 0; bottom: 0; width: var(--panel-w); max-height: 55%; border-top: 1px solid var(--parchment-3); border-left: 1px solid var(--parchment-3); }

/* Which chrome each layout shows. */
body[data-layout="portrait"] #panel, body[data-layout="portrait"] #rail { display: none; }
body[data-layout="wide"] #dock, body[data-layout="wide"] #rail, body[data-layout="wide"] #corners { display: none; }
body[data-layout="compact"] #dock, body[data-layout="compact"] #panel { display: none; }
body[data-layout="compact"] #corners { right: calc(var(--rail-w) + var(--safe-right)); bottom: calc(var(--safe-bottom) + 8px); }

/* Toasts and the confirm dialog. */
#toasts { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(var(--safe-bottom) + var(--dock-slim) + 64px); display: flex; flex-direction: column; align-items: center; gap: 6px; }
body[data-layout="wide"] #toasts { bottom: 24px; left: calc(50% - var(--panel-w) / 2); }
body[data-layout="compact"] #toasts { bottom: 64px; left: calc(50% - var(--rail-w) / 2); }
.toast { background: var(--ink); color: var(--parchment); border-radius: var(--radius); padding: 6px 8px 6px 14px; display: flex; gap: 12px; align-items: center; box-shadow: var(--shadow); }
.toast button { min-height: 36px; background: transparent; color: var(--gold); border: none; font-weight: 600; }
#dialog { position: fixed; inset: 0; background: rgba(43, 31, 14, 0.45); display: flex; align-items: center; justify-content: center; }
#dialog .box { background: var(--parchment); border-radius: var(--radius); padding: 16px; max-width: 360px; width: calc(100% - 32px); box-shadow: var(--shadow); }
#dialog .buttons { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
```

- [ ] **Step 6: Write the theme, layout and component modules**

`src/ui/theme.js`:
```js
// The colour tokens as JavaScript, mirroring css/ui.css, so tests can check contrast and the two never drift.
export const TOKENS = {
  parchment: '#F3E7CB', parchment2: '#EADBB9', parchment3: '#DCC9A0',
  ink: '#2B1F0E', inkSoft: '#5A4832',
  teal: '#1F6F66', tealInk: '#FFFFFF', tealSoft: '#CFE6E2',
  coral: '#E2604C', coralText: '#A33624', coralSoft: '#F6D5CE',
  amber: '#E0A030', amberText: '#7A5200', amberSoft: '#F6E7C2',
  blue: '#2F6FA8', gold: '#E2B13C',
};

// Every foreground-on-background pair used for text; each must reach 4.5:1 (spec 6.1).
export const TEXT_PAIRS = [
  ['ink', 'parchment'], ['inkSoft', 'parchment'], ['ink', 'parchment2'], ['ink', 'parchment3'],
  ['coralText', 'parchment'], ['amberText', 'parchment'], ['teal', 'parchment'], ['tealInk', 'teal'],
  ['ink', 'coralSoft'], ['ink', 'amberSoft'], ['ink', 'tealSoft'], ['parchment', 'ink'], ['gold', 'ink'],
];

export const cssName = (name) => '--' + name.replace(/[A-Z0-9]/g, (c) => '-' + c.toLowerCase());

export function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const channel = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a, b) {
  const la = luminance(a), lb = luminance(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}
```

`src/ui/layout.js`:
```js
// Spec 6.2: portrait = taller than wide and under 900 px wide; wide = at least 900 x 520; compact = the rest.
export function pickLayout(width, height) {
  if (height > width && width < 900) return 'portrait';
  if (width >= 900 && height >= 520) return 'wide';
  return 'compact';
}

export function applyLayout(root, layout) {
  root.dataset.layout = layout;
  return layout;
}

const windowSize = () => ({ width: window.innerWidth, height: window.innerHeight });

function windowSubscribe(fn) {
  window.addEventListener('resize', fn);
  window.addEventListener('orientationchange', fn);
  return () => { window.removeEventListener('resize', fn); window.removeEventListener('orientationchange', fn); };
}

// Calls onChange with the layout now and whenever the size source crosses a breakpoint. Rotation keeps the
// camera and any placement in progress because nothing here touches them (spec 6.2).
export function watchLayout({ root, getSize = windowSize, subscribe = windowSubscribe, onChange = null }) {
  let current = null;
  const check = () => {
    const { width, height } = getSize();
    const next = pickLayout(width, height);
    if (next === current) return;
    current = next;
    applyLayout(root, next);
    if (onChange) onChange(next);
  };
  check();
  const off = subscribe(check);
  return () => off();
}
```

`src/ui/components.js`:
```js
// Tiny DOM helpers. Every control is a real <button> with a label (spec 6.8).
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) node.setAttribute(k, '');
    else node.setAttribute(k, String(v));
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export const icon = (glyph) => el('span', { class: 'icon', 'aria-hidden': 'true', text: glyph });
export const button = (label, props = {}) => el('button', { type: 'button', ...props }, [label]);
export const iconButton = (label, glyph, props = {}) => el('button', { type: 'button', 'aria-label': label, title: label, ...props }, [icon(glyph)]);

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}
```

- [ ] **Step 7: Write the boot file (Task 17 replaces it with the full wiring)**

`src/main.js`:
```js
// Boot. Until Task 17 this only shows the world: layout, renderer and loop, no controls.
import { createWorld } from './sim/world.js';
import { createCamera, visibleTileRange } from './render/camera.js';
import { createRenderer } from './render/renderer.js';
import { createGameLoop } from './render/loop.js';
import { walkersAt } from './render/walkers.js';
import { createEffects } from './render/effects.js';
import { watchLayout } from './ui/layout.js';
import { buildSampleCity, buildStressCity } from './dev/sampleCity.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);
const world = createWorld({ seed });
if (params.get('stress') === '1') buildStressCity(world);
else if (params.get('sample') === '1') buildSampleCity(world);

const canvas = document.getElementById('map');
const cam = createCamera({ x: world.focus.x, y: world.focus.y, zoom: 1 });
const renderer = createRenderer({ canvas });
const effects = createEffects();
const view = () => ({ width: canvas.clientWidth || window.innerWidth, height: canvas.clientHeight || window.innerHeight });
watchLayout({ root: document.body });

const loop = createGameLoop({
  world,
  onEvents: (events) => effects.fromEvents(world, events, performance.now()),
  render: ({ timeDays, now }) => {
    const v = view();
    renderer.renderFrame(world, cam, { view: v, walkers: walkersAt(world, timeDays, visibleTileRange(cam, v, world.size)), effects, now });
  },
});
loop.start();
window.__thebes = { world, cam, renderer, loop };
```

- [ ] **Step 8: Run the tests, then look at the page**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui layout`, `ui theme` and `ui components` PASS, then `ALL PASSED`. If "matches the stylesheet tokens" fails, the test fetches `/css/ui.css` through the test server, so check the token line format is exactly `--name: #HEX;` with one space.

Then `python tests/serve.py 8000 .` and open `http://127.0.0.1:8000/?seed=1&sample=1`: the world renders behind empty parchment chrome containers (the top bar and dock are empty until later tasks), and `document.body.dataset.layout` changes between `portrait`, `compact` and `wide` as you resize the window.

- [ ] **Step 9: Commit**

```powershell
git add index.html css/ui.css src/main.js src/ui/theme.js src/ui/layout.js src/ui/components.js tests/helpers/dom.js tests/ui tests/all.js
git commit -m "Add the page shell, theme tokens, layout picker and DOM helpers`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The UI store and the mode machine

**Files:**
- Create: `src/ui/store.js`, `src/ui/modes.js`
- Test: `tests/ui/store.test.js`, `tests/ui/modes.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: nothing.
- Produces (`store.js`): `INITIAL_UI_STATE` (the shape in Conventions, with `sheet.kind` one of `'info' | 'summary' | 'minimap' | 'menu' | 'settings' | 'help' | 'about'`; `info` covers both building and house sheets, which `sheets.js` tells apart from the world) and `createStore(initial) → { get(), set(patch), subscribe(fn) → unsubscribe }`. `set` takes an object or a function of the state, merges shallowly, notifies subscribers only when some key changed, and returns the state.
- Produces (`modes.js`), pure functions that return a patch for `store.set` (or `null` when there is nothing to do), enforcing spec 6.4:
  - `isToolMode(mode)`, `toolMode(tool) → 'placing' | 'drawing' | 'demolishing'` (buildings place; roads and house painting draw; demolish demolishes).
  - `startTool(state, tool)`: enters the tool's mode, clears selection, line, area and ghost, closes any sheet, untucks a tucked dock. The overlay is untouched (overlays combine with every mode's browsing).
  - `cancelTool(state)`: back to browse with the tool cleared.
  - `select(state, id)`: mode `selected`, the info sheet open for `id`, any tool cleared.
  - `deselect(state)`: browse, selection and info sheet cleared.
  - `openSheet(state, kind, id = null)`: one panel at a time; a non-info sheet replaces whatever sheet is open and leaves any tool mode (browse, or selected if something was selected).
  - `closeSheet(state)`: closes the sheet; closing the info sheet deselects.
  - `back(state)`: one step, in this order: an open confirm dialog → closed; a non-info sheet → closed; a tool mode → browse; selected → browse; otherwise `null`.
  - `toggleOverlay(state, kind)`, `cycleOverlay(state, list)` (null → first → … → last → null).
  - `setDock(state, height)`, `pickCategory(state, category)` (opens the tray in portrait).

- [ ] **Step 1: Write the failing tests**

`tests/ui/store.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';

describe('ui store', () => {
  it('starts from the initial state and merges patches', () => {
    const s = createStore(INITIAL_UI_STATE);
    expect(s.get().mode).toBe('browse');
    s.set({ overlay: 'water' });
    expect(s.get().overlay).toBe('water');
    expect(s.get().mode).toBe('browse');
    s.set((state) => ({ dock: state.dock === 'slim' ? 'tray' : 'slim' }));
    expect(s.get().dock).toBe('tray');
  });
  it('notifies subscribers only when something changed', () => {
    const s = createStore(INITIAL_UI_STATE);
    const seen = [];
    const off = s.subscribe((state) => seen.push(state.overlay));
    s.set({ overlay: 'food' });
    s.set({ overlay: 'food' });
    s.set({});
    expect(seen).toEqual(['food']);
    off();
    s.set({ overlay: null });
    expect(seen).toEqual(['food']);
  });
  it('has every field the conventions list', () => {
    const keys = Object.keys(INITIAL_UI_STATE).sort();
    expect(keys).toEqual(['area', 'category', 'confirmDialog', 'dock', 'ghost', 'hoverId', 'inputType', 'lastSpeed', 'layout', 'line', 'mode', 'overlay', 'panelFolded', 'selectedId', 'sheet', 'tool']);
  });
});
```

`tests/ui/modes.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { INITIAL_UI_STATE } from '../../src/ui/store.js';
import { startTool, cancelTool, select, deselect, openSheet, closeSheet, back, toggleOverlay, cycleOverlay, pickCategory, isToolMode, toolMode } from '../../src/ui/modes.js';

const apply = (state, patch) => (patch ? { ...state, ...patch } : state);
const S0 = { ...INITIAL_UI_STATE, layout: 'portrait' };

describe('ui modes', () => {
  it('maps tools to the modes table', () => {
    expect(toolMode({ kind: 'building', type: 'well' })).toBe('placing');
    expect(toolMode({ kind: 'road' })).toBe('drawing');
    expect(toolMode({ kind: 'houses' })).toBe('drawing');
    expect(toolMode({ kind: 'demolish' })).toBe('demolishing');
    expect(isToolMode('placing') && isToolMode('drawing') && isToolMode('demolishing')).toBe(true);
    expect(isToolMode('browse') || isToolMode('selected')).toBe(false);
  });
  it('starting a tool leaves selection and sheets, keeps the overlay, untucks the dock', () => {
    let s = apply(S0, select(S0, 4));
    s = apply(s, toggleOverlay(s, 'water'));
    s = apply(s, { dock: 'tucked' });
    s = apply(s, startTool(s, { kind: 'building', type: 'well' }));
    expect(s.mode).toBe('placing');
    expect(s.tool).toEqual({ kind: 'building', type: 'well' });
    expect(s.selectedId).toBe(null);
    expect(s.sheet).toBe(null);
    expect(s.overlay).toBe('water');
    expect(s.dock).toBe('slim');
  });
  it('selecting opens the info sheet and clears any tool', () => {
    let s = apply(S0, startTool(S0, { kind: 'road' }));
    s = apply(s, { line: { x0: 1, y0: 1, x1: null, y1: null, flip: false } });
    s = apply(s, select(s, 9));
    expect(s.mode).toBe('selected');
    expect(s.selectedId).toBe(9);
    expect(s.sheet).toEqual({ kind: 'info', id: 9 });
    expect(s.tool).toBe(null);
    expect(s.line).toBe(null);
    s = apply(s, deselect(s));
    expect(s.mode).toBe('browse');
    expect(s.sheet).toBe(null);
  });
  it('keeps one panel open at a time', () => {
    let s = apply(S0, startTool(S0, { kind: 'building', type: 'well' }));
    s = apply(s, openSheet(s, 'menu'));
    expect(s.sheet).toEqual({ kind: 'menu', id: null });
    expect(s.mode).toBe('browse');
    expect(s.tool).toBe(null);
    s = apply(S0, select(S0, 2));
    s = apply(s, openSheet(s, 'minimap'));
    expect(s.sheet.kind).toBe('minimap');
    expect(s.mode).toBe('selected');
    s = apply(s, closeSheet(s));
    expect(s.sheet).toBe(null);
    expect(s.mode).toBe('selected');
    s = apply(s, select(s, 2));
    s = apply(s, closeSheet(s));
    expect(s.mode).toBe('browse');
    expect(s.selectedId).toBe(null);
  });
  it('goes back one step at a time, in order', () => {
    let s = apply(S0, select(S0, 3));
    s = apply(s, startTool(s, { kind: 'demolish' }));
    s = apply(s, openSheet(s, 'settings'));
    s = apply(s, { confirmDialog: { text: 'Sure?', confirmLabel: 'Yes', onConfirm: () => {} } });
    s = apply(s, back(s));
    expect(s.confirmDialog).toBe(null);
    expect(s.sheet.kind).toBe('settings');
    s = apply(s, back(s));
    expect(s.sheet).toBe(null);
    s = apply(s, startTool(s, { kind: 'houses' }));
    s = apply(s, back(s));
    expect(s.mode).toBe('browse');
    expect(s.tool).toBe(null);
    s = apply(s, select(s, 5));
    s = apply(s, back(s));
    expect(s.mode).toBe('browse');
    expect(back(s)).toBe(null);
  });
  it('toggles and cycles overlays', () => {
    const list = ['water', 'food', 'religion', 'housing'];
    let s = apply(S0, toggleOverlay(S0, 'food'));
    expect(s.overlay).toBe('food');
    s = apply(s, toggleOverlay(s, 'food'));
    expect(s.overlay).toBe(null);
    const seen = [];
    for (let i = 0; i < 5; i++) { s = apply(s, cycleOverlay(s, list)); seen.push(s.overlay); }
    expect(seen).toEqual(['water', 'food', 'religion', 'housing', null]);
  });
  it('opens the tray when a category is picked in portrait only', () => {
    expect(pickCategory(S0, 'food')).toEqual({ category: 'food', dock: 'tray' });
    expect(pickCategory({ ...S0, layout: 'wide', dock: 'slim' }, 'food')).toEqual({ category: 'food', dock: 'slim' });
  });
  it('never has a tool and a selection at once', () => {
    const steps = [(s) => select(s, 1), (s) => startTool(s, { kind: 'road' }), (s) => openSheet(s, 'summary'), (s) => back(s), (s) => select(s, 2), (s) => cancelTool(s), (s) => startTool(s, { kind: 'demolish' }), (s) => back(s), (s) => back(s)];
    let s = S0;
    for (const step of steps) {
      s = apply(s, step(s));
      expect(s.tool !== null && s.selectedId !== null).toBe(false);
      expect(isToolMode(s.mode) === (s.tool !== null)).toBe(true);
      expect((s.mode === 'selected') === (s.selectedId !== null)).toBe(true);
    }
  });
});
```

Append to `tests/all.js`:
```js
import './ui/store.test.js';
import './ui/modes.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui store"`
Expected: `LOAD ERROR` naming `tests/all.js`.

- [ ] **Step 3: Write the store and the mode machine**

`src/ui/store.js`:
```js
// The one UI state object. Components read it and subscribe; writes go through modes.js patches or a
// component's own set(). Nothing from the world lives here: the world is read through the sim's functions.
export const INITIAL_UI_STATE = {
  layout: 'portrait',
  inputType: 'touch',
  mode: 'browse',
  selectedId: null,
  hoverId: null,
  tool: null,
  ghost: null,
  line: null,
  area: null,
  overlay: null,
  sheet: null,
  dock: 'slim',
  category: 'roads',
  panelFolded: false,
  lastSpeed: 1,
  confirmDialog: null,
};

export function createStore(initial) {
  let state = { ...initial };
  const subs = new Set();
  return {
    get: () => state,
    set(patch) {
      const p = typeof patch === 'function' ? patch(state) : patch;
      if (!p) return state;
      let changed = false;
      for (const k of Object.keys(p)) if (p[k] !== state[k]) { changed = true; break; }
      if (!changed) return state;
      state = { ...state, ...p };
      for (const fn of [...subs]) fn(state);
      return state;
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}
```

`src/ui/modes.js`:
```js
// Pure transitions for the modes table (spec 6.4): one mode at a time, overlays combine with browsing,
// every mode has a visible exit and Back goes one step. Each function returns a patch for store.set.
export const isToolMode = (mode) => mode === 'placing' || mode === 'drawing' || mode === 'demolishing';

export const toolMode = (tool) => (tool.kind === 'building' ? 'placing' : tool.kind === 'demolish' ? 'demolishing' : 'drawing');

const CLEAR_TOOL = { tool: null, ghost: null, line: null, area: null };

export function startTool(state, tool) {
  return { ...CLEAR_TOOL, mode: toolMode(tool), tool, selectedId: null, sheet: null, dock: state.dock === 'tucked' ? 'slim' : state.dock };
}

export function cancelTool() {
  return { ...CLEAR_TOOL, mode: 'browse' };
}

export function select(state, id) {
  return { ...CLEAR_TOOL, mode: 'selected', selectedId: id, sheet: { kind: 'info', id } };
}

export function deselect(state) {
  return { mode: 'browse', selectedId: null, sheet: state.sheet && state.sheet.kind === 'info' ? null : state.sheet };
}

export function openSheet(state, kind, id = null) {
  const patch = { sheet: { kind, id } };
  if (kind !== 'info') Object.assign(patch, CLEAR_TOOL, { mode: state.selectedId !== null ? 'selected' : 'browse' });
  return patch;
}

export function closeSheet(state) {
  const wasInfo = state.sheet && state.sheet.kind === 'info';
  return wasInfo ? { sheet: null, mode: 'browse', selectedId: null } : { sheet: null };
}

export function back(state) {
  if (state.confirmDialog) return { confirmDialog: null };
  if (state.sheet && state.sheet.kind !== 'info') return { sheet: null };
  if (isToolMode(state.mode)) return cancelTool(state);
  if (state.mode === 'selected') return { mode: 'browse', selectedId: null, sheet: null };
  return null;
}

export const toggleOverlay = (state, kind) => ({ overlay: state.overlay === kind ? null : kind });

export function cycleOverlay(state, list) {
  const i = list.indexOf(state.overlay);
  return { overlay: i + 1 < list.length ? list[i + 1] : null };
}

export const setDock = (state, height) => ({ dock: height });

export const pickCategory = (state, category) => ({ category, dock: state.layout === 'portrait' ? 'tray' : state.dock });
```

- [ ] **Step 4: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui store` and `ui modes` PASS, then `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/ui/store.js src/ui/modes.js tests/ui/store.test.js tests/ui/modes.test.js tests/all.js
git commit -m "Add the UI store and the mode machine`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Copy tables and interface data

**Files:**
- Create: `src/ui/text.js`, `src/data/ui.js`
- Test: `tests/ui/text.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `BUILDINGS`, `MILESTONES`, `TIERS`, `PRIORITY_LEVELS`.
- Produces (`src/data/ui.js`), tunables and tables with no prose:
  - `CATEGORIES`: ordered `{ id, items }` for roads, homes, food, industry, services, defence, monuments (Stage 1 items: `road`, `demolish`, `house`, `farm_grain`, `granary`, `well`, `bazaar`, `temple`; the other categories are empty for now).
  - `CATEGORY_ICONS` (one glyph per category), `toolForItem(item) → tool` (`road` → `{ kind: 'road' }`, `demolish` → `{ kind: 'demolish' }`, `house` → `{ kind: 'houses' }`, anything else → `{ kind: 'building', type }`), `AUTO_OVERLAY = { well: 'water', bazaar: 'food', temple: 'religion' }`.
  - `KEYS`: the keyboard map of spec 6.7 (`pause`, `speedUp`, `speedDown`, `category` (1–7), `panLeft/Right/Up/Down` (arrows and WASD), `rotate`, `minimap`, `overlay`, `confirm`, `back`, `undo` (z with ctrl/meta), `help`).
  - Gesture and timing tunables: `DRAG_THRESHOLD_PX = 8`, `DOUBLE_TAP_MS = 300`, `DOUBLE_TAP_PX = 24`, `PAN_STEP_PX = 48`, `ZOOM_STEP = 1.25`, `WHEEL_ZOOM_STEP = 1.1`, `CAMERA_PAN_MS = 350`, `TOAST_MS = 4000`, `UNDO_TOAST_MS = 6000`, `GHOST_FINGER_OFFSET_PX = 48`.
- Produces (`src/ui/text.js`), every string the interface shows: `CATEGORY_NAMES`, `buildingName(type)` (also `road`, `demolish`), `NEED_NAMES`, `tierName(tier)`, `reasonText(code)` for every reason `commands.js`/`undo.js` can return, `warningText(code)` for every placement warning, `unlockText(type)`, `alertText(alert, world) → { title, fix }` for every alert code, `LEVEL_NAMES`, `SPEED_LABELS`, `OVERLAY_NAMES`, `OVERLAY_LEGEND` (has-it label, missing label), `dateText(parts)`, `plural(n, one, many)`, `T` (short labels: place, cancel, undo, back, close, demolish, pause, resume, confirm, flip, build, menu, …).

- [ ] **Step 1: Write the failing tests**

`tests/ui/text.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { CATEGORIES, CATEGORY_ICONS, toolForItem, AUTO_OVERLAY, KEYS } from '../../src/data/ui.js';
import { CATEGORY_NAMES, buildingName, NEED_NAMES, tierName, reasonText, warningText, unlockText, alertText, OVERLAY_NAMES, OVERLAY_LEGEND, SPEED_LABELS, dateText, plural, T } from '../../src/ui/text.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';

const REASONS = ['unknown', 'locked', 'out_of_bounds', 'water', 'occupied', 'needs_fertile', 'needs_rocky', 'needs_road', 'no_gold', 'nothing_to_place', 'nothing_here', 'blocked', 'bad_speed', 'not_pausable', 'nothing_to_undo'];
const WARNINGS = ['needs_road', 'no_storage', 'no_supply'];
const ALERTS = ['no_road', 'no_storage', 'storage_full', 'understaffed', 'bazaar_empty', 'labour_shortage', 'unemployment', 'debt'];

describe('ui text', () => {
  it('names every category, item and need', () => {
    for (const c of CATEGORIES) {
      expect(typeof CATEGORY_NAMES[c.id]).toBe('string');
      expect(typeof CATEGORY_ICONS[c.id]).toBe('string');
      for (const item of c.items) expect(buildingName(item).length).toBeGreaterThan(0);
    }
    for (const type of Object.keys(BUILDINGS)) expect(buildingName(type)).toBe(BUILDINGS[type].name);
    expect(buildingName('road')).toBe('Road');
    for (const need of ['road', 'water', 'food', 'religion']) expect(typeof NEED_NAMES[need]).toBe('string');
    expect(tierName(0)).toBe('Empty plot');
    expect(tierName(2)).toBe('Shack');
  });
  it('has a sentence for every reason, warning and alert', () => {
    for (const code of REASONS) expect(reasonText(code) === reasonText('__none__')).toBe(false);
    for (const code of WARNINGS) expect(warningText(code).length).toBeGreaterThan(0);
    const w = makeTestWorld();
    const farm = addRaw(w, 'farm_grain', 0, 0);
    for (const code of ALERTS) {
      const t = alertText({ code, id: farm.id, level: 'essential' }, w);
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.fix.length).toBeGreaterThan(0);
    }
    expect(alertText({ code: 'no_storage', id: farm.id }, w).fix).toContain(String(BUILDINGS.farm_grain.producerReach));
    expect(alertText({ code: 'bazaar_empty', id: farm.id }, w).fix).toContain(String(BUILDINGS.bazaar.supplyReach));
  });
  it('maps items to tools and services to their overlay', () => {
    expect(toolForItem('road')).toEqual({ kind: 'road' });
    expect(toolForItem('demolish')).toEqual({ kind: 'demolish' });
    expect(toolForItem('house')).toEqual({ kind: 'houses' });
    expect(toolForItem('well')).toEqual({ kind: 'building', type: 'well' });
    expect(AUTO_OVERLAY.well).toBe('water');
    expect(unlockText('house')).toBe('Unlocks at Village');
    expect(unlockText('nothing')).toBe('Comes later');
  });
  it('covers the keyboard map, overlays, speeds and dates', () => {
    for (const k of ['pause', 'speedUp', 'speedDown', 'panLeft', 'panRight', 'panUp', 'panDown', 'rotate', 'minimap', 'overlay', 'confirm', 'back', 'help']) expect(KEYS[k].length).toBeGreaterThan(0);
    expect(KEYS.category.length).toBe(7);
    for (const o of ['water', 'food', 'religion', 'housing']) { expect(typeof OVERLAY_NAMES[o]).toBe('string'); expect(OVERLAY_LEGEND[o].length).toBe(2); }
    expect(SPEED_LABELS).toEqual(['Paused', '1×', '2×', '3×']);
    expect(dateText({ year: 2, month: 3, day: 4 })).toBe('Year 2, month 3, day 4');
    expect(plural(1, 'month', 'months')).toBe('1 month');
    expect(plural(2, 'month', 'months')).toBe('2 months');
    expect(T.place).toBe('Place');
  });
  it('never says the forbidden word', async () => {
    const src = await (await fetch('/src/ui/text.js')).text();
    expect(/pharaoh/i.test(src)).toBe(false);
  });
});
```

Append to `tests/all.js`:
```js
import './ui/text.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui text"`
Expected: `LOAD ERROR` naming `tests/all.js`.

- [ ] **Step 3: Write the data tables**

`src/data/ui.js`:
```js
// Interface data: what the build dock shows and in what order, key bindings, and gesture and timing tunables.
export const CATEGORIES = [
  { id: 'roads', items: ['road', 'demolish'] },
  { id: 'homes', items: ['house'] },
  { id: 'food', items: ['farm_grain', 'granary'] },
  { id: 'industry', items: [] },
  { id: 'services', items: ['well', 'bazaar', 'temple'] },
  { id: 'defence', items: [] },
  { id: 'monuments', items: [] },
];

export const CATEGORY_ICONS = { roads: '═', homes: '⌂', food: '❋', industry: '⚒', services: '✚', defence: '⛊', monuments: '▲' };

export function toolForItem(item) {
  if (item === 'road') return { kind: 'road' };
  if (item === 'demolish') return { kind: 'demolish' };
  if (item === 'house') return { kind: 'houses' };
  return { kind: 'building', type: item };
}

// Placing a service shows its overlay together with the reach preview (spec 4.5).
export const AUTO_OVERLAY = { well: 'water', bazaar: 'food', temple: 'religion' };

// Spec 6.7. Letters are listed in both cases; `undo` needs Ctrl or Cmd.
export const KEYS = {
  pause: [' '],
  speedUp: ['+', '='],
  speedDown: ['-', '_'],
  category: ['1', '2', '3', '4', '5', '6', '7'],
  panLeft: ['ArrowLeft', 'a', 'A'],
  panRight: ['ArrowRight', 'd', 'D'],
  panUp: ['ArrowUp', 'w', 'W'],
  panDown: ['ArrowDown', 's', 'S'],
  rotate: ['r', 'R'],
  minimap: ['m', 'M'],
  overlay: ['o', 'O'],
  confirm: ['Enter'],
  back: ['Escape'],
  undo: ['z', 'Z'],
  help: ['?'],
};

export const DRAG_THRESHOLD_PX = 8;
export const DOUBLE_TAP_MS = 300;
export const DOUBLE_TAP_PX = 24;
export const PAN_STEP_PX = 48;
export const ZOOM_STEP = 1.25;
export const WHEEL_ZOOM_STEP = 1.1;
export const CAMERA_PAN_MS = 350;
export const TOAST_MS = 4000;
export const UNDO_TOAST_MS = 6000;
export const GHOST_FINGER_OFFSET_PX = 48;
```

- [ ] **Step 4: Write the copy tables**

`src/ui/text.js`:
```js
// Every string the interface shows. Plain English, sentence case, no jargon. Components import from here
// and never carry literal game text.
import { BUILDINGS } from '../data/buildings.js';
import { MILESTONES } from '../data/progression.js';
import { TIERS } from '../data/housing.js';

export const CATEGORY_NAMES = { roads: 'Roads', homes: 'Homes', food: 'Food', industry: 'Industry', services: 'Services', defence: 'Defence', monuments: 'Monuments' };

export function buildingName(type) {
  if (type === 'road') return 'Road';
  if (type === 'demolish') return 'Demolish';
  return BUILDINGS[type] ? BUILDINGS[type].name : type;
}

export const NEED_NAMES = { road: 'Road access', water: 'Water', food: 'Food', religion: 'Temple' };

export const tierName = (tier) => (tier >= 1 && TIERS[tier] ? TIERS[tier].name : 'Empty plot');

const REASONS = {
  unknown: "Can't build that",
  locked: 'Not unlocked yet',
  out_of_bounds: 'Off the edge of the map',
  water: "Can't build on water",
  occupied: 'Something is already here',
  blocked: 'Something is in the way',
  needs_fertile: 'Needs fertile land',
  needs_rocky: 'Needs rocky ground',
  needs_road: 'Must touch a road',
  no_gold: 'Not enough gold',
  nothing_to_place: 'Nothing to place here',
  nothing_here: 'Nothing here to demolish',
  bad_speed: 'That speed is not available',
  not_pausable: 'That cannot be paused',
  nothing_to_undo: 'Nothing to undo',
};
export const reasonText = (code) => REASONS[code] || "Can't place here";

const WARNINGS = { needs_road: 'No road touches it yet', no_storage: 'No granary within reach', no_supply: 'No granary to supply it' };
export const warningText = (code) => WARNINGS[code] || "Won't work yet";

export function unlockText(type) {
  const m = MILESTONES.find((ms) => ms.unlocks.includes(type));
  return m ? `Unlocks at ${m.name}` : 'Comes later';
}

export const LEVEL_NAMES = { essential: 'water and food', safety: 'safety', services: 'services', industry: 'industry', monuments: 'monuments' };

// Every problem names the cause and the fix (spec 6.3).
export function alertText(alert, world) {
  const b = alert.id ? world.buildings[alert.id] : null;
  const name = b ? buildingName(b.type) : 'A building';
  switch (alert.code) {
    case 'no_road': return { title: `${name} has no road`, fix: 'Lay a road beside it' };
    case 'no_storage': return { title: `${name} has nowhere to store its grain`, fix: `Build a granary within ${b ? BUILDINGS[b.type].producerReach : 12} road tiles` };
    case 'storage_full': return { title: `${name} has no room left in storage`, fix: 'Build another granary nearby' };
    case 'understaffed': return { title: `${name} is short of workers`, fix: 'More homes bring more workers' };
    case 'bazaar_empty': return { title: 'Bazaar is empty', fix: `No granary with grain within ${BUILDINGS.bazaar.supplyReach} road tiles` };
    case 'labour_shortage': return { title: `Not enough workers for ${LEVEL_NAMES[alert.level] || alert.level}`, fix: "More homes, or pause buildings you don't need" };
    case 'unemployment': return { title: 'Too many people have no work', fix: 'Build farms, granaries, bazaars or temples' };
    case 'debt': return { title: 'The treasury is in debt', fix: "Pause buildings you don't need; taxes rise as homes grow" };
    default: return { title: 'Something needs attention', fix: 'Have a look' };
  }
}

export const SPEED_LABELS = ['Paused', '1×', '2×', '3×'];
export const OVERLAY_NAMES = { water: 'Water', food: 'Food', religion: 'Religion', housing: 'Housing' };
export const OVERLAY_LEGEND = {
  water: ['Has water', 'No water'], food: ['Has food', 'No food'], religion: ['Has a temple', 'No temple'], housing: ['Ready to grow', 'Next need missing'],
};

export const dateText = ({ year, month, day }) => `Year ${year}, month ${month}, day ${day}`;
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export const T = {
  place: 'Place', cancel: 'Cancel', undo: 'Undo', back: 'Back', close: 'Close', demolish: 'Demolish', pause: 'Pause', resume: 'Resume',
  confirm: 'Confirm', flip: 'Flip', build: 'Build', menu: 'Menu', minimap: 'Minimap', overlay: 'Overlay', speed: 'Speed',
  gold: 'Gold', people: 'People', mood: 'Mood', date: 'Date', income: 'Income', jobless: 'Jobless', food: 'Food',
  summary: 'City summary', incomeVsSpending: 'Income against spending', taxes: 'Taxes', wages: 'Wages', upkeep: 'Upkeep', net: 'Net',
  foodInStore: 'Food in store', employment: 'Employment', moodBreakdown: 'Mood', goals: 'Goals', goalsLater: 'Goals arrive with the next update',
  workers: 'Workers', stock: 'Stock', problems: 'Problems', noProblems: 'No problems', reach: 'Reach', view: 'View',
  residents: 'Residents', nextTier: 'To grow it needs', upgradesAtMonthEnd: 'Grows at the end of the month', emptyPlot: 'Waiting for people to move in',
  alerts: 'Alerts', noAlerts: 'All quiet', zoomIn: 'Zoom in', zoomOut: 'Zoom out', jumpTo: 'Jump to',
  newCity: 'New city', continueGame: 'Continue', exportCity: 'Export city', importCity: 'Import city', settings: 'Settings', howToPlay: 'How to play', about: 'About',
  newCityConfirm: 'Start a new city? The current one will be lost.', notYet: 'Not available yet', comingLater: 'Coming later',
  sound: 'Sound', vibration: 'Vibration', textSize: 'Text size', leftHanded: 'Left-handed controls', keyboardShortcuts: 'Keyboard shortcuts', reducedMotion: 'Reduce motion', followSystem: 'Follow the system',
  paused: 'Paused', pausedHidden: 'Paused while you were away', placed: 'Placed', demolished: 'Demolished', roadLaid: 'Road laid', plotsPainted: 'Plots painted',
  tapStart: 'Tap where it starts', tapEnd: 'Tap where it ends', tapCorner: 'Tap the far corner', refund: 'Refund',
  shortcuts: 'Keyboard shortcuts',
};
```

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui text` PASS, then `ALL PASSED`.

- [ ] **Step 6: Commit**

```powershell
git add src/ui/text.js src/data/ui.js tests/ui/text.test.js tests/all.js
git commit -m "Add the interface copy tables and build-dock data`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Back stack and settings

**Files:**
- Create: `src/ui/backstack.js`, `src/ui/settings.js`
- Test: `tests/ui/backstack.test.js`, `tests/ui/settings.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `back` and `isToolMode` from `modes.js` (Task 2); `prefersReducedMotion` from `src/render/effects.js`.
- Produces (`backstack.js`): `createBackStack({ store, history = window.history, addListener = window.addEventListener, removeListener }) → { start(), stop(), depth() }`. Every time the store gains a back step (a sheet, a tool mode, a selection or a dialog appears) it pushes one history entry (`{ thebes: n }`); when the step is left by other means (✕, Esc) it does not pop history but notes the surplus; on `popstate` it applies `back(state)` when there is a step to take, otherwise lets the browser leave. Result: the phone's Back gesture closes one thing at a time and never leaves the game while something is open (spec 6.4).
- Produces (`settings.js`): `DEFAULT_SETTINGS = { sound: false, vibration: true, textSize: 100, leftHanded: false, keyboardShortcuts: true, reducedMotion: 'system' }`, `createSettings({ storage = localStorage, key = 'thebes.settings', root = document.body, systemReducedMotion = prefersReducedMotion }) → { get(), set(patch), subscribe(fn), reducedMotion(), apply() }`. `set` persists (ignoring storage errors), applies to the root (`data-text-size`, `data-hand`, class `reduce-motion`) and notifies. Unknown or malformed stored values fall back to defaults.

- [ ] **Step 1: Write the failing tests**

`tests/ui/backstack.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { select, startTool, openSheet, back } from '../../src/ui/modes.js';
import { createBackStack } from '../../src/ui/backstack.js';

function fakeHistory() {
  const entries = [{ state: null }];
  let index = 0;
  const listeners = [];
  return {
    entries,
    get length() { return entries.length; },
    get state() { return entries[index].state; },
    pushState(state) { entries.splice(index + 1); entries.push({ state }); index = entries.length - 1; },
    back() { if (index > 0) { index--; for (const fn of listeners) fn({ state: entries[index].state }); } },
    addListener(type, fn) { if (type === 'popstate') listeners.push(fn); },
    removeListener(type, fn) { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
    listeners,
  };
}

describe('ui back stack', () => {
  it('pushes an entry for each open step and closes one per Back', () => {
    const store = createStore(INITIAL_UI_STATE);
    const h = fakeHistory();
    const bs = createBackStack({ store, history: h, addListener: h.addListener, removeListener: h.removeListener });
    bs.start();
    store.set(select(store.get(), 1));
    expect(h.length).toBe(2);
    store.set(openSheet(store.get(), 'menu'));
    expect(h.length).toBe(3);
    h.back();
    expect(store.get().sheet).toBe(null);
    expect(store.get().mode).toBe('selected');
    h.back();
    expect(store.get().mode).toBe('browse');
    expect(bs.depth()).toBe(0);
  });
  it('does not push twice for the same step and absorbs steps left by other means', () => {
    const store = createStore(INITIAL_UI_STATE);
    const h = fakeHistory();
    const bs = createBackStack({ store, history: h, addListener: h.addListener, removeListener: h.removeListener });
    bs.start();
    store.set(startTool(store.get(), { kind: 'road' }));
    store.set({ line: { x0: 1, y0: 1, x1: null, y1: null, flip: false } });
    expect(h.length).toBe(2);
    store.set(back(store.get()));            // left with Esc, not with Back
    expect(bs.depth()).toBe(0);
    h.back();                                // the stale entry pops: nothing to close, state untouched
    expect(store.get().mode).toBe('browse');
    bs.stop();
    expect(h.listeners.length).toBe(0);
  });
});
```

`tests/ui/settings.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createSettings, DEFAULT_SETTINGS } from '../../src/ui/settings.js';
import { mount } from '../helpers/dom.js';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data };
}

describe('ui settings', () => {
  it('starts from defaults, persists changes and applies them to the root', () => {
    const { root, cleanup } = mount();
    const storage = fakeStorage();
    const s = createSettings({ storage, root, systemReducedMotion: () => false });
    expect(s.get()).toEqual(DEFAULT_SETTINGS);
    s.set({ textSize: 150, leftHanded: true });
    expect(root.dataset.textSize).toBe('150');
    expect(root.dataset.hand).toBe('left');
    expect(JSON.parse(storage.data['thebes.settings']).textSize).toBe(150);
    const again = createSettings({ storage, root, systemReducedMotion: () => false });
    expect(again.get().textSize).toBe(150);
    expect(again.get().leftHanded).toBe(true);
    cleanup();
  });
  it('ignores malformed storage and storage errors', () => {
    const { root, cleanup } = mount();
    const broken = { getItem: () => '{not json', setItem: () => { throw new Error('quota'); } };
    const s = createSettings({ storage: broken, root, systemReducedMotion: () => false });
    expect(s.get()).toEqual(DEFAULT_SETTINGS);
    s.set({ sound: true });
    expect(s.get().sound).toBe(true);
    const odd = fakeStorage({ 'thebes.settings': JSON.stringify({ textSize: 999, reducedMotion: 'maybe', sound: 'yes' }) });
    expect(createSettings({ storage: odd, root, systemReducedMotion: () => false }).get()).toEqual(DEFAULT_SETTINGS);
    cleanup();
  });
  it('resolves reduced motion from the system unless overridden', () => {
    const { root, cleanup } = mount();
    const s = createSettings({ storage: fakeStorage(), root, systemReducedMotion: () => true });
    expect(s.reducedMotion()).toBe(true);
    expect(root.classList.contains('reduce-motion')).toBe(true);
    s.set({ reducedMotion: 'off' });
    expect(s.reducedMotion()).toBe(false);
    expect(root.classList.contains('reduce-motion')).toBe(false);
    s.set({ reducedMotion: 'on' });
    expect(s.reducedMotion()).toBe(true);
    let seen = 0;
    s.subscribe(() => seen++);
    s.set({ vibration: false });
    expect(seen).toBe(1);
    cleanup();
  });
});
```

Append to `tests/all.js`:
```js
import './ui/backstack.test.js';
import './ui/settings.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui back stack"`
Expected: `LOAD ERROR` naming `tests/all.js`.

- [ ] **Step 3: Write the back stack and the settings store**

`src/ui/backstack.js`:
```js
// One browser-history entry per open step (sheet, tool mode, selection, dialog), so the phone's Back
// gesture closes one thing at a time and never leaves the game while something is open (spec 6.4).
import { back, isToolMode } from './modes.js';

const stepsOf = (s) => (s.confirmDialog ? 1 : 0) + (s.sheet && s.sheet.kind !== 'info' ? 1 : 0) + (isToolMode(s.mode) ? 1 : 0) + (s.mode === 'selected' ? 1 : 0);

export function createBackStack({
  store, history = window.history,
  addListener = (type, fn) => window.addEventListener(type, fn),
  removeListener = (type, fn) => window.removeEventListener(type, fn),
}) {
  let depth = 0;      // entries we pushed for steps that are still open
  let stale = 0;      // entries we pushed for steps that were closed another way (Esc, the x button)
  let lastSteps = 0;
  let applying = false;
  let unsubscribe = null;

  function onState(state) {
    const n = stepsOf(state);
    if (n > lastSteps) {
      for (let i = lastSteps; i < n; i++) history.pushState({ thebes: ++depth }, '');
    } else if (n < lastSteps && !applying) {
      stale += lastSteps - n;
      depth -= lastSteps - n;
    }
    lastSteps = n;
  }

  function onPop() {
    if (stale > 0) { stale--; return; }      // a step closed by other means; the entry just expires
    if (depth <= 0) return;                  // nothing open: let the browser go where it was going
    depth--;
    applying = true;
    const patch = back(store.get());
    if (patch) store.set(patch);
    applying = false;
  }

  return {
    start() {
      lastSteps = stepsOf(store.get());
      unsubscribe = store.subscribe(onState);
      addListener('popstate', onPop);
    },
    stop() {
      if (unsubscribe) unsubscribe();
      unsubscribe = null;
      removeListener('popstate', onPop);
    },
    depth: () => depth,
  };
}
```

`src/ui/settings.js`:
```js
// Settings (spec 6.3): sound, vibration, text size, left-handed controls, keyboard shortcuts, reduced motion.
// Stored in localStorage when available; applied to the document as data attributes and a class.
import { prefersReducedMotion } from '../render/effects.js';

export const DEFAULT_SETTINGS = { sound: false, vibration: true, textSize: 100, leftHanded: false, keyboardShortcuts: true, reducedMotion: 'system' };

const isBool = (v) => typeof v === 'boolean';
const VALID = {
  sound: isBool, vibration: isBool, leftHanded: isBool, keyboardShortcuts: isBool,
  textSize: (v) => [100, 125, 150].includes(v),
  reducedMotion: (v) => ['system', 'on', 'off'].includes(v),
};

export function createSettings({
  storage = typeof localStorage !== 'undefined' ? localStorage : null, key = 'thebes.settings',
  root = document.body, systemReducedMotion = prefersReducedMotion,
} = {}) {
  const subs = new Set();

  function load() {
    try {
      const raw = storage && storage.getItem(key);
      const obj = raw ? JSON.parse(raw) : {};
      const out = {};
      for (const k of Object.keys(DEFAULT_SETTINGS)) if (obj && VALID[k](obj[k])) out[k] = obj[k];
      return out;
    } catch (e) { return {}; }
  }

  let value = { ...DEFAULT_SETTINGS, ...load() };

  function save() {
    try { if (storage) storage.setItem(key, JSON.stringify(value)); } catch (e) { /* full or blocked storage: the setting still applies this session */ }
  }

  const reducedMotion = () => (value.reducedMotion === 'system' ? Boolean(systemReducedMotion()) : value.reducedMotion === 'on');

  function apply() {
    root.dataset.textSize = String(value.textSize);
    root.dataset.hand = value.leftHanded ? 'left' : 'right';
    root.classList.toggle('reduce-motion', reducedMotion());
  }

  apply();
  return {
    get: () => value,
    set(patch) {
      const next = { ...value };
      for (const [k, v] of Object.entries(patch)) if (k in VALID && VALID[k](v)) next[k] = v;
      value = next;
      save();
      apply();
      for (const fn of [...subs]) fn(value);
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    reducedMotion,
    apply,
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui back stack` and `ui settings` PASS, then `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/ui/backstack.js src/ui/settings.js tests/ui/backstack.test.js tests/ui/settings.test.js tests/all.js
git commit -m "Add the browser back stack and the settings store`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Carry-overs from the 1a and 1b reviews (sim and render)

**Files:**
- Modify: `src/sim/alerts.js`, `src/render/camera.js`, `src/render/terrainBaker.js`, `src/render/renderer.js`, `src/render/overlays.js`, `src/render/walkers.js`, `src/render/art/palette.js`
- Test: `tests/render/followups.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: the modules above as they are after Stage 1b.
- Produces:
  - `alertsFor(world) → alerts` in `src/sim/alerts.js`, pure (no write to `world.alerts`); `computeAlerts(world)` becomes `world.alerts = alertsFor(world); return world.alerts;`. The UI queries `alertsFor` mid-month.
  - `clampZoom(z)` returns 1 for a non-finite `z`; `visibleTileRange(cam, view, size, pad)` merges `pad` over the defaults.
  - `createTerrainBaker({ maxChunks = 32, ... })` with `baker.peek(world, cx, cy, zoom, dpr) → { sprite, fresh }` (`sprite` may be a stale one or null) and `baker.get(...)` unchanged. When a chunk bakes at a scale different from the last scale used for that world, entries at other scales are dropped. `CHUNK_MARGIN` becomes 4.
  - `createRenderer` uses `peek` first: a stale chunk is drawn while its re-bake waits for budget, so a zoom-bucket change never shows sand holes; `stats.stale` counts the stale chunks drawn.
  - `overlayMarks(world, kind, range)` memoises the whole-map marks per `(world, kind, world.day, roadVersion, nextId)` and filters by range; `drawOverlay` unions the reach tiles of all working services of the kind into one set and draws only those inside `range`; marks get a thin dark outer stroke so dots and rings read on sand; an unknown `kind` draws nothing.
  - `TILES_PER_DAY` is 2 in `walkers.js`; `TERRAIN.plot` is `#E3CFA0` and `drawPlots` draws it at alpha 0.6 (a trodden-earth pad no lighter than sand).

- [ ] **Step 1: Write the failing tests**

`tests/render/followups.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { alertsFor, computeAlerts } from '../../src/sim/alerts.js';
import { clampZoom, visibleTileRange, createCamera } from '../../src/render/camera.js';
import { createTerrainBaker, CHUNK_MARGIN } from '../../src/render/terrainBaker.js';
import { createRenderer } from '../../src/render/renderer.js';
import { overlayMarks, drawOverlay } from '../../src/render/overlays.js';
import { TILES_PER_DAY } from '../../src/render/walkers.js';
import { TERRAIN } from '../../src/render/art/palette.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { riverWorld } from '../helpers/renderWorld.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';
import { makeCanvas, pixelAt } from '../helpers/canvas.js';

describe('review carry-overs', () => {
  it('offers a pure alert query beside the monthly one', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'farm_grain', 2, 11);
    const live = alertsFor(w);
    expect(live.some((a) => a.code === 'no_storage' || a.code === 'understaffed')).toBe(true);
    expect(w.alerts).toEqual([]);
    expect(computeAlerts(w)).toEqual(live);
    expect(w.alerts).toEqual(live);
  });
  it('guards the camera maths against bad input', () => {
    expect(clampZoom(NaN)).toBe(1);
    expect(clampZoom(Infinity)).toBe(2);
    const r = visibleTileRange(createCamera({ x: 32, y: 32 }), { width: 800, height: 600 }, 64, { bottom: 6 });
    expect(Number.isFinite(r.x0) && Number.isFinite(r.y1)).toBe(true);
  });
  it('keeps a stale chunk on screen until the budget allows a re-bake, and drops other scales', () => {
    const w = riverWorld();
    const counter = { bakes: 0 };
    const baker = createTerrainBaker({ counter });
    const first = baker.get(w, 0, 1, 1, 1);
    addRaw(w, 'house', 12, 21);
    const peek = baker.peek(w, 0, 1, 1, 1);
    expect(peek.fresh).toBe(false);
    expect(peek.sprite).toBe(first);
    expect(counter.bakes).toBe(1);
    baker.get(w, 0, 1, 2, 1);                     // a new scale: the old-scale entry goes
    expect(baker.size(w)).toBe(1);
    expect(CHUNK_MARGIN).toBe(4);
  });
  it('draws stale chunks instead of holes when no bake budget is left', () => {
    const w = riverWorld();
    const canvas = makeCanvas(400, 300);
    const renderer = createRenderer({ canvas, dpr: 1, maxBakesPerFrame: Infinity });
    const cam = createCamera({ x: 16, y: 16, zoom: 0.5 });
    renderer.renderFrame(w, cam, { view: { width: 400, height: 300 } });
    addRaw(w, 'house', 12, 21);
    const tight = createRenderer({ canvas, dpr: 1, maxBakesPerFrame: 0, baker: renderer.baker, spriteCache: renderer.spriteCache });
    const stats = tight.renderFrame(w, cam, { view: { width: 400, height: 300 } });
    expect(stats.chunks).toBe(4);
    expect(stats.stale).toBe(1);
    expect(stats.bakes).toBe(0);
  });
  it('memoises overlay marks per tick and ignores unknown kinds', () => {
    const w = riverWorld();
    const a = overlayMarks(w, 'water');
    const b = overlayMarks(w, 'water');
    expect(a).toBe(b);
    w.day += 1;
    expect(overlayMarks(w, 'water') === a).toBe(false);
    const c = makeCanvas(100, 100);
    drawOverlay(makeDraw(c.getContext('2d'), 2), w, 'nonsense', { x0: 0, y0: 0, x1: 31, y1: 31 });
    expect(pixelAt(c, 50, 50)[3]).toBe(0);
  });
  it('tints overlapping reaches once and marks with a dark outer ring', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'well', 10, 9);
    addRaw(w, 'well', 11, 9);                      // the two reaches overlap almost completely
    const c = makeCanvas(400, 300);
    const ctx = c.getContext('2d');
    ctx.translate(250, -40);
    drawOverlay(makeDraw(ctx, 2), w, 'water', { x0: 0, y0: 0, x1: 31, y1: 31 });
    // tile (7, 10) is 4 road tiles from the first well and 5 from the second, so both reach it;
    // its centre p(7.5, 10.5) = art (-48, 144) lands at canvas (154, 248) with this translate and scale 2
    const alpha = pixelAt(c, 154, 248)[3];
    expect(alpha).toBeGreaterThan(20);
    expect(alpha).toBeLessThan(70);                // one 16% tint, not two stacked (would be about 75)
  });
  it('slows the walkers and tones the plot pad down', () => {
    expect(TILES_PER_DAY).toBe(2);
    expect(TERRAIN.plot).toBe('#E3CFA0');
  });
});
```

Append to `tests/all.js` (before the stress test):
```js
import './render/followups.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "review carry-overs"`
Expected: `LOAD ERROR` (no `alertsFor` export) or several FAILs.

- [ ] **Step 3: Apply the sim, camera and baker changes**

`src/sim/alerts.js`: rename the body of `computeAlerts` to a pure `alertsFor` and keep the monthly writer:
```js
export function alertsFor(world) {
  const alerts = [];
  // ... the existing body, unchanged, up to and including the `if (world.gold < 0)` line ...
  return alerts;
}

export function computeAlerts(world) {
  world.alerts = alertsFor(world);
  return world.alerts;
}
```
(Delete the `world.alerts = alerts;` line from the moved body; nothing else changes.)

`src/render/camera.js`:
```js
export const clampZoom = (z) => (Number.isFinite(z) ? Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)) : 1);
```
and in `visibleTileRange` replace the default parameter with a merge:
```js
const DEFAULT_PAD = { side: 1, top: 1, bottom: 4 };
export function visibleTileRange(cam, view, size, padIn = {}) {
  const pad = { ...DEFAULT_PAD, ...padIn };
  // ... rest unchanged ...
```

`src/render/terrainBaker.js`: `CHUNK_MARGIN = 4`; replace `createTerrainBaker` with:
```js
export function createTerrainBaker({ createCanvas = defaultCreateCanvas, counter = null, maxChunks = 32 } = {}) {
  const perWorld = new WeakMap(); // world -> { map: Map(key -> { sig, sprite, used }), scale }
  let tick = 0;
  const entryFor = (world) => {
    let e = perWorld.get(world);
    if (!e) { e = { map: new Map(), scale: null }; perWorld.set(world, e); }
    return e;
  };
  const key = (cx, cy, scale) => `${cx},${cy}@${scale}`;

  // The cached sprite for the chunk and whether it is still fresh (signature unchanged). Never bakes.
  function peek(world, cx, cy, zoom, dpr) {
    const scale = chunkScaleFor(zoom, dpr);
    const e = entryFor(world).map.get(key(cx, cy, scale));
    if (!e) return { sprite: null, fresh: false };
    e.used = ++tick;
    return { sprite: e.sprite, fresh: e.sig === chunkSignature(world, cx, cy) };
  }

  function get(world, cx, cy, zoom, dpr, allowBake = true) {
    const scale = chunkScaleFor(zoom, dpr);
    const w = entryFor(world);
    const k = key(cx, cy, scale);
    const sig = chunkSignature(world, cx, cy);
    let e = w.map.get(k);
    if (!e || e.sig !== sig) {
      if (!allowBake) return null;
      if (counter) counter.bakes = (counter.bakes || 0) + 1;
      if (w.scale !== scale) {
        for (const [otherKey] of w.map) if (!otherKey.endsWith(`@${scale}`)) w.map.delete(otherKey);
        w.scale = scale;
      }
      e = { sig, sprite: bakeChunk(world, cx, cy, scale, createCanvas), used: ++tick };
      w.map.set(k, e);
      if (w.map.size > maxChunks) {
        let oldest = null;
        for (const [ok, v] of w.map) if (ok !== k && (oldest === null || v.used < w.map.get(oldest).used)) oldest = ok;
        if (oldest !== null) w.map.delete(oldest);
      }
    }
    e.used = ++tick;
    return e.sprite;
  }

  return { get, peek, size: (world) => entryFor(world).map.size, clear: (world) => perWorld.delete(world) };
}
```

- [ ] **Step 4: Apply the renderer, overlay, walker and palette changes**

`src/render/renderer.js`, the chunk loop in `renderFrame` (add `stale` to `stats` and to the final assignment):
```js
    let bakes = 0, chunks = 0, stale = 0;
    for (const { cx, cy } of visibleChunks(range)) {
      const peeked = baker.peek(world, cx, cy, zoom, dpr);
      let sprite = peeked.fresh ? peeked.sprite : null;
      if (!sprite && bakes < maxBakesPerFrame) { sprite = baker.get(world, cx, cy, zoom, dpr, true); bakes++; }
      if (!sprite && peeked.sprite) { sprite = peeked.sprite; stale++; }   // stale beats a sand hole
      if (!sprite) continue;
      const o = p(cx * CHUNK, cy * CHUNK);
      const [px, py] = toDevice(o[0], o[1]);
      drawSprite(ctx, sprite, px, py, zoom, dpr);
      chunks++;
    }
```
and `stats.stale = stale;` beside the other stats; initialise `stale: 0` in the `stats` object.

`src/render/overlays.js`:
```js
import { INK } from './art/palette.js';   // add to the existing palette import

const markCache = new WeakMap(); // world -> { key, marks }

function allMarks(world, kind) {
  const key = `${kind}|${world.day}|${world.roadVersion}|${world.nextId}`;
  const c = markCache.get(world);
  if (c && c.key === key) return c.marks;
  const marks = [];
  for (const h of housesOf(world)) {
    const m = houseMark(world, h, kind);
    if (m) marks.push({ id: h.id, x: h.x + h.w / 2, y: h.y + h.d / 2, has: m.has, need: m.need });
  }
  markCache.set(world, { key, marks });
  return marks;
}

// Memoised per tick: marks only change when the world does. The same array comes back until then.
export function overlayMarks(world, kind, range = null) {
  const marks = allMarks(world, kind);
  if (!range) return marks;
  return marks.filter((m) => m.x >= range.x0 && m.x <= range.x1 + 1 && m.y >= range.y0 && m.y <= range.y1 + 1);
}

function mark(g, m, color) {
  const c = U(p(m.x, m.y), 6);
  if (m.has) {
    g.circ(c, 4.8, INK, { alpha: 0.6 });
    g.circ(c, 4.2, UI.halo, { alpha: 0.9 });
    g.circ(c, 3, color);
  } else {
    g.circ(c, 4.4, 'none', { stroke: INK, strokeWidth: 1, strokeAlpha: 0.6 });
    g.circ(c, 3.6, 'none', { stroke: UI.halo, strokeWidth: 3.2, strokeAlpha: 0.9 });
    g.circ(c, 3.6, 'none', { stroke: color, strokeWidth: 1.6 });
  }
}

export function drawOverlay(g, world, kind, range) {
  if (!SERVICE_TYPES[kind]) return;
  const color = OVERLAY_HUE[kind];
  const tiles = new Set();
  for (const b of allBuildings(world)) {
    if (!SERVICE_TYPES[kind].includes(b.type) || !isWorking(world, b)) continue;
    for (const t of reachTiles(world, b)) tiles.add(t);
  }
  for (const t of tiles) {
    const x = t % world.size, y = (t - x) / world.size;
    if (range && (x < range.x0 || x > range.x1 || y < range.y0 || y > range.y1)) continue;
    g.poly(tileDiamond(x, y), color, { alpha: 0.16 });
  }
  for (const m of overlayMarks(world, kind, range)) mark(g, m, color);
}
```
(The previous `tintTiles` helper is now used only by `drawReachHighlight`; keep it for that.)

`src/render/walkers.js`: `export const TILES_PER_DAY = 2;   // at 1x a day lasts 2/3 s, so a tile takes a third of a second`.

`src/render/art/palette.js`: in `TERRAIN`, `plot: '#E3CFA0'`. `src/render/terrainBaker.js` `drawPlots`: the radial call's alpha becomes `0.6`.

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `review carry-overs` PASS and every earlier render test still PASS (the terrain baker tests use `get`, which is unchanged in behaviour; the renderer test "spreads chunk bakes over frames" still sees `bakes` 1 then 0 because `peek` never bakes), then `ALL PASSED`. If the stale-chunk renderer test reports `chunks` 3, check that `peek` returns the stale sprite rather than null when the signature differs.

- [ ] **Step 6: Commit**

```powershell
git add src/sim/alerts.js src/render/camera.js src/render/terrainBaker.js src/render/renderer.js src/render/overlays.js src/render/walkers.js src/render/art/palette.js tests/render/followups.test.js tests/all.js
git commit -m "Carry the 1a and 1b review follow-ups into the sim and renderer`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Camera control (tweens and keeping a building visible above a sheet)

**Files:**
- Create: `src/ui/cameraControl.js`
- Test: `tests/ui/cameraControl.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `clampZoom`, `screenToTile`, `tileToScreen`, `zoomAt` (camera.js); `CAMERA_PAN_MS` (data/ui.js).
- Produces: `createCameraControl({ cam, view, reducedMotion = () => false, now = () => performance.now() }) → ctl` with `ctl.panTo(x, y, ms = CAMERA_PAN_MS)`, `ctl.zoomTo(zoom, ms)`, `ctl.zoomStep(factor, sx, sy, ms)` (zoom towards a screen point, tweened), `ctl.jumpTo(x, y)`, `ctl.cancel()`, `ctl.tick(now) → boolean` (advances the tween with ease-out; call it once per frame before rendering), `ctl.animating`, and `ctl.keepVisible(x, y, insets, margin = 48, ms) → boolean` which pans the least needed so tile point `(x, y)` sits inside the viewport minus `insets` `{ top, right, bottom, left }` in CSS px (spec 6.3: selecting a building moves the camera so it stays visible above the sheet). With reduced motion every move is immediate (spec 5.4: the camera never auto-pans; it jumps).

- [ ] **Step 1: Write the failing tests**

`tests/ui/cameraControl.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createCamera, tileToScreen } from '../../src/render/camera.js';
import { createCameraControl } from '../../src/ui/cameraControl.js';

const view = () => ({ width: 800, height: 600 });
const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

describe('ui camera control', () => {
  it('tweens a pan with ease-out and lands exactly', () => {
    let t = 0;
    const cam = createCamera({ x: 10, y: 10, zoom: 1 });
    const ctl = createCameraControl({ cam, view, now: () => t });
    ctl.panTo(20, 10, 400);
    expect(ctl.animating).toBe(true);
    t = 200;
    expect(ctl.tick(t)).toBe(true);
    expect(cam.x > 15 && cam.x < 20).toBe(true);        // ease-out: more than halfway at half time
    t = 400;
    ctl.tick(t);
    expect(cam.x).toBe(20);
    expect(ctl.animating).toBe(false);
    expect(ctl.tick(500)).toBe(false);
  });
  it('jumps immediately under reduced motion and on jumpTo', () => {
    const cam = createCamera({ x: 0, y: 0, zoom: 1 });
    const ctl = createCameraControl({ cam, view, reducedMotion: () => true, now: () => 0 });
    ctl.panTo(5, 6);
    expect([cam.x, cam.y]).toEqual([5, 6]);
    expect(ctl.animating).toBe(false);
    const ctl2 = createCameraControl({ cam, view, now: () => 0 });
    ctl2.panTo(9, 9);
    ctl2.jumpTo(1, 1);
    expect([cam.x, cam.y]).toEqual([1, 1]);
    expect(ctl2.animating).toBe(false);
  });
  it('zooms towards a screen point and clamps', () => {
    let t = 0;
    const cam = createCamera({ x: 32, y: 32, zoom: 1 });
    const ctl = createCameraControl({ cam, view, now: () => t });
    ctl.zoomStep(1.25, 100, 100, 300);
    t = 300;
    ctl.tick(t);
    expect(close(cam.zoom, 1.25)).toBe(true);
    ctl.zoomTo(10, 100);
    t = 400;
    ctl.tick(t);
    expect(cam.zoom).toBe(2);
  });
  it('pans only as much as needed to keep a point visible above a sheet', () => {
    let t = 0;
    const cam = createCamera({ x: 32, y: 32, zoom: 1 });
    const ctl = createCameraControl({ cam, view, now: () => t });
    expect(ctl.keepVisible(32, 32, { top: 0, right: 0, bottom: 0, left: 0 })).toBe(false);
    expect(ctl.keepVisible(32, 32, { top: 0, right: 0, bottom: 300, left: 0 }, 48, 100)).toBe(true);
    t = 100;
    ctl.tick(t);
    const [sx, sy] = tileToScreen(cam, view(), 32, 32);
    expect(close(sx, 400, 0.01)).toBe(true);
    expect(close(sy, 252, 0.01)).toBe(true);
  });
});
```

Append to `tests/all.js`:
```js
import './ui/cameraControl.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui camera control"`
Expected: `LOAD ERROR` naming `tests/all.js`.

- [ ] **Step 3: Write the camera control**

`src/ui/cameraControl.js`:
```js
// Tweened camera moves for selection and the +/- buttons. Reduced motion makes every move a jump (spec 5.4).
import { clampZoom, screenToTile, tileToScreen, zoomAt } from '../render/camera.js';
import { CAMERA_PAN_MS } from '../data/ui.js';

const easeOut = (t) => 1 - (1 - t) ** 3;

export function createCameraControl({ cam, view, reducedMotion = () => false, now = () => performance.now() }) {
  let tween = null;

  function begin(toX, toY, toZoom, ms) {
    const z = clampZoom(toZoom);
    if (reducedMotion() || !(ms > 0)) {
      cam.x = toX; cam.y = toY; cam.zoom = z;
      tween = null;
      return;
    }
    tween = { fromX: cam.x, fromY: cam.y, fromZ: cam.zoom, toX, toY, toZ: z, start: now(), ms };
  }

  return {
    panTo(x, y, ms = CAMERA_PAN_MS) { begin(x, y, cam.zoom, ms); },
    zoomTo(zoom, ms = CAMERA_PAN_MS) { begin(cam.x, cam.y, zoom, ms); },
    zoomStep(factor, sx, sy, ms = CAMERA_PAN_MS) {
      const target = { x: cam.x, y: cam.y, zoom: cam.zoom };
      zoomAt(target, view(), factor, sx, sy);
      begin(target.x, target.y, target.zoom, ms);
    },
    jumpTo(x, y) { tween = null; cam.x = x; cam.y = y; },
    cancel() { tween = null; },
    tick(t = now()) {
      if (!tween) return false;
      const k = Math.min(1, (t - tween.start) / tween.ms);
      const e = easeOut(k);
      cam.x = tween.fromX + (tween.toX - tween.fromX) * e;
      cam.y = tween.fromY + (tween.toY - tween.fromY) * e;
      cam.zoom = tween.fromZ + (tween.toZ - tween.fromZ) * e;
      if (k >= 1) { cam.x = tween.toX; cam.y = tween.toY; cam.zoom = tween.toZ; tween = null; }
      return true;
    },
    get animating() { return tween !== null; },
    // Pan the least that puts tile point (x, y) inside the viewport minus the insets, with a margin.
    keepVisible(x, y, insets = { top: 0, right: 0, bottom: 0, left: 0 }, margin = 48, ms = CAMERA_PAN_MS) {
      const v = view();
      const [sx, sy] = tileToScreen(cam, v, x, y);
      const minX = insets.left + margin, maxX = v.width - insets.right - margin;
      const minY = insets.top + margin, maxY = v.height - insets.bottom - margin;
      let dx = 0, dy = 0;
      if (sx < minX) dx = minX - sx; else if (sx > maxX) dx = maxX - sx;
      if (sy < minY) dy = minY - sy; else if (sy > maxY) dy = maxY - sy;
      if (dx === 0 && dy === 0) return false;
      const centre = screenToTile(cam, v, v.width / 2 - dx, v.height / 2 - dy);
      begin(centre.x, centre.y, cam.zoom, ms);
      return true;
    },
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui camera control` PASS, then `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/ui/cameraControl.js tests/ui/cameraControl.test.js tests/all.js
git commit -m "Add tweened camera control that keeps a selection visible`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Gesture recogniser and picking

**Files:**
- Create: `src/ui/gestures.js`, `src/ui/pick.js`
- Test: `tests/ui/gestures.test.js`, `tests/ui/pick.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `DRAG_THRESHOLD_PX`, `DOUBLE_TAP_MS`, `DOUBLE_TAP_PX` (data/ui.js); `screenToTile`, `MIN_ZOOM` (camera.js); `buildingAt`, `allBuildings` (world.js); `inBounds` (grid.js); `ART`, `slotFor` (art/registry.js).
- Produces (`gestures.js`): `createGestures(handlers, { now }) → g` with `g.pointerDown(id, x, y, type, button = 0)`, `g.pointerMove(id, x, y)`, `g.pointerUp(id, x, y)`, `g.cancel(id)`, `g.dragging`, `g.pointerCount`. Handlers (all optional): `onTap({ x, y, type, button })`, `onDoubleTap({ x, y, type })` (touch and pen only; mouse double-clicks are two taps), `onDragStart({ x, y, type, button })`, `onDrag({ x, y, dx, dy, type, button })` with per-move deltas, `onDragEnd({ x, y, type, button })`, `onPinchStart({ cx, cy })`, `onPinch({ scale, cx, cy, dx, dy })` (scale relative to the previous event), `onPinchEnd()`. A drag starts after `DRAG_THRESHOLD_PX`; a second pointer turns any gesture into a pinch and no tap fires from pointers that took part in one.
- Produces (`pick.js`): `tileAt(cam, view, size, sx, sy) → { x, y } | null` (floored, null off the map) and `pickBuilding(world, cam, view, sx, sy, { radius = 1.5 } = {}) → building | null`: the building under the tile; else a tall building whose drawn height covers the point (footprints one or two tiles down the diagonal, the second only for sprites at least 24 art px tall); else the nearest building centre within `radius` tiles; at minimum zoom always the nearest building (spec 5.3).

- [ ] **Step 1: Write the failing tests**

`tests/ui/gestures.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createGestures } from '../../src/ui/gestures.js';
import { DRAG_THRESHOLD_PX, DOUBLE_TAP_MS } from '../../src/data/ui.js';

function rig() {
  const log = [];
  let t = 0;
  const g = createGestures({
    onTap: (e) => log.push(['tap', e.x, e.y, e.type]),
    onDoubleTap: (e) => log.push(['double', e.x, e.y]),
    onDragStart: (e) => log.push(['dragStart', e.x, e.y, e.button]),
    onDrag: (e) => log.push(['drag', e.dx, e.dy]),
    onDragEnd: () => log.push(['dragEnd']),
    onPinchStart: (e) => log.push(['pinchStart', Math.round(e.cx), Math.round(e.cy)]),
    onPinch: (e) => log.push(['pinch', Math.round(e.scale * 100) / 100, Math.round(e.dx), Math.round(e.dy)]),
    onPinchEnd: () => log.push(['pinchEnd']),
  }, { now: () => t });
  return { g, log, setTime: (v) => { t = v; } };
}

describe('ui gestures', () => {
  it('fires a tap for a press and release without movement', () => {
    const { g, log } = rig();
    g.pointerDown(1, 10, 10, 'touch');
    g.pointerMove(1, 12, 11);
    g.pointerUp(1, 12, 11);
    expect(log).toEqual([['tap', 12, 11, 'touch']]);
    expect(g.pointerCount).toBe(0);
  });
  it('starts a drag past the threshold and reports deltas per move', () => {
    const { g, log } = rig();
    g.pointerDown(1, 0, 0, 'mouse', 0);
    g.pointerMove(1, DRAG_THRESHOLD_PX - 1, 0);
    expect(log).toEqual([]);
    g.pointerMove(1, DRAG_THRESHOLD_PX + 2, 0);
    expect(g.dragging).toBe(true);
    g.pointerMove(1, DRAG_THRESHOLD_PX + 7, 3);
    g.pointerUp(1, DRAG_THRESHOLD_PX + 7, 3);
    expect(log[0]).toEqual(['dragStart', 0, 0, 0]);
    expect(log[1]).toEqual(['drag', DRAG_THRESHOLD_PX + 2, 0]);
    expect(log[2]).toEqual(['drag', 5, 3]);
    expect(log[3]).toEqual(['dragEnd']);
    expect(log.length).toBe(4);
  });
  it('turns two quick touch taps into a double tap, but not for a mouse', () => {
    const { g, log, setTime } = rig();
    g.pointerDown(1, 50, 50, 'touch'); g.pointerUp(1, 50, 50);
    setTime(DOUBLE_TAP_MS - 50);
    g.pointerDown(2, 54, 52, 'touch'); g.pointerUp(2, 54, 52);
    expect(log).toEqual([['tap', 50, 50, 'touch'], ['double', 54, 52]]);
    setTime(DOUBLE_TAP_MS * 3);
    g.pointerDown(3, 50, 50, 'mouse'); g.pointerUp(3, 50, 50);
    setTime(DOUBLE_TAP_MS * 3 + 50);
    g.pointerDown(4, 50, 50, 'mouse'); g.pointerUp(4, 50, 50);
    expect(log.slice(2)).toEqual([['tap', 50, 50, 'mouse'], ['tap', 50, 50, 'mouse']]);
  });
  it('treats two fingers as a pinch and never as taps', () => {
    const { g, log } = rig();
    g.pointerDown(1, 100, 100, 'touch');
    g.pointerDown(2, 200, 100, 'touch');
    g.pointerMove(2, 300, 100);
    g.pointerUp(2, 300, 100);
    g.pointerUp(1, 100, 100);
    expect(log[0]).toEqual(['pinchStart', 150, 100]);
    expect(log[1]).toEqual(['pinch', 2, 50, 0]);
    expect(log[2]).toEqual(['pinchEnd']);
    expect(log.length).toBe(3);
  });
  it('ends a drag when a second finger arrives and cancels cleanly', () => {
    const { g, log } = rig();
    g.pointerDown(1, 0, 0, 'touch');
    g.pointerMove(1, 20, 0);
    g.pointerDown(2, 60, 0, 'touch');
    expect(log.map((e) => e[0])).toEqual(['dragStart', 'drag', 'dragEnd', 'pinchStart']);
    g.cancel(2);
    g.cancel(1);
    expect(log[log.length - 1]).toEqual(['pinchEnd']);
    expect(g.pointerCount).toBe(0);
    expect(g.dragging).toBe(false);
  });
});
```

`tests/ui/pick.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { tileAt, pickBuilding } from '../../src/ui/pick.js';
import { createCamera, tileToScreen, MIN_ZOOM } from '../../src/render/camera.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

const view = { width: 800, height: 600 };

describe('ui pick', () => {
  it('finds the tile under a point and nothing off the map', () => {
    const cam = createCamera({ x: 16, y: 16, zoom: 1 });
    const [sx, sy] = tileToScreen(cam, view, 10.5, 12.5);
    expect(tileAt(cam, view, 32, sx, sy)).toEqual({ x: 10, y: 12 });
    const [ox, oy] = tileToScreen(cam, view, -3, 5);
    expect(tileAt(cam, view, 32, ox, oy)).toBe(null);
  });
  it('picks the building under the tile, or the tall one whose height covers the point', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const well = addRaw(w, 'well', 5, 11);
    const temple = addRaw(w, 'temple', 12, 11);
    const cam = createCamera({ x: 12, y: 12, zoom: 1 });
    const [wx, wy] = tileToScreen(cam, view, 5.5, 11.5);
    expect(pickBuilding(w, cam, view, wx, wy)).toBe(well);
    // a point one tile up the diagonal from the temple's footprint lands on its drawn height
    const [tx, ty] = tileToScreen(cam, view, 11.5, 10.5);
    expect(pickBuilding(w, cam, view, tx, ty)).toBe(temple);
    // two tiles up: still the temple (40 art px tall), but not for a 1x1 well (18 px)
    const [tx2, ty2] = tileToScreen(cam, view, 10.5, 9.5);
    expect(pickBuilding(w, cam, view, tx2, ty2)).toBe(temple);
    const [wx2, wy2] = tileToScreen(cam, view, 3.5, 9.5);
    expect(pickBuilding(w, cam, view, wx2, wy2)).toBe(null);
  });
  it('snaps a tap between buildings to the nearest centre, and always at minimum zoom', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const a = addRaw(w, 'well', 5, 12);
    const b = addRaw(w, 'well', 8, 12);
    const cam = createCamera({ x: 6, y: 12, zoom: 1 });
    const [nx, ny] = tileToScreen(cam, view, 6.6, 12.5);
    expect(pickBuilding(w, cam, view, nx, ny)).toBe(a);
    const [fx, fy] = tileToScreen(cam, view, 6.6, 20.5);
    expect(pickBuilding(w, cam, view, fx, fy)).toBe(null);
    const far = createCamera({ x: 6, y: 12, zoom: MIN_ZOOM });
    const [mx, my] = tileToScreen(far, view, 7.4, 20.5);
    expect(pickBuilding(w, far, view, mx, my)).toBe(b);
  });
});
```

Append to `tests/all.js`:
```js
import './ui/gestures.test.js';
import './ui/pick.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui gestures"`
Expected: `LOAD ERROR` naming `tests/all.js`.

- [ ] **Step 3: Write the gesture recogniser**

`src/ui/gestures.js`:
```js
// Pure pointer-stream recogniser (spec 6.6): tap, double-tap, drag with per-move deltas, two-finger pinch.
// It knows nothing about the DOM; input.js feeds it pointer events and acts on the callbacks.
import { DRAG_THRESHOLD_PX, DOUBLE_TAP_MS, DOUBLE_TAP_PX } from '../data/ui.js';

export function createGestures(handlers, { now = () => performance.now() } = {}) {
  const pointers = new Map();
  let dragging = false;
  let pinch = null;
  let lastTap = null;
  const call = (name, arg) => { if (handlers[name]) handlers[name](arg); };

  function pair() {
    const [a, b] = [...pointers.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }

  function pointerDown(id, x, y, type, button = 0) {
    pointers.set(id, { x, y, startX: x, startY: y, prevX: x, prevY: y, type, button, inPinch: false });
    if (pointers.size === 2) {
      if (dragging) { dragging = false; call('onDragEnd', { x, y, type, button }); }
      for (const p of pointers.values()) p.inPinch = true;
      pinch = pair();
      call('onPinchStart', { cx: pinch.cx, cy: pinch.cy });
    }
  }

  function pointerMove(id, x, y) {
    const p = pointers.get(id);
    if (!p) return;
    p.x = x; p.y = y;
    if (pinch && pointers.size >= 2) {
      const next = pair();
      call('onPinch', { scale: next.dist / (pinch.dist || 1), cx: next.cx, cy: next.cy, dx: next.cx - pinch.cx, dy: next.cy - pinch.cy });
      pinch = next;
      return;
    }
    if (pointers.size !== 1 || p.inPinch) return;
    if (!dragging) {
      if (Math.hypot(x - p.startX, y - p.startY) < DRAG_THRESHOLD_PX) return;
      dragging = true;
      call('onDragStart', { x: p.startX, y: p.startY, type: p.type, button: p.button });
      call('onDrag', { x, y, dx: x - p.startX, dy: y - p.startY, type: p.type, button: p.button });
    } else {
      call('onDrag', { x, y, dx: x - p.prevX, dy: y - p.prevY, type: p.type, button: p.button });
    }
    p.prevX = x; p.prevY = y;
  }

  function endPinchIfNeeded() {
    if (pinch && pointers.size < 2) {
      pinch = null;
      for (const q of pointers.values()) { q.startX = q.x; q.startY = q.y; q.prevX = q.x; q.prevY = q.y; }
      call('onPinchEnd');
    }
  }

  function pointerUp(id, x, y) {
    const p = pointers.get(id);
    if (!p) return;
    pointers.delete(id);
    if (pinch) { endPinchIfNeeded(); return; }
    if (p.inPinch) return;
    if (dragging) { dragging = false; call('onDragEnd', { x, y, type: p.type, button: p.button }); return; }
    const t = now();
    if (lastTap && p.type !== 'mouse' && t - lastTap.t <= DOUBLE_TAP_MS && Math.hypot(x - lastTap.x, y - lastTap.y) <= DOUBLE_TAP_PX) {
      lastTap = null;
      call('onDoubleTap', { x, y, type: p.type });
      return;
    }
    lastTap = { x, y, t };
    call('onTap', { x, y, type: p.type, button: p.button });
  }

  function cancel(id) {
    const p = pointers.get(id);
    if (!p) return;
    pointers.delete(id);
    if (pinch) endPinchIfNeeded();
    if (dragging && pointers.size === 0) { dragging = false; call('onDragEnd', { x: p.x, y: p.y, type: p.type, button: p.button }); }
  }

  return { pointerDown, pointerMove, pointerUp, cancel, get dragging() { return dragging; }, get pointerCount() { return pointers.size; } };
}
```

- [ ] **Step 4: Write the picker**

`src/ui/pick.js`:
```js
// What is under a screen point (spec 5.3): the tile, or a building whose footprint or drawn height covers
// the point; taps between buildings, and every tap at minimum zoom, go to the nearest building centre.
import { screenToTile, MIN_ZOOM } from '../render/camera.js';
import { buildingAt, allBuildings } from '../sim/world.js';
import { inBounds } from '../sim/grid.js';
import { ART, slotFor } from '../render/art/registry.js';

export function tileAt(cam, view, size, sx, sy) {
  const t = screenToTile(cam, view, sx, sy);
  const x = Math.floor(t.x), y = Math.floor(t.y);
  return inBounds(size, x, y) ? { x, y } : null;
}

const heightOf = (b) => { const def = ART[slotFor(b)]; return def ? def.height : 0; };

export function pickBuilding(world, cam, view, sx, sy, { radius = 1.5 } = {}) {
  const t = screenToTile(cam, view, sx, sy);
  const tx = Math.floor(t.x), ty = Math.floor(t.y);
  const at = (x, y) => (inBounds(world.size, x, y) ? buildingAt(world, x, y) : null);
  const direct = at(tx, ty);
  if (direct) return direct;
  // A sprite rises along the -(x + y) diagonal by its height: one footprint step (1, 1) is 16 art px.
  for (let k = 1; k <= 2; k++) {
    const b = at(tx + k, ty + k);
    if (b && heightOf(b) >= 16 * k - 8) return b;
  }
  let best = null;
  let bestDist = cam.zoom <= MIN_ZOOM + 1e-9 ? Infinity : radius;
  for (const b of allBuildings(world)) {
    const d = Math.hypot(b.x + b.w / 2 - t.x, b.y + b.d / 2 - t.y);
    if (d < bestDist) { bestDist = d; best = b; }
  }
  return best;
}
```

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui gestures` and `ui pick` PASS, then `ALL PASSED`. In the pick test the well at (5, 11) has height 18, so the point two tiles up its diagonal (3.5, 9.5) needs 24 and misses it, while the temple (height 40) is hit from (10.5, 9.5).

- [ ] **Step 6: Commit**

```powershell
git add src/ui/gestures.js src/ui/pick.js tests/ui/gestures.test.js tests/ui/pick.test.js tests/all.js
git commit -m "Add the gesture recogniser and building picking`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Map input: pointer, wheel and context events to actions

**Files:**
- Create: `src/ui/input.js`
- Test: `tests/ui/input.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `createGestures` (Task 7), `panBy`, `zoomAt` (camera.js), `createCameraControl` (Task 6), `WHEEL_ZOOM_STEP`, `ZOOM_STEP`, `GHOST_FINGER_OFFSET_PX` (data/ui.js), the store (Task 2).
- Produces: `createMapInput({ canvas, cam, view, cameraControl, store, actions, root = document.body }) → { detach() }`. It owns panning and zooming (one-finger drag pans; two fingers pan and zoom; wheel zooms towards the cursor; double tap zooms in by `ZOOM_STEP`; mouse left-drag pans in browse and selected, right- or middle-drag always pans) and hands everything meaningful to `actions`:
  - `actions.tap({ x, y, type, button })` for a primary tap or click on the map;
  - `actions.secondary()` for a right-click (Back, spec 6.4);
  - `actions.hover({ x, y } | null)` for mouse moves with no button down and for the pointer leaving the canvas;
  - `actions.ghostDragStart({ x, y, type }) → boolean`: asked when a one-finger (touch or pen) drag starts; `true` means the drag began on the ghost, so the drag moves the ghost through `actions.ghostDrag({ x, y })` with the point lifted by `GHOST_FINGER_OFFSET_PX` (drawn above the finger, spec 6.5) and `actions.ghostDragEnd()` at the end; `false` means pan;
  - `actions.drawDrag({ x, y, phase: 'start' | 'move' | 'end' })` for a mouse left-drag while `store.get().mode` is `drawing` or `demolishing` (drag a line or area; spec 6.5);
  - `actions.panStarted()` once when a pan begins (the dock tucks, spec 6.3).
  - It records the input type at every press: `store.set({ inputType })` and `root.dataset.input = inputType` (spec 6.7).
  Coordinates are CSS px relative to the canvas.

- [ ] **Step 1: Write the failing tests**

`tests/ui/input.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createMapInput } from '../../src/ui/input.js';
import { createCamera } from '../../src/render/camera.js';
import { createCameraControl } from '../../src/ui/cameraControl.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { DRAG_THRESHOLD_PX, ZOOM_STEP, GHOST_FINGER_OFFSET_PX } from '../../src/data/ui.js';
import { mount, fire } from '../helpers/dom.js';

function rig({ mode = 'browse', ghost = false } = {}) {
  const { root, cleanup } = mount('<canvas id="c" width="400" height="300" style="width:400px;height:300px;display:block"></canvas>');
  const canvas = root.querySelector('canvas');
  const rect = canvas.getBoundingClientRect();
  const at = (x, y) => ({ clientX: rect.left + x, clientY: rect.top + y });
  const cam = createCamera({ x: 16, y: 16, zoom: 1 });
  const view = () => ({ width: 400, height: 300 });
  const cameraControl = createCameraControl({ cam, view, reducedMotion: () => true });
  const store = createStore({ ...INITIAL_UI_STATE, mode });
  const log = [];
  const actions = {
    tap: (e) => log.push(['tap', Math.round(e.x), Math.round(e.y), e.type, e.button]),
    secondary: () => log.push(['secondary']),
    hover: (e) => log.push(['hover', e ? Math.round(e.x) : null]),
    ghostDragStart: () => { log.push(['ghostDragStart']); return ghost; },
    ghostDrag: (e) => log.push(['ghostDrag', Math.round(e.x), Math.round(e.y)]),
    ghostDragEnd: () => log.push(['ghostDragEnd']),
    drawDrag: (e) => log.push(['drawDrag', e.phase, Math.round(e.x), Math.round(e.y)]),
    panStarted: () => log.push(['panStarted']),
  };
  const input = createMapInput({ canvas, cam, view, cameraControl, store, actions, root });
  return { canvas, at, cam, store, log, input, cleanup, root };
}

describe('ui map input', () => {
  it('taps and records the input type per press', () => {
    const r = rig();
    fire(r.canvas, 'pointerdown', { ...r.at(100, 80), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointerup', { ...r.at(100, 80), pointerId: 1, pointerType: 'touch' });
    expect(r.log).toEqual([['tap', 100, 80, 'touch', 0]]);
    expect(r.store.get().inputType).toBe('touch');
    expect(r.root.dataset.input).toBe('touch');
    fire(r.canvas, 'pointerdown', { ...r.at(10, 10), pointerId: 2, pointerType: 'mouse' });
    expect(r.store.get().inputType).toBe('mouse');
    r.input.detach(); r.cleanup();
  });
  it('pans the camera on a one-finger drag and tells the UI once', () => {
    const r = rig();
    const before = { x: r.cam.x, y: r.cam.y };
    fire(r.canvas, 'pointerdown', { ...r.at(100, 100), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointermove', { ...r.at(100 + DRAG_THRESHOLD_PX + 40, 100), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointermove', { ...r.at(100 + DRAG_THRESHOLD_PX + 80, 100), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointerup', { ...r.at(100 + DRAG_THRESHOLD_PX + 80, 100), pointerId: 1, pointerType: 'touch' });
    expect(r.cam.x < before.x && r.cam.y > before.y).toBe(true);     // the world slid right, so the camera moved up-left in tile space
    expect(r.log.filter((e) => e[0] === 'panStarted').length).toBe(1);
    expect(r.log.some((e) => e[0] === 'tap')).toBe(false);
    r.input.detach(); r.cleanup();
  });
  it('moves the ghost instead of panning when the drag starts on it', () => {
    const r = rig({ mode: 'placing', ghost: true });
    const before = r.cam.x;
    fire(r.canvas, 'pointerdown', { ...r.at(100, 100), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointermove', { ...r.at(140, 100), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointerup', { ...r.at(140, 100), pointerId: 1, pointerType: 'touch' });
    expect(r.cam.x).toBe(before);
    expect(r.log).toEqual([['ghostDragStart'], ['ghostDrag', 140, 100 - GHOST_FINGER_OFFSET_PX], ['ghostDragEnd']]);
    r.input.detach(); r.cleanup();
  });
  it('zooms with the wheel towards the cursor and in on a double tap', () => {
    const r = rig();
    fire(r.canvas, 'wheel', { ...r.at(50, 50), deltaY: -100 });
    expect(r.cam.zoom).toBeGreaterThan(1);
    fire(r.canvas, 'wheel', { ...r.at(50, 50), deltaY: 100 });
    expect(Math.abs(r.cam.zoom - 1) < 1e-9).toBe(true);
    fire(r.canvas, 'pointerdown', { ...r.at(200, 150), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointerup', { ...r.at(200, 150), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointerdown', { ...r.at(202, 150), pointerId: 2, pointerType: 'touch' });
    fire(r.canvas, 'pointerup', { ...r.at(202, 150), pointerId: 2, pointerType: 'touch' });
    expect(Math.abs(r.cam.zoom - ZOOM_STEP) < 1e-9).toBe(true);
    r.input.detach(); r.cleanup();
  });
  it('pinches to zoom and pan', () => {
    const r = rig();
    fire(r.canvas, 'pointerdown', { ...r.at(100, 150), pointerId: 1, pointerType: 'touch' });
    fire(r.canvas, 'pointerdown', { ...r.at(200, 150), pointerId: 2, pointerType: 'touch' });
    fire(r.canvas, 'pointermove', { ...r.at(260, 150), pointerId: 2, pointerType: 'touch' });
    expect(r.cam.zoom).toBeGreaterThan(1.5);
    fire(r.canvas, 'pointerup', { ...r.at(260, 150), pointerId: 2, pointerType: 'touch' });
    fire(r.canvas, 'pointerup', { ...r.at(100, 150), pointerId: 1, pointerType: 'touch' });
    expect(r.log.some((e) => e[0] === 'tap')).toBe(false);
    r.input.detach(); r.cleanup();
  });
  it('hovers with the mouse, goes back on right-click, and drags a line while drawing', () => {
    const r = rig({ mode: 'drawing' });
    fire(r.canvas, 'pointermove', { ...r.at(30, 40), pointerId: 1, pointerType: 'mouse', buttons: 0 });
    fire(r.canvas, 'pointerleave', { pointerId: 1, pointerType: 'mouse' });
    expect(r.log).toEqual([['hover', 30], ['hover', null]]);
    fire(r.canvas, 'contextmenu', r.at(30, 40));
    expect(r.log[2]).toEqual(['secondary']);
    const before = r.cam.x;
    fire(r.canvas, 'pointerdown', { ...r.at(100, 100), pointerId: 3, pointerType: 'mouse', button: 0 });
    fire(r.canvas, 'pointermove', { ...r.at(160, 100), pointerId: 3, pointerType: 'mouse', buttons: 1 });
    fire(r.canvas, 'pointerup', { ...r.at(160, 100), pointerId: 3, pointerType: 'mouse', button: 0 });
    expect(r.log.slice(3)).toEqual([['drawDrag', 'start', 100, 100], ['drawDrag', 'move', 160, 100], ['drawDrag', 'end', 160, 100]]);
    expect(r.cam.x).toBe(before);
    fire(r.canvas, 'pointerdown', { ...r.at(100, 100), pointerId: 4, pointerType: 'mouse', button: 2, buttons: 2 });
    fire(r.canvas, 'pointermove', { ...r.at(160, 100), pointerId: 4, pointerType: 'mouse', buttons: 2 });
    fire(r.canvas, 'pointerup', { ...r.at(160, 100), pointerId: 4, pointerType: 'mouse', button: 2 });
    expect(r.cam.x === before).toBe(false);
    r.input.detach(); r.cleanup();
  });
});
```

Append to `tests/all.js`:
```js
import './ui/input.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui map input"`
Expected: `LOAD ERROR` naming `tests/all.js`.

- [ ] **Step 3: Write the map input**

`src/ui/input.js`:
```js
// Pointer, wheel and context-menu events on the map canvas (spec 6.5-6.7). Panning and zooming happen
// here; everything with game meaning goes to `actions`, which createUI wires to placement and picking.
import { createGestures } from './gestures.js';
import { panBy, zoomAt } from '../render/camera.js';
import { isToolMode } from './modes.js';
import { WHEEL_ZOOM_STEP, ZOOM_STEP, GHOST_FINGER_OFFSET_PX } from '../data/ui.js';

export function createMapInput({ canvas, cam, view, cameraControl, store, actions, root = document.body }) {
  const local = (ev) => { const r = canvas.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
  let dragKind = null; // 'pan' | 'ghost' | 'draw'

  const gestures = createGestures({
    onTap: (e) => { if (e.button !== 2) actions.tap(e); },   // right-click reaches us through contextmenu
    onDoubleTap: (e) => cameraControl.zoomStep(ZOOM_STEP, e.x, e.y),
    onDragStart: (e) => {
      const mode = store.get().mode;
      if (e.type === 'mouse' && e.button === 0 && isToolMode(mode) && mode !== 'placing') {
        dragKind = 'draw';
        actions.drawDrag({ x: e.x, y: e.y, phase: 'start' });
      } else if (e.type !== 'mouse' && e.button === 0 && mode === 'placing' && actions.ghostDragStart({ x: e.x, y: e.y, type: e.type })) {
        dragKind = 'ghost';
      } else {
        dragKind = 'pan';
        cameraControl.cancel();
        actions.panStarted();
      }
    },
    onDrag: (e) => {
      if (dragKind === 'pan') panBy(cam, e.dx, e.dy);
      else if (dragKind === 'ghost') actions.ghostDrag({ x: e.x, y: e.y - GHOST_FINGER_OFFSET_PX });
      else if (dragKind === 'draw') actions.drawDrag({ x: e.x, y: e.y, phase: 'move' });
    },
    onDragEnd: (e) => {
      if (dragKind === 'ghost') actions.ghostDragEnd();
      else if (dragKind === 'draw') actions.drawDrag({ x: e.x, y: e.y, phase: 'end' });
      dragKind = null;
    },
    onPinchStart: () => { cameraControl.cancel(); actions.panStarted(); },
    onPinch: (e) => { panBy(cam, e.dx, e.dy); zoomAt(cam, view(), e.scale, e.cx, e.cy); },
  });

  const onDown = (ev) => {
    const type = ev.pointerType === 'pen' ? 'pen' : ev.pointerType === 'touch' ? 'touch' : 'mouse';
    store.set({ inputType: type });
    root.dataset.input = type;
    const { x, y } = local(ev);
    if (canvas.setPointerCapture) { try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable in some test runners */ } }
    gestures.pointerDown(ev.pointerId, x, y, type, ev.button);
    ev.preventDefault();
  };
  const onMove = (ev) => {
    const { x, y } = local(ev);
    if (gestures.pointerCount === 0) { if (ev.pointerType === 'mouse' || ev.pointerType === 'pen') actions.hover({ x, y }); return; }
    gestures.pointerMove(ev.pointerId, x, y);
  };
  const onUp = (ev) => { const { x, y } = local(ev); gestures.pointerUp(ev.pointerId, x, y); };
  const onCancel = (ev) => gestures.cancel(ev.pointerId);
  const onLeave = () => { if (gestures.pointerCount === 0) actions.hover(null); };
  const onWheel = (ev) => {
    const { x, y } = local(ev);
    cameraControl.cancel();
    zoomAt(cam, view(), ev.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP, x, y);
    ev.preventDefault();
  };
  const onContext = (ev) => { ev.preventDefault(); actions.secondary(); };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', onContext);

  return {
    detach() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContext);
    },
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui map input` PASS, then `ALL PASSED`. If pointer capture throws in headless Edge for synthetic events, the try/catch covers it.

- [ ] **Step 5: Commit**

```powershell
git add src/ui/input.js tests/ui/input.test.js tests/all.js
git commit -m "Turn pointer, wheel and context events on the map into actions`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Placement: tools, previews, confirm and undo

**Files:**
- Create: `src/ui/placement.js`
- Modify: `src/render/overlays.js` (`drawGhost` gains a `demolish` state)
- Test: `tests/ui/placement.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `canPlace`, `place`, `previewRoad`, `drawRoad`, `roadPath`, `previewHouses`, `paintHouses`, `previewDemolishArea`, `demolishArea`, `demolishAt`, `rectTiles` (commands.js); `undo` (undo.js); `assignLabour`; `BUILDINGS`; `startTool`, `cancelTool` (modes.js); `AUTO_OVERLAY`; `buildingName`, `reasonText`, `warningText`, `plural`, `T` (text.js).
- Produces:
  - `snapGhost(world, tool, x, y) → { x, y }`: rounds and clamps so the footprint fits on the map.
  - `toolPreview(world, state) → preview | null`: `{ state: 'idle' | 'ok' | 'warn' | 'bad', reason, warnings, text, cost, count, tiles, refund }` describing what ✓ would do. `idle` means the tool needs another tap (`text` says which: tap where it starts / ends / the far corner); `tiles` lists the tiles the ghost should mark (`[[x, y], ...]`).
  - `ghostsFor(world, state, preview?) → [{ x, y, w, d, state }]` for `drawGhost`; demolish marks use state `'demolish'` (coral hatching, no glyph).
  - `createPlacement({ world, store, afterCommand, effects, now }) → pl` with `pl.start(tool, centre)` (enters the mode through `modes.startTool`, snaps the ghost to `centre`, and switches the overlay to the service's own for `AUTO_OVERLAY` types), `pl.moveGhost(x, y)`, `pl.pointAt(x, y)` (a tap: moves the ghost, or sets the line/area start then end), `pl.dragTo(x, y, phase)` (mouse drag for lines and areas), `pl.flip()`, `pl.preview()`, `pl.ghosts()`, `pl.confirm() → result` (runs the command, then `assignLabour`, a dust puff through `effects.puff(cx, cy, now())`, resets the line/area (the building ghost stays, so placing repeats), and calls `afterCommand({ kind, result, text, undoable })`), `pl.demolishOne(x, y)`, `pl.canUndo()`, `pl.undoNeedsConfirm()` (true when undoing would remove homes people have moved into, 1a follow-up), `pl.undo()`, `pl.cancel()`.
- Modifies `drawGhost`: `state === 'demolish'` hatches coral like `bad` but draws no ✕.

- [ ] **Step 1: Write the failing tests**

`tests/ui/placement.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createPlacement, snapGhost, toolPreview, ghostsFor } from '../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { reasonText, T } from '../../src/ui/text.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { housesOf, allBuildings } from '../../src/sim/world.js';
import { makeTestWorld, setRoad } from '../helpers/testWorld.js';

function rig() {
  const world = makeTestWorld({ gold: 1000 });    // fertile land on x < 8, every row
  setRoad(world, 0, 10, 31, 10);
  const store = createStore(INITIAL_UI_STATE);
  const log = [];
  const pl = createPlacement({ world, store, afterCommand: (e) => log.push(e.kind), effects: { puff: () => log.push('puff') }, now: () => 0 });
  return { world, store, pl, log };
}

describe('ui placement', () => {
  it('starts a building tool with a snapped ghost and the matching overlay', () => {
    const { world, store, pl } = rig();
    pl.start({ kind: 'building', type: 'well' }, { x: 40, y: -2 });
    expect(store.get().mode).toBe('placing');
    expect(store.get().ghost).toEqual({ x: 31, y: 0 });
    expect(store.get().overlay).toBe('water');
    expect(snapGhost(world, { kind: 'building', type: 'temple' }, 31, 31)).toEqual({ x: 30, y: 30 });
    pl.moveGhost(5, 9);
    expect(pl.preview().state).toBe('ok');
    pl.moveGhost(5, 20);
    const p = pl.preview();
    expect(p.state).toBe('bad');
    expect(p.text).toBe(reasonText('needs_road'));
    expect(ghostsFor(world, store.get())).toEqual([{ x: 5, y: 20, w: 1, d: 1, state: 'bad' }]);
  });
  it('warns when a farm has no granary in reach, and places it on confirm', () => {
    const { world, store, pl, log } = rig();
    pl.start({ kind: 'building', type: 'farm_grain' }, { x: 2, y: 8 });
    const p = pl.preview();
    expect(p.state).toBe('warn');
    expect(p.warnings).toEqual(['no_storage']);
    expect(p.cost).toBe(BUILDINGS.farm_grain.cost);
    expect(ghostsFor(world, store.get())[0]).toEqual({ x: 2, y: 8, w: 2, d: 2, state: 'warn' });
    const gold = world.gold;
    expect(pl.confirm().ok).toBe(true);
    expect(allBuildings(world).some((b) => b.type === 'farm_grain' && b.x === 2 && b.y === 8)).toBe(true);
    expect(world.gold).toBe(gold - BUILDINGS.farm_grain.cost);
    expect(log).toEqual(['puff', 'building']);
    expect(store.get().mode).toBe('placing');
    expect(store.get().ghost).toEqual({ x: 2, y: 8 });
    expect(pl.preview().state).toBe('bad');     // the spot is taken now
  });
  it('draws a road from two taps, flips the corner, and lays it', () => {
    const { world, store, pl, log } = rig();
    pl.start({ kind: 'road' });
    expect(store.get().mode).toBe('drawing');
    expect(pl.preview().text).toBe(T.tapStart);
    pl.pointAt(10, 12);
    expect(pl.preview().text).toBe(T.tapEnd);
    expect(pl.preview().tiles).toEqual([[10, 12]]);
    pl.pointAt(14, 14);
    let p = pl.preview();
    expect(p.state).toBe('ok');
    expect(p.count).toBe(7);
    expect(p.cost).toBe(14);
    expect(p.tiles[1]).toEqual([11, 12]);
    pl.flip();
    p = pl.preview();
    expect(p.tiles[1]).toEqual([10, 13]);
    expect(pl.confirm().ok).toBe(true);
    expect(world.road[13 * 32 + 10]).toBe(1);
    expect(store.get().line).toBe(null);
    expect(log).toEqual(['puff', 'road']);
  });
  it('paints plots in a rectangle, then demolishes them again', () => {
    const { world, store, pl, log } = rig();
    pl.start({ kind: 'houses' });
    pl.pointAt(12, 11);
    expect(pl.preview().text).toBe(T.tapCorner);
    pl.pointAt(14, 11);
    let p = pl.preview();
    expect(p.state).toBe('ok');
    expect(p.count).toBe(3);
    expect(p.cost).toBe(3 * BUILDINGS.house.cost);
    expect(pl.confirm().ok).toBe(true);
    expect(housesOf(world).length).toBe(3);
    expect(store.get().area).toBe(null);
    pl.start({ kind: 'demolish' });
    expect(store.get().mode).toBe('demolishing');
    pl.pointAt(12, 11);
    pl.pointAt(14, 11);
    p = pl.preview();
    expect(p.state).toBe('ok');
    expect(p.count).toBe(3);
    expect(p.refund).toBe(0);
    expect(ghostsFor(world, store.get()).map((g) => g.state)).toEqual(['demolish', 'demolish', 'demolish']);
    expect(pl.confirm().ok).toBe(true);
    expect(housesOf(world).length).toBe(0);
    expect(log).toEqual(['puff', 'houses', 'puff', 'demolish']);
  });
  it('drags a line with the mouse and demolishes a single tile', () => {
    const { world, store, pl } = rig();
    pl.start({ kind: 'houses' });
    pl.dragTo(12, 11, 'start');
    pl.dragTo(13, 11, 'move');
    expect(store.get().area).toEqual({ x0: 12, y0: 11, x1: 13, y1: 11 });
    expect(pl.preview().count).toBe(2);
    pl.confirm();
    expect(pl.demolishOne(12, 11).ok).toBe(true);
    expect(housesOf(world).length).toBe(1);
    expect(pl.demolishOne(20, 20).ok).toBe(false);
  });
  it('undoes with a full refund and asks first when people live there', () => {
    const { world, store, pl } = rig();
    pl.start({ kind: 'houses' });
    pl.pointAt(12, 11); pl.pointAt(13, 11);
    const gold = world.gold;
    pl.confirm();
    expect(pl.canUndo()).toBe(true);
    expect(pl.undoNeedsConfirm()).toBe(false);
    housesOf(world)[0].residents = 5;
    housesOf(world)[0].tier = 1;
    expect(pl.undoNeedsConfirm()).toBe(true);
    expect(pl.undo().ok).toBe(true);
    expect(housesOf(world).length).toBe(0);
    expect(world.gold).toBe(gold);
    expect(pl.canUndo()).toBe(false);
    pl.cancel();
    expect(store.get().mode).toBe('browse');
    expect(toolPreview(world, store.get())).toBe(null);
  });
});
```

Append to `tests/all.js`:
```js
import './ui/placement.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui placement"`
Expected: `LOAD ERROR` naming `tests/all.js`.

- [ ] **Step 3: Write the placement module (part 1: previews and ghosts)**

`src/ui/placement.js`:
```js
// Tools and their previews (spec 6.5). The world changes only through src/sim/commands.js here, followed
// by assignLabour so derived state is fresh while paused (1a follow-up).
import { BUILDINGS } from '../data/buildings.js';
import {
  canPlace, place, previewRoad, drawRoad, roadPath, previewHouses, paintHouses, previewDemolishArea, demolishArea, demolishAt, rectTiles,
} from '../sim/commands.js';
import { undo as undoCommand } from '../sim/undo.js';
import { assignLabour } from '../sim/labour.js';
import { startTool as startToolPatch, cancelTool } from './modes.js';
import { AUTO_OVERLAY } from '../data/ui.js';
import { buildingName, reasonText, warningText, plural, T } from './text.js';

const footprintOf = (tool) => (tool.kind === 'building' ? { w: BUILDINGS[tool.type].w, d: BUILDINGS[tool.type].d } : { w: 1, d: 1 });

export function snapGhost(world, tool, x, y) {
  const { w, d } = footprintOf(tool);
  return { x: Math.max(0, Math.min(world.size - w, Math.round(x))), y: Math.max(0, Math.min(world.size - d, Math.round(y))) };
}

const idle = (text, tiles = []) => ({ state: 'idle', reason: null, warnings: [], text, cost: 0, count: 0, tiles, refund: 0 });
const bad = (reason, cost, count, tiles = []) => ({ state: 'bad', reason, warnings: [], text: reasonText(reason), cost, count, tiles, refund: 0 });

export function toolPreview(world, state) {
  const { tool } = state;
  if (!tool) return null;
  if (tool.kind === 'building') {
    const def = BUILDINGS[tool.type];
    if (!state.ghost) return idle('');
    const r = canPlace(world, tool.type, state.ghost.x, state.ghost.y);
    if (!r.ok) return bad(r.reason, def.cost, 1);
    const warn = r.warnings.length > 0;
    return { state: warn ? 'warn' : 'ok', reason: null, warnings: r.warnings, text: warn ? warningText(r.warnings[0]) : '', cost: def.cost, count: 1, tiles: [], refund: 0 };
  }
  if (tool.kind === 'road') {
    const l = state.line;
    if (!l) return idle(T.tapStart);
    if (l.x1 === null) return idle(T.tapEnd, [[l.x0, l.y0]]);
    const tiles = roadPath(l.x0, l.y0, l.x1, l.y1, l.flip);
    const r = previewRoad(world, l.x0, l.y0, l.x1, l.y1, l.flip);
    if (!r.ok) return bad(r.reason, r.cost, r.tiles.length, tiles);
    if (!r.tiles.length) return bad('nothing_to_place', 0, 0, tiles);
    return { state: 'ok', reason: null, warnings: [], text: plural(r.tiles.length, 'tile', 'tiles'), cost: r.cost, count: r.tiles.length, tiles, refund: 0 };
  }
  const a = state.area;
  if (!a) return idle(T.tapStart);
  if (a.x1 === null) return idle(T.tapCorner, [[a.x0, a.y0]]);
  if (tool.kind === 'houses') {
    const r = previewHouses(world, a.x0, a.y0, a.x1, a.y1);
    const tiles = r.positions.map(([x, y]) => [x, y]);
    if (!r.ok) return bad(r.reason, r.cost, r.positions.length, tiles);
    const warn = r.warnings.length > 0;
    return { state: warn ? 'warn' : 'ok', reason: null, warnings: r.warnings, text: warn ? warningText(r.warnings[0]) : plural(r.positions.length, 'plot', 'plots'), cost: r.cost, count: r.positions.length, tiles, refund: 0 };
  }
  const r = previewDemolishArea(world, a.x0, a.y0, a.x1, a.y1);
  const count = r.buildingIds.length + r.roadTiles.length;
  const tiles = rectTiles(a.x0, a.y0, a.x1, a.y1, world.size);
  if (!count) return bad('nothing_here', 0, 0, tiles);
  return { state: 'ok', reason: null, warnings: [], text: `${plural(count, 'item', 'items')} · ${T.refund} ${r.refund}`, cost: -r.refund, count, tiles, refund: r.refund };
}

// Ghost shapes for drawGhost. Demolish marks only the tiles that have something on them.
export function ghostsFor(world, state, preview = toolPreview(world, state)) {
  const { tool } = state;
  if (!tool || !preview) return [];
  const visual = preview.state === 'idle' ? 'ok' : preview.state;
  if (tool.kind === 'building') {
    if (!state.ghost) return [];
    const { w, d } = footprintOf(tool);
    return [{ x: state.ghost.x, y: state.ghost.y, w, d, state: visual }];
  }
  if (tool.kind === 'demolish') {
    return preview.tiles
      .filter(([x, y]) => world.occ[y * world.size + x] || world.road[y * world.size + x])
      .map(([x, y]) => ({ x, y, w: 1, d: 1, state: 'demolish' }));
  }
  return preview.tiles.map(([x, y]) => ({ x, y, w: 1, d: 1, state: visual }));
}
```

- [ ] **Step 4: Write the placement module (part 2: actions) and the demolish ghost**

Append to `src/ui/placement.js`:
```js
export function createPlacement({ world, store, afterCommand = () => {}, effects = null, now = () => performance.now() }) {
  const api = {
    start(tool, centre = null) {
      store.set(startToolPatch(store.get(), tool));
      if (tool.kind === 'building') {
        if (centre) api.moveGhost(centre.x, centre.y);
        if (AUTO_OVERLAY[tool.type]) store.set({ overlay: AUTO_OVERLAY[tool.type] });
      }
    },
    moveGhost(x, y) {
      const s = store.get();
      if (!s.tool || s.tool.kind !== 'building') return;
      store.set({ ghost: snapGhost(world, s.tool, x, y) });
    },
    // A tap on the map: moves the ghost, or sets the line/area start, then its end.
    pointAt(x, y) {
      const s = store.get();
      if (!s.tool) return;
      if (s.tool.kind === 'building') { api.moveGhost(x, y); return; }
      if (s.tool.kind === 'road') {
        const l = s.line;
        store.set({ line: !l || l.x1 !== null ? { x0: x, y0: y, x1: null, y1: null, flip: false } : { ...l, x1: x, y1: y } });
        return;
      }
      const a = s.area;
      store.set({ area: !a || a.x1 !== null ? { x0: x, y0: y, x1: null, y1: null } : { ...a, x1: x, y1: y } });
    },
    // A mouse drag: 'start' sets the start, 'move' and 'end' set the end.
    dragTo(x, y, phase) {
      const s = store.get();
      if (!s.tool || s.tool.kind === 'building') return;
      if (phase === 'start') { store.set(s.tool.kind === 'road' ? { line: { x0: x, y0: y, x1: null, y1: null, flip: false } } : { area: { x0: x, y0: y, x1: null, y1: null } }); return; }
      if (s.tool.kind === 'road' && s.line) store.set({ line: { ...s.line, x1: x, y1: y } });
      else if (s.tool.kind !== 'road' && s.area) store.set({ area: { ...s.area, x1: x, y1: y } });
    },
    flip() { const s = store.get(); if (s.line) store.set({ line: { ...s.line, flip: !s.line.flip } }); },
    preview: () => toolPreview(world, store.get()),
    ghosts: () => ghostsFor(world, store.get()),
    confirm() {
      const s = store.get();
      const p = toolPreview(world, s);
      if (!p || p.state === 'bad' || p.state === 'idle') return { ok: false, reason: p ? p.reason : 'nothing_to_place' };
      const t = s.tool;
      let result, text, cx, cy;
      if (t.kind === 'building') {
        const def = BUILDINGS[t.type];
        result = place(world, t.type, s.ghost.x, s.ghost.y);
        cx = s.ghost.x + def.w / 2; cy = s.ghost.y + def.d / 2;
        text = `${buildingName(t.type)} ${T.placed.toLowerCase()}`;
      } else if (t.kind === 'road') {
        result = drawRoad(world, s.line.x0, s.line.y0, s.line.x1, s.line.y1, s.line.flip);
        cx = s.line.x1 + 0.5; cy = s.line.y1 + 0.5;
        text = T.roadLaid;
      } else {
        const a = s.area;
        result = t.kind === 'houses' ? paintHouses(world, a.x0, a.y0, a.x1, a.y1) : demolishArea(world, a.x0, a.y0, a.x1, a.y1);
        cx = (a.x0 + a.x1) / 2 + 0.5; cy = (a.y0 + a.y1) / 2 + 0.5;
        text = t.kind === 'houses' ? T.plotsPainted : T.demolished;
      }
      if (!result.ok) return result;
      assignLabour(world);
      if (effects) effects.puff(cx, cy, now());
      if (t.kind === 'road') store.set({ line: null });
      else if (t.kind !== 'building') store.set({ area: null });
      afterCommand({ kind: t.kind, result, text, undoable: true });
      return result;
    },
    demolishOne(x, y) {
      const r = demolishAt(world, x, y);
      if (r.ok) { assignLabour(world); afterCommand({ kind: 'demolish', result: r, text: T.demolished, undoable: true }); }
      return r;
    },
    canUndo: () => world.undo.length > 0,
    // Undoing a paint after people moved in removes them (spec 6.5 allows it); ask first (1a follow-up).
    undoNeedsConfirm() {
      const e = world.undo[world.undo.length - 1];
      if (!e || e.kind !== 'place') return false;
      return e.ids.some((id) => { const b = world.buildings[id]; return Boolean(b && b.type === 'house' && b.residents > 0); });
    },
    undo() {
      const r = undoCommand(world);
      if (r.ok) { assignLabour(world); afterCommand({ kind: 'undo', result: r, text: T.undo, undoable: false }); }
      return r;
    },
    cancel() { store.set(cancelTool(store.get())); },
  };
  return api;
}
```

In `src/render/overlays.js`, change the start of `drawGhost` so demolish marks hatch without a glyph:
```js
  if (state === 'bad' || state === 'demolish') {
    g.save();
    g.clip(pts);
    g.poly(pts, UI.bad, { alpha: 0.18 });
    const left = p(x, y + d)[0], right = p(x + w, y)[0], top = p(x, y)[1], bottom = p(x + w, y + d)[1];
    for (let k = left - (bottom - top); k < right; k += 4) g.line([k, bottom], [k + (bottom - top), top], UI.bad, 1, 0.8);
    g.restore();
    g.poly(pts, 'none', { stroke: UI.bad, strokeWidth: 1.4 });
    if (state === 'bad') g.text(centre, '✕', { size: 9, color: UI.bad });
    return;
  }
```

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui placement` PASS, then `ALL PASSED`. The road test's count of 7 comes from the L-path (10,12)→(14,12)→(14,14): five tiles along the first leg and two more on the second; `cost` is 7 × `ECONOMY.roadCost` (2).

- [ ] **Step 6: Commit**

```powershell
git add src/ui/placement.js src/render/overlays.js tests/ui/placement.test.js tests/all.js
git commit -m "Add placement tools with previews, confirm and undo`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Keyboard shortcuts

**Files:**
- Create: `src/ui/keyboard.js`
- Test: `tests/ui/keyboard.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `KEYS`, `PAN_STEP_PX` (data/ui.js); `panBy` (camera.js); the camera control (Task 6, only to cancel a tween when the arrows pan); the settings (Task 4).
- Produces: `matchKey(ev, names) → name | null` (pure: which `KEYS` entry a keyboard event matches, honouring `undo`'s Ctrl/Cmd requirement and refusing other modifier combinations) and `createKeyboard({ target = window, settings, cam, cameraControl, actions }) → { detach() }`. `actions` (all optional): `pause()`, `speedUp()`, `speedDown()`, `category(index)` (0–6), `rotate()`, `minimap()`, `overlay()`, `confirm()`, `back()`, `undo()`, `help()`. Panning moves the camera by `PAN_STEP_PX` directly (cancelling any tween); `+` and `−` change the speed, as spec 6.7 says (zoom buttons live in the minimap sheet). Shortcuts are ignored while an `input`, `textarea`, `select` or `contenteditable` element has focus, and the single-key ones are ignored when `settings.get().keyboardShortcuts` is false (Esc, Enter and Ctrl/Cmd+Z always work; spec 6.7, WCAG 2.1.4). Handled keys call `preventDefault`.

- [ ] **Step 1: Write the failing tests**

`tests/ui/keyboard.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createKeyboard, matchKey } from '../../src/ui/keyboard.js';
import { createCamera } from '../../src/render/camera.js';
import { createCameraControl } from '../../src/ui/cameraControl.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { mount, key } from '../helpers/dom.js';

function rig(shortcuts = true) {
  const { root, cleanup } = mount('<input id="field"><div id="t" tabindex="0"></div>');
  const target = root.querySelector('#t');
  const cam = createCamera({ x: 16, y: 16, zoom: 1 });
  const view = () => ({ width: 400, height: 300 });
  const cameraControl = createCameraControl({ cam, view, reducedMotion: () => true });
  const store = createStore(INITIAL_UI_STATE);
  const settings = { get: () => ({ keyboardShortcuts: shortcuts }) };
  const log = [];
  const actions = {};
  for (const n of ['pause', 'speedUp', 'speedDown', 'rotate', 'minimap', 'overlay', 'confirm', 'back', 'undo', 'help']) actions[n] = () => log.push(n);
  actions.category = (i) => log.push(`category${i}`);
  const kb = createKeyboard({ target, settings, cam, cameraControl, actions });
  return { root, target, cam, log, kb, cleanup };
}

describe('ui keyboard', () => {
  it('matches keys from the map and respects modifiers', () => {
    expect(matchKey({ key: ' ', ctrlKey: false, metaKey: false, altKey: false }, ['pause'])).toBe('pause');
    expect(matchKey({ key: 'z', ctrlKey: true, metaKey: false, altKey: false }, ['undo'])).toBe('undo');
    expect(matchKey({ key: 'z', ctrlKey: false, metaKey: false, altKey: false }, ['undo'])).toBe(null);
    expect(matchKey({ key: 'r', ctrlKey: true, metaKey: false, altKey: false }, ['rotate'])).toBe(null);   // Ctrl+R stays the browser's
    expect(matchKey({ key: '3', ctrlKey: false, metaKey: false, altKey: false }, ['category'])).toBe('category');
  });
  it('routes every spec 6.7 shortcut', () => {
    const r = rig();
    for (const k of [' ', '+', '-', '1', '7', 'r', 'M', 'o', 'Enter', 'Escape', '?']) key(r.target, k);
    key(r.target, 'z', { ctrlKey: true });
    expect(r.log).toEqual(['pause', 'speedUp', 'speedDown', 'category0', 'category6', 'rotate', 'minimap', 'overlay', 'confirm', 'back', 'help', 'undo']);
    const before = { x: r.cam.x, y: r.cam.y, zoom: r.cam.zoom };
    key(r.target, 'ArrowLeft');
    expect(r.cam.x < before.x && r.cam.y > before.y).toBe(true);
    key(r.target, 'd');
    expect(Math.abs(r.cam.x - before.x) < 1e-9 && Math.abs(r.cam.y - before.y) < 1e-9).toBe(true);
    key(r.target, '=');
    expect(r.log.filter((e) => e === 'speedUp').length).toBe(2);
    r.kb.detach(); r.cleanup();
  });
  it('stays quiet while a text field has focus and when single keys are switched off', () => {
    const r = rig();
    const field = r.root.querySelector('#field');
    key(field, ' ');
    key(field, 'Escape');
    expect(r.log).toEqual([]);
    r.kb.detach(); r.cleanup();
    const off = rig(false);
    key(off.target, ' ');
    key(off.target, 'o');
    key(off.target, 'Escape');
    key(off.target, 'Enter');
    key(off.target, 'z', { ctrlKey: true });
    expect(off.log).toEqual(['back', 'confirm', 'undo']);
    off.kb.detach(); off.cleanup();
  });
  it('prevents the browser default for handled keys only', () => {
    const r = rig();
    const handled = key(r.target, ' ');
    const unhandled = key(r.target, 'q');
    expect(handled.defaultPrevented).toBe(true);
    expect(unhandled.defaultPrevented).toBe(false);
    r.kb.detach(); r.cleanup();
  });
});
```

Append to `tests/all.js`:
```js
import './ui/keyboard.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui keyboard"`
Expected: `LOAD ERROR` naming `tests/all.js`.

- [ ] **Step 3: Write the keyboard handler**

`src/ui/keyboard.js`:
```js
// Spec 6.7 shortcuts. Single-key shortcuts switch off while a text field has focus and can be turned off in
// settings (WCAG 2.1.4); Esc, Enter and Ctrl/Cmd+Z always work.
import { KEYS, PAN_STEP_PX } from '../data/ui.js';
import { panBy } from '../render/camera.js';

const ALWAYS = new Set(['back', 'confirm', 'undo']);

const isTyping = (node) => Boolean(node && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.tagName === 'SELECT' || node.isContentEditable));

export function matchKey(ev, names = Object.keys(KEYS)) {
  if (ev.altKey) return null;
  const mod = Boolean(ev.ctrlKey || ev.metaKey);
  for (const name of names) {
    if (!KEYS[name].includes(ev.key)) continue;
    if (name === 'undo') { if (mod) return name; continue; }
    return mod ? null : name;          // Ctrl+R, Cmd+M and friends stay the browser's
  }
  return null;
}

export function createKeyboard({ target = window, settings = null, cam, cameraControl, actions = {} }) {
  const run = (fn, ...args) => { if (typeof fn === 'function') fn(...args); };
  const pan = (dx, dy) => { if (cameraControl) cameraControl.cancel(); panBy(cam, dx, dy); };
  const onKey = (ev) => {
    if (isTyping(ev.target)) return;
    const name = matchKey(ev);
    if (!name) return;
    if (!ALWAYS.has(name) && settings && settings.get().keyboardShortcuts === false) return;
    switch (name) {
      case 'panLeft': pan(PAN_STEP_PX, 0); break;
      case 'panRight': pan(-PAN_STEP_PX, 0); break;
      case 'panUp': pan(0, PAN_STEP_PX); break;
      case 'panDown': pan(0, -PAN_STEP_PX); break;
      case 'category': run(actions.category, KEYS.category.indexOf(ev.key)); break;
      default: run(actions[name]); break;
    }
    ev.preventDefault();
  };
  target.addEventListener('keydown', onKey);
  return { detach() { target.removeEventListener('keydown', onKey); } };
}
```

- [ ] **Step 4: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui keyboard` PASS, then `ALL PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add src/ui/keyboard.js tests/ui/keyboard.test.js tests/all.js
git commit -m "Add the keyboard shortcuts`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Top bar, city numbers and speed control

**Files:**
- Create: `src/ui/hud.js`, `src/ui/speed.js`
- Test: `tests/ui/hud.test.js`, `tests/ui/speed.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `population`, `housesOf`, `allBuildings` (world.js); `dateParts` (clock.js); `monthlyNeed` (distribution.js); `wantedGoods` (housing.js); `BUILDINGS`; `setSpeed` (commands.js); `el`, `button`, `iconButton`, `setText`, `clear` (components.js); `T`, `SPEED_LABELS`, `dateText` (text.js).
- Produces (`hud.js`):
  - `summaryData(world) → { gold, people, mood, moodBreakdown, date, taxes, wages, upkeep, net, foodStored, foodNeed, monthsOfFood, workforce, working, jobless, jobs }`; `net` and friends come from `world.stats.lastMonth` (null before the first month end → zeros), `foodStored` sums grain in granaries and bazaars, `foodNeed` is the monthly grain need of every home that wants food, `monthsOfFood` is `foodStored / foodNeed` to one decimal (or `null` when the need is 0), `working` is the sim's `employed` (assigned), `jobless = workforce - working`.
  - `createHud({ world, store, container, speedBar, onOpenSummary, onOpenMenu }) → { render() }`: the top bar as real elements: a stats button (gold, people, mood, date; wide adds income, jobless, months of food) that opens the city summary, the speed bar slot (wide only), and the ☰ menu button. `render()` refreshes the numbers (call it every frame; it only touches changed text).
- Produces (`speed.js`): `createSpeedControl({ world, store, afterCommand, onPausedHidden, doc = document }) → ctl` with `ctl.set(speed)` (through `setSpeed`; remembers the last non-zero speed in `store.lastSpeed`), `ctl.toggle()` (pause ↔ last speed), `ctl.faster()`, `ctl.slower()`, `ctl.pauseForHidden()`, `ctl.mountCorner(container)` (the portrait/compact corner button: tap pauses or resumes, the chevron opens 1×/2×/3×), `ctl.mountBar(container)` (the wide top-bar buttons Paused/1×/2×/3× with `aria-pressed`), `ctl.render()`, `ctl.watchVisibility() → detach` (pauses when the page is hidden, spec 4.3, and reports it through `onPausedHidden` when the page comes back so a toast can say so).

- [ ] **Step 1: Write the failing tests**

`tests/ui/hud.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createHud, summaryData } from '../../src/ui/hud.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { advanceDays } from '../../src/sim/clock.js';
import { mount, fire } from '../helpers/dom.js';

function town() {
  const w = makeTestWorld();
  setRoad(w, 0, 10, 31, 10);
  addRaw(w, 'house', 12, 11, { tier: 3, residents: 12, stock: { grain: 2 } });
  addRaw(w, 'granary', 14, 11, { store: { grain: 30 } });
  addRaw(w, 'bazaar', 17, 11, { store: { grain: 6 } });
  staffAll(w);
  return w;
}

describe('ui hud', () => {
  it('summarises the city numbers', () => {
    const w = town();
    let d = summaryData(w);
    expect(d.people).toBe(12);
    expect(d.foodStored).toBe(36);
    expect(d.foodNeed).toBe(3);
    expect(d.monthsOfFood).toBe(12);
    expect(d.net).toBe(0);
    advanceDays(w, 30);
    d = summaryData(w);
    expect(d.taxes).toBeGreaterThan(0);
    expect(typeof d.net).toBe('number');
    expect(d.workforce).toBe(w.labour.workforce);
    expect(d.jobless).toBe(w.labour.workforce - w.labour.employed);
    expect(summaryData(makeTestWorld()).monthsOfFood).toBe(null);
  });
  it('renders the bar, refreshes numbers and opens the summary and the menu', () => {
    const { root, cleanup } = mount();
    const w = town();
    const store = createStore({ ...INITIAL_UI_STATE, layout: 'wide' });
    const opened = [];
    const speedBar = document.createElement('div');
    const hud = createHud({ world: w, store, container: root, speedBar, onOpenSummary: () => opened.push('summary'), onOpenMenu: () => opened.push('menu') });
    expect(root.textContent).toContain('2000');
    expect(root.textContent).toContain('12');
    expect(root.querySelectorAll('.wide-only').length).toBeGreaterThan(0);
    expect(root.contains(speedBar)).toBe(true);
    w.gold = 1234;
    hud.render();
    expect(root.textContent).toContain('1234');
    fire(root.querySelector('.stats'), 'click');
    fire(root.querySelector('.menu'), 'click');
    expect(opened).toEqual(['summary', 'menu']);
    expect(root.querySelector('.menu').getAttribute('aria-label').length).toBeGreaterThan(0);
    cleanup();
  });
});
```

`tests/ui/speed.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createSpeedControl } from '../../src/ui/speed.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { SPEED_LABELS } from '../../src/ui/text.js';
import { makeTestWorld } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';

function fakeDoc(hidden = false) {
  const listeners = [];
  return { get hidden() { return hidden; }, set hidden(v) { hidden = v; }, addEventListener: (t, fn) => listeners.push([t, fn]), removeEventListener: (t, fn) => listeners.splice(listeners.findIndex((l) => l[1] === fn), 1), fireVisibility() { for (const [t, fn] of listeners) if (t === 'visibilitychange') fn(); }, listeners };
}

describe('ui speed', () => {
  it('sets, toggles and steps the speed through the command and remembers the last speed', () => {
    const w = makeTestWorld();
    const store = createStore(INITIAL_UI_STATE);
    const log = [];
    const ctl = createSpeedControl({ world: w, store, afterCommand: (e) => log.push(e.kind) });
    expect(ctl.set(2).ok).toBe(true);
    expect(w.speed).toBe(2);
    expect(store.get().lastSpeed).toBe(2);
    ctl.toggle();
    expect(w.speed).toBe(0);
    ctl.toggle();
    expect(w.speed).toBe(2);
    ctl.faster(); ctl.faster();
    expect(w.speed).toBe(3);
    ctl.slower(); ctl.slower(); ctl.slower(); ctl.slower();
    expect(w.speed).toBe(0);
    expect(ctl.set(7).ok).toBe(false);
    expect(log.length).toBe(9);
  });
  it('pauses when the page is hidden and says so when it comes back', () => {
    const w = makeTestWorld();
    w.speed = 1;
    const doc = fakeDoc();
    const said = [];
    const ctl = createSpeedControl({ world: w, store: createStore(INITIAL_UI_STATE), doc, onPausedHidden: () => said.push('paused') });
    const stop = ctl.watchVisibility();
    doc.hidden = true; doc.fireVisibility();
    expect(w.speed).toBe(0);
    doc.hidden = false; doc.fireVisibility();
    expect(w.speed).toBe(0);
    expect(said).toEqual(['paused']);
    doc.hidden = true; doc.fireVisibility();
    doc.hidden = false; doc.fireVisibility();
    expect(said).toEqual(['paused']);          // nothing to say when it was already paused
    stop();
    expect(doc.listeners.length).toBe(0);
  });
  it('mounts the corner button and the wide bar as labelled buttons', () => {
    const { root, cleanup } = mount('<div id="c"></div><div id="b"></div>');
    const w = makeTestWorld();
    const ctl = createSpeedControl({ world: w, store: createStore(INITIAL_UI_STATE) });
    ctl.mountCorner(root.querySelector('#c'));
    ctl.mountBar(root.querySelector('#b'));
    const main = root.querySelector('#c .speed-main');
    expect(main.textContent).toContain(SPEED_LABELS[0]);
    fire(main, 'click');
    expect(w.speed).toBe(1);
    ctl.render();
    expect(main.textContent).toContain(SPEED_LABELS[1]);
    fire(root.querySelector('#c .speed-chevron'), 'click');
    const options = root.querySelectorAll('#c .speed-options button');
    expect(options.length).toBe(3);
    fire(options[2], 'click');
    expect(w.speed).toBe(3);
    const bar = root.querySelectorAll('#b button');
    expect(bar.length).toBe(4);
    ctl.render();
    expect(bar[3].getAttribute('aria-pressed')).toBe('true');
    fire(bar[0], 'click');
    expect(w.speed).toBe(0);
    cleanup();
  });
});
```

Append to `tests/all.js`:
```js
import './ui/hud.test.js';
import './ui/speed.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui hud"`
Expected: `LOAD ERROR` naming `tests/all.js`.

- [ ] **Step 3: Write the top bar**

`src/ui/hud.js`:
```js
// The top bar (spec 6.3): gold, people, mood, date and the menu; wide screens add income, jobless, months of
// food and the speed buttons. Tapping the numbers opens the city summary. Numbers refresh every frame.
import { population, housesOf, allBuildings } from '../sim/world.js';
import { dateParts } from '../sim/clock.js';
import { monthlyNeed } from '../sim/distribution.js';
import { wantedGoods } from '../sim/housing.js';
import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS } from '../data/goods.js';
import { el, iconButton, setText } from './components.js';
import { T, dateText } from './text.js';

export function summaryData(world) {
  const last = world.stats.lastMonth || { taxes: 0, wages: 0, upkeep: 0, net: 0 };
  let foodStored = 0;
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (def.stores || def.sells) for (const g of FOOD_GOODS) foodStored += b.store[g] || 0;
  }
  let foodNeed = 0;
  for (const h of housesOf(world)) if (h.tier >= 1 && wantedGoods(h).length) foodNeed += monthlyNeed(h, FOOD_GOODS[0]);
  const L = world.labour;
  return {
    gold: world.gold, people: population(world), mood: world.mood, moodBreakdown: world.moodBreakdown, date: dateParts(world),
    taxes: last.taxes, wages: last.wages, upkeep: last.upkeep, net: last.net,
    foodStored, foodNeed, monthsOfFood: foodNeed > 0 ? Math.round((foodStored / foodNeed) * 10) / 10 : null,
    workforce: L.workforce, working: L.employed, jobless: L.workforce - L.employed, jobs: L.jobs,
  };
}

const stat = (label, cls) => el('span', { class: `stat ${cls}` }, [el('span', { class: 'label', text: label }), el('span', { class: 'value', text: '' })]);

export function createHud({ world, store, container, speedBar = null, onOpenSummary = () => {}, onOpenMenu = () => {} }) {
  const gold = stat(T.gold, 'gold'), people = stat(T.people, 'people'), mood = stat(T.mood, 'mood'), date = stat(T.date, 'date');
  const income = stat(T.income, 'income wide-only'), jobless = stat(T.jobless, 'jobless wide-only'), food = stat(T.food, 'food wide-only');
  const stats = el('button', { type: 'button', class: 'stats quiet', 'aria-label': T.summary, onClick: onOpenSummary }, [gold, people, mood, date, income, jobless, food]);
  const menu = iconButton(T.menu, '☰', { class: 'menu' });
  menu.addEventListener('click', onOpenMenu);
  const bar = el('div', { class: 'speed wide-only' });
  if (speedBar) bar.append(speedBar);
  container.append(stats, el('span', { class: 'spacer' }), bar, menu);

  function render() {
    const d = summaryData(world);
    setText(gold.lastChild, String(d.gold));
    setText(people.lastChild, String(d.people));
    setText(mood.lastChild, String(d.mood));
    const compact = store.get().layout !== 'wide';
    setText(date.lastChild, compact ? `Y${d.date.year} M${d.date.month}` : dateText(d.date));
    setText(income.lastChild, (d.net >= 0 ? '+' : '') + String(d.net));
    setText(jobless.lastChild, String(d.jobless));
    setText(food.lastChild, d.monthsOfFood === null ? '–' : `${d.monthsOfFood} mo`);
  }
  render();
  return { render };
}
```

- [ ] **Step 4: Write the speed control**

`src/ui/speed.js`:
```js
// Pause and speed (spec 4.3, 6.3): a corner button in portrait and compact, buttons in the wide top bar.
// The page pauses when hidden and reopens paused; the UI says so when it comes back.
import { setSpeed } from '../sim/commands.js';
import { el, button, iconButton, setText, clear } from './components.js';
import { SPEED_LABELS, T } from './text.js';

export function createSpeedControl({ world, store, afterCommand = () => {}, onPausedHidden = () => {}, doc = document }) {
  const mounted = [];     // render callbacks
  const api = {
    set(speed) {
      const r = setSpeed(world, speed);
      if (r.ok) {
        if (speed > 0) store.set({ lastSpeed: speed });
        afterCommand({ kind: 'speed', result: r, text: SPEED_LABELS[speed], undoable: false });
        api.render();
      }
      return r;
    },
    toggle: () => api.set(world.speed === 0 ? store.get().lastSpeed : 0),
    faster: () => api.set(Math.min(3, world.speed + 1)),
    slower: () => api.set(Math.max(0, world.speed - 1)),
    pauseForHidden() { if (world.speed > 0) { api.set(0); return true; } return false; },
    watchVisibility() {
      let pausedByUs = false;
      const onChange = () => {
        if (doc.hidden) { pausedByUs = api.pauseForHidden(); return; }
        if (pausedByUs) { pausedByUs = false; onPausedHidden(); }
      };
      doc.addEventListener('visibilitychange', onChange);
      return () => doc.removeEventListener('visibilitychange', onChange);
    },
    mountCorner(container) {
      const main = button(SPEED_LABELS[world.speed], { class: 'speed-main primary', 'aria-label': `${T.speed}: ${SPEED_LABELS[world.speed]}` });
      const chevron = iconButton(T.speed, '⌄', { class: 'speed-chevron' });
      const options = el('div', { class: 'speed-options', hidden: true });
      for (const s of [1, 2, 3]) options.append(button(SPEED_LABELS[s], { onClick: () => { api.set(s); options.hidden = true; } }));
      main.addEventListener('click', () => api.toggle());
      chevron.addEventListener('click', () => { options.hidden = !options.hidden; });
      container.append(el('div', { class: 'speed-corner group' }, [main, chevron, options]));
      mounted.push(() => { setText(main, SPEED_LABELS[world.speed]); main.setAttribute('aria-label', `${T.speed}: ${SPEED_LABELS[world.speed]}`); });
    },
    mountBar(container) {
      const buttons = [0, 1, 2, 3].map((s) => button(SPEED_LABELS[s], { 'aria-pressed': String(world.speed === s), onClick: () => api.set(s) }));
      clear(container);
      container.append(...buttons);
      mounted.push(() => buttons.forEach((b, s) => b.setAttribute('aria-pressed', String(world.speed === s))));
    },
    render() { for (const fn of mounted) fn(); },
  };
  return api;
}
```

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui hud` and `ui speed` PASS, then `ALL PASSED`. In the hud test, `foodStored` is 30 in the granary plus 6 in the bazaar; `foodNeed` is `ceil(12 × 0.25)` = 3; `monthsOfFood` 12.

- [ ] **Step 6: Commit**

```powershell
git add src/ui/hud.js src/ui/speed.js tests/ui/hud.test.js tests/ui/speed.test.js tests/all.js
git commit -m "Add the top bar, city numbers and speed control`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Building cards, the portrait dock and the confirm bar

**Files:**
- Create: `src/ui/cards.js`, `src/ui/dock.js`, `src/ui/confirmBar.js`
- Modify: `css/ui.css` (the `#confirm` element)
- Test: `tests/ui/cards.test.js`, `tests/ui/dock.test.js`, `tests/ui/confirmBar.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `BUILDINGS`, `ECONOMY`, `isUnlocked`, `canAfford`, `CATEGORIES`, `CATEGORY_ICONS`, `toolForItem`; `pickCategory`, `setDock`, `isToolMode` (modes.js); the placement (Task 9); `buildingName`, `unlockText`, `CATEGORY_NAMES`, `T` (text.js); `el`, `button`, `iconButton`, `clear`, `setText`.
- Produces (`cards.js`): `cardInfo(world, item) → { item, name, cost, costText, affordable, locked, lockText }` (`road` costs `ECONOMY.roadCost` "per tile", `house` costs its plot price "per plot", `demolish` costs nothing and says "refunds a quarter"); `activeItemOf(tool) → item | null`; `renderCards(container, { world, category, activeItem, onPick, grid = false }) → buttons`: one `button.card` per item in the category, with `.name` and `.cost`, class `unaffordable` (coral cost with a coin-slash glyph) or `locked` (lock glyph and the unlock condition; clicking does nothing), `aria-pressed` on the active item; an empty category shows "Coming later".
- Produces (`dock.js`): `createDock({ container, store, world, onPick }) → { render() }` the portrait dock with three heights (spec 6.3): a handle button (tap or swipe changes height), the category bar, the tray of cards for the current category (remembers the last category), and the "Build" pill when tucked. It mirrors the height onto `document.body.dataset.dock` so the corners move with it.
- Produces (`confirmBar.js`): `createConfirmBar({ container, store, placement, onCancel, onConfirm, onUndo }) → { render(), element }`: shown only in a tool mode (spec 6.4): title, cost or refund, the reason (coral) or warning (amber) from the preview, ⟳ (disabled, nothing rotates in Stage 1), Flip (roads with both ends set), Undo (disabled when nothing to undo), ✕ and ✓ (✓ disabled when the preview is bad or idle). Demolishing shows the red variant with the count and refund.

- [ ] **Step 1: Write the failing tests**

`tests/ui/cards.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { cardInfo, renderCards, activeItemOf } from '../../src/ui/cards.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { ECONOMY } from '../../src/data/economy.js';
import { makeTestWorld } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';

describe('ui cards', () => {
  it('describes every item with its cost and state', () => {
    const w = makeTestWorld({ gold: 50 });
    expect(cardInfo(w, 'well')).toEqual({ item: 'well', name: 'Well', cost: BUILDINGS.well.cost, costText: `${BUILDINGS.well.cost} gold`, affordable: true, locked: false, lockText: '' });
    expect(cardInfo(w, 'temple').affordable).toBe(false);
    expect(cardInfo(w, 'road').costText).toBe(`${ECONOMY.roadCost} gold per tile`);
    expect(cardInfo(w, 'house').costText).toBe(`${BUILDINGS.house.cost} gold per plot`);
    expect(cardInfo(w, 'demolish').costText).toBe('Refunds a quarter');
    expect(activeItemOf({ kind: 'building', type: 'temple' })).toBe('temple');
    expect(activeItemOf({ kind: 'houses' })).toBe('house');
    expect(activeItemOf(null)).toBe(null);
  });
  it('renders a category as labelled card buttons and reports picks', () => {
    const { root, cleanup } = mount();
    const w = makeTestWorld({ gold: 50 });
    const picked = [];
    const buttons = renderCards(root, { world: w, category: 'services', activeItem: 'well', onPick: (i) => picked.push(i) });
    expect(buttons.length).toBe(3);
    expect(buttons[0].querySelector('.name').textContent).toBe('Well');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[2].classList.contains('unaffordable')).toBe(true);
    fire(buttons[1], 'click');
    expect(picked).toEqual(['bazaar']);
    renderCards(root, { world: w, category: 'industry', activeItem: null, onPick: () => {} });
    expect(root.querySelector('.empty').textContent).toBe('Coming later');
    cleanup();
  });
});
```

`tests/ui/dock.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createDock } from '../../src/ui/dock.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { makeTestWorld } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';

describe('ui dock', () => {
  it('opens the tray for a category, shows its cards and remembers it', () => {
    const { root, cleanup } = mount();
    const store = createStore({ ...INITIAL_UI_STATE, layout: 'portrait' });
    const picked = [];
    createDock({ container: root, store, world: makeTestWorld(), onPick: (i) => picked.push(i) });
    expect(root.dataset.height).toBe('slim');
    expect(root.querySelectorAll('.cat').length).toBe(7);
    fire(root.querySelectorAll('.cat')[2], 'click');
    expect(store.get().dock).toBe('tray');
    expect(store.get().category).toBe('food');
    expect(root.dataset.height).toBe('tray');
    expect(document.body.dataset.dock).toBe('tray');
    const cards = root.querySelectorAll('.tray .card');
    expect(cards.length).toBe(2);
    fire(cards[1], 'click');
    expect(picked).toEqual(['granary']);
    fire(root.querySelectorAll('.cat')[2], 'click');
    expect(store.get().dock).toBe('slim');
    expect(store.get().category).toBe('food');
    cleanup();
  });
  it('changes height with the handle, swipes and the pill', () => {
    const { root, cleanup } = mount();
    const store = createStore({ ...INITIAL_UI_STATE, layout: 'portrait' });
    createDock({ container: root, store, world: makeTestWorld(), onPick: () => {} });
    const handle = root.querySelector('.handle');
    fire(handle, 'click');
    expect(store.get().dock).toBe('tray');
    fire(handle, 'pointerdown', { clientX: 10, clientY: 300, pointerId: 1, pointerType: 'touch' });
    fire(handle, 'pointerup', { clientX: 10, clientY: 360, pointerId: 1, pointerType: 'touch' });
    expect(store.get().dock).toBe('slim');
    fire(handle, 'pointerdown', { clientX: 10, clientY: 300, pointerId: 2, pointerType: 'touch' });
    fire(handle, 'pointerup', { clientX: 10, clientY: 360, pointerId: 2, pointerType: 'touch' });
    expect(store.get().dock).toBe('tucked');
    expect(root.dataset.height).toBe('tucked');
    fire(root.querySelector('.pill'), 'click');
    expect(store.get().dock).toBe('slim');
    fire(handle, 'pointerdown', { clientX: 10, clientY: 300, pointerId: 3, pointerType: 'touch' });
    fire(handle, 'pointerup', { clientX: 10, clientY: 240, pointerId: 3, pointerType: 'touch' });
    expect(store.get().dock).toBe('tray');
    cleanup();
  });
});
```

`tests/ui/confirmBar.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createConfirmBar } from '../../src/ui/confirmBar.js';
import { createPlacement } from '../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { reasonText, T } from '../../src/ui/text.js';
import { makeTestWorld, setRoad } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';

function rig() {
  const { root, cleanup } = mount();
  const world = makeTestWorld({ gold: 1000 });
  setRoad(world, 0, 10, 31, 10);
  const store = createStore(INITIAL_UI_STATE);
  const placement = createPlacement({ world, store });
  const log = [];
  const bar = createConfirmBar({ container: root, store, placement, onCancel: () => log.push('cancel'), onConfirm: () => log.push('confirm'), onUndo: () => log.push('undo') });
  return { root, world, store, placement, bar, log, cleanup };
}

describe('ui confirm bar', () => {
  it('is hidden outside tool modes and shows title, cost and reason inside them', () => {
    const r = rig();
    expect(r.bar.element.hidden).toBe(true);
    r.placement.start({ kind: 'building', type: 'well' }, { x: 5, y: 20 });
    r.bar.render();
    expect(r.bar.element.hidden).toBe(false);
    expect(r.root.querySelector('.title').textContent).toBe('Well');
    expect(r.root.querySelector('.cost').textContent).toContain('30');
    expect(r.root.querySelector('.reason').textContent).toBe(reasonText('needs_road'));
    expect(r.root.querySelector('.reason').classList.contains('coral')).toBe(true);
    expect(r.root.querySelector('.ok').disabled).toBe(true);
    r.placement.moveGhost(5, 9);
    r.bar.render();
    expect(r.root.querySelector('.ok').disabled).toBe(false);
    fire(r.root.querySelector('.ok'), 'click');
    expect(r.log).toEqual(['confirm']);
    fire(r.root.querySelector('.cancel'), 'click');
    expect(r.log).toEqual(['confirm', 'cancel']);
    r.cleanup();
  });
  it('offers Flip for a finished road, Undo when there is history, and the red demolish variant', () => {
    const r = rig();
    r.placement.start({ kind: 'road' });
    r.bar.render();
    expect(r.root.querySelector('.flip')).toBe(null);
    expect(r.root.querySelector('.undo').disabled).toBe(true);
    r.placement.pointAt(10, 12); r.placement.pointAt(14, 14);
    r.bar.render();
    fire(r.root.querySelector('.flip'), 'click');
    expect(r.store.get().line.flip).toBe(true);
    r.placement.confirm();
    r.bar.render();
    expect(r.root.querySelector('.undo').disabled).toBe(false);
    fire(r.root.querySelector('.undo'), 'click');
    expect(r.log).toEqual(['undo']);
    r.placement.start({ kind: 'demolish' });
    r.placement.pointAt(10, 12); r.placement.pointAt(10, 12);
    r.bar.render();
    expect(r.root.querySelector('.confirm').classList.contains('demolish')).toBe(true);
    expect(r.root.querySelector('.title').textContent).toBe(T.demolish);
    expect(r.root.querySelector('.reason').textContent).toContain('1 item');
    r.cleanup();
  });
});
```

Append to `tests/all.js`:
```js
import './ui/cards.test.js';
import './ui/dock.test.js';
import './ui/confirmBar.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui cards"`
Expected: `LOAD ERROR` naming `tests/all.js`.

- [ ] **Step 3: Write the cards**

`src/ui/cards.js`:
```js
// Building cards (spec 6.3): name and cost; coral with a coin-slash when unaffordable; a lock and the
// unlock condition when locked. Shared by the dock tray, the side panel grid and the rail drawer.
import { BUILDINGS } from '../data/buildings.js';
import { ECONOMY } from '../data/economy.js';
import { isUnlocked } from '../sim/progression.js';
import { canAfford } from '../sim/money.js';
import { CATEGORIES } from '../data/ui.js';
import { buildingName, unlockText, T } from './text.js';
import { el, clear } from './components.js';

export function cardInfo(world, item) {
  let cost = 0, suffix = '', costText;
  if (item === 'road') { cost = ECONOMY.roadCost; suffix = ' per tile'; }
  else if (item === 'house') { cost = BUILDINGS.house.cost; suffix = ' per plot'; }
  else if (item !== 'demolish') cost = BUILDINGS[item].cost;
  costText = item === 'demolish' ? 'Refunds a quarter' : `${cost} gold${suffix}`;
  const locked = Boolean(BUILDINGS[item]) && !isUnlocked(world, item);
  return { item, name: buildingName(item), cost, costText, affordable: canAfford(world, cost), locked, lockText: locked ? unlockText(item) : '' };
}

export function activeItemOf(tool) {
  if (!tool) return null;
  if (tool.kind === 'building') return tool.type;
  if (tool.kind === 'houses') return 'house';
  return tool.kind;   // 'road' or 'demolish'
}

export function renderCards(container, { world, category, activeItem = null, onPick, grid = false }) {
  clear(container);
  container.classList.toggle('grid', grid);
  const cat = CATEGORIES.find((c) => c.id === category);
  const items = cat ? cat.items : [];
  if (!items.length) { container.append(el('p', { class: 'empty', text: T.comingLater })); return []; }
  const buttons = items.map((item) => {
    const info = cardInfo(world, item);
    const cls = ['card', info.affordable ? '' : 'unaffordable', info.locked ? 'locked' : ''].filter(Boolean).join(' ');
    const costLine = info.locked ? `\u{1F512} ${info.lockText}` : (info.affordable ? info.costText : `⊘ ${info.costText}`);
    const b = el('button', { type: 'button', class: cls, 'aria-pressed': String(activeItem === item), 'aria-disabled': info.locked ? 'true' : null }, [
      el('span', { class: 'name', text: info.name }), el('span', { class: 'cost', text: costLine }),
    ]);
    if (!info.locked) b.addEventListener('click', () => onPick(item));
    return b;
  });
  container.append(...buttons);
  return buttons;
}
```

- [ ] **Step 4: Write the dock**

`src/ui/dock.js`:
```js
// The portrait build dock (spec 6.3): slim bar of categories, a tray of cards, or tucked to a "Build" pill.
// Tapping a category opens its tray; tapping it again closes it; the handle toggles; swipes move one step.
import { CATEGORIES, CATEGORY_ICONS } from '../data/ui.js';
import { pickCategory, setDock } from './modes.js';
import { renderCards, activeItemOf } from './cards.js';
import { CATEGORY_NAMES, T } from './text.js';
import { el, button, icon } from './components.js';

const SWIPE_PX = 30;

export function createDock({ container, store, world, onPick }) {
  const handle = el('button', { type: 'button', class: 'handle', 'aria-label': T.build });
  const cats = el('div', { class: 'cats' });
  const tray = el('div', { class: 'tray cards' });
  const pill = button(T.build, { class: 'pill primary' });
  const catButtons = CATEGORIES.map((c) => {
    const b = el('button', { type: 'button', class: 'cat', 'aria-pressed': 'false' }, [icon(CATEGORY_ICONS[c.id]), el('span', { text: CATEGORY_NAMES[c.id] })]);
    b.addEventListener('click', () => {
      const s = store.get();
      if (s.dock === 'tray' && s.category === c.id) store.set(setDock(s, 'slim'));
      else store.set(pickCategory(s, c.id));
    });
    return b;
  });
  cats.append(...catButtons);
  handle.addEventListener('click', () => { const s = store.get(); store.set(setDock(s, s.dock === 'tray' ? 'slim' : 'tray')); });
  let swipeStart = null;
  handle.addEventListener('pointerdown', (ev) => { swipeStart = ev.clientY; });
  handle.addEventListener('pointerup', (ev) => {
    if (swipeStart === null) return;
    const dy = ev.clientY - swipeStart;
    swipeStart = null;
    const s = store.get();
    if (dy <= -SWIPE_PX) store.set(setDock(s, 'tray'));
    else if (dy >= SWIPE_PX) store.set(setDock(s, s.dock === 'tray' ? 'slim' : 'tucked'));
  });
  pill.addEventListener('click', () => store.set(setDock(store.get(), 'slim')));
  container.append(handle, cats, tray, pill);

  let lastCards = null;
  function render() {
    const s = store.get();
    container.dataset.height = s.dock;
    document.body.dataset.dock = s.dock;
    catButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(s.dock === 'tray' && s.category === CATEGORIES[i].id)));
    const key = `${s.category}|${activeItemOf(s.tool)}|${world.gold}|${world.milestone}`;
    if (s.dock === 'tray' && key !== lastCards) {
      renderCards(tray, { world, category: s.category, activeItem: activeItemOf(s.tool), onPick });
      lastCards = key;
    }
  }
  render();
  store.subscribe(render);
  return { render };
}
```

- [ ] **Step 5: Write the confirm bar and its styles**

`src/ui/confirmBar.js`:
```js
// The confirm bar for placing, drawing and demolishing (spec 6.4-6.5): name, cost, the reason when blocked,
// rotate (nothing rotates yet), Flip for roads, Undo, x and the tick. It never tucks away.
import { isToolMode } from './modes.js';
import { buildingName, T } from './text.js';
import { el, button, iconButton, clear } from './components.js';

const titleOf = (tool) => (tool.kind === 'building' ? buildingName(tool.type) : tool.kind === 'road' ? buildingName('road') : tool.kind === 'houses' ? T.housingPlots : T.demolish);

export function createConfirmBar({ container, store, placement, onCancel, onConfirm, onUndo }) {
  const element = el('div', { id: 'confirm', hidden: true });
  container.append(element);

  function render() {
    const s = store.get();
    clear(element);
    if (!isToolMode(s.mode) || !s.tool) { element.hidden = true; return; }
    element.hidden = false;
    const p = placement.preview();
    const demolish = s.tool.kind === 'demolish';
    const costText = demolish ? (p.refund ? `${T.refund} ${p.refund}` : '') : (p.cost ? `${p.cost} gold` : '');
    const info = el('div', { class: 'info' }, [
      el('div', { class: 'title', text: titleOf(s.tool) }),
      el('div', { class: 'cost small muted', text: costText }),
      el('div', { class: `reason small ${p.state === 'bad' ? 'coral' : p.state === 'warn' ? 'amber' : 'muted'}`, text: p.text }),
    ]);
    const controls = [iconButton(T.rotate, '⟳', { class: 'rotate', disabled: true })];
    if (s.tool.kind === 'road' && s.line && s.line.x1 !== null) controls.push(button(T.flip, { class: 'flip', onClick: () => placement.flip() }));
    controls.push(button(T.undo, { class: 'undo', disabled: !placement.canUndo(), onClick: onUndo }));
    controls.push(iconButton(T.cancel, '✕', { class: 'cancel', onClick: onCancel }));
    controls.push(iconButton(T.confirm, '✓', { class: `ok ${demolish ? 'danger' : 'primary'}`, disabled: p.state === 'bad' || p.state === 'idle', onClick: onConfirm }));
    element.append(el('div', { class: `confirm${demolish ? ' demolish' : ''}` }, [info, ...controls]));
  }
  render();
  store.subscribe(render);
  return { render, element };
}
```

Add to `src/ui/text.js`'s `T`: `rotate: 'Rotate', housingPlots: 'Housing plots',`.

Append to `css/ui.css`:
```css
/* The confirm bar replaces the dock while a tool is active and never tucks (spec 6.4). */
#confirm { position: fixed; z-index: 3; }
body[data-layout="portrait"] #confirm { left: 0; right: 0; bottom: 0; }
body[data-layout="wide"] #confirm { right: 0; bottom: 0; width: var(--panel-w); }
body[data-layout="compact"] #confirm { right: calc(var(--rail-w) + var(--safe-right)); bottom: 0; width: var(--drawer-w); }
body[data-mode="placing"] #dock, body[data-mode="drawing"] #dock, body[data-mode="demolishing"] #dock { display: none; }
body[data-mode="placing"] #corners, body[data-mode="drawing"] #corners, body[data-mode="demolishing"] #corners { bottom: calc(var(--safe-bottom) + 104px); }
.speed-corner { position: relative; }
.speed-options { position: absolute; bottom: calc(100% + 6px); left: 0; display: flex; gap: 6px; }
```

- [ ] **Step 6: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui cards`, `ui dock`, `ui confirm bar` PASS, then `ALL PASSED`.

- [ ] **Step 7: Commit**

```powershell
git add src/ui/cards.js src/ui/dock.js src/ui/confirmBar.js src/ui/text.js css/ui.css tests/ui/cards.test.js tests/ui/dock.test.js tests/ui/confirmBar.test.js tests/all.js
git commit -m "Add building cards, the portrait dock and the confirm bar`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Side panel (wide), rail (compact) and corner buttons

**Files:**
- Create: `src/ui/sidePanel.js`, `src/ui/rail.js`, `src/ui/corners.js`
- Modify: `src/ui/text.js` (`T.fold`, `T.unfold`)
- Test: `tests/ui/panels.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `CATEGORIES`, `CATEGORY_ICONS`; `renderCards`, `activeItemOf` (Task 12); `setDock`, `isToolMode` (modes.js); `CATEGORY_NAMES`, `T`; the speed control (Task 11); the placement (Task 9).
- Produces (`sidePanel.js`): `createSidePanel({ container, store, world, onPick, minimapNode = null, detailsNode = null }) → { render(), details }`: the wide layout's right-hand panel (spec 6.2): a fold button (toggles `store.panelFolded` and the `panel-folded` class on `body`), a minimap slot, category tabs (`aria-pressed` for the current category), the card grid, and a details area (`details`) that createUI fills with the confirm bar or the hovered card's text.
- Produces (`rail.js`): `createRail({ container, store, world, onPick, onConfirm, onCancel, placement = null }) → { render() }`: the compact layout's rail (spec 6.2): category icon buttons that open the drawer of cards (`store.dock === 'tray'` means open; tapping the open category closes it), and ✕ / ✓ at the bottom, shown only in tool modes with ✓ disabled while the preview is bad or idle.
- Produces (`corners.js`): `createCorners({ container, store, speedControl, onMinimap, onOverlay, alertCount = () => 0 }) → { render() }`: bottom-left the speed corner button (mounted by the speed control), bottom-right the minimap button with an alert-count badge and the overlay button (`aria-pressed` while an overlay is on).

- [ ] **Step 1: Write the failing tests**

`tests/ui/panels.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createSidePanel } from '../../src/ui/sidePanel.js';
import { createRail } from '../../src/ui/rail.js';
import { createCorners } from '../../src/ui/corners.js';
import { createSpeedControl } from '../../src/ui/speed.js';
import { createPlacement } from '../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { startTool } from '../../src/ui/modes.js';
import { makeTestWorld, setRoad } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';

describe('ui panels', () => {
  it('side panel: tabs pick the category, the grid shows cards, the fold button folds', () => {
    const { root, cleanup } = mount();
    const store = createStore({ ...INITIAL_UI_STATE, layout: 'wide' });
    const picked = [];
    const panel = createSidePanel({ container: root, store, world: makeTestWorld(), onPick: (i) => picked.push(i) });
    const tabs = root.querySelectorAll('.tab');
    expect(tabs.length).toBe(7);
    fire(tabs[4], 'click');
    expect(store.get().category).toBe('services');
    expect(tabs[4].getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelectorAll('.cards .card').length).toBe(3);
    fire(root.querySelectorAll('.cards .card')[2], 'click');
    expect(picked).toEqual(['temple']);
    fire(root.querySelector('.fold'), 'click');
    expect(store.get().panelFolded).toBe(true);
    expect(document.body.classList.contains('panel-folded')).toBe(true);
    fire(root.querySelector('.fold'), 'click');
    expect(document.body.classList.contains('panel-folded')).toBe(false);
    expect(panel.details.classList.contains('details')).toBe(true);
    cleanup();
  });
  it('rail: category icons open and close the drawer; tick and cross appear in tool modes', () => {
    const { root, cleanup } = mount();
    const world = makeTestWorld({ gold: 1000 });
    setRoad(world, 0, 10, 31, 10);
    const store = createStore({ ...INITIAL_UI_STATE, layout: 'compact' });
    const placement = createPlacement({ world, store });
    const log = [];
    createRail({ container: root, store, world, onPick: (i) => log.push(i), onConfirm: () => log.push('ok'), onCancel: () => log.push('cancel'), placement });
    const cats = root.querySelectorAll('.cat');
    expect(cats.length).toBe(7);
    expect(root.querySelector('.drawer').hidden).toBe(true);
    fire(cats[1], 'click');
    expect(root.querySelector('.drawer').hidden).toBe(false);
    expect(root.querySelectorAll('.drawer .card').length).toBe(1);
    fire(cats[1], 'click');
    expect(root.querySelector('.drawer').hidden).toBe(true);
    expect(root.querySelector('.bottom').hidden).toBe(true);
    placement.start({ kind: 'building', type: 'well' }, { x: 5, y: 20 });
    expect(root.querySelector('.bottom').hidden).toBe(false);
    expect(root.querySelector('.ok').disabled).toBe(true);
    placement.moveGhost(5, 9);
    expect(root.querySelector('.ok').disabled).toBe(false);
    fire(root.querySelector('.ok'), 'click');
    fire(root.querySelector('.cancel'), 'click');
    expect(log).toEqual(['ok', 'cancel']);
    cleanup();
  });
  it('corners: speed on the left, minimap with a badge and overlay on the right', () => {
    const { root, cleanup } = mount();
    const store = createStore(INITIAL_UI_STATE);
    const world = makeTestWorld();
    let alerts = 0;
    const log = [];
    const corners = createCorners({ container: root, store, speedControl: createSpeedControl({ world, store }), onMinimap: () => log.push('minimap'), onOverlay: () => log.push('overlay'), alertCount: () => alerts });
    expect(root.querySelector('.left .speed-main')).toBeTruthy();
    expect(root.querySelector('.badge').hidden).toBe(true);
    alerts = 3;
    corners.render();
    expect(root.querySelector('.badge').hidden).toBe(false);
    expect(root.querySelector('.badge').textContent).toBe('3');
    fire(root.querySelector('.minimap-button'), 'click');
    fire(root.querySelector('.overlay-button'), 'click');
    expect(log).toEqual(['minimap', 'overlay']);
    store.set({ overlay: 'water' });
    expect(root.querySelector('.overlay-button').getAttribute('aria-pressed')).toBe('true');
    cleanup();
  });
});
```

Append to `tests/all.js`:
```js
import './ui/panels.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui panels"`
Expected: `LOAD ERROR` naming `tests/all.js`.

- [ ] **Step 3: Write the side panel and the rail**

`src/ui/sidePanel.js`:
```js
// The wide layout's right-hand panel (spec 6.2): minimap, category tabs, the card grid and a details area.
import { CATEGORIES } from '../data/ui.js';
import { renderCards, activeItemOf } from './cards.js';
import { CATEGORY_NAMES, T } from './text.js';
import { el, button, iconButton } from './components.js';

export function createSidePanel({ container, store, world, onPick, minimapNode = null, detailsNode = null }) {
  const fold = iconButton(T.fold, '‹', { class: 'fold' });
  const foldbar = el('div', { class: 'foldbar' }, [fold]);
  const minimap = el('div', { class: 'minimap' });
  if (minimapNode) minimap.append(minimapNode);
  const tabButtons = CATEGORIES.map((c) => button(CATEGORY_NAMES[c.id], { class: 'tab', 'aria-pressed': 'false', onClick: () => store.set({ category: c.id }) }));
  const tabs = el('div', { class: 'tabs' }, tabButtons);
  const cards = el('div', { class: 'cards grid' });
  const details = el('div', { class: 'details' });
  if (detailsNode) details.append(detailsNode);
  fold.addEventListener('click', () => store.set({ panelFolded: !store.get().panelFolded }));
  container.append(foldbar, minimap, tabs, cards, details);

  let lastCards = null;
  function render() {
    const s = store.get();
    document.body.classList.toggle('panel-folded', s.panelFolded);
    fold.setAttribute('aria-label', s.panelFolded ? T.unfold : T.fold);
    fold.querySelector('.icon').textContent = s.panelFolded ? '›' : '‹';
    tabButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(s.category === CATEGORIES[i].id)));
    const key = `${s.category}|${activeItemOf(s.tool)}|${world.gold}|${world.milestone}`;
    if (key !== lastCards) {
      renderCards(cards, { world, category: s.category, activeItem: activeItemOf(s.tool), onPick, grid: true });
      lastCards = key;
    }
  }
  render();
  store.subscribe(render);
  return { render, details };
}
```

`src/ui/rail.js`:
```js
// The compact landscape rail (spec 6.2): category icons open a drawer of cards; x and tick live at the bottom.
import { CATEGORIES, CATEGORY_ICONS } from '../data/ui.js';
import { setDock, isToolMode } from './modes.js';
import { renderCards, activeItemOf } from './cards.js';
import { CATEGORY_NAMES, T } from './text.js';
import { el, iconButton } from './components.js';

export function createRail({ container, store, world, onPick, onConfirm, onCancel, placement = null }) {
  const catButtons = CATEGORIES.map((c) => iconButton(CATEGORY_NAMES[c.id], CATEGORY_ICONS[c.id], {
    class: 'cat', 'aria-pressed': 'false',
    onClick: () => {
      const s = store.get();
      if (s.dock === 'tray' && s.category === c.id) store.set(setDock(s, 'slim'));
      else store.set({ category: c.id, dock: 'tray' });
    },
  }));
  const drawer = el('div', { class: 'drawer cards', hidden: true });
  const cancel = iconButton(T.cancel, '✕', { class: 'cancel', onClick: onCancel });
  const ok = iconButton(T.confirm, '✓', { class: 'ok primary', onClick: onConfirm });
  const bottom = el('div', { class: 'bottom', hidden: true }, [cancel, ok]);
  container.append(...catButtons, bottom, drawer);

  let lastCards = null;
  function render() {
    const s = store.get();
    const open = s.dock === 'tray';
    drawer.hidden = !open;
    catButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(open && s.category === CATEGORIES[i].id)));
    const tool = isToolMode(s.mode);
    bottom.hidden = !tool;
    if (tool && placement) { const p = placement.preview(); ok.disabled = !p || p.state === 'bad' || p.state === 'idle'; }
    const key = `${s.category}|${activeItemOf(s.tool)}|${world.gold}|${world.milestone}`;
    if (open && key !== lastCards) {
      renderCards(drawer, { world, category: s.category, activeItem: activeItemOf(s.tool), onPick, grid: true });
      lastCards = key;
    }
  }
  render();
  store.subscribe(render);
  return { render };
}
```

- [ ] **Step 4: Write the corner buttons**

`src/ui/corners.js`:
```js
// Corner buttons (spec 6.3): pause and speed bottom-left; minimap with the alert badge and the overlay
// toggle bottom-right. They show at every dock height and never sit in the middle of the map.
import { el, iconButton } from './components.js';
import { T } from './text.js';

export function createCorners({ container, store, speedControl, onMinimap, onOverlay, alertCount = () => 0 }) {
  const left = el('div', { class: 'group left' });
  speedControl.mountCorner(left);
  const minimap = iconButton(T.minimap, '▣', { class: 'minimap-button has-badge', onClick: onMinimap });
  const badge = el('span', { class: 'badge', hidden: true });
  minimap.append(badge);
  const overlay = iconButton(T.overlay, '◑', { class: 'overlay-button', 'aria-pressed': 'false', onClick: onOverlay });
  const right = el('div', { class: 'group right' }, [minimap, overlay]);
  container.append(left, right);

  function render() {
    const n = alertCount();
    badge.hidden = n === 0;
    badge.textContent = String(n);
    minimap.setAttribute('aria-label', n ? `${T.minimap}, ${n} ${T.alerts.toLowerCase()}` : T.minimap);
    overlay.setAttribute('aria-pressed', String(Boolean(store.get().overlay)));
    speedControl.render();
  }
  render();
  store.subscribe(render);
  return { render };
}
```

Add to `src/ui/text.js`'s `T`: `fold: 'Fold the panel', unfold: 'Unfold the panel',`.

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui panels` PASS, then `ALL PASSED`.

- [ ] **Step 6: Commit**

```powershell
git add src/ui/sidePanel.js src/ui/rail.js src/ui/corners.js src/ui/text.js tests/ui/panels.test.js tests/all.js
git commit -m "Add the wide side panel, the compact rail and the corner buttons`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Info sheets, the city summary and the minimap

**Files:**
- Create: `src/ui/sheets.js`, `src/ui/minimap.js`
- Modify: `src/ui/text.js` (sheet labels)
- Test: `tests/ui/sheets.test.js`, `tests/ui/minimap.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `houseStatus` (housing.js); `setPaused` (commands.js); `assignLabour`; `BUILDINGS`; `TIERS`; `summaryData` (Task 11); `closeSheet` (modes.js); `alertsFor` + `alertText` (Task 5, Task 3); the placement (`demolishOne`), the camera control, the minimap; `screenToTile`, `visibleTileRange`; `T` (terrain codes) and `TERRAIN` colours; `el`, `button`, `iconButton`, `clear`, `setText`.
- Produces (`minimap.js`): `createMinimap({ world, cam, view, size = 160, dpr = 1 }) → { canvas, render(alerts = []), tileFromPoint(px, py) }`. A plain top-down square: terrain colours per tile (baked once per world; terrain is static), roads, building dots (ink for homes, teal for services), the current view as a quadrilateral outline, alert pins in coral. `tileFromPoint` maps a CSS-px point on the canvas to a tile (spec 6.3: tapping the map jumps there).
- Produces (`sheets.js`): `createSheets({ container, store, world, placement, cameraControl, minimap, getAlerts, onView, afterCommand, custom = {} }) → { render() }`. Renders `store.sheet` into `container` (hidden when null):
  - `info`: the building sheet (name; workers "n of m" or "No workers needed"; stock per good; reach in road tiles; problems from `getAlerts()` for this id, each with its cause, fix and a **View** button calling `onView(alert)`, or "No problems"; actions Pause/Resume and Demolish) or the house sheet (tier name and residents of capacity; the next-tier checklist with ✓/✕ per need; "Grows at the end of the month" when every next need is met; "Loses <need> in N months" from `downgradeIn`; an empty plot says it is waiting for people; action Demolish). A missing id closes the sheet.
  - `summary`: income against spending (taxes, wages, upkeep, net), food in store and months of food, employment (working of workforce, jobless), the mood breakdown, and the goals placeholder (1d).
  - `minimap`: the minimap canvas (tap → `cameraControl.panTo`), +/− zoom buttons (`cameraControl.zoomStep` at the view centre), and the alert list with View buttons.
  - any other kind: `custom[kind](body, { close })` (the menu, settings, help and about come from Task 16).
  Every sheet has a ✕ in its head that calls `closeSheet`. Pause and Demolish go through the sim commands and `assignLabour`, then `afterCommand`.

- [ ] **Step 1: Write the failing tests**

`tests/ui/minimap.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createMinimap } from '../../src/ui/minimap.js';
import { createCamera } from '../../src/render/camera.js';
import { riverWorld } from '../helpers/renderWorld.js';
import { pixelAt } from '../helpers/canvas.js';

describe('ui minimap', () => {
  it('draws terrain, buildings, the view outline and alert pins on a square map', () => {
    const w = riverWorld();
    const cam = createCamera({ x: 16, y: 16, zoom: 1 });
    const mm = createMinimap({ world: w, cam, view: () => ({ width: 400, height: 300 }), size: 128, dpr: 1 });
    expect(mm.canvas.width).toBe(128);
    mm.render([{ code: 'no_road', id: Object.values(w.buildings).find((b) => b.type === 'well').id }]);
    const scale = 128 / 32;
    const water = pixelAt(mm.canvas, 4 * scale + 2, 8 * scale + 2);
    expect(water[2]).toBeGreaterThan(water[0]);
    const meadow = pixelAt(mm.canvas, 15 * scale + 2, 21 * scale + 2);
    expect(meadow[1]).toBeGreaterThan(meadow[0]);
    const road = pixelAt(mm.canvas, 25 * scale + 2, 12 * scale + 2);
    expect(road[0]).toBeGreaterThan(180);
    expect(mm.tileFromPoint(4 * scale + 1, 8 * scale + 1)).toEqual({ x: 4, y: 8 });
    expect(mm.tileFromPoint(-5, 999)).toEqual({ x: 0, y: 31 });
  });
});
```

`tests/ui/sheets.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createSheets } from '../../src/ui/sheets.js';
import { createMinimap } from '../../src/ui/minimap.js';
import { createPlacement } from '../../src/ui/placement.js';
import { createCameraControl } from '../../src/ui/cameraControl.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { select, openSheet } from '../../src/ui/modes.js';
import { alertsFor } from '../../src/sim/alerts.js';
import { createCamera } from '../../src/render/camera.js';
import { T, alertText } from '../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';

function rig() {
  const { root, cleanup } = mount();
  const world = makeTestWorld({ gold: 1000 });
  setRoad(world, 0, 10, 31, 10);
  const farm = addRaw(world, 'farm_grain', 2, 11, { blocked: 'no_storage' });   // as produceDay would mark it with no granary in reach
  const house = addRaw(world, 'house', 12, 11, { tier: 2, residents: 8 });
  addRaw(world, 'well', 13, 9);
  staffAll(world);
  const store = createStore(INITIAL_UI_STATE);
  const cam = createCamera({ x: 16, y: 16, zoom: 1 });
  const view = () => ({ width: 400, height: 300 });
  const cameraControl = createCameraControl({ cam, view, reducedMotion: () => true });
  const log = [];
  const sheets = createSheets({
    container: root, store, world, placement: createPlacement({ world, store }), cameraControl,
    minimap: createMinimap({ world, cam, view, size: 100 }), getAlerts: () => alertsFor(world),
    onView: (a) => log.push(['view', a.code]), afterCommand: (e) => log.push(e.kind),
    custom: { menu: (body) => { body.textContent = 'menu here'; } },
  });
  return { root, world, farm, house, store, cam, sheets, log, cleanup };
}

describe('ui sheets', () => {
  it('shows a building with workers, reach, problems and View, and can pause or demolish it', () => {
    const r = rig();
    r.store.set(select(r.store.get(), r.farm.id));
    expect(r.root.hidden).toBe(false);
    expect(r.root.querySelector('h2').textContent).toBe('Grain farm');
    expect(r.root.textContent).toContain('10 of 10');
    expect(r.root.textContent).toContain('12 road tiles');
    const problem = alertText({ code: 'no_storage', id: r.farm.id }, r.world);
    expect(r.root.textContent).toContain(problem.title);
    fire(r.root.querySelector('.problem .view'), 'click');
    expect(r.log[0]).toEqual(['view', 'no_storage']);
    fire(r.root.querySelector('.pause'), 'click');
    expect(r.farm.paused).toBe(true);
    expect(r.root.querySelector('.pause').textContent).toBe(T.resume);
    fire(r.root.querySelector('.demolish'), 'click');
    expect(r.world.buildings[r.farm.id]).toBe(undefined);
    expect(r.store.get().sheet).toBe(null);
    expect(r.log.map((e) => (Array.isArray(e) ? e[0] : e))).toEqual(['view', 'pause', 'demolish']);
    r.cleanup();
  });
  it('shows a home with its checklist, timers and residents', () => {
    const r = rig();
    r.store.set(select(r.store.get(), r.house.id));
    expect(r.root.querySelector('h2').textContent).toBe('Shack');
    expect(r.root.textContent).toContain('8 of 8');
    const items = [...r.root.querySelectorAll('.checklist li')].map((li) => li.textContent);
    expect(items.some((t) => t.includes('Road access') && t.includes('✓'))).toBe(true);
    expect(items.some((t) => t.includes('Food') && t.includes('✕'))).toBe(true);
    r.house.downTimer = 1;
    r.house.residents = 0; r.house.tier = 0;
    r.sheets.render();
    expect(r.root.textContent).toContain(T.emptyPlot);
    r.cleanup();
  });
  it('shows the summary, the minimap with zoom buttons and alerts, and custom sheets', () => {
    const r = rig();
    r.store.set(openSheet(r.store.get(), 'summary'));
    expect(r.root.textContent).toContain(T.taxes);
    expect(r.root.textContent).toContain(T.goalsLater);
    r.store.set(openSheet(r.store.get(), 'minimap'));
    expect(r.root.querySelector('canvas')).toBeTruthy();
    fire(r.root.querySelector('.zoom-in'), 'click');
    expect(r.cam.zoom).toBeGreaterThan(1);
    expect(r.root.querySelectorAll('.alert-list .view').length).toBeGreaterThan(0);
    fire(r.root.querySelector('canvas'), 'click', { clientX: r.root.querySelector('canvas').getBoundingClientRect().left + 50, clientY: r.root.querySelector('canvas').getBoundingClientRect().top + 50 });
    expect(Math.abs(r.cam.x - 16.5) < 2 && Math.abs(r.cam.y - 16.5) < 2).toBe(true);
    r.store.set(openSheet(r.store.get(), 'menu'));
    expect(r.root.textContent).toContain('menu here');
    fire(r.root.querySelector('.close'), 'click');
    expect(r.store.get().sheet).toBe(null);
    expect(r.root.hidden).toBe(true);
    r.cleanup();
  });
});
```

Append to `tests/all.js`:
```js
import './ui/minimap.test.js';
import './ui/sheets.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui sheets"`
Expected: `LOAD ERROR` naming `tests/all.js`.

- [ ] **Step 3: Write the minimap**

`src/ui/minimap.js`:
```js
// The minimap (spec 6.3): the whole map top-down, the current view outlined, alert pins. Tapping it jumps.
import { T as TER } from '../sim/terrain.js';
import { TERRAIN, UI } from '../render/art/palette.js';
import { allBuildings } from '../sim/world.js';
import { screenToTile } from '../render/camera.js';

const COLOURS = { [TER.DESERT]: TERRAIN.sand, [TER.FERTILE]: TERRAIN.fertile, [TER.ROCKY]: TERRAIN.rocky, [TER.WATER]: TERRAIN.water, [TER.BANK]: TERRAIN.bank, [TER.MEADOW]: TERRAIN.grass };

export function createMinimap({ world, cam, view, size = 160, dpr = 1 }) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  canvas.className = 'minimap-canvas';
  const ctx = canvas.getContext('2d');
  const scale = (size * dpr) / world.size;

  // Terrain never changes in Stage 1, so it is baked once.
  const ground = document.createElement('canvas');
  ground.width = canvas.width; ground.height = canvas.height;
  const gctx = ground.getContext('2d');
  for (let y = 0; y < world.size; y++) {
    for (let x = 0; x < world.size; x++) {
      gctx.fillStyle = COLOURS[world.terrain[y * world.size + x]] || TERRAIN.sand;
      gctx.fillRect(x * scale, y * scale, Math.ceil(scale), Math.ceil(scale));
    }
  }

  function render(alerts = []) {
    ctx.drawImage(ground, 0, 0);
    ctx.fillStyle = TERRAIN.road;
    for (let i = 0; i < world.road.length; i++) if (world.road[i]) ctx.fillRect((i % world.size) * scale, Math.floor(i / world.size) * scale, Math.ceil(scale), Math.ceil(scale));
    for (const b of allBuildings(world)) {
      ctx.fillStyle = b.type === 'house' ? (b.tier > 0 ? TERRAIN.roadPebble : TERRAIN.plot) : UI.housing;
      ctx.fillRect(b.x * scale, b.y * scale, Math.max(1, b.w * scale), Math.max(1, b.d * scale));
    }
    const v = view();
    const corners = [[0, 0], [v.width, 0], [v.width, v.height], [0, v.height]].map(([sx, sy]) => screenToTile(cam, v, sx, sy));
    ctx.strokeStyle = UI.halo;
    ctx.lineWidth = Math.max(1, dpr * 1.5);
    ctx.beginPath();
    corners.forEach((t, i) => { const px = t.x * scale, py = t.y * scale; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = TERRAIN.grid;
    ctx.lineWidth = Math.max(1, dpr * 0.5);
    ctx.stroke();
    for (const a of alerts) {
      const b = a.id ? world.buildings[a.id] : null;
      if (!b) continue;
      ctx.fillStyle = UI.bad;
      ctx.beginPath();
      ctx.arc((b.x + b.w / 2) * scale, (b.y + b.d / 2) * scale, Math.max(2, dpr * 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function tileFromPoint(px, py) {
    const clamp = (v) => Math.max(0, Math.min(world.size - 1, Math.floor(v)));
    return { x: clamp((px * dpr) / scale), y: clamp((py * dpr) / scale) };
  }

  render();
  return { canvas, render, tileFromPoint };
}
```

- [ ] **Step 4: Write the sheets (part 1: frame, building and house sheets)**

`src/ui/sheets.js`:
```js
// Info sheets, the city summary and the minimap sheet (spec 6.3). One sheet at a time, every one with an x.
import { BUILDINGS } from '../data/buildings.js';
import { TIERS } from '../data/housing.js';
import { houseStatus } from '../sim/housing.js';
import { setPaused } from '../sim/commands.js';
import { assignLabour } from '../sim/labour.js';
import { closeSheet } from './modes.js';
import { summaryData } from './hud.js';
import { ZOOM_STEP } from '../data/ui.js';
import { buildingName, tierName, NEED_NAMES, alertText, plural, T } from './text.js';
import { el, button, iconButton, clear } from './components.js';

const row = (label, value) => el('div', { class: 'row' }, [el('span', { class: 'muted', text: label }), el('span', { text: value })]);

export function createSheets({ container, store, world, placement, cameraControl, minimap, getAlerts = () => [], onView = () => {}, afterCommand = () => {}, custom = {} }) {
  const close = () => store.set(closeSheet(store.get()));

  function head(title) {
    return el('div', { class: 'head' }, [el('h2', { text: title }), iconButton(T.close, '✕', { class: 'close', onClick: close })]);
  }

  function problems(id) {
    const list = getAlerts().filter((a) => a.id === id);
    if (!list.length) return el('p', { class: 'muted', text: T.noProblems });
    return el('ul', { class: 'problems' }, list.map((a) => {
      const t = alertText(a, world);
      return el('li', { class: 'problem' }, [el('strong', { text: t.title }), ' ', el('span', { class: 'muted', text: t.fix }), ' ', button(T.view, { class: 'view quiet', onClick: () => onView(a) })]);
    }));
  }

  function buildingSheet(b) {
    const def = BUILDINGS[b.type];
    const body = el('div', { class: 'body' });
    body.append(row(T.workers, def.workers ? `${b.staff} of ${def.workers}` : T.noWorkersNeeded));
    for (const [good, n] of Object.entries(b.store)) body.append(row(`${T.stock}: ${good}`, String(n)));
    const reach = def.reach || def.supplyReach || def.producerReach;
    if (reach) body.append(row(T.reach, `${reach} road tiles`));
    body.append(el('h3', { text: T.problems }), problems(b.id));
    const actions = el('div', { class: 'actions' });
    if (def.workers || def.upkeep) {
      actions.append(button(b.paused ? T.resume : T.pause, { class: 'pause', onClick: () => {
        const r = setPaused(world, b.id, !b.paused);
        if (r.ok) { assignLabour(world); afterCommand({ kind: 'pause', result: r, text: b.paused ? T.paused : T.resume, undoable: false }); render(); }
      } }));
    }
    actions.append(button(T.demolish, { class: 'demolish danger', onClick: () => { const r = placement.demolishOne(b.x, b.y); if (r.ok) close(); } }));
    body.append(actions);
    return [head(buildingName(b.type)), body];
  }

  function houseSheet(h) {
    const s = houseStatus(world, h);
    const body = el('div', { class: 'body' });
    if (s.tier === 0) body.append(el('p', { class: 'muted', text: T.emptyPlot }));
    body.append(row(T.residents, `${s.residents} of ${s.capacity}`));
    if (s.next) {
      body.append(el('h3', { text: `${T.nextTier} (${s.next.name})` }));
      body.append(el('ul', { class: 'checklist' }, s.checklist.map((c) => el('li', {}, [
        el('span', { class: c.met ? 'tick' : 'cross', 'aria-hidden': 'true', text: c.met ? '✓ ' : '✕ ' }),
        el('span', { class: 'sr-only', text: c.met ? 'Has ' : 'Missing ' }), NEED_NAMES[c.need],
      ]))));
      if (s.tier >= 1 && s.checklist.every((c) => c.met)) body.append(el('p', { class: 'teal', text: T.upgradesAtMonthEnd }));
    }
    if (s.downgradeIn !== null && s.missingNow.length) body.append(el('p', { class: 'coral', text: `Loses ${NEED_NAMES[s.missingNow[0]].toLowerCase()} in ${plural(s.downgradeIn, 'month', 'months')}` }));
    body.append(el('div', { class: 'actions' }, [button(T.demolish, { class: 'demolish danger', onClick: () => { const r = placement.demolishOne(h.x, h.y); if (r.ok) close(); } })]));
    return [head(tierName(s.tier)), body];
  }
```

- [ ] **Step 5: Write the sheets (part 2: summary, minimap sheet, render)**

Continue `src/ui/sheets.js` (still inside `createSheets`):
```js
  function summarySheet() {
    const d = summaryData(world);
    const body = el('div', { class: 'body' });
    body.append(el('h3', { text: T.incomeVsSpending }), row(T.taxes, `+${d.taxes}`), row(T.wages, `−${d.wages}`), row(T.upkeep, `−${d.upkeep}`), row(T.net, (d.net >= 0 ? '+' : '') + d.net));
    body.append(el('h3', { text: T.foodInStore }), row('Grain', `${d.foodStored}`), row('Lasts', d.monthsOfFood === null ? '–' : plural(d.monthsOfFood, 'month', 'months')));
    body.append(el('h3', { text: T.employment }), row('Working', `${d.working} of ${d.workforce}`), row(T.jobless, `${d.jobless}`), row('Jobs', `${d.jobs}`));
    body.append(el('h3', { text: T.moodBreakdown }), row(T.mood, `${d.mood}`));
    for (const [k, v] of Object.entries(d.moodBreakdown || {})) body.append(row(k, (v >= 0 ? '+' : '') + v));
    body.append(el('h3', { text: T.goals }), el('p', { class: 'muted', text: T.goalsLater }));
    return [head(T.summary), body];
  }

  function minimapSheet() {
    const body = el('div', { class: 'body' });
    const canvas = minimap.canvas;
    canvas.onclick = (ev) => { const r = canvas.getBoundingClientRect(); const t = minimap.tileFromPoint(ev.clientX - r.left, ev.clientY - r.top); cameraControl.panTo(t.x + 0.5, t.y + 0.5); };
    const zoomIn = iconButton(T.zoomIn, '+', { class: 'zoom-in', onClick: () => cameraControl.zoomStep(ZOOM_STEP, cameraControl.centre().x, cameraControl.centre().y) });
    const zoomOut = iconButton(T.zoomOut, '−', { class: 'zoom-out', onClick: () => cameraControl.zoomStep(1 / ZOOM_STEP, cameraControl.centre().x, cameraControl.centre().y) });
    body.append(el('div', { class: 'minimap-wrap' }, [canvas]), el('div', { class: 'actions' }, [zoomIn, zoomOut]));
    const list = getAlerts();
    body.append(el('h3', { text: T.alerts }));
    if (!list.length) body.append(el('p', { class: 'muted', text: T.noAlerts }));
    else body.append(el('ul', { class: 'alert-list' }, list.map((a) => { const t = alertText(a, world); return el('li', {}, [el('strong', { text: t.title }), ' ', el('span', { class: 'muted', text: t.fix }), ' ', button(T.view, { class: 'view quiet', onClick: () => onView(a) })]); })));
    minimap.render(list);
    return [head(T.minimap), body];
  }

  function render() {
    const s = store.get();
    clear(container);
    if (!s.sheet) { container.hidden = true; return; }
    let parts;
    if (s.sheet.kind === 'info') {
      const b = world.buildings[s.sheet.id];
      if (!b) { store.set(closeSheet(s)); container.hidden = true; return; }
      parts = b.type === 'house' ? houseSheet(b) : buildingSheet(b);
    } else if (s.sheet.kind === 'summary') parts = summarySheet();
    else if (s.sheet.kind === 'minimap') parts = minimapSheet();
    else if (custom[s.sheet.kind]) { const body = el('div', { class: 'body' }); custom[s.sheet.kind](body, { close }); parts = [head(T[s.sheet.kind] || s.sheet.kind), body]; }
    else { container.hidden = true; return; }
    container.hidden = false;
    container.append(...parts);
  }

  render();
  store.subscribe(render);
  return { render };
}
```

Add to `src/ui/cameraControl.js` (inside the returned object): `centre() { const v = view(); return { x: v.width / 2, y: v.height / 2 }; },`.

Add to `src/ui/text.js`'s `T`: `noWorkersNeeded: 'No workers needed', menu: 'Menu', settings: 'Settings', help: 'How to play', about: 'About',` (`menu`, `settings` and `about` already exist; `help` is new, and the custom-sheet head uses `T[kind]`).

- [ ] **Step 6: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui minimap` and `ui sheets` PASS, then `ALL PASSED`. In the sheets test the farm reports `no_storage` because no granary is in reach, and the tier-2 shack's checklist lists road ✓, water ✓ (the well at (13, 9) reaches the road beside it) and food ✕.

- [ ] **Step 7: Commit**

```powershell
git add src/ui/sheets.js src/ui/minimap.js src/ui/cameraControl.js src/ui/text.js tests/ui/sheets.test.js tests/ui/minimap.test.js tests/all.js
git commit -m "Add info sheets, the city summary and the minimap`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Alerts, the overlay legend and toasts

**Files:**
- Create: `src/ui/alerts.js`, `src/ui/overlayUi.js`, `src/ui/toasts.js`
- Modify: `src/ui/text.js` (a few labels), `css/ui.css` (toast action, legend colour)
- Test: `tests/ui/alerts.test.js`, `tests/ui/overlayUi.test.js`, `tests/ui/toasts.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `alertsFor` (Task 5), `alertText`, `plural`, `OVERLAY_NAMES`, `OVERLAY_LEGEND`, `T` (Task 3), `summaryData` (Task 11), `dateText`; `toggleOverlay`, `cycleOverlay` (Task 2); `OVERLAYS`, `OVERLAY_HUE` (render/overlays.js); `TOAST_MS` (data/ui.js); `el`, `button`, `iconButton`, `clear`, `setText`.
- Produces (`alerts.js`): `CRITICAL` (a `Set` of alert codes shown as a banner; `debt` for now, raids and fire join in Stage 3); `triage(world, alerts = alertsFor(world)) → { all, critical, ordinary }` which drops alerts whose `id` names a building that no longer exists (1a follow-up: alerts are a month-old snapshot) and splits the rest; `mapSummaryText(world, alerts) → string` (the canvas's text summary, spec 6.8: gold, people, mood, date, then the alert titles); `createAlerts({ world, banner, live, onView, root = document.body, getAlerts = () => alertsFor(world) }) → { refresh(), count(), list(), critical() }`. `refresh()` re-triages, renders one `.critical` row per critical alert in `banner` (title, fix, a **View** button calling `onView(alert)`), toggles `root.classList` `has-banner`, and writes an announcement into `live` only when the set of alerts changed (so screen readers hear each change once, spec 6.3/6.8). `count()` is the number of ordinary alerts (the badge, spec 6.3); `list()` is every alert (the minimap sheet's list); `critical()` the banner ones.
- Produces (`overlayUi.js`): `createOverlayLegend({ container, store }) → { render(), cycle() }`: when `store.overlay` is set, a `.strip` with the overlay name, a filled `.dot` + the has-it label, a hollow `.ring` + the missing label (spec 6.3: dot versus ring, never colour alone) and a ✕ (`.close`) that turns the overlay off; nothing when no overlay. `cycle()` applies `cycleOverlay(state, OVERLAYS)` (null → water → food → religion → housing → null; the O key and the corner button).
- Produces (`toasts.js`): `createToasts({ container, setTimer = setTimeout, clearTimer = clearTimeout }) → { show(text, { action, onAction, ms = TOAST_MS } = {}) → element, clear() }`. A `.toast` with the text and, when `action` is given, a button labelled `action` that calls `onAction()` and removes the toast. At most two toasts are visible; a third removes the oldest. Timers are injectable so tests control time.

- [ ] **Step 1: Write the failing tests**

`tests/ui/alerts.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { CRITICAL, triage, mapSummaryText, createAlerts } from '../../src/ui/alerts.js';
import { alertsFor } from '../../src/sim/alerts.js';
import { alertText, T } from '../../src/ui/text.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../helpers/testWorld.js';
import { mount, fire } from '../helpers/dom.js';

function rig() {
  const { root, cleanup } = mount('<div id="banner"></div><p id="live"></p>');
  const world = makeTestWorld({ gold: 1000 });
  setRoad(world, 0, 10, 31, 10);
  const farm = addRaw(world, 'farm_grain', 2, 11, { blocked: 'no_storage' });
  staffAll(world);
  return { root, world, farm, banner: root.querySelector('#banner'), live: root.querySelector('#live'), cleanup };
}

describe('ui alerts', () => {
  it('drops alerts for buildings that are gone and splits critical from ordinary', () => {
    const { world, farm, cleanup } = rig();
    world.gold = -1;
    const stale = [...alertsFor(world), { code: 'no_road', id: 999 }];
    const t = triage(world, stale);
    expect(t.all.map((a) => a.code)).toEqual(['no_storage', 'debt']);
    expect(t.critical.map((a) => a.code)).toEqual(['debt']);
    expect(t.ordinary.map((a) => a.code)).toEqual(['no_storage']);
    expect(t.ordinary[0].id).toBe(farm.id);
    expect(CRITICAL.has('debt')).toBe(true);
    expect(mapSummaryText(world, t.all)).toContain(alertText(t.all[0], world).title);
    expect(mapSummaryText(world, [])).toContain(T.noAlerts);
    cleanup();
  });
  it('renders the banner for critical alerts, counts the rest, and announces each change once', () => {
    const r = rig();
    let alerts = [{ code: 'no_storage', id: r.farm.id }];
    const seen = [];
    const a = createAlerts({ world: r.world, banner: r.banner, live: r.live, root: r.root, onView: (x) => seen.push(x.code), getAlerts: () => alerts });
    a.refresh();
    expect(a.count()).toBe(1);
    expect(a.critical().length).toBe(0);
    expect(r.root.classList.contains('has-banner')).toBe(false);
    expect(r.live.textContent).toContain(alertText(alerts[0], r.world).title);
    r.live.textContent = 'unchanged';
    a.refresh();
    expect(r.live.textContent).toBe('unchanged');           // same alerts: nothing new to announce
    alerts = [...alerts, { code: 'debt' }];
    a.refresh();
    expect(r.root.classList.contains('has-banner')).toBe(true);
    const row = r.banner.querySelector('.critical');
    expect(row.textContent).toContain(alertText({ code: 'debt' }, r.world).title);
    expect(a.count()).toBe(1);
    expect(a.list().length).toBe(2);
    expect(r.live.textContent).toContain('2 alerts');
    fire(row.querySelector('.view'), 'click');
    expect(seen).toEqual(['debt']);
    alerts = [];
    a.refresh();
    expect(r.root.classList.contains('has-banner')).toBe(false);
    expect(r.banner.children.length).toBe(0);
    expect(r.live.textContent).toBe(T.noAlerts);
    r.cleanup();
  });
});
```

`tests/ui/overlayUi.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createOverlayLegend } from '../../src/ui/overlayUi.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { OVERLAY_NAMES, OVERLAY_LEGEND } from '../../src/ui/text.js';
import { mount, fire } from '../helpers/dom.js';

describe('ui overlay legend', () => {
  it('shows name, dot, ring and a close button for the current overlay, and cycles through all four', () => {
    const { root, cleanup } = mount();
    const store = createStore(INITIAL_UI_STATE);
    const legend = createOverlayLegend({ container: root, store });
    expect(root.querySelector('.strip')).toBe(null);
    store.set({ overlay: 'water' });
    const strip = root.querySelector('.strip');
    expect(strip.textContent).toContain(OVERLAY_NAMES.water);
    expect(strip.textContent).toContain(OVERLAY_LEGEND.water[0]);
    expect(strip.textContent).toContain(OVERLAY_LEGEND.water[1]);
    expect(strip.querySelector('.dot')).toBeTruthy();
    expect(strip.querySelector('.ring')).toBeTruthy();
    fire(strip.querySelector('.close'), 'click');
    expect(store.get().overlay).toBe(null);
    expect(root.querySelector('.strip')).toBe(null);
    const seen = [];
    for (let i = 0; i < 5; i++) { legend.cycle(); seen.push(store.get().overlay); }
    expect(seen).toEqual(['water', 'food', 'religion', 'housing', null]);
    cleanup();
  });
});
```

`tests/ui/toasts.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createToasts } from '../../src/ui/toasts.js';
import { TOAST_MS } from '../../src/data/ui.js';
import { mount, fire } from '../helpers/dom.js';

function fakeTimers() {
  const timers = [];
  return {
    timers,
    setTimer: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimer: (id) => { timers[id - 1] = null; },
    fire: (id) => { const t = timers[id - 1]; if (t) { timers[id - 1] = null; t.fn(); } },
  };
}

describe('ui toasts', () => {
  it('shows a toast that times out, an action that runs and dismisses, and keeps at most two', () => {
    const { root, cleanup } = mount();
    const ft = fakeTimers();
    const toasts = createToasts({ container: root, setTimer: ft.setTimer, clearTimer: ft.clearTimer });
    toasts.show('Placed');
    expect(root.querySelectorAll('.toast').length).toBe(1);
    expect(ft.timers[0].ms).toBe(TOAST_MS);
    ft.fire(1);
    expect(root.querySelectorAll('.toast').length).toBe(0);
    let undone = 0;
    const t = toasts.show('Road laid', { action: 'Undo', onAction: () => undone++, ms: 6000 });
    expect(t.querySelector('button').textContent).toBe('Undo');
    expect(ft.timers[1].ms).toBe(6000);
    fire(t.querySelector('button'), 'click');
    expect(undone).toBe(1);
    expect(root.querySelectorAll('.toast').length).toBe(0);
    expect(ft.timers[1]).toBe(null);                 // the timer was cleared with the toast
    toasts.show('one'); toasts.show('two'); toasts.show('three');
    const texts = [...root.querySelectorAll('.toast')].map((n) => n.textContent);
    expect(texts).toEqual(['two', 'three']);
    toasts.clear();
    expect(root.querySelectorAll('.toast').length).toBe(0);
    cleanup();
  });
});
```

Append to `tests/all.js`:
```js
import './ui/alerts.test.js';
import './ui/overlayUi.test.js';
import './ui/toasts.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui alerts"`
Expected: `LOAD ERROR` naming `tests/all.js`.

- [ ] **Step 3: Write the alert triage, banner and announcer**

`src/ui/alerts.js`:
```js
// Alert triage (spec 6.3): critical alerts become a banner under the top bar; the rest feed the badge and
// the minimap sheet's list. Every change is announced once through the aria-live region (spec 6.8).
import { alertsFor } from '../sim/alerts.js';
import { summaryData } from './hud.js';
import { alertText, dateText, plural, T } from './text.js';
import { el, button, clear, setText } from './components.js';

// The sim has no severity field, so the UI decides (1a follow-up). Raids and fire join this set in Stage 3.
export const CRITICAL = new Set(['debt']);

const keyOf = (a) => `${a.code}:${a.id === undefined ? '' : a.id}:${a.level || ''}`;

export function triage(world, alerts = alertsFor(world)) {
  const all = alerts.filter((a) => a.id === undefined || a.id === null || Boolean(world.buildings[a.id]));
  return { all, critical: all.filter((a) => CRITICAL.has(a.code)), ordinary: all.filter((a) => !CRITICAL.has(a.code)) };
}

export function mapSummaryText(world, alerts) {
  const d = summaryData(world);
  const head = `${T.gold} ${d.gold}. ${plural(d.people, 'person', 'people')}. ${T.mood} ${d.mood}. ${dateText(d.date)}.`;
  if (!alerts.length) return `${head} ${T.noAlerts}.`;
  return `${head} ${plural(alerts.length, 'alert', 'alerts')}: ${alerts.map((a) => alertText(a, world).title).join('. ')}.`;
}

export function createAlerts({ world, banner, live, onView = () => {}, root = document.body, getAlerts = () => alertsFor(world) }) {
  let current = { all: [], critical: [], ordinary: [] };
  let lastKeys = null;

  function announce() {
    const keys = current.all.map(keyOf).sort().join('|');
    if (keys === lastKeys) return;
    lastKeys = keys;
    if (!current.all.length) { setText(live, T.noAlerts); return; }
    setText(live, `${plural(current.all.length, 'alert', 'alerts')}: ${current.all.map((a) => alertText(a, world).title).join('. ')}`);
  }

  function renderBanner() {
    clear(banner);
    for (const a of current.critical) {
      const t = alertText(a, world);
      banner.append(el('div', { class: 'critical', role: 'alert' }, [
        el('span', { class: 'icon', 'aria-hidden': 'true', text: '⚠' }),
        el('span', { class: 'text' }, [el('strong', { text: t.title }), ' ', el('span', { class: 'small', text: t.fix })]),
        button(T.view, { class: 'view', onClick: () => onView(a) }),
      ]));
    }
    root.classList.toggle('has-banner', current.critical.length > 0);
  }

  return {
    refresh() { current = triage(world, getAlerts()); renderBanner(); announce(); },
    count: () => current.ordinary.length,
    list: () => current.all,
    critical: () => current.critical,
  };
}
```

- [ ] **Step 4: Write the legend strip and the toasts**

`src/ui/overlayUi.js`:
```js
// The overlay legend strip under the top bar (spec 6.3): name, filled dot = has it, hollow ring = missing,
// and a x that turns the overlay off. Overlays combine with browsing, so the strip never changes the mode.
import { OVERLAYS, OVERLAY_HUE } from '../render/overlays.js';
import { toggleOverlay, cycleOverlay } from './modes.js';
import { OVERLAY_NAMES, OVERLAY_LEGEND, T } from './text.js';
import { el, iconButton, clear } from './components.js';

export function createOverlayLegend({ container, store }) {
  function render() {
    const kind = store.get().overlay;
    clear(container);
    if (!kind) return;
    const [has, missing] = OVERLAY_LEGEND[kind];
    const colour = { color: OVERLAY_HUE[kind] };
    container.append(el('div', { class: 'strip', role: 'group', 'aria-label': `${OVERLAY_NAMES[kind]} ${T.overlay.toLowerCase()}` }, [
      el('strong', { class: 'text', text: OVERLAY_NAMES[kind] }),
      el('span', { class: 'key' }, [el('span', { class: 'dot', style: colour, 'aria-hidden': 'true' }), ' ', el('span', { class: 'text small', text: has })]),
      el('span', { class: 'key' }, [el('span', { class: 'ring', style: colour, 'aria-hidden': 'true' }), ' ', el('span', { class: 'text small', text: missing })]),
      iconButton(T.overlayOff, '✕', { class: 'close quiet', onClick: () => store.set(toggleOverlay(store.get(), kind)) }),
    ]));
  }
  render();
  store.subscribe(render);
  return { render, cycle: () => store.set(cycleOverlay(store.get(), OVERLAYS)) };
}
```

`src/ui/toasts.js`:
```js
// Toasts (spec 6.5): a short line, optionally with one action such as Undo. Two at most; the oldest goes.
import { TOAST_MS } from '../data/ui.js';
import { el, button } from './components.js';

const MAX_TOASTS = 2;

export function createToasts({ container, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (id) => clearTimeout(id) }) {
  const live = [];      // { node, timer }

  function remove(entry) {
    const i = live.indexOf(entry);
    if (i < 0) return;
    live.splice(i, 1);
    if (entry.timer !== null) clearTimer(entry.timer);
    entry.node.remove();
  }

  return {
    show(text, { action = null, onAction = null, ms = TOAST_MS } = {}) {
      const entry = { node: null, timer: null };
      const parts = [el('span', { class: 'text', text })];
      if (action) parts.push(button(action, { class: 'action', onClick: () => { remove(entry); if (onAction) onAction(); } }));
      entry.node = el('div', { class: 'toast' }, parts);
      while (live.length >= MAX_TOASTS) remove(live[0]);
      live.push(entry);
      container.append(entry.node);
      entry.timer = setTimer(() => remove(entry), ms);
      return entry.node;
    },
    clear() { while (live.length) remove(live[0]); },
  };
}
```

Add to `src/ui/text.js`'s `T`: `overlayOff: 'Turn the overlay off',`.

Append to `css/ui.css`:
```css
/* Legend keys and the banner's warning glyph. */
#legend .key { display: inline-flex; align-items: center; gap: 4px; }
#banner .critical .text { flex: 1; min-width: 0; }
#banner .critical .icon { color: var(--coral-text); }
.toast .text { flex: 1; }
```

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui alerts`, `ui overlay legend`, `ui toasts` PASS, then `ALL PASSED`. In the alerts test, `triage` keeps `no_storage` because the farm exists and drops the `no_road` for id 999; `debt` appears once `world.gold` is negative.

- [ ] **Step 6: Commit**

```powershell
git add src/ui/alerts.js src/ui/overlayUi.js src/ui/toasts.js src/ui/text.js css/ui.css tests/ui/alerts.test.js tests/ui/overlayUi.test.js tests/ui/toasts.test.js tests/all.js
git commit -m "Add alert triage with the banner and announcer, the overlay legend and toasts`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: The ☰ menu, settings, help, about and the confirm dialog

**Files:**
- Create: `src/ui/menu.js`
- Modify: `src/ui/text.js` (help rows, about text, switch labels), `src/data/ui.js` (`APP_VERSION`), `css/ui.css` (switches, choices, menu list)
- Test: `tests/ui/menu.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `KEYS`, `APP_VERSION` (data/ui.js); `openSheet` (Task 2); the settings (Task 4); the toasts (Task 15); `T`, `HELP_ROWS` (text.js); `el`, `button`, `clear`, `setText`.
- Produces (`menu.js`):
  - `keyLabel(name) → string`: how a `KEYS` entry is shown (`' '` → `Space`, `Escape` → `Esc`, arrows as glyphs, letters upper-case once, joined with " or ").
  - `createMenuSheets({ store, settings, toasts, hooks = {}, onNewCity, version = APP_VERSION }) → { menu, settings, help, about }`: four renderers with the `custom[kind](body, { close })` signature `sheets.js` (Task 14) expects. **menu** (spec 6.3): Continue (`close()`), New city (opens the confirm dialog, whose confirm calls `onNewCity()`), Export city and Import city (call `hooks.exportCity()` / `hooks.importCity()` when present, else `toasts.show(T.notYet)`; 1d fills the hooks), Settings, How to play and About (each `openSheet`). **settings**: `role="switch"` buttons for sound, vibration, keyboard shortcuts and left-handed controls (`aria-checked` plus an On/Off word), three-way choices for text size (100, 125, 150) and reduced motion (follow the system, on, off), every change through `settings.set`. **help**: the shortcut table from `HELP_ROWS` and `KEYS`, how to leave a mode (✕, Back, Esc, right-click), the touch gestures, and a note that goals arrive in the next update. **about**: name, version, "a personal hobby project", original art. The word "Pharaoh" appears nowhere.
  - `createDialog({ container, store }) → { render() }`: renders `store.confirmDialog` (`{ text, confirmLabel, onConfirm }`) into `container` as a `.box` with the text, a Cancel button (`.cancel`, focused when the dialog opens) and the confirm button (`.ok`), hidden when null. Cancel clears the dialog; confirm clears it then calls `onConfirm()`. Esc closes it through `modes.back` (Task 2) and the keyboard's `back` action.

- [ ] **Step 1: Write the failing test**

`tests/ui/menu.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { createMenuSheets, createDialog, keyLabel } from '../../src/ui/menu.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { createSettings, DEFAULT_SETTINGS } from '../../src/ui/settings.js';
import { KEYS } from '../../src/data/ui.js';
import { T, HELP_ROWS } from '../../src/ui/text.js';
import { mount, fire } from '../helpers/dom.js';

function rig(hooks = {}) {
  const { root, cleanup } = mount('<div id="body"></div><div id="dialog" hidden></div>');
  const store = createStore(INITIAL_UI_STATE);
  const settings = createSettings({ storage: { getItem: () => null, setItem: () => {} }, root, systemReducedMotion: () => false });
  const shown = [];
  const log = [];
  const menus = createMenuSheets({ store, settings, toasts: { show: (t) => shown.push(t) }, hooks, onNewCity: () => log.push('new'), version: '0.1-test' });
  const dialog = createDialog({ container: root.querySelector('#dialog'), store });
  return { root, body: root.querySelector('#body'), dialogNode: root.querySelector('#dialog'), store, settings, menus, dialog, shown, log, close: () => log.push('close'), cleanup };
}
const buttonNamed = (node, text) => [...node.querySelectorAll('button')].find((b) => b.textContent.trim() === text);

describe('ui menu', () => {
  it('menu: continue closes, new city asks first, export and import fall back to a toast, others open sheets', () => {
    const r = rig();
    r.menus.menu(r.body, { close: r.close });
    fire(buttonNamed(r.body, T.continueGame), 'click');
    expect(r.log).toEqual(['close']);
    fire(buttonNamed(r.body, T.newCity), 'click');
    expect(r.store.get().confirmDialog.text).toBe(T.newCityConfirm);
    expect(r.dialogNode.hidden).toBe(false);
    expect(r.dialogNode.querySelector('.box').textContent).toContain(T.newCityConfirm);
    fire(r.dialogNode.querySelector('.cancel'), 'click');
    expect(r.store.get().confirmDialog).toBe(null);
    expect(r.dialogNode.hidden).toBe(true);
    fire(buttonNamed(r.body, T.newCity), 'click');
    fire(r.dialogNode.querySelector('.ok'), 'click');
    expect(r.log).toEqual(['close', 'new']);
    expect(r.store.get().confirmDialog).toBe(null);
    fire(buttonNamed(r.body, T.exportCity), 'click');
    expect(r.shown).toEqual([T.notYet]);
    fire(buttonNamed(r.body, T.settings), 'click');
    expect(r.store.get().sheet).toEqual({ kind: 'settings', id: null });
    fire(buttonNamed(r.body, T.howToPlay), 'click');
    expect(r.store.get().sheet.kind).toBe('help');
    fire(buttonNamed(r.body, T.about), 'click');
    expect(r.store.get().sheet.kind).toBe('about');
    r.cleanup();
    const hooked = rig({ exportCity: () => hooked.log.push('export'), importCity: () => hooked.log.push('import') });
    hooked.menus.menu(hooked.body, { close: hooked.close });
    fire(buttonNamed(hooked.body, T.exportCity), 'click');
    fire(buttonNamed(hooked.body, T.importCity), 'click');
    expect(hooked.log).toEqual(['export', 'import']);
    expect(hooked.shown).toEqual([]);
    hooked.cleanup();
  });
  it('settings: switches and choices write through the settings store', () => {
    const r = rig();
    r.menus.settings(r.body, { close: r.close });
    expect(r.settings.get()).toEqual(DEFAULT_SETTINGS);
    const sound = r.body.querySelector('.switch.sound');
    expect(sound.getAttribute('role')).toBe('switch');
    expect(sound.getAttribute('aria-checked')).toBe('false');
    expect(sound.textContent).toContain(T.off);
    fire(sound, 'click');
    expect(r.settings.get().sound).toBe(true);
    expect(sound.getAttribute('aria-checked')).toBe('true');
    expect(sound.textContent).toContain(T.on);
    fire(r.body.querySelector('.choice.textSize[data-value="150"]'), 'click');
    expect(r.settings.get().textSize).toBe(150);
    expect(r.root.dataset.textSize).toBe('150');
    expect(r.body.querySelector('.choice.textSize[data-value="150"]').getAttribute('aria-pressed')).toBe('true');
    expect(r.body.querySelector('.choice.textSize[data-value="100"]').getAttribute('aria-pressed')).toBe('false');
    fire(r.body.querySelector('.choice.reducedMotion[data-value="on"]'), 'click');
    expect(r.settings.reducedMotion()).toBe(true);
    fire(r.body.querySelector('.switch.leftHanded'), 'click');
    expect(r.root.dataset.hand).toBe('left');
    fire(r.body.querySelector('.switch.keyboardShortcuts'), 'click');
    expect(r.settings.get().keyboardShortcuts).toBe(false);
    r.cleanup();
  });
  it('help lists every shortcut with its keys and the ways out of a mode; about names the version', async () => {
    const r = rig();
    r.menus.help(r.body, { close: r.close });
    const rows = [...r.body.querySelectorAll('.shortcuts tbody tr')];
    expect(rows.length).toBe(HELP_ROWS.length);
    for (const [name, text, keys] of HELP_ROWS) {
      const row = rows.find((tr) => tr.textContent.includes(text));
      expect(row.textContent).toContain(keys || keyLabel(name));
    }
    expect(keyLabel('pause')).toBe('Space');
    expect(keyLabel('back')).toBe('Esc');
    expect(keyLabel('speedUp')).toBe('+ or =');
    expect(keyLabel('minimap')).toBe('M');
    expect(r.body.textContent).toContain('right-click');
    expect(r.body.textContent).toContain(T.goalsLater);
    r.menus.about(r.body, { close: r.close });
    expect(r.body.textContent).toContain('0.1-test');
    const src = await (await fetch('/src/ui/menu.js')).text();
    expect(/pharaoh/i.test(src)).toBe(false);
    expect(KEYS.help).toContain('?');
    r.cleanup();
  });
});
```

Append to `tests/all.js`:
```js
import './ui/menu.test.js';
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui menu"`
Expected: `LOAD ERROR` naming `tests/all.js`.

- [ ] **Step 3: Add the copy and the version**

Add to `src/data/ui.js`:
```js
export const APP_VERSION = '0.1';
```

Add to `src/ui/text.js` (after `T`):
```js
// The help sheet's shortcut table: [KEYS name, what it does, optional display override].
export const HELP_ROWS = [
  ['pause', 'Pause or resume'], ['speedUp', 'Faster'], ['speedDown', 'Slower'],
  ['category', 'Pick a build category', '1 to 7'], ['panLeft', 'Move the view', 'Arrows or WASD'],
  ['rotate', 'Rotate, once something can rotate'], ['minimap', 'Open the minimap'], ['overlay', 'Cycle the overlays'],
  ['confirm', 'Confirm'], ['back', 'Back one step'], ['undo', 'Undo', 'Ctrl+Z or Cmd+Z'], ['help', 'Show this list'],
];
```

Add to `src/ui/text.js`'s `T`:
```js
  on: 'On', off: 'Off', version: 'Version', keyHead: 'Key', doesHead: 'Does', gestures: 'Touch',
  leaveMode: 'To leave any mode: ✕, Back, Esc or right-click.',
  shortcutsOff: 'Single-key shortcuts can be turned off in settings. Esc, Enter and Ctrl+Z always work.',
  gesturesHelp: 'One finger pans. Two fingers pan or zoom. Tap to select, or to move the ghost. Double-tap zooms in. Tap a start and an end to draw a road or paint plots.',
  aboutText: 'A city builder for phone and desktop browsers, inspired by the classic Egyptian city builders. A personal hobby project with original, code-drawn art.',
  undoOccupiedConfirm: 'Undo this? People who moved in will leave.', undone: 'Undone',
  hoverHint: 'Hover a building or pick a card',
```

- [ ] **Step 4: Write the menu sheets and the dialog**

`src/ui/menu.js`:
```js
// The menu, settings, help and about sheets (spec 6.3) as custom renderers for sheets.js, plus the
// confirm dialog that store.confirmDialog drives (New city, undoing an occupied area).
import { KEYS, APP_VERSION } from '../data/ui.js';
import { openSheet } from './modes.js';
import { HELP_ROWS, T } from './text.js';
import { el, button, clear } from './components.js';

const KEY_NAMES = { ' ': 'Space', Escape: 'Esc', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };

export function keyLabel(name) {
  const seen = [];
  for (const k of KEYS[name] || []) {
    const label = KEY_NAMES[k] || (k.length === 1 ? k.toUpperCase() : k);
    if (!seen.includes(label)) seen.push(label);
  }
  return seen.join(' or ');
}

export function createMenuSheets({ store, settings, toasts, hooks = {}, onNewCity = () => {}, version = APP_VERSION }) {
  const open = (kind) => store.set(openSheet(store.get(), kind));
  const hookOr = (name) => () => { if (typeof hooks[name] === 'function') hooks[name](); else toasts.show(T.notYet); };

  function menu(body, { close }) {
    body.append(el('div', { class: 'menu-list' }, [
      button(T.continueGame, { class: 'primary', onClick: close }),
      button(T.newCity, { onClick: () => store.set({ confirmDialog: { text: T.newCityConfirm, confirmLabel: T.newCity, onConfirm: onNewCity } }) }),
      button(T.exportCity, { onClick: hookOr('exportCity') }),
      button(T.importCity, { onClick: hookOr('importCity') }),
      button(T.settings, { onClick: () => open('settings') }),
      button(T.howToPlay, { onClick: () => open('help') }),
      button(T.about, { onClick: () => open('about') }),
    ]));
  }

  function switchRow(label, key) {
    const state = el('span', { class: 'state small muted' });
    const b = el('button', { type: 'button', role: 'switch', class: `switch ${key}` }, [el('span', { text: label }), ' ', state]);
    const sync = () => { const on = Boolean(settings.get()[key]); b.setAttribute('aria-checked', String(on)); state.textContent = on ? T.on : T.off; };
    b.addEventListener('click', () => { settings.set({ [key]: !settings.get()[key] }); sync(); });
    sync();
    return el('div', { class: 'row' }, [b]);
  }

  function choiceRow(label, key, options) {
    const buttons = options.map(([value, text]) => button(text, { class: `choice ${key}`, dataset: { value: String(value) } }));
    const sync = () => buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(settings.get()[key] === options[i][0])));
    buttons.forEach((b, i) => b.addEventListener('click', () => { settings.set({ [key]: options[i][0] }); sync(); }));
    sync();
    return el('div', { class: 'row' }, [el('span', { text: label }), el('span', { class: 'choices', role: 'group', 'aria-label': label }, buttons)]);
  }

  function settingsSheet(body) {
    body.append(
      switchRow(T.sound, 'sound'), switchRow(T.vibration, 'vibration'),
      switchRow(T.keyboardShortcuts, 'keyboardShortcuts'), switchRow(T.leftHanded, 'leftHanded'),
      choiceRow(T.textSize, 'textSize', [[100, '100%'], [125, '125%'], [150, '150%']]),
      choiceRow(T.reducedMotion, 'reducedMotion', [['system', T.followSystem], ['on', T.on], ['off', T.off]]),
    );
  }
```

Continue `src/ui/menu.js` (still inside `createMenuSheets`, then the dialog):
```js
  function help(body) {
    body.append(el('p', { text: T.leaveMode }));
    body.append(el('h3', { text: T.shortcuts }));
    body.append(el('table', { class: 'shortcuts' }, [
      el('thead', {}, [el('tr', {}, [el('th', { text: T.keyHead }), el('th', { text: T.doesHead })])]),
      el('tbody', {}, HELP_ROWS.map(([name, text, keys]) => el('tr', {}, [el('td', {}, [el('kbd', { text: keys || keyLabel(name) })]), el('td', { text })]))),
    ]));
    body.append(el('p', { class: 'small muted', text: T.shortcutsOff }));
    body.append(el('h3', { text: T.gestures }), el('p', { text: T.gesturesHelp }));
    body.append(el('h3', { text: T.goals }), el('p', { class: 'muted', text: T.goalsLater }));
  }

  function about(body) {
    body.append(el('h3', { text: 'Thebes' }), el('p', { text: `${T.version} ${version}` }), el('p', { text: T.aboutText }));
  }

  return { menu, settings: settingsSheet, help, about };
}

// The confirm dialog: store.confirmDialog = { text, confirmLabel, onConfirm } shows it; null hides it.
// Cancel gets focus so a stray Enter never confirms; Esc reaches it through modes.back.
export function createDialog({ container, store }) {
  function render() {
    const d = store.get().confirmDialog;
    clear(container);
    if (!d) { container.hidden = true; return; }
    const cancel = button(T.cancel, { class: 'cancel', onClick: () => store.set({ confirmDialog: null }) });
    const ok = button(d.confirmLabel || T.confirm, { class: 'ok danger', onClick: () => { store.set({ confirmDialog: null }); d.onConfirm(); } });
    container.append(el('div', { class: 'box', role: 'document' }, [el('p', { text: d.text }), el('div', { class: 'buttons' }, [cancel, ok])]));
    container.hidden = false;
    cancel.focus();
  }
  render();
  store.subscribe(render);
  return { render };
}
```

Append to `css/ui.css`:
```css
/* Menu, settings and help sheets. */
.menu-list { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; }
.menu-list button { text-align: left; }
.switch { width: 100%; text-align: left; display: flex; justify-content: space-between; align-items: center; }
.switch[aria-checked="true"] { background: var(--teal-soft); border-color: var(--teal); }
.choices { display: flex; gap: 4px; flex-wrap: wrap; }
.choice { min-height: 36px; padding: 0 10px; font-size: calc(14px * var(--ui-scale)); }
.choice[aria-pressed="true"] { background: var(--teal); color: var(--teal-ink); box-shadow: none; }
.shortcuts { border-collapse: collapse; width: 100%; }
.shortcuts td, .shortcuts th { text-align: left; padding: 4px 8px 4px 0; border-bottom: 1px solid var(--parchment-2); vertical-align: top; }
kbd { font: inherit; background: var(--parchment-2); border-radius: 6px; padding: 0 6px; white-space: nowrap; }
```

- [ ] **Step 5: Run the tests**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui menu` PASS, then `ALL PASSED`. The sheets test from Task 14 still passes: its `custom.menu` stub is unaffected.

- [ ] **Step 6: Commit**

```powershell
git add src/ui/menu.js src/ui/text.js src/data/ui.js css/ui.css tests/ui/menu.test.js tests/all.js
git commit -m "Add the menu, settings, help and about sheets and the confirm dialog`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: `createUI` wiring, the real `main.js`, and integration tests

**Files:**
- Create: `src/ui/createUI.js`, `tests/helpers/uiWorld.js`, `tests/ui/createUI.test.js`
- Modify: `src/main.js` (replace the Task 1 boot), `src/ui/text.js` (`milestoneText`), `tests/screenshot.ps1` (probe `/index.html`, default URL `/`), `tests/all.js`
- Delete: `dev.html`, `src/dev/devControls.js` (`index.html?seed=N&stress=1`, `&sample=1`, `&speed=0` cover them)

**Interfaces:**
- Consumes: everything Tasks 1–16 produce, plus `MILESTONES`, `BUILDINGS`, `screenToTile`, `tileToScreen`, `visibleTileRange`, `walkersAt`, `drawOverlay`, `drawReachHighlight`, `drawGhost`, `createEffects`, `createGameLoop`, `setSpeed`, `buildSampleCity`, `buildStressCity`.
- Produces (`createUI.js`): `createUI({ world, canvas, cam, renderer, root = document.body, doc = document, win = window, getSize = null, subscribeResize = undefined, history = win.history, addListener, removeListener, keyTarget = win, storage = undefined, hooks = {}, now = () => performance.now() }) → ui` with `ui.store`, `ui.settings`, `ui.placement`, `ui.cameraControl`, `ui.alerts`, `ui.toasts`, `ui.effects`, `ui.speedControl`, `ui.actions` (the map actions, for tests), `ui.render({ timeDays, now })` (the loop's render callback: ticks the camera tween, draws the frame with overlay, reach highlight, ghosts and the grid, refreshes the top bar, redraws a visible minimap, and once per game day refreshes alerts, the badge, the cards and the canvas summary), `ui.afterCommand(e)`, `ui.refresh()`, `ui.destroy()`. `hooks` = `{ newCity, exportCity, importCity }` (1d fills the last two; `newCity` reloads with a fresh seed in `main.js`). Every option with a window or document default exists so tests can inject a size source, a history, a key target and a storage.
- Produces (`tests/helpers/uiWorld.js`): `uiWorld()` (a 32×32 world with a road along y = 10, two huts north of it and a well, farm, granary, bazaar and temple south of it), `fakeHistory()` (as in the back-stack test), `mountShell(width, height)` (loads `css/ui.css` once, fetches `index.html`, mounts its body without scripts into an off-screen, transformed container so fixed chrome stays inside it) and `rigUI({ width, height })` (mounts the shell, builds the world, camera and renderer, calls `createUI` with injected size, history, keyboard target and storage, and returns `tap(tx, ty, type)`, `resize(w, h)`, `frame(t)` helpers).
- Produces (`main.js`): the real boot; `window.__thebes = { world, cam, renderer, loop, ui }` for play-testing in the console.

- [ ] **Step 1: Write the test helpers and the failing integration tests**

`tests/helpers/uiWorld.js`:
```js
// A small city, a fake browser history, and a mounted copy of the real page shell for interface tests.
import { makeTestWorld, setRoad, addRaw, staffAll } from './testWorld.js';
import { fire } from './dom.js';
import { createCamera, tileToScreen } from '../../src/render/camera.js';
import { createRenderer } from '../../src/render/renderer.js';
import { createUI } from '../../src/ui/createUI.js';

// Road along y = 10; huts north of it; services south of it. Fertile land is x < 8 (makeTestWorld's default).
export function uiWorld() {
  const world = makeTestWorld({ gold: 1000 });
  setRoad(world, 0, 10, 31, 10);
  addRaw(world, 'house', 12, 9, { tier: 1, residents: 4 });
  addRaw(world, 'house', 13, 9, { tier: 1, residents: 4 });
  addRaw(world, 'farm_grain', 2, 11);
  addRaw(world, 'granary', 6, 11);
  addRaw(world, 'bazaar', 9, 11);
  addRaw(world, 'well', 15, 11);
  addRaw(world, 'temple', 24, 11);
  staffAll(world);
  return world;
}

export function fakeHistory() {
  const entries = [{ state: null }];
  let index = 0;
  const listeners = [];
  return {
    entries, listeners,
    get length() { return entries.length; },
    get state() { return entries[index].state; },
    pushState(state) { entries.splice(index + 1); entries.push({ state }); index = entries.length - 1; },
    back() { if (index > 0) { index--; for (const fn of listeners) fn({ state: entries[index].state }); } },
    addListener(type, fn) { if (type === 'popstate') listeners.push(fn); },
    removeListener(type, fn) { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
  };
}

let cssLoaded = null;
const BODY_KEYS = ['layout', 'mode', 'input', 'dock', 'hand', 'textSize'];

// The real shell from index.html, inside an off-screen box. The transform makes the box the containing
// block for the shell's position: fixed chrome, so the top bar, dock and sheets lay out inside it.
export async function mountShell(width = 390, height = 844) {
  if (!cssLoaded) {
    cssLoaded = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = '/css/ui.css'; link.onload = resolve; link.onerror = reject;
      document.head.append(link);
    });
  }
  await cssLoaded;
  const html = await (await fetch('/index.html')).text();
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  for (const n of parsed.querySelectorAll('script, noscript')) n.remove();
  const root = document.createElement('div');
  root.className = 'test-mount shell';
  root.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:${height}px;transform:translateZ(0);overflow:hidden;`;
  root.innerHTML = parsed.body.innerHTML;
  document.body.append(root);
  return {
    root,
    cleanup() {
      root.remove();
      for (const k of BODY_KEYS) delete document.body.dataset[k];
      document.body.classList.remove('has-banner', 'panel-folded', 'reduce-motion');
    },
  };
}
```

Continue `tests/helpers/uiWorld.js`:
```js
// The whole interface on the mounted shell, with the window-facing parts injected: size, resize source,
// history, keyboard target and storage. `root` is document.body so the stylesheet's body[data-...] rules apply.
export async function rigUI({ width = 390, height = 844 } = {}) {
  const shell = await mountShell(width, height);
  const world = uiWorld();
  const canvas = shell.root.querySelector('#map');
  const cam = createCamera({ x: 12, y: 10, zoom: 1 });
  const renderer = createRenderer({ canvas, dpr: 1 });
  let size = { width, height };
  const resizeListeners = [];
  const history = fakeHistory();
  const ui = createUI({
    world, canvas, cam, renderer, root: document.body, getSize: () => size,
    subscribeResize: (fn) => { resizeListeners.push(fn); return () => resizeListeners.splice(resizeListeners.indexOf(fn), 1); },
    history, addListener: history.addListener, removeListener: history.removeListener,
    keyTarget: shell.root, storage: { getItem: () => null, setItem: () => {} }, now: () => 0,
  });
  const at = (x, y) => { const r = canvas.getBoundingClientRect(); return { clientX: r.left + x, clientY: r.top + y }; };
  const screenOf = (tx, ty) => { const [sx, sy] = tileToScreen(cam, size, tx, ty); return { x: sx, y: sy }; };
  // A tap on the centre of tile (tx, ty). Two touch taps on the same spot within 300 ms are a double tap
  // (zoom), so tests that tap one place twice pass type 'mouse'.
  const tap = (tx, ty, type = 'touch') => {
    const p = screenOf(tx + 0.5, ty + 0.5);
    fire(canvas, 'pointerdown', { ...at(p.x, p.y), pointerId: 9, pointerType: type, button: 0, buttons: 1 });
    fire(canvas, 'pointerup', { ...at(p.x, p.y), pointerId: 9, pointerType: type, button: 0, buttons: 0 });
  };
  const resize = (w, h) => { size = { width: w, height: h }; shell.root.style.width = `${w}px`; shell.root.style.height = `${h}px`; for (const fn of resizeListeners) fn(); };
  const frame = (t = 0) => ui.render({ timeDays: world.day, now: t });
  return {
    root: shell.root, world, canvas, cam, ui, store: ui.store, history, at, screenOf, tap, resize, frame,
    cleanup() { ui.destroy(); shell.cleanup(); },
  };
}
```

`tests/ui/createUI.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { rigUI } from '../helpers/uiWorld.js';
import { fire, key } from '../helpers/dom.js';
import { buildingAt } from '../../src/sim/world.js';
import { tickDay } from '../../src/sim/clock.js';

describe('ui createUI', () => {
  it('places a well from the dock: card, ghost, tap, tick, building, then Undo from the toast', async () => {
    const r = await rigUI();
    expect(r.store.get().layout).toBe('portrait');
    fire(r.root.querySelectorAll('#dock .cat')[4], 'click');                 // Services
    const cards = r.root.querySelectorAll('#dock .tray .card');
    expect(cards[0].querySelector('.name').textContent).toBe('Well');
    fire(cards[0], 'click');
    const s = r.store.get();
    expect(s.mode).toBe('placing');
    expect(s.overlay).toBe('water');                                          // spec 4.5: the service's overlay comes on
    expect(s.ghost).toBeTruthy();
    expect(document.body.dataset.mode).toBe('placing');
    expect(r.root.querySelector('#confirm').hidden).toBe(false);
    r.frame(0);                                                               // draws the ghost, the grid and the overlay
    r.tap(5, 9);                                                              // touch: moves the ghost, builds nothing
    expect(r.store.get().ghost).toEqual({ x: 5, y: 9 });
    expect(buildingAt(r.world, 5, 9)).toBe(null);
    fire(r.root.querySelector('#confirm .ok'), 'click');
    expect(buildingAt(r.world, 5, 9).type).toBe('well');
    expect(r.store.get().mode).toBe('placing');                               // placing repeats until the x
    const toast = r.root.querySelector('#toasts .toast');
    expect(toast.textContent).toContain('Well placed');
    fire(toast.querySelector('button'), 'click');                             // Undo
    expect(buildingAt(r.world, 5, 9)).toBe(null);
    expect(r.world.gold).toBe(1000);
    fire(r.root.querySelector('#confirm .cancel'), 'click');
    expect(r.store.get().mode).toBe('browse');
    expect(r.root.querySelector('#confirm').hidden).toBe(true);
    r.cleanup();
  });
  it('switches chrome with the viewport and keeps the camera and a placement through a rotation', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    const shown = (id) => getComputedStyle(r.root.querySelector(`#${id}`)).display !== 'none';
    expect([shown('dock'), shown('panel'), shown('rail')]).toEqual([true, false, false]);
    fire(r.root.querySelectorAll('#dock .cat')[4], 'click');
    fire(r.root.querySelectorAll('#dock .tray .card')[0], 'click');
    r.tap(5, 9);
    r.cam.x = 7;
    r.resize(844, 390);                                                       // phone held sideways
    expect(document.body.dataset.layout).toBe('compact');
    expect([shown('dock'), shown('panel'), shown('rail')]).toEqual([false, false, true]);
    expect(r.store.get().mode).toBe('placing');
    expect(r.store.get().ghost).toEqual({ x: 5, y: 9 });
    expect(r.cam.x).toBe(7);
    expect(r.root.querySelector('#rail .bottom').hidden).toBe(false);          // x and tick on the rail
    r.resize(1280, 800);                                                      // laptop
    expect(document.body.dataset.layout).toBe('wide');
    expect([shown('dock'), shown('panel'), shown('rail')]).toEqual([false, true, false]);
    expect(r.root.querySelectorAll('#topbar .speed button').length).toBe(4);
    expect(r.root.querySelectorAll('#panel .cards .card').length).toBe(3);    // the services grid
    expect(r.root.querySelector('#panel .minimap canvas')).toBeTruthy();
    r.cleanup();
  });
  it('keeps one mode at a time, and Back, Esc and right-click close one thing each', async () => {
    const r = await rigUI();
    const h = r.history;
    r.tap(15, 11, 'mouse');                                                   // the well
    let s = r.store.get();
    expect(s.mode).toBe('selected');
    expect(s.sheet).toEqual({ kind: 'info', id: buildingAt(r.world, 15, 11).id });
    expect(r.root.querySelector('#sheet h2').textContent).toBe('Well');
    key(r.root, 'm');
    s = r.store.get();
    expect(s.sheet.kind).toBe('minimap');
    expect(s.mode).toBe('selected');
    expect(h.length).toBe(3);                                                 // one entry per open step
    h.back();                                                                 // the phone's Back gesture
    s = r.store.get();
    expect(s.sheet).toBe(null);
    expect(s.mode).toBe('selected');
    key(r.root, '1');                                                         // Roads
    expect(r.store.get().dock).toBe('tray');
    fire(r.root.querySelectorAll('#dock .tray .card')[0], 'click');          // Road
    s = r.store.get();
    expect(s.mode).toBe('drawing');
    expect(s.selectedId).toBe(null);
    expect(s.sheet).toBe(null);
    r.tap(20, 12, 'mouse'); r.tap(20, 14, 'mouse');
    expect(r.store.get().line.x1).toBe(20);
    key(r.root, 'Enter');
    expect(r.world.road[14 * r.world.size + 20]).toBe(1);
    expect(r.store.get().mode).toBe('drawing');
    fire(r.canvas, 'contextmenu');                                            // right-click: back one step
    expect(r.store.get().mode).toBe('browse');
    key(r.root, 'Escape');                                                    // nothing open: nothing changes
    expect(r.store.get().mode).toBe('browse');
    key(r.root, '?');
    expect(r.store.get().sheet.kind).toBe('help');
    key(r.root, 'Escape');
    expect(r.store.get().sheet).toBe(null);
    r.cleanup();
  });
  it('refreshes alerts, the banner, the badge and the canvas summary when the day changes', async () => {
    const r = await rigUI();
    r.frame(0);
    expect(r.root.querySelector('#map-summary').textContent).toContain('Gold 1000');
    r.world.gold = -5;
    r.frame(16);
    expect(document.body.classList.contains('has-banner')).toBe(false);     // not until a day passes
    tickDay(r.world);
    r.frame(32);
    expect(document.body.classList.contains('has-banner')).toBe(true);
    expect(r.root.querySelector('#banner .critical').textContent).toContain('debt');
    expect(r.root.querySelector('#map-summary').textContent).toContain('alert');
    expect(r.root.querySelector('#live').textContent).toContain('alert');
    fire(r.root.querySelector('#banner .view'), 'click');                     // View: the summary sheet for city-wide alerts
    expect(r.store.get().sheet.kind).toBe('summary');
    r.cleanup();
  });
});
```

Append to `tests/all.js` (before the stress test, which stays last):
```js
import './ui/createUI.test.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui createUI"`
Expected: `LOAD ERROR` naming `tests/all.js` (`src/ui/createUI.js` does not exist).

- [ ] **Step 3: Write `createUI` (part 1: components)**

`src/ui/createUI.js`:
```js
// Wires every component to the store, the world, the camera and the renderer (spec 6). The world changes
// only through placement.js, speed.js and the sheets, which call src/sim/commands.js then assignLabour.
import { MILESTONES } from '../data/progression.js';
import { BUILDINGS } from '../data/buildings.js';
import { CATEGORIES, toolForItem, UNDO_TOAST_MS } from '../data/ui.js';
import { screenToTile, visibleTileRange } from '../render/camera.js';
import { walkersAt } from '../render/walkers.js';
import { drawOverlay, drawReachHighlight, drawGhost } from '../render/overlays.js';
import { createEffects } from '../render/effects.js';
import { createStore, INITIAL_UI_STATE } from './store.js';
import { select, deselect, back, openSheet, closeSheet, setDock, isToolMode } from './modes.js';
import { pickLayout, watchLayout } from './layout.js';
import { createBackStack } from './backstack.js';
import { createSettings } from './settings.js';
import { createCameraControl } from './cameraControl.js';
import { createMapInput } from './input.js';
import { createKeyboard } from './keyboard.js';
import { pickBuilding } from './pick.js';
import { createPlacement, snapGhost } from './placement.js';
import { createHud } from './hud.js';
import { createSpeedControl } from './speed.js';
import { cardInfo, activeItemOf } from './cards.js';
import { createDock } from './dock.js';
import { createConfirmBar } from './confirmBar.js';
import { createSidePanel } from './sidePanel.js';
import { createRail } from './rail.js';
import { createCorners } from './corners.js';
import { createSheets } from './sheets.js';
import { createMinimap } from './minimap.js';
import { createAlerts, mapSummaryText } from './alerts.js';
import { createOverlayLegend } from './overlayUi.js';
import { createToasts } from './toasts.js';
import { createMenuSheets, createDialog } from './menu.js';
import { el, setText } from './components.js';
import { buildingName, reasonText, milestoneText, T } from './text.js';

const TOPBAR_PX = 48;                 // --topbar-h at 100% text size
const PANEL_PX = 320, RAIL_PX = 56, DRAWER_PX = 268;   // --panel-w, --rail-w, --drawer-w

export function createUI({
  world, canvas, cam, renderer,
  root = document.body, doc = document, win = window,
  getSize = null, subscribeResize = undefined, history = win.history,
  addListener = (type, fn) => win.addEventListener(type, fn), removeListener = (type, fn) => win.removeEventListener(type, fn),
  keyTarget = win, storage = undefined, hooks = {}, now = () => performance.now(),
}) {
  const $ = (id) => root.querySelector(`#${id}`);
  const view = getSize || (() => ({ width: canvas.clientWidth || win.innerWidth, height: canvas.clientHeight || win.innerHeight }));

  const settings = createSettings({ storage, root });
  const store = createStore({ ...INITIAL_UI_STATE, layout: pickLayout(view().width, view().height) });
  const toasts = createToasts({ container: $('toasts') });
  const effects = createEffects({
    reducedMotion: settings.reducedMotion(),
    onMilestone: (id) => { const m = MILESTONES.find((x) => x.id === id); toasts.show(milestoneText(m ? m.name : id)); },
  });
  const cameraControl = createCameraControl({ cam, view, reducedMotion: settings.reducedMotion, now });
  const placement = createPlacement({ world, store, afterCommand, effects, now });
  const speedControl = createSpeedControl({ world, store, afterCommand, onPausedHidden: () => toasts.show(T.pausedHidden), doc });
  const alerts = createAlerts({ world, banner: $('banner'), live: $('live'), onView: viewAlert, root });
  const panelMinimap = createMinimap({ world, cam, view, size: 160, dpr: renderer.dpr });
  const sheetMinimap = createMinimap({ world, cam, view, size: 200, dpr: renderer.dpr });

  const speedBar = el('div', { class: 'speed-bar' });
  speedControl.mountBar(speedBar);
  const hud = createHud({ world, store, container: $('topbar'), speedBar, onOpenSummary: () => toggleSheet('summary'), onOpenMenu: () => toggleSheet('menu') });
  const dock = createDock({ container: $('dock'), store, world, onPick: pick });
  const confirmBar = createConfirmBar({ container: $('ui'), store, placement, onCancel: () => placement.cancel(), onConfirm: confirm, onUndo: undo });
  const sidePanel = createSidePanel({ container: $('panel'), store, world, onPick: pick, minimapNode: panelMinimap.canvas });
  const rail = createRail({ container: $('rail'), store, world, onPick: pick, onConfirm: confirm, onCancel: () => placement.cancel(), placement });
  const legend = createOverlayLegend({ container: $('legend'), store });
  const corners = createCorners({ container: $('corners'), store, speedControl, onMinimap: () => toggleSheet('minimap'), onOverlay: () => legend.cycle(), alertCount: () => alerts.count() });
  const menus = createMenuSheets({ store, settings, toasts, hooks, onNewCity: typeof hooks.newCity === 'function' ? hooks.newCity : () => {} });
  const sheets = createSheets({ container: $('sheet'), store, world, placement, cameraControl, minimap: sheetMinimap, getAlerts: () => alerts.list(), onView: viewAlert, afterCommand, custom: menus });
  createDialog({ container: $('dialog'), store });
  const backStack = createBackStack({ store, history, addListener, removeListener });
  backStack.start();
  const stopLayout = watchLayout({ root, getSize: view, subscribe: subscribeResize, onChange: (layout) => store.set({ layout }) });
  const stopVisibility = speedControl.watchVisibility();
```

- [ ] **Step 4: Write `createUI` (part 2: actions)**

Continue `src/ui/createUI.js` (still inside `createUI`):
```js
  // Screen point -> tile, clamped onto the map, so drags past the edge still mean the edge tile.
  const tileUnder = (x, y) => {
    const t = screenToTile(cam, view(), x, y);
    const c = (v) => Math.max(0, Math.min(world.size - 1, Math.floor(v)));
    return { x: c(t.x), y: c(t.y) };
  };
  const reachOf = (def) => def.reach || def.supplyReach || def.producerReach || 0;
  function tooltipText(b) {
    const def = BUILDINGS[b.type];
    const parts = [buildingName(b.type)];
    if (def.workers) parts.push(`${T.workers.toLowerCase()} ${b.staff} of ${def.workers}`);
    if (reachOf(def)) parts.push(`${T.reach.toLowerCase()} ${reachOf(def)}`);
    return parts.join(', ');
  }

  // A card was picked: the ghost appears a little above mid-screen, snapped onto the map (spec 6.5).
  function pick(item) {
    const v = view();
    const c = screenToTile(cam, v, v.width / 2, v.height * 0.4);
    placement.start(toolForItem(item), { x: c.x, y: c.y });
  }
  function confirm() {
    const r = placement.confirm();
    if (!r.ok) toasts.show(reasonText(r.reason));
    return r;
  }
  function undo() {
    if (!placement.canUndo()) return;
    if (placement.undoNeedsConfirm()) store.set({ confirmDialog: { text: T.undoOccupiedConfirm, confirmLabel: T.undo, onConfirm: () => placement.undo() } });
    else placement.undo();
  }
  function toggleSheet(kind) {
    const s = store.get();
    store.set(s.sheet && s.sheet.kind === kind ? closeSheet(s) : openSheet(s, kind));
  }
  function goBack() { const p = back(store.get()); if (p) store.set(p); }
  // View on an alert: a building's alert selects it and pans there; a city-wide one opens the summary.
  function viewAlert(alert) {
    const b = alert.id ? world.buildings[alert.id] : null;
    if (b) { store.set(select(store.get(), b.id)); cameraControl.panTo(b.x + b.w / 2, b.y + b.d / 2); }
    else store.set(openSheet(store.get(), 'summary'));
  }
  function afterCommand(e) {
    if (e.undoable) toasts.show(e.text, { action: T.undo, onAction: undo, ms: UNDO_TOAST_MS });
    else if (e.kind === 'undo') toasts.show(T.undone);
    ghostsDirty = true;
    refresh();
  }
  // After a command: alerts, numbers, cards (affordability) and the open sheet all reflect the new world.
  function refresh() {
    refreshDaily();
    sheets.render();
  }
  // Once per game day (and after commands): nothing here rebuilds an open sheet, so focus inside it survives.
  function refreshDaily() {
    alerts.refresh();
    hud.render(); dock.render(); sidePanel.render(); rail.render(); confirmBar.render(); corners.render();
    setText($('map-summary'), mapSummaryText(world, alerts.list()));
  }

  const actions = {
    tap({ x, y, type }) {
      const s = store.get();
      const t = tileUnder(x, y);
      if (isToolMode(s.mode)) {
        if (s.tool.kind === 'building' && type === 'mouse') { placement.moveGhost(t.x, t.y); confirm(); }   // a click places (spec 6.5)
        else placement.pointAt(t.x, t.y);                                                                      // a tap moves the ghost or sets a point
        return;
      }
      const b = pickBuilding(world, cam, view(), x, y);
      if (b) store.set(select(s, b.id));
      else if (s.mode === 'selected') store.set(deselect(s));
    },
    secondary: goBack,
    hover(p) {
      const s = store.get();
      if (s.mode === 'placing' && p) {                 // the ghost follows the mouse, re-set only when it moves a tile
        const t = tileUnder(p.x, p.y);
        const g = snapGhost(world, s.tool, t.x, t.y);
        if (!s.ghost || g.x !== s.ghost.x || g.y !== s.ghost.y) placement.moveGhost(t.x, t.y);
        return;
      }
      const b = p ? pickBuilding(world, cam, view(), p.x, p.y) : null;
      const id = b ? b.id : null;
      if (id !== s.hoverId) { store.set({ hoverId: id }); canvas.title = b ? tooltipText(b) : ''; }
    },
    ghostDragStart({ x, y }) {
      const s = store.get();
      if (!s.ghost || !s.tool || s.tool.kind !== 'building') return false;
      const def = BUILDINGS[s.tool.type];
      const t = screenToTile(cam, view(), x, y);
      return t.x >= s.ghost.x - 0.5 && t.x < s.ghost.x + def.w + 0.5 && t.y >= s.ghost.y - 0.5 && t.y < s.ghost.y + def.d + 0.5;
    },
    ghostDrag({ x, y }) { const t = tileUnder(x, y); placement.moveGhost(t.x, t.y); },
    ghostDragEnd() {},
    drawDrag({ x, y, phase }) { const t = tileUnder(x, y); placement.dragTo(t.x, t.y, phase); },
    panStarted() {                                     // panning tucks the dock (spec 6.3); the confirm bar never tucks
      const s = store.get();
      if (s.layout === 'portrait' && !isToolMode(s.mode) && s.dock !== 'tucked') store.set(setDock(s, 'tucked'));
    },
  };
```

- [ ] **Step 5: Write `createUI` (part 3: keyboard, selection, the frame, teardown)**

Continue `src/ui/createUI.js` (still inside `createUI`):
```js
  const keyActions = {
    pause: () => speedControl.toggle(), speedUp: () => speedControl.faster(), speedDown: () => speedControl.slower(),
    category: (i) => { const s = store.get(); const category = CATEGORIES[i].id; store.set(s.layout === 'wide' ? { category } : { category, dock: 'tray' }); },
    rotate: () => {},                                  // nothing rotates in Stage 1 (mastabas come with monuments)
    minimap: () => toggleSheet('minimap'), overlay: () => legend.cycle(),
    confirm: () => {
      const s = store.get();
      if (s.confirmDialog) { const d = s.confirmDialog; store.set({ confirmDialog: null }); d.onConfirm(); }
      else if (isToolMode(s.mode)) confirm();
    },
    back: goBack, undo, help: () => toggleSheet('help'),
  };
  const mapInput = createMapInput({ canvas, cam, view, cameraControl, store, actions, root });
  const keyboard = createKeyboard({ target: keyTarget, settings, cam, cameraControl, actions: keyActions });

  // The sheet's footprint in CSS px, so a selected building is panned into the part of the map it leaves free.
  function sheetInsets(s) {
    const v = view();
    if (s.layout === 'portrait') return { top: TOPBAR_PX, right: 0, bottom: v.height * 0.6, left: 0 };
    if (s.layout === 'compact') return { top: TOPBAR_PX, right: RAIL_PX + DRAWER_PX, bottom: 0, left: 0 };
    return { top: TOPBAR_PX, right: PANEL_PX, bottom: 0, left: 0 };
  }
  function panelDetails() {
    const s = store.get();
    const b = s.hoverId !== null ? world.buildings[s.hoverId] : null;
    let text = T.hoverHint;
    if (b) text = tooltipText(b);
    else if (s.tool) { const c = cardInfo(world, activeItemOf(s.tool)); text = `${c.name}: ${c.costText}`; }
    setText(sidePanel.details, text);
  }
  let lastSelected = null;
  store.subscribe((s) => {
    root.dataset.mode = s.mode;
    if (s.selectedId !== lastSelected) {
      lastSelected = s.selectedId;
      const b = s.selectedId !== null ? world.buildings[s.selectedId] : null;
      if (b) cameraControl.keepVisible(b.x + b.w / 2, b.y + b.d / 2, sheetInsets(s));   // spec 6.3
    }
    panelDetails();
  });
  root.dataset.mode = store.get().mode;

  // Ghosts are recomputed only when the UI state object changes or a command ran (previews call canPlace).
  let lastDay = world.day, ghostsDirty = true, ghostState = null, ghostList = [];
  function ghosts() {
    const s = store.get();
    if (s !== ghostState || ghostsDirty) { ghostState = s; ghostsDirty = false; ghostList = isToolMode(s.mode) ? placement.ghosts() : []; }
    return ghostList;
  }

  function render({ timeDays, now: t }) {
    cameraControl.tick(t);
    const s = store.get();
    const v = view();
    const range = visibleTileRange(cam, v, world.size);
    const selected = s.selectedId !== null ? world.buildings[s.selectedId] : null;
    renderer.renderFrame(world, cam, {
      view: v, walkers: walkersAt(world, timeDays, range), effects, now: t, grid: isToolMode(s.mode),
      drawOverlay: (g, r) => {
        if (s.overlay) drawOverlay(g, world, s.overlay, r);
        if (selected) drawReachHighlight(g, world, selected);                  // spec 4.5: tapping a building shows its reach
        for (const ghost of ghosts()) drawGhost(g, ghost);
      },
    });
    hud.render();
    if (s.layout === 'wide' && !s.panelFolded) panelMinimap.render(alerts.list());
    if (s.sheet && s.sheet.kind === 'minimap') sheetMinimap.render(alerts.list());
    if (world.day !== lastDay) { lastDay = world.day; ghostsDirty = true; refreshDaily(); }
  }

  refreshDaily();
  return {
    store, settings, placement, cameraControl, alerts, toasts, effects, speedControl, actions, render, afterCommand, refresh,
    destroy() { mapInput.detach(); keyboard.detach(); backStack.stop(); stopLayout(); stopVisibility(); toasts.clear(); },
  };
}
```

Add to `src/ui/text.js` (after `plural`):
```js
export const milestoneText = (name) => `Your city is now a ${name}`;
```

- [ ] **Step 6: Write the real boot and retire the dev page**

`src/main.js` (replace the whole file):
```js
// Boot: the world from the URL's seed, the renderer, the interface and the loop (spec 4.1: a new city
// starts paused with its start road; createWorld does both). ?seed=N picks a map, ?stress=1 a full city,
// ?sample=1 the sample city, ?speed=1 starts running.
import { createWorld } from './sim/world.js';
import { setSpeed } from './sim/commands.js';
import { createCamera } from './render/camera.js';
import { createRenderer } from './render/renderer.js';
import { createGameLoop } from './render/loop.js';
import { buildSampleCity, buildStressCity } from './dev/sampleCity.js';
import { createUI } from './ui/createUI.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);
const world = createWorld({ seed });
const stress = params.get('stress') === '1';
if (stress) buildStressCity(world);
else if (params.get('sample') === '1') buildSampleCity(world);
if (params.has('speed')) setSpeed(world, Number(params.get('speed')));

const canvas = document.getElementById('map');
const cam = createCamera({ x: stress ? 32 : world.focus.x, y: stress ? 32 : world.focus.y, zoom: 1 });
const renderer = createRenderer({ canvas });
const ui = createUI({
  world, canvas, cam, renderer,
  hooks: {
    newCity() {
      const url = new URL(location.href);
      url.searchParams.set('seed', String(Math.floor(Math.random() * 1e9)));
      url.searchParams.delete('stress'); url.searchParams.delete('sample'); url.searchParams.delete('speed');
      location.href = url.href;
    },
  },
});
const loop = createGameLoop({ world, onEvents: (events) => ui.effects.fromEvents(world, events, performance.now()), render: ui.render });
loop.start();
window.__thebes = { world, cam, renderer, loop, ui };
```

Then retire the dev page, which `index.html` now covers:
```powershell
git rm dev.html src/dev/devControls.js
```
`src/dev/sampleCity.js` and `tests/dev/sampleCity.test.js` stay (the sample city feeds `?sample=1`, the tests and 1d's title card).

In `tests/screenshot.ps1`, two lines reference the dev page. Change the default URL in the `param(...)` line from `'/dev.html'` to `'/'`, and the readiness probe from `"http://127.0.0.1:$port/dev.html"` to `"http://127.0.0.1:$port/index.html"`. Nothing else changes.

- [ ] **Step 7: Run the tests, then play**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: `ui createUI` PASS, every earlier group still PASS, then `ALL PASSED`. Notes for failures:
- "places a well": the ghost lands at (5, 9) only if the tap maps there; `tap` converts through `tileToScreen` with the injected size, and `input.js` subtracts the canvas rect, so both use the same origin. If the ghost is one tile off, the camera moved: the rig's `now` is fixed at 0, so no tween runs, but a `keepVisible` from an earlier selection would.
- "switches chrome": `getComputedStyle` needs `css/ui.css` loaded; `mountShell` awaits the link's `load`. If every element reports `display: none`, the link failed to load (check the test server serves `/css/ui.css`).
- "Back closes one thing": `h.length` is 3 because the back stack pushes once for the selection and once for the minimap sheet; an extra entry means a step was counted twice (compare `stepsOf` in `backstack.js`).

Then `python tests/serve.py 8000 .` and open `http://127.0.0.1:8000/?seed=1&sample=1`. Check by hand: the top bar shows numbers; tapping a category opens the tray; picking Well shows a ghost with the water overlay; a click (mouse) or tap-then-✓ (touch emulation in DevTools) builds it; the toast offers Undo; selecting a building opens its sheet and the camera keeps it visible; ☰ opens the menu; resizing the window moves between the three layouts without losing the ghost.

- [ ] **Step 8: Commit**

```powershell
git add src/ui/createUI.js src/main.js src/ui/text.js tests/helpers/uiWorld.js tests/ui/createUI.test.js tests/all.js tests/screenshot.ps1
git commit -m "Wire the interface together, boot the real page and retire the dev page`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Accessibility checks, play-test screenshots and the README

**Files:**
- Create: `tests/ui/a11y.test.js`, `docs/superpowers/notes/screenshots/1c-phone-portrait.png`, `1c-phone-landscape.png`, `1c-tablet.png`, `1c-laptop.png`
- Modify: `README.md`, `tests/all.js`

**Interfaces:**
- Consumes: `rigUI` (Task 17), `select`, `openSheet` (Task 2), `screenToTile` (camera.js), `buildingAt`.
- Produces: the spec 9 accessibility checks that a test can make (every control has a name; keyboard-only placement; reduced motion means the camera jumps; the canvas has a text summary), the four play-test screenshots at the spec's sizes, and a README that describes playing the game.

- [ ] **Step 1: Write the failing accessibility tests**

`tests/ui/a11y.test.js`:
```js
import { describe, it, expect } from '../harness.js';
import { rigUI } from '../helpers/uiWorld.js';
import { fire, key } from '../helpers/dom.js';
import { select, openSheet } from '../../src/ui/modes.js';
import { screenToTile } from '../../src/render/camera.js';
import { buildingAt } from '../../src/sim/world.js';

const nameOf = (b) => (b.getAttribute('aria-label') || b.textContent || '').trim();

describe('ui accessibility', () => {
  it('gives every control a name, in every layout and sheet (spec 6.8)', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    const unnamed = () => [...r.root.querySelectorAll('button')].filter((b) => !nameOf(b)).map((b) => b.className);
    expect(unnamed()).toEqual([]);
    for (const kind of ['summary', 'minimap', 'menu', 'settings', 'help', 'about']) {
      r.store.set(openSheet(r.store.get(), kind));
      expect(unnamed()).toEqual([]);
    }
    r.store.set(select(r.store.get(), buildingAt(r.world, 15, 11).id));
    expect(unnamed()).toEqual([]);
    r.resize(1280, 800);
    expect(unnamed()).toEqual([]);
    expect(r.canvas.getAttribute('aria-describedby')).toBe('map-summary');
    expect(r.root.querySelector('#map-summary').textContent.length).toBeGreaterThan(0);
    r.cleanup();
  });
  it('places a building with the keyboard alone and leaves with Esc (spec 9: keyboard-only play)', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    // The ghost appears under the point (width / 2, height * 0.4). Aim the camera so that point is tile (5, 9),
    // beside the road: camera tile coordinates shift every screen point by the same amount.
    const c = screenToTile(r.cam, { width: 1280, height: 800 }, 640, 320);
    r.cam.x += 5.2 - c.x; r.cam.y += 9.2 - c.y;
    key(r.root, '5');                                                         // Services tab (wide layout: no tray)
    expect(r.store.get().category).toBe('services');
    const card = r.root.querySelector('#panel .cards .card');                 // Tab reaches it; Enter clicks a focused button
    card.focus();
    fire(card, 'click');
    expect(r.store.get().mode).toBe('placing');
    expect(r.store.get().ghost).toEqual({ x: 5, y: 9 });
    const x0 = r.cam.x;
    key(r.root, 'ArrowLeft');                                                 // arrows move the view, not the ghost
    expect(r.cam.x === x0).toBe(false);
    expect(r.store.get().ghost).toEqual({ x: 5, y: 9 });
    key(r.root, 'Enter');
    expect(buildingAt(r.world, 5, 9).type).toBe('well');
    key(r.root, 'z', { ctrlKey: true });
    expect(buildingAt(r.world, 5, 9)).toBe(null);
    key(r.root, 'Escape');
    expect(r.store.get().mode).toBe('browse');
    key(r.root, ' ');
    expect(r.world.speed).toBe(1);
    key(r.root, ' ');
    expect(r.world.speed).toBe(0);
    r.cleanup();
  });
  it('jumps instead of panning under reduced motion (spec 5.4)', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    r.ui.settings.set({ reducedMotion: 'on' });
    expect(document.body.classList.contains('reduce-motion')).toBe(true);
    const temple = buildingAt(r.world, 24, 11);                                // off the right edge of a phone view
    r.store.set(select(r.store.get(), temple.id));
    expect(r.ui.cameraControl.animating).toBe(false);
    expect(r.cam.x === 12 && r.cam.y === 10).toBe(false);                     // it moved, at once
    r.ui.settings.set({ reducedMotion: 'off' });
    r.store.set(select(r.store.get(), buildingAt(r.world, 2, 11).id));        // the farm, off the left edge
    expect(r.ui.cameraControl.animating).toBe(true);                          // now it tweens
    r.cleanup();
  });
});
```

Append to `tests/all.js` (after `createUI.test.js`, before the stress test):
```js
import './ui/a11y.test.js';
```

- [ ] **Step 2: Run the tests to verify the new group fails, then make it pass**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1 -Grep "ui accessibility"`
Expected: FAIL only where a control lacks a name or a step above is unmet; the implementation is already in place, so fix the named component (add the `aria-label` or the `T` label it needs) rather than the test. Then the full run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1` prints `ALL PASSED`.

- [ ] **Step 3: Take the play-test screenshots at the four spec sizes (spec 9)**

Run, from the repo root:
```powershell
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?seed=1&sample=1' -Out docs/superpowers/notes/screenshots/1c-phone-portrait.png -Width 390 -Height 844
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?seed=1&sample=1' -Out docs/superpowers/notes/screenshots/1c-phone-landscape.png -Width 844 -Height 390
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?seed=1&sample=1' -Out docs/superpowers/notes/screenshots/1c-tablet.png -Width 1024 -Height 768
powershell -ExecutionPolicy Bypass -File tests/screenshot.ps1 -Url '/?seed=1&sample=1' -Out docs/superpowers/notes/screenshots/1c-laptop.png -Width 1280 -Height 800
```
Expected: four PNGs. Open each: portrait shows the top bar, the slim dock with seven categories and the two corner groups above it; landscape shows the condensed top bar and the rail on the right; the tablet (1024×768 is wide: at least 900×520) and the laptop show the full top bar with speed buttons and the right-hand panel with the minimap, tabs and the card grid. Nothing floats over the middle of the map; no text is clipped; the parchment chrome reads against the sand. The controller then drives the game in the built-in browser at these sizes through every mode of spec 6.4 (browse, selected, placing, drawing, demolishing, overlay) and shows Josh the results.

- [ ] **Step 4: Update the README**

Replace the "Dev view" section of `README.md` with:
```markdown
## Play it

    python tests/serve.py 8000 .

Then open http://localhost:8000/. Add `?seed=7` for another map, `?sample=1` for a small ready-made city, `?stress=1` for a full 64×64 city, or `?speed=1` to start running (a city starts paused).

Keys: Space pauses, + and − change the speed, 1–7 pick a build category, arrows or WASD move the view, M opens the minimap, O cycles the overlays, Enter confirms, Esc goes back one step, Ctrl+Z (Cmd+Z) undoes, ? lists the shortcuts. With a mouse: drag to pan, wheel to zoom, click to place. On a phone: one finger pans, two fingers zoom, tap to select or to move the ghost, then ✓.

`tests/screenshot.ps1 -Url '/?seed=1&sample=1' -Out shot.png -Width 390 -Height 844` saves a PNG of the page from headless Edge at that size.
```

- [ ] **Step 5: Run the whole suite one last time**

Run: `powershell -ExecutionPolicy Bypass -File tests/run-tests.ps1`
Expected: every group PASS, then `ALL PASSED`, exit code 0.

- [ ] **Step 6: Commit**

```powershell
git add tests/ui/a11y.test.js tests/all.js README.md docs/superpowers/notes/screenshots/1c-phone-portrait.png docs/superpowers/notes/screenshots/1c-phone-landscape.png docs/superpowers/notes/screenshots/1c-tablet.png docs/superpowers/notes/screenshots/1c-laptop.png
git commit -m "Add accessibility tests, play-test screenshots at the four spec sizes, and a README for playing`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Spec coverage for this plan

| Spec section | Covered by |
|---|---|
| 4.1 A new city starts paused, camera on fertile land, start road in from the trade edge | Task 17 (`createWorld` already does the road and speed 0; `main.js` puts the camera on `world.focus`) |
| 4.3 Pause, 1×, 2×, 3×; pause when the page is hidden | Tasks 11, 17 |
| 4.5 Tap start and end for roads, L-path with Flip, reach highlight on selection, the matching overlay when placing a service | Tasks 9, 12, 17 |
| 4.8 "Employed" means assigned, so the HUD says working and jobless | Task 11 |
| 4.11 Gold in the top bar, costs on cards, refunds on demolish and undo | Tasks 11, 12, 9 |
| 5.3 Tap areas: nearest building centre, tall sprites, everything at minimum zoom | Task 7 |
| 5.4 Reduced motion: the camera jumps, no puffs | Tasks 6, 17, 18 |
| 6.1 Principles: top reads, bottom taps, nothing mid-map, one panel, exits everywhere, no colour-only meaning, 4.5:1, 16 px body, 12 px floor, text size 100/125/150, 44 px targets, safe areas | Tasks 1 (tokens, contrast test, CSS), 4 and 16 (text size), 14 and 15 (✓/✕, dot/ring) |
| 6.2 Portrait, wide and compact layouts with the exact breakpoints; rotation keeps camera and placement | Tasks 1, 12, 13, 17 (resize test) |
| 6.3 Top bar and city summary; speed corner and bar; three-height dock with cards; corner buttons; alerts (badge, banner, aria-live); overlays with legend; minimap sheet with +/−; info sheets with cause, fix and View; ☰ menu; settings | Tasks 11, 12, 13, 15, 14, 16 |
| 6.4 Modes table, one mode at a time, overlays combine with browse, confirm bar never tucks, a history entry per open step | Tasks 2, 4, 12, 17 |
| 6.5 Touch and mouse placing, validity three ways with reasons, area painting by taps or drag, undo (10, month end, Ctrl+Z, bar and toast) | Tasks 8, 9, 12, 15, 17 |
| 6.6 Gestures: one-finger pan, ghost drag, two-finger pan/zoom, tap, double-tap, dock swipe; single-tap alternatives | Tasks 7, 8, 12, 14 |
| 6.7 Wheel, drag, right/middle-drag, hover; the keyboard map; input type per press; shortcuts off in fields and in settings | Tasks 8, 10, 16, 17 |
| 6.8 Real buttons with labels, canvas text summary, aria-live alerts, visible focus, tab order by layout | Tasks 1, 15, 17, 18 |
| 7.2 `src/ui/` module names | File Structure (every spec-named module exists; `titleCard`, `welcomeBack`, `goalsList` are 1d) |
| 7.3 The UI changes the world only through commands | Tasks 9, 11, 14 (checked in their tests: gold and buildings change only after a command) |
| 7.4 rAF loop, fixed timestep, draw order with overlays last | Task 17 (`render` is the loop's callback; overlay, reach and ghosts draw through the renderer's overlay hook) |
| 9 Modes tests; play-testing at iPhone portrait, iPhone landscape, tablet, laptop; contrast, reduced motion, keyboard-only play, screen-reader labels | Tasks 2, 17, 18 (Task 1 for contrast) |

Not in this plan, on purpose: tier 5+ demolish confirmation, rotation and desirability (Stage 2 and 4 content), raid and fire banners (Stage 3), the title card, goals, welcome back, saves, export/import, PWA, sound and haptics (Plan 1d).

## Follow-ups for Plan 1d

- **Long-press a build card** should show the building's details (spec 6.6); cards have no long-press yet. Give cards a `title` tooltip at the same time (spec 6.5 mentions hovering a card).
- **Ghost snapping.** `pick` puts the ghost on the map tile under the upper-middle of the view, not "the nearest valid tile" (spec 6.5). Search outwards from that tile for the first `canPlace` ok when 1d polishes onboarding.
- **Open sheets go stale between commands.** `refreshDaily` does not rebuild an open sheet (so keyboard focus inside it survives), so a building sheet's workers and stock update only on the next store change. Update the numbers in place if it shows.
- **`tests/serve.py` binds 127.0.0.1 only** (1a follow-up, still open). Add a bind argument before real-phone testing.
- **`storage_full` is unreachable** in the sim (1a follow-up); the text exists, the alert never fires.
- **Screenshot tool** still deletes the previous PNG before capturing and cannot drive the UI; the controller takes mode screenshots in the built-in browser by hand.
- **The Stage 1c review follow-ups** (accessibility, motion, cards and money, camera and gestures, performance, tests) are collected in `docs/superpowers/notes/2026-10-10-stage-1c-followups.md`.
- **Commit trailer.** Every commit keeps `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` as the brief asks; Josh decides whether later plans name the model actually used.

## Next plans

Plan 1d (onboarding, saving, shipping): the title card over a drifting sample city, the goals list with Show me, the welcome-back card, autosave with a backup and the load-error cases from the 1a notes, export and import through the menu hooks, the install flows and the in-app browser notice, sound and haptics behind the settings already here, the "update ready" toast, `manifest.webmanifest`, `sw.js`, icons, the OG image, and the first GitHub Pages publish (ask Josh before creating the public repo).
