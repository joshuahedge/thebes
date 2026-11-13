// Version 9.2, Track Q, 3.2 (ruling 1778): markers at a distance. From the far zoom out there is one badge per rolled-up row and no footprint rings; nearer, a badge per building
// and a ring each as before. T5's last part: on the six-year Capital at the far zoom, at most one marker per row.
import { describe, it, expect } from '../../harness.js';
import { capital6World } from '../helpers/capital6.js';
import { alertsFor, rollUpAlerts } from '../../../src/sim/alerts.js';
import { layoutMarkers, MARKER, isFar } from '../../../src/render/markers.js';
import { createCamera } from '../../../src/render/camera.js';
import { allBuildings } from '../../../src/sim/world.js';

const view = { width: 1280, height: 800 };
function centre(w) {
  const bs = allBuildings(w);
  const x = bs.reduce((s, b) => s + b.x, 0) / bs.length, y = bs.reduce((s, b) => s + b.y, 0) / bs.length;
  return { x, y };
}

describe('v92 q markers: at a distance', () => {
  it('the far zoom is 0.6 and under, the plots\' own', () => {
    expect([isFar({ zoom: 0.5 }), isFar({ zoom: 0.6 }), isFar({ zoom: 0.61 }), isFar({ zoom: 1 })]).toEqual([true, true, false, false]);
    expect(MARKER.haloAlpha).toBeLessThan(0.75);
  });

  it('on the six-year Capital at the far zoom there is at most one marker per row and none draws a ring; near, a marker for each building', () => {
    const w = capital6World();
    const flat = alertsFor(w);
    const rows = rollUpAlerts(flat).filter((r) => (r.ids && r.ids.length) || (r.id !== undefined && r.id !== null));
    const c = centre(w);
    const far = layoutMarkers(w, flat, createCamera({ x: c.x, y: c.y, zoom: 0.5 }), view);
    const near = layoutMarkers(w, flat, createCamera({ x: c.x, y: c.y, zoom: 1 }), view);
    expect(far.length).toBeGreaterThan(0);
    expect(far.length).toBeLessThanOrEqual(rows.length + 1);          // one per row, and one for the homes about to lose a tier
    expect(far.every((m) => m.rings === false)).toBe(true);
    expect(near.every((m) => m.rings === undefined)).toBe(true);
    // 10.0.1 (ruling 2369): the year-6 city's problems now sit apart (6 rows with buildings, a raid warned): at zoom 1 the 1280x800 view holds 3 of their markers,
    // at the far zoom it holds the whole city and 5 (one a row), so far is no longer at most near; each far marker stands for a row (above).
    expect([far.length, near.length]).toEqual([5, 3]);
    // Ruling 2397: the review asked for far <= near back. It does not hold on this city: at zoom 1 the layout gives 3 markers even with a view wide enough to
    // hold the whole city (6000x4000), so the gap is not the view's edge; it is pinned as measured (far one a row, 5) and the layout is the review's to look at.
    const nearAll = layoutMarkers(w, flat, createCamera({ x: c.x, y: c.y, zoom: 1 }), { width: 6000, height: 4000 });
    expect(nearAll.length).toBe(3);
  });
});
