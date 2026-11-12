// Version 10.0, Track M (ruling 2304, C13): the New city card on a short phone at large text drops the Thebes cartouche, so the Hard tile clears the sticky Start.
import { describe, it, expect } from '../../harness.js';
import { titleAt, frame, wait } from '../../v93/u/page.js';

async function cardAt(width, height, textSize) {
  const t = await titleAt({ width, height, textSize });
  try {
    t.root.querySelector('.title-card .new-city').click();
    await wait(200); await frame();
    const rect = (sel) => { const n = t.root.querySelector(sel); return n ? n.getBoundingClientRect() : null; };
    const hard = [...t.root.querySelectorAll('.title-card .new-city-body button')].find((b) => /^Hard/.test(b.textContent)).getBoundingClientRect();
    return { head: rect('.title-head').height, hardBottom: hard.bottom, startTop: rect('.start-city').top, hardTop: hard.top };
  } finally { t.cleanup(); }
}

describe('v100 m: the New city card on a short phone (C13)', () => {
  it('375x667 at 150%: no cartouche, and the Hard tile ends above the sticky Start', async () => {
    const c = await cardAt(375, 667, 150);
    expect(c.head).toBe(0);
    expect(c.hardBottom).toBeLessThanOrEqual(c.startTop + 8);
  });
  it('375x667 at 100% keeps its cartouche and shows Hard clear of Start', async () => {
    const c = await cardAt(375, 667, 100);
    expect(c.head).toBeGreaterThan(40);
    expect(c.hardBottom).toBeLessThanOrEqual(c.startTop);
  });
  it('390x844 at 150% (not short) keeps its cartouche', async () => {
    const c = await cardAt(390, 844, 150);
    expect(c.head).toBeGreaterThan(40);
  });
});
