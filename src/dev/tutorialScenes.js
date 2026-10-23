// The picture cards' pictures (spec 4.1, ruling 264): the `tutorial` development scene (src/dev/scenes.js). Track G owns
// this file; Version 6.0 (Track D2) made the pictures again from the 6.0 game and added the six first moments' (below, in PICTURES).
//
// devScene('tutorial') on the title card (/?nosw=1) shows the picture cards as a player first meets them (the shots tool's
// Stage 4 scene; { card: i } shows card i). devScene('tutorial', { picture: id }), or tutorialPicture(game, id), sets up
// the picture of one card (src/data/tutorial.js) on a fresh city (TUTORIAL_SHOT.params) at a phone's size
// (TUTORIAL_SHOT.width x .height), and resolves with what tools/tutorial.ps1 needs: { id, clip: { x, y, size } (the square to capture, CSS px from the screen's top left), mark (in picture px:
// TUTORIAL.size across the clip, the shape src/data/tutorial.js describes) }. Every mark is read from the scene itself:
// a tile's place on screen through the camera, or a button's or a row's box on the page, so it stays on its thing when the
// art or the interface's look changes and the pictures are made again.
//
// Each picture builds a small riverside village through the sim's commands on seed 7's fresh city and lets it live for
// some days (tickDay), so homes are lived in and have grown: a road off the start road along the fertile land, six homes,
// a well, a farm on the fertile land, a granary and a bazaar. The guide's strip stays only for the goals card; the
// city stays paused. The six first moments' pictures (a Large plot, a court demand, a plague, a low Nile, locusts, a raid) start the Version 6.0 dev scene
// of their own thing instead (src/dev/v60/) and frame it; they need the page's api, so tools/tutorial.ps1 asks for them through devScene.
import { drawRoad, paintHouses, place, setGuide } from '../sim/commands.js';
import { tickDay } from '../sim/clock.js';
import { assignLabour } from '../sim/labour.js';
import { makeBuilding, insertBuilding } from '../sim/world.js';
import { tileToScreen, screenToTile, pxPerArt } from '../render/camera.js';
import { ART, slotFor } from '../render/art/registry.js';
import { select, toggleOverlay, closeSheet } from '../ui/modes.js';
import { TUTORIAL_CARDS, TUTORIAL } from '../data/tutorial.js';
import { largePlotScene } from './v60/largePlot.js';
import { demandScene } from './v60/reign.js';
import { plagueScene, droughtScene, locustsScene, raidBurnScene } from './v60/hazards.js';
import { fullestHome } from './v60/base.js';

// The phone the pictures are taken on, the square of it each picture is (scaled to TUTORIAL.size), and the city.
export const TUTORIAL_SHOT = { width: 390, height: 844, clip: 390, params: '/?skipTitle=1&nosw=1&seed=7' };

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The map's size in CSS px and its box on the page (the screen in the game; a test's mounted shell).
function frameOf(g) {
  const c = g.ui.cameraControl.centre();
  const map = document.querySelector('#map');
  const r = map ? map.getBoundingClientRect() : { left: 0, top: 0 };
  return { width: c.x * 2, height: c.y * 2, left: r.left, top: r.top };
}

// Puts tile (x, y) at screen point (sx, sy) at a zoom, by a jump (no camera tween is left running).
function putTileAt(g, x, y, sx, sy, zoom) {
  g.cam.zoom = zoom;
  const v = frameOf(g);
  const c = screenToTile({ x, y, zoom }, v, v.width - sx, v.height - sy);
  g.ui.cameraControl.jumpTo(c.x, c.y);
}

