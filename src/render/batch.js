// Version 9.3 (Track G, ruling 1919): batched marks for the terrain bake. A chunk holds hundreds of small marks (grass tufts, pebbles, joints), and a path and a fill each costs
// more than the mark, so a list is drawn as one path and one fill or stroke. `g` is a makeDraw context (g.ctx, g.scale).
export function dotsFill(g, list, r, colour, alpha) {
  if (!list.length) return;
  const ctx = g.ctx, sc = g.scale;
  ctx.beginPath();
  for (const q of list) { ctx.moveTo((q[0] + r) * sc, q[1] * sc); ctx.arc(q[0] * sc, q[1] * sc, r * sc, 0, Math.PI * 2); }
  ctx.globalAlpha = alpha; ctx.fillStyle = colour; ctx.fill(); ctx.globalAlpha = 1;
}

export function linesStroke(g, list, colour, width, alpha) {
  if (!list.length) return;
  const ctx = g.ctx, sc = g.scale;
  ctx.beginPath();
  for (const [a, b] of list) { ctx.moveTo(a[0] * sc, a[1] * sc); ctx.lineTo(b[0] * sc, b[1] * sc); }
  ctx.globalAlpha = alpha; ctx.strokeStyle = colour; ctx.lineWidth = width * sc; ctx.lineCap = 'round'; ctx.stroke(); ctx.globalAlpha = 1;
}

export function ellipsesFill(g, list, colour, alpha) {   // list of [centre, rx, ry]
  if (!list.length) return;
  const ctx = g.ctx, sc = g.scale;
  ctx.beginPath();
  for (const [q, rx, ry] of list) { ctx.moveTo((q[0] + rx) * sc, q[1] * sc); ctx.ellipse(q[0] * sc, q[1] * sc, rx * sc, ry * sc, 0, 0, Math.PI * 2); }
  ctx.globalAlpha = alpha; ctx.fillStyle = colour; ctx.fill(); ctx.globalAlpha = 1;
}
