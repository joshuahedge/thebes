// Problem markers pinned to their own buildings (spec 6.3, rulings 280, 281): a badge on a stem rising from a dot on the
// building's roof, a 2 px ring and faint wash on its footprint in the marker's colour, badges laid out so none overlaps
// (the one further back gets a longer stem; more than three in one place merge into a count badge with a ring on each
// footprint). Nothing pulses. Stage 4 contract: Track 0 fixed the names and the createUI wiring; Track B implements
// layoutMarkers and drawMarkers and owns this file; Track C owns what a tap on a marker does (createUI's tap seam and
// View's outline), reading the same layout.
//
// A marker, in the layout: { ids: [building ids, front first], x, y (the badge's centre, CSS px on screen), r (its radius,
// CSS px; at least 10), foot: { x, y } (the stem's foot on the roof, CSS px), glyph ('road' | '!' | 'down'), tone
// ('problem' | 'warning'), count (ids.length; more than one is a count badge) }.
//
// createUI lays the markers out once a frame after the camera moves (layoutMarkers(world, alerts, cam, view)), draws them
// in the overlay pass (drawMarkers(g, world, alerts, range, layout)) and, outside a tool, asks markerAt(layout, x, y) on
// every tap before it picks the building under the tap.
import { drawProblemMarkers } from './overlays.js';

// The 44 px tap area round a badge and its stem (ruling 281): the half-width either side of the stem and the badge.
export const MARKER_TAP_PX = 22;

// STUB. Returns [] until Track B lays the pinned markers out (so taps fall through to the buildings, as before).
export function layoutMarkers(world, alerts, cam, view) {
  return [];
}

// STUB. Draws Stage 3's floating badges (drawProblemMarkers) until Track B draws the pinned ones from the layout.
export function drawMarkers(g, world, alerts, range, layout = []) {
  drawProblemMarkers(g, world, alerts, range);
}

// The marker a tap at (x, y) (CSS px) hits, or null: within MARKER_TAP_PX of the badge's centre, or of the stem from the
// badge down to its foot; the front marker of the layout wins (the last laid out is drawn on top, so it is asked first).
// Complete in the contract.
export function markerAt(layout, x, y) {
  for (let i = layout.length - 1; i >= 0; i--) {
    const m = layout[i];
    const reach = Math.max(MARKER_TAP_PX, m.r || 0);
    if (Math.hypot(x - m.x, y - m.y) <= reach) return m;
    const foot = m.foot || { x: m.x, y: m.y };
    const top = Math.min(m.y, foot.y), bottom = Math.max(m.y, foot.y);
    if (Math.abs(x - foot.x) <= MARKER_TAP_PX && y >= top && y <= bottom) return m;
  }
  return null;
}
