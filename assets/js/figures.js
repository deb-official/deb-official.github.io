// figures.js — the paper figures. They are complete and static without this script. Here they get:
//   1. the dashed loop-back arrow of the MISTILL figures, routed between the token chips for any wrapping;
//   2. a short one-shot playback that tells a figure's story (once when first seen, again on "Replay");
//   3. the enlarged copy of a figure inside its dialog, and [data-goto] jumps between steps and panels.
// Playback only changes emphasis (never hides content), ends in the static state and stays under 5 seconds.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const timers = new WeakMap();

// ---- playback plumbing ---------------------------------------------------------------------------------
function stop(fig) {
  for (const id of timers.get(fig) || []) clearTimeout(id);
  timers.delete(fig);
  fig.removeAttribute('data-playing');
  fig.removeAttribute('data-planted');
  for (const el of fig.querySelectorAll('.is-on, .is-now, .is-read, .is-swapped')) el.classList.remove('is-on', 'is-now', 'is-read', 'is-swapped');
}

// steps: [[msAfterPreviousStep, fn], ...]; the figure returns to its static state after the last one.
function play(fig, steps) {
  stop(fig);
  if (reduceMotion.matches) return;
  fig.setAttribute('data-playing', '');
  const ids = [];
  let at = 0;
  for (const [wait, fn] of steps) { at += wait; ids.push(setTimeout(fn, at)); }
  timers.set(fig, ids);
}

// ---- MISTILL: N18.9 is written token by token -------------------------------------------------------------
function playMistill(fig) {
  const code = [...fig.querySelectorAll('.tok--code')];
  const rows = fig.querySelectorAll('.inv__row--n');
  const near = fig.querySelector('[data-tok="near"]');
  const nearRow = fig.querySelector('[data-row="near"]');
  const loop = fig.querySelectorAll('.trace__arrow, .trace__loop');
  const light = (i) => () => {
    for (const t of code) t.classList.remove('is-now');
    code[i].classList.add('is-on', 'is-now');
  };
  play(fig, [
    [250, () => { rows.forEach((r) => r.classList.add('is-read')); light(0)(); }],           // P1: which region
    [520, () => { rows.forEach((r) => r.classList.remove('is-read')); light(1)(); }],        // P2
    [360, light(2)],                                                                         // P2
    [360, light(3)],                                                                         // the separator
    [360, () => { light(4)(); loop.forEach((el) => el.classList.add('is-on')); near?.classList.add('is-now'); nearRow?.classList.add('is-now'); }], // P2C: against the near-miss
    [1050, () => stop(fig)],
  ]);
}

// ---- PLANT: scores -> ranking -> the j/h swap and its nDCG weight -> probability -> objective -> planted ---
// About 3.1 s in all; the steps not yet shown wait at half opacity (emphasis, never hidden).
function playPlant(fig) {
  const on = (n) => () => fig.querySelectorAll(`.step[data-step="${n}"]`).forEach((g) => g.classList.add('is-on'));
  const swap = (flag) => () => fig.querySelectorAll('.pfig').forEach((svg) => svg.classList.toggle('is-swapped', flag));
  play(fig, [
    [150, on(1)],
    [320, on(2)],
    [320, on(3)],
    [220, swap(true)],
    [560, swap(false)],
    [250, on(4)],
    [350, on(5)],
    [350, () => fig.setAttribute('data-planted', '')],
    [560, () => stop(fig)],
  ]);
}

// ---- MISTILL loop-back arrow -----------------------------------------------------------------------------
// A polyline with rounded corners through the given points.
function roundedPath(pts, radius) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1], [x, y] = pts[i], [nx, ny] = pts[i + 1];
    const r = Math.min(radius, Math.hypot(x - px, y - py) / 2, Math.hypot(nx - x, ny - y) / 2);
    const a = Math.atan2(y - py, x - px), b = Math.atan2(ny - y, nx - x);
    d += `L${(x - r * Math.cos(a)).toFixed(1)} ${(y - r * Math.sin(a)).toFixed(1)}Q${x.toFixed(1)} ${y.toFixed(1)} ${(x + r * Math.cos(b)).toFixed(1)} ${(y + r * Math.sin(b)).toFixed(1)}`;
  }
  const end = pts[pts.length - 1];
  return `${d}L${end[0].toFixed(1)} ${end[1].toFixed(1)}`;
}

