#!/usr/bin/env python3
"""Consistency checks for debjyoti.org (standard-library Python 3, no install needed).

    python3 _tools/check_site.py            # from the repository root (or anywhere)
    python3 _tools/check_site.py --launch   # before the launch: PLACEHOLDER links and untracked files fail too

Exit code 0 when every check passes (warnings are allowed), 1 when at least one check fails.
The site has no build step, so the parts that are duplicated by hand are compared here:

  a. icon sprite, header, footer and the theme script in <head>: identical in the three pages
     (nav link targets, aria-current and the footer's links into the home page may differ)
  b. the figure blocks (PLANT, compact MISTILL without its tools row, full MISTILL): identical on both pages
  c. BibTeX: identical on both pages and on plant/index.html; the surname is "Saha Roy, Debjyoti"
  d. the link rule: links that leave the page (other sites, files, /plant/) open in a new tab with
     rel="noopener" and a screen-reader cue; links between the site's own pages stay in the tab
  e. local references (href, src, srcset, posters, CSS url(), manifest icons) exist, with exact case; with git, a
     reference that matches a tracked path only case-insensitively fails and an untracked one is reported
  f. no duplicate ids; every aria-labelledby, aria-describedby, aria-controls, data-dialog-open, data-goto and
     data-figure-clone points at an existing id
  g. forbidden strings: the address in plain text, plain mail links, and terms the owner has ruled out for the
     site (read from a local list that git ignores); PLACEHOLDER links are counted, not failed
  h. "Last updated" equal in the three footers and in the same month as the sitemap's <lastmod> (home and research)
     and the ProfilePage dateModified; the two dark-token blocks equal; every --c-* colour of the print block equal
     to the light tokens; the theme colour equal to --paper everywhere
  i. warnings for data-until dates that have passed
  j. each publication's text (venue, title, authors, summary, results, facts, abstract) identical on both pages
  k. every JSON-LD block parses; its ScholarlyArticle and SoftwareSourceCode nodes are equal on both pages
  l. tags balance on every page (the first mismatch is reported with its line)
  m. one ?v= token on every site CSS/JS reference of the three pages (bump it when site.css or a script changes);
     with git, a warning when site.css or a script changed since the last commit (or since the upstream branch, when
     there is one) while the token stayed the same
  n. a warning for each Markdown file (outside _* and .* folders and plant/) with a Liquid tag sequence, which
     GitHub Pages' Jekyll would try to run
"""
import datetime
import html
import json
import os
import re
import sys
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAUNCH = '--launch' in sys.argv[1:]
PAGES = ['index.html', 'research.html', '404.html']
OWN_PAGES = {'', 'index.html', 'research.html', '404.html'}
failures, warnings, passed = [], [], []


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return f.read()


def check(name, problems):
    """Record one check: a list of problem strings (empty means it passed)."""
    if problems:
        failures.extend(f'[{name}] {p}' for p in problems)
    else:
        passed.append(name)


def block(text, start, end, page, what):
    """The substring from `start` to the first `end` after it (inclusive), or None."""
    i = text.find(start)
    if i < 0:
        return None
    j = text.find(end, i)
    return text[i:j + len(end)] if j >= 0 else None


def dedent(s):
    return '\n'.join(line.strip() for line in s.strip().splitlines())


SRC = {p: read(p) for p in PAGES}

