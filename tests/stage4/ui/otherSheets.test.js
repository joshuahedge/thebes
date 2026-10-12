// Track C, Task C2: the finished monument's, the supply buildings' and the palace's sheets, Demolish's question, Undo's words
// for a site with work begun and the plaza toast (spec 4.16, 4.20, 6.3; rulings 236, 258, 271-275). Words checked against the
// sim's own functions with the world set up both ways; Track A's state and functions are handed in to the contract's shapes.
import { describe, it, expect } from '../../harness.js';
import { finishedRows, supplyLine, palaceRows, enlargeModel, demolishQuestion, prestigeLoss, homesMadeNicer } from '../../../src/ui/monumentSheet.js';
import { prestigeOf, prestigeOfBuilding } from '../../../src/sim/monuments.js';
import { palaceQuote } from '../../../src/sim/palace.js';
import { demolishRefundFor } from '../../../src/sim/commands.js';
import { MONUMENTS } from '../../../src/data/monuments.js';
import { UI4_TEXT } from '../../../src/ui/text.js';
import { cardInfo } from '../../../src/ui/cards.js';
import { openSheet } from '../../../src/ui/modes.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';

function city(milestone = 'capital') {
  const w = makeTestWorld({ gold: 20000 });
  setRoad(w, 0, 10, 31, 10);
  w.milestone = milestone;
  return w;
}
const done = (w, type, x, y, day = 400) => { const b = addRaw(w, type, x, y); Object.assign(b.site, { course: MONUMENTS[type].courses.length, done: day }); return b; };
const text = (rows) => Object.fromEntries(rows.map((r) => [r.key, r.text]));

describe('s4 ui a finished monument\'s sheet', () => {
  it('says the day it was finished, its prestige or which other holds it, and the homes it makes nicer', () => {
    const w = city();
    const b = done(w, 'colossus', 20, 11, 400);                                      // day 400: month 13, year 2 month 2
    expect(text(finishedRows(w, b))).toEqual({ finished: 'Finished in year 2, month 2', prestige: 'Counts for prestige: 50', nicer: 'Makes no homes nicer yet' });
    addRaw(w, 'house', 23, 11, { tier: 2, residents: 5 });
    expect([homesMadeNicer(w, b), text(finishedRows(w, b)).nicer]).toEqual([1, 'Makes 1 home nicer']);
    const older = done(w, 'colossus', 26, 11, 200);
    expect([text(finishedRows(w, older)).prestige, text(finishedRows(w, b)).prestige]).toEqual([UI4_TEXT.otherCounts('colossus'), 'Counts for prestige: 50']);
    expect(text(finishedRows(w, older)).prestige).toBe('The other colossus counts for prestige');
  });
});

describe('s4 ui the supply buildings\' sheets', () => {
  // Track A's crewPlan (guild id -> site id) and deliverySites (the sites a quarry sends to, nearest first) in the contract's shapes.
  const planOf = (entries) => () => new Map(entries);
  it('says where a guild\'s crew works, or that no site in reach has room', () => {
    const w = city();
    const g = addRaw(w, 'builders_guild', 20, 11);
    const site = addRaw(w, 'mastaba_small', 12, 11);
    // The sim comes in through the argument in Track A's contract shapes, so the line does not depend on which crewPlan this branch has.
    const sim = (plan, at) => ({ crewPlan: planOf(plan), guildSite: () => at });
    expect(supplyLine(w, g, sim([], null))).toBe("Idle: no monument site within 12 road tiles has room for a crew");
    expect(supplyLine(w, g, sim([[g.id, site.id]], site.id))).toBe('Crew at work on the small mastaba');
    g.paused = true;
    expect(supplyLine(w, g, sim([[g.id, site.id]], site.id))).toBe('');
  });

  it('says a guild planned for a site but not at work is short of workers or on fire, not idle', () => {
    const w = city();
    const g = addRaw(w, 'builders_guild', 20, 11);
    const site = addRaw(w, 'mastaba_small', 12, 11);
    const sim = (plan) => ({ crewPlan: planOf(plan), guildSite: () => null });       // site.crews holds only guilds at work
    expect(supplyLine(w, g, sim([[g.id, site.id]]))).toBe('Short of workers: the crew for the small mastaba cannot start');
    g.fire = { stage: 'fire', days: 1 };
    expect(supplyLine(w, g, sim([[g.id, site.id]]))).toBe('On fire: the crew for the small mastaba cannot work');
    g.fire = null;
    expect(supplyLine(w, g, sim([]))).toBe("Idle: no monument site within 12 road tiles has room for a crew");     // not in the plan
    expect(supplyLine(w, g, { crewPlan: planOf([[g.id, site.id]]), guildSite: () => site.id })).toBe('Crew at work on the small mastaba');
  });

  it('says which site a quarry or brickworks sends to (the nearest that wants it), that it idles when no site needs its material, or nothing while it works', () => {
    const w = city();
    const q = addRaw(w, 'quarry', 20, 11), k = addRaw(w, 'brickworks', 24, 11);
    const near = addRaw(w, 'colossus', 17, 11), far = addRaw(w, 'obelisk_small', 12, 11);
    const sim = (needed, sites = []) => ({ supplyNeeded: () => needed, deliverySites: () => sites, crewPlan: planOf([]), guildSite: () => null });
    expect([supplyLine(w, q, sim(true)), supplyLine(w, k, sim(true))]).toEqual(['', '']);                // the storehouse route: no site, no line
    expect([supplyLine(w, q, sim(false)), supplyLine(w, k, sim(false))]).toEqual(['Idle: no monument site needs stone within reach', 'Idle: no monument site needs bricks within reach']);
    expect(supplyLine(w, q, sim(true, [near, far]))).toBe('Sends stone to the colossus');               // two sites: the first deliverySites names
    expect(supplyLine(w, q, sim(true, [far, near]))).toBe('Sends stone to the small obelisk');
    // A paused site in reach is no use: supplyNeeded is false, so it idles however the site's makers list reads.
    expect(supplyLine(w, q, sim(false, [near]))).toBe('Idle: no monument site needs stone within reach');
    q.paused = true;
    expect(supplyLine(w, q, sim(true, [near]))).toBe('');
  });

  it('says a working quarry cuts stone on its sheet while a site needs stone', async () => {
    const w = city();
    const q = addRaw(w, 'quarry', 20, 11, { staff: 10 });
    addRaw(w, 'obelisk_small', 12, 11);                                              // an open site on the road, within reach, that needs stone
    const r = await rigUI({ width: 1280, height: 800, world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'info', q.id));
      expect([...r.root.querySelectorAll('#sheet .work-status')].map((n) => n.textContent).includes('Cutting stone')).toBe(true);
    } finally { r.cleanup(); }
  });
});

