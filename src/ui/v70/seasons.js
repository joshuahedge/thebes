// Version 7.0, Track S: the interface of seasons, light and sound (rulings 930-959), the seam (src/ui/s46/seam.js shape) createV70Seams
// makes once a game. Track S fills what it needs here: the sound cues from the sim's events and the days (onEvents, refresh), the two tips
// (the first turn of the season, the first night). The top bar's season (src/ui/hud.js) and the Settings rows
// "Day and night", Music and Effects volumes (src/ui/menu.js's Settings part; the keys dayNight and effectsVolume are in src/ui/settings.js)
// are Track S's parts of those files. Track S owns this file. Render-only: nothing here enters the sim or the save.
//
// The cues (ruling 938), each a short code-made effect (src/audio/sfx.js) at the Effects volume, at most one of a kind every few seconds:
//   fire     a building catches fire or a blaze grows (a fire event)          battle   a raid begins, strikes or wrecks (raid_start, raid_strike, raid_wreck)
//   bells    a caravan arrives by land (a caravan event)                       oars     a caravan arrives by river (the partner's `by` is 'river', Track T)
//   market   a bustle, no oftener than MARKET_SOUND.everyDays game days, only while the view is within MARKET_SOUND.within tiles of a bazaar
// The place and road effects were already played by createUI as the commands ran.
import { seamBase } from '../s46/seam.js';
import { seasonAt } from '../../sim/seasons.js';
import { allBuildings } from '../../sim/world.js';
import { hash2 } from '../../sim/rng.js';
import { PARTNERS } from '../../data/trade.js';
import { SEASON_SALT, MARKET_SOUND } from '../../data/seasons.js';
import { lightShown } from '../../render/light.js';
import { SEASON_TEXT } from '../text.js';

const COOLDOWN_MS = { fire: 4000, battle: 1500, bells: 2500, oars: 2500 };

// Whether a bazaar stands within `within` tiles of the tile the view is centred on.
export function bazaarInView(world, centre, within = MARKET_SOUND.within) {
  if (!centre) return false;
  return allBuildings(world).some((b) => b.type === 'bazaar' && Math.hypot(b.x + b.w / 2 - centre.x, b.y + b.d / 2 - centre.y) <= within);
}

// Whether the market's bustle plays on this day: the first day on or after `last` + everyDays whose seeded draw says yes (about one in three, so the
// gaps are not regular). Pure of the day and the seed.
export function marketDay(world, day, last) {
  if (last !== null && day - last < MARKET_SOUND.everyDays) return false;
  return hash2(day, 5, (world.seed + SEASON_SALT.sound) | 0) < 1 / 3;
}

export function createSeasonsUi(ctx) {
  const base = seamBase();
  if (!ctx || !ctx.world) return base;
  const world = ctx.world, sfx = ctx.sfx;
  const tip = (trigger) => { if (typeof ctx.fireTip === 'function') ctx.fireTip(trigger); };
  const clock = typeof ctx.now === 'function' ? ctx.now : () => 0;
  const lastAt = {};                                      // cue -> the real time it last played
  let season = seasonAt(world).season;                    // the season the city is in now: a new one at a month's end is a turn
  let lastDay = world.day, lastMarket = null;

  function cue(name) {
    if (!sfx || typeof sfx.play !== 'function') return;
    const t = clock();
    if (lastAt[name] !== undefined && t - lastAt[name] < COOLDOWN_MS[name]) return;
    lastAt[name] = t;
    sfx.play(name);
  }

  return {
    ...base,
    onEvents(events) {
      for (const e of events || []) {
        if (e.type === 'fire' || (e.type === 'fire_grow' && !e.covered)) cue('fire');
        else if (e.type === 'raid_start' || e.type === 'raid_strike' || e.type === 'raid_wreck') cue('battle');
        else if (e.type === 'caravan') cue(PARTNERS[e.partner] && PARTNERS[e.partner].by === 'river' ? 'oars' : 'bells');
        else if (e.type === 'month') {
          const now = seasonAt(world).season;
          if (now !== season) { season = now; tip('seasonTurns'); }
        }
      }
    },
    // Once a game day (createUI refreshes the chrome when the day moves, and after commands): the market's bustle, and the first night's tip.
    refresh() {
      if (world.day !== lastDay) {
        const day = world.day;
        lastDay = day;
        if (world.speed > 0 && ctx.cameraControl && marketDay(world, day, lastMarket) && bazaarInView(world, ctx.cameraControl.centreTile())) {
          lastMarket = day;
          if (sfx && typeof sfx.play === 'function') sfx.play('market');
        }
      }
      if (lightShown().phase === 'night') tip('nightFalls');
    },
  };
}
