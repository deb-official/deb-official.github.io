#!/usr/bin/env python3
"""Make English WebVTT captions for the PLANT talk video from the talk script.

    python3 make_vtt.py TALK_DIR VIDEO OUT.vtt [--report]

TALK_DIR  the paper repo's neurips-talk/ folder. Read only: src/talk.toml and src/make_video.py are parsed
          (make_video.py with `ast`, never imported or run), so nothing is written there.
VIDEO     the talk video whose audio is searched for pauses (the original or the web re-encode)
OUT.vtt   the captions

Method
  1. Slide times: the CLIPS table and FPS in src/make_video.py, rounded to whole frames exactly as
     make_video.py does. Their sum must equal the video's duration (checked).
  2. Speech: ffmpeg silencedetect (-40 dB, pauses of 0.12 s or more) gives each slide's first and last
     spoken moment and the pauses in between.
  3. Cues: each slide's `say` text is cut into sentences, long sentences into chunks at commas, colons and
     before conjunctions, so that a cue is at most two lines of at most 42 characters and roughly 1.5-6 s
     long. A very short sentence joins a neighbouring sentence when the two fit one cue.
  4. Timing, per slide: a cue's expected length is proportional to its character count (the slide's own
     speaking rate). A dynamic program places all cue boundaries at once, either in a pause or between
     two pauses, so that the cue lengths fit the character counts, sentence ends fall in pauses (the longer
     the better), and few long pauses are left inside a cue that has no punctuation to explain them.
The captions follow the script, not a transcript: where the speaker departed from the script, the words
differ, and timing inside a slide is an estimate.
"""
import argparse
import ast
import bisect
import math
import re
import subprocess
import sys
import tomllib
from pathlib import Path

MAX_LINE, MAX_LINES = 42, 2
MIN_DUR, MAX_DUR = 1.5, 6.0
SIL_DB, SIL_MIN = -40, 0.12      # silencedetect threshold and shortest pause
PAUSE_NOT_SPEECH = 0.25          # pauses this long do not count as speaking time
BOUNDARY_PAUSE = 0.15            # pauses this long can hold a cue boundary
LEAD, HANG, CHAIN = 0.05, 0.30, 0.6   # cue shows just before speech, stays a little after; pauses < CHAIN are bridged
GRID = 0.1                       # resolution for boundaries placed in continuous speech
SHORT_SENTENCE = 22              # sentences shorter than this try to join a neighbour

CONJ = {"and", "but", "or", "so", "which", "where", "while", "because", "then", "with", "from", "that",
        "when", "if", "as", "than", "like", "starting", "taught", "joint", "one", "every"}
WEAK_END = {"a", "an", "the", "of", "to", "in", "on", "for", "by", "with", "and", "or", "its", "their",
            "this", "that", "is", "are", "be", "very", "how", "it", "his", "her", "each", "every", "one",
            "two", "three", "who", "we", "i", "i'm", "our", "your", "my", "per", "about", "from", "at",
            "just", "has", "have", "can", "will", "should", "far", "more", "most", "than", "like"}


def slide_times(talk_dir):
    tree = ast.parse((talk_dir / "src" / "make_video.py").read_text(encoding="utf-8"))
    vals = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name) \
                and node.targets[0].id in ("CLIPS", "FPS"):
            vals[node.targets[0].id] = ast.literal_eval(node.value)
    t, out = 0.0, []
    for slide, _take, end in vals["CLIPS"]:
        dur = round(end * vals["FPS"]) / vals["FPS"]
        out.append((slide, t, t + dur))
        t += dur
    return out


def video_duration(video):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def silences(video):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(video), "-vn", "-af",
                        f"silencedetect=noise={SIL_DB}dB:d={SIL_MIN}", "-f", "null", "-"],
                       capture_output=True, text=True)
    ss = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", r.stderr)]
    es = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r.stderr)]
    if len(es) < len(ss):
        es.append(video_duration(video))
    return list(zip(ss, es))


# ---------------------------------------------------------------- text
def sentences(text):
    text = re.sub(r"\s+", " ", text.strip())
    return [s for s in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"'])", text) if s]


