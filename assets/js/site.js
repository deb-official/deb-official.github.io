// site.js — the small enhancements shared by every page. The pages are complete without JavaScript;
// each section below adds one behaviour and is started (inside a try) at the bottom of the file.
//
//   1. Theme toggle            [data-theme-toggle]  ->  <html data-theme="light|dark">
//   2. Navigation              [data-nav-toggle] (phone menu), scroll-spy for in-page links
//   3. Dialogs                 [data-dialog-open="id"], [data-dialog-close]
//   4. Email                   [data-email]         (plain text -> button -> mailto; the address is assembled here)
//   5. Copy buttons            [data-copy] (bare: the <pre> of its dialog or .bibtex block), [data-copy="email"]
//   6. "Upcoming" labels       [data-until="YYYY-MM-DD"], [data-upcoming-tag]
//   7. Scroll reveal           [data-reveal]
//   8. Video poster frames     <video data-poster="..."> (captions on, the site's own play button)
//   9. Portrait flip           [data-portrait], [data-portrait-flip] (one portrait per theme)
//  10. Print                   closed <details> (abstracts, earlier news) open for printing
//  11. Focus in view           a Tab stop left partly hidden (under the sticky header, at the bottom) is scrolled in
//
// The hero dot field lives in field.js and the paper figures in figures.js; pages load them only if needed.

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// ---- 1. Theme toggle -------------------------------------------------------------------------------------
// The initial theme is set by the inline script in <head> (no flash). This wires the button, persists the
// choice and follows the system setting until the visitor has chosen.
const THEME_KEY = 'theme';
const THEME_COLOR = { light: '#F5F1E8', dark: '#141110' }; // = --paper in site.css

function storedTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === 'light' || t === 'dark' ? t : null;
  } catch {
    return null; // storage blocked (private mode, sandboxed frame)
  }
}

function initTheme() {
  const buttons = [...document.querySelectorAll('[data-theme-toggle]')];
  const apply = (theme) => {
    root.dataset.theme = theme;
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.setAttribute('content', THEME_COLOR[theme]);
    for (const b of buttons) b.setAttribute('aria-pressed', String(theme === 'dark')); // its name stays "Dark theme"
    // Canvas drawings read their colours from CSS, so they listen for this event.
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  };
  apply(root.dataset.theme === 'dark' ? 'dark' : 'light');

  for (const b of buttons) {
    b.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, next); } catch { /* not persisted; still applies for this visit */ }
      apply(next);
    });
  }
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  if (system.addEventListener) system.addEventListener('change', (e) => { if (!storedTheme()) apply(e.matches ? 'dark' : 'light'); });
  // A page restored by Back (Safari keeps it with its DOM) or open in another tab follows a choice made elsewhere.
  const resync = () => { const t = storedTheme() || (system.matches ? 'dark' : 'light'); if (t !== root.dataset.theme) apply(t); };
  window.addEventListener('pageshow', (e) => { if (e.persisted) resync(); });
  window.addEventListener('storage', (e) => { if (e.key === THEME_KEY) resync(); });
}

// ---- 2. Navigation ---------------------------------------------------------------------------------------
const NAV_WIDE = '(min-width: 50em)'; // keep in sync with the nav breakpoint in site.css

// The phone sheet closes on Escape, on any link in the header (the brand too), on a tap outside it (a dimming
// scrim catches taps that iOS would not turn into clicks), when keyboard focus leaves the header, and on Android
// back (CloseWatcher). While it is open the bar is solid and the page behind does not scroll. The toggle keeps the
// name "Menu"; aria-expanded carries the state.
function initMenu() {
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = toggle && document.getElementById(toggle.getAttribute('aria-controls'));
  const header = toggle && toggle.closest('.site-header');
  if (!toggle || !nav || !header) return;

  const scrim = document.createElement('div');
  scrim.className = 'nav-scrim';
  document.body.append(scrim);
  let watcher = null;

  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  const set = (open) => {
    if (open) root.style.setProperty('--scrollbar-w', `${window.innerWidth - root.clientWidth}px`);
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    scrim.classList.toggle('is-open', open);
    header.classList.toggle('is-menu-open', open);
    root.classList.toggle('menu-open', open);
    if (open && !watcher && 'CloseWatcher' in window) {
      try {
        watcher = new CloseWatcher();
        watcher.onclose = () => {
          watcher = null;
          const inside = nav.contains(document.activeElement);
          set(false);
          if (inside) toggle.focus();
        };
      } catch { watcher = null; }
    } else if (!open && watcher) {
      const w = watcher;
      watcher = null;
      w.destroy();
    }
  };
  toggle.addEventListener('click', () => set(!isOpen()));
  header.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  scrim.addEventListener('click', () => set(false));
  document.addEventListener('click', (e) => { if (isOpen() && !e.target.closest('.site-header')) set(false); });
  header.addEventListener('focusout', (e) => {
    if (isOpen() && e.relatedTarget && !header.contains(e.relatedTarget)) set(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) { set(false); toggle.focus(); }
  });
  const wide = window.matchMedia(NAV_WIDE);
  if (wide.addEventListener) wide.addEventListener('change', () => set(false));
}

