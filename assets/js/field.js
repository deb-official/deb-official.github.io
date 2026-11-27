// field.js — the hero plate (index.html only). Exactly 5,651 dots, the size of the ICD-10-CM code inventory
// in the MISTILL paper, flow around the portrait like text around a figure. For the "document" (the marker),
// a few contiguous runs of the list light up (regions) and one dot in each is chosen and joined to the
// document by a hairline. It illustrates the research question; it is not data.
//
// Motion. A selection is a seed: 3 to 5 regions, each in its own lane of the list, with its own length, chosen
// position and rate. A region's place in the list is a smooth function of where the document is, so when the
// document moves (pointer; a horizontal drag on touch screens; scrolling past the plate on touch screens) the
// runs slide along their rows and the chosen dots and hairlines glide with them. Nothing fades while it moves.
// A tap on the dots and "Try another document" pick a new seed: the old selection cross-fades into the new one
// (their opacities always add up to 1). A tap on the photograph turns the portrait instead.
//
// The introduction plays once, the first time the plate is at least 60% on screen (never under reduced motion):
// one reading pass. A band three rows high reads the list in order while the legend counts from 0 to 5,651, then
// the regions light and the rings and hairlines grow. It ends on the seed-0 selection, the frame reduced-motion
// visitors see from the start. Any pointer move, tap or drag ends it; on touch screens, a scroll past the plate
// before or during the pass shows the complete selection at once.
//
// Rest positions (the first frame, "Try another document", the scroll path) lie in the block opposite the
// portrait's corner, from which every dot is in a straight line, so they never bend. Only a pointer or a tap can
// need a bend round the photograph; it is drawn as a rounded turn clear of it.
//
// Cost: the dots are painted once to an offscreen canvas; a frame is one drawImage, a few hundred small arcs
// and a handful of lines. The loop runs only while something changes, never off screen or in a hidden tab,
// and the canvas is capped at 2x device pixels. The start is split in three short steps, each ending its own
// frame: the grid and then the off-screen dots when the browser is idle, then the first frame.

const TOTAL = 5651;
const MAX_DPR = 2;
const BATCH = 48;       // dots per canvas path (one path with thousands of arcs can stall a GPU canvas)
const TAU = Math.PI * 2;
const EDGE = 8.5;       // px: a chosen dot stays this far from the canvas edge, so its ring (6.7 px + stroke) is never cut
const NEAR = 7;         // px beyond the portrait's 9 px moat: a chosen dot stays 16 px from the photograph (its paper border)
const FADE = 340;       // ms: the cross-fade between two selections
const ROW_PX = [200, 320]; // px of document travel that slide a region by one grid row (each region draws its own)
const GAP = 14;         // list positions kept free between two regions' lanes, so regions never touch
const TAP_SLOP = 10;    // px: a touch that travels less than this is a tap; more is a drag or a scroll
const INTRO_WAIT = 500; // ms after the plate is first 60% on screen before the pass begins
const PASS = [1100, 1500, 2000]; // ms into the pass: the band has read the list; the regions are lit; rings and lines are drawn
const CORNER = 14;      // px: a bend's corner point sits this far off the photograph's corner, in both directions
const BEND_R = 14;      // px: radius of the rounded turn (its curve stays at least 12 px clear of the photograph)

// Runs fn when the browser is idle (or after `wait` ms where there is no requestIdleCallback, as in Safari).
const idle = (fn, wait = 120) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 700 }) : setTimeout(fn, wait));

// Seeded PRNG: the same seed always draws the same selection.
function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A value that runs back and forth over [0, room]: regions slide to the end of their lane and turn back,
// so a region never jumps.
const pingpong = (v, room) => {
  const m = ((v % (2 * room)) + 2 * room) % (2 * room);
  return m <= room ? m : 2 * room - m;
};