function setupLoopArrow(trace) {
  const svg = trace.querySelector('.trace__arrow');
  const near = trace.querySelector('[data-tok="near"] .tok__chip');
  const last = trace.querySelector('[data-tok="last"]');
  const label = trace.querySelector('.trace__loop');
  if (!svg || !near || !last || !label) return;
  const [line, head] = svg.querySelectorAll('path');

  const draw = () => {
    const origin = trace.getBoundingClientRect();
    if (!origin.width) return;
    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top - origin.top, bottom: r.bottom - origin.top, cx: (r.left + r.right) / 2 - origin.left };
    };
    const from = box(last), to = box(near), text = box(label.firstElementChild), lab = box(label);
    const oneRow = getComputedStyle(trace).display === 'grid';       // the wide layout
    const start = [from.cx, from.top - 2], end = [to.cx, to.top - 4];
    let pts;
    if (oneRow) {
      const y = (text.top + text.bottom) / 2;                         // the label sits on the line and interrupts it
      pts = [start, [from.cx, y], [to.cx, y], end];
    } else {
      const lane = lab.bottom - 4;                                    // just under the label
      const sameLine = Math.abs(box(last.querySelector('.tok__chip')).bottom - to.bottom) < 4;
      pts = sameLine
        ? [start, [from.cx, lane], [to.cx, lane], end]
        : [start, [from.cx, from.top - 6], [5, from.top - 6], [5, lane], [to.cx, lane], end]; // out to the left margin and up
    }
    line.setAttribute('d', roundedPath(pts, 7));
    head.setAttribute('d', `M${end[0].toFixed(1)} ${(end[1] + 3).toFixed(1)}l-4.2 -7.5h8.4z`);
  };

  draw();
  if ('ResizeObserver' in window) new ResizeObserver(draw).observe(trace);
  else window.addEventListener('resize', draw);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
}

// ---- wiring ------------------------------------------------------------------------------------------------
const players = { mistill: playMistill, plant: playPlant };

// [data-goto="id"]: scroll to a step or a panel inside the current view (also picks a panel of a stepped figure).
function goTo(id) {
  const el = document.getElementById(id);
  if (!el) return false;
  // A panel of a stepped figure: make it the one that shows on phones, and mark it in the figure's index.
  const stepped = el.parentElement.closest('.mfig[data-stepped]');
  if (stepped && el.parentElement === stepped) {
    for (const panel of stepped.querySelectorAll(':scope > .mfig__panel')) panel.classList.toggle('is-current', panel === el);
    for (const b of stepped.parentElement.querySelectorAll('.mfig__index [data-goto]')) {
      if (b.dataset.goto === id) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    }
  }
  // Move focus (and the screen reader) with the jump; the target is focusable by script only.
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
  const smooth = reduceMotion.matches ? 'auto' : 'smooth';
  // A panel of the stepped figure is scrolled to by its index (the panel sits right under it), so the index
  // stays in view however many lines it wraps to.
  const index = stepped && el.parentElement === stepped ? stepped.parentElement.querySelector('.mfig__index') : null;
  const anchor = index && getComputedStyle(index).display !== 'none' ? index : el;
  const top = anchor.getBoundingClientRect().top;
  // Inside a dialog only its body may move: scrollIntoView would also scroll the page behind it.
  const body = el.closest('.dialog__body');
  if (body) {
    const offset = top - body.getBoundingClientRect().top;
    if (offset < 0 || offset > body.clientHeight * 0.5) body.scrollTo({ top: body.scrollTop + offset - 8, behavior: smooth });
    return true;
  }
  const inView = top >= 0 && top < window.innerHeight * 0.6;
  anchor.scrollIntoView({ behavior: smooth, block: inView ? 'nearest' : 'start', inline: 'nearest' });
  return true;
}

