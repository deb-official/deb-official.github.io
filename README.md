# debjyoti.org

Personal academic website of Debjyoti Saha Roy (দেবজ্যোতি সাহা রায়), PhD candidate at Northeastern University.

Live at **https://debjyoti.org** (GitHub Pages, served from the root of `main`; the `CNAME` file sets the domain).

Static HTML, one hand-written stylesheet and three small JavaScript modules.
There is no build step, no framework, no package manager and no third-party request: **the HTML, CSS and JS files
in this repository are the source, and you edit them directly.** What you save is what GitHub Pages serves.
Every page is complete without JavaScript; scripts only add enhancements.

## Contents

1. [Preview locally](#preview-locally)
2. [File map](#file-map)
3. [Everyday edits](#everyday-edits): news, publications, talks, profile links, bio, email
4. [Links: same tab or new tab](#links-same-tab-or-new-tab)
5. [Shared header and footer](#shared-header-and-footer)
6. [Design tokens](#design-tokens)
7. [JavaScript and its hooks](#javascript-and-its-hooks)
8. [The paper figures](#the-paper-figures)
9. [Images, icons and fonts](#images-icons-and-fonts)
10. [Notes on the CSS](#notes-on-the-css)
11. [Checks before publishing](#checks-before-publishing), [before every push](#before-every-push),
    [after an event](#after-an-event) and [after a new arXiv version](#after-a-new-arxiv-version)
12. [Keeping the project materials current](#keeping-the-project-materials-current): posters, slides, talks and
    project pages from the paper repositories

## Preview locally

```bash
python3 -m http.server 8000      # from the repository root
# open http://localhost:8000
```

`python3 -m http.server` does not serve `404.html` for unknown paths (GitHub Pages does): open `/404.html` to check it.

Any static server works. Opening the files with `file://` shows every page in its complete no-JavaScript layout:
browsers block module scripts there, and when the site's scripts cannot load or start, the page falls back to the
no-JS layout on purpose (see [JavaScript and its hooks](#javascript-and-its-hooks)). Use a server to see the
interactive parts.

Pushing to `main` publishes the site, usually within a few minutes.

## File map

```
index.html            Home: hero, news, research, publications, talks, path, about, contact
research.html         Research in more depth: the problem, the approach, full publication entries with BibTeX
404.html              Not-found page (GitHub Pages serves it for unknown URLs; it uses root-relative paths)
plant/                The PLANT project page and its media (separate mini-site; this site only links to it)
_tools/check_site.py  Consistency checker (run it before every push; standard-library Python 3)
_tools/*.local.txt    Local-only lists the checker reads (git-ignored: never commit them)
_tools/plant/         Scripts that re-sync plant/ and its resized images from the PLANT paper repository, and
                      synced.json, the record of what was last copied
_tools/site_sync.py   Tells when a poster, talk or project page in a paper repository is newer than the site
CNAME                 Custom domain. Do not edit.
robots.txt, sitemap.xml, site.webmanifest, favicon.svg, apple-touch-icon.png

assets/css/site.css   The whole design system, in 18 numbered sections (01 Fonts ... 18 Print; see Notes on the CSS)
assets/js/site.js     Shared enhancements: theme, menu, dialogs, email, copy, upcoming tags, reveal, video, portrait, print,
                      focus in view
assets/js/figures.js  The paper figures: playback, arrows, the enlarged figure in the dialog (index.html, research.html)
assets/js/field.js    The hero dot field (index.html only)
assets/img/           Portraits (WebP + JPEG), og.png, neurips-mark.svg, resized copies of the PLANT poster and talk frame
assets/img/icons/     PNG app icons
assets/fonts/         Self-hosted WOFF2 fonts, README.md and OFL.txt (licenses)
```

GitHub Pages runs Jekyll over the repository, and Jekyll does not publish files or folders whose names start with
`_` or `.`. That keeps `_tools/` (and `.claude/`) off the live site. Never add a `.nojekyll` file. The two README
files are published as they are; `robots.txt` keeps them out of search results.

## Everyday edits

All content lives in the HTML. Each section starts with a comment banner, for example `<!-- ===== NEWS`.
When you copy any block, **rename every `id` in the copy** (and the `aria-labelledby`, `aria-controls`,
`data-dialog-open` and `data-goto` values that point at them): `_tools/check_site.py` reports duplicates and
dangling references.

### Add a news item

In `index.html`, find the `NEWS` banner. Copy one `<li class="news__item">` to the top of the first list:

```html
<li class="news__item">
  <time class="news__date" datetime="2027-01">Jan 2027</time>
  <p class="news__text">What happened, with <a class="link" href="https://arxiv.org/abs/0000.00000" target="_blank" rel="noopener">a link<span class="visually-hidden"> (opens in a new tab)</span></a>.</p>
</li>
```

Keep five items in the first list and move the oldest one into the `Earlier news` list right below it.

For a future event, mark it as upcoming, and write the sentence so that it is still true after the event
("PLANT poster at NeurIPS 2026, Sydney", not "Presenting PLANT"). The tag removes itself once the date in
`data-until` (the day after the event) arrives, so the page never shows a stale "Upcoming":

```html
<li class="news__item is-upcoming" data-until="2027-03-15">
  <time class="news__date" datetime="2027-03-14">Mar 14, 2027</time>
  <p class="news__text"><span class="tag" data-upcoming-tag>Upcoming</span>Talk at ...</p>
</li>
```

Then update the "Last updated" month in the footer of all three pages, `<lastmod>` of the home and research pages in
`sitemap.xml`, and `dateModified` of the ProfilePage in the JSON-LD of `index.html` (the checker compares the months).

### Add a publication

A paper appears in three places on the home page and in one on the research page:

1. a card on `index.html` (`PUBLICATIONS` banner) and a fuller entry on `research.html`, both an
   `<article class="pub" id="short-name">`; their text must match (the checker compares venue, title, authors,
   summary, results, facts and abstract);
2. a cite `<dialog>` at the end of `index.html` (the research page prints the BibTeX inline instead);
3. one line of the record under the hero sentence (`<ul class="hero__record">`, a name in `<b>` and the rest in one
   `<span>`), if it belongs there. The hero fits three record lines; replace a line rather than add a fourth.

Card skeleton (replace `short`, `SHORT` and the `…`):

```html
<!-- ---------- SHORT ---------- -->
<article class="pub" id="short" aria-labelledby="short-title" data-reveal>
  <header>
    <p class="pub__venue"><strong>Venue 2027<span class="visually-hidden">,</span></strong><span class="sep" aria-hidden="true">/</span><span>Track</span></p>
    <h3 class="pub__title" id="short-title"><a href="https://arxiv.org/abs/0000.00000" target="_blank" rel="noopener" aria-describedby="cue-new-tab"><span>Title:</span> <span class="pub__subtitle">Subtitle</span></a></h3>
    <p class="pub__authors"><span class="me">Debjyoti Saha Roy</span>, <a href="https://…" target="_blank" rel="noopener">Co-author<span class="visually-hidden"> (opens in a new tab)</span></a></p>
  </header>
  <div class="pub__actions pub__actions--cols">
    <a class="btn btn--small btn--primary" href="https://arxiv.org/abs/0000.00000" target="_blank" rel="noopener"><svg class="icon icon--brand" aria-hidden="true"><use href="#i-arxiv"/></svg>arXiv<span class="visually-hidden"> page of SHORT (opens in a new tab)</span></a>
    <a class="action" href="https://arxiv.org/pdf/0000.00000" target="_blank" rel="noopener"><svg class="icon" aria-hidden="true"><use href="#i-file"/></svg>PDF<span class="visually-hidden"> of SHORT (opens in a new tab)</span></a>
    <button class="action" type="button" data-dialog-open="dlg-cite-short" data-requires-js><svg class="icon" aria-hidden="true"><use href="#i-quote"/></svg>BibTeX<span class="visually-hidden"> for SHORT</span></button>
    <a class="action" href="research.html#short-bibtex" data-nojs-only><svg class="icon" aria-hidden="true"><use href="#i-quote"/></svg>BibTeX<span class="visually-hidden"> for SHORT</span></a>
  </div>
  <div class="pub__summary">
    <p class="pub__tldr"><span class="pub__tldr-label">In one sentence<span class="visually-hidden">: </span></span>…</p>
    <ul class="results" role="list" aria-label="Selected results">
      <li class="result"><span class="result__num">00.0</span><span class="result__text">What the number means.<span class="result__src"><span class="visually-hidden">Source: </span>Table 1</span></span></li>
    </ul>
    <p class="pub__limit"><span class="pub__tldr-label">Stated limit<span class="visually-hidden">: </span></span>… (quoted from the abstract)<span class="result__src"><span class="visually-hidden">Source: </span>Abstract</span></p>
    <dl class="facts pub__facts">
      <div><dt>Tasks</dt><dd>…</dd></div>
    </dl>
  </div>
  <details class="pub__abstract">
    <summary>Abstract <svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg></summary>
    <p>…</p>
  </details>
</article>
```

Research-page entry skeleton (`research.html`, `PUBLICATIONS` banner; no figure needed):

```html
<article class="pub" id="short" aria-labelledby="short-title" data-reveal>
  <header>…the same three lines as the card…</header>
  <div class="pub__actions">
    <a class="btn btn--small btn--primary" href="https://arxiv.org/abs/0000.00000" target="_blank" rel="noopener"><svg class="icon icon--brand" aria-hidden="true"><use href="#i-arxiv"/></svg>arXiv<span class="visually-hidden"> page of SHORT (opens in a new tab)</span></a>
    <a class="action" href="https://arxiv.org/pdf/0000.00000" target="_blank" rel="noopener"><svg class="icon" aria-hidden="true"><use href="#i-file"/></svg>PDF<span class="visually-hidden"> of SHORT (opens in a new tab)</span></a>
    <a class="action" href="#short-abstract"><svg class="icon" aria-hidden="true"><use href="#i-arrow-down"/></svg>Abstract<span class="visually-hidden"> of SHORT</span></a>
    <a class="action" href="#short-bibtex"><svg class="icon" aria-hidden="true"><use href="#i-quote"/></svg>BibTeX<span class="visually-hidden"> for SHORT</span></a>
  </div>
  <div class="pub__summary">…exactly the card's summary…</div>
  <div class="pub__block" id="short-abstract">
    <h4>Abstract</h4>
    <p>…</p>
  </div>
  <div class="pub__block bibtex" id="short-bibtex">
    <h4>BibTeX</h4>
    <pre tabindex="0" role="region" aria-label="BibTeX for SHORT"><code>@article{…}</code></pre>
    <p class="bibtex__bar">
      <button class="btn btn--small" type="button" data-copy data-requires-js><svg class="icon" aria-hidden="true"><use href="#i-copy"/></svg><span data-copy-label>Copy BibTeX</span><span class="visually-hidden"> for SHORT</span></button>
      <span class="status" role="status" aria-live="polite"></span>
    </p>
  </div>
</article>
```

Cite dialog skeleton (`index.html`, next to the other dialogs at the end of the file):

```html
<dialog class="dialog" id="dlg-cite-short" aria-labelledby="dlg-cite-short-title">
  <div class="dialog__head">
    <h2 class="dialog__title" id="dlg-cite-short-title">Cite SHORT</h2>
    <button class="icon-btn" type="button" data-dialog-close aria-label="Close"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button>
  </div>
  <div class="dialog__body bibtex">
    <pre tabindex="0" role="region" aria-label="BibTeX for SHORT"><code>@article{…}</code></pre>
  </div>
  <div class="dialog__foot">
    <button class="btn btn--primary btn--small" type="button" data-copy autofocus><svg class="icon" aria-hidden="true"><use href="#i-copy"/></svg><span data-copy-label>Copy BibTeX</span><span class="visually-hidden"> for SHORT</span></button>
    <span class="status" role="status" aria-live="polite"></span>
  </div>
</dialog>
```

Notes:

| Part | What to know |
|---|---|
| `.pub__actions` | Directly under the header. One primary `.btn`, then plain `.action` links. Each label carries the paper's name in a hidden span, so no two links on the page share a name. Remove links you do not have; never leave a dead one. On the home page keep `pub__actions--cols` (four aligned columns on phones, like the other cards); a row with a plain-text "Code: coming soon" (`.action--soon`) keeps its 0.5rem gap automatically. The research page's entries use plain `pub__actions` |
| `.pub__title` | The link's new-tab cue is `aria-describedby="cue-new-tab"` (one hidden span at the top of `<main>`), so the headings list stays clean |
| `.pub__summary` | In this order: TL;DR, results, limit, facts. Phones read it so; from 52em the TL;DR and the limit sit left of the results and the facts run under both (two across) |
| `.pub__limit` | The paper's own stated limit, quoted from its abstract |
| `.results` | Up to three rows: number, plain-words claim, and `.result__src` naming the table or figure it comes from (with a hidden "Source: ") |
| labels | `.pub__tldr-label` ends with a hidden ": " so screen readers say "In one sentence: …" |
| `[data-nojs-only]` | The card's BibTeX (and the MISTILL figure's "Terms and full figure") is a dialog with JavaScript; without it, or without `<dialog>` support, a plain link to the research page shows instead |
| figure | Optional. Figures are always drawn natively (SVG or HTML), never pasted in as images of the paper; see [The paper figures](#the-paper-figures) |
| BibTeX | Author names as `Surname, Given` (here `Saha Roy, Debjyoti`: the surname is two words). The copy button has a **bare `data-copy`**: it copies the `<pre>` inside its own dialog (or its own `.bibtex` block on the research page), so a copied block can never copy another paper's entry. On `research.html` the entry is a `.pub__block.bibtex` with the same `<pre>` and a `data-copy` button |
| separators | Visual separators (`/`, `·`) are `aria-hidden`; put a hidden comma (`<span class="visually-hidden">,</span>`) after the item before each one, so screen readers pause |

Also add the paper to the JSON-LD block in the `<head>` of **both** pages (the checker requires the two nodes to be
equal) and to the "Papers:" lines of the research themes it belongs to:

```json
{
  "@type": "ScholarlyArticle",
  "@id": "https://arxiv.org/abs/0000.00000",
  "headline": "Title: Subtitle",
  "name": "Title: Subtitle",
  "author": [{ "@id": "https://debjyoti.org/#person" }],
  "datePublished": "2027",
  "url": "https://arxiv.org/abs/0000.00000",
  "identifier": { "@type": "PropertyValue", "propertyID": "arXiv", "value": "0000.00000" }
}
```

### Add a talk

In `index.html`, find the `TALKS & TRAVEL` banner and copy the `<article class="talk">` block (rename its ids). A talk
has a meta line (date, place, event), a title, a sentence, and optionally a video, a poster thumbnail and links. A
second talk gets a hairline and spacing above it automatically.

- Video: keep `controls preload="none" playsinline` and put the poster frame in `data-poster` (not `poster`):
  `site.js` attaches it only when the player nears the viewport, so the page stays light. Videos never autoplay.
  With JavaScript the native controls give way to the site's play button in the slide's top-right corner (clear of
  the faces and text of the PLANT title slide; move it if another slide has something there) until the talk is
  started. Its length tag and its name ("Play the talk, 5 min 10 s") come from `data-length` on the `<video>`
  (without it the button has no tag). Without JavaScript the native controls stay and `site.css`
  (`.no-js .media video`) shows a poster frame as a background: that rule names **PLANT's** title slide. For a second
  talk, scope the rule to each video (for example `.no-js .media video[data-poster*="plant-talk"]`, plus a rule for the
  new one), or leave the native controls on black for it.
- Captions: keep the `<track kind="captions" … default>` line and point it at a `.vtt` file; `site.js` switches the
  default track on (WebKit leaves it off otherwise).
- Large images: put resized copies in `assets/img/` and list them in a `srcset` with an honest `sizes`
  (the PLANT poster has 480 and 800 px WebP copies, the talk's poster frame a 1280 px WebP copy).
- Upcoming talks use the same `is-upcoming` / `data-until` pair as news.

### Profile links

There are three groups of profile links:

- the icon row of the hero (`<ul class="social">` in `index.html`, right after the hero text in the source; shown
  under the plate on phones and under the buttons from 48em): GitHub, Google Scholar, LinkedIn, X;
- the Contact section of `index.html`: the same four in `<ul class="elsewhere">`, then a "Personal" label and a
  second list with Facebook and Instagram;
- a text row in the footer of all three pages: the same four and "Email" (a link to the Contact section).

Facebook and Instagram appear only in the "Personal" list of the Contact section. Every profile link carries
`rel="noopener me"` (it claims the profile as yours). To change a handle, edit its `href` and the `<small>` text,
and the same URL in the JSON-LD `sameAs` list in the `<head>` of `index.html`. To drop a profile, delete its
`<li>` and its `sameAs` entry (and the "Personal" label with its list if both personal links go).

### Bio and "beyond research"

The About section of `index.html` holds the first-person bio and a short facts list.
A `TODO(owner)` comment marks where a paragraph about life outside research can go.

### Email address

The address is not written anywhere in the HTML, to keep it away from scrapers. The Contact section holds only the
readable form `saharoy.d [at] northeastern [dot] edu` as plain text (`[data-email]`), in two `.nowrap` halves so
that a narrow phone breaks it only between them (with very large text, under 17em, the halves may wrap too).
`site.js` (section 4) turns it into a button; pressing it assembles the real address from the three `EMAIL_PARTS`,
swaps in a `mailto:` link and opens the mail app, and the "Copy address" button copies it. If the address changes,
edit `EMAIL_PARTS` and the readable form.

### CV

There is no CV file in the repository, so the site says "available on request". To publish one, add the PDF
(for example `assets/cv/Debjyoti-Saha-Roy-CV.pdf`) and replace that sentence in the About facts list and the
Contact note with a link (new tab, with the cue).

## Links: same tab or new tab

- **New tab**: every link to another site (arXiv, GitHub, Scholar, co-authors' pages, social profiles), every file
  (PDF, MP4) and every link into the `/plant/` project page. Write them like this:

  ```html
  <a class="link" href="https://arxiv.org/abs/2410.23066" target="_blank" rel="noopener">arXiv<span class="visually-hidden"> (opens in a new tab)</span></a>
  ```

  `target="_blank"` needs `rel="noopener"`, and the hidden sentence tells screen-reader users what will happen.
  An icon-only link carries the cue in its label instead: `aria-label="GitHub (opens in a new tab)"`; a link inside
  a heading points at the shared cue with `aria-describedby="cue-new-tab"`.
  Inline text links (`.link`, links in `.prose`, author links) get a small arrow from the stylesheet automatically.
- **Same tab**: in-page anchors (`#news`), links between this site's own pages (`./`, `research.html`, the 404
  page), and the skip link.

## Shared header and footer

There is no templating: the icon sprite, the header, the footer and the small theme script in `<head>` are
**repeated in `index.html`, `research.html` and `404.html`** (a comment at the top of each file says so). They are
marked with comment banners. When you change one (a new nav item, a new icon in the sprite, the "Last updated"
date), make the same change in all three files; `_tools/check_site.py` compares them. Details that differ on
purpose:

- nav links are `#section` on the home page; on the research page `./#section` (home sections), `#publications`
  (its own section) and `./` for the brand; on the 404 page `/#section` and `/`;
- on `research.html` the Research link carries `aria-current="page"` (and no other item is ever marked there);
- the footer's "Email" link is `#contact` on the home page, `./#contact` on the research page and `/#contact` on the
  404 page (the checker allows exactly that).

Inside the bar the source order is: brand, menu button, nav, theme button. That is the focus order on every screen,
and on phones the sheet's links follow their button. From 50em the full nav shows in the bar; below 50em `order`
shows the theme button left of Menu. The theme button keeps the name "Dark theme" and says its state with
`aria-pressed`. The open phone menu closes on Escape, any link in the header (the brand too), a tap outside (a
dimming scrim), when focus leaves the header, and on Android back; while it is open the bar is solid and the page
behind does not scroll.

## Design tokens

All colours, type sizes, spacing, radii and timings are custom properties at the top of `assets/css/site.css`
(section 02). Change a token and the whole site follows.

| Group | Tokens | Notes |
|---|---|---|
| Surfaces | `--paper`, `--paper-2`, `--card` | Warm paper; `--paper-2` is the tinted band of alternate sections |
| Ink | `--ink`, `--ink-2`, `--ink-3` | Text, secondary text, quiet labels. All pass WCAG AA on every surface |
| Lines | `--line`, `--line-2`, `--line-3` | Hairlines; `--line-3` is the 3:1 boundary for controls |
| Accent | `--accent`, `--accent-soft`, `--accent-ink` | Rust. It has one meaning: *chosen* or *current* (current nav item, upcoming news, your name among authors, the selected dots, the current Path stop). Hover and focus use it too; nothing decorative does |
| Figure roles | `--c-teal`, `--c-blue`, `--c-orange`, `--c-gold`, `--c-violet`, `--c-green`, `--c-red` (+ `-soft`) | Only inside the paper figures; they follow the papers' own colour roles. `--c-red` (near-miss, token j) is a cooler red, kept apart from the rust of `--c-orange` (P2C) |
| Hero field | `--field-dot`, `--field-region`, `--field-chosen`, `--field-line` | Read by `field.js` when it paints the canvas |
| New-tab arrow | `--ext-arrow` | The small arrow after inline links that open in a new tab |
| Type | `--font-display` (Fraunces), `--font-sans` (Inter), `--font-mono` (JetBrains Mono), `--font-bn` (Tiro Bangla), `--font-math` | Each has metric-matched fallbacks (Georgia, Arial, and Noto Serif / Roboto for Android) |
| Type scale | `--fs-micro` (12px, the floor) up to `--fs-hero` | Fluid with `clamp()`; from 48em the hero name is also capped by the viewport height |
| Layout | `--gutter`, `--wrap`, `--rail`, `--section-y`, `--nav-h` | `--rail` is the sticky section-title column on desktop; `--wrap` grows from 76rem to 90rem at 100em |
| Shape and motion | `--r-1..3`, `--ease`, `--dur-1..3` | |

**Themes.** Light values sit in `:root`. The dark values appear twice in a row: once for
`prefers-color-scheme: dark` (when the visitor has not chosen) and once for `:root[data-theme="dark"]`.
Edit both blocks together (the checker compares them). The print block (section 18) repeats the light `--c-*`
values; check h compares them with `:root`, so change a role colour in both places.

**The theme colour of the browser bar** (`#F5F1E8` light, `#141110` dark, equal to `--paper`) lives in five places:
`--paper` in the CSS, `THEME_COLOR` in `site.js`, the theme script in the `<head>` of each page, the two
`<meta name="theme-color">` tags of each page (six in all) and `site.webmanifest`.

**Breakpoints** are in `em`:

| Breakpoint | What changes |
|---|---|
| 17em | Very large text: the contact address may also wrap inside its two halves |
| 19.75em | The header keeps only the brand mark (narrow phones, large text) |
| 21.9375em | Hero eyebrow and record lines step down to 12px |
| 22em | The wordmark may take two tight lines instead of an ellipsis |
| 22.5em–40em | The publication action row: the primary button alone, then at most four actions per row (wraps when text grows) |
| 26em | The contact address steps down |
| 30em | Result rows get their numeral column; the talk's event line no longer takes its own line |
| 40em | Tablet: a wider plate; the eyebrows show their `.eyebrow__college` part ("Khoury College" on the home page, the name on the research page; phones drop it) |
| 48em | Two-column hero, height-aware type and spacing (the eyebrows drop that part again until 64em); the record becomes a two-column table; tall tablets get a taller plate |
| 50em | Full nav in the bar (below: the phone sheet, two columns on landscape phones) |
| 52em | Two-column content (summaries, talks, contact, footer) |
| 64em | Desktop: the margin rail; full-height hero; the research page head shows the three theme glyphs; the full MISTILL caption in two columns |
| 100em | Large monitors: wider page, larger name and plate |

The figures use a container query (`fig`, 50rem) instead, so they switch layout by their own width; the plate's
legend (30rem: four across, else two by two) and the talk's play button (26rem) do the same.
`prefers-contrast: more` (iOS Increase Contrast) strengthens the hairlines to 3:1 and makes the header solid. Hover styles are
written inside `@media (hover: hover) and (pointer: fine)`, so they never stick after a tap; touch gets a short
`:active` dim instead. Keep new hover rules inside such a block.

## JavaScript and its hooks

Three plain ES modules, loaded with `<script type="module">` (modules are deferred by default and run in document
order after the page is parsed). A page loads only what it uses: every page has `site.js`, in the `<head>`;
`index.html` and `research.html` add `figures.js` and `index.html` adds `field.js`, both at the very end of `<body>`,
so that on a slow connection they do not compete with the page's own HTML and CSS before the first paint.

**Cache token.** Every reference to `site.css` and to the three scripts ends in `?v=YYYY-MM-DD` (404.html uses the
root-relative `/assets/...` form). When `site.css` or a JS file changes, bump `?v=` on all three pages, the same
token everywhere (the checker fails on a missing or second token); browsers then fetch the new files at once.

The small inline script at the top of each `<head>` runs before first paint: it switches `<html class="no-js">` to
`js`, applies the stored or system theme (and the browser-bar colour), and watches the site's scripts. If one of
them fails to load, or `site.js` has not started by the time the document is parsed (it adds `js-ready`), the page
returns to `no-js`: the complete no-JavaScript layout (all nav links in the bar, figures stacked, JS-only controls
hidden). Controls that need JavaScript carry `data-requires-js`.

`site.js` is divided into numbered sections, one behaviour each, started inside a `try` at the bottom of the file so
that one failure cannot stop the rest:

| Section of `site.js` | What it does | Hook in the HTML |
|---|---|---|
| 1 Theme toggle | Light/dark, saved in `localStorage`, follows the system until chosen; `aria-pressed` is true in dark. A page restored by Back (`pageshow`) or open in another tab (`storage`) follows a choice made elsewhere | `[data-theme-toggle]`; sets `<html data-theme="light|dark">` |
| 2 Navigation | Phone menu (scrim, focus-out and Android-back close, solid bar and no page scroll while open), and the "current section" dot in the nav | `[data-nav-toggle]` with `aria-expanded` and `aria-controls`; Escape closes |
| 3 Dialogs | Native `<dialog>` modals; a dialog opened by a tap or click hides the focus ring until the first key (WebKit rings the autofocused button otherwise); without `showModal` the `[data-nojs-only]` links show instead | `[data-dialog-open="dialog-id"]`, `[data-dialog-close]`; backdrop (press and release on it) and Escape close |
| 4 Email | Turns the readable address into a button, assembles the address on demand | `[data-email]` |
| 5 Copy buttons | "Copied" state plus a live-region message; first it wraps each BibTeX line in a span (`.is-wrapped`), so long lines wrap with a hanging indent and the whole entry shows (the text, and so what Copy copies, is unchanged); an entry's first line breaks, when it must, after its brace, so the citation key is never split | bare `[data-copy]` (the `<pre>` of its dialog or `.bibtex` block), `[data-copy="email"]`; optional `[data-copy-label]` |
| 6 Upcoming labels | Expires "Upcoming" tags | `[data-until="YYYY-MM-DD"]`, `[data-upcoming-tag]` |
| 7 Scroll reveal | Fade-and-rise on scroll; focus inside a hidden block shows it at once | `[data-reveal]` (the hidden state is added by the script only, never in the HTML) |
| 8 Video posters | Lazy poster frames, captions on, the site's own play button until the talk starts (focus moves to the player when it starts from the keyboard or a click that focused the button) | `<video data-poster="..." data-length="5 min 10 s">` |
| 9 Portrait flip | One portrait per theme (CSS: dark XOR `.is-alt`); the button shows the other one and a theme change clears it; only the visible face is exposed to assistive technology | `[data-portrait]`, `[data-portrait-flip]` |
| 10 Print | Opens closed `<details>` while printing | none |
| 11 Focus in view | After Tab or Shift+Tab, scrolls a stop that is still cut off (under the sticky header or at the bottom edge) fully into view | none (uses the root's `scroll-padding-top`) |

| Other file | What it does | Hook in the HTML |
|---|---|---|
| `figures.js` | Plays a paper figure once when it scrolls into view and on "Replay" (printing stops a playback, so the static figure prints); draws the MISTILL arrows; fills the dialog's enlarged figure; handles jumps between steps and panels (and moves focus there); switches the full MISTILL figure to its stepped phone layout (`is-stepping`) | `[data-figure="plant|mistill|mistill-full"]`, `[data-figure-play]`, `.step[data-step]`, `[data-trace]`, `[data-figure-clone]`, `[data-goto]` |
| `field.js` | The hero field: 5,651 dots on a canvas, a few chosen. The selection follows the pointer (and, on touch screens, a horizontal drag or the page scroll); a tap on the dots and "Try another document" pick a new one, a tap on the photograph turns the portrait. Once, the first time the plate is 60% on screen, a reading pass plays (about 2 s): a band reads the list while the legend counts to 5,651, then the regions and lines appear. On touch screens a scroll past the plate before the pass has played shows the complete selection at once (the pass is not started by a scroll). Rest positions lie in the block opposite the portrait, so their lines never bend. "Try another document" announces a numbered example ("Example document 3: …"), so two messages in a row always differ | `[data-field]`, `[data-field-stage]`, `[data-field-again]`, `[data-field-count]` (the legend's number), `[data-field-status]` (announces a new example) |

Other conventions:

- Motion respects `prefers-reduced-motion`: no reveal, no figure playback, a static hero field, and the portrait swaps
  instead of turning.
- Nothing moves on its own for more than five seconds, and nothing loops.

## The paper figures

The figures are **drawn natively** (inline SVG or HTML and CSS) from the papers' own figure sources, so they are
sharp at every size, follow the light and dark themes and are readable on a phone. **No image of a paper figure is
used anywhere on the site.** Each figure links to the page of the paper's PDF where the original appears.
Every label and number in a figure must match the paper exactly; if a paper's figure changes, edit the text in place.

| Figure | Where | How it is built |
|---|---|---|
| PLANT, Figure 1 | PLANT entry on both pages | `data-figure="plant"`: two inline SVGs, `.pfig--tall` for phones and `.pfig--wide` for wide frames. Maths is real text in the small `FigMath` font. Word labels use `.t-lab`, dimension lines `.t-dim` (sized to stay readable where the drawing is scaled down). Groups carry `class="step" data-step="1..5"` for playback. It has a Replay button. |
| MISTILL, Figure 1 (compact) | MISTILL entry on both pages | `data-figure="mistill"`, `id="fig-mistill"`: HTML and CSS (`.mfig`), two panels (`.mfig__panel[data-panel]`). Token chips wrap on phones and sit on one row when the frame is at least 50rem wide. It plays once when first seen; its Replay button shows only inside the dialog. |
| MISTILL, Figure 2 (the full version, Appendix C) | Step 2 of the dialog on the home page; printed inline on the research page | `data-figure="mistill-full"`: the same component with five panels (`.mfig--full`). In a wide frame they are laid out as in the paper; on phones `data-stepped` shows one panel at a time, chosen from the index above the figure (`.mfig__index`), once `figures.js` has added `is-stepping` (without it, or when the page falls back to no-JS, the panels stack). |

Things to know before editing them:

- **The figure blocks are identical on both pages** (the compact MISTILL figure apart from its tools row), and the
  checker compares them. Edit both pages.
- **PLANT has two drawings per page**, a tall one for phones and a wide one: change a label in both, on both pages,
  and compare at 390 and 1440 px.
- **The compact MISTILL figure depends on token order**: its 14 tokens fill the 14 columns of `.trace` in the wide
  layout, and the notes sit under columns 4, 7 and 10-14 (a comment in the HTML says so).
- **Each figure's text exists once per page** and is that figure's string table: all layouts render the same markup.
  The two MISTILL figures word things differently on purpose (seven inventory lines, "Phase 1/2", "≥2 nats" belong to
  the full version only). Never copy wording from one into the other.
- **Notes that point at a token** ("here") start with a hidden "At “kidney”:" so screen-reader users keep the referent.
- **The MISTILL dialog** (`#dlg-fig-mistill`, home page) has two steps. Step 1 is an enlarged copy of the card figure:
  `figures.js` clones `#fig-mistill` into `<div data-figure-clone="fig-mistill">` the first time the dialog opens, so
  there is nothing to keep in sync. Under it is the paper's glossary as a definition list. Step 2 is Figure 2.
- **`data-goto="element-id"`** on a button or link scrolls to that element inside the current view and moves focus
  to it; for a panel of a stepped figure it also makes that panel the visible one. The glossary's "Fig. 2, bottom"
  uses it.
- `figures.js` draws the dashed loop-back arrow of both MISTILL figures for whichever layout is showing, and the
  dotted arrow from the chapter letter to its region in the wide layout of Figure 2. (Print hides both arrows.)
- The MISTILL result lines on the publication entry carry the paper's numbers with their scope: keep
  "the top-ranked for chapter decisions" in the same sentence as 0.62 and 0.67.

## Images, icons and fonts

- **Portraits**: `assets/img/portrait-tweed-{320,480,640,800}` and `portrait-denim-{320,480,640}`, each `.webp` and
  `.jpg`, cropped 4:5, no metadata. One portrait per theme: the light theme shows tweed, the dark theme denim (and
  without JavaScript, tweed). Tweed has a preload in the `<head>` for light systems
  (`media="(prefers-color-scheme: light)"`); the denim `<img>` is `loading="lazy"` and has no preload, so it never
  competes with the first paint: WebKit does not match a lazy image to a preload and fetched it twice, and an eager
  denim cost light systems about 0.1 s of first paint. If the portrait's rendered width changes, update `sizes` on both
  pictures and `imagesizes` on the preload identically.
- **Talk images**: resized copies of the PLANT poster (`plant-poster-{480,800}.webp`) and of the talk's poster frame
  (`plant-talk-poster-1280.webp`) live in `assets/img/`; the originals stay in `plant/media/`.
  `_tools/plant/resync_plant.sh poster` and `slides` remake them (`IMG=/some/folder` writes them elsewhere for a dry
  run; `DST` does the same for `plant/`).
- **Icons**: one inline SVG sprite at the top of `<body>` on each page (three identical copies).
  Use `<svg class="icon" aria-hidden="true"><use href="#i-name"/></svg>`; add `icon--brand` for the filled brand marks.
  Icon-only links need an `aria-label`.
- **Social card**: `assets/img/og.png` (1200×630, a static image, 256-colour PNG without metadata). The `og:image`
  URL must stay absolute.
- **Fonts**: see `assets/fonts/README.md`. The Bengali font holds only the letters of the name. Fraunces ships upright
  only (nothing uses its italic).

## Notes on the CSS

`site.css` carries only its section headers and a few one-line notes; the longer explanations live here.

- **Conventions.** Rust (`--accent`) means chosen or current; the `--c-*` role colours belong to the paper figures.
  Every modern feature has a plain fallback written above it: hex before `color-mix`, a solid background before
  `backdrop-filter`, `vh` before `svh`/`dvh`, `hidden` before `clip`. Hover rules live inside
  `@media (hover: hover) and (pointer: fine)`; touch gets a short `:active` dim.
- **Fonts.** The "… Fallback" faces are local fonts (Georgia, Arial; Noto Serif and Roboto on Android) scaled with
  `size-adjust` and the override descriptors to Fraunces' and Inter's metrics, so lines do not shift when the web
  fonts arrive. FigMath maps the bold-italic j and h (U+1D489, U+1D48B) to its italic file. The mono stack puts
  Menlo before `ui-monospace`: Menlo's advance (0.602em) matches JetBrains Mono's (0.600em), while SF Mono's (0.618em)
  wrapped the hero eyebrow in Safari until the web font arrived.
- **Header.** With JavaScript the bar never wraps: below 50em the nav is an absolutely positioned sheet over a
  scrim; on short landscape screens its links take two columns. Without JavaScript the links wrap under the bar.
- **Hero.** Grid areas place the text, the plate and the social row (phones: text, plate, social; from 48em text
  and social on the left, the plate on the right). From 48em the name, the Bengali line and the gaps follow the
  viewport height, and the plate's width is capped by the height (`--plate-room` is the height the rest of the hero
  needs; `--plate-ar` is the stage's height divided by its width). The portrait's paper `box-shadow` is a moat that
  keeps dots off the photograph before the canvas is live; `field.js`'s `moat = 9` mirrors it (the .5rem paper ring
  plus 1 px), so change both together. Until the canvas is live (and without JavaScript) the plate shows a CSS dot
  texture with a 5 px pitch, between the live field's pitches on phones and on desktops.
- **Portrait.** The faces swap `visibility` at the half-way point of a symmetric turn instead of relying on
  `backface-visibility`, which some engines ignore without compositing. The turn's transitions (and the flip
  button's) apply only once `site.js` has added `.can-turn`, two frames after it starts: WebKit can style a cold load
  once without the stylesheet, and transitions present from the start then animated every themed value from the
  browser default (in dark, the portrait turned on load). The flip button's two-tone focus ring reads on any part of
  either photograph.
- **Plate legend.** A container query sets the key four across or two by two (never three and one). The legend's
  number has a reserved width, so the count during the reading pass never moves anything. The legend items that
  need the field (and the button) are hidden until `field.js` adds `.is-live`. Its columns may shrink
  (`minmax(0, max-content)`) and the codes label may wrap at its space (`ICD-10-CM` is `.nowrap`), so under enlarged
  text spacing or on a landscape phone the key stays inside the plate. The column gap, `min(1.1rem, 4.9%)`, narrows
  only in captions under 359 px, so a 320 px phone still sets the key on one line at default spacing.
- **Publications.** The summary is one column in source order on phones; from 52em grid areas put the TL;DR and the
  limit left of the results (5:7) and the facts under both. On phones the action row is a flex row: `::before`
  forces the line break after the primary button, each action is at least a quarter of the row (at most four per
  row), and `::after` packs the last row to the start. The home cards' rows (`.pub__actions--cols`) keep four
  aligned columns while the card is at least 19em wide in its own text size (a container query on `.pub`, so larger
  text falls back to the wrapping row). Their column gap is 0: `space-between` gives the same positions, and the
  spare room absorbs wider text spacing. MISTILL's row keeps the 0.5rem gap, because its "Code: coming soon" spans
  three columns and sizes the third. A result's numeral column is at least 9.5rem; a wider numeral (only under
  enlarged text spacing) widens its own row instead of running into the sentence. In print the publication blocks
  are block flow (`.pubs`, `.pub`, `.pub__block`, `.pub__summary`, `.results`): Chromium does not grow a grid row
  when an unbreakable item moves to the next page, so the next item printed over it.
- **BibTeX.** Shown exactly as written. `site.js` wraps each line in a span (`.is-wrapped`) for a hanging indent,
  and puts the citation key of the first line in an inline-block, so on a narrow phone that line breaks after its brace
  instead of inside the key; without JavaScript the box scrolls sideways.
- **Figures.** Layouts switch by the frame's width (container `fig`, 50rem). The full MISTILL figure shows one panel
  at a time in a narrow frame only once `figures.js` has added `.is-stepping` (no JS: the panels stack). Its "put in
  the clean token" arrow is a gradient, because WebKit draws a short dashed border as a single dash at DPR 3. Under
  larger text spacing the test panel moves its bars under the notes rather than squeeze them.
- **Dialogs.** `::backdrop` uses literal colours (older Safari does not pass custom properties to it). The page
  behind does not scroll or shift (`--scrollbar-w`, set by `site.js`).
- **Talk.** The play button uses fixed colours because it always sits on the light title slide: its focus ring is a
  literal rust (an `--accent` ring was 2.4:1 on the slide in dark), and forced colours leave it alone.
- **Motion.** `site.js` adds `.reveal-pending` only to blocks below the fold, so nothing is hidden without
  JavaScript or in print. Reduced motion shortens every transition to nothing; the portrait swaps instead of turning.
  Links, buttons and icons get their transitions only once `site.js` has added `.can-animate` to the root, two frames
  after it starts (the same reason as `.can-turn`): on a cold visit WebKit styled them once without the stylesheet,
  so every link and button colour faded in from the browser default. Without JavaScript the rule does not apply.
  If another first-screen control still fades in on a cold Safari visit, add its selector to that rule.
- **Forced colours.** Backgrounds that carry data (bars, shaded rows, legend dots, the "chosen" marks) keep their
  colours.
- **Print.** Light tokens whatever the theme (the print block repeats the light `--c-*` colours, and check h compares
  them); the wide PLANT drawing; no plate, glyphs, poster thumbnail or routed arrows; links in publications, talks and
  profiles print their address; summaries break only between rows; the publication blocks are block flow (above);
  a publication's header and its action row, a talk's head and each approach step stay on one page; the footer has no
  bottom padding, so a page that ends exactly with it is not followed by a blank one.

## Checks before publishing

Run the checker from the repository root; it exits non-zero when something needs fixing:

```bash
python3 _tools/check_site.py
```

It compares the shared sprite, header, footer and head script across the three pages, the figure blocks, the
publication text and the BibTeX across pages (and with `plant/index.html`), parses the JSON-LD (papers and code must
match on both pages), checks that tags balance, the link rule, local references (with exact case, also against what
git tracks), ids and the targets of `aria-*` and `data-*` references, forbidden strings, the "Last updated" month
(with the sitemap and the ProfilePage), the two dark-token blocks, the theme colour and the single `?v=` token, and
warns about `data-until` dates that have passed. It also counts the `PLACEHOLDER` links. The terms the owner has ruled
out for the site are read from a local, git-ignored list (`_tools/terms.local.txt`, one regular expression per line;
`SITE_TERMS_FILE` may point elsewhere); without it that part is skipped with a warning. Never commit that list.

Two warnings do not change the exit code but need acting on:

- **m**: `site.css` or a script changed since the last commit (or since the upstream branch, when the branch has
  one, so committed but unpushed edits count) while `?v=` stayed the same: bump the token on all three pages.
- **n**: a Markdown file outside `_*` and `.*` folders and `plant/` contains a Liquid tag sequence (see below).

Then, by hand:

- Every claim, number and date should be traceable to a paper or a CV line. No placeholders.
- Both themes, a phone width (320–430px) and a desktop width; keyboard through the nav, the dialogs and the copy buttons.
- No horizontal scrolling at any width; no console errors; links open.
- No Liquid tags in any `.md` file (two opening curly braces, or an opening curly brace followed by a percent sign):
  GitHub Pages runs Jekyll over Markdown, and an unclosed tag fails the build. Check n warns about them.

### Before every push

- `python3 _tools/check_site.py --launch` passes (it fails while a `PLACEHOLDER` link remains or a referenced file
  is not committed).
- `git add -A`, then `git status` shows nothing untracked (and no `*.local.txt` file staged).
- The repository is public: nothing private goes into it, `_tools/` included.
- After a change to a profile link, open it by hand (Google Scholar, LinkedIn, X, Facebook and Instagram block
  automated link checks).
- Commit `plant/` changes in the same push as the pages that link to them, so every link into `/plant/` resolves.

### After an event

- Reword the news item and the talk sentence if needed (they are written to stay true afterwards).
- The "Upcoming" tag and the `is-upcoming` class drop themselves on the `data-until` date; once it has passed, also
  remove `is-upcoming`, `data-until` and the tag from the HTML.
- Update "Last updated" in the footer of all three pages, `<lastmod>` in `sitemap.xml` and the ProfilePage
  `dateModified` in `index.html`.

### After a new arXiv version

- The figure strings: every label and number in the native figures against the new PDF (both pages, both PLANT
  drawings).
- The "In the paper, p. N" links: the page numbers of the figures may have moved.
- The quoted abstracts and the stated limits (both pages): they are verbatim.
- The version named in News (for example "arXiv v6") and the BibTeX, if its fields changed.

## Keeping the project materials current

The PLANT poster, slides, talk and project page are built in the PLANT paper repository and copied into `plant/` (and
`assets/img/`) by `_tools/plant/resync_plant.sh`. Each copy into this repository records itself in
`_tools/plant/synced.json` (content hashes and dates), so the site knows which version it holds.

`python3 _tools/site_sync.py status plant --src PAPER_REPO` lists each part (poster, slides, talk, page) as current or
changed and prints the resync command for what is behind.

The paper repositories ask by themselves. A Claude Code Stop hook in each one (in its `.claude/settings.local.json`,
which git ignores) runs `_tools/site_sync.py hook`. When a built file there is newer than the site's copy, Claude asks
you, before it finishes, whether to update debjyoti.org; each version is raised once, and a "no" waits for the next
change. The hook in the MISTILL paper repository watches top-level folders named like a poster, talk, slides, website
or project page; the first time one appears, the copy step for it is set up the same way as PLANT's.

To change what is watched, edit `PROJECTS` in `_tools/site_sync.py`. To stop the questions, delete the `hooks` block
from that repository's `.claude/settings.local.json`.