// A point on the screen as a point in the picture.
const toPicture = (clip, sx, sy) => [((sx - clip.x) * TUTORIAL.size) / clip.size, ((sy - clip.y) * TUTORIAL.size) / clip.size];
const r1 = (v) => Math.round(v * 10) / 10;
// A ring round a tile's middle, `across` tiles wide; a ring round a box on the page; an arrow to a box.
function tileRing(g, clip, x, y, across = 1) {
  const v = frameOf(g);
  const [sx, sy] = tileToScreen(g.cam, v, x, y);
  const [px, py] = toPicture(clip, sx, sy);
  const w = (64 * g.cam.zoom * across * TUTORIAL.size) / clip.size;
  return { kind: 'ring', x: r1(px), y: r1(py), w: r1(w), h: r1(w) };
}
// A ring round a building as it is drawn: its art slot's box (the slot's bounds, less their margin) on the screen.
function buildingRing(g, clip, b) {
  const v = frameOf(g), art = ART[slotFor(b, g.world)] || ART[b.type];
  const m = 8, [l, t, r, bt] = art.bounds, s = pxPerArt(g.cam);
  const [ox, oy] = tileToScreen(g.cam, v, b.x, b.y);
  const [x0, y0] = toPicture(clip, ox + (l + m) * s, oy + (t + m) * s), [x1, y1] = toPicture(clip, ox + (r - m) * s, oy + (bt - m) * s);
  return { kind: 'ring', x: r1((x0 + x1) / 2), y: r1((y0 + y1) / 2), w: r1(x1 - x0), h: r1(y1 - y0) };
}
// A row of text gets `radius` (square-ish corners, so the ends do not sit on its first and last letters) and `widen` px
// (picture) more each side, as its text runs right to the row's edge and the ring's halo needs the room; above and below
// the row's own padding is all there is before the next row's text, so the ring stays close there. A button is itself a
// pill, so it keeps one.
function boxRing(g, clip, node, { pad = 2, radius, widen = 0 } = {}) {
  const v = frameOf(g), b = node.getBoundingClientRect();
  const [x0, y0] = toPicture(clip, b.left - v.left, b.top - v.top), [x1, y1] = toPicture(clip, b.right - v.left, b.bottom - v.top);
  return { kind: 'ring', x: r1((x0 + x1) / 2), y: r1((y0 + y1) / 2), w: r1(x1 - x0 + 2 * widen), h: r1(y1 - y0), pad, ...(Number.isFinite(radius) ? { radius } : {}) };
}
// A ring round several boxes on the page together (their union), as boxRing makes one round a single box.
function boxesRing(g, clip, nodes, opts) {
  const rs = nodes.map((n) => n.getBoundingClientRect());
  const union = { left: Math.min(...rs.map((r) => r.left)), right: Math.max(...rs.map((r) => r.right)), top: Math.min(...rs.map((r) => r.top)), bottom: Math.max(...rs.map((r) => r.bottom)) };
  return boxRing(g, clip, { getBoundingClientRect: () => union }, opts);
}
function boxArrow(g, clip, node, angle) {
  const v = frameOf(g), b = node.getBoundingClientRect();
  const a = (angle * Math.PI) / 180;
  // The tip just outside the box, on the side the arrow comes from.
  const cx = (b.left + b.right) / 2 - v.left, cy = (b.top + b.bottom) / 2 - v.top;
  const reach = Math.min(b.width, b.height) / 2 + 6;
  const [px, py] = toPicture(clip, cx - Math.cos(a) * reach, cy - Math.sin(a) * reach);
  return { kind: 'arrow', x: r1(px), y: r1(py), angle };
}

// The village (seed 7: the start road runs north to (24, 55); the river and its fertile land lie west of x = 17): a road
// west from the start road's end, six homes on its north side, a well and a farm on the fertile land on its south side,
// and a granary and a bazaar on the start road's east side (out of the road card's frame). It lives `days` days. Returns
// its buildings by role.
function village(g, { days = 150 } = {}) {
  const { world } = g;
  const [ex, ey] = world.startRoad[world.startRoad.length - 1];
  const gold = world.gold;
  world.gold = 1e6;
  const must = (r, what) => { if (!r || r.ok === false) throw new Error(`devScene tutorial: no ${what} (${r && r.reason})`); return r; };
  must(drawRoad(world, ex, ey, ex - 12, ey), 'road');
  must(paintHouses(world, ex - 6, ey - 1, ex - 1, ey - 1), 'plots');
  const well = must(place(world, 'well', ex - 3, ey + 1), 'well');
  const farm = must(place(world, 'farm_grain', ex - 11, ey + 1), 'farm');
  const granary = must(place(world, 'granary', ex + 1, ey + 1), 'granary');
  const bazaar = must(place(world, 'bazaar', ex + 1, ey + 4), 'bazaar');
  world.gold = gold;
  setGuide(world, false);
  for (let d = 0; d < days; d++) tickDay(world);
  assignLabour(world);
  const b = (r) => world.buildings[r.id];
  return { well: b(well), farm: b(farm), granary: b(granary), bazaar: b(bazaar), start: { x: ex, y: ey } };
}

