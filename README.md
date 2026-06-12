# Debjyoti Saha Roy — Academic Portfolio

> Personal academic website for Debjyoti Saha Roy, PhD Candidate at  
> Khoury College of Computer Sciences, Northeastern University.

🌐 **Live:** [deb-official.github.io](https://deb-official.github.io)

---

## Table of Contents

1. [Stack](#stack)
2. [Project Structure](#project-structure)
3. [Architecture Overview](#architecture-overview)
4. [CSS System](#css-system-sitecss)
5. [JavaScript Files](#javascript-files)
6. [Components](#components)
7. [Publications System](#publications-system)
8. [Adding a New Publication](#adding-a-new-publication)
9. [Adding a New Page](#adding-a-new-page)
10. [Navbar Active Link System](#navbar-active-link-system)
11. [Local Development](#local-development)
12. [Deployment](#deployment)

---

## Stack

| Layer | Technology | How it is loaded |
|---|---|---|
| Markup | HTML5 | Static files |
| Styling | CSS + Tailwind CSS | Tailwind via CDN, custom via `site.css` |
| Icons | Font Awesome 6.6 | CDN |
| Fonts | Google Fonts | CDN — Fraunces (display) + Inter (body) |
| JavaScript | Vanilla ES6 | Static `.js` files, no bundler |
| Hosting | GitHub Pages | Auto-deploy from `main` branch root |

No build step. No framework. No package.json. Everything runs as static files.

---

## Project Structure

```
.
├── index.html                        # Home page
├── research.html                     # Publications & research areas
├── README.md
│
├── assets/
│   ├── css/
│   │   └── site.css                  # Single shared stylesheet for all pages
│   │
│   ├── js/
│   │   ├── publications.js           # Publications registry + card loader
│   │   ├── modals.js                 # Abstract / diagram / citation modal logic
│   │   ├── main.js                   # Shared JS utilities
│   │   └── site.js                   # Page-specific utilities (initEmailCanvas)
│   │
│   └── images/
│       ├── profile.jpg               # Hero profile photo — front face of coin flip
│       ├── profile-alt.jpeg          # Hero profile photo — back face of coin flip
│       ├── hero-bg.jpg               # Hero section background image
│       └── pub-images/               # Per-paper figures and PDFs
│           ├── plant_main_diag.pdf
│           ├── stamp_phase1_diag.pdf
│           └── stamp_phase2_diag.pdf
│
└── components/
    ├── navbar.html                   # Shared navigation bar (fetched via JS)
    ├── footer.html                   # Shared footer (fetched via JS)
    ├── modals.html                   # Modal HTML templates (fetched via JS)
    └── publications/
        ├── pub-1.html                # Publication card — PLANT paper
        └── pub-2.html                # Publication card — STAMP paper
```

---

## Architecture Overview

This site uses a **component injection** pattern. Rather than duplicating
navbar/footer HTML on every page, each page fetches them at runtime via
`fetch()` and injects the HTML into placeholder divs:

```html
<!-- Every page has these three placeholders -->
<div id="navbar"></div>
  ...page content...
<div id="footer"></div>
<div id="modals-container"></div>

<script>
  fetch('components/navbar.html')
    .then(r => r.text())
    .then(d => { document.getElementById('navbar').innerHTML = d; });
</script>
```

> **Important:** This means the site must be served over HTTP even locally.
> Opening `index.html` as a `file://` URL will silently break all components.
> See [Local Development](#local-development).

---

## CSS System (`site.css`)

`assets/css/site.css` is the single source of truth for all styling.
It is divided into 13 numbered sections. Search by section number to navigate:

| # | Section | What it covers |
|---|---------|----------------|
| 1 | Design tokens | All CSS variables — accent colours, surfaces, text, borders |
| 2 | Reset & base | `box-sizing`, `body` font, background, margin |
| 3 | Typography utilities | `.section-eyebrow`, `.section-title`, `.section-header-rule`, `.view-all-link` |
| 4 | Buttons | `.btn-solid` (filled blue), `.btn-ghost` (outlined, for dark backgrounds) |
| 5 | Hero section | `.hero-section`, `.hero-dots`, `.orb-*`, `@keyframes drift`, `.hero-seam` |
| 6 | Profile ring | `.profile-wrap`, `.ring-spinner`, `.ring-gap`, coin-flip images and animation |
| 7 | Hero content | `.hero-name`, `.hero-tagline`, `.affil-tag`, `.affil-dot`, `.social-icon`, `.tagline-box` |
| 8 | Scroll hint | `.scroll-hint`, `.scroll-hint-line`, `.scroll-hint-text` |
| 9 | Page section layouts | `.page-section`, `.pubs-section` |
| 10 | Entrance animations | `.fade-up`, `.hero-curtain`, `.hero-blur-in`, `.hero-scale-in`, `.hero-icon-pop`, `.d1`–`.d12` |
| 11 | Navbar | `.nav-link` base styles + per-page active highlight selectors |
| 12 | Inner page header | `.page-header`, `.page-header-title`, `.page-header-eyebrow`, `.page-header-sub` |
| 13 | Keyword chips | `.chip` (dark bg), `.chip-light` (light bg), `.chip-row` |

### Page-specific overrides

Add a `<style>` block **after** the `site.css` link on any page.
The cascade ensures page-level styles always win:

```html
<link rel="stylesheet" href="assets/css/site.css">
<style>
  /* Only applies to this page */
  .hero-section {
    background-image: linear-gradient(...), url('assets/images/hero-bg.jpg');
    background-size: cover;
    background-attachment: fixed;
  }
</style>
```

### Design tokens

All colours and surfaces are CSS variables in Section 1.
Change a token once to update the whole site:

```css
:root {
  --accent-blue:   #4a8fe8;
  --accent-violet: #7c6ff7;
  --accent-teal:   #38bdf8;
  --hero-bg:       #06070d;
  --body-bg:       #f4f3ef;
  --text-dark:     #0d1117;
  --text-muted:    #64748b;
  --border-light:  rgba(0, 0, 0, 0.08);
}
```

### Required `<head>` boilerplate (copy to every new page)

```html
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap"
      rel="stylesheet">
<link rel="stylesheet" href="assets/css/site.css">
```

---

## JavaScript Files

### `publications.js`

Central registry and loader for all publication cards.

- Defines a `PUBLICATIONS` array — each entry is a path to a
  `components/publications/pub-N.html` snippet.
- Defines `RECENT_COUNT` — how many cards to show on the home page.
- Exports `loadPublications(containerId, count?)`:

```js
// Load all publications (research.html)
loadPublications('publications-container');

// Load only the N most recent (index.html)
loadPublications('recent-publications-container', RECENT_COUNT);
```

### `modals.js`

Handles three modal types, all triggered via `onclick` on publication card buttons:

| Function | What it shows |
|---|---|
| `showAbstractModal(htmlString)` | Abstract with typewriter reveal effect |
| `showDiagramModal(slidesArray)` | Multi-slide PDF/image viewer with prev/next navigation |
| `showCitationModal(bibtexString)` | Formatted BibTeX in a copyable code block |

### `site.js`

Page-level utilities. Currently contains:

- `initEmailCanvas()` — renders the contact email on an HTML5 canvas in the
  footer to prevent bot scraping. Must be called **after** the footer component
  is injected into the DOM:

```js
fetch('components/footer.html')
  .then(r => r.text())
  .then(d => {
    document.getElementById('footer').innerHTML = d;
    initEmailCanvas();   // <-- after injection, not before
  });
```

### `main.js`

Shared utilities available on all pages. Extend this for any logic that does
not belong in the other three files.

---

## Components

Components are plain HTML fragments with no `<html>`, `<head>`, or `<body>`
tags. They are fetched and injected by every page at runtime.

### `navbar.html`

Sticky top navigation. Each link has two classes: the shared `.nav-link` and
a page-specific class used for active highlighting:

```html
<a href="index.html"    class="nav-link nav-home">Home</a>
<a href="#"             class="nav-link nav-about">About</a>
<a href="research.html" class="nav-link nav-research">Research</a>
<a href="#"             class="nav-link nav-cv">CV</a>
```

### `footer.html`

Site footer with an email canvas placeholder populated by `initEmailCanvas()`.

### `modals.html`

HTML structure for all three modal dialogs. Must be injected before any modal
trigger button is clicked — fetch it early in the page's script block.

---

## Publications System

Each publication is a self-contained HTML snippet at
`components/publications/pub-N.html`.

### Card structure

```
Row 1 │ [Venue badge]  [Status badge]  [Topic badge]          [Year]
Row 2 │ Paper title
      │ Subtitle (italic, muted)
Row 3 │ Author 1 (bold, green)  ·  Author 2  ·  Author 3
Row 4 │ Abstract preview (2-line clamp)
Row 5 │ [Abstract] [Diagram] [arXiv] [Cite] [Code] [Slides]
```

### Badge colour guide

| Badge | Tailwind classes to use |
|---|---|
| Venue (conference / journal) | `bg-blue-50 text-blue-800 border border-blue-200` |
| Preprint | `bg-amber-50 text-amber-800 border border-amber-200` |
| Published | `bg-green-50 text-green-800 border border-green-200` |
| Topic / research area | `bg-violet-50 text-violet-700 border border-violet-200` |

### Action button rule

Always use `href="javascript:void(0)"` on modal-trigger buttons — **never**
`href="#"`. Using `#` causes the page to scroll to the top when the modal
closes, which is disorienting on pages with a tall hero section.

```html
<a href="javascript:void(0)"
   onclick="showAbstractModal(this.dataset.abstract)"
   data-abstract="Full abstract here..."
   class="inline-flex items-center gap-1.5 text-xs text-zinc-500 border border-zinc-200
          px-3 py-1.5 rounded-lg hover:text-blue-600 hover:border-blue-300
          hover:bg-blue-50 transition-all">
  <i class="fa-regular fa-file-lines text-[12px]"></i> Abstract
</a>
```

---

## Adding a New Publication

1. **Create the card snippet**  
   Copy `components/publications/pub-1.html` to `pub-N.html`. Update:
   - Badges and year in Row 1
   - Title and subtitle in Row 2
   - Author names and profile links in Row 3
   - Abstract preview text in Row 4
   - `data-abstract`, `data-citation`, diagram slide array, and all `href`
     values in Row 5

2. **Add figures or PDFs**  
   Drop them into `assets/images/pub-images/` and reference the path inside
   the `showDiagramModal([...])` call on the card.

3. **Register in `publications.js`**  
   Add an entry to the `PUBLICATIONS` array. Cards render in array order —
   put the newest paper first.

---

## Adding a New Page

1. **Copy the `<head>` boilerplate** from `research.html`.

2. **Set a unique body class:**
   ```html
   <body class="about-page">
   ```

3. **Register the active nav highlight** in `site.css` Section 11:
   ```css
   .about-page .nav-about { color: #3b82f6; font-weight: 600; }
   ```

4. **Use the inner page header** (matches the dark hero aesthetic):
   ```html
   <header class="page-header">
     <div class="hero-dots"></div>
     <div class="orb orb-1"></div>
     <div class="orb orb-2"></div>
     <div class="page-header-content fade-up d1">
       <p class="page-header-eyebrow">Section label</p>
       <h1 class="page-header-title">Page Title</h1>
       <p class="page-header-sub">Optional subtitle.</p>
     </div>
   </header>
   <div class="hero-seam"></div>
   ```

5. **Fetch shared components** at the bottom of the page:
   ```js
   fetch('components/navbar.html')
     .then(r => r.text())
     .then(d => { document.getElementById('navbar').innerHTML = d; });

   fetch('components/footer.html')
     .then(r => r.text())
     .then(d => {
       document.getElementById('footer').innerHTML = d;
       initEmailCanvas();
     });

   fetch('components/modals.html')
     .then(r => r.text())
     .then(html => { document.getElementById('modals-container').innerHTML = html; });
   ```

---

## Navbar Active Link System

The navbar lives in one file (`components/navbar.html`) shared by every page.
Active highlighting is driven by CSS descendant selectors that combine the
page body class with the link class — only the matching link gets blue:

```css
/* site.css Section 11 */
.home-page     .nav-home     { color: #3b82f6; font-weight: 600; }
.about-page    .nav-about    { color: #3b82f6; font-weight: 600; }
.research-page .nav-research { color: #3b82f6; font-weight: 600; }
.cv-page       .nav-cv       { color: #3b82f6; font-weight: 600; }
```

Adding a nav item = one line in `navbar.html` + one line in `site.css` +
one body class on the new page. Nothing else to change.

---

## Local Development

No install or build step required:

```bash
# Python — built in, nothing to install
python -m http.server 8000

# Node — runs without a global install
npx serve .

# VS Code
# Install the "Live Server" extension
# Right-click index.html → Open with Live Server
```

Open `http://localhost:8000` in your browser.

> ⚠️ **Never open HTML files directly via `file://`.**  
> The `fetch()` calls for navbar, footer, modals, and publication snippets
> all fail with CORS errors when opened as local files. A local HTTP server
> is required even for the smallest edits.

---

## Deployment

Hosted on **GitHub Pages**, deployed automatically from the `main` branch
root. No CI pipeline, no build step.

### First-time GitHub Pages setup (one time only)

1. Go to **Settings → Pages** in the repo
2. Source → **Deploy from a branch**
3. Branch: `main` / folder: `/ (root)`
4. Click **Save**

For a `*.github.io` repo this is usually already enabled by default.

### Pushing an update

```bash
git add .
git commit -m "brief description of what changed"
git push origin main
```

The site updates at [deb-official.github.io](https://deb-official.github.io)
within ~60 seconds. Watch progress under the repo **Actions** tab.

---

*Last updated: 2025*