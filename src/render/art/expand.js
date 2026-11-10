// Version 9.3 (spec sections 2 and 4, ruling 1887): slots that carry a look, a variant and a state. Moved out of registry.js (Track H, ruling 1890) so a
// drawing file can call withLooks while it loads: registry.js imports every drawing file, so withLooks living in registry.js was a cycle.
// A track puts its table through withLooks, which expands each entry whose draw takes a fourth argument opt = { look, variant, state } into one
// slot per look (and per variant, and per state where asked), and records the base slot as expanded so slotFor appends the suffixes. Order of the
// suffixes: house.t3.v1.l2, bazaar.s1.l2.work. An entry may give boundsFor(look) (and heightFor(look)) where its look changes its size.
import { LOOKS } from '../looks.js';

export const SERVICE_STATES = ['work', 'short', 'shut'];
export const EXPANDED = new Map();   // base slot -> { looks, variants, states }

export const expandedKey = (base, variant, look, state) => `${base}${variant >= 0 ? `.v${variant}` : ''}${look >= 0 ? `.l${look}` : ''}${state ? `.${state}` : ''}`;

export function withLooks(table, { looks = true, variants = 1, states = false } = {}) {
  const out = {};
  for (const [slot, def] of Object.entries(table)) {
    EXPANDED.set(slot, { looks, variants, states });
    for (let v = 0; v < Math.max(1, variants); v++) {
      for (let l = 0; l < (looks ? LOOKS.length : 1); l++) {
        for (const st of states ? SERVICE_STATES : ['']) {
          const opt = { look: looks ? l : 0, variant: v, state: st || 'work' };
          const { boundsFor: bf, heightFor: hf, ...rest } = def;
          const entry = { ...rest, draw: (g, x, y) => def.draw(g, x, y, opt) };
          if (bf) entry.bounds = bf(opt.look);
          if (hf) entry.height = hf(opt.look);
          out[expandedKey(slot, variants > 1 ? v : -1, looks ? l : -1, st)] = entry;
        }
      }
    }
  }
  return out;
}
