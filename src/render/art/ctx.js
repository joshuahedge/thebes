import { OUTLINE } from './palette.js';

export function rgba(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// Wraps a Canvas 2D context so the art code can draw in art px (a tile is 32 x 16). `scale` is device px
// per art px. The options object mirrors the SVG mock-ups' extras: { alpha } is fill-opacity,
// { outline: true } is their standard thin outline, { stroke, strokeWidth, strokeAlpha } a custom stroke.
export function makeDraw(ctx, scale) {
  const s = (v) => v * scale;

  function trace(pts) {
    ctx.beginPath();
    ctx.moveTo(s(pts[0][0]), s(pts[0][1]));
    for (let i = 1; i < pts.length; i++) ctx.lineTo(s(pts[i][0]), s(pts[i][1]));
    ctx.closePath();
  }

  // Many polygons as one path (an overlay's tiles): one fill, and no seams where neighbours meet.
  function traceAll(list) {
    ctx.beginPath();
    for (const pts of list) {
      ctx.moveTo(s(pts[0][0]), s(pts[0][1]));
      for (let i = 1; i < pts.length; i++) ctx.lineTo(s(pts[i][0]), s(pts[i][1]));
      ctx.closePath();
    }
  }

  function tracePath(segs) {
    ctx.beginPath();
    for (const seg of segs) {
      if (seg[0] === 'M') ctx.moveTo(s(seg[1][0]), s(seg[1][1]));
      else if (seg[0] === 'L') ctx.lineTo(s(seg[1][0]), s(seg[1][1]));
      else if (seg[0] === 'Q') ctx.quadraticCurveTo(s(seg[1][0]), s(seg[1][1]), s(seg[2][0]), s(seg[2][1]));
      else if (seg[0] === 'Z') ctx.closePath();
    }
  }

  function fillStroke(fill, o) {
    if (fill && fill !== 'none') {
      ctx.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (o.outline) {
      ctx.globalAlpha = 0.32;
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = s(0.6);
      ctx.lineJoin = 'round';
      ctx.stroke();
    } else if (o.stroke) {
      ctx.globalAlpha = o.strokeAlpha === undefined ? 1 : o.strokeAlpha;
      ctx.strokeStyle = o.stroke;
      ctx.lineWidth = s(o.strokeWidth === undefined ? 1 : o.strokeWidth);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  const g = {
    ctx,
    scale,
    poly(pts, fill, o = {}) { trace(pts); fillStroke(fill, o); },
    polys(list, fill, o = {}) { if (list.length) { traceAll(list); fillStroke(fill, o); } },
    circ(q, r, fill, o = {}) {
      ctx.beginPath();
      ctx.arc(s(q[0]), s(q[1]), s(Math.max(0, r)), 0, Math.PI * 2);
      fillStroke(fill, o);
    },
    ell(q, rx, ry, fill, o = {}) {
      ctx.beginPath();
      ctx.ellipse(s(q[0]), s(q[1]), s(Math.max(0, rx)), s(Math.max(0, ry)), 0, 0, Math.PI * 2);
      fillStroke(fill, o);
    },
    path(segs, fill, o = {}) { tracePath(segs); fillStroke(fill, o); },
    line(a, b, color, width = 1, alpha = 1) {
      ctx.beginPath();
      ctx.moveTo(s(a[0]), s(a[1]));
      ctx.lineTo(s(b[0]), s(b[1]));
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = s(width);
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    stroke(segs, color, width = 1, alpha = 1) {
      tracePath(segs);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = s(width);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    // The mock-ups' url(#fg): white 14% at the top of the face, clear at 55%, #3A2E5A 16% at the bottom.
    faceGrad(pts) {
      let top = Infinity, bottom = -Infinity;
      for (const q of pts) { top = Math.min(top, q[1]); bottom = Math.max(bottom, q[1]); }
      if (bottom - top < 1e-6) return;
      const gr = ctx.createLinearGradient(0, s(top), 0, s(bottom));
      gr.addColorStop(0, 'rgba(255,255,255,0.14)');
      gr.addColorStop(0.55, 'rgba(255,255,255,0)');
      gr.addColorStop(1, 'rgba(58,46,90,0.16)');
      trace(pts);
      ctx.fillStyle = gr;
      ctx.fill();
    },
    // A soft ellipse: solid to 60% of its radius, then fading to clear. Replaces the SVG blur filter.
    radial(q, rx, ry, color, alpha = 1) {
      if (rx <= 0 || ry <= 0) return;
      ctx.save();
      ctx.translate(s(q[0]), s(q[1]));
      ctx.scale(s(rx), s(ry));
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, color);
      gr.addColorStop(0.6, color);
      gr.addColorStop(1, rgba(color, 0));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
    // The granary roof: a tall half-ellipse cap on a flatter half-ellipse base, lit from the upper left.
    dome(c, rx, ryTop, ryBottom, o = {}) {
      ctx.beginPath();
      ctx.ellipse(s(c[0]), s(c[1]), s(rx), s(ryTop), 0, Math.PI, Math.PI * 2);
      ctx.ellipse(s(c[0]), s(c[1]), s(rx), s(ryBottom), 0, 0, Math.PI);
      ctx.closePath();
      const gr = ctx.createRadialGradient(s(c[0] - rx * 0.3), s(c[1] - ryTop * 0.4), 0, s(c[0]), s(c[1]), s(rx * 1.7));
      gr.addColorStop(0, '#FFFAEE');
      gr.addColorStop(1, '#CDBFC4');
      fillStroke(gr, o);
    },
    text(q, str, { size = 6, color = '#3B2A14', align = 'center', weight = '600', alpha = 1 } = {}) {
      ctx.font = `${weight} ${s(size)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillText(str, s(q[0]), s(q[1]));
      ctx.globalAlpha = 1;
    },
    clip(pts) { trace(pts); ctx.clip(); },
    clipPolys(list) { traceAll(list); ctx.clip(); },
    save() { ctx.save(); },
    restore() { ctx.restore(); },
  };
  return g;
}
