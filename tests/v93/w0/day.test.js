import { describe, it, expect } from '../../harness.js';
import { makeTestWorld } from '../../helpers/testWorld.js';
import { makeBuilding } from '../../../src/sim/world.js';

describe('v93 w0 day: a building knows the day it was placed', () => {
  it('stamps the day on a new building; an older one has none', () => {
    const w = makeTestWorld(); w.day = 77;
    expect(makeBuilding(w, 'house', 3, 3).day).toBe(77);
    const old = makeBuilding(w, 'house', 4, 3); delete old.day;
    expect(old.day).toBe(undefined);
  });
});
