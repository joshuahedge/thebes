// Version 8.1 Track T (rulings 1202-1205, 1211): the story and Ipi's words. The chapters cover the steps in order, one idea each; every line Ipi says (a step's why and do
// together, a reaction, the dimmed tap, the hand-over, a rank-up) is at most two short sentences; and every number in them is the sim's own, set up both ways.
import { describe, it, expect } from '../../harness.js';
import { LESSON_STEPS, LESSON_CHAPTERS } from '../../../src/data/lesson.js';
import { MILESTONES } from '../../../src/data/progression.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { GREAT_WORK } from '../../../src/data/reign.js';
import { lessonWorld, replayTo, lessonAt, chapterAt, LESSON_LENGTH, LESSON_SCRIPT } from '../../../src/sim/lesson.js';
import { setSpeed } from '../../../src/sim/commands.js';
import { tickDay } from '../../../src/sim/clock.js';
import { lessonFacts } from '../../../src/ui/lesson.js';
import { beatText } from '../../../src/ui/v60/lesson.js';
import { V81T_TEXT } from '../../../src/ui/v81/lessonText.js';
import { V711_TEXT, T, TRAY_TEXT } from '../../../src/ui/text.js';

const index = (id) => LESSON_STEPS.findIndex((s) => s.id === id);
const atStep = (id) => { const w = lessonWorld(); replayTo(w, index(id)); return w; };
// A sentence ends with . ! or ? followed by a space or the end ("2.5" is no end). Short: 14 words or fewer.
const sentences = (s) => s.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).filter(Boolean);
const short = (s) => sentences(s).every((x) => x.split(/\s+/).length <= 14);
const ipiLine = (s) => typeof s === 'string' && s.length > 0 && sentences(s).length <= 2 && short(s);

describe('v81 t words: the story', () => {
  it('the goal sentence is the story: the king, the vizier, Thebes, and the first and last ranks and the great temple from the data', () => {
    const g = V711_TEXT.goal();
    for (const part of ['The king', 'vizier', 'Thebes', MILESTONES[0].name.toLowerCase(), MILESTONES[MILESTONES.length - 1].name, BUILDINGS[GREAT_WORK.type].name.toLowerCase()]) expect([part, g.includes(part)]).toEqual([part, true]);
    expect([sentences(g).length, V711_TEXT.helpGoal().startsWith(g)]).toEqual([2, true]);
  });
  it('never uses the forbidden word (ruling 1216): the story\'s files say "the king"', async () => {
    for (const f of ['/src/ui/v81/lessonText.js', '/src/ui/v81/scribe.js', '/src/ui/v60/lesson.js', '/src/ui/text.js']) {
      const src = await (await fetch(f)).text();
      expect([f, /pharaoh/i.test(src)]).toEqual([f, false]);
    }
  });
  it('a rank-up is one line from Ipi for every rank, the last naming the great temple', () => {
    for (const m of MILESTONES.slice(1)) {
      const line = V81T_TEXT.rankUp(m.name);
      expect([m.id, ipiLine(line), line.startsWith('The king'), line.toLowerCase().includes(m.name.toLowerCase())]).toEqual([m.id, true, true, true]);
    }
    expect(V81T_TEXT.rankUp(MILESTONES[MILESTONES.length - 1].name).includes(BUILDINGS[GREAT_WORK.type].name.toLowerCase())).toBe(true);
  });
  it('the hand-over, the dimmed tap and the Advice sheet are in Ipi\'s voice', () => {
    expect([ipiLine(V81T_TEXT.handover), V81T_TEXT.handover.startsWith('From here, Thebes is yours.')]).toEqual([true, true]);
    for (const c of LESSON_CHAPTERS) expect([c.id, ipiLine(V81T_TEXT.refused(c.id)), V81T_TEXT.refused(c.id).endsWith('the rest comes soon.')]).toEqual([c.id, true, true]);
    expect(V81T_TEXT.refused('roads')).toBe('First the road; the rest comes soon.');
    expect([TRAY_TEXT.adviceHead, ipiLine(T.adviceLead)]).toEqual(['Ipi suggests', true]);
  });
});

describe('v81 t words: the chapters', () => {
  it('are six or seven runs of the steps in order, one idea each, covering every step once; every chapter but Roads has two to four steps', () => {
    expect(LESSON_CHAPTERS.length >= 6 && LESSON_CHAPTERS.length <= 7).toBe(true);
    expect(LESSON_CHAPTERS.flatMap((c) => c.steps)).toEqual(LESSON_STEPS.map((s) => s.id));
    for (const c of LESSON_CHAPTERS) expect([c.id, c.id === 'roads' || (c.steps.length >= 2 && c.steps.length <= 4)]).toEqual([c.id, true]);   // ruling 1203: the road is one stroke
    expect(LESSON_CHAPTERS.map((c) => c.id)).toEqual(['roads', 'homes', 'water', 'food', 'work', 'fire', 'defence']);
  });
  it('chapterAt says each step\'s chapter, its place in it, and whether it opens it', () => {
    let k = 0;
    for (const [ci, c] of LESSON_CHAPTERS.entries()) {
      c.steps.forEach((id, j) => {
        expect([id, chapterAt(k)]).toEqual([id, { index: ci, id: c.id, first: j === 0, k: j + 1, of: c.steps.length }]);
        k++;
      });
    }
    expect(chapterAt(LESSON_LENGTH)).toBe(null);
  });
  it('every chapter has a name and a why, each one short sentence', () => {
    for (const c of LESSON_CHAPTERS) {
      const w = V81T_TEXT.chapters[c.id];
      expect([c.id, Boolean(w && w.name), sentences(w.why).length, short(w.why)]).toEqual([c.id, true, 1, true]);
    }
  });
});