def line_cost(words, i):
    """Cost of breaking a cue's words into words[:i] / words[i:]."""
    a, b = " ".join(words[:i]), " ".join(words[i:])
    cost = abs(len(a) - len(b)) * 0.15
    if min(len(a), len(b)) < 15:
        cost += 2
    prev = words[i - 1]
    if prev[-1] in ".!?":
        cost -= 8                 # sentence boundary
    elif prev[-1] in ",;:":
        cost -= 3
    elif prev.lower() in WEAK_END:
        cost += 4
    if words[i].lower() in CONJ:
        cost -= 1
    if len(a) > len(b):
        cost += 0.5               # a slightly longer second line reads better
    return cost


def two_lines(t):
    """Best split of a cue into at most two lines of <= MAX_LINE characters, or None."""
    if len(t) <= MAX_LINE:
        return [t]
    words = t.split(" ")
    best = None
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        if len(a) <= MAX_LINE and len(b) <= MAX_LINE:
            c = line_cost(words, i)
            if best is None or c < best[0]:
                best = (c, [a, b])
    return best[1] if best else None


def lines_cost(t):
    lines = two_lines(t)
    if lines is None:
        return None
    if len(lines) == 1:
        return 0.0
    return line_cost(t.split(" "), len(lines[0].split(" ")))


def chunk(sentence, max_chars, min_chars):
    """Cut one sentence into cues that fit two lines and max_chars, at the most natural places (DP over words)."""
    words = sentence.split(" ")
    n, INF = len(words), float("inf")
    best, back = [INF] * (n + 1), [0] * (n + 1)
    best[0] = 0.0
    for j in range(1, n + 1):
        for i in range(j):
            piece = " ".join(words[i:j])
            if len(piece) > max_chars or two_lines(piece) is None:
                continue
            cost = 14.0 + max(0.0, lines_cost(piece)) + 1e-4 * len(piece) ** 2   # tie-break: even chunks
            # each cue costs more than any break earns:
            if len(piece) < min_chars:                          # fewer, fuller cues
                cost += (min_chars - len(piece)) * 1.0          # short cues flash by
            if j < n:                                           # quality of the break after this piece
                end_word = words[j - 1]
                if end_word[-1] in ",;:":
                    cost -= 6
                elif end_word.lower() in WEAK_END:
                    cost += 12
                if words[j].lower() in CONJ:
                    cost -= 2
            if best[i] + cost < best[j]:
                best[j], back[j] = best[i] + cost, i
    if best[n] == INF:
        raise SystemExit(f"cannot fit into cues: {sentence!r}")
    cuts, j = [], n
    while j > 0:
        cuts.append((back[j], j))
        j = back[j]
    return [" ".join(words[i:j]) for i, j in reversed(cuts)]


def lead_in(s):
    """A short sentence that introduces what follows ("Here is the catch.", "Three: across tasks.", a question)."""
    return bool(re.match(r"^(\w+:|Here (is|are)\b|To wrap up\b)", s)) or s.endswith(("?", ":"))


def build_cues(text, max_chars, min_chars):
    """Cues for one slide. A short whole sentence joins a neighbouring sentence when the two fit one cue: a
    lead-in only the next sentence, any other the end of the previous or the start of the next, whichever
    gives the better two-line cue. A chunk is never joined to another sentence's middle."""
    sents = [chunk(s, max_chars, min_chars) for s in sentences(text)]
    k = 0
    while k < len(sents):
        if len(sents[k]) == 1 and len(sents[k][0]) < SHORT_SENTENCE:
            short, options = sents[k][0], []
            if k > 0 and not lead_in(short):
                cand = sents[k - 1][-1] + " " + short
                c = lines_cost(cand)
                if len(cand) <= max_chars and c is not None:
                    options.append((c, "back", cand))
            if k + 1 < len(sents):
                cand = short + " " + sents[k + 1][0]
                c = lines_cost(cand)
                if len(cand) <= max_chars and c is not None:
                    options.append((c, "fwd", cand))
            if options:
                _, side, cand = min(options)
                if side == "back":
                    sents[k - 1][-1] = cand
                else:
                    sents[k + 1][0] = cand
                del sents[k]
                continue
        k += 1
    return [c for s in sents for c in s]


# ---------------------------------------------------------------- timing
def speech_span(a, b, sil):
    inside = sorted((max(s, a), min(e, b)) for s, e in sil if e > a and s < b)
    s0, s1 = a, b
    if inside and inside[0][0] <= a + 1e-3:
        s0 = inside[0][1]
    if inside and inside[-1][1] >= b - 1e-3:
        s1 = inside[-1][0]
    pauses = [(s, e) for s, e in inside if s > s0 and e < s1]
    return s0, s1, pauses


