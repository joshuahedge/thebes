// Stage 4.7 Task 1 (ruling 461), step 2: the guarantee. Every map holds, within reach of the start area's centre (20 tiles at Normal, scaled
// linearly with the size), 2 clay-pit fits, 1 gem-mine fit on rocky ground and 6 grain-farm fits on fertile ground; a draw that misses is
// mended in the generator (src/sim/resources.js repairResources), never rejected. Classic at Normal keeps every seed that already held them.
import { describe, it, expect } from '../../harness.js';
import { generateMap } from '../../../src/sim/mapgen.js';
import { resourceReach, RESOURCES, S47_SALT } from '../../../src/data/s47.js';
import { MAP } from '../../../src/data/map.js';
import { repairResources, resourceCounts, spotsFor, packed } from '../../../src/sim/resources.js';
import { createWorld } from '../../../src/sim/world.js';
import { idx } from '../../../src/sim/grid.js';
import { T } from '../../../src/sim/terrain.js';
import { mapPrint } from '../../stage46/contract/mapSizes.test.js';
import { SEEDS, SIZES, LAYOUTS, sweep } from './sweep.js';

const none = { clay: 0, mine: 0, farm: 0 };
const sum = (r) => r.clay + r.mine + r.farm;

describe('s47 resources guarantee', () => {
  it('holds 2 clay-pit fits, 1 mine fit and 6 farm fits within reach of the start area on 200 seeds of every size and layout (classic at Normal: clay and farms only)', () => {
    const bad = [];
    for (const size of SIZES) {
      for (const variant of LAYOUTS) {
        for (const r of sweep(size, variant, SEEDS)) {
          const classicNormal = variant === 'classic' && size === 64;   // the mine repair is off there: it keeps its rock
          if (classicNormal ? r.c.clay.near < RESOURCES.clay || r.c.farm.near < RESOURCES.farm : !r.ok) bad.push(`${variant} ${size} #${r.seed}: clay ${r.c.clay.near} mine ${r.c.mine.near} farm ${r.c.farm.near}`);
        }
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });

  it('counts the same fits on a world made from the map (createWorld keeps the terrain)', () => {
    for (const [seed, size, mapVariant] of [[4, 64, 'oasis'], [21, 48, 'island'], [33, 80, 'middle']]) {
      const w = createWorld({ seed, mapVariant, size });
      const c = resourceCounts({ size: w.size, terrain: w.terrain, focus: w.focus, startRoad: w.startRoad }, resourceReach(size));
      expect([seed, c.clay.near >= RESOURCES.clay, c.mine.near >= RESOURCES.mine, c.farm.near >= RESOURCES.farm]).toEqual([seed, true, true, true]);
    }
  });

  it('is deterministic: a map and its repair are a function of (seed, size, layout) alone, and mending a mended map changes nothing', () => {
    for (const size of SIZES) for (const variant of LAYOUTS) {
      const a = generateMap(9, size, variant), b = generateMap(9, size, variant);
      expect([size, variant, JSON.stringify(a)]).toEqual([size, variant, JSON.stringify(b)]);
      const before = [...a.terrain];
      expect(repairResources(a, 9, null, { mine: !(variant === 'classic' && size === 64) })).toEqual(none);
      expect(a.terrain).toEqual(before);
    }
  });

  it('draws the repair from the resources salt, never the generator stream: a different seed repairs differently, the salt is registered', () => {
    expect(S47_SALT.resources).toBe(4708);
    const a = generateMap(1, 64, 'east'), b = generateMap(3, 64, 'east');
    expect(a.repaired.mine > 0 && b.repaired.mine > 0).toBe(true);
    const rockOf = (m) => m.terrain.map((t, i) => (t === T.ROCKY ? i : -1)).filter((i) => i >= 0).join(',');
    expect(rockOf(a) === rockOf(b)).toBe(false);
  });

  it('keeps what the generator promises while mending: rock off the water and clear of the start area, nothing on the start road or in the water', () => {
    const bad = [];
    for (const size of SIZES) for (const variant of LAYOUTS) for (let seed = 1; seed <= 40; seed++) {
      const m = generateMap(seed, size, variant), tag = `${variant} ${size} #${seed}`, N = m.size;
      for (let i = 0; i < m.terrain.length; i++) {
        if (m.terrain[i] !== T.ROCKY) continue;
        const x = i % N, y = (i - x) / N;
        if (Math.hypot(x - m.focus.x, y - m.focus.y) < 5) bad.push(`${tag}: rock ${x},${y} on the start area`);
      }
      for (const [x, y] of m.startRoad) if ([T.WATER, T.ROCKY].includes(m.terrain[idx(N, x, y)])) bad.push(`${tag}: start road tile ${x},${y} is water or rock`);
    }
    expect(bad.slice(0, 8)).toEqual([]);
  });

  it('never widens clay more than 4 tiles from water, and the mine blob draws from its own registered salt (Task 1 review minors)', () => {
    expect(S47_SALT.mineBlob).toBe(4711);
    expect(Object.values(S47_SALT).filter((s) => s === S47_SALT.mineBlob).length).toBe(1);
    const far = [];
    const cases = [[48, 'island', 185], ...SIZES.flatMap((size) => LAYOUTS.flatMap((variant) => Array.from({ length: 60 }, (_, k) => [size, variant, k + 1])))];
    for (const [size, variant, seed] of cases) {
      const m = generateMap(seed, size, variant), N = m.size;
      const wd = new Uint8Array(N * N).fill(255), queue = [];
      m.terrain.forEach((t, i) => { if (t === T.WATER) { wd[i] = 0; queue.push(i); } });
      for (let k = 0; k < queue.length; k++) {
        const x = queue[k] % N, y = (queue[k] - x) / N;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (x + dx < 0 || y + dy < 0 || x + dx >= N || y + dy >= N) continue;
          const n = (y + dy) * N + x + dx;
          if (wd[n] > wd[queue[k]] + 1) { wd[n] = wd[queue[k]] + 1; queue.push(n); }
        }
      }
      m.terrain.forEach((t, i) => { if (t === T.CLAY && wd[i] > 4) far.push(`${variant} ${size} #${seed}: clay ${i % N},${Math.floor(i / N)} is ${wd[i]} from water`); });
    }
    expect(far.slice(0, 6)).toEqual([]);
  });

  it('mends a map that lacks each resource: clay widened along the bank, a rocky patch beside the rock, the fertile band widened', () => {
    const base = generateMap(12, 64, 'classic'), reach = resourceReach(64);
    const strip = (from, to) => {
      const t = [...base.terrain];
      for (let i = 0; i < t.length; i++) if (t[i] === from && Math.hypot((i % 64) - base.focus.x, Math.floor(i / 64) - base.focus.y) <= reach + 6) t[i] = to;
      return { ...base, terrain: t };
    };
    const count = (m, key, type) => packed(spotsFor(m, type), reach) >= RESOURCES[key];
    const noClay = strip(T.CLAY, T.BANK), noRock = strip(T.ROCKY, T.DESERT), noFarm = strip(T.FERTILE, T.DESERT);
    expect([count(noClay, 'clay', 'clay_pit'), count(noRock, 'mine', 'gem_mine'), count(noFarm, 'farm', 'farm_grain')]).toEqual([false, false, false]);
    const c = repairResources(noClay, 12), r = repairResources(noRock, 12), f = repairResources(noFarm, 12);
    expect([c.clay > 0, r.mine > 0, f.farm > 0]).toEqual([true, true, true]);
    expect([count(noClay, 'clay', 'clay_pit'), count(noRock, 'mine', 'gem_mine'), count(noFarm, 'farm', 'farm_grain')]).toEqual([true, true, true]);
    // each mended in place and in the same way twice
    const again = strip(T.CLAY, T.BANK);
    repairResources(again, 12);
    expect(again.terrain).toEqual(noClay.terrain);
  });

  it('leaves Classic at Normal as Stage 4.6 drew it, except the 7 seeds of 1-200 whose clay had to be mended (no mine repair, ruling 332/351)', () => {
    // Pre-repair prints (mapPrint with the repair switched off) of classic at 64, seeds 1-200. Classic keeps its rock so weekly seeds, share links
    // and records stay put; only a seed with too little clay within reach is mended (clay and farms; no seed needed farms). The 7 moved seeds:
    const MOVED = [32, 52, 89, 90, 105, 148, 173];
    const PRE = Object.fromEntries(`
      1:607276e 2:e61abe76 3:98a0019b 4:ee1e99c 5:24b3b9f 6:c0b28ca6 7:ad53af4b 8:d5b1004d 9:b37ff0e2 10:4cf83901 11:dfdff5e8 12:5b59ff54 13:9b6b4ec1
      14:760d4b5b 15:fd64e5a4 16:83cd78ef 17:cbc21f75 18:e1907d2d 19:443752d7 20:7bf20a41 21:84863273 22:9a2aa3a1 23:d7fdf894 24:fa4918a 25:dbcc451c
      26:dff4de9a 27:52cd3c3b 28:9859ffb2 29:afa0842f 30:2840485b 31:bd15b182 32:5d49aac6 33:8cb5e515 34:8674211c 35:f4d680e5 36:743a6c2f 37:8c96244a
      38:7409b351 39:665bf03e 40:26f6caf3 41:a2392074 42:2e774056 43:aa4a6b70 44:20e7c3a1 45:a10343e1 46:70b816c3 47:1593b52a 48:3127bdd8 49:586bc256
      50:aab8df86 51:34c922fd 52:2811a9 53:cba316e 54:5d1257ec 55:602d1ffa 56:d7a983d9 57:f17fba41 58:935a41d0 59:84118604 60:7f564819 61:16de7129
      62:b785523f 63:a4b51953 64:20b2aa09 65:36434709 66:f8a9506b 67:dcb46ab4 68:1dac7eb6 69:e7a95b98 70:e174144e 71:106f506a 72:eaf646b0 73:94e7dd2d
      74:6c070de2 75:3b55b58d 76:780272a 77:25830273 78:9691fb1d 79:386b87e1 80:da4d357e 81:f3b54589 82:43c0a099 83:456d4b4f 84:6fd1463a 85:4f3e06ff
      86:3c006dd 87:f02cc0a0 88:ee597ffe 89:f95e6c27 90:9f9bf504 91:1c16e709 92:a2462ed9 93:e8a79de5 94:6f966ef0 95:86b331e5 96:49f38f8b 97:59dfbc26
      98:b41da458 99:b0cee59e 100:d3202dd6 101:847db25d 102:a83e1613 103:f49dfd91 104:547f8830 105:d98450a7 106:768ddbdc 107:5bd75ebe 108:5b0c3bc7
      109:1a72dd74 110:9eaae34d 111:c5145aa6 112:d13abd7a 113:7a0d4dd8 114:58ddec2 115:a5d917e0 116:42e74aea 117:3a23ed78 118:1db5fb9f 119:13ccb1ca
      120:cd5e479f 121:96427020 122:be7791f 123:452cf29a 124:6bbe18a4 125:ae7d5cf4 126:e5fbc679 127:f4aee7ac 128:63176aea 129:f421759e 130:a58ca95e
      131:9ffa3313 132:90675cf3 133:305fd239 134:73948f7c 135:165033f7 136:61c5bcc4 137:12862c45 138:4bc807bf 139:773baab8 140:f1a9523 141:dac3138f
      142:f34d5790 143:399383d3 144:d6b0aa80 145:976b52cd 146:a902bc84 147:d13bbc02 148:ccde85cf 149:a9ce3dee 150:19bfdb52 151:12f9719d 152:b24912c6
      153:2007c87b 154:41a86d2e 155:bb4c2714 156:b7c34c7d 157:87212418 158:f3cedbe7 159:4db72deb 160:aa20ed76 161:199e32a7 162:460fd2e9 163:df9941fd
      164:86b70e7d 165:f05eee60 166:f27906fb 167:14f57959 168:5176e26e 169:46f7b50 170:8c0f4f1e 171:d2e93f59 172:8d5713e 173:b4d3b618 174:db37662d
      175:fc59f9ce 176:5c6636db 177:396f2dc8 178:87e489b 179:12b2aa1 180:c6cb2601 181:a49ae88 182:a71ccf0 183:a7b6f8ab 184:5d4dd77a 185:a9b8b3dc
      186:8f8d1eb0 187:1fe37f73 188:90f9658d 189:dfad8d26 190:423e5d89 191:7fe4863 192:3370b83d 193:68402dc 194:b8a46e28 195:809578b1 196:e79942ba
      197:b7c2a39d 198:2b95bb12 199:89ecd737 200:baecaae0     `.trim().split(/\s+/).map((p) => p.split(':')));
    expect(Object.keys(PRE).length).toBe(200);
    const moved = [];
    for (let seed = 1; seed <= 200; seed++) {
      const m = generateMap(seed, 64, 'classic');
      expect([seed, m.repaired.mine]).toEqual([seed, 0]);
      const same = mapPrint(m) === PRE[seed];
      if (!same) moved.push(seed);
      expect([seed, same, sum(m.repaired) === 0]).toEqual([seed, same, same]);   // a map is untouched exactly when nothing was mended
    }
    expect(moved).toEqual(MOVED);
    expect(MAP.size).toBe(64);
  });
});