// Marks the in-page nav link of the section being read with aria-current="true". A page whose nav already marks
// itself (aria-current="page", research.html) keeps that one item as the only current one.
function initScrollSpy() {
  if (!('IntersectionObserver' in window) || document.querySelector('.site-nav a[aria-current="page"]')) return;
  const links = new Map(); // section element -> nav link
  for (const a of document.querySelectorAll('.site-nav a[href^="#"]')) {
    const section = document.getElementById(a.getAttribute('href').slice(1));
    if (section) links.set(section, a);
  }
  if (!links.size) return;

  const crossing = new Set();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? crossing.add(e.target) : crossing.delete(e.target);
    let current = null; // the last section, in document order, that crosses the reading line
    for (const section of links.keys()) if (crossing.has(section)) current = section;
    for (const [section, a] of links) {
      if (section === current) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  }, { rootMargin: '-30% 0px -65% 0px' }); // a thin band a third of the way down the viewport
  for (const section of links.keys()) io.observe(section);
}

// ---- 3. Dialogs ------------------------------------------------------------------------------------------
// Native <dialog>: Escape and focus trapping come with showModal(). Focus returns to the opener and the page
// behind does not scroll or shift.
function initDialogs() {
  const openers = document.querySelectorAll('[data-dialog-open]');
  if (!('HTMLDialogElement' in window) || typeof HTMLDialogElement.prototype.showModal !== 'function') {
    for (const o of openers) o.hidden = true;
    // ... and the same-tab links to the research page take their place (as without JS).
    for (const a of document.querySelectorAll('[data-nojs-only]')) a.removeAttribute('data-nojs-only');
    return;
  }
  let lastOpener = null;

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-dialog-open]');
    if (opener) {
      const dialog = document.getElementById(opener.dataset.dialogOpen);
      if (dialog && !dialog.open) {
        lastOpener = opener;
        root.style.setProperty('--scrollbar-w', `${window.innerWidth - root.clientWidth}px`);
        // Opened by a tap or a click: WebKit would ring the autofocused button, so the ring waits for the first key.
        dialog.toggleAttribute('data-pointer-open', e.detail > 0);
        dialog.showModal();
        root.classList.add('has-dialog');
      }
      return;
    }
    const closer = e.target.closest('[data-dialog-close]');
    if (closer) closer.closest('dialog')?.close();
  });

  for (const dialog of document.querySelectorAll('dialog')) {
    // The dialog box has no padding, so a click whose target is the <dialog> itself landed on the backdrop.
    // Both the press and the release must land there: a text selection dragged out of the box keeps it open.
    let downOnBackdrop = false;
    dialog.addEventListener('pointerdown', (e) => { downOnBackdrop = e.target === dialog; });
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog && downOnBackdrop) dialog.close();
      downOnBackdrop = false;
    });
    dialog.addEventListener('keydown', () => dialog.removeAttribute('data-pointer-open'));
    dialog.addEventListener('close', () => {
      root.classList.remove('has-dialog');
      if (lastOpener && document.contains(lastOpener)) lastOpener.focus({ preventScroll: true });
      lastOpener = null;
    });
  }
}

// ---- 4. Email --------------------------------------------------------------------------------------------
// The HTML holds only a readable "[at]" form as plain text ([data-email]). This turns it into a button; the
// first activation swaps in a real mailto link and opens the mail app. To change the address, edit these
// three parts (and the readable form in the HTML).
const EMAIL_PARTS = ['saharoy.d', 'northeastern', 'edu'];
const emailAddress = () => `${EMAIL_PARTS[0]}@${EMAIL_PARTS[1]}.${EMAIL_PARTS[2]}`;