describe('v81 t words: every step\'s why and do', () => {
  it('are two short sentences together, at every step as the lesson reaches it, paused and playing', () => {
    const wrong = [];
    for (const s of LESSON_STEPS) {
      const w = atStep(s.id);
      for (const speed of [0, 1]) {
        setSpeed(w, speed);
        const f = lessonFacts(w, s), words = V81T_TEXT.steps[s.id](f);
        const line = `${words.why} ${words.do}`;
        if (!ipiLine(line) || sentences(words.why).length !== 1 || sentences(words.do).length !== 1) wrong.push(`${s.id} @${speed}: ${line}`);
      }
    }
    expect(wrong).toEqual([]);
  });
  it('say the sim\'s own numbers: the road\'s tiles, the homes, the well\'s and the bazaar\'s reach, the people and the months', () => {
    const f = lessonFacts(lessonWorld(), LESSON_STEPS[0]);
    const say = (id) => { const x = V81T_TEXT.steps[id]({ ...f, paused: false }); return `${x.why} ${x.do}`; };
    const n = (id) => LESSON_STEPS[index(id)].check;
    expect([say('road').includes(`${n('road').n} tiles`), say('homes').includes(`${n('homes').n} housing plots`), say('families').includes(`${n('families').n} people`), say('month').includes(`${n('month').n} months`)]).toEqual([true, true, true, true]);
    expect([say('well').includes(`${BUILDINGS.well.reach} road tiles`), say('well').includes(`${n('well').homes} homes`), say('bazaar').includes(`${BUILDINGS.bazaar.reach} road tiles`), say('firehouse').includes(`${BUILDINGS.firehouse.reach} road tiles`)]).toEqual([true, true, true, true]);
  });
  it('follow the city both ways: Press Play only while paused on a step that waits on the game; the workers\' numbers; the raid warning; the bazaar gone', () => {
    const fam = atStep('families');
    setSpeed(fam, 0);
    expect(V81T_TEXT.steps.families(lessonFacts(fam, LESSON_STEPS[index('families')])).do.startsWith('Press Play')).toBe(true);
    setSpeed(fam, 1);
    expect(V81T_TEXT.steps.families(lessonFacts(fam, LESSON_STEPS[index('families')])).do.startsWith('Press Play')).toBe(false);
    const wk = atStep('workers'), wf = lessonFacts(wk, LESSON_STEPS[index('workers')]);
    expect(V81T_TEXT.steps.workers(wf).why).toBe(`Buildings want ${wk.labour.jobs} workers; ${wk.labour.workforce} can work.`);
    const tw = atStep('tower');
    setSpeed(tw, 1);
    for (let d = 0; d < 60 && !tw.raid.warning; d++) tickDay(tw);
    const tf = lessonFacts(tw, LESSON_STEPS[index('tower')]);
    expect([Boolean(tf.warning), V81T_TEXT.steps.tower(tf).why.includes(`${tf.warning.size} raiders come from the ${tf.warning.dir}`)]).toEqual([true, true]);
    expect(V81T_TEXT.steps.tower({ ...tf, warning: null, paused: true }).do).toBe('Press Play to hear the warning.');
    expect(V81T_TEXT.steps.firehouse({ ...tf, missing: 'bazaar' }).why).toBe('The bazaar is gone.');
  });
});

describe('v81 t words: the reaction after each step', () => {
  it('names what was done in one short sentence, from the city as the step ends', () => {
    const wrong = [];
    const w = lessonWorld();
    const io = { tick: () => tickDay(w), did() {} };
    for (let at = lessonAt(w, 0); at < LESSON_LENGTH; at = lessonAt(w, at + 1)) {
      const s = LESSON_STEPS[at];
      LESSON_SCRIPT[s.id](w, io);
      const line = beatText(w, s);
      if (!ipiLine(line) || sentences(line).length !== 1) wrong.push(`${s.id}: ${line}`);
      if (s.id === 'road' && !line.includes(`${s.check.n} new tiles`)) wrong.push(`road: ${line}`);
      if (s.id === 'families' && !/\d+ people live in Thebes now\./.test(line)) wrong.push(`families: ${line}`);
    }
    expect(wrong).toEqual([]);
    expect(beatText(w, LESSON_STEPS[index('raid')])).toBe(w.raid.last.won ? 'The raiders turned back: Thebes is safe.' : 'The raiders got through; more towers would stop them.');
  });
});
