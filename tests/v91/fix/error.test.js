// Version 9.1 fix wave (ruling 1738): the error card takes the screen alone (the picture cards sit outside #ui and are closed, without their onDone), and says only what
// is true about the save; the two strings no code read are gone.
import { describe, it, expect } from '../../harness.js';
import { V91_R_TEXT as W } from '../../../src/ui/text.js';
import { pageAt, frame } from '../../v711/lessonPage.js';

const cardsUp = () => [...document.querySelectorAll('.picture-cards')];
const errorCards = () => [...document.querySelectorAll('.v91-error')];

describe('v91 fix error: one panel at a time (ruling 1738)', () => {
  it('a picture card open when the error card shows is closed; the card is the only panel, and its onDone does not run', async () => {
    const s = await pageAt('road', { width: 375, height: 667, settings: { lessonDone: true } });
    try {
      let done = 0;
      s.api.hooks.pictureCards(() => { done += 1; });
      await frame();
      expect(cardsUp().length).toBe(1);
      s.api.rescue.loopError({ where: 'tick', error: new Error('boom') });
      await frame();
      expect([cardsUp().length, errorCards().length, done]).toEqual([0, 1, 0]);
      expect(s.api.hooks.pictureCard('road')).toBe(true);   // the card tracker is clear: nothing is stuck open behind the error
      s.api.hooks.closeCards();
      expect(cardsUp().length).toBe(0);
    } finally { s.cleanup(); }
  });
});

describe('v91 fix error: the card says only what is true', () => {
  it('the tainted card says the city was last saved this month (a save also happens when the tab is hidden), and Reload says it goes back to the last save', () => {
    expect([W.taintedSaved.includes('start of'), W.reloadSaveWhy.includes('start of')]).toEqual([false, false]);
    expect(W.taintedSaved).toBe('Your city was last saved this month.');
  });
  it('the dead strings are gone: no limitHead, no where.storm', () => {
    expect(['limitHead' in W, 'storm' in W.where]).toEqual([false, false]);
  });
});