function initEmail() {
  const hint = document.getElementById('email-hint') ? 'email-hint' : null;
  for (const text of document.querySelectorAll('[data-email]')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = text.className;
    if (hint) button.setAttribute('aria-describedby', hint);
    button.append(...text.childNodes);
    text.replaceWith(button);
    button.addEventListener('click', () => {
      const link = document.createElement('a');
      link.className = button.className;
      link.href = `mailto:${emailAddress()}`;
      link.textContent = emailAddress();
      if (hint) link.setAttribute('aria-describedby', hint);
      button.replaceWith(link);
      link.focus({ preventScroll: true });
      window.location.href = link.href;
    }, { once: true });
  }
}

// ---- 5. Copy buttons -------------------------------------------------------------------------------------
// BibTeX first: each source line of a .bibtex <pre> becomes a <span class="bl">, so that a long line wraps with a
// hanging indent instead of scrolling (CSS .is-wrapped). The text itself is unchanged (checked below, else the
// original nodes go back), so Copy copies exactly what the HTML holds. Without JS the box scrolls sideways.
function wrapBibtex() {
  for (const pre of document.querySelectorAll('.bibtex pre')) {
    const code = pre.querySelector('code') || pre;
    const text = code.textContent;
    const original = [...code.childNodes];
    const lines = document.createDocumentFragment();
    text.split('\n').forEach((line, i) => {
      if (i) lines.append('\n');
      const span = document.createElement('span');
      span.className = 'bl';
      // The entry's first line breaks, when it must, after its brace, so the citation key is never split.
      const head = /^(@\w+\{)(.+)$/.exec(line);
      if (head) {
        const key = document.createElement('span');
        key.style.cssText = 'display:inline-block;text-indent:0';
        key.textContent = head[2];
        span.append(head[1], key);
      } else {
        span.textContent = line;
      }
      lines.append(span);
    });
    code.replaceChildren(lines);
    if (code.textContent !== text) { code.replaceChildren(...original); continue; }
    pre.classList.add('is-wrapped');
  }
}

// A bare data-copy copies the <pre> inside the button's own <dialog> or .bibtex block (so a copied block can
// never copy another block's entry); data-copy="email" copies the address; any other value is a selector.
// The button shows "Copied" and the [role="status"] element next to it announces the result.
const COPY_FEEDBACK_MS = 2200;

async function writeClipboard(text, host) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* permission denied or unsupported: fall through to the legacy path */ }
  // Legacy path. The textarea must sit inside an open modal dialog, or it would be inert.
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
  host.appendChild(area);
  area.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  area.remove();
  return ok;
}

function initCopy() {
  wrapBibtex();
  for (const button of document.querySelectorAll('[data-copy]')) {
    const label = button.querySelector('[data-copy-label]') || button;
    const idle = label.textContent;
    const status = button.parentElement.querySelector('[role="status"]');
    let timer = 0;

    button.addEventListener('click', async () => {
      const source = button.dataset.copy;
      let text = '';
      if (source === 'email') text = emailAddress();
      else if (!source) text = button.closest('dialog, .bibtex')?.querySelector('pre')?.textContent.trim() || '';
      else text = document.querySelector(source)?.textContent.trim() || '';
      if (!text) return;
      const ok = await writeClipboard(text, button.closest('dialog') || document.body);
      label.textContent = ok ? 'Copied' : 'Copy failed';
      button.toggleAttribute('data-copied', ok);
      if (status) status.textContent = ok ? 'Copied to the clipboard.' : 'Could not copy. Select the text and copy it by hand.';
      clearTimeout(timer);
      timer = setTimeout(() => {
        label.textContent = idle;
        button.removeAttribute('data-copied');
        if (status) status.textContent = '';
      }, COPY_FEEDBACK_MS);
    });
  }
}

// ---- 6. "Upcoming" labels --------------------------------------------------------------------------------
// An element with data-until="YYYY-MM-DD" loses .is-upcoming and its [data-upcoming-tag] children once that
// day has begun (local time), so the page never shows a stale "Upcoming".
function initDates() {
  const now = new Date();
  for (const el of document.querySelectorAll('[data-until]')) {
    const [y, m, d] = el.dataset.until.split('-').map(Number);
    if (!y || now < new Date(y, m - 1, d)) continue;
    el.classList.remove('is-upcoming');
    for (const tag of el.querySelectorAll('[data-upcoming-tag]')) tag.hidden = true;
  }
}

