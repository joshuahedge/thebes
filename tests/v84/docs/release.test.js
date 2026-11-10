// Version 8.4 "Gold and war": What's new names the changes in the game's own words; 8.3 carries its last commit on main.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';
import { TAX_RATES } from '../../../src/data/palace.js';
import { MONUMENT } from '../../../src/data/monuments.js';
import { SCOUTS, SPOILS, RAIDS } from '../../../src/data/raids.js';

describe('v84 docs release: What\'s new for 8.4', () => {
  it('is the third entry with its last commit on main (222cb61), and 8.3 below it carries its commit', () => {
    const r = RELEASES[4];
    expect([APP_VERSION, r.version, r.date, r.title, r.build]).toEqual(['9.3', '8.4', '2026-11-07', 'Gold and war', '222cb61']);   // Version 9.2: 8.4 keeps its last commit on main (9.2 put it fourth)
    expect(RELEASES[0].version).toBe(APP_VERSION);
    expect([RELEASES[5].version, RELEASES[5].title, RELEASES[5].build]).toEqual(['8.3', 'Lines', '26dfa6d']);
    expect([RELEASES[6].version, RELEASES[6].build]).toEqual(['8.2.1', '87b5ec3']);
  });
  it('says the tax rate, Rush, the luxuries, the scouts, the raid clock, the spoils and the elephants, each note one plain sentence', () => {
    const r = RELEASES[4], text = [...r.new, ...r.fixed].join(' ');
    for (const words of ['tax rate', 'Rush this course', 'imported luxury', 'cedar', 'ivory', 'incense', 'Scouts', 'raid clock', 'captured weapons', 'Victory', 'War elephants', 'fallen elephant leaves ivory', 'no crew today'])
      expect([words, text.includes(words)]).toEqual([words, true]);
    for (const line of [...r.new, ...r.fixed]) expect([line.slice(0, 30), line.length > 10 && line.length < 330]).toEqual([line.slice(0, 30), true]);
    expect(/ruling|track [a-z]\b|\b1[0-9]{3}\b/.test(text.toLowerCase())).toBe(false);
  });
  it('says what the sim does: the rates, the rush, the scouts, the first warning and the spoils', () => {
    const text = RELEASES[4].new.join(' ');
    expect([TAX_RATES.low.factor, TAX_RATES.low.mood, TAX_RATES.high.factor, TAX_RATES.high.mood]).toEqual([0.75, 8, 1.25, -8]);
    expect(text.includes('Low (a quarter less gold, mood +8)') && text.includes('High (a quarter more gold, mood -8)')).toBe(true);
    expect([MONUMENT.rushPace, MONUMENT.rushGold, text.includes('twice the work a day for three times the work gold')]).toEqual([2, 3, true]);
    expect([SCOUTS.days, text.includes(`${SCOUTS.days} days before a raid's warning`)]).toEqual([30, true]);
    expect([RAIDS.firstWarnAfter, RAIDS.clockPeople, text.includes(`${RAIDS.firstWarnAfter} days after the city reaches ${RAIDS.clockPeople} people`)]).toEqual([300, 250, true]);
    expect([SPOILS.share, SPOILS.days, text.includes('a quarter less for a year')]).toEqual([0.25, 360, true]);
  });
});