// A clip of the screen: TUTORIAL_SHOT.clip square, y from the top (kept on the screen).
const clipAt = (y) => ({ x: 0, y: Math.max(0, Math.min(y, TUTORIAL_SHOT.height - TUTORIAL_SHOT.clip)), size: TUTORIAL_SHOT.clip });

const PICTURES = {
  // A road with homes, a well and a farm along it: a ring on the road between the farm and the homes.
  async road(g) {
    const v = village(g);
    const clip = clipAt(220);
    putTileAt(g, v.start.x - 7, v.start.y + 0.5, 195, clip.y + 195, 0.9);
    await wait(50);
    return { clip, mark: tileRing(g, clip, v.start.x - 7.5, v.start.y + 0.5, 1.2) };
  },
  // Housing plots on a road and a well beside them: a ring on the well.
  async homes(g) {
    const v = village(g, { days: 60 });
    const clip = clipAt(220);
    putTileAt(g, v.well.x, v.well.y, 195, clip.y + 215, 1.5);
    await wait(50);
    return { clip, mark: buildingRing(g, clip, v.well) };
  },
  // The Ground layer on, the fertile land green by the river, a farm on it: an arrow to the Layers button.
  async farm(g) {
    const v = village(g);
    g.ui.store.set(toggleOverlay(g.ui.store.get(), 'ground'));
    const layers = document.querySelector('#corners .overlay-button');
    const lb = layers.getBoundingClientRect(), fv = frameOf(g);
    const clip = clipAt(Math.round(lb.bottom - fv.top + 12 - TUTORIAL_SHOT.clip));
    putTileAt(g, v.farm.x + 1, v.farm.y + 1, 150, clip.y + 170, 1);
    await wait(50);
    return { clip, mark: boxArrow(g, clip, layers, 60) };
  },
  // A granary and a bazaar by the homes, and a building sheet (the bazaar's): a ring on its workers row.
  async food(g) {
    const v = village(g);
    g.ui.store.set(select(g.ui.store.get(), v.bazaar.id));
    await wait(100);
    const sheet = document.querySelector('#sheet');
    const row = sheet && [...sheet.querySelectorAll('.row')].find((n) => /worker/i.test(n.textContent));
    if (!row) throw new Error('devScene tutorial: no workers row on the bazaar sheet');
    const fv = frameOf(g), top = sheet.getBoundingClientRect().top - fv.top;
    const clip = clipAt(Math.max(0, Math.round(top - 170)));
    putTileAt(g, v.start.x + 0.5, v.start.y + 2, 195, clip.y + 85, 0.8);
    await wait(50);
    return { clip, mark: boxRing(g, clip, row, { radius: 12, widen: 10 }) };
  },
  // Stage 4.5 (Task 4b): the top bar's gold chip with its monthly forecast ("+N a month") over the village: a ring on the forecast.
  async gold(g) {
    const v = village(g);
    const chip = document.querySelector('#topbar .forecast');
    for (let t = 0; chip && chip.hidden && t < 20; t++) await wait(50);   // the top bar draws it on the next frame
    if (!chip || chip.hidden) throw new Error('devScene tutorial: no forecast in the gold chip');
    const clip = clipAt(0);
    putTileAt(g, v.start.x - 6, v.start.y + 0.5, 195, clip.y + 250, 0.9);
    await wait(50);
    return { clip, mark: boxRing(g, clip, chip.firstElementChild || chip, { pad: 4, radius: 10, widen: 6 }) };   // the words' own box: the chip itself is 0 wide (css), its text runs on
  },
  // The goals strip, the start road below it: a ring on Show me.
  async goals(g) {
    const show = [...document.querySelectorAll('#goals button')].find((b) => b.offsetParent && /show me/i.test(b.textContent));
    if (!show) throw new Error('devScene tutorial: no Show me on the goals strip');
    const [ex, ey] = g.world.startRoad[g.world.startRoad.length - 1];
    const clip = clipAt(0);
    putTileAt(g, ex + 0.5, ey + 2, 230, clip.y + 300, 1);
    await wait(50);
    return { clip, mark: boxRing(g, clip, show) };
  },
  // A pyramid under way, a tower and a firehouse beyond it: a ring on the pyramid. The road north from the village runs
  // past them with homes along it (people to staff them), and the site has had no day yet (no stall to warn of).
  async ahead(g) {
    const { world } = g;
    const [ex, ey] = world.startRoad[world.startRoad.length - 1];
    world.gold = 1e6;
    drawRoad(world, ex, ey, ex, ey - 13);
    paintHouses(world, ex - 1, ey - 12, ex - 1, ey - 1);
    const v = village(g);
    const put = (type, x, y) => insertBuilding(world, makeBuilding(world, type, x, y));
    const pyramid = put('pyramid_small', ex + 1, ey - 9);
    Object.assign(pyramid.site, { course: 3 });
    put('tower', ex + 1, ey - 13);
    put('firehouse', ex - 1, ey - 13);
    world.gold = 2000;
    assignLabour(world);
    const clip = clipAt(220);
    putTileAt(g, pyramid.x + 2, pyramid.y + 2, 205, clip.y + 260, 0.9);
    await wait(50);
    return { clip, mark: buildingRing(g, clip, pyramid) };
  },
};