// ---- 7. Scroll reveal ------------------------------------------------------------------------------------
// Only blocks that start below the fold are hidden, and only by this script, so everything is visible without
// JavaScript, under reduced motion, for crawlers and in print.
function initReveal() {
  const blocks = document.querySelectorAll('[data-reveal]');
  if (!blocks.length || !('IntersectionObserver' in window) || reduceMotion.matches) return;

  const show = (el) => {
    el.classList.add('reveal-in');
    el.classList.remove('reveal-pending');
    el.addEventListener('transitionend', () => el.classList.remove('reveal-in'), { once: true });
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      show(e.target);
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.01 });

  const fold = window.innerHeight;
  for (const el of blocks) {
    if (el.getBoundingClientRect().top < fold) continue; // already on screen: leave it alone
    el.classList.add('reveal-pending');
    io.observe(el);
  }
  // Jumping to an anchor must never land on hidden content.
  window.addEventListener('hashchange', () => { for (const el of document.querySelectorAll('.reveal-pending')) show(el); });
  // Keyboard or screen-reader focus inside a block that has not been revealed yet shows it at once, without the
  // transition, so the focused element is never invisible.
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest && e.target.closest('.reveal-pending');
    if (!el) return;
    io.unobserve(el);
    el.classList.remove('reveal-pending');
  });
}

// ---- 8. Video poster frames ------------------------------------------------------------------------------
// Videos never autoplay and never preload. A poster frame is a large image, so it is attached only when the
// player comes near the viewport. Then the native controls (which differ per browser and sat on a face on the
// title slide) give way to the site's own play button in the slide's empty top-right corner, until it is used.
// The button's length tag and name come from the video's own data-length (e.g. "5 min 10 s"; none: no tag).
function playButton(video) {
  const length = video.dataset.length;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'media__play';
  button.setAttribute('aria-label', length ? `Play the talk, ${length}` : 'Play the talk'); // the visible length is part of the name
  button.innerHTML = '<span class="media__disc"><svg class="icon" aria-hidden="true"><use href="#i-play"/></svg></span>';
  if (length) {
    const tag = document.createElement('span');
    tag.className = 'media__len';
    tag.textContent = length;
    button.append(tag);
  }
  const start = (e) => {
    const hadFocus = document.activeElement === button;
    video.removeEventListener('click', start);
    video.style.cursor = '';
    video.removeAttribute('tabindex');
    video.controls = true;
    button.remove();
    // Keyboard, screen readers and a click that focused the button: focus follows to the player, so it is not dropped
    // with the button (focus moved by script after a pointer draws no ring; WebKit does not focus a tapped button).
    if (!e.detail || hadFocus) video.focus({ preventScroll: true });
    const playing = video.play();
    if (playing && playing.catch) playing.catch(() => {}); // blocked: the native controls are there to try again
  };
  button.addEventListener('click', start, { once: true });
  video.addEventListener('click', start);                  // a tap or click anywhere on the slide plays it too
  video.style.cursor = 'pointer';
  video.controls = false;
  video.tabIndex = -1;                                     // without its controls the player is no Tab stop (Firefox made it one)
  video.after(button);
}

function initMedia() {
  const videos = document.querySelectorAll('video[data-poster]');
  if (!videos.length) return;
  const attach = (video) => {
    video.poster = video.dataset.poster;
    // Captions on by default: WebKit applies its own automatic caption setting to <track default> and leaves it
    // off, so the default track is switched on here (the player's captions button still turns it off).
    for (const el of video.querySelectorAll('track[default]')) if (el.track && el.track.mode === 'disabled') el.track.mode = 'showing';
    if (video.paused && !video.currentTime) playButton(video);
  };
  if (!('IntersectionObserver' in window)) { videos.forEach(attach); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      attach(e.target);
    }
  }, { rootMargin: '600px 0px' });
  for (const video of videos) io.observe(video);
}

