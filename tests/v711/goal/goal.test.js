// Version 7.1.1 (ruling 1110): one plain sentence says what the game is for, built from the sim's own data (the first and last rank in MILESTONES, the great work that wins the reign),
// and it is on the title card under the title, the opening words of the lesson's first card, and the first entry in How to play.
import { describe, it, expect } from '../../harness.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { GREAT_WORK } from '../../../src/data/reign.js';
import { V711_TEXT, D2_TEXT } from '../../../src/ui/text.js';
import { V81T_TEXT } from '../../../src/ui/v81/lessonText.js';
import { openSheet } from '../../../src/ui/modes.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { pageAt, cardOf, rect } from '../lessonPage.js';

describe('v711 goal: the sentence', () => {
  it('names the first and the last rank and the great temple, from the data', () => {
    const goal = V711_TEXT.goal();
    expect([goal.includes(MILESTONES[0].name.toLowerCase()), goal.includes(MILESTONES[MILESTONES.length - 1].name), goal.includes(BUILDINGS[GREAT_WORK.type].name.toLowerCase())]).toEqual([true, true, true]);
    expect(goal).toBe('The king has made you vizier of the village at Thebes. Make it a city fit to be named the Seat of the Two Lands, and crown your service with the great temple.');   // Version 8.1 (ruling 1205): the story
  });
  it('follows the data: rename the ranks or the great work and the sentence changes with them', () => {
    const first = MILESTONES[0].name, last = MILESTONES[MILESTONES.length - 1].name, temple = BUILDINGS[GREAT_WORK.type].name;
    try {
      MILESTONES[0].name = 'Hamlet'; MILESTONES[MILESTONES.length - 1].name = 'Throne'; BUILDINGS[GREAT_WORK.type].name = 'Grand shrine';
      expect(V711_TEXT.goal()).toBe('The king has made you vizier of the hamlet at Thebes. Make it a city fit to be named the Throne, and crown your service with the grand shrine.');
      expect(V711_TEXT.helpGoal().includes('Hamlet') && V711_TEXT.helpGoal().includes('Throne')).toBe(true);
    } finally { MILESTONES[0].name = first; MILESTONES[MILESTONES.length - 1].name = last; BUILDINGS[GREAT_WORK.type].name = temple; }
  });
  it('How to play\'s entry lists every rank in order', () => {
    const text = V711_TEXT.helpGoal();
    let at = 0;
    for (const m of MILESTONES) { const i = text.indexOf(m.name, at); expect([m.name, i >= at]).toEqual([m.name, true]); at = i; }
  });
});

describe('v711 goal: where it is shown', () => {
  it('the title card has it under the title and above Start the lesson, and the card still fits at 375x667 and 150% text, and at 390x844', async () => {
    for (const [w, h, size] of [[375, 667, 150], [375, 667, 100], [390, 844, 100], [1280, 800, 100]]) {
      const s = await pageAt(null, { width: w, height: h, textSize: size });
      try {
        const title = s.root.querySelector('#title');
        const line = title.querySelector('.title-card .goal-line');
        expect([w, size, line && line.textContent]).toEqual([w, size, V711_TEXT.goal()]);
        const start = title.querySelector('.lesson-start');
        const order = [title.querySelector('h1'), line, start].map((n) => rect(n).top);
        expect([w, order[0] < order[1] && order[1] < order[2]]).toEqual([w, true]);
        const card = title.querySelector('.title-card');
        // it fits: the card is inside the screen and needs no scrolling, and its buttons are all in view
        const c = rect(card);
        expect([w, size, c.top >= 0 && c.bottom <= h + 1, card.scrollHeight <= card.clientHeight + 1]).toEqual([w, size, true, true]);
        for (const b of title.querySelectorAll('.title-buttons > button:not([hidden])')) expect([w, size, b.className, rect(b).bottom <= c.bottom + 1]).toEqual([w, size, b.className, true]);
      } finally { s.cleanup(); }
    }
  });

  it('the first lesson card opens with it, and the later cards do not', async () => {
    const s = await pageAt('road');
    try {
      const words = cardOf(s).querySelector('.lc-words').textContent;
      expect(words.startsWith(`${V711_TEXT.goal()} `)).toBe(true);
      expect(words.endsWith(V81T_TEXT.steps.road().do)).toBe(true);                       // Version 8.1: Ipi's do line
      s.root.querySelector('.lesson-card .lc-go').click();
    } finally { s.cleanup(); }
    const t = await pageAt('homes');
    try { expect(cardOf(t).querySelector('.lc-words').textContent.includes(V711_TEXT.goal())).toBe(false); } finally { t.cleanup(); }
  });

  it('How to play has it as its first entry, open', async () => {
    const r = await rigUI();
    try {
      r.store.set(openSheet(r.store.get(), 'help'));
      const first = r.root.querySelector('#sheet details.help-section');
      expect([first.querySelector('summary h3').textContent, first.open, first.querySelector('p').textContent]).toEqual([V711_TEXT.helpGoalHead, true, V711_TEXT.helpGoal()]);
      expect(first.querySelector('p').textContent.startsWith(V711_TEXT.goal())).toBe(true);
    } finally { r.cleanup(); }
  });
});