// Version 6.0 (Track D2): the six pictures of the first moments' cards. Each opens the Version 6.0 dev scene of its danger or rule on its own city (the seed-11
// sample Capital, which replaces the game: `api` is boot's, which the pictures' tool reaches through devScene('tutorial', { picture })) and frames it as the
// card says: the map alone for a Large plot, plague and a raid's ruins; the sheet for a demand, a low Nile and locusts. The scenes lay everything through the
// sim's own commands and days, so the pictures show what the game does.
Object.assign(PICTURES, {
  // A Large plot laid and empty beside the homes, the map alone: a ring on the lot.
  async large(g, api) {
    await largePlotScene(api, { view: 'lot', quick: true, zoom: 1.5 });
    const h = api.game();
    h.ui.store.set(closeSheet(h.ui.store.get()));
    const lot = Object.values(h.world.buildings).find((b) => b.type === 'house' && b.large === true);
    if (!lot) throw new Error('devScene tutorial: no Large plot was laid');
    const clip = clipAt(200);
    putTileAt(h, lot.x + 1, lot.y + 1, 195, clip.y + 190, 1.5);
    await wait(80);
    return { clip, mark: tileRing(h, clip, lot.x + 1, lot.y + 1, 2.4) };
  },
  // The court's demand sheet, offered: a ring on the lines that say what meeting it earns and what failing it costs.
  async demand(g, api) {
    await demandScene(api, { state: 'offered', quick: true });
    const h = api.game();
    await wait(100);
    const sheet = document.querySelector('#sheet'), fv = frameOf(h);
    const clip = clipAt(Math.max(0, Math.round(sheet.getBoundingClientRect().top - fv.top - 8)));
    const lines = [...sheet.querySelectorAll('p')].filter((p) => /^(Met|Failed)/.test(p.textContent.trim()));
    if (lines.length < 2) throw new Error('devScene tutorial: the demand sheet has no Met and Failed lines');
    return { clip, mark: boxesRing(h, clip, lines, { pad: 2, radius: 12, widen: 10 }) };
  },
  // The Health layer over a crowded district with sick homes marked, the map alone: a ring on the home the plague began in.
  async plague(g, api) {
    await plagueScene(api, { look: 'layer', quick: true, zoom: 1.4 });
    const h = api.game();
    const home = fullestHome(h.world);
    const clip = clipAt(210);
    putTileAt(h, home.x + home.w / 2, home.y + home.d / 2, 195, clip.y + 185, 1.4);
    await wait(80);
    return { clip, mark: buildingRing(h, clip, home) };
  },
  // City advice with the low Nile warned as its first item: a ring on that item.
  async drought(g, api) {
    await droughtScene(api, { look: 'advice', quick: true });
    const h = api.game();
    await wait(100);
    const sheet = document.querySelector('#sheet'), fv = frameOf(h);
    const clip = clipAt(Math.max(0, Math.round(sheet.getBoundingClientRect().top - fv.top - 8)));
    const title = [...sheet.querySelectorAll('*')].find((n) => n.children.length === 0 && /^Low Nile/.test(n.textContent.trim()));
    if (!title) throw new Error('devScene tutorial: no low Nile item in City advice');
    const item = title.closest('li') || title.parentElement;
    const parts = [...item.children].filter((n) => !n.matches('button') && !n.querySelector('button') && n.getBoundingClientRect().height > 0);
    return { clip, mark: boxesRing(h, clip, parts.length ? parts : [title], { pad: 4, radius: 12, widen: 8 }) };
  },
  // A farm warned of locusts, its sheet open: a ring on the warning's line.
  async locusts(g, api) {
    await locustsScene(api, { look: 'sheet', quick: true, zoom: 1.1 });
    const h = api.game();
    await wait(100);
    const sheet = document.querySelector('#sheet'), fv = frameOf(h);
    const clip = clipAt(Math.max(0, Math.round(sheet.getBoundingClientRect().top - fv.top - 60)));
    const warn = [...sheet.querySelectorAll('p, div, span')].find((n) => n.children.length === 0 && /^Locusts warned/.test(n.textContent.trim()));
    if (!warn) throw new Error('devScene tutorial: no locust warning on the farm sheet');
    return { clip, mark: boxRing(h, clip, warn, { pad: 3, radius: 10, widen: 8 }) };
  },
  // A raid's ruins: a wrecked storehouse's rubble, under the alert for the raid from the east: a ring on the rubble.
  async raid(g, api) {
    await raidBurnScene(api, { look: 'ruins', quick: true, zoom: 1.5, hold: 100 });
    const h = api.game();
    // The goals row under the alert (a court letter to answer) is the game's own, not the card's thing: the picture shows the alert and the rubble alone.
    const goals = document.querySelector('#goals');
    if (goals) goals.style.display = 'none';
    const rubble = Object.values(h.world.buildings).filter((b) => b.type === 'rubble' && b.was && b.was.cause === 'wreck');
    if (!rubble.length) throw new Error('devScene tutorial: the raid wrecked nothing');
    const x0 = Math.min(...rubble.map((b) => b.x)), y0 = Math.min(...rubble.map((b) => b.y));
    const x1 = Math.max(...rubble.map((b) => b.x + b.w)), y1 = Math.max(...rubble.map((b) => b.y + b.d));
    const clip = clipAt(60);
    putTileAt(h, (x0 + x1) / 2, (y0 + y1) / 2, 195, clip.y + 270, 1.5);
    await wait(80);
    return { clip, mark: tileRing(h, clip, (x0 + x1) / 2, (y0 + y1) / 2, 2.2) };
  },
});