// Does the segment (x0, y0)-(x1, y1) pass through the rectangle R? (Liang-Barsky clipping.)
function crosses(x0, y0, x1, y1, R) {
  const dx = x1 - x0, dy = y1 - y0;
  const p = [-dx, dx, -dy, dy], d = [x0 - R.x0, R.x1 - x0, y0 - R.y0, R.y1 - y0];
  let t0 = 0, t1 = 1;
  for (let k = 0; k < 4; k++) {
    if (p[k] === 0) { if (d[k] < 0) return false; continue; }
    const t = d[k] / p[k];
    if (p[k] < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}

// Grid cells k in [0, n) whose centre o + k * p lies strictly between a and b.
const inside = (o, p, n, a, b) => Math.max(0, Math.min(n - 1, Math.ceil((b - o) / p) - 1) - Math.max(0, Math.floor((a - o) / p) + 1) + 1);

// A rounded turn at corner c on the way from m to d, as a short polyline (so a hairline can still grow along it).
function bendPath(m, c, d) {
  const l1 = Math.hypot(c[0] - m[0], c[1] - m[1]) || 1, l2 = Math.hypot(d[0] - c[0], d[1] - c[1]) || 1;
  const rr = Math.min(BEND_R, l1 / 2, l2 / 2);
  const a = [c[0] - ((c[0] - m[0]) * rr) / l1, c[1] - ((c[1] - m[1]) * rr) / l1];
  const b = [c[0] + ((d[0] - c[0]) * rr) / l2, c[1] + ((d[1] - c[1]) * rr) / l2];
  const pts = [m, a];
  for (let s = 1; s < 6; s++) {
    const t = s / 6, u = 1 - t;
    pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  pts.push(b, d);
  return pts;
}

function initField() {
  const plate = document.querySelector('[data-field]');
  const stage = plate && plate.querySelector('[data-field-stage]');
  const canvas = stage && stage.querySelector('canvas');
  const ctx = canvas && canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;

  const portrait = stage.querySelector('[data-portrait]');
  const flip = portrait && portrait.querySelector('[data-portrait-flip]');
  const hero = plate.closest('section') || plate;
  const countEl = plate.querySelector('[data-field-count]');
  const status = plate.querySelector('[data-field-status]');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const touchFirst = window.matchMedia('(hover: none)');
  const base = document.createElement('canvas');   // the 5,651 dots, painted once per layout or theme
  let w = 0, h = 0, dpr = 1, r = 1, cols = 1, xs = [], ys = [], rowStart = [], hole = null, photo = null, colors = {};
  let rowsFrom = 0, rowsTo = 0;                    // the part of the list whose rows keep a chosen ring inside the canvas
  let q = { x: 0, y: 0 }, target = q;              // the document marker eases towards its target
  let current = null, sels = [];                   // the current selection; older ones fade out
  let raf = 0, last = 0, ready = false, starting = false, stale = false, onScreen = false, seen = false;
  let introState = 'waiting', introTimer = 0, passStart = 0;   // waiting -> pending -> running -> done
  let taps = 0, n = 2, presses = 0, shown = TOTAL;

  // ---- layout: the largest grid pitch that still fits every dot around the portrait ----------------------
  const inHole = (x, y, pad = 0) => hole && x > hole.x0 - pad && x < hole.x1 + pad && y > hole.y0 - pad && y < hole.y1 + pad;

  // How many cells of a grid with pitch p lie outside the portrait's hole (counted, not built).
  function capacity(p) {
    const c = Math.floor(w / p), rows = Math.floor(h / p), ox = (w - c * p) / 2 + p / 2;
    return c * rows - (hole ? inside(ox, p, c, hole.x0, hole.x1) * inside(p / 2, p, rows, hole.y0, hole.y1) : 0);
  }

  function grid(p) {
    const c = Math.floor(w / p), rows = Math.floor(h / p), ox = (w - c * p) / 2 + p / 2;
    const px = [], py = [];
    for (let row = 0; row < rows && px.length < TOTAL; row++) {
      for (let col = 0; col < c && px.length < TOTAL; col++) {
        const x = ox + col * p, y = p / 2 + row * p;
        if (!inHole(x, y)) { px.push(x); py.push(y); }
      }
    }
    return [px, py, c];
  }

  // `whole` = false (start-up) leaves the visible canvas and the dots to the next steps.
  function layout(whole = true) {
    const box = stage.getBoundingClientRect();
    w = Math.round(box.width); h = Math.round(box.height);
    if (w < 40 || h < 40) return false;
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    base.width = Math.round(w * dpr);
    base.height = Math.round(h * dpr);
    if (whole) fitCanvas();
    hole = photo = null;
    if (portrait) {
      const b = portrait.getBoundingClientRect(), moat = 9;
      hole = { x0: b.left - box.left - moat, y0: b.top - box.top - moat, x1: b.right - box.left + moat, y1: b.bottom - box.top + moat };
      photo = { x0: hole.x0 + moat - 2, y0: hole.y0 + moat - 2, x1: hole.x1 - moat + 2, y1: hole.y1 - moat + 2 }; // hairlines stay off it
    }
    const free = w * h - (hole ? (hole.x1 - hole.x0) * (hole.y1 - hole.y0) : 0);
    let p = Math.sqrt(free / TOTAL) * 1.04;          // start just above the ideal pitch and step down
    do p -= 0.02; while (capacity(p) < TOTAL && p > 1.5);
    [xs, ys, cols] = grid(p);
    while (xs.length < TOTAL && p > 1.5) { p -= 0.02; [xs, ys, cols] = grid(p); }   // a cell on the hole's edge
    r = Math.max(0.7, Math.min(1.7, p * 0.185));
    rowStart = [];                                   // the first list position of each grid row (for the reading band)
    for (let i = 0; i < xs.length; i++) { const row = Math.round((ys[i] - p / 2) / p); while (rowStart.length <= row) rowStart.push(i); }
    rowStart.push(xs.length);
    rowsFrom = Math.max(0, ys.findIndex((y) => y > EDGE));
    rowsTo = xs.length; while (rowsTo > rowsFrom + 1 && ys[rowsTo - 1] >= h - EDGE) rowsTo--;
    if (whole) paintBase();
    return true;
  }
  const fitCanvas = () => { canvas.width = base.width; canvas.height = base.height; };

  function dots(c, from, to, radius) {
    for (let i = from; i < to; i += BATCH) {
      c.beginPath();
      for (let j = i; j < Math.min(to, i + BATCH); j++) { c.moveTo(xs[j] + radius, ys[j]); c.arc(xs[j], ys[j], radius, 0, TAU); }
      c.fill();
    }
  }

  function paintBase() {
    const cs = getComputedStyle(stage), v = (name) => cs.getPropertyValue(name).trim();
    colors = { dot: v('--field-dot'), band: v('--ink-3'), region: v('--field-region'), chosen: v('--field-chosen'), line: v('--field-line'), ink: v('--ink'), paper: v('--paper') };
    const b = base.getContext('2d');
    b.setTransform(dpr, 0, 0, dpr, 0, 0);
    b.clearRect(0, 0, w, h);
    b.fillStyle = colors.dot;
    dots(b, 0, xs.length, r);
  }

  // ---- selections -----------------------------------------------------------------------------------------
  // The list (without the rows too close to the top and bottom edges) is cut into one lane per region (lanes
  // of random length, GAP apart). Each region keeps its length, chosen position, direction and rate for as
  // long as the selection lives.
  function makeSelection(seed) {
    const rand = mulberry32(seed), count = rowsTo - rowsFrom, k = 3 + Math.floor(rand() * 3);
    const weights = Array.from({ length: k }, () => 0.6 + rand());
    const sum = weights.reduce((a, b) => a + b, 0);
    const regions = [];
    let at = rowsFrom;
    for (const wt of weights) {
      const lane = Math.floor((count * wt) / sum), lo = at + GAP, span = Math.max(16, lane - 2 * GAP);
      at += lane;
      const len = Math.min(28 + Math.floor(rand() * 150), Math.floor(span * 0.6));
      const angle = rand() * TAU;
      regions.push({
        lo, len, room: Math.max(1, span - len), frac: 0.15 + 0.7 * rand(),
        rowPx: ROW_PX[0] + rand() * (ROW_PX[1] - ROW_PX[0]), cx: Math.cos(angle), cy: Math.sin(angle), offset: rand(),
      });
    }
    return { seed, regions, alpha: 0 };
  }

  // A chosen dot keeps its ring inside the canvas and clear of the photograph's paper border.
  const usable = (i) => xs[i] > EDGE && xs[i] < w - EDGE && ys[i] > EDGE && ys[i] < h - EDGE && !inHole(xs[i], ys[i], NEAR);
  const clear = (x0, y0, x1, y1) => !photo || !crosses(x0, y0, x1, y1, photo);

  // Where a region sits for a document at (mx, my): its first list position and its chosen dot. The chosen dot
  // is the one nearest its nominal place whose ring fits and whose hairline misses the portrait; if none has a
  // clear line (only possible away from the rest positions), the line turns round a corner of the portrait.
  function place(g, mx, my) {
    const rate = cols / g.rowPx;                     // list positions per px of document travel
    const start = g.lo + Math.round(pingpong(g.offset * 2 * g.room + rate * (g.cx * mx + g.cy * my), g.room));
    const end = Math.min(start + g.len, xs.length), nominal = start + Math.round((g.len - 1) * g.frac);
    let fallback = -1;
    for (let d = 0; d < g.len; d++) {
      for (const i of d ? [nominal - d, nominal + d] : [nominal]) {
        if (i < start || i >= end || !usable(i)) continue;
        if (fallback < 0) fallback = i;
        if (clear(mx, my, xs[i], ys[i])) return { start, end, chosen: i, bend: null };
      }
    }
    const chosen = fallback < 0 ? nominal : fallback;
    return { start, end, chosen, bend: corner(mx, my, xs[chosen], ys[chosen]) };
  }

  // The shortest route round one corner of the photograph: the corner point sits CORNER px off it diagonally.
  function corner(mx, my, x, y) {
    if (!photo) return null;
    let best = null, bestLen = Infinity;
    const corners = [[photo.x0, photo.y0, -1, -1], [photo.x1, photo.y0, 1, -1], [photo.x0, photo.y1, -1, 1], [photo.x1, photo.y1, 1, 1]];
    corners.forEach(([px, py, sx, sy], i) => {
      const cx = px + sx * CORNER, cy = py + sy * CORNER;
      if (cx < 2 || cx > w - 2 || cy < 2 || cy > h - 2 || !clear(mx, my, cx, cy) || !clear(cx, cy, x, y)) return;
      const len = Math.hypot(cx - mx, cy - my) + Math.hypot(x - cx, y - cy);
      if (len < bestLen) { bestLen = len; best = { i, x: cx, y: cy, sx, sy }; }
    });
    return best;
  }

  // Keep the document inside the stage and out from under the portrait.
  function clamp(x, y) {
    x = Math.max(10, Math.min(w - 10, x));
    y = Math.max(10, Math.min(h - 10, y));
    if (inHole(x, y)) {                              // step out through the nearest edge of the portrait
      const exits = [[hole.x0 - 4, y], [hole.x1 + 4, y], [x, hole.y0 - 4], [x, hole.y1 + 4]].filter(([ex, ey]) => ex > 10 && ex < w - 10 && ey > 10 && ey < h - 10);
      exits.sort((a, b) => Math.hypot(a[0] - x, a[1] - y) - Math.hypot(b[0] - x, b[1] - y));
      if (exits.length) [x, y] = exits[0];
    }
    return { x, y };
  }

  // A continuous move: the regions follow the document.
  function glideTo(x, y) {
    target = clamp(x, y);
    if (still.matches) { q = target; draw(); } else kick();
  }

  // A discrete jump: a new seed, cross-faded in (instant under reduced motion).
  function jump(x, y, seed) {
    target = clamp(x, y);
    current = makeSelection(seed);
    sels = [...sels.slice(-2), current];
    if (still.matches) { q = target; current.alpha = 1; sels = [current]; draw(); } else kick();
  }

  // A fixed sequence of rest points for the first frame, "Try another document" and the scroll path, drawn from
  // the block opposite the portrait's corner (left of and above it on desktop, right of and below it on phones),
  // 16 px from the photograph and 12 px from the edges: every dot is in a straight line from there.
  function freePoint(k) {
    const rand = mulberry32(977 + k * 131);
    if (photo) {
      const left = (photo.x0 + photo.x1) / 2 > w / 2, top = (photo.y0 + photo.y1) / 2 > h / 2;
      const x0 = left ? 12 : photo.x1 + 16, x1 = left ? photo.x0 - 16 : w - 12;
      const y0 = top ? 12 : photo.y1 + 16, y1 = top ? photo.y0 - 16 : h - 12;
      if (x1 - x0 >= 40 && y1 - y0 >= 40) return [x0 + rand() * (x1 - x0), y0 + rand() * (y1 - y0)];
    }
    for (let i = 0; i < 30; i++) {                   // no such block (an unusual shape): anywhere clear of the portrait
      const x = (0.08 + 0.84 * rand()) * w, y = (0.08 + 0.84 * rand()) * h;
      if (!inHole(x, y, 12)) return [x, y];
    }
    return [w / 2, h / 2];
  }

  // ---- drawing ------------------------------------------------------------------------------------------
  // A polyline from the document to a chosen dot, kept clear of the marker and of the ring, drawn up to the
  // fraction `grow` of its length (lines reach out from the document as a selection fades in).
  function hairline(pts, grow) {
    const segs = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); total += l; }
    const from = Math.min(7, total), to = Math.max(from, Math.min(total - 7.5, from + grow * (total - 7.5 - from)));
    if (to <= from) return;
    let walked = 0, started = false;
    for (let i = 0; i < segs.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], l = segs[i] || 1;
      const s = Math.max(0, from - walked), e = Math.min(l, to - walked);
      if (e > s) {
        if (!started) { ctx.moveTo(ax + ((bx - ax) * s) / l, ay + ((by - ay) * s) / l); started = true; }
        ctx.lineTo(ax + ((bx - ax) * e) / l, ay + ((by - ay) * e) / l);
      }
      walked += l;
      if (walked >= to) break;
    }
  }

  // One selection: its regions at regionA, its chosen dots, rings (grown by `grow`) and hairlines at lineA.
  // `bends` counts the lines turning at each corner of the photograph in this frame: a second one runs 5 px wider.
  function drawSelection(sel, regionA, lineA, grow, bends) {
    const placed = sel.regions.map((g) => place(g, q.x, q.y));
    ctx.globalAlpha = regionA;
    ctx.fillStyle = colors.region;
    for (const k of placed) dots(ctx, k.start, k.end, r * 1.3);
    if (lineA <= 0) return;
    ctx.globalAlpha = lineA;
    ctx.fillStyle = ctx.strokeStyle = colors.chosen;
    ctx.lineWidth = 1.25;
    for (const k of placed) {
      const x = xs[k.chosen], y = ys[k.chosen];
      ctx.beginPath(); ctx.arc(x, y, 3.1, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 3.1 + 3.6 * grow, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = lineA * 0.9;
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const k of placed) {
      const m = [q.x, q.y], d = [xs[k.chosen], ys[k.chosen]];
      if (!k.bend) { hairline([m, d], grow); continue; }
      const wider = 5 * bends[k.bend.i]++;
      hairline(bendPath(m, [k.bend.x + k.bend.sx * wider, k.bend.y + k.bend.sy * wider], d), grow);
    }
    ctx.stroke();
  }

  // en-US grouping ("5,651") without Intl: the first toLocaleString call starts Intl, about 40 ms on a slow phone.
  const setCount = (v) => {
    if (!countEl || v === shown) return;
    shown = v;
    countEl.textContent = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // The reading pass, `e` ms in: the band (rows [lead - 3, lead) of the list), then the regions, then the rest.
  function drawPass(e, bends) {
    const rows = rowStart.length - 1, u = Math.min(1, Math.max(0, e / PASS[0]));
    const lead = Math.floor(u * (rows + 3));
    if (u < 1) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = colors.band;
      dots(ctx, rowStart[Math.max(0, Math.min(rows, lead - 3))], rowStart[Math.min(rows, lead)], r);
    }
    setCount(rowStart[Math.min(rows, lead)]);
    const lit = Math.min(1, Math.max(0, (e - PASS[0]) / (PASS[1] - PASS[0])));
    const grown = Math.min(1, Math.max(0, (e - PASS[1]) / (PASS[2] - PASS[1])));
    if (lit > 0) drawSelection(current, lit, grown, 1 - (1 - grown) ** 3, bends);
  }

  function draw(now = performance.now()) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const bends = [0, 0, 0, 0];
    if (introState === 'running') drawPass(now - passStart, bends);
    else for (const sel of sels) if (sel.alpha > 0) drawSelection(sel, sel.alpha, sel.alpha, 1 - (1 - sel.alpha) ** 3, bends);
    ctx.globalAlpha = 1;                             // the document marker
    ctx.fillStyle = colors.paper; ctx.strokeStyle = colors.ink; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(q.x, q.y, 5, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = colors.ink;
    ctx.beginPath(); ctx.arc(q.x, q.y, 1.6, 0, TAU); ctx.fill();
  }

  function frame(t) {
    raf = 0;
    const dt = Math.min(48, Math.max(8, t - last)), ease = 1 - Math.exp(-dt / 150);
    last = t;
    q = { x: q.x + (target.x - q.x) * ease, y: q.y + (target.y - q.y) * ease };
    let busy = Math.abs(target.x - q.x) + Math.abs(target.y - q.y) > 0.3;
    if (!busy) q = target;
    if (introState === 'running') {
      if (t - passStart >= PASS[2]) finishPass(); else busy = true;
    }
    // Cross-fade: the new selection rises; the older ones share what is left, so the sum stays at 1.
    if (introState !== 'running' && sels.includes(current) && (current.alpha < 1 || sels.length > 1)) {
      current.alpha = Math.min(1, current.alpha + dt / FADE);
      const older = sels.filter((s) => s !== current), left = 1 - current.alpha;
      const total = older.reduce((a, s) => a + s.alpha, 0);
      if (total > left) for (const s of older) s.alpha = total ? (s.alpha * left) / total : 0;
      sels = sels.filter((s) => s === current || s.alpha > 0.002);
      busy = true;
    }
    draw(t);
    if (busy) kick();
  }
  function kick() {
    if (raf || !ready || !onScreen || document.hidden || still.matches) return;   // reduced motion draws at once
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  const halt = () => { cancelAnimationFrame(raf); raf = 0; };

  // ---- the introduction ----------------------------------------------------------------------------------
  // Until it plays, the plate shows the dots and the document only (the selection is held back).
  function schedule() {
    clearTimeout(introTimer);
    introTimer = setTimeout(beginPass, INTRO_WAIT);
  }
  function startIntro() {
    if (introState !== 'waiting' || !ready || !seen || still.matches) return;
    introState = 'pending';
    schedule();
  }
  function beginPass() {
    if (introState !== 'pending') return;
    if (!onScreen) { introState = 'waiting'; seen = false; return; }   // scrolled away meanwhile: play it when the plate is back
    introState = 'running';
    plate.dataset.intro = 'running';
    passStart = performance.now();
    setCount(0);
    kick();
  }
  function finishPass() {
    introState = 'done';
    delete plate.dataset.intro;
    setCount(TOTAL);
    current.alpha = 1;
    sels = [current];
  }
  // A pointer move, a drag, a tap, the button or (touch screens) a scroll past the plate ends the introduction: one
  // that has not begun never plays, and a running one hands over to the complete selection through the cross-fade
  // (well under 400 ms).
  function stopIntro() {
    if (introState === 'done') return;
    clearTimeout(introTimer);
    const e = introState === 'running' ? performance.now() - passStart : 0;
    introState = 'done';
    delete plate.dataset.intro;
    setCount(TOTAL);
    current.alpha = Math.min(1, Math.max(0, (e - PASS[0]) / (PASS[2] - PASS[0])));
    sels = [current];
    kick();
  }
  // ---- wiring -------------------------------------------------------------------------------------------
  // Three short steps, each ending its own frame, so none of them holds a long animation frame on a slow phone:
  // the grid, then the dots on the off-screen canvas (both when the browser is idle; neither needs a repaint), then
  // the first frame, requested from a timeout (the CSS texture stays until then).
  function start() {
    if (ready || starting || !layout(false)) return;
    starting = true;
    idle(() => { stale = false; paintBase(); setTimeout(() => requestAnimationFrame(first)); }, 16);
  }
  function first() {
    starting = false;
    const box = stage.getBoundingClientRect();     // resized or re-themed meanwhile (rare): lay out or paint again
    if (Math.round(box.width) !== w || Math.round(box.height) !== h) { if (!layout()) return; } else { fitCanvas(); if (stale) paintBase(); }
    ready = true;
    if (still.matches) introState = 'done';
    const [x, y] = freePoint(0);
    target = q = clamp(x, y);
    current = makeSelection(0);
    current.alpha = introState === 'done' ? 1 : 0;
    sels = introState === 'done' ? [current] : [];
    draw();
    plate.classList.add('is-live');                  // hides the CSS stand-in texture, shows the legend's field items
    startIntro();
  }
  const local = (e) => { const b = stage.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };

  // Mouse and pen: the document follows the pointer anywhere over the hero.
  hero.addEventListener('pointermove', (e) => {
    if (!ready || still.matches || e.pointerType === 'touch') return;
    stopIntro();
    glideTo(...local(e));
  }, { passive: true });

  // A tap (or a click) on the dots picks a new selection at that spot; on the photograph it turns the portrait.
  // A horizontal touch drag moves the document. Vertical drags and pinches belong to the browser
  // (touch-action: pan-y pinch-zoom), which cancels them.
  let down = null;
  stage.addEventListener('pointerdown', (e) => {
    if (!ready || e.target.closest('button, a')) { down = null; return; }
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, dragged: false, photo: !!(portrait && portrait.contains(e.target)) };
  }, { passive: true });
  stage.addEventListener('pointermove', (e) => {
    if (!down || e.pointerId !== down.id || e.pointerType !== 'touch' || still.matches) return;
    if (!down.dragged && Math.hypot(e.clientX - down.x, e.clientY - down.y) < TAP_SLOP) return;
    down.dragged = true;
    stopIntro();
    glideTo(...local(e));
  }, { passive: true });
  stage.addEventListener('pointerup', (e) => {
    if (!down || e.pointerId !== down.id) return;
    const tap = !down.dragged && Math.hypot(e.clientX - down.x, e.clientY - down.y) < TAP_SLOP, onPhoto = down.photo;
    down = null;
    if (!tap) return;
    stopIntro();
    if (onPhoto) { flip?.click(); return; }
    const [x, y] = local(e);
    jump(x, y, 1000 + Math.round(x / 40) * 73 + Math.round(y / 40) * 997 + ++taps * 7919);
  });
  stage.addEventListener('pointercancel', () => { down = null; });

  plate.querySelector('[data-field-again]')?.addEventListener('click', () => {
    if (!ready) return;
    stopIntro();
    n += 1;
    jump(...freePoint(n), n);
    const k = current.regions.length;                // one chosen code per region
    // Numbered, so two messages in a row always differ (a live region may stay silent when its text is unchanged).
    if (status) status.textContent = `Example document ${++presses}: ${k} regions, ${k} codes chosen.`;
  });

  // Touch screens have no pointer to follow: while the plate crosses the screen, scrolling walks the document
  // along a fixed path through the field, showing the complete selection (a scroll ends the introduction).
  // No frames while the page is still; none under reduced motion.
  let path = null;
  const pathPoint = (t) => {
    if (!path) path = [100, 101, 102, 103].map(freePoint).sort((a, b) => a[1] - b[1]);
    const s = Math.min(path.length - 1.0001, Math.max(0, t * (path.length - 1))), i = Math.floor(s), f = s - i;
    return [path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f];
  };
  window.addEventListener('scroll', () => {
    if (!ready || !onScreen || still.matches || !touchFirst.matches) return;
    const b = stage.getBoundingClientRect(), vh = window.innerHeight;
    const t = Math.min(1, Math.max(0, (vh - b.top) / (vh + b.height)));
    stopIntro();
    glideTo(...pathPoint(t));
  }, { passive: true });

  let resizing = 0;
  const relayout = () => {
    clearTimeout(resizing);
    resizing = setTimeout(() => {
      if (!ready) return start();
      const box = stage.getBoundingClientRect();
      if (Math.round(box.width) === w && Math.round(box.height) === h) return; // nothing changed
      const fx = target.x / w, fy = target.y / h;
      if (!layout()) return;
      path = null;
      q = target = clamp(fx * w, fy * h);
      if (introState === 'running') finishPass();
      current = makeSelection(current.seed);         // lanes follow the new rows
      current.alpha = introState === 'done' ? 1 : 0;
      sels = introState === 'done' ? [current] : [];
      draw();
    }, 120);
  };
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(stage);
  else window.addEventListener('resize', relayout);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];     // the latest state (a slow thread can deliver several at once)
      onScreen = entry.isIntersecting;
      const root = entry.rootBounds;
      if (!seen && (entry.intersectionRatio >= 0.6 || (root && entry.intersectionRect.height >= 0.6 * root.height))) { seen = true; startIntro(); }
      if (!onScreen && introState === 'running') finishPass();   // nobody watching: settle on the complete selection
      onScreen ? kick() : halt();
    }, { threshold: [0, 0.6, 1] }).observe(stage);
  } else {
    onScreen = seen = true;
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? halt() : kick()));
  // Reduced motion switched on mid-animation: settle at once.
  still.addEventListener?.('change', () => { if (still.matches && ready) { halt(); stopIntro(); q = target; current.alpha = 1; sels = [current]; draw(); } });
  document.addEventListener('themechange', () => { if (ready) { paintBase(); draw(); } else stale = true; });

  // Start when the browser is idle, so the field never competes with the first paint of the text.
  idle(start);
}

try {
  initField();
} catch (err) {
  console.warn('[field] failed', err);
}
