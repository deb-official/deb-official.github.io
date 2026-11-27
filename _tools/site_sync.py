#!/usr/bin/env python3
"""Keep debjyoti.org in step with the paper repositories.

Posters, slides, talks and project pages are built in the paper repositories and copied into
this site by a resync script (_tools/plant/resync_plant.sh for PLANT). This script tells when
something built there has changed since it was last copied here, and can ask about it from a
Claude Code session in the paper repository.

    python3 _tools/site_sync.py status PROJECT --src PAPER_REPO
    python3 _tools/site_sync.py mark   PROJECT --src PAPER_REPO PART [PART ...]
    python3 _tools/site_sync.py hook   PROJECT --src PAPER_REPO [--note FILE]

status  each part (for PLANT: poster, slides, talk, page) is "current" or "changed"; other
        top-level folders whose names look like talk material (poster, talk, slides, website,
        project) are listed too.
mark    records parts as copied. The resync script calls it after each copy into this repo.
hook    for a Claude Code Stop hook in the paper repository (its .claude/settings.local.json,
        which git ignores). When a part or a watched folder has changed and this version has not
        been raised yet, it keeps Claude from finishing and tells it to ask the owner whether to
        update the site. Each version is raised once; the first run only notes what exists.

What was copied is recorded here in _tools/PROJECT/synced.json (content hashes and dates only).
Which versions were raised is kept in the paper repository's git folder and never committed.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
WATCH = re.compile(r'poster|talk|slides?|website|project', re.I)
SKIP_DIRS = {'.git', '__pycache__', 'node_modules'}
SKIP_FILES = {'.DS_Store'}

PROJECTS = {
    'plant': {
        'name': 'PLANT',
        'resync': '_tools/plant/resync_plant.sh',
        'parts': {
            'poster': {'files': ['neurips-poster/out/poster.pdf', 'neurips-poster/out/poster_upload.png'],
                       'steps': ['poster'],
                       'what': 'the poster (its PDF, and the previews on /plant/ and the home page)'},
            'slides': {'files': ['neurips-talk/out/slides.pdf', 'neurips-talk/out/preview/slide-01.png'],
                       'steps': ['slides'],
                       'what': "the slides (their PDF, and the title slide used as the video's poster frame)"},
            'talk': {'files': ['neurips-talk/out/video/PLANT_NeurIPS2026_talk.mp4',
                               'neurips-talk/src/talk.toml', 'neurips-talk/src/make_video.py'],
                     'steps': ['video', 'captions'],
                     'what': 'the talk video and its captions'},
            # the folder resync_plant.sh copies, minus what it leaves out
            'page': {'tree': 'website', 'skip_dirs': ['_notes', 'media'], 'skip_files': ['README.md'],
                     'steps': ['page'],
                     'what': 'the project page (/plant/)'},
        },
    },
    # No copy step yet: only folders that look like a poster, talk, slides or project page are watched.
    'mistill': {'name': 'MISTILL', 'parts': {}},
}


def files_under(root, skip_dirs=(), skip_files=()):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS and d not in skip_dirs)
        for f in sorted(filenames):
            if f not in SKIP_FILES and f not in skip_files:
                yield Path(dirpath, f)


def file_sha(path, cache):
    st = path.stat()
    key, stamp = str(path), [st.st_size, st.st_mtime_ns]
    hit = cache.get(key)
    if hit and hit[:2] == stamp:
        return hit[2]
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for block in iter(lambda: fh.read(1 << 20), b''):
            h.update(block)
    cache[key] = stamp + [h.hexdigest()]
    return h.hexdigest()


def part_hash(src, part, cache):
    """Content hash of a part, or None while any of it is missing (not built, or mid-build)."""
    h = hashlib.sha256()
    if 'tree' in part:
        root = src / part['tree']
        if not root.is_dir():
            return None
        for p in files_under(root, part.get('skip_dirs', ()), part.get('skip_files', ())):
            h.update(f'{p.relative_to(root).as_posix()}\0{file_sha(p, cache)}\n'.encode())
        return h.hexdigest()
    for rel in part['files']:
        p = src / rel
        if not p.is_file():
            return None
        h.update(f'{rel}\0{file_sha(p, cache)}\n'.encode())
    return h.hexdigest()


def covered_folders(project):
    out = set()
    for part in project['parts'].values():
        out.add(part['tree'] if 'tree' in part else None)
        out.update(rel.split('/')[0] for rel in part.get('files', ()))
    out.discard(None)
    return out


def watched(src, project):
    """Fingerprints (names, sizes, times) of top-level folders that look like talk material."""
    out, covered = {}, covered_folders(project)
    for d in sorted(src.iterdir()):
        if d.is_dir() and not d.name.startswith('.') and d.name not in covered and WATCH.search(d.name):
            h = hashlib.sha256()
            for p in files_under(d):
                st = p.stat()
                h.update(f'{p.relative_to(d).as_posix()}\0{st.st_size}\0{st.st_mtime_ns}\n'.encode())
            out['watch:' + d.name] = h.hexdigest()
    return out


def synced_path(name):
    return SITE / '_tools' / name / 'synced.json'


def load_json(path):
    try:
        return json.loads(Path(path).read_text())
    except (OSError, ValueError):
        return {}


def state_path(src):
    common = subprocess.run(['git', '-C', str(src), 'rev-parse', '--git-common-dir'],
                            capture_output=True, text=True, check=True).stdout.strip()
    return (src / common).resolve() / 'site-sync.json'


def current(src, project, cache):
    hashes = {k: part_hash(src, part, cache) for k, part in project['parts'].items()}
    hashes.update(watched(src, project))
    return hashes


def cmd_status(src, name, project):
    cache = {}
    synced = load_json(synced_path(name))
    now = current(src, project, cache)
    print(f'{project["name"]}: debjyoti.org against {src}')
    behind = []
    for key, h in now.items():
        rec = synced.get(key, {})
        if h is None:
            print(f'  {key:<16} not built here')
        elif key.startswith('watch:') and not rec:
            print(f'  {key:<16} not on the site')
        elif h == rec.get('hash'):
            print(f'  {key:<16} current (copied {rec.get("date", "?")})')
        else:
            print(f'  {key:<16} changed')
            behind.append(key)
    steps = [s for k in behind if k in project['parts'] for s in project['parts'][k]['steps']]
    if steps:
        print(f'update: SRC="{src}" bash {project["resync"]} {" ".join(steps)}')
    return 0


def cmd_mark(src, name, project, parts):
    cache = {}
    now = current(src, project, cache)
    synced = load_json(synced_path(name))
    for key in parts:
        if key not in now:
            sys.exit(f'unknown part {key!r}; known: {", ".join(now)}')
        if now[key] is None:
            sys.exit(f'{key}: not built in {src}; nothing recorded')
        synced[key] = {'hash': now[key], 'date': dt.date.today().isoformat()}
    path = synced_path(name)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(dict(sorted(synced.items())), indent=2) + '\n')
    print(f'recorded as copied: {", ".join(parts)}')
    return 0


def reason_text(src, name, project, pending, note):
    parts = [k for k in pending if k in project['parts']]
    folders = [k.split(':', 1)[1] for k in pending if k.startswith('watch:')]
    lines = [f'debjyoti.org is behind this repository ({project["name"]}). Changed since the last copy to the site:']
    lines += [f'- {project["parts"][k]["what"]}' for k in parts]
    lines += [f'- the folder {f}/, which the site has no copy of' for f in folders]
    lines += ['',
              'Before you finish, ask the owner (with AskUserQuestion) whether to update the website now. '
              'Say what changed and that updating publishes it on debjyoti.org.',
              f'If they say yes, work in {SITE} and follow its README.md:']
    if parts:
        steps = ' '.join(s for k in parts for s in project['parts'][k]['steps'])
        lines.append(f'  1. SRC="{src}" bash {project["resync"]} {steps}   (each copy records itself in synced.json)')
    if folders:
        lines.append('  1. There is no copy step for this yet: add one like _tools/plant/resync_plant.sh and a part in '
                     '_tools/site_sync.py, link the material from the pages, then record it with '
                     f'python3 _tools/site_sync.py mark {name} '
                     f'--src "{src}" PART.')
    lines += ['  2. python3 _tools/check_site.py --launch must pass; look at the pages that changed.',
              '  3. Commit (git add -A; never stage *.local.txt) and push to main.',
              'If they say no, just finish: this version will not be raised again, only the next change.']
    if note:
        lines += ['', note.strip()]
    return '\n'.join(lines)


def cmd_hook(src, name, project, note_file):
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        payload = {}
    if payload.get('stop_hook_active'):
        return 0
    spath = state_path(src)
    first_run = not spath.exists()
    state = load_json(spath)
    asked, cache = state.get('asked', {}), state.get('cache', {})
    synced = load_json(synced_path(name))
    pending = []
    for key, h in current(src, project, cache).items():
        if h is None or h == synced.get(key, {}).get('hash') or h == asked.get(key):
            continue
        if first_run and key.startswith('watch:'):
            asked[key] = h  # folders that were already there: note them, do not ask
            continue
        pending.append(key)
        asked[key] = h
    spath.write_text(json.dumps({'asked': asked, 'cache': cache}, indent=1) + '\n')
    if pending:
        note = Path(note_file).read_text() if note_file and Path(note_file).is_file() else ''
        print(json.dumps({'decision': 'block', 'reason': reason_text(src, name, project, pending, note)}))
    return 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('command', choices=['status', 'mark', 'hook'])
    ap.add_argument('project', choices=sorted(PROJECTS))
    ap.add_argument('parts', nargs='*')
    ap.add_argument('--src', required=True, help='the paper repository')
    ap.add_argument('--note', help='hook: a file whose text is added to the request (kept outside this repository)')
    a = ap.parse_args()
    src = Path(a.src).expanduser().resolve()
    if not src.is_dir():
        return 0 if a.command == 'hook' else sys.exit(f'no such folder: {src}')
    project = PROJECTS[a.project]
    if a.command == 'status':
        return cmd_status(src, a.project, project)
    if a.command == 'mark':
        return cmd_mark(src, a.project, project, a.parts or sys.exit('name the parts to record'))
    try:
        return cmd_hook(src, a.project, project, a.note)
    except Exception as exc:  # a hook must never stop the session over its own failure
        print(f'site_sync hook: {exc}', file=sys.stderr)
        return 0


if __name__ == '__main__':
    sys.exit(main())
