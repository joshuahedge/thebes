// Version 9.0 Track L (ruling 1588): a share link carries the sender's name and heir after the size, outside the check. It round-trips with and without them; a game that
// does not know them (every one since 4.5 ignores unknown extras) reads the same score; a name is cleaned to 16 characters of letters, digits, spaces and '-.
import { describe, it, expect } from '../../harness.js';
import { shareLink, parseShareLink, shareCheck, HEIR_LETTER } from '../../../src/ui/share.js';
import { HEIRS } from '../../../src/data/v90.js';
import { RULER_NAME_MAX } from '../../../src/save/records.js';

const PARTS = { people: 72, prosperity: 65, culture: 58, safety: 40, monuments: 36 };
const SPLITS = { town: 4, market_town: 11, city: 30 };
const hashOf = (link) => link.slice(link.indexOf('#'));
const base = { seed: 4242, difficulty: 'normal', parts: PARTS, splits: SPLITS };

// An 8.4 reader: the parser's logic from before 9.0, which looks only for variant= and size= among the extras.
function parse84(hash) {
  const [text, ...extra] = String(hash).replace(/^#/, '').split('&');
  const bits = text.split('.');
  const named = extra.find((e) => e.startsWith('variant='));
  const sizeNamed = extra.find((e) => e.startsWith('size='));
  return { ok: bits.length === 6 && bits[5] === shareCheck(bits.slice(0, 5).join('.')), seed: Number(bits[1]), variant: named ? named.slice(8) : 'classic', size: sizeNamed ? Number(sizeNamed.slice(5)) : null };
}

describe('v90 l share link: the name and the heir', () => {
  it('adds &name= and &heir= after the size, and nothing without a name', () => {
    const plain = shareLink(base);
    expect(plain.includes('&name=') || plain.includes('&heir=')).toBe(false);
    const named = shareLink({ ...base, name: 'Ana', heir: 'merchant' });
    expect(named).toBe(`${plain}&name=Ana&heir=m`);
    const sized = shareLink({ ...base, variant: 'east', size: 80, name: 'Ana', heir: 'builder' });
    expect(sized.endsWith('&variant=east&size=80&name=Ana&heir=b')).toBe(true);
    expect(shareLink({ ...base, name: '', heir: 'builder' })).toBe(plain);
    expect(shareLink({ ...base, name: '***', heir: 'builder' })).toBe(plain);      // a name that cleans to nothing is no name
  });
  it('round-trips a name and every heir, and a link without them opens as it did', () => {
    for (const heir of HEIRS) {
      const read = parseShareLink(hashOf(shareLink({ ...base, name: "Mary-Jo O'Neil.", heir })));
      expect([read.ok, read.name, read.heir, read.seed, read.parts]).toEqual([true, "Mary-Jo O'Neil.", heir, 4242, PARTS]);
    }
    expect(Object.keys(HEIR_LETTER).sort()).toEqual([...HEIRS].sort());
    const without = parseShareLink(hashOf(shareLink(base)));
    expect([without.ok, 'name' in without, 'heir' in without]).toEqual([true, false, false]);
  });
  it('keeps the name and the heir outside the check, so the link\'s own score reads the same with or without them', () => {
    const a = parseShareLink(hashOf(shareLink(base))), b = parseShareLink(hashOf(shareLink({ ...base, name: 'Ana', heir: 'generous' })));
    const { name, heir, ...rest } = b;
    expect(rest).toEqual(a);
    expect([name, heir]).toEqual(['Ana', 'generous']);
    const text = shareLink({ ...base, name: 'Ana', heir: 'generous' });
    expect(text.slice(text.indexOf('#') + 1).split('&')[0].split('.')[5]).toBe(shareCheck('t3.4242.n.72-65-58-40-36.4-11-30-x-x-x-x'));
  });
  it('is read by an 8.4 game as the same score, the extras ignored', () => {
    const old = parse84(hashOf(shareLink({ ...base, variant: 'east', size: 48 })));
    const next = parse84(hashOf(shareLink({ ...base, variant: 'east', size: 48, name: 'Ana', heir: 'unconquered' })));
    expect(next).toEqual(old);
    expect([next.ok, next.seed, next.variant, next.size]).toEqual([true, 4242, 'east', 48]);
  });
  it('cleans a name on the way in and reads a hand-edited one safely', () => {
    const long = shareLink({ ...base, name: 'Ramesses the Great and Mighty', heir: 'steady' });
    expect(parseShareLink(hashOf(long)).name.length <= RULER_NAME_MAX).toBe(true);
    expect(parseShareLink(hashOf(long)).name).toBe('Ramesses the Gre');
    const plain = shareLink(base);
    const odd = (tail) => parseShareLink(`${hashOf(plain)}${tail}`);
    expect(odd('&name=%3Cb%3EAna%3C%2Fb%3E&heir=m').name).toBe('bAnab');          // markup characters are dropped
    expect(odd('&name=%E0%A4%A&heir=m').name).toBe(undefined);                     // a broken escape reads as no name
    expect(odd('&name=%20%20&heir=m').name).toBe(undefined);
    expect(odd('&name=Ana&heir=z').heir).toBe(undefined);                          // an unknown heir letter is left out, the name stays
    expect(odd('&name=Ana&heir=z').name).toBe('Ana');
    expect(odd('&heir=m').heir).toBe(undefined);                                   // a heir without a name is nothing
    expect(odd('&name=Ana%20%20Lee&heir=f').name).toBe('Ana Lee');                // spaces run together
    expect(odd('&name=Ana&name=Bob').name).toBe('Ana');
  });
  it('still reads a bad check, a newer format and a malformed link as before', () => {
    const text = hashOf(shareLink({ ...base, name: 'Ana', heir: 'merchant' }));
    expect(parseShareLink(text.replace('.n.', '.h.'))).toEqual({ ok: false, reason: 'bad_check' });
    expect(parseShareLink('#t9.1.n.1-2-3-4-5.x-x-x-x-x-x-x.abcd&name=Ana')).toEqual({ ok: false, reason: 'newer_format' });
    expect(parseShareLink('#t2.nope&name=Ana')).toEqual({ ok: false, reason: 'malformed' });
    expect(parseShareLink('#something-else')).toBe(null);
  });
});