def align_slide(cues, a, b, sil):
    """Place the cue boundaries of one slide (dynamic program; see the module docstring)."""
    s0, s1, pauses = speech_span(a, b, sil)
    long_p = [(s, e) for s, e in pauses if e - s >= PAUSE_NOT_SPEECH]

    def S(t):                         # speaking time from s0 to t, long pauses excluded
        return (t - s0) - sum(max(0.0, min(e, t) - s) for s, e in long_p if s < t)

    L = [len(c) + 1 for c in cues]
    rate = sum(L) / S(s1)
    n = len(cues)
    # nodes: (end of previous cue, start of next cue, pause length or 0 for a point in continuous speech)
    nodes = [(s0, s0, 0.0)]
    for s, e in pauses:
        if e - s >= BOUNDARY_PAUSE and s > s0 + 0.4 and e < s1 - 0.4:
            nodes.append((s, e, e - s))
    t = s0 + 0.5
    while t < s1 - 0.5:
        if not any(s - 0.08 <= t <= e + 0.08 for s, e in pauses):
            nodes.append((t, t, 0.0))
        t += GRID
    nodes.append((s1, s1, 0.0))
    nodes.sort()
    N = len(nodes)
    Send = [S(x[0]) for x in nodes]
    Sstart = [S(x[1]) for x in nodes]
    lp_starts = [s for s, e in pauses if e - s >= 0.45]
    lp_ends = [e for s, e in pauses if e - s >= 0.45]

    def inner_long_pauses(i, j):      # long pauses strictly inside the cue that runs from node i to node j
        lo, hi = nodes[i][1], nodes[j][0]
        return sum(1 for s, e in zip(lp_starts, lp_ends) if s > lo + 1e-6 and e < hi - 1e-6)

    INF = float("inf")
    dp = [[INF] * N for _ in range(n + 1)]
    bk = [[-1] * N for _ in range(n + 1)]
    dp[0][0] = 0.0
    for k in range(1, n + 1):
        cue = cues[k - 1]
        exp = L[k - 1] / rate
        end_kind = "sent" if cue[-1] in ".!?" else "phrase" if cue[-1] in ",;:" else "mid"
        punct_inside = len(re.findall(r"[,;:.!?](?=\s)", cue))
        js = [N - 1] if k == n else range(1, N - 1)
        for j in js:
            bonus = 0.0
            if k < n:
                pd = min(nodes[j][2], 1.2)
                if pd > 0:
                    bonus = -{"sent": 3.0, "phrase": 1.6, "mid": 0.4}[end_kind] * (0.4 + pd)
                else:
                    bonus = {"sent": 2.5, "phrase": 1.0, "mid": 0.0}[end_kind]
            for i in range(N - 1):
                if dp[k - 1][i] == INF or nodes[i][1] >= nodes[j][0]:
                    continue
                d = Send[j] - Sstart[i]
                if d < 0.25 * exp or d > 3.0 * exp:
                    continue
                c = 5.5 * math.log(d / exp) ** 2 + bonus
                extra = inner_long_pauses(i, j) - punct_inside
                if extra > 0:
                    c += 1.2 * extra
                v = dp[k - 1][i] + c
                if v < dp[k][j]:
                    dp[k][j], bk[k][j] = v, i
    if dp[n][N - 1] == INF:
        raise SystemExit(f"no alignment for the slide at {a:.2f} s")
    path, j = [N - 1], N - 1
    for k in range(n, 0, -1):
        j = bk[k][j]
        path.append(j)
    path.reverse()                     # path[k] = node of boundary k (0 = start, n = end)

    times, info = [], []
    for k in range(n):
        i, j = nodes[path[k]], nodes[path[k + 1]]
        start = i[1] - LEAD if k else s0 - LEAD
        if k == n - 1:
            end = min(s1 + HANG, b)
        elif j[2] == 0.0 or j[2] < CHAIN:
            end = j[1] - LEAD              # continuous speech or a short pause: the next cue takes over
        else:
            end = j[0] + HANG              # a long pause: the screen clears during it
        times.append([start, end])
        if k < n - 1:
            info.append((cues[k][-1], round(j[2], 2)))
    # a cue shorter than MIN_DUR may run on into the pause that follows it
    for k in range(n):
        nxt = times[k + 1][0] if k + 1 < n else b
        if times[k][1] - times[k][0] < MIN_DUR:
            times[k][1] = max(times[k][1], min(nxt, times[k][0] + MIN_DUR))
    return times, info, (s0, s1, rate)


