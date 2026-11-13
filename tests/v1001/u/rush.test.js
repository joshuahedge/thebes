// Version 10.0.1, Track U (ruling 2341): the "Rushed" label stands on the site's back edge, small and quiet, clear of the site's front (where the gangs and markers are) and of its problem marker's column.
import { describe, it, expect } from '../../harness.js';
import { rushLabelAt, drawRushLabel, monumentTop } from '../../../src/render/monuments.js';
import { p } from '../../../src/render/iso.js';
import { rushCity } from '../../v84/g/fixtures.js';

describe('v1001 u rushed label', () => {
  it('moves from the front edge to the back edge of the footprint', () => {
    const { site } = rushCity();
    const [x, y] = rushLabelAt(site);
    const centre = p(site.x + site.w / 2, site.y + site.d / 2), front = p(site.x + site.w, site.y + site.d);
    expect(y < centre[1]).toBe(true);                                   // above the middle of the footprint, not below its front corner
    expect(y < front[1] - 20).toBe(true);
    expect(Math.abs(x - centre[0]) > 8).toBe(true);                     // to the side of the marker's column (the stem stands over the middle)
  });
  it('is smaller and quieter than a fire\'s pill: no outline, 6 art px', () => {
    const { site } = rushCity();
    const paths = [], texts = [];
    drawRushLabel({ path: (...a) => paths.push(a), text: (q, s, o) => texts.push([s, o]) }, site);
    expect(texts.map((t) => t[0])).toEqual(['Rushed']);
    expect(texts[0][1].size).toBe(6);
    expect(paths.length).toBe(1);
    expect(Boolean(paths[0][2].outline)).toBe(false);
  });
  it('stays clear of the problem marker, which stands on the monument top', () => {
    const { site } = rushCity();
    const top = monumentTop(site), [x, y] = rushLabelAt(site);
    // the marker's badge is about 20 CSS px (10 art px) across on its stem above the top: the pill is not under it
    expect(Math.abs(x - top[0]) > 10 || Math.abs(y - top[1]) > 30).toBe(true);
  });
});
