// Version 6.0, Track D2 (rulings 760-779): the picture cards at their first moments. Six cards (src/data/tutorial.js, the ones with a `first`) are not
// part of the cards read before a first city: each opens alone, once a device, the first time its thing happens in a city the player is playing.
// MOMENTS gives each its sign in the sim (a Large plot's card unlocking, a demand offered, a plague, a low Nile or locusts warned, a raid warned).
// It looks when the game loop reports events (a month ending, a warning raised: never on a command, so a paused scene, a test that places something or
// a city just loaded shows nothing until a day has passed), not while a tool is in hand, a sheet or a question is open or a tip is showing (the next
// batch of events tries again), and never under Help: Off (as tips are not shown). A card shown is marked seen at once, in the device's seenTips as "card:<id>" (a list of
// strings the settings keep as given); the lesson's game shows none (its settings say every card is seen), because the lesson teaches the same things.
import { TUTORIAL_CARDS } from '../data/tutorial.js';
import { largePlotUnlocked } from '../sim/largePlots.js';
import { courtDemands } from '../sim/demands.js';
import { isToolMode } from './modes.js';

const warned = (k) => Boolean(k && (k.warning || k.active));
export const MOMENTS = {
  largePlot: (world) => largePlotUnlocked(world),
  demand: (world) => courtDemands(world).length > 0,
  plague: (world) => warned(world.hazards && world.hazards.plague),
  drought: (world) => warned(world.hazards && world.hazards.drought),
  locusts: (world) => warned(world.hazards && world.hazards.locusts),
  raid: (world) => Boolean(world.raid.warning || world.raid.active),
};

export const seenKey = (id) => `card:${id}`;

// The cards whose moment has come and that this device has not shown, in the cards' order.
export function dueCards(world, seenTips) {
  const seen = Array.isArray(seenTips) ? seenTips : [];
  return TUTORIAL_CARDS.filter((c) => c.first && !seen.includes(seenKey(c.id)) && MOMENTS[c.first] && MOMENTS[c.first](world));
}

export function createCardMoments(ctx) {
  const inert = { onEvents() {}, destroy() {} };
  if (!ctx || !ctx.world || !ctx.hooks || typeof ctx.hooks.pictureCard !== 'function') return inert;
  const { world, store, settings, hooks } = ctx;
  let destroyed = false;
  // A tip on screen (the raid warning's own tip comes in the same batch of events as the raid card's moment): the card waits for it to go, as it waits for a
  // sheet, so the player never has a tip and a card to read at once.
  const tipEl = ctx.root && ctx.root.querySelector ? ctx.root.querySelector('#tip') : null;
  const tipUp = () => Boolean(tipEl) && Boolean(tipEl.querySelector('.tip-row'));
  return {
    onEvents(events) {
      if (destroyed || !events || !events.length) return;
      const s = settings.get();
      if (s.help === 'off') return;
      const due = dueCards(world, s.seenTips);
      if (!due.length) return;
      const ui = store.get();
      if (isToolMode(ui.mode) || ui.sheet || ui.confirmDialog || ui.screenshot || tipUp()) return;
      const card = due[0];
      if (hooks.pictureCard(card.id) === false) return;   // other cards are open: it is tried again at the next events, and not marked seen
      settings.set({ seenTips: [...(Array.isArray(s.seenTips) ? s.seenTips : []), seenKey(card.id)] });
    },
    destroy() { destroyed = true; },
  };
}
