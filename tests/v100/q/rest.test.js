// Version 10.0, Track Q (ruling 2148, Task Q.4): the drawings 9.3 did not reach. The bar's own list stays empty and its exemptions unchanged; the families the pass found still short of the bar
// (boats and ferries, the tower, the scaffold's poles, the dry shrub) now stand in it, each function checked by its own source.
import { describe, it, expect } from '../../harness.js';

const bodyOf = (text, name) => {
  const at = text.search(new RegExp(`export function ${name}\\(`));
  if (at < 0) return '';
  const end = text.indexOf('\n}\n', at);
  return text.slice(at, end < 0 ? undefined : end);
};
const src = async (path) => (await fetch(path)).text();

describe('v100 q rest: the bar and the families', () => {
  it("tests/v93/p/bar.test.js: OWED is empty and EXEMPT holds the seven patterns it held (nothing joined it)", async () => {
    const text = await src('/tests/v93/p/bar.test.js');
    expect(text.includes('const OWED = [];')).toBe(true);
    const block = text.slice(text.indexOf('const EXEMPT = ['), text.indexOf('];', text.indexOf('const EXEMPT = [')));
    expect(block.split('\n').filter((l) => /^\s+\/\^/.test(l)).length).toBe(7);
  });
  for (const [file, fn, calls] of [
    ['/src/render/art/defence.js', 'tower', ['shadeWall(', 'contactLine(']],
    ['/src/render/art/ferry.js', 'ferryBoat', ['waterShadow(']],
    ['/src/render/art/trade.js', 'tradeBoat', ['waterShadow(']],
    ['/src/render/art/nature.js', 'dryShrub', ['INK']],
    ['/src/render/v90/scaffold.js', 'drawScaffold', ['SCAFFOLD.shade']],
  ]) {
    it(`${fn} (${file.split('/').pop()}) draws through ${calls.join(' and ')}`, async () => {
      const body = bodyOf(await src(file), fn);
      expect(body.length > 0).toBe(true);
      for (const c of calls) expect([c, body.includes(c)]).toEqual([c, true]);
    });
  }
});
