// Version 9.3 D0 (ruling 1954): the main game must play as it did before the decree. The six-year Capital (the v92 helper's shared run) is
// compared month by month with the recorded golden.json; the first month that differs is named.
import { describe, it, expect } from '../../harness.js';
import { capital6Months } from '../../v92/helpers/capital6.js';
import { fingerprint, firstDifference } from '../helpers/golden.js';

describe('v93 d0 golden', () => {
  it('matches the recorded six-year Capital at every month end', async () => {
    const recorded = await (await fetch('/tests/v93/d0/golden.json')).json();
    expect(recorded.length).toBe(72);
    const diff = firstDifference(recorded, fingerprint(capital6Months()));
    expect(diff).toBe(null);
  });
});