# ---- a. shared parts --------------------------------------------------------------------------------------
problems = []
SHARED = {
    'sprite': ('<svg class="visually-hidden" aria-hidden="true" focusable="false" width="0" height="0">', '</svg>'),
    'header': ('<header class="site-header">', '</header>'),
    'footer': ('<footer class="site-footer">', '</footer>'),
    'head script': ('<script>\n    (function () {', '</script>'),
}
for name, (start, end) in SHARED.items():
    seen = {}
    for p in PAGES:
        b = block(SRC[p], start, end, p, name)
        if b is None:
            problems.append(f'{p}: {name} not found')
            continue
        if name == 'header':   # nav targets and the current-page mark differ on purpose
            b = re.sub(r'href="[^"]*"', 'href=""', b).replace(' aria-current="page"', '')
        if name == 'footer':   # links into the home page are written per page (#contact, ./#contact, /#contact)
            b = re.sub(r'href="(?:\./|/)?(#[^"]*)"', r'href="\1"', b)
        seen[p] = dedent(b)
    if len(set(seen.values())) > 1:
        ref = seen.get('index.html')
        for p, v in seen.items():
            if v != ref:
                a, c = ref.splitlines(), v.splitlines()
                k = next((i for i in range(min(len(a), len(c))) if a[i] != c[i]), min(len(a), len(c)))
                problems.append(f'{name} differs between index.html and {p} (first difference at line {k + 1} of the block)')
check('a. shared sprite, header, footer, head script', problems)

# ---- b. figure blocks -------------------------------------------------------------------------------------
problems = []
FIGS = {
    'PLANT figure': '<figure class="fig" data-figure="plant">',
    'MISTILL compact figure': '<figure class="fig" data-figure="mistill" id="fig-mistill">',
    'MISTILL full figure': '<figure class="fig" data-figure="mistill-full">',
}
for name, start in FIGS.items():
    got = {}
    for p in ['index.html', 'research.html']:
        b = block(SRC[p], start, '</figure>', p, name)
        if b is None:
            problems.append(f'{p}: {name} not found')
            continue
        if 'compact' in name:   # its tools row differs on purpose (a dialog on the home page, an anchor on research)
            b = re.sub(r'<div class="fig__tools">.*?</div>', '', b, flags=re.S)
        got[p] = dedent(b)
    if len(got) == 2 and got['index.html'] != got['research.html']:
        problems.append(f'{name} differs between index.html and research.html')
check('b. figure blocks identical on both pages', problems)

# ---- c. BibTeX ----------------------------------------------------------------------------------------------
problems = []
bib = {}
for p in ['index.html', 'research.html', 'plant/index.html']:
    if not os.path.exists(os.path.join(ROOT, p)):
        problems.append(f'{p} missing')
        continue
    text = read(p)
    for m in re.finditer(r'<pre[^>]*>(?:<code>)?(@\w+\{([\w:-]+),.*?\n\})(?:</code>)?</pre>', text, re.S):
        entry, key = html.unescape(m.group(1)), m.group(2)
        bib.setdefault(key, {})[p] = entry
for key, by_page in bib.items():
    texts = set(by_page.values())
    if len(texts) > 1:
        problems.append(f'{key}: the entry differs between {", ".join(sorted(by_page))}')
    for p, entry in by_page.items():
        if 'Saha Roy, Debjyoti' not in entry:
            problems.append(f'{key} in {p}: author is not written "Saha Roy, Debjyoti"')
for key, pages in (('saharoy2026plant', {'index.html', 'research.html', 'plant/index.html'}), ('saharoy2026characterize', {'index.html', 'research.html'})):
    missing = pages - set(bib.get(key, {}))
    if missing:
        problems.append(f'{key}: not found in {", ".join(sorted(missing))}')
check('c. BibTeX identical everywhere, surname "Saha Roy, Debjyoti"', problems)


def git(*args):
    """Output of a git command run in the repository, or None if git is missing or the command fails."""
    import subprocess
    try:
        out = subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True, check=True)
        return out.stdout
    except (OSError, subprocess.CalledProcessError):
        return None


# ---- parse the pages once for d, e, f, j, l -----------------------------------------------------------------------
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}


