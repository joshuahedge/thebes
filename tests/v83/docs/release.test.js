// Version 8.3 "Lines": What's new names the changes in the game's own words; 8.2.1 carries its merge commit.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';
import { MONUMENT } from '../../../src/data/monuments.js';
import { FERRY } from '../../../src/data/ferries.js';
import { crewSpeed } from '../../../src/sim/monuments.js';
import { BRIDGE_MAX } from '../../../src/sim/bridges.js';

describe('v83 docs release: What\'s new for 8.3', () => {
  it('is the second entry with its merge commit 26dfa6d, and 8.2.1 below it carries its merge commit', () => {
    const r = RELEASES[10];
    expect([APP_VERSION, r.version, r.date, r.title, r.build]).toEqual(['10.0.3', '8.3', '2026-10-27', 'Lines', '26dfa6d'])   // Version 10.0.2: one newer entry again;
    expect([RELEASES[11].version, RELEASES[11].title, RELEASES[11].build]).toEqual(['8.2.1', 'Easier ferries', '87b5ec3']);
    expect([RELEASES[12].version, RELEASES[12].build]).toEqual(['8.2', 'c4bff18']);
  });
  it('says the crossings, Keep stocked, Supply lines, the far guilds and the camp, each note one plain sentence', () => {
    const r = RELEASES[10], text = [...r.new, ...r.fixed].join(' ');
    for (const words of ['bridge over up to 4 tiles', 'ferry over 5 to 12', 'the bar says why', 'Crossing card', 'Keep stocked', 'Fetch is now', 'Takes in', 'pick on the map', 'Supply lines', 'amber and dashed', 'Builders\' guilds', 'down to half speed', 'workers\' camp', 'a tenth', 'full speed', 'can\'t be undone'])
      expect([words, text.includes(words)]).toEqual([words, true]);
    for (const line of [...r.new, ...r.fixed]) expect([line.slice(0, 30), line.length > 10 && line.length < 330]).toEqual([line.slice(0, 30), true]);
    expect(/ruling|track [a-z]\b|\b1[0-9]{3}\b/.test(text.toLowerCase())).toBe(false);
  });
  it('says what the sim does: the limits, the full-speed distance, the floor and the camp\'s share', () => {
    const text = RELEASES[10].new.join(' ');
    expect([BRIDGE_MAX, text.includes(`bridge over up to ${BRIDGE_MAX} tiles`)]).toEqual([4, true]);
    expect([FERRY.min, FERRY.max, text.includes(`ferry over ${FERRY.min} to ${FERRY.max}`)]).toEqual([5, 12, true]);
    expect([MONUMENT.crewReach, text.includes(`full speed within ${MONUMENT.crewReach} road tiles`)]).toEqual([12, true]);
    expect([MONUMENT.crewLoss, MONUMENT.crewStep, text.includes(`${Math.round(MONUMENT.crewLoss * 100)}% slower for each further ${MONUMENT.crewStep}`)]).toEqual([0.1, 12, true]);
    expect([MONUMENT.crewFloor, crewSpeed(1000, false), text.includes('down to half speed')]).toEqual([0.5, 0.5, true]);
    expect([MONUMENT.campShare, text.includes('a tenth')]).toEqual([0.1, true]);
  });
});
