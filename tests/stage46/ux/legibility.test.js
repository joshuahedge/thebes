// Rulings 404-406: what the legibility review (HUD at 390x844 and 1280x800, 100% and 150% text, Gentle) found and fixed. Each test names the finding.
import { describe, it, expect } from '../../harness.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { fire } from '../../helpers/dom.js';
import { openSheet } from '../../../src/ui/modes.js';
import { contrastRatio, TOKENS } from '../../../src/ui/theme.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { chariot, raiderChariot } from '../../../src/render/art/armies.js';
import { makeCanvas } from '../../helpers/canvas.js';

describe('s46 ux legibility', () => {
  it('F1: the overlay legend keeps its words on a wide screen under an alert (a dot and a ring alone explain nothing)', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      document.body.classList.add('has-banner');
      r.store.set({ overlay: 'water' });
      r.frame(16);
      const words = [...r.root.querySelectorAll('#legend .strip .text')];
      expect(words.length).toBeGreaterThan(1);
      for (const w of words) {
        const box = w.getBoundingClientRect();
        expect([w.textContent, box.width > 8, box.height > 8]).toEqual([w.textContent, true, true]);   // not the 1 px sr-only clip
      }
    } finally { r.cleanup(); }
  });
  it('F2: at 150% text the bottom category row scrolls sideways instead of running off the phone or touching its neighbours', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.world.milestone = 'capital';                                         // all seven categories
      r.ui.settings.set({ textSize: 150 });
      r.ui.refresh();
      const cats = r.root.querySelector('#dock .cats');
      expect(cats.querySelectorAll('.cat').length).toBe(7);
      expect(getComputedStyle(cats).overflowX).toBe('auto');
      expect(cats.scrollWidth > cats.clientWidth).toBe(true);                // seven labels do not fit: it scrolls
      const boxes = [...cats.querySelectorAll('.cat')].map((c) => c.getBoundingClientRect());
      for (let i = 1; i < boxes.length; i++) expect([i, boxes[i].left >= boxes[i - 1].right - 0.5]).toEqual([i, true]);   // no label sits on another
      expect(boxes[0].left >= cats.getBoundingClientRect().left - 0.5).toBe(true);   // the first is not cut off at the left
      cats.scrollLeft = cats.scrollWidth;
      expect(cats.scrollLeft > 0).toBe(true);                                // the last one can be reached
      r.ui.settings.set({ textSize: 100 });
      expect(getComputedStyle(r.root.querySelector('#dock .cats')).overflowX === 'auto').toBe(false);   // at 100% it is the plain even row
    } finally { r.cleanup(); }
  });
  it('F3: on a wide screen the confirm bar gives its words the full row, the buttons under them', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    r.renderer.renderFrame = () => {};
    try {
      r.store.set({ category: 'roads' });
      const card = [...r.root.querySelectorAll('#panel .cards .card')].find((c) => /road/i.test(c.textContent));
      fire(card, 'click');
      r.ui.placement.pointAt(3, 14);
      r.ui.placement.pointAt(8, 14);
      const bar = r.root.querySelector('#confirm .confirm'), info = bar.querySelector('.info');
      expect(info.getBoundingClientRect().width >= bar.getBoundingClientRect().width - 40).toBe(true);   // nearly the whole bar, not a 60 px column
      const ok = bar.querySelector('.ok').getBoundingClientRect();
      expect(ok.top >= info.getBoundingClientRect().bottom - 0.5).toBe(true);   // the buttons sit under the words
      expect(ok.right <= bar.getBoundingClientRect().right + 0.5).toBe(true);
    } finally { r.cleanup(); }
  });
  it('F4: a sheet\'s heading cartouche has two round ends and a thin tie that crosses the loop end, not a bar floating inside it that reads as a text cursor', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.store.set(openSheet(r.store.get(), 'summary'));
      const h2 = r.root.querySelector('#sheet .head h2');
      const cs = getComputedStyle(h2), tie = getComputedStyle(h2, '::after'), box = h2.getBoundingClientRect();
      expect(parseFloat(cs.borderTopRightRadius) >= box.height / 2 - 0.5).toBe(true);
      expect(Math.abs(parseFloat(cs.borderTopRightRadius) - parseFloat(cs.borderTopLeftRadius)) < 0.5).toBe(true);   // the ends match
      // Fix round 1 (ruling 409): the tie straddles the loop's end line (its far side is outside the box, its near side inside) and stands a little
      // proud of it top and bottom, so it is part of the outline; a bar wholly inside the loop beside the last letter reads as a caret.
      expect([parseFloat(tie.width) <= 3.5, parseFloat(tie.width) >= 2, parseFloat(tie.right) <= 0, parseFloat(tie.right) + parseFloat(tie.width) > 1]).toEqual([true, true, true, true]);
      expect(parseFloat(tie.height) > box.height).toBe(true);                // taller than the loop: it crosses the line
    } finally { r.cleanup(); }
  });
  it('F5: the score chip sits clear of the frieze under the top bar', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      const chip = r.root.querySelector('#topbar .score-chip');
      chip.hidden = false; chip.textContent = 'Score 100';
      const bar = r.root.querySelector('#topbar').getBoundingClientRect(), box = chip.getBoundingClientRect();
      expect(box.bottom <= bar.bottom - 4).toBe(true);                       // the frieze takes the bar's last 4 px
    } finally { r.cleanup(); }
  });
  it('F6: an enemy chariot flies a banner on a pole, which no friendly unit does, so the two differ in outline and not only in colour', () => {
    const record = (draw) => {
      const ctx = makeCanvas(200, 200).getContext('2d'), g = makeDraw(ctx, 3), polys = [], lines = [], circs = [];
      const { poly, line, circ } = g;
      g.poly = (pts, fill, ...rest) => { polys.push({ pts, fill }); return poly(pts, fill, ...rest); };
      g.line = (a, b, ...rest) => { lines.push([a, b]); return line(a, b, ...rest); };
      g.circ = (c, r, ...rest) => { circs.push({ c, r }); return circ(c, r, ...rest); };
      ctx.translate(100, 160);
      draw(g);
      return { polys, lines, circs };
    };
    const mine = record((g) => chariot(g, 0, 0)), theirs = record((g) => raiderChariot(g, 0, 0));
    const banners = (rec) => rec.polys.filter((q) => q.pts.length === 5 && q.fill === '#3E3446').map((q) => q.pts);     // a swallow-tailed banner: five points in the raiders' dark body colour; no other part of either figure is
    expect(banners(mine).length).toBe(0);
    expect(banners(theirs).length).toBe(1);
    const flag = banners(theirs)[0], xs = flag.map((q) => q[0]), ys = flag.map((q) => q[1]);
    expect(Math.max(...xs) - Math.min(...xs) >= 8).toBe(true);               // wide enough to read at a distance
    expect(Math.min(...ys) < -20).toBe(true);                                // and flying above the car
    // Fix round 1 (ruling 408): the banner is an addition. The raider still drives: a head (a small circle above the car) and a spear (a long
    // line, taller than the car, that is not the banner's pole) are drawn, and the pole stands clear of the spear.
    const spearLines = theirs.lines.filter(([a, b]) => Math.abs(a[1] - b[1]) > 12 && Math.abs(a[0] - b[0]) > 1);
    const byHeight = [...theirs.circs].sort((a, b) => a.c[1] - b.c[1]);                       // the head is the highest circle, a small one well above the shield and wheel
    expect(byHeight.length >= 3 && byHeight[0].c[1] < byHeight[1].c[1] - 5 && byHeight[0].r < byHeight[1].r).toBe(true);
    expect(spearLines.length).toBe(1);                                       // the slanted spear; the pole is vertical
    const pole = theirs.lines.find(([a, b]) => a[0] === b[0] && Math.abs(a[1] - b[1]) > 12);
    expect(!!pole).toBe(true);
    const spearX = Math.max(spearLines[0][0][0], spearLines[0][1][0]), spearX2 = Math.min(spearLines[0][0][0], spearLines[0][1][0]);
    expect(Math.abs(pole[0][0] - spearX) >= 3 && Math.abs(pole[0][0] - spearX2) >= 3).toBe(true);   // the pole clears the spear
    const tallest = (rec) => Math.min(...rec.lines.flatMap(([a, b]) => [a[1], b[1]]), ...rec.polys.flatMap((q) => q.pts).map((q) => q[1]));
    expect(tallest(theirs) >= -48).toBe(true);                               // still inside its slot's bounds (CHARIOT_BOUNDS top is -48)
  });
  it('the colours the new rules use pass AA: ink on the paused fill, gold on lapis, the key hint on the tick, the version line', () => {
    for (const [a, b] of [['ink', 'amberSoft'], ['lapisInk', 'lapis'], ['inkSoft', 'parchment'], ['teal', 'parchment'], ['amberText', 'amberSoft']]) {
      const hex = (n) => (TOKENS[n] || { lapis: '#1C3768', lapisInk: '#F5D98A' }[n]);
      expect([a, b, contrastRatio(hex(a), hex(b)) >= 4.5]).toEqual([a, b, true]);
    }
  });
});