class Node:
    def __init__(self, tag, attrs, parent, line):
        self.tag, self.attrs, self.parent, self.line, self.children = tag, attrs, parent, line, []

    def classes(self):
        return (self.attrs.get('class') or '').split()


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = {}
        self.text_by_id = {}
        self.refs = []      # (tag, attr, value, line)
        self.idrefs = []    # (attr, id, line)
        self.links = []
        self._a = None
        self._capture = []  # [id, text] of elements whose text we keep (aria-describedby targets)
        self.root = self.cur = Node('#root', {}, None, 0)
        self.mismatch = None   # the first unbalanced tag, for check l

    def handle_startendtag(self, tag, attrs):   # <x ... />: an element with no content
        self.handle_starttag(tag, attrs, closed=True)

    def handle_starttag(self, tag, attrs, closed=False):
        a = dict(attrs)
        line = self.getpos()[0]
        node = Node(tag, a, self.cur, line)
        self.cur.children.append(node)
        if not closed and tag not in VOID:
            self.cur = node
        if a.get('id'):
            self.ids.setdefault(a['id'], []).append(line)
            self._capture.append([a['id'], '', tag])
        for attr in ('href', 'src', 'poster', 'data-poster'):
            if a.get(attr):
                self.refs.append((tag, attr, a[attr], line))
        for attr in ('srcset', 'imagesrcset'):
            if a.get(attr):
                for part in a[attr].split(','):
                    if part.strip():
                        self.refs.append((tag, attr, part.strip().split()[0], line))
        for attr in ('aria-labelledby', 'aria-describedby', 'aria-controls'):
            for ref in (a.get(attr) or '').split():
                self.idrefs.append((attr, ref, line))
        for attr in ('data-dialog-open', 'data-goto', 'data-figure-clone'):
            if a.get(attr):
                self.idrefs.append((attr, a[attr], line))
        if tag == 'a':
            self._a = {'href': a.get('href'), 'target': a.get('target'), 'rel': a.get('rel') or '',
                       'label': a.get('aria-label') or '', 'describedby': a.get('aria-describedby') or '',
                       'line': line, 'text': ''}

    def handle_endtag(self, tag):
        if tag not in VOID:
            if self.cur.tag == tag:
                self.cur = self.cur.parent
            else:
                if self.mismatch is None:
                    self.mismatch = f'line {self.getpos()[0]}: </{tag}> closes <{self.cur.tag}> opened at line {self.cur.line}'
                n = self.cur
                while n is not self.root and n.tag != tag:
                    n = n.parent
                if n is not self.root:
                    self.cur = n.parent
        if tag == 'a' and self._a is not None:
            self.links.append(self._a)
            self._a = None
        for c in self._capture:
            if c[2] == tag:
                self.text_by_id[c[0]] = c[1]
                self._capture.remove(c)
                break

    def handle_data(self, data):
        self.cur.children.append(data)
        if self._a is not None:
            self._a['text'] += data
        for c in self._capture:
            c[1] += data


parsed = {}
for p in PAGES:
    pg = Page()
    pg.feed(SRC[p])
    pg.close()
    if pg.mismatch is None and pg.cur is not pg.root:
        pg.mismatch = f'<{pg.cur.tag}> opened at line {pg.cur.line} is never closed'
    parsed[p] = pg


def walk(node):
    for c in node.children:
        if isinstance(c, Node):
            yield c
            yield from walk(c)


def node_text(node, skip=lambda n: False):
    return ''.join(c if isinstance(c, str) else ('' if skip(c) else node_text(c, skip)) for c in node.children)


def norm(t):
    return ' '.join(t.split())