describe('s4 ui the palace\'s sheet', () => {
  it('says its style, its desirability and mood while a road touches it, and the works\' days left', () => {
    const w = city('market_town');
    const b = addRaw(w, 'palace', 20, 11);
    expect(text(palaceRows(w, b))).toEqual({ style: 'Style: Courtyard house', nicer: 'Makes homes nicer up to 4 tiles away (+4 beside it)', mood: 'Mood: none until it is enlarged' });
    b.style = 2;
    expect(text(palaceRows(w, b))).toEqual({ style: 'Style: Pylons and banners', nicer: 'Makes homes nicer up to 6 tiles away (+8 beside it)', mood: 'Mood: +2' });
    b.works = { style: 3, left: 12 };
    expect(text(palaceRows(w, b)).works).toBe('Enlarging to a gilded palace: 12 days left');
    const far = makeTestWorld();
    far.milestone = 'town';
    const lone = addRaw(far, 'palace', 20, 14);
    const rows = palaceRows(far, lone);
    expect([text(rows).road, rows.find((r) => r.key === 'road').fix.showMe.item, text(rows).mood]).toEqual(['No road yet: no desirability or mood until a road touches it', 'road', undefined]);
  });

  it('names the next style and its price, or why Enlarge waits, from palaceQuote', () => {
    const w = city('town');
    w.gold = 1000;
    const b = addRaw(w, 'palace', 20, 11);
    const m = () => enlargeModel(w, b);
    expect([palaceQuote(w, b.id).reason, m().ok, m().text]).toEqual(['locked', false, 'A columned hall comes with Market town']);
    w.milestone = 'market_town';
    expect([m().ok, m().text]).toEqual([true, 'Enlarge to a columned hall: 600 gold']);
    w.gold = 500;
    expect([m().ok, m().text]).toEqual([false, "You have 500 gold: enlarging can't put the treasury below 0"]);
    w.gold = 5000; w.difficulty = 'hard';
    expect(m().text).toBe('Enlarge to a columned hall: 750 gold');
    b.style = 1;
    expect(m().text).toBe('Painted pylons come with City');
    w.milestone = 'capital';
    b.works = { style: 2, left: 12 };
    expect(m().text).toBe('One enlargement at a time: 12 days left');
    b.works = null; b.style = 4;
    expect(m().text).toBe('The palace is at its grandest');
    const far = makeTestWorld({ gold: 5000 });
    far.milestone = 'capital';
    expect(enlargeModel(far, addRaw(far, 'palace', 20, 14)).text).toBe('The palace needs a road first');
  });

  it('asks before enlarging, pays at once, and says when the works end; its card leads to it once it stands', async () => {
    const w = city('market_town');
    w.gold = 1000;
    const r = await rigUI({ width: 1280, height: 800, world: w });
    try {
      expect(cardInfo(r.world, 'palace').costText).toBe('300 gold');
      r.ui.placement.start({ kind: 'building', type: 'palace' });
      r.ui.placement.moveGhost(20, 11);
      const id = r.ui.placement.confirm().id;
      r.ui.placement.cancel();
      expect(cardInfo(r.world, 'palace').costText).toBe('Your palace stands: tap to visit it');
      r.ui.placement.start({ kind: 'building', type: 'palace' });
      expect([r.store.get().mode, r.store.get().sheet]).toEqual(['selected', { kind: 'info', id }]);
      const gold = r.world.gold;
      fire(r.root.querySelector('#sheet .actions .enlarge'), 'click');
      expect(r.root.querySelector('#dialog').textContent.includes('Enlarge the palace to a columned hall for 600 gold? It is paid at once and cannot be undone.')).toBe(true);
      fire(r.root.querySelector('#dialog .ok'), 'click');
      expect([r.world.gold, r.world.buildings[id].works]).toEqual([gold - 600, { style: 1, left: 30 }]);
      expect(r.root.querySelector('#toasts').textContent.includes('Enlarging to a columned hall: ready in 30 days')).toBe(true);
      expect(r.root.querySelector('#sheet .actions .enlarge').disabled).toBe(true);
      const shown = [];
      r.ui.celebrations.show = (item) => shown.push(item.text);
      r.ui.onEvents([{ type: 'palace_done', id, style: 1 }]);
      expect(shown).toEqual(['The palace is now a columned hall']);
    } finally { r.cleanup(); }
  });
});