// ---- 9. Portrait flip ------------------------------------------------------------------------------------
// One portrait per theme: CSS shows the back (denim) face when the theme is dark XOR the frame has .is-alt, so
// the theme toggle turns the portrait. The button shows the other portrait (an action, so no aria-pressed); a
// theme change clears it, so each theme lands on its own portrait. Only the face that shows is exposed to
// assistive technology. Under reduced motion CSS swaps the faces without turning.
// The turn is enabled (.can-turn) only two frames after start, once site.css has styled the portrait: WebKit can
// style a cold load once without the stylesheet, and a transition enabled from the start then turned the portrait
// (dark) or showed the back face for 0.4 s (light) as the page loaded.
function initPortrait() {
  for (const frame of document.querySelectorAll('[data-portrait]')) {
    const button = frame.querySelector('[data-portrait-flip]');
    const front = frame.querySelector('.portrait__face--front');
    const back = frame.querySelector('.portrait__face--back');
    if (!button || !front || !back) continue;
    const sync = () => {
      const denim = (root.dataset.theme === 'dark') !== frame.classList.contains('is-alt');
      front.setAttribute('aria-hidden', String(denim));
      back.setAttribute('aria-hidden', String(!denim));
    };
    sync();
    requestAnimationFrame(() => requestAnimationFrame(() => frame.classList.add('can-turn')));
    button.addEventListener('click', () => { frame.classList.toggle('is-alt'); sync(); });
    document.addEventListener('themechange', () => { frame.classList.remove('is-alt'); sync(); });
  }
}

// ---- 10. Print ------------------------------------------------------------------------------------------
// Closed disclosures open while printing and close again afterwards, so the abstracts print in full.
function initPrint() {
  let opened = [];
  window.addEventListener('beforeprint', () => {
    opened = [...document.querySelectorAll('details:not([open])')];
    for (const d of opened) d.open = true;
  });
  window.addEventListener('afterprint', () => {
    for (const d of opened) d.open = false;
    opened = [];
  });
}

// ---- 11. Focus in view -----------------------------------------------------------------------------------
// Browsers do not always scroll a Tab stop fully into view: Firefox leaves one that is partly on screen (even half
// under the sticky header) and WebKit stops short on text links that end in the raised new-tab arrow. Once scrolling
// has settled, a stop still cut off is moved to the root's scroll-padding-top or just above the bottom edge.
// Focus moved by a click or a script, dialogs, and fixed or sticky elements (header, skip link) are left alone.
function initFocusInView() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  let tabAt = -Infinity;
  let frame = 0;
  const pinned = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const position = getComputedStyle(n).position;
      if (position === 'fixed' || position === 'sticky') return true;
    }
    return false;
  };
  // Only the focus move made by the Tab key itself (any other key, e.g. Enter on a jump button, clears the mark).
  document.addEventListener('keydown', (e) => { tabAt = e.key === 'Tab' ? performance.now() : -Infinity; }, true);
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    const tabbed = performance.now() - tabAt < 200;
    tabAt = -Infinity;
    if (!tabbed || !(el instanceof Element) || el.closest('dialog') || pinned(el)) return;
    cancelAnimationFrame(frame);
    let y = window.scrollY, still = 0, frames = 0;
    const check = () => {
      if (document.activeElement !== el) return;
      still = window.scrollY === y ? still + 1 : 0;
      y = window.scrollY;
      if (still < 3 && ++frames < 90) { frame = requestAnimationFrame(check); return; } // the browser is still scrolling
      const top = header.getBoundingClientRect().bottom;
      const bottom = window.innerHeight;
      const r = el.getBoundingClientRect();
      if (!r.height || (r.top >= top - 1 && r.bottom <= bottom + 1)) return;
      const pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || top + 16;
      // Too tall to fit, or cut at the top: show its top. Cut at the bottom: show its bottom (and its focus ring).
      window.scrollBy({ top: r.top < top || r.height > bottom - pad ? r.top - pad : r.bottom - bottom + 8 });
    };
    frame = requestAnimationFrame(check);
  });
}

// ---- start -----------------------------------------------------------------------------------------------
// iOS applies :active (the press feedback in site.css) only when a touch listener exists on the page.
document.addEventListener('touchstart', () => {}, { passive: true });

for (const init of [initTheme, initMenu, initScrollSpy, initDialogs, initEmail, initCopy, initDates, initReveal, initMedia, initPortrait, initPrint, initFocusInView]) {
  try {
    init();
  } catch (err) {
    console.warn(`[site] ${init.name} failed`, err); // one broken enhancement must not stop the others
  }
}
// Tells the boot script in <head> that the enhancements started (without this it restores the no-JS layout).
root.classList.add('js-ready');
// Transitions on links, buttons and icons are held until two frames from now (.can-animate, site.css 17): WebKit can
// style a cold load once without the stylesheet, and every link and button colour then faded in from the browser default.
requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('can-animate')));