# ---- d. the link rule -------------------------------------------------------------------------------------------
problems = []
CUE = 'opens in a new tab'
for p, pg in parsed.items():
    for L in pg.links:
        href = L['href']
        if href is None:
            continue
        if href in ('#', '') or href.lower().startswith('javascript:'):
            problems.append(f'{p}:{L["line"]}: empty or script link "{href}"')
            continue
        u = urlsplit(href)
        path = unquote(u.path)
        external = u.scheme in ('http', 'https')
        rel_path = path.lstrip('/')
        into_plant = not external and (rel_path == 'plant' or rel_path.startswith('plant/'))
        is_file = not external and bool(re.search(r'\.(pdf|mp4|vtt|zip|png|jpe?g|webp|svg|gif|pptx|key|bib|txt|csv|docx)$', rel_path, re.I))
        leaves = external or into_plant or is_file
        own = not leaves and not u.scheme and (rel_path in OWN_PAGES or rel_path in ('.', './') or path in ('./', '/'))
        described = ' '.join(pg.text_by_id.get(i, '') for i in L['describedby'].split())
        has_cue = CUE in (L['text'] + ' ' + L['label'] + ' ' + described).lower()
        if leaves:
            if L['target'] != '_blank':
                problems.append(f'{p}:{L["line"]}: "{href}" leaves the page but does not open in a new tab')
            if 'noopener' not in L['rel'].split():
                problems.append(f'{p}:{L["line"]}: "{href}" opens a new tab without rel="noopener"')
            if not has_cue:
                problems.append(f'{p}:{L["line"]}: "{href}" opens a new tab without the "(opens in a new tab)" cue')
        elif own and L['target'] == '_blank':
            problems.append(f'{p}:{L["line"]}: "{href}" is one of the site\'s own pages but opens in a new tab')
check('d. link rule (new tab + noopener + cue; own pages in the same tab)', problems)

# ---- e. local references, with exact case ---------------------------------------------------------------------


def exists_exact(rel):
    parts = [x for x in rel.split('/') if x not in ('', '.')]
    cur = ROOT
    for x in parts:
        if x == '..':
            cur = os.path.dirname(cur)
            continue
        try:
            names = os.listdir(cur)
        except (NotADirectoryError, FileNotFoundError):
            return False
        if x not in names:
            return False
        cur = os.path.join(cur, x)
    if os.path.isdir(cur):
        return 'index.html' in os.listdir(cur)
    return True


def local(page_dir, ref):
    u = urlsplit(ref)
    if u.scheme or ref.startswith('//') or not u.path:
        return None
    path = unquote(u.path)
    return path.lstrip('/') if path.startswith('/') else os.path.normpath(os.path.join(page_dir, path)).replace(os.sep, '/')


problems = []
for p, pg in parsed.items():
    for tag, attr, val, line in pg.refs:
        rel = local('', val)
        if rel is None:
            continue
        if not exists_exact(rel):
            problems.append(f'{p}:{line}: <{tag} {attr}="{val}"> does not exist (exact case)')
css = read('assets/css/site.css')
for m in re.finditer(r'url\("?(?!data:)([^")]+)"?\)', css):
    rel = local('assets/css', m.group(1))
    if rel and not exists_exact(rel):
        problems.append(f'assets/css/site.css: url({m.group(1)}) does not exist (exact case)')
manifest = json.loads(read('site.webmanifest'))
for icon in manifest.get('icons', []):
    rel = local('', icon['src'])
    if rel and not exists_exact(rel):
        problems.append(f'site.webmanifest: icon {icon["src"]} does not exist (exact case)')
# With git: the live site serves what is committed, with exact case (GitHub Pages is case-sensitive).
tracked_out = git('ls-files', '-c', '-z') if os.path.isdir(os.path.join(ROOT, '.git')) else None
if tracked_out is not None:
    tracked = set(x for x in tracked_out.split('\0') if x)
    lower = {}
    for t in tracked:
        lower.setdefault(t.lower(), t)
    refs = set()
    for p, pg in parsed.items():
        for tag, attr, val, line in pg.refs:
            rel = local('', val)
            if rel is not None:
                refs.add((p, line, rel))
    untracked = set()
    for p, line, rel in sorted(refs):
        target = rel + '/index.html' if os.path.isdir(os.path.join(ROOT, rel)) and rel not in ('', '.') else ('index.html' if rel in ('', '.') else rel)
        if target in tracked or not os.path.exists(os.path.join(ROOT, target)):
            continue
        if target.lower() in lower:
            problems.append(f'{p}:{line}: "{rel}" matches the tracked "{lower[target.lower()]}" only in another case')
        else:
            untracked.add(target)
    if untracked:
        msg = f'{len(untracked)} referenced file(s) are not committed yet (e.g. {", ".join(sorted(untracked)[:3])}): git add them'
        (problems if LAUNCH else warnings).append(msg if LAUNCH else '[e] ' + msg)
