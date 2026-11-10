// Version 9.1 "First hours": What's new names the changes in the player's words; 9.0 below it carries its last commit on main.
import { describe, it, expect } from '../../harness.js';
import { RELEASES } from '../../../src/data/releases.js';
import { APP_VERSION } from '../../../src/data/ui.js';
import { LESSON_RAID_WAIT_SPEED } from '../../../src/data/lesson.js';

describe('v91 docs release: What\'s new for 9.1', () => {
  it('is the second entry with its last commit on main (42b1dce, Version 9.2 is newest), and 9.0 below it carries its own', () => {
    const r = RELEASES[1];
    expect([APP_VERSION, r.version, r.date, r.title, r.build]).toEqual(['9.2', '9.1', '2026-11-08', 'First hours', '42b1dce']);
    expect([RELEASES[2].version, RELEASES[2].title, RELEASES[2].build]).toEqual(['9.0', 'Dynasty', '1d937a4']);
    expect([RELEASES[3].version, RELEASES[3].build]).toEqual(['8.4', '222cb61']);
  });
  it('says the hand-over, the road marker, the shorter waits, the first city, the loading screen, the error card, Back to gold, About and memory, each note one plain sentence or two', () => {
    const r = RELEASES[1], text = [...r.new, ...r.fixed].join(' ');
    for (const words of ['Village city', 'no surprise raid', 'marker', 'triple speed, then double', 'classic river', 'Surprise me', 'Skip the lesson', 'loading screen', 'Reload', 'Export this city', 'Copy the details', 'Nothing is sent anywhere', 'Back to gold', 'Pause', 'Made by Josh', 'all rights are reserved', 'less memory'])
      expect([words, text.includes(words)]).toEqual([words, true]);
    for (const line of [...r.new, ...r.fixed]) expect([line.slice(0, 30), line.length > 10 && line.length < 330]).toEqual([line.slice(0, 30), true]);
    expect(/ruling|track [a-z]\b|\b1[0-9]{3}\b/.test(text.toLowerCase())).toBe(false);
    expect(/colou?r.?blind/i.test(text)).toBe(false);   // dropped in 9.1 (Josh)
  });
  it('says what the sim does: the raid step runs at triple speed first, as its card says', () => {
    expect([LESSON_RAID_WAIT_SPEED, RELEASES[1].new[0].includes('triple speed, then double')]).toEqual([3, true]);
  });
});