def ts(t):
    ms = int(round(max(0.0, t) * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("talk_dir", type=Path)
    ap.add_argument("video", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--report", action="store_true")
    args = ap.parse_args()

    slides = tomllib.loads((args.talk_dir / "src" / "talk.toml").read_text(encoding="utf-8"))["slide"]
    times = slide_times(args.talk_dir)
    dur = video_duration(args.video)
    if len(times) != len(slides):
        sys.exit(f"{len(times)} clips in make_video.py but {len(slides)} slides in talk.toml")
    if abs(times[-1][2] - dur) > 0.05:
        sys.exit(f"slide times end at {times[-1][2]:.3f} s but the video lasts {dur:.3f} s")
    sil = silences(args.video)

    cues_out, report = [], []
    for (num, a, b), sl in zip(times, slides):
        text = re.sub(r"\s+", " ", sl["say"].strip())
        s0, s1, _ = speech_span(a, b, sil)
        wall_rate = len(text) / (s1 - s0)              # characters per second, pauses included
        max_chars = min(MAX_LINE * MAX_LINES, int(MAX_DUR * wall_rate))
        min_chars = int(MIN_DUR * wall_rate)
        cues = build_cues(text, max_chars, min_chars)
        tms, info, span = align_slide(cues, a, b, sil)
        for _ in range(3):             # a cue that runs long (slow delivery) is split at its line break
            long_ones = [k for k, (st, en) in enumerate(tms) if en - st > MAX_DUR + 0.5 and len(two_lines(cues[k])) == 2]
            if not long_ones:
                break
            k = long_ones[0]
            cues[k:k + 1] = two_lines(cues[k])
            tms, info, span = align_slide(cues, a, b, sil)
        for c, (st, en) in zip(cues, tms):
            cues_out.append((st, en, two_lines(c), num))
        report.append((num, a, b, span, wall_rate, len(cues), info))

    # checks: monotonic, no overlap, inside the video, line limits
    for k, (st, en, lines, _) in enumerate(cues_out):
        assert en > st, cues_out[k]
        assert k == 0 or st >= cues_out[k - 1][1] - 1e-6, (cues_out[k - 1], cues_out[k])
        assert len(lines) <= MAX_LINES and all(len(x) <= MAX_LINE for x in lines), lines
    assert cues_out[0][0] >= 0 and cues_out[-1][1] <= dur, (cues_out[-1], dur)

    out = ["WEBVTT", "",
           "NOTE",
           "English captions generated from the talk script, not transcribed from the",
           "recording. Cues follow the slide changes and the pauses in the narration;",
           "inside a slide their times are estimated from character counts.", ""]
    for i, (st, en, lines, _) in enumerate(cues_out, 1):
        out += [str(i), f"{ts(st)} --> {ts(en)}", *lines, ""]
    args.out.write_text("\n".join(out), encoding="utf-8")

    if args.report:
        print(f"video {dur:.3f} s; slides end at {times[-1][2]:.3f} s; {len(sil)} pauses; {len(cues_out)} cues")
        for num, a, b, (s0, s1, rate), wall, n, info in report:
            sent = [p for e, p in info if e in ".!?"]
            print(f" slide {num:2d} {a:7.2f}-{b:7.2f} speech {s0:7.2f}-{s1:7.2f} ({wall:4.1f} chars/s)  cues {n:2d};"
                  f" boundaries in a pause {sum(1 for _, p in info if p > 0)}/{len(info)},"
                  f" sentence ends in a pause {sum(1 for p in sent if p > 0)}/{len(sent)}")
        durs = [en - st for st, en, _, _ in cues_out]
        cps = [sum(len(x) for x in lines) / (en - st) for st, en, lines, _ in cues_out]
        print(f" cue length {min(durs):.2f}-{max(durs):.2f} s (mean {sum(durs) / len(durs):.2f}),"
              f" reading speed {min(cps):.1f}-{max(cps):.1f} chars/s (mean {sum(cps) / len(cps):.1f}),"
              f" last cue ends {cues_out[-1][1]:.3f} s of {dur:.3f} s")


if __name__ == "__main__":
    main()