check('e. local references resolve (exact case)', problems)

# ---- f. ids and the references to them --------------------------------------------------------------------------
problems = []
for p, pg in parsed.items():
    for i, lines in pg.ids.items():
        if len(lines) > 1:
            problems.append(f'{p}: duplicate id "{i}" (lines {", ".join(map(str, lines))})')
    for attr, ref, line in pg.idrefs:
        if ref not in pg.ids:
            problems.append(f'{p}:{line}: {attr}="{ref}" points at no element')
    for L in pg.links:   # in-page anchors, and anchors into the home page
        href = L['href'] or ''
        u = urlsplit(href)
        if not u.fragment or u.scheme:
            continue
        path = unquote(u.path).lstrip('/')
        target = p if path == '' and not u.path else ('index.html' if path in ('', '.', './', 'index.html') else path)
        if target in parsed and u.fragment not in parsed[target].ids:
            problems.append(f'{p}:{L["line"]}: "{href}" points at no element in {target}')
check('f. unique ids; aria-* and data-* references resolve', problems)

# ---- g. forbidden strings ---------------------------------------------------------------------------------------
# The terms the owner has ruled out are kept in a local list that git ignores (one case-insensitive regular
# expression per line; blank lines and lines starting with # are skipped). SITE_TERMS_FILE may point at another
# copy of the list.
problems = []
user, host = 'saharoy' + '.d', 'north' + 'eastern'
plain_address = re.compile(re.escape(user) + r'\s*@|@\s*' + re.escape(host), re.I)
plain_mail_link = 'mail' + 'to:'
HAS_GIT = os.path.isdir(os.path.join(ROOT, '.git'))


TEXT_EXT = ('.html', '.css', '.js', '.mjs', '.py', '.sh', '.md', '.txt', '.xml', '.json', '.webmanifest', '.svg', '.yml', '.yaml')


def repo_text_files():
    """Every text file of the repository outside plant/ (tracked or untracked, not ignored), *.local.txt excluded."""
    listed = git('ls-files', '-co', '--exclude-standard', '-z') if HAS_GIT else None
    if listed is not None:
        paths = [x for x in listed.split('\0') if x]
    else:
        paths = []
        for d, dirs, files in os.walk(ROOT):
            dirs[:] = [x for x in dirs if x not in ('.git', 'plant', 'node_modules', '.claude', '.vscode')]
            paths += [os.path.relpath(os.path.join(d, f), ROOT).replace(os.sep, '/') for f in files]
    for rel in sorted(set(paths)):
        name = rel.rsplit('/', 1)[-1]
        if rel.startswith('plant/') or rel.startswith('.git/') or name.endswith('.local.txt'):
            continue
        if not (name.lower().endswith(TEXT_EXT) or name.startswith('.')):
            continue
        if os.path.isfile(os.path.join(ROOT, rel)):   # a deleted file can still be in the index
            yield rel


terms_file = os.environ.get('SITE_TERMS_FILE') or os.path.join(ROOT, '_tools', 'terms.local.txt')
terms = []
if os.path.isfile(terms_file):
    with open(terms_file, encoding='utf-8') as f:
        for raw in f:
            line = raw.strip()
            if line and not line.startswith('#'):
                terms.append(re.compile(line, re.I))
else:
    warnings.append('[g] the local list of ruled-out terms was not found; that part of check g was skipped')
if HAS_GIT and (git('ls-files', '--', '_tools/*.local.txt') or '').strip():
    problems.append('the local term list is tracked by git; remove it with git rm --cached')