describe('s4 ui demolishing, undoing and plazas', () => {
  it('asks before tearing down a monument or the palace, naming what is lost and the refund', () => {
    const w = city();
    const s = addRaw(w, 'pyramid_small', 12, 11);
    s.site.course = 7;
    expect(demolishQuestion(w, s)).toBe('Tear down the small pyramid? 7 of 8 courses are lost. The city loses 70 prestige. Refunds 750 gold (a quarter of its founding).');
    expect(demolishRefundFor(w, s)).toBe(750);
    const first = addRaw(w, 'pyramid_small', 20, 20);
    first.site.course = 8; first.site.done = 5;                                     // the first holds the kind's prestige now
    expect(demolishQuestion(w, s)).toBe('Tear down the small pyramid? 7 of 8 courses are lost. Refunds 750 gold (a quarter of its founding).');
    // The city counts the best of each kind: tearing down the holder drops it to the runner-up (160 to 70), a loss of 90, not 160.
    expect([prestigeOfBuilding(first), prestigeOf(w), prestigeLoss(w, first), prestigeLoss(w, s)]).toEqual([160, 160, 90, 0]);
    expect(demolishQuestion(w, first)).toBe('Tear down the small pyramid? It is lost, and the city loses 90 prestige. Refunds 750 gold (a quarter of its founding).');
    s.site.course = 0;                                                               // a second of the kind at 0 holds nothing: the first's loss is all of 160
    expect(demolishQuestion(w, first)).toBe('Tear down the small pyramid? It is lost, and the city loses 160 prestige. Refunds 750 gold (a quarter of its founding).');
    expect(demolishQuestion(w, addRaw(w, 'obelisk_small', 26, 11))).toBe('Tear down the small obelisk? Refunds 37 gold (a quarter of its founding).');
    const p = addRaw(w, 'palace', 2, 20);
    p.style = 3;
    expect(demolishQuestion(w, p)).toBe('Tear down the palace? Its 3 enlargements are lost. Refunds 75 gold.');
    p.style = 0;
    expect(demolishQuestion(w, p)).toBe('Tear down the palace? Refunds 75 gold.');
    expect(demolishQuestion(w, addRaw(w, 'granary', 26, 14))).toBe(null);
  });

  it('demolishes a site only once the question is answered', async () => {
    const w = city();
    const s = addRaw(w, 'obelisk_small', 20, 11);
    const r = await rigUI({ width: 1280, height: 800, world: w });
    try {
      r.store.set(openSheet(r.store.get(), 'info', s.id));
      fire(r.root.querySelector('#sheet .actions .demolish'), 'click');
      expect([Boolean(r.world.buildings[s.id]), r.root.querySelector('#dialog').hidden]).toEqual([true, false]);
      fire(r.root.querySelector('#dialog .ok'), 'click');
      expect(Boolean(r.world.buildings[s.id])).toBe(false);
    } finally { r.cleanup(); }
  });

  it('says Undo cannot take back a site once work has begun on it, and toasts the plazas laid', async () => {
    const w = city();
    const r = await rigUI({ width: 1280, height: 800, world: w });
    try {
      r.ui.placement.start({ kind: 'building', type: 'obelisk_small' });
      r.ui.placement.moveGhost(20, 11);
      const id = r.ui.placement.confirm().id;
      r.world.buildings[id].site.course = 1;
      r.ui.placement.undo();
      expect([Boolean(r.world.buildings[id]), r.world.undo.length]).toEqual([true, 0]);
      expect(r.root.querySelector('#toasts').textContent.includes('Work has begun on the small obelisk: demolish it instead')).toBe(true);
      r.ui.placement.start({ kind: 'plazas' });
      r.ui.placement.pointAt(16, 12);
      r.ui.placement.pointAt(17, 12);
      r.ui.placement.confirm();
      expect(r.root.querySelector('#toasts').textContent.includes('2 plazas laid')).toBe(true);
    } finally { r.cleanup(); }
  });
});