// <div data-figure-clone="figure-id"> inside a dialog receives a copy of that figure the first time the dialog
// opens, so the enlarged figure and the card figure share one piece of markup.
function fillClones(dialog) {
  for (const slot of dialog.querySelectorAll('[data-figure-clone]')) {
    const source = document.getElementById(slot.dataset.figureClone);
    if (!source || slot.firstChild) continue;
    const copy = source.cloneNode(true);
    copy.removeAttribute('id');
    stop(copy);
    slot.append(copy);
    copy.querySelectorAll('[data-trace]').forEach(setupLoopArrow);
  }
}

// ---- the full MISTILL figure: the dotted arrow from the chapter letter to its region (wide layout) ----------
function setupFullFigure(mfig) {
  const svg = mfig.querySelector('.mfig__link');
  const from = mfig.querySelector('[data-link-from]');
  const to = mfig.querySelector('[data-link-to]');
  if (svg && from && to) {
    const [line, head] = svg.querySelectorAll('path');
    const draw = () => {
      const o = mfig.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      if (!o.width || getComputedStyle(svg).display === 'none') return;   // stepped layout: the panels are apart
      const x1 = (a.left + a.right) / 2 - o.left, y1 = a.top - o.top - 3;
      const x2 = b.left + b.width * 0.3 - o.left, y2 = b.bottom - o.top + 9;
      line.setAttribute('d', `M${x1.toFixed(1)} ${y1.toFixed(1)}C${x1.toFixed(1)} ${(y1 - 56).toFixed(1)} ${(x2 - 12).toFixed(1)} ${(y2 + 50).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`);
      head.setAttribute('d', `M${x2.toFixed(1)} ${(y2 - 7).toFixed(1)}l-4.200 8h8.400z`);
    };
    draw();
    if ('ResizeObserver' in window) new ResizeObserver(draw).observe(mfig);
  }
}

function initFigures() {
  document.querySelectorAll('[data-trace]').forEach(setupLoopArrow);
  document.querySelectorAll('.mfig--full').forEach(setupFullFigure);
  // The stepped layout of the full figure (one panel at a time, chosen from the index) needs this script, so it
  // is switched on here: if figures.js does not run, the five panels simply stack.
  document.querySelectorAll('figure[data-figure="mistill-full"]').forEach((f) => f.classList.add('is-stepping'));

  document.addEventListener('click', (e) => {
    const play = e.target.closest('[data-figure-play]');
    const fig = play && play.closest('[data-figure]');
    if (fig) players[fig.dataset.figure]?.(fig);
    const jump = e.target.closest('[data-goto]');
    if (jump && goTo(jump.dataset.goto)) e.preventDefault();
    const opener = e.target.closest('[data-dialog-open]');
    const dialog = opener && document.getElementById(opener.dataset.dialogOpen);
    if (dialog) fillClones(dialog);
  });
  // Printing during a playback prints the static figure, never a half-played one: the playback stops and the colour
  // and opacity transitions back to the static state finish at once (the page is printed as it is at that moment).
  window.addEventListener('beforeprint', () => {
    for (const fig of document.querySelectorAll('[data-figure][data-playing]')) {
      stop(fig);
      if (fig.getAnimations) for (const a of fig.getAnimations({ subtree: true })) a.finish();
    }
  });

  // Each figure plays once, the first time at least half of it is on screen, or (a figure taller than the
  // screen, e.g. on a landscape phone) when it fills at least 60% of the screen's height.
  if (!('IntersectionObserver' in window) || reduceMotion.matches) return;
  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const tall = e.rootBounds && e.intersectionRect.height >= 0.6 * e.rootBounds.height;
      if (e.intersectionRatio < 0.5 && !tall) continue;
      seen.unobserve(e.target);
      players[e.target.dataset.figure]?.(e.target);
    }
  }, { threshold: [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1] });
  for (const fig of document.querySelectorAll('[data-figure]')) if (players[fig.dataset.figure]) seen.observe(fig);
}

try {
  initFigures();
} catch (err) {
  console.warn('[figures] failed', err);
}