for rel in repo_text_files() if terms else []:
    try:
        text = read(rel)
    except UnicodeDecodeError:
        continue
    for k, rx in enumerate(terms, 1):
        for m in rx.finditer(text):   # the message never repeats the matched text
            problems.append(f'{rel}:{text.count(chr(10), 0, m.start()) + 1}: a term ruled out for the site (line {k} of the local list)')
for p in PAGES:
    if plain_address.search(SRC[p]):
        problems.append(f'{p}: the email address appears in plain text')
    if plain_mail_link in SRC[p].lower():
        problems.append(f'{p}: a plain mail link appears in the HTML')
placeholders = sum(len(re.findall(r'href="[^"]*PLACEHOLDER', SRC[p])) for p in PAGES)
if placeholders and LAUNCH:
    problems.append(f'{placeholders} PLACEHOLDER link(s): put in the handles or delete those rows before the launch')
elif placeholders:
    warnings.append(f'[g] {placeholders} PLACEHOLDER link(s) (the Facebook and Instagram handles are still to come)')
check('g. forbidden strings', problems)

# ---- h. dates, dark tokens, theme colour ------------------------------------------------------------------------
problems = []
updated = {}
for p in PAGES:
    m = re.search(r'Last updated <time datetime="([^"]+)">([^<]+)</time>', SRC[p])
    updated[p] = m.groups() if m else None
if len(set(updated.values())) != 1 or None in updated.values():
    problems.append('"Last updated" differs or is missing: ' + ', '.join(f'{p} {v}' for p, v in updated.items()))
else:
    month = updated['index.html'][0][:7]
    sitemap = read('sitemap.xml')
    for loc in ('https://debjyoti.org/', 'https://debjyoti.org/research.html'):
        m = re.search(r'<loc>' + re.escape(loc) + r'</loc>\s*<lastmod>(\d{4}-\d{2})', sitemap)
        if not m or m.group(1) != month:
            problems.append(f'sitemap.xml: <lastmod> of {loc} is {m.group(1) if m else "missing"}, the footers say {month}')
    m = re.search(r'"@type": "ProfilePage".*?"dateModified": "(\d{4}-\d{2})', SRC['index.html'], re.S)
    if not m or m.group(1) != month:
        problems.append(f'index.html: the ProfilePage dateModified is {m.group(1) if m else "missing"}, the footers say {month}')


def decls(body):
    body = re.sub(r'/\*.*?\*/', '', body, flags=re.S)
    return sorted(d.strip() for d in body.split(';') if d.strip())


m1 = re.search(r'@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\) \{(.*?)\}\s*\}', css, re.S)
m2 = re.search(r'\n:root\[data-theme="dark"\] \{(.*?)\}', css, re.S)
if not (m1 and m2):
    problems.append('could not find the two dark-token blocks in site.css')
elif decls(m1.group(1)) != decls(m2.group(1)):
    only1 = set(decls(m1.group(1))) - set(decls(m2.group(1)))
    only2 = set(decls(m2.group(1))) - set(decls(m1.group(1)))
    problems.append(f'the two dark-token blocks differ: {sorted(only1)} vs {sorted(only2)}')
# The print block (section 18) repeats the light theme's --c-* colours: each one must equal the first :root block's.
light_block = re.search(r'\n:root \{(.*?)\n\}', css, re.S)
print_block = re.search(r'@media print \{\s*:root, :root\[data-theme\], :root:not\(\[data-theme="light"\]\) \{(.*?)\}', css, re.S)
if not (light_block and print_block):
    problems.append('could not find the light-token block or the print-token block in site.css')
else:
    light_tokens = dict(d.split(':', 1) for d in decls(light_block.group(1)) if ':' in d)
    for d in decls(print_block.group(1)):
        name, _, value = (x.strip() for x in d.partition(':'))
        if name.startswith('--c-') and value.upper() != light_tokens.get(name, '').strip().upper():
            problems.append(f'site.css print block: {name} is {value}, but the light tokens say {light_tokens.get(name, "nothing").strip()}')