// One card's picture on the open city g ({ world, ui, cam }: boot's game, or window.__thebes in the page), and boot's api for the six first moments'
// pictures, which start a city of their own (devScene('tutorial', { picture: id }), which is how tools/tutorial.ps1 calls it): { id, clip, mark } (see the header).
export async function tutorialPicture(g, id, api = null) {
  if (!g || !g.world || !g.ui) throw new Error(`devScene tutorial: no city is open (use ${TUTORIAL_SHOT.params})`);
  const make = PICTURES[id];
  if (!make) throw new Error(`devScene tutorial: no picture named ${id} (${TUTORIAL_CARDS.map((c) => c.id).join(', ')})`);
  const card = TUTORIAL_CARDS.find((c) => c.id === id);
  if (card && card.first && !api) throw new Error(`devScene tutorial: the ${id} picture needs the page's api (devScene('tutorial', { picture: '${id}' }))`);
  const { clip, mark } = await make(g, api);
  return { id, clip, mark };
}

// The scene (see the header). api is boot's ({ phase, game, hooks }).
export async function tutorialScene(api, options = {}) {
  if (options.picture) return tutorialPicture(api.game(), options.picture, api);
  if (api.phase() !== 'title') throw new Error('devScene tutorial: open the title card (/?nosw=1)');
  api.hooks.pictureCards();
  await wait(100);
  const at = Number(options.card) || 0;
  const dialog = document.querySelector('.picture-cards');
  if (dialog) for (let i = 0; i < at; i++) dialog.querySelector('.pc-next').click();
  await wait(300);
  // The picture arrives on its own (decoding async): a shot taken before it has loaded shows the alt text in an empty
  // box (the art-direction review's item 9, a capture-timing artefact of a cold page, not a fault of the cards), so the
  // scene waits until it has loaded or failed (complete), up to 5 s, and then for it to be decoded.
  const picture = dialog && dialog.querySelector('.pc-picture');
  for (let t = 0; picture && !picture.complete && t < 5000; t += 50) await wait(50);
  if (picture && picture.naturalWidth > 0 && picture.decode) await picture.decode().catch(() => {});
  else if (picture) console.warn(`devScene tutorial: card ${at + 1}'s picture did not load (${picture.src})`);
  return `tutorial card ${at + 1}`;
}
