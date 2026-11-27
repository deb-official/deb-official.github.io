/* PLANT project site — interactions. No build step, no dependencies beyond KaTeX.
   Paper numbers live in data.js; attention case studies in attention_data.js; the code map in codemap.js. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const D = window.PLANT_DATA;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrow = matchMedia("(max-width: 640px)");
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const press = (group, on) => $$("button", group).forEach((b) => b.setAttribute("aria-pressed", String(b === on)));
  // Runs fn once, when el first scrolls into view. Until then it waits in `pending`, so printing can run it
  // early (onPrint, if given, replaces fn there, e.g. to skip an animation).
  const pending = new Map();
  const onView = (el, fn, opts, onPrint) => {
    if (!("IntersectionObserver" in window)) return fn();
    const go = (f) => { if (!pending.has(go)) return; pending.delete(go); io.disconnect(); f(); };
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) go(fn); }), opts || { threshold: 0.25 });
    pending.set(go, onPrint || fn); io.observe(el);
  };
  const legend = (items) => `<div class="legend">${items.map(([cls, t]) => `<span><i class="${cls}"></i>${t}</span>`).join("")}</div>`;
  const redraws = {};   // charts to redraw when a results tab opens
  const grow = (root) => requestAnimationFrame(() => requestAnimationFrame(() => $$("i[data-w]", root).forEach((i) => (i.style.width = i.dataset.w + "%"))));

  /* ---------- math: a wide form, and a stacked form (data-tex-narrow) for phones and for boxes too narrow for the wide one.
     KaTeX loads after this script, so nothing else waits for it; the formulas appear when it arrives. ---------- */
  function put(el, form) {
    const tex = form === "n" ? el.dataset.texNarrow : el.dataset.tex;
    try { katex.render(tex, el, { displayMode: el.classList.contains("math-d"), throwOnError: false, trust: true, strict: false }); }
    catch (e) { el.textContent = tex; }
    el.dataset.done = form;
  }
  function renderMath() {
    if (!window.katex) return;
    $$(".math").forEach((el) => {
      let form = narrow.matches && el.dataset.texNarrow ? "n" : "w";
      if (form === "w" && el.dataset.texNarrow && el.offsetParent) {   // try the wide form; stack it if it does not fit
        if (el.dataset.done !== "w") put(el, "w");
        if (el.scrollWidth > el.clientWidth + 1) form = "n";
      }
      if (el.dataset.done !== form) put(el, form);
    });
  }
  function math() {
    const go = () => {
      renderMath(); scrollers();
      if (document.fonts) document.fonts.ready.then(() => { renderMath(); scrollers(); });   // re-measure in KaTeX's own fonts
    };
    if (window.katex) return go();
    const s = $("#katex-js"); if (!s) return;
    s.addEventListener("load", go);
    s.addEventListener("error", () => $$(".math").forEach((el) => { if (!el.dataset.done) el.textContent = el.dataset.tex; }));
  }

  /* ---------- chrome: nav, theme, reveal, definitions ---------- */
  function chrome() {
    const nav = $("#nav"), hero = $(".hero"), bar = $("#progress"), root = document.documentElement;
    // Sizes are read only when the layout changes (a ResizeObserver fires after layout), and scroll work runs
    // once per frame, so scrolling never forces a reflow.
    let heroH = hero.offsetHeight, maxScroll = root.scrollHeight - innerHeight, ticking = false;
    const update = () => {
      ticking = false;
      const y = scrollY;
      nav.classList.toggle("scrolled", y > 8);
      nav.classList.toggle("solid", y > heroH - 70);
      bar.style.transform = "scaleX(" + (maxScroll > 0 ? Math.min(1, y / maxScroll) : 0) + ")";
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    const measure = () => { heroH = hero.offsetHeight; maxScroll = root.scrollHeight - innerHeight; onScroll(); };
    if ("ResizeObserver" in window) new ResizeObserver(measure).observe(document.body);
    addEventListener("resize", () => requestAnimationFrame(measure));
    addEventListener("scroll", onScroll, { passive: true }); update();
    if (narrow.addEventListener) narrow.addEventListener("change", () => { renderMath(); scrollers(); });

    const themeBtn = $("#theme");
    const syncTheme = () => themeBtn.setAttribute("aria-pressed", String(root.dataset.theme === "dark"));
    syncTheme();
    themeBtn.addEventListener("click", () => {
      const t = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = t; syncTheme();
      try { localStorage.setItem("plant-theme", t); } catch (e) {}
      drawDots(1);
    });

    // under 860 px the section links move into a menu; it copies the links that remain (hidden sections are gone)
    const menuBtn = $("#menu-btn"), menu = $("#menu");
    menu.innerHTML = $$(".nav-links a").map((a) => `<a href="${a.getAttribute("href")}">${a.textContent}</a>`).join("");
    const setMenu = (open, refocus) => {
      menu.hidden = !open; menuBtn.setAttribute("aria-expanded", String(open));
      if (refocus) menuBtn.focus();
    };
    menuBtn.addEventListener("click", () => setMenu(menu.hidden));
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) setMenu(false, menu.contains(document.activeElement) || document.activeElement === menuBtn); });
    document.addEventListener("click", (e) => { if (!menu.hidden && !menu.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false); });
    const wide = matchMedia("(min-width: 861px)");
    if (wide.addEventListener) wide.addEventListener("change", () => { if (wide.matches) setMenu(false); });

    // terms with a definition: reachable by keyboard and tap, and read out by screen readers
    $$(".term").forEach((el) => {
      el.tabIndex = 0;
      const s = document.createElement("span"); s.className = "sr"; s.textContent = " (" + el.dataset.def + ")"; el.appendChild(s);
    });

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0, rootMargin: "0px 0px 12% 0px" });
      $$(".rv").forEach((el) => io.observe(el));
      const links = $$(".nav-links a");
      const spy = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id));
      }), { rootMargin: "-45% 0px -50% 0px" });
      $$("section[id]").forEach((s) => spy.observe(s));
    } else $$(".rv").forEach((el) => el.classList.add("in"));

    $("#copy-bib").addEventListener("click", (e) => {
      const btn = e.currentTarget, status = $("#copy-status"), pre = $("#bibtex"), text = pre.textContent;   // status: a polite live region
      const show = (b, s) => { btn.textContent = b; status.textContent = s; setTimeout(() => { btn.textContent = "Copy"; status.textContent = ""; }, 2400); };
      // No async clipboard (plain http, older browsers): copy through a hidden textarea, and if even that is
      // refused, select the entry so that Ctrl+C or ⌘C copies it.
      const fallback = () => {
        const ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
        document.body.appendChild(ta); ta.select();
        let ok = false; try { ok = document.execCommand("copy"); } catch (err) {}
        ta.remove(); btn.focus();
        if (ok) return show("Copied", "Copied");
        const r = document.createRange(); r.selectNodeContents(pre); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
        show("Selected", "BibTeX selected; press Ctrl+C or ⌘C to copy it");
      };
      if (navigator.clipboard && window.isSecureContext !== false) navigator.clipboard.writeText(text).then(() => show("Copied", "Copied"), fallback);
      else fallback();
    });
  }

  /* ---------- printing: everything that normally waits to be scrolled into view is drawn first ---------- */
  function printing() {
    addEventListener("beforeprint", () => {
      [...pending].forEach(([go, f]) => go(f));
      $$(".rv").forEach((el) => el.classList.add("in"));
      $$("i[data-w]").forEach((i) => (i.style.width = i.dataset.w + "%"));   // bars, including those in closed tabs, at full length
    });
  }

  /* ---------- boxes that scroll sideways get a tab stop and a name, so the keyboard can scroll them in every browser ---------- */
  const SCROLLERS = [[".math-d", "Equation"], [".pipe-scroll", "Pipeline diagram"], [".tbl-scroll", "Table"]];
  function scrollers() {
    SCROLLERS.forEach(([sel, name]) => $$(sel).forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 1) { el.tabIndex = 0; el.setAttribute("role", "region"); el.setAttribute("aria-label", name); }
      else if (el.getAttribute("role") === "region") { el.removeAttribute("tabindex"); el.removeAttribute("role"); el.removeAttribute("aria-label"); }
    }));
  }
  function scrollWatch() {
    scrollers();
    let t; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => { renderMath(); scrollers(); }, 200); });
  }

  /* ---------- hero: label attention, random vs planted (illustration: synthetic note, hand-set weights).
     The note (one <span> per word) and the label chips are in index.html, so the box has its final size before
     this script runs; the weights below key on the words of that note. ---------- */
  const LABELS = [
    { code: "I50.9", name: "Heart failure", rgb: "127 224 168", w: { congestive: 1, heart: 1, failure: 1, bnp: 0.75, ef: 0.7, furosemide: 0.6, "30%": 0.55, orthopnea: 0.55, jvp: 0.5, dyspnea: 0.4, diuresis: 0.4, edema: 0.4, crackles: 0.35, echo: 0.3 } },
    { code: "I48.91", name: "Atrial fibrillation", rgb: "112 205 242", w: { atrial: 1, fibrillation: 1, apixaban: 0.8, irregular: 0.65, ecg: 0.5, pulse: 0.4, rate: 0.35, "112": 0.3 } },
    { code: "E11.9", name: "Type 2 diabetes", rgb: "246 180 106", w: { diabetes: 1, mellitus: 0.9, metformin: 0.8, insulin: 0.75, glucose: 0.65, type: 0.45, "2": 0.45 } }
  ];
  function demo() {
    const noteEl = $("#demo-note"), labEl = $("#demo-labels"), cap = $("#demo-caption"), modeEl = $("#demo-mode"), play = $("#demo-play");
    const spans = $$("span", noteEl), keys = spans.map((sp) => sp.textContent.toLowerCase().replace(/^[^\w%]+|[^\w%]+$/g, ""));
    if (!$(".chip", labEl)) labEl.innerHTML = LABELS.map((l, i) => `<button type="button" class="chip" data-i="${i}" style="--spot:${l.rgb}">${l.code} · ${l.name}</button>`).join("");
    // The tour runs once: random then planted for each label, and it ends planted on the last label.
    const TOUR = LABELS.flatMap((_, i) => [[i, "random", 2000], [i, "planted", 4200]]);
    let li = 0, mode = "random", jit = null, timer = null, at = 0;
    function paint() {
      const L = LABELS[li];
      noteEl.style.setProperty("--spot", L.rgb);
      spans.forEach((sp, i) => {
        const w = mode === "planted" ? L.w[keys[i]] || 0 : (Math.random() < 0.28 ? 0.12 + Math.random() * 0.4 : 0)   /* random start: sparse and faint */;
        sp.style.setProperty("--w", w.toFixed(2));
        sp.classList.toggle("hi", w > 0.6);   // strong weights read as solid pills with dark text
      });
      $$(".chip", labEl).forEach((c, i) => c.setAttribute("aria-pressed", String(i === li)));
      $$("button", modeEl).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
      cap.textContent = mode === "planted"
        ? "Planted: attention for " + L.code + " lands on the tokens that tell on it."
        : "Random start: attention for " + L.code + " is spread across the note.";
    }
    // the play button is a toggle named "Pause animation": pressed whenever nothing is moving
    const sync = () => play.setAttribute("aria-pressed", String(!(timer || jit)));
    const stopJitter = () => { clearInterval(jit); jit = null; };
    function setMode(m, jitter) {
      mode = m; stopJitter();
      if (m === "random" && jitter && !reduce) {   // repaint the random weights four times (about 5 s), then hold still
        let k = 0;
        jit = setInterval(() => { if (document.hidden) return; paint(); if (++k >= 4) { stopJitter(); sync(); } }, 1300);
      }
      paint();
    }
    function tour() {
      const [i, m, ms] = TOUR[at];
      li = i; setMode(m, true);
      timer = setTimeout(() => { timer = null; if (++at < TOUR.length) tour(); else { at = 0; stopJitter(); sync(); } }, ms);
      sync();
    }
    const halt = () => { clearTimeout(timer); timer = null; stopJitter(); };
    labEl.addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return; halt(); at = 0; li = +b.dataset.i; setMode(mode, false); sync(); });
    modeEl.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; halt(); at = 0; setMode(b.dataset.mode, true); sync(); });
    play.addEventListener("click", () => { if (timer || jit) { halt(); sync(); } else tour(); });   // play resumes the tour where it paused
    if (reduce) { setMode("planted", false); sync(); } else tour();
  }

  /* ---------- problem: long tail of MIMIC-III (5,411 of 8,929 codes appear < 10 times) ---------- */
  let dotsShown = false;
  function drawDots(t) {
    const c = $("#dots"); if (!c || !c.clientWidth) return;
    const dpr = window.devicePixelRatio || 1, w = c.clientWidth, cols = 47, total = 893, rare = 541, cell = w / cols;
    c.width = w * dpr; c.height = Math.ceil(total / cols) * cell * dpr;
    const g = c.getContext("2d"); g.scale(dpr, dpr);
    const cm = cssVar("--mig"), cb = cssVar("--base"), first = total - rare;
    for (let i = 0; i < total; i++) {
      const lit = i >= first && (i - first) / rare < t;
      g.globalAlpha = lit ? 1 : 0.55; g.fillStyle = lit ? cm : cb;
      g.beginPath(); g.arc((i % cols + 0.5) * cell, (Math.floor(i / cols) + 0.5) * cell, cell * (lit ? 0.33 : 0.27), 0, 6.3); g.fill();
    }
  }
  function dots() {
    drawDots(0);
    const full = () => { dotsShown = true; drawDots(1); };
    onView($("#dots"), () => {
      if (reduce) return full();
      const t0 = performance.now();
      (function tick(now) { const t = Math.min(1, (now - t0) / 1500); drawDots(1 - Math.pow(1 - t, 3)); if (t < 1) requestAnimationFrame(tick); else dotsShown = true; })(t0);
    }, null, full);
    addEventListener("resize", () => drawDots(dotsShown ? 1 : 0));
  }

  /* ---------- method: stage toggle, applied to the wide and the phone drawing ---------- */
  function pipeline() {
    const seg = $("#stage-seg");
    function set(stage) {
      $$(".pipe").forEach((svg) => {
        svg.classList.toggle("s2", stage === "2");
        $$("[data-s1]", svg).forEach((el) => {
          el.classList.remove("train", "dim", "flow");
          (el.dataset["s" + stage] || "").split(" ").filter(Boolean).forEach((c) => el.classList.add(c));
        });
      });
      $$(".stage-card").forEach((c) => c.classList.toggle("on", c.dataset.stage === stage));
      $$("button", seg).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.stage === stage)));
    }
    seg.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) set(b.dataset.stage); });
    $$(".stage-card").forEach((c) => c.addEventListener("click", () => set(c.dataset.stage)));
    set("1");
    // the dashed "flow" arrows animate only while their drawing is on screen
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("paused", !e.isIntersecting)));
      $$(".pipe").forEach((svg) => { svg.classList.add("paused"); io.observe(svg); });
    }
  }

  /* ---------- stage 1, step A: mutual information calculator (App. B worked example) ---------- */
  function mig() {
    const N = 100, presets = [
      { name: "“fever” and common label B", L: 50, T: 40, B: 25 },
      { name: "“rare_disease” and rare label A", L: 5, T: 6, B: 5 }
    ];
    const iL = $("#mi-l"), iT = $("#mi-t"), iB = $("#mi-b"), box = $("#mig-presets");
    box.innerHTML = presets.map((p, i) => `<button class="tab" data-i="${i}" aria-pressed="false">${p.name}</button>`).join("");
    const pct = (x) => (x * 100).toFixed(0) + "%";
    function calc() {
      const L = +iL.value, T = +iT.value;
      const lo = Math.max(0, L + T - N), hi = Math.min(L, T);       // "both" cannot exceed either count
      const B = Math.min(hi, Math.max(lo, +iB.value)); iB.value = B;
      const px = [1 - L / N, L / N], py = [1 - T / N, T / N];
      const cells = { c11: [B, 1, 1], c10: [L - B, 1, 0], c01: [T - B, 0, 1], c00: [N - L - T + B, 0, 0] };
      let tot = 0;
      Object.keys(cells).forEach((id) => {
        const [n, x, y] = cells[id], p = n / N, v = p > 0 ? p * Math.log2(p / (px[x] * py[y])) : 0; tot += v;
        const td = $("#" + id); td.className = v > 0.0005 ? "pos" : v < -0.0005 ? "neg" : "";
        td.innerHTML = "<b>" + p.toFixed(2) + "</b><span>" + (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(3) + "</span>";
      });
      tot = Math.max(0, tot);
      $("#mo-l").value = L; $("#mo-t").value = T; $("#mo-b").value = B + (B === hi ? " (the most possible)" : "");
      iB.setAttribute("aria-valuetext", $("#mo-b").value);   // the outputs are not live; the slider itself says it
      $("#mig-bits").textContent = tot.toFixed(3);
      const pl = L / N, plt = B / T;
      $("#mm-co").style.width = pct(B / N); $("#mv-co").textContent = B;
      $("#mm-pl").style.width = pct(pl); $("#mv-pl").textContent = pct(pl);
      $("#mm-plt").style.width = pct(plt); $("#mv-plt").textContent = pct(plt);
      $("#mm-mi").style.width = pct(Math.min(1, tot)); $("#mv-mi").textContent = tot.toFixed(3);
      $("#mig-say").textContent = "The token and the label occur together in " + B + " of " + N + " documents. Seeing the token moves the probability of the label from " + pct(pl) + " to " + pct(plt) + (tot < 0.05 ? ", so it tells you little." : tot > 0.2 ? ", so it nearly decides the label." : ".");
      $$("button", box).forEach((b) => { const p = presets[+b.dataset.i]; b.setAttribute("aria-pressed", String(p.L === L && p.T === T && p.B === B)); });
    }
    function load(p) { iL.value = p.L; iT.value = p.T; iB.value = p.B; calc(); }
    [iL, iT, iB].forEach((el) => el.addEventListener("input", calc));
    box.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) load(presets[+b.dataset.i]); });
    load(presets[0]);
  }

  /* ---------- stage 1, step B: the ranking loss on one label (Eq. 2), computed live ----------
     Seven free scores stand in for the attention scores of seven token positions. nDCG uses linear gain and a
     log2 discount, with k = 7 (all tokens). The gradient step is plain gradient descent on the equation. */
  function rank() {
    const TOK = [["heart", 1], ["failure", 0.82], ["edema", 0.55], ["furosemide", 0.41], ["dyspnea", 0.3], ["glucose", 0.08], ["patient", 0.02]];
    const START = [-1.3, -1.1, 0.7, 0.1, 0.5, 1.2, 1.5];   // a poor ranking that trains to a perfect one in 15 steps
    const n = TOK.length, SIG = 0.5, LR = 3, MAX = 45, ROW = 52, EQ = 0.048;   // EQ: the weight of every pair when the nDCG weighting is switched off (1/21 pairs)
    let useDelta = true;
    const disc = (p) => 1 / Math.log2(p + 2);                       // p is the zero-based rank
    const IDCG = TOK.map((t) => t[1]).sort((a, b) => b - a).reduce((a, r, i) => a + r * disc(i), 0);
    const list = $("#rank-list"), pairEl = $("#pair"), spark = $("#spark path"), eq = $("#eq"), sayEl = $("#r-say");
    const say = (t) => { if (sayEl.textContent !== t) sayEl.textContent = t; };   // a live region: write only when the message changes
    let s, step, hist, pin = null, pick = null, timer = null, flat = 0, settle = null;

    list.style.height = n * ROW + "px";
    list.innerHTML = TOK.map((t, i) => `<button type="button" class="rk" data-i="${i}" aria-pressed="false"><span class="pos"></span><span class="tok">${t[0]}</span><span class="rel"><i style="width:${t[1] * 100}%"></i><span class="sr">, relevance ${t[1].toFixed(2)}, score</span></span><span class="sc"></span></button>`).join("");
    const rows = $$(".rk", list);

    // Rows are placed by transform and slide when the ranking changes. Once they are still, the DOM order is
    // brought in line with the ranking so that Tab and screen readers meet them in the order shown.
    function atRest() {
      clearTimeout(settle);
      settle = setTimeout(function order() {
        if (timer) return;                                             // training: stop() calls this again
        if (list.getAnimations && list.getAnimations({ subtree: true }).some((a) => a.playState === "running")) { settle = setTimeout(order, 120); return; }
        const pos = state().pos, focused = document.activeElement;
        rows.slice().sort((a, b) => pos[+a.dataset.i] - pos[+b.dataset.i]).forEach((r, k) => { if (list.children[k] !== r) list.insertBefore(r, list.children[k]); });
        if (rows.includes(focused) && document.activeElement !== focused) focused.focus({ preventScroll: true });
      }, reduce ? 50 : 620);
    }

    function state() {
      const ord = TOK.map((_, i) => i).sort((a, b) => s[b] - s[a]), pos = [];
      ord.forEach((t, p) => (pos[t] = p));
      const ndcg = ord.reduce((a, t, p) => a + TOK[t][1] * disc(p), 0) / IDCG, grad = TOK.map(() => 0), pairs = [];
      let loss = 0;
      for (let j = 0; j < n; j++) for (let h = 0; h < n; h++) {
        if (TOK[j][1] <= TOK[h][1]) continue;                                           // only pairs with r_j > r_h
        const d = Math.abs((TOK[j][1] - TOK[h][1]) * (disc(pos[j]) - disc(pos[h]))) / IDCG; // |ΔnDCG@k| of swapping j and h
        const P = 1 / (1 + Math.exp(-SIG * (s[j] - s[h])));                               // P(j ranked above h)
        const w = useDelta ? d : EQ;                                                      // the pair's weight in the loss
        const c = -w * Math.log2(P); loss += c;
        const gcoef = w * SIG * (1 - P) / Math.LN2; grad[j] -= gcoef; grad[h] += gcoef;
        pairs.push({ j, h, d, w, P, c });
      }
      return { pos, ndcg, loss, grad, pairs };
    }
    function render() {
      const st = state();
      rows.forEach((r, i) => {
        r.style.transform = "translateY(" + st.pos[i] * ROW + "px)";
        $(".pos", r).textContent = st.pos[i] + 1; $(".sc", r).textContent = (s[i] >= 0 ? "+" : "−") + Math.abs(s[i]).toFixed(2);
      });
      const pr = (pin && st.pairs.find((p) => p.j === pin[0] && p.h === pin[1])) || st.pairs.reduce((a, b) => (b.c > a.c ? b : a));
      rows.forEach((r, i) => {
        r.classList.toggle("j", i === pr.j || (pick === i && !pin)); r.classList.toggle("h", i === pr.h);
        r.setAttribute("aria-pressed", String(pick === i || (!!pin && pin.includes(i))));   // the tokens the reader picked
      });
      const J = `<span class="pj">${TOK[pr.j][0]}</span>`, H = `<span class="ph">${TOK[pr.h][0]}</span>`;
      pairEl.innerHTML =
        `<div class="note">${pin ? "Your pair" : "The pair that adds most to the loss right now"}</div>` +
        `<div class="pair-row mig" data-t="mig"><span>${J} is more relevant than ${H}, so the pair counts</span><b>${TOK[pr.j][1].toFixed(2)} &gt; ${TOK[pr.h][1].toFixed(2)}</b></div>` +
        `<div class="pair-row ndcg" data-t="ndcg"><span>${useDelta ? "Change in nDCG if the two swapped places" : "Change in nDCG if the two swapped places (switched off: every pair weighs the same)"}</span><b>${useDelta ? pr.d.toFixed(3) : "—"}</b></div>` +
        `<div class="pair-row prob" data-t="prob"><span>Probability the scores rank ${J} above ${H}</span><b>${pr.P.toFixed(2)}</b></div>` +
        `<div class="pair-row sum"><span>Its share of the loss: −${pr.w.toFixed(3)} × log₂ ${pr.P.toFixed(2)}</span><b>${pr.c.toFixed(3)}</b></div>`;
      $("#g-ndcg").textContent = st.ndcg.toFixed(3); $("#g-loss").textContent = st.loss.toFixed(3); $("#g-step").textContent = step;
      const m = Math.max(20, hist.length - 1);
      spark.setAttribute("d", hist.map((v, i) => (i ? "L" : "M") + (i / m * 300).toFixed(1) + " " + (41 - Math.max(0, (v - 0.5) / 0.5) * 38).toFixed(1)).join("") + (hist.length === 1 ? "h0.1" : ""));
      atRest();
      return st;
    }
    function reset(fixed) {
      stop(); step = 0; pin = null; pick = null; flat = 0;
      if (fixed) s = START.slice();
      else do { s = TOK.map(() => +(Math.random() * 3 - 1.5).toFixed(2)); } while (state().ndcg > 0.78);
      hist = [state().ndcg]; render(); say("The scores start out random, so the ranking is poor. Press Train and watch which mistakes get fixed first.");
    }
    function one() {
      const g = state().grad; s = s.map((v, i) => v - LR * g[i]); step++;
      hist.push(state().ndcg); const st = render();
      flat = st.ndcg > 0.99999 ? flat + 1 : 0;
      if (flat >= 3) { stop(); say("Done in " + step + " steps. " + (useDelta ? "The costly mistakes at the top were fixed first; the scores now rank every token in the order of its relevance." : "The ranking is right, but with equal weights nothing told the loss to fix the top first.")); }
      else if (step >= MAX) { stop(); say("The top of the ranking is right. The pairs still out of order barely change nDCG, so the loss barely pushes on them."); }
      else say("Each step moves every score a little along the gradient of the loss.");
    }
    function stop() { clearInterval(timer); timer = null; $("#r-train").textContent = "▶ Train"; if (rows.length) atRest(); }
    $("#r-train").addEventListener("click", () => {
      if (timer) return stop();
      if (flat >= 3 || step >= MAX) reset(false);
      $("#r-train").textContent = "❚❚ Pause"; timer = setInterval(one, reduce ? 60 : 480);
    });
    $("#r-step").addEventListener("click", () => { stop(); if (flat < 3 && step < MAX) one(); });
    $("#r-reset").addEventListener("click", () => reset(false));
    list.addEventListener("click", (e) => {
      const b = e.target.closest(".rk"); if (!b) return; const i = +b.dataset.i;
      if (pin || pick === null || pick === i) { pin = null; pick = i; }
      else { pin = TOK[pick][1] > TOK[i][1] ? [pick, i] : [i, pick]; pick = null; }
      render();
    });
    reset(true);

    // a term of the equation, its explanation card and its row in the playground light up together
    const setTerm = (t) => [eq, pairEl].forEach((el) => { if (t) el.dataset.term = t; else delete el.dataset.term; });
    const termOf = (el) => {
      const m = el && el.closest && el.closest(".t-mig,.t-ndcg,.t-prob,.legend3 [data-term],[data-t]");
      if (!m) return null;
      return m.dataset.t || m.dataset.term || [...m.classList].find((c) => c.startsWith("t-")).slice(2);
    };
    [eq, pairEl].forEach((el) => {
      el.addEventListener("mouseover", (e) => setTerm(termOf(e.target)));
      el.addEventListener("mouseleave", () => setTerm(null));
      el.addEventListener("click", (e) => { const t = termOf(e.target); if (t) setTerm(t); });
    });
  }

  /* ---------- attention explorer (App. J case studies) ---------- */
  function attention() {
    const A = window.PLANT_ATTENTION, tabs = $("#attn-tabs");
    const SHORT = { B211YZZ: "Coronary angiography", "6A551Z3": "Plasma exchange", "3E0G76Z": "Tube feeding", "10D00Z1": "Cesarean section", "Z85.828": "History of skin cancer", "C83.18": "Mantle cell lymphoma", "H54.8": "Legal blindness", "Z56.0": "Unemployment" };
    // one-line glosses, condensed from the paper's own reading of each list (Appendix J)
    const GLOSS = {
      B211YZZ: "domin: coronary dominance. diagonal, circum, desc, marginal, lad, cx: branches of the coronary arteries. pci, cluded, tro: catheterization, occlusion and troponin.",
      "6A551Z3": "plasma, exchange, filtered, sessions: the procedure itself. kap, lambda, chain: light chains, a reason for plasma exchange. MOG: an antibody-mediated disease.",
      "3E0G76Z": "feed, feeding, tube, peg, tf: tube feeding and PEG tubes. swallow, asp: swallowing trouble and aspiration risk, the usual reasons for it.",
      "10D00Z1": "ces: cesarean. labor, fet, bree, gest, grav: labour, fetus, breech, gestation, gravida. plac, fund: placenta and fundus.",
      "Z85.828": "squ, amous, cell, car, oma: pieces of “squamous cell carcinoma”. scal, cheek, forehead, temple: common sites. exc: excision.",
      "C83.18": "mant: mantle. bend, rit: plausibly bendamustine and rituximab, standard treatments. ki: plausibly Ki-67, a proliferation marker. chrom: chromosomal changes.",
      "H54.8": "legally, blind, legal: the definition itself. mac, ret, degener, diab, achment: macular and retinal disease, diabetes, detachment.",
      "Z56.0": "unem, ployed, unemployment: the code's meaning. income, money, homeless, housing, shelter: what the notes record alongside it."
    };
    tabs.innerHTML = A.map((a, i) => `<button class="tab" data-i="${i}">${SHORT[a.code] || a.code}</button>`).join("");
    function show(i) {
      const a = A[i], ws = a.tokens.map((t) => t[1]), hi = Math.max(...ws), lo = Math.min(...ws);
      $("#attn-name").textContent = a.name; $("#attn-gloss").textContent = GLOSS[a.code] ? "How to read it. " + GLOSS[a.code] : "";
      $("#attn-sys").textContent = a.code + " · " + (a.system === "ICD-10-PCS" ? "ICD-10-PCS procedure code" : "ICD-10-CM diagnosis code") + " · " + a.tokens.length + " tokens listed in the paper";
      $("#attn-cloud").innerHTML = a.tokens.map((t, k) => `<span class="leaf" style="--a:${(0.1 + 0.9 * (t[1] - lo) / (hi - lo || 1)).toFixed(2)};--i:${k}">${t[0]}<small>${t[1].toFixed(2).replace("-", "−")}</small></span>`).join("");
      $$("button", tabs).forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
    }
    tabs.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) show(+b.dataset.i); });
    show(Math.max(0, A.findIndex((a) => a.code === "C83.18")));
  }

  /* ---------- results ---------- */
  function table(el, t, dp) {
    const nc = t.cols.length;
    const f = (v, c) => (typeof v === "number" ? v.toFixed(dp) : c ? v : v.replace(/^(.*?) \((.*)\)$/, "$1<small>$2</small>"));
    const best = (rows) => t.cols.map((_, c) => (c ? Math.max(...rows.map((r) => r[c])) : null));
    const tr = (r, b, cls) => `<tr class="${cls || ""}">` + r.map((v, c) => `<td class="${c && b && v === b[c] ? "best" : ""}${typeof v === "string" && v[0] === "−" ? " neg" : ""}">${f(v, c)}</td>`).join("") + "</tr>";
    let body = "";
    if (t.groups) t.groups.forEach((g) => { const b = best(g.rows); body += `<tr class="grp"><td colspan="${nc}">${g.name}</td></tr>` + g.rows.map((r) => tr(r, b)).join(""); });
    else { const b = best(t.rows.concat([t.ours])); body = t.rows.map((r) => tr(r, b)).join("") + tr(t.ours, b, "ours") + tr(t.delta, null, "delta"); }
    const grp = [], labels = t.cols.map((c, i) => { if (!i || !c.includes(" ")) { if (i && grp.length) grp[grp.length - 1].span++; return c; } grp.push({ name: c.slice(0, c.indexOf(" ")), span: 1 }); return c.slice(c.indexOf(" ") + 1); });
    const top = grp.length ? `<tr class="grph"><th></th>${grp.map((q) => `<th colspan="${q.span}">${q.name}</th>`).join("")}</tr>` : "";
    el.innerHTML = `<table class="data"><thead>${top}<tr>${(grp.length ? labels : t.cols).map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>`;
    if (!t.groups) {   // phones: one row per metric (PLANT, the best earlier system, the difference) above the full table
      let pre = "";
      const rows = t.cols.slice(1).map((c, k) => {
        const i = k + 1, bi = t.rows.reduce((a, r) => (r[i] > a[i] ? r : a));
        if (c.includes(" ")) pre = c.split(" ")[0]; const name = c.includes(" ") || !pre ? c : pre + " " + c;
        return `<div class="mrow"><span class="mname">${name}</span><span class="mours">${t.ours[i].toFixed(dp)}</span><span class="mbest">${bi[i].toFixed(dp)}<small>${bi[0].replace(/ \(.*\)$/, "")}</small></span><span class="mdelta${t.delta[i][0] === "−" ? " neg" : ""}">${t.delta[i]}</span></div>`;
      }).join("");
      el.insertAdjacentHTML("beforebegin", `<div class="mcards"><div class="mrow mhead"><span>metric</span><span>PLANT</span><span>best earlier</span></div>${rows}</div>`);
      const all = document.createElement("details"); all.className = "alltbl"; all.innerHTML = "<summary>Show every system</summary>";
      el.parentNode.insertBefore(all, el); all.appendChild(el);
      const sync = () => (all.open = !narrow.matches); sync(); if (narrow.addEventListener) narrow.addEventListener("change", sync);
    }
  }
  function results() {
    const B = D.backbones, seg = $("#bb-metric"), bars = $("#bb-bars");
    seg.innerHTML = B.metrics.map((m, i) => `<button data-i="${i}" aria-pressed="${i === 0}">${m}</button>`).join("");
    function draw(mi, animate) {
      const max = Math.max(...B.rows.map((r) => r.plant[mi])) * (narrow.matches ? 1.42 : 1);   // shorter bars on phones leave room for the numbers
      bars.innerHTML = legend([["", "the LLM fine-tuned without PLANT"], ["p", "the same LLM with PLANT"]]) +
        B.rows.map((r) => `<div class="bar-row"><div class="name">${r.name}<small>${r.size}</small></div><div class="bar-pair">
        <div class="bar"><i data-w="${r.base[mi] / max * 76}"></i><span>${r.base[mi].toFixed(1)}</span></div>
        <div class="bar p"><i data-w="${r.plant[mi] / max * 76}"></i><span>${r.plant[mi].toFixed(1)}</span><span class="gain">+${(r.plant[mi] - r.base[mi]).toFixed(1)}</span></div></div></div>`).join("") +
        `<p class="note" style="margin:0">Average gain on ${B.metrics[mi]}: <b class="c-green">+${B.avg[mi].toFixed(1)}</b> points. Bars start at zero.</p>`;
      if (animate !== false) grow(bars);
    }
    seg.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; press(seg, b); draw(+b.dataset.i); });
    draw(0, false);   // built at load (bars at zero) so the section has its final height and in-page jumps past it land right
    onView(bars, () => grow(bars));

    // Figure 2 (right), redrawn: Rare-F1 on held-out rare labels
    const R = D.rare, rb = $("#rare-bars"), rmax = Math.max(...R.rows.map((r) => r.full));
    rb.innerHTML = legend([["", "random attention start, trained on common labels only"], ["p", "PLANT, trained on common labels only"], ["ref", "PLANT, trained on all the data (for reference)"]]) +
      R.rows.map((r) => `<div class="bar-row"><div class="name">${r.name}</div><div class="bar-pair">
      <div class="bar"><i data-w="${r.random / rmax * 80}"></i><span>${r.random.toFixed(1)}</span></div>
      <div class="bar p"><i data-w="${r.common / rmax * 80}"></i><span>${r.common.toFixed(1)}</span></div>
      <div class="bar ref"><i data-w="${r.full / rmax * 80}"></i><span>${r.full.toFixed(1)}</span></div></div></div>`).join("");

    table($("#tbl-sota"), D.sota, 1); table($("#tbl-xmtc"), D.xmtc, 2); table($("#tbl-w1"), D.w1, 1); table($("#tbl-w2"), D.w2, 1);

    // tabs: one tab stop (the selected tab), arrow keys, Home and End move between tabs and open them
    const tabs = $("#res-tabs"), tabEls = $$('[role="tab"]', tabs);
    function select(b, focus) {
      tabEls.forEach((x) => { const on = x === b; x.setAttribute("aria-selected", String(on)); x.tabIndex = on ? 0 : -1; });
      $$(".panel").forEach((p) => {
        p.hidden = p.dataset.panel !== b.dataset.panel;
        if (!p.hidden && redraws[p.dataset.panel]) redraws[p.dataset.panel]();
        if (!p.hidden && p.dataset.panel !== "backbones") { $$("i[data-w]", p).forEach((i) => (i.style.width = "0")); grow(p); }
      });
      if (focus) b.focus();
      if (tabs.scrollWidth > tabs.clientWidth) tabs.scrollTo({ left: Math.max(0, b.offsetLeft - 24), behavior: "smooth" });   // keep the open tab in view on phones
      scrollers();
    }
    tabs.addEventListener("click", (e) => { const b = e.target.closest('[role="tab"]'); if (b) select(b); });
    tabs.addEventListener("keydown", (e) => {
      const k = tabEls.indexOf(document.activeElement); if (k < 0) return;
      const to = { ArrowRight: k + 1, ArrowLeft: k - 1, Home: 0, End: tabEls.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      select(tabEls[(to + tabEls.length) % tabEls.length], true);
    });
  }

  /* ---------- ablations (Table 5) ---------- */
  function ablations() {
    const A = D.ablation, seg = $("#abl-metric"), box = $("#abl"), SCALE = 7.5;
    seg.innerHTML = A.metrics.map((m, i) => `<button data-i="${i}" aria-pressed="${i === 0}">${m}</button>`).join("");
    const GROUPS = { 0: "Stage 1 removed", 2: "One choice changed inside Stage 1", 4: "One choice changed inside Stage 2" };
    box.innerHTML = legend([["s1", "Stage 1 removed"], ["bad", "one component changed"], ["ci", "95% confidence interval"]]) +
      A.rows.map((r, k) => (GROUPS[k] ? `<div class="abl-grp">${GROUPS[k]}</div>` : "") + `<div class="abl-row${r.s1 ? " s1" : ""}"><div class="what">${r.what}${/single-stage|inside Stage/.test(r.tag) ? "" : `<small>${r.tag}</small>`}</div><div class="abl-track"><i></i><u></u></div><em></em><span class="sr"></span></div>`).join("") +
      `<div class="abl-row abl-axis" aria-hidden="true"><div class="what"></div><div class="abl-ticks"><span style="left:0">0</span><span style="left:26.67%">−2</span><span style="left:53.33%">−4</span><span style="left:80%">−6 points</span></div><em></em></div>` +
      `<p class="note" id="abl-full" style="margin:6px 0 0"></p>`;
    function draw(mi, labelsOnly) {
      $$(".abl-row:not(.abl-axis)", box).forEach((row, k) => {
        const [score, drop, lo, hi] = A.rows[k].v[mi];
        if (!labelsOnly) {
          $("i", row).style.width = (-drop / SCALE * 100) + "%";
          const u = $("u", row); u.style.left = (-hi / SCALE * 100) + "%"; u.style.width = ((hi - lo) / SCALE * 100) + "%";
        }
        $("em", row).textContent = "−" + (-drop).toFixed(1); row.title = A.metrics[mi] + " " + score.toFixed(1) + " (95% CI of the drop: " + lo + " to " + hi + ")";
        $(".sr", row).textContent = ", " + row.title;   // the same details for keyboard, touch and screen readers
      });
      $("#abl-full").innerHTML = "Full PLANT scores <b>" + A.full[mi].toFixed(1) + "</b> " + A.metrics[mi] + ". Each bar is the number of points lost.";
    }
    seg.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; press(seg, b); draw(+b.dataset.i); });
    draw(0, true);   // labels at load so the section has its final height and in-page jumps past it land right
    onView(box, () => draw(0));
  }

  /* ---------- line charts, redrawn from the paper's Figure 3 ---------- */
  function lineChart(el, c) {
    const W = Math.max(300, Math.min(640, el.clientWidth || 560)), m = { l: 40, r: 16, t: 18, b: 46 };
    const iw = W - m.l - m.r, cat = c.x.labels, n = cat ? cat.length : 0;
    // x labels that would touch (about 6.3 px a character at 10.5 px mono) go on two staggered rows, numbers in full
    const xt = (cat || c.x.ticks).map((t) => (cat ? t : t.toFixed(2)));
    const stagger = Math.max(...xt.map((t) => t.length)) * 6.3 + 8 > iw / xt.length;
    if (stagger) m.b += 14;
    const H = (W < 420 ? 270 : 320) + (stagger ? 14 : 0), ih = H - m.t - m.b, base = H - m.b;
    const X = cat ? (i) => m.l + iw * (i + 0.5) / n : (v) => m.l + iw * (v - c.x.min) / (c.x.max - c.x.min);
    const Y = (v) => m.t + ih * (1 - (v - c.y.min) / (c.y.max - c.y.min));
    let g = "";
    c.y.ticks.forEach((t) => (g += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}"/><text class="axis" x="${m.l - 8}" y="${Y(t) + 4}" text-anchor="end">${c.fmt(t)}</text>`));
    xt.forEach((t, i) => {
      const x = cat ? X(i) : X(c.x.ticks[i]), low = stagger && i % 2;
      if (low) g += `<line class="tick" x1="${x}" x2="${x}" y1="${base + 3}" y2="${base + 21}"/>`;
      g += `<text class="axis" x="${x}" y="${base + 18 + (low ? 14 : 0)}" text-anchor="middle">${t}</text>`;
    });
    // the axis title stays inside the drawing (about 6.2 px a character at 12 px)
    const tw = c.x.title.length * 6.2, tx = Math.min(W - 2 - tw / 2, Math.max(2 + tw / 2, m.l + iw / 2));
    g += `<text class="ttl" x="${tx}" y="${H - 6}" text-anchor="middle">${c.x.title}</text>`;
    (c.guides || []).forEach((q) => (g += `<line class="guide" x1="${m.l}" x2="${W - m.r}" y1="${Y(q.y)}" y2="${Y(q.y)}"/><text class="note-t" x="${m.l + 6}" y="${Y(q.y) - 6}">${q.label}</text>`));
    c.series.forEach((sr) => {
      const pts = sr.pts.map((q, i) => (cat ? [X(i), Y(q)] : [X(q[0]), Y(q[1])]));
      g += `<path class="ln ${sr.cls}" d="${pts.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1)).join("")}"/>`;
      pts.forEach((q, i) => {
        const v = cat ? sr.pts[i] : sr.pts[i][1];
        if (sr.err) { const e = ih * sr.err[i] / (c.y.max - c.y.min); g += `<line class="err" x1="${q[0].toFixed(1)}" x2="${q[0].toFixed(1)}" y1="${(q[1] - e).toFixed(1)}" y2="${(q[1] + e).toFixed(1)}"/>`; }
        g += `<circle class="dot ${sr.cls}" cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="4.5"><title>${sr.name}: ${c.fmt(v)}</title></circle>`;
        if (sr.labels) g += `<text class="val" x="${q[0].toFixed(1)}" y="${(q[1] + (sr.labels === "below" ? 18 : -10)).toFixed(1)}" text-anchor="middle">${c.fmt(v)}</text>`;
      });
    });
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${c.aria}">${g}</svg>`;
  }
  function charts() {
    const T = D.trainSize, Q = D.stage1Quality, seg = $("#size-metric"), el = $("#chart-size"), elQ = $("#chart-s1");
    let mi = 0;
    seg.innerHTML = T.metrics.map((m, i) => `<button data-i="${i}" aria-pressed="${i === 0}">${m}</button>`).join("");
    $("#size-legend").innerHTML = legend([["line-b", "Mistral-7B without PLANT"], ["line-p", "Mistral-7B with PLANT"]]);
    const sizeSay = () => {
      const gap = T.plant[mi].map((v, i) => v - T.base[mi][i]), lo = Math.min(...gap), hi = Math.max(...gap), at = T.sizes[gap.indexOf(lo)].toLocaleString("en-US");
      $("#size-say").textContent = "On " + T.metrics[mi] + ", PLANT is ahead by " + Math.max(0, lo).toFixed(2) + " to " + hi.toFixed(2) + " across the eight sizes; the gap is smallest at " + at + " notes." + (mi === 0 ? "" : " The cards beside the chart describe P@5.");
      $("#size-cards").classList.toggle("dimmed", mi !== 0);
    };
    const drawSize = () => lineChart(el, {
      aria: T.metrics[mi] + " against the number of training notes, with and without PLANT",
      x: { labels: T.sizes.map((v) => v.toLocaleString("en-US")), title: "training notes (evenly spaced, as in the paper)" },
      y: mi === 0 ? { min: 0.1, max: 0.74, ticks: [0.2, 0.3, 0.4, 0.5, 0.6, 0.7] } : { min: 0.08, max: 0.5, ticks: [0.1, 0.2, 0.3, 0.4, 0.5] },
      fmt: (v) => v.toFixed(2),
      guides: mi === 0 ? [{ y: 0.5, label: "P@5 = 0.50" }] : [],
      series: [{ name: "without PLANT", cls: "s-b", pts: T.base[mi], labels: "below" }, { name: "with PLANT", cls: "s-p", pts: T.plant[mi], labels: "above" }]
    });
    const drawQ = () => lineChart(elQ, {
      aria: "Macro-F1 after Stage 2 against the nDCG of the attention when Stage 1 ends",
      x: { min: 0.66, max: 0.96, ticks: [0.7, 0.75, 0.8, 0.85, 0.9, 0.95], title: "nDCG@k of the attention when Stage 1 ends" },
      y: { min: 19.9, max: 23.7, ticks: [20, 21, 22, 23] }, fmt: (v) => v.toFixed(1),
      series: [{ name: "Macro-F1 after Stage 2", cls: "s-p", pts: Q.pts, err: Q.err }]
    });
    seg.addEventListener("click", (e) => { const b = e.target.closest("button"); if (!b) return; press(seg, b); mi = +b.dataset.i; drawSize(); sizeSay(); });
    const drawSize0 = drawSize; redraws.data = () => { drawSize0(); sizeSay(); }; sizeSay(); drawSize(); drawQ();
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { drawSize(); drawQ(); }, 150); });
  }

  /* ---------- theory-to-code map: the whole section stays hidden until an entry has code ---------- */
  function codemap() {
    const map = window.PLANT_CODEMAP || [], sec = $("#code");
    if (!map.some((c) => c.code)) { sec.hidden = true; $$('a[href="#code"]').forEach((a) => a.remove()); return; }
    const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    $("#codemap").innerHTML = map.map((c) => {
      const code = c.code
        ? `<div class="cm-code"><div class="path">${c.url ? `<a href="${c.url}" target="_blank" rel="noopener" style="color:inherit">${c.file}</a>` : c.file}</div><pre>${c.code.split("\n").map((ln, i) => `<span class="ln${c.hl.includes(c.start + i) ? " hl" : ""}" data-n="${c.start + i}">${esc(ln) || " "}</span>`).join("")}</pre></div>`
        : `<div class="cm-code soon">Annotated code coming soon.</div>`;
      const notes = (c.notes || []).map((x) => `<p style="margin-top:8px">${x}</p>`).join("");
      return `<div class="cm-item" id="code-${c.concept}"><div class="cm-theory"><h3>${c.title}</h3><p>${c.where}</p><span class="math math-d" data-tex="${esc(c.tex).replace(/"/g, "&quot;")}"></span>${notes}</div>${code}</div>`;
    }).join("");
    map.filter((c) => c.code).forEach((c) => {
      const host = $(`[data-concept="${c.concept}"] .prose, .prose[data-concept="${c.concept}"]`);
      if (host) host.insertAdjacentHTML("beforeend", `<p><a href="#code-${c.concept}">See the code for this step →</a></p>`);
    });
  }

  const run = (fn) => { try { fn(); } catch (e) { console.error("[plant-site]", fn.name, e); } };
  [codemap, chrome, demo, dots, pipeline, mig, rank, attention, results, ablations, charts, scrollWatch, printing, math].forEach(run);
})();