paper_light = re.search(r':root \{.*?--paper: (#[0-9A-Fa-f]{6});', css, re.S)
paper_dark = re.search(r':root\[data-theme="dark"\] \{.*?--paper: (#[0-9A-Fa-f]{6});', css, re.S)
light, dark = (paper_light.group(1).upper() if paper_light else None), (paper_dark.group(1).upper() if paper_dark else None)
js = read('assets/js/site.js')
tc = re.search(r"THEME_COLOR = \{ light: '(#\w+)', dark: '(#\w+)' \}", js)
if not tc or (tc.group(1).upper(), tc.group(2).upper()) != (light, dark):
    problems.append(f'THEME_COLOR in site.js {tc.groups() if tc else None} differs from --paper ({light}, {dark})')
for p in PAGES:
    metas = dict((media, c.upper()) for c, media in re.findall(r'<meta name="theme-color" content="(#\w+)" media="\(prefers-color-scheme: (\w+)\)">', SRC[p]))
    if metas != {'light': light, 'dark': dark}:
        problems.append(f'{p}: theme-color metas {metas} differ from --paper ({light}, {dark})')
    boot = re.search(r"t === 'dark' \? '(#\w+)' : '(#\w+)'", SRC[p])
    if not boot or (boot.group(2).upper(), boot.group(1).upper()) != (light, dark):
        problems.append(f'{p}: the theme script in <head> sets {boot.groups() if boot else None}, not --paper ({light}, {dark})')
for k in ('theme_color', 'background_color'):
    if manifest.get(k, '').upper() != light:
        problems.append(f'site.webmanifest: {k} {manifest.get(k)} differs from --paper ({light})')
check('h. "Last updated", dark and print tokens, theme colour', problems)

# ---- i. dates that have passed ----------------------------------------------------------------------------------
today = datetime.date.today()
for p in PAGES:
    for m in re.finditer(r'data-until="(\d{4})-(\d{2})-(\d{2})"', SRC[p]):
        until = datetime.date(*map(int, m.groups()))
        if until <= today:
            line = SRC[p].count('\n', 0, m.start()) + 1
            warnings.append(f'[i] {p}:{line}: data-until {until} has passed: reword the item and remove the Upcoming parts')

# ---- j. publication text identical on both pages ---------------------------------------------------------------
problems = []


def pub_texts(pg):
    out = {}
    for art in walk(pg.root):
        if art.tag != 'article' or 'pub' not in art.classes() or not art.attrs.get('id'):
            continue
        nodes = list(walk(art))
        first = lambda cls: next((n for n in nodes if cls in n.classes()), None)
        f = {}
        for cls in ('pub__venue', 'pub__title', 'pub__tldr', 'pub__limit', 'pub__facts'):
            n = first(cls)
            f[cls] = norm(node_text(n)) if n else None
        n = first('pub__authors')
        f['pub__authors'] = norm(node_text(n, skip=lambda c: 'muted' in c.classes())) if n else None
        n = first('results')
        for k, li in enumerate([x for x in walk(n) if x.tag == 'li'] if n else []):
            f[f'result {k + 1}'] = norm(node_text(li))
        box = next((x for x in nodes if 'pub__abstract' in x.classes() or (x.attrs.get('id') or '').endswith('-abstract')), None)
        para = next((x for x in walk(box) if x.tag == 'p'), None) if box else None
        f['abstract'] = norm(node_text(para)) if para else None
        out[art.attrs['id']] = f
    return out


home, full = pub_texts(parsed['index.html']), pub_texts(parsed['research.html'])
for pid in sorted(set(home) | set(full)):
    if pid not in home or pid not in full:
        problems.append(f'article #{pid} is on {"index.html" if pid in home else "research.html"} only')
        continue
    for field in sorted(set(home[pid]) | set(full[pid])):
        if home[pid].get(field) != full[pid].get(field):
            problems.append(f'#{pid}: {field} differs between index.html and research.html')
check('j. publication text identical on both pages', problems)

# ---- k. JSON-LD -------------------------------------------------------------------------------------------------
problems = []
ld = {}
for p in PAGES:
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', SRC[p], re.S):
        line = SRC[p].count('\n', 0, m.start()) + 1
        try:
            data = json.loads(m.group(1))
        except json.JSONDecodeError as err:
            problems.append(f'{p}:{line + err.lineno - 1}: JSON-LD does not parse ({err.msg})')
            continue
        for node in data.get('@graph', [data]):
            if node.get('@type') in ('ScholarlyArticle', 'SoftwareSourceCode'):
                ld.setdefault(node.get('@id'), {})[p] = node
for nid, by_page in sorted(ld.items(), key=lambda x: str(x[0])):
    if set(by_page) != {'index.html', 'research.html'}:
        problems.append(f'JSON-LD {nid}: only on {", ".join(sorted(by_page))}')
    elif by_page['index.html'] != by_page['research.html']:
        problems.append(f'JSON-LD {nid}: differs between index.html and research.html')
check('k. JSON-LD parses; papers and code equal on both pages', problems)

# ---- l. tag balance ---------------------------------------------------------------------------------------------
check('l. tags balance', [f'{p}: {pg.mismatch}' for p, pg in parsed.items() if pg.mismatch])

# ---- m. one version token ---------------------------------------------------------------------------------------
problems = []
tokens = {}
for p in PAGES:
    for m in re.finditer(r'(?:href|src)="/?(assets/(?:css/site\.css|js/(?:site|field|figures)\.js))(?:\?v=([^"&]*))?"', SRC[p]):
        if not m.group(2):
            problems.append(f'{p}: {m.group(1)} has no ?v= token')
        else:
            tokens.setdefault(m.group(2), []).append(f'{p} {m.group(1)}')
if len(tokens) > 1:
    problems.append('more than one ?v= token: ' + '; '.join(f'{t} ({len(v)}x, e.g. {v[0]})' for t, v in tokens.items()))
check('m. one ?v= token on every site CSS/JS reference', problems)
# With git: compare with the upstream branch when there is one (so committed but unpushed edits count too), else
# with the last commit. Skipped when that version of index.html has no token (the site before the redesign).
if HAS_GIT and len(tokens) == 1:
    upstream = git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}')
    base = upstream.strip() if upstream and upstream.strip() else 'HEAD'
    old = git('show', f'{base}:index.html')
    old_tokens = set(re.findall(r'assets/(?:css/site\.css|js/(?:site|field|figures)\.js)\?v=([^"&]*)"', old or ''))
    changed = (git('diff', '--name-only', base, '--', 'assets/css', 'assets/js') or '').strip()
    added = (git('ls-files', '--others', '--exclude-standard', '--', 'assets/css', 'assets/js') or '').strip()
    if old_tokens and (changed or added) and next(iter(tokens)) in old_tokens:
        warnings.append(f'[m] site.css or a script changed since {base} but ?v= did not: bump it on all three pages')

# ---- n. Liquid in Markdown --------------------------------------------------------------------------------------
for rel in repo_text_files():
    parts = rel.split('/')
    if not rel.endswith('.md') or any(x.startswith(('_', '.')) for x in parts[:-1]):
        continue
    text = read(rel)
    for m in re.finditer(r'\{[{%]', text):
        warnings.append(f'[n] {rel}:{text.count(chr(10), 0, m.start()) + 1}: a Liquid tag sequence; GitHub Pages runs Jekyll over Markdown, so write it another way')

# ---- report -----------------------------------------------------------------------------------------------------
for name in passed:
    print(f'ok    {name}')
for w in warnings:
    print(f'warn  {w}')
for f in failures:
    print(f'FAIL  {f}')
print(f'\n{len(passed)} checks passed, {len(failures)} problem(s), {len(warnings)} warning(s).')
sys.exit(1 if failures else 0)
