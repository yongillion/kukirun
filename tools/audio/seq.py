"""DESSERT DASH audio toolkit - sequencer, arranger and mixer.

Text notations (all validated: every '|'-separated bar must add up to exactly 4 beats)
  mel("E5e G5e C6q. | ...")   pitches: C4 = MIDI 60, sharps '#', flats 'b'; 'r' = rest;
                              chords in brackets: [C5,E5]q
      durations: w=4 h=2 q=1 e=1/2 s=1/4 d=1/8 t=1/3 (8th triplet) x=1/6 (16th triplet) or :<beats>
      suffixes : '.' dotted, '!' accent, '?' ghost, '_' staccato, '~' tie to previous same pitch
  prog("G | D/F# | Em7 | C D")  one bar per '|', chords inside a bar share it equally ('C:3 D:1' for explicit beats)
  deg("R e R e O e R e ...")    bass/degree lines resolved against the chord sounding at each note:
      R chord bass, O bass+12, 5 / 3 / 7 / b7 / 6 / 9 / 4 chord-relative degrees above the root,
      -5 fifth below, N next chord's bass, A chromatic approach (N-1), D diatonic approach (N-2),
      or explicit note names.
  grid("x...x...x...x...")      16 steps per bar: X=1.0 x=0.8 o=0.55 g=0.3(ghost) f=flam r=roll .=rest
"""
import itertools
import re
from dataclasses import dataclass, field

import numpy as np

from synth import (SR, butter, bq, chorus, circ, compress, conv_circ, conv_lin, delay_ir, duck_env,
                   fade_edges, limiter, lufs_integrated, mix_into, ns, pan, reverb_ir, saturate,
                   stereo_width, true_peak_db, undb)

PC = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
DUR = {"w": 4.0, "h": 2.0, "q": 1.0, "e": 0.5, "s": 0.25, "d": 0.125, "t": 1.0 / 3.0, "x": 1.0 / 6.0}


def pcname(pc):
    return NAMES[pc % 12]


def mname(m):
    m = int(round(m))
    return f"{NAMES[m % 12]}{m // 12 - 1}"


def nm(s):
    m = re.fullmatch(r"([A-Ga-g])([#b]*)(-?\d+)", s)
    if not m:
        raise ValueError(f"bad note name {s!r}")
    acc = m.group(2).count("#") - m.group(2).count("b")
    return 12 * (int(m.group(3)) + 1) + PC[m.group(1).upper()] + acc


def pc_of(s):
    m = re.fullmatch(r"([A-G])([#b]?)", s)
    return (PC[m.group(1)] + (1 if m.group(2) == "#" else -1 if m.group(2) == "b" else 0)) % 12


@dataclass
class Note:
    beat: float
    dur: float
    midi: float
    vel: float = 0.8
    kw: dict = field(default_factory=dict)


# ----------------------------------------------------------------------------- melody parser
_TOK = re.compile(r"^(r|\[[^\]]+\]|[A-G][#b]?-?\d+)([whqesdtx]|:\d+(?:\.\d+)?)(\.?)([!?_~]*)$")


_DURTOK = re.compile(r"^([whqesdtx]|:\d+(?:\.\d+)?)(\.?)([!?_~]*)$")


def _join(toks):
    """Allow 'C5 q' / 'R e' / 'r w' (pitch and duration written as separate tokens)."""
    out = []
    for t in toks:
        if out and _DURTOK.match(t) and not (_TOK.match(out[-1]) or _DTOK.match(out[-1])):
            out[-1] = out[-1] + t
        else:
            out.append(t)
    return out


def metric(beat, dur=0.5, beats=4.0):
    """Gentle metric accent: downbeat strongest, beat 3 next, then beats 2/4, off-beat 8ths, 16ths."""
    pos = beat % beats
    frac = pos - np.floor(pos + 1e-6)
    if abs(frac) < 1e-4 or abs(frac - 1) < 1e-4:
        b = int(round(pos)) % 4
        a = {0: 1.0, 2: 0.95, 1: 0.92, 3: 0.92}[b]
    elif abs(frac - 0.5) < 1e-4:
        a = 0.87
    else:
        a = 0.83
    if dur >= 1.0:
        a = min(1.0, a * 1.04)
    return a


def _dur(code, dot):
    d = float(code[1:]) if code.startswith(":") else DUR[code]
    return d * (1.5 if dot else 1.0)


def mel(text, bar=0, vel=0.82, tr=0, gate=0.95, beats=4.0, accent=True, **kw):
    """Parse melody text starting at bar index `bar`. Returns list[Note]."""
    notes = []
    beat = bar * beats
    chunks = text.split("|")
    for bi, chunk in enumerate(chunks):
        toks = _join(chunk.split())
        if not toks:
            continue
        b0 = beat
        for tok in toks:
            m = _TOK.match(tok)
            if not m:
                raise ValueError(f"bad token {tok!r} in bar {bi}: {chunk!r}")
            p, code, dot, mods = m.groups()
            d = _dur(code, dot)
            if p != "r":
                pitches = [nm(x) for x in p[1:-1].split(",")] if p.startswith("[") else [nm(p)]
                v = vel * (metric(beat, d, beats) if accent else 1.0) + (0.12 if "!" in mods else 0.0) \
                    - (0.32 if "?" in mods else 0.0)
                g = 0.5 if "_" in mods else gate
                if "~" in mods:
                    for q in pitches:
                        for prev in reversed(notes):
                            if prev.midi == q + tr:
                                prev.dur = beat + d * gate - prev.beat
                                break
                else:
                    for q in pitches:
                        notes.append(Note(beat, d * g, q + tr, min(1.0, v), dict(kw)))
            beat += d
        if abs(beat - b0 - beats) > 1e-6:
            raise ValueError(f"bar {bi} (abs bar {bar + bi}) has {beat - b0:.4f} beats: {chunk.strip()!r}")
    return notes


# ----------------------------------------------------------------------------- chords
QUAL = {
    "": [0, 4, 7], "m": [0, 3, 7], "7": [0, 4, 7, 10], "maj7": [0, 4, 7, 11], "m7": [0, 3, 7, 10],
    "dim": [0, 3, 6], "aug": [0, 4, 8], "sus4": [0, 5, 7], "sus2": [0, 2, 7], "add9": [0, 4, 7, 14],
    "madd9": [0, 3, 7, 14], "6": [0, 4, 7, 9], "m6": [0, 3, 7, 9], "9": [0, 4, 7, 10, 14],
    "maj9": [0, 4, 7, 11, 14], "m9": [0, 3, 7, 10, 14], "7sus4": [0, 5, 7, 10], "m7b5": [0, 3, 6, 10],
    "dim7": [0, 3, 6, 9], "7b9": [0, 4, 7, 10, 13], "5": [0, 7], "mmaj7": [0, 3, 7, 11],
    "maj7#11": [0, 4, 7, 11, 18], "add#11": [0, 4, 7, 18], "6add9": [0, 4, 7, 9, 14], "m11": [0, 3, 7, 10, 14, 17],
    "7#5": [0, 4, 8, 10], "13": [0, 4, 7, 10, 14, 21],
}


@dataclass
class Chord:
    sym: str
    root: int
    ints: list
    bass: int

    @property
    def pcs(self):
        return sorted({(self.root + i) % 12 for i in self.ints})

    def priority(self):
        """Pitch classes in voicing priority order (3rd, 7th/6th, extensions, root, 5th)."""
        order = []
        for want in ([3, 4], [10, 11, 9], [14, 13, 18, 17, 21, 2], [5], [0], [7, 6, 8]):
            for i in self.ints:
                if i in want or (i % 12 in [w % 12 for w in want] and i >= 12):
                    pc = (self.root + i) % 12
                    if pc not in order:
                        order.append(pc)
        for i in self.ints:
            pc = (self.root + i) % 12
            if pc not in order:
                order.append(pc)
        return order


def parse_chord(sym):
    m = re.fullmatch(r"([A-G][#b]?)([^/]*)(?:/([A-G][#b]?))?", sym)
    if not m or m.group(2) not in QUAL:
        raise ValueError(f"bad chord {sym!r}")
    root = pc_of(m.group(1))
    bass = pc_of(m.group(3)) if m.group(3) else root
    return Chord(sym, root, QUAL[m.group(2)], bass)


def prog(text, bar=0, beats=4.0):
    """Returns [(beat, dur, Chord)]."""
    out = []
    beat = bar * beats
    for chunk in text.split("|"):
        toks = chunk.split()
        if not toks:
            continue
        explicit = [t for t in toks if ":" in t]
        if explicit:
            tot = 0.0
            for t in toks:
                s, d = t.split(":")
                out.append((beat + tot, float(d), parse_chord(s)))
                tot += float(d)
            if abs(tot - beats) > 1e-6:
                raise ValueError(f"chord bar {chunk!r} has {tot} beats")
        else:
            d = beats / len(toks)
            for k, t in enumerate(toks):
                out.append((beat + k * d, d, parse_chord(t)))
        beat += beats
    return out


def chord_at(chords, beat):
    cur = chords[0][2]
    for b, d, c in chords:
        if b <= beat + 1e-9:
            cur = c
        else:
            break
    return cur


def next_chord(chords, beat):
    for b, d, c in chords:
        if b > beat + 1e-9:
            return c
    return chords[0][2]  # loop back


def voicings(chords, n=4, lo=52, hi=74, center=None, max_span=14, prev=None, need_root=False, drop=()):
    """Voice-led chord voicings (list of midi lists, one per chord entry).
    drop: chord intervals (mod 12) this layer leaves out, e.g. (11,) = play maj7 chords as triads."""
    center = center if center is not None else (lo + hi) / 2
    out = []
    for b, d, ch in chords:
        dropped = {(ch.root + i) % 12 for i in ch.ints if i % 12 in drop}
        pcs_ok = [p for p in ch.pcs if p not in dropped]
        pr = [p for p in ch.priority() if p not in dropped]
        req = pr[: min(n, 2)]
        tones = [m for m in range(lo, hi + 1) if m % 12 in pcs_ok]
        best, bc = None, 1e9
        for comb in itertools.combinations(tones, n):
            if comb[-1] - comb[0] > max_span:
                continue
            pcs = [c % 12 for c in comb]
            if any(r not in pcs for r in req):
                continue
            if need_root and ch.root not in pcs:
                continue
            cost = 0.0
            dup = len(pcs) - len(set(pcs))
            cost += 2.5 * dup
            missing = [p for p in pr[:n] if p not in pcs]
            cost += 1.2 * len(missing)
            if comb[1] - comb[0] < 3 and comb[0] < 60:
                cost += 3.0
            cost += 1.5 * sum(1 for a, b in zip(comb, comb[1:]) if b - a == 1)  # avoid semitone clusters
            cost += 0.12 * abs(np.mean(comb) - center)
            if prev is not None:
                cost += 0.6 * sum(abs(a - b) for a, b in zip(sorted(prev), comb))
            if cost < bc:
                best, bc = list(comb), cost
        if best is None:
            best = sorted(tones[:n])
        out.append(best)
        prev = best
    return out


# ----------------------------------------------------------------------------- degree lines (bass etc.)
_DEG = {"R": None, "O": None, "1": 0, "b3": 3, "3": None, "4": 5, "5": 7, "b5": 6, "#5": 8, "6": 9, "b7": 10,
        "7": None, "9": 14, "-5": -5, "-4": -7, "b6": 8}
_DTOK = re.compile(r"^(r|R|O|N|A|D|U|-?b?#?\d+|[A-G][#b]?-?\d+)([whqesdtx]|:\d+(?:\.\d+)?)(\.?)([!?_~]*)$")


def _bass_reg(pc, lo):
    m = lo + ((pc - lo) % 12)
    return m


def deg(text, chords, bar=0, lo=28, vel=0.85, gate=0.9, tr=0, beats=4.0, accent=True, **kw):
    notes = []
    beat = bar * beats
    for bi, chunk in enumerate(text.split("|")):
        toks = _join(chunk.split())
        if not toks:
            continue
        b0 = beat
        for tok in toks:
            m = _DTOK.match(tok)
            if not m:
                raise ValueError(f"bad degree token {tok!r}")
            p, code, dot, mods = m.groups()
            d = _dur(code, dot)
            if p != "r":
                ch = chord_at(chords, beat)
                base = _bass_reg(ch.bass, lo)
                root = _bass_reg(ch.root, lo)
                if root < base:
                    root += 12
                if p == "R":
                    q = base
                elif p == "O":
                    q = base + 12
                elif p in ("N", "A", "D", "U"):
                    nx = next_chord(chords, beat)
                    q = _bass_reg(nx.bass, lo)
                    q = q - 1 if p == "A" else q - 2 if p == "D" else q + 1 if p == "U" else q
                elif re.fullmatch(r"[A-G][#b]?-?\d+", p):
                    q = nm(p)
                else:
                    if p == "3":
                        iv = 3 if 3 in ch.ints else 4
                    elif p == "7":
                        iv = 10 if 10 in ch.ints else 11 if 11 in ch.ints else 10
                    elif p in _DEG:
                        iv = _DEG[p]
                    else:
                        iv = int(p)
                    q = root + iv
                v = vel * (0.5 + 0.5 * metric(beat, d, beats) if accent else 1.0) + (0.12 if "!" in mods else 0) \
                    - (0.3 if "?" in mods else 0)
                g = 0.5 if "_" in mods else gate
                if "~" in mods and notes:
                    notes[-1].dur = beat + d * g - notes[-1].beat
                else:
                    notes.append(Note(beat, d * g, q + tr, min(1.0, v), dict(kw)))
            beat += d
        if abs(beat - b0 - beats) > 1e-6:
            raise ValueError(f"deg bar {bi} has {beat - b0} beats: {chunk!r}")
    return notes


# ----------------------------------------------------------------------------- generators
GRIDV = {"X": 1.0, "x": 0.8, "o": 0.55, "g": 0.3}


def grid(text, bar=0, repeat=1, steps=16, vel=1.0, beats=4.0, kw=None):
    """Drum/rhythm grid -> list[Note] (midi=0). '|' separates bars; a single bar is repeated `repeat` times."""
    bars_ = [b.strip().replace(" ", "") for b in text.split("|") if b.strip()]
    seq = bars_ * repeat
    out = []
    step = beats / steps
    for bi, pat in enumerate(seq):
        if len(pat) != steps:
            raise ValueError(f"grid bar needs {steps} steps: {pat!r}")
        for i, c in enumerate(pat):
            b = (bar + bi) * beats + i * step
            if c in GRIDV:
                out.append(Note(b, step, 0, GRIDV[c] * vel, dict(kw or {})))
            elif c == "f":
                out.append(Note(b - step * 0.18, step, 0, 0.42 * vel, dict(kw or {})))
                out.append(Note(b, step, 0, 0.85 * vel, dict(kw or {})))
            elif c == "r":
                out.append(Note(b, step / 2, 0, 0.62 * vel, dict(kw or {})))
                out.append(Note(b + step / 2, step / 2, 0, 0.72 * vel, dict(kw or {})))
            elif c in ".-":
                pass
            else:
                raise ValueError(f"bad grid char {c!r}")
    return out


def hits(chords, voic, text, bar=0, repeat=1, gate=None, vel=0.8, strum=0.0, steps=16, beats=4.0, updown=True, kw=None):
    """Chord hits on a rhythm grid ('-' after a hit sustains it). voic: list aligned with chords."""
    bars_ = [b.strip().replace(" ", "") for b in text.split("|") if b.strip()] * repeat
    step = beats / steps
    out = []
    for bi, pat in enumerate(bars_):
        if len(pat) != steps:
            raise ValueError(f"hits bar needs {steps} steps: {pat!r}")
        i = 0
        k = 0
        while i < steps:
            c = pat[i]
            if c in GRIDV:
                j = i + 1
                while j < steps and pat[j] == "-":
                    j += 1
                b = (bar + bi) * beats + i * step
                idx = max(ix for ix, (cb, cd, ch) in enumerate(chords) if cb <= b + 1e-9)
                vs = voic[idx]
                L = (j - i) * step if gate is None else gate
                down = (i % 4 == 0) if updown == "pos" else ((k % 2 == 0) or not updown)
                order = vs if down else vs[::-1]
                for si, m in enumerate(order):
                    kk = dict(kw or {})
                    if strum:
                        kk["_offs"] = si * strum
                    out.append(Note(b, L, m, GRIDV[c] * vel * (1.0 if down else 0.85), kk))
                k += 1
                i = j
            else:
                i += 1
    return out


def arp(chords, pattern, bar, bars, rate=0.25, lo=60, n_tones=8, vel=0.7, gate=0.8, accent=None, beats=4.0, kw=None,
        avoid=None, drop=()):
    """Arpeggiate the sounding chord: `pattern` indexes the chord tones counted upward from `lo`.
    avoid: melody notes - tones clashing (m2/m9) with a sounding melody note are skipped; drop: intervals left out."""
    out = []
    steps = int(round(bars * beats / rate))
    for k in range(steps):
        b = bar * beats + k * rate
        ch = chord_at(chords, b)
        dropped = {(ch.root + i) % 12 for i in ch.ints if i % 12 in drop}
        tones = [m for m in range(lo, lo + 36) if m % 12 in ch.pcs and m % 12 not in dropped][:n_tones]
        idx = pattern[k % len(pattern)]
        if idx is None:
            continue
        v = vel
        if accent:
            v *= accent[k % len(accent)]
        m = tones[idx % len(tones)] + 12 * (idx // len(tones))
        if avoid is not None:
            mels = sounding(avoid, b, b + rate * gate)
            j = 0
            while _clashes(m, mels) and j < len(tones):
                j += 1
                m = tones[(idx + j) % len(tones)] + 12 * ((idx + j) // len(tones))
        out.append(Note(b, rate * gate, m, v, dict(kw or {})))
    return out


def gliss(beat, dur_beats, lo, hi, scale_pcs, vel=0.6, up=True, note_dur=1.0):
    """Fast scale glissando between midi lo..hi over dur_beats."""
    ms = [m for m in range(lo, hi + 1) if m % 12 in scale_pcs]
    if not up:
        ms = ms[::-1]
    step = dur_beats / max(1, len(ms))
    return [Note(beat + i * step, note_dur, m, vel * (0.75 + 0.25 * i / max(1, len(ms) - 1))) for i, m in enumerate(ms)]


def _clashes(acc, mel_notes):
    """acc forms a minor 2nd / minor 9th (any octave) directly BELOW a melody note, or a m2 just above it."""
    for mm in mel_notes:
        d = mm - acc
        if d > 0 and d % 12 == 1:
            return True
        if -2 < d < 0:
            return True
    return False


def sounding(melody, t0, t1, min_dur=0.45):
    """Melody pitches that start (on a beat) or are held within [t0, t1)."""
    out = []
    for n in melody:
        if n.dur < min_dur:
            continue
        if n.beat < t1 - 1e-6 and n.beat + n.dur > t0 + 1e-6:
            out.append(int(round(n.midi)))
    return out


def melody_safe(voic, chords, melody):
    """Remove/replace accompaniment tones that would sit a semitone (or m9) under a sounding melody note."""
    out = []
    for (b, d, ch), v in zip(chords, voic):
        mels = sounding(melody, b, b + d)
        nv = []
        for m in v:
            if _clashes(m, mels):
                cand = [x for x in range(m - 1, m - 7, -1) if x % 12 in ch.pcs and not _clashes(x, mels) and x not in v]
                if cand:
                    nv.append(cand[0])
            else:
                nv.append(m)
        out.append(sorted(set(nv)) or v)
    return out


def roll(notes, min_dur=0.9, rate=1.0 / 6.0):
    """Mallet-style roll: notes at least `min_dur` beats long become repeated soft strokes."""
    out = []
    for n in notes:
        if n.dur >= min_dur:
            k = max(2, int(round(n.dur / rate)))
            for i in range(k):
                v = n.vel * (1.0 if i == 0 else 0.62 + 0.18 * ((i * 7) % 5) / 4)
                out.append(Note(n.beat + i * rate, rate * 1.5, n.midi, v, dict(n.kw)))
        else:
            out.append(n)
    return out


def harmony_below(notes, chords, scale_pcs, min_iv=3, max_iv=9):
    """Second voice: nearest chord tone 3..9 semitones below each melody note (diatonic 3rd fallback)."""
    out = []
    for nt in notes:
        ch = chord_at(chords, nt.beat)
        cands = [nt.midi - i for i in range(min_iv, max_iv + 1) if (nt.midi - i) % 12 in ch.pcs]
        if cands:
            q = cands[0]
        else:
            q = nt.midi - 3
            for i in (3, 4):
                if (nt.midi - i) % 12 in scale_pcs:
                    q = nt.midi - i
                    break
        out.append(Note(nt.beat, nt.dur, q, nt.vel * 0.85, dict(nt.kw)))
    return out


def shift(notes, beats=0.0, semis=0, vel=1.0):
    return [Note(n.beat + beats, n.dur, n.midi + semis, n.vel * vel, dict(n.kw)) for n in notes]


def only(notes, b0, b1):
    return [n for n in notes if b0 - 1e-9 <= n.beat < b1 - 1e-9]


def check_harmony(notes, chords, label, strong=(0.0, 2.0), min_dur=0.45, beats=4.0):
    """List long strong-beat melody notes that are not chord tones (with their interval to the root)."""
    warns = []
    for nt in notes:
        pos = nt.beat % beats
        if any(abs(pos - s) < 1e-6 for s in strong) and nt.dur >= min_dur:
            ch = chord_at(chords, nt.beat)
            pc = int(round(nt.midi)) % 12
            if pc not in ch.pcs:
                rel = (pc - ch.root) % 12
                bad = rel in (1, 6) or (rel == 11 and 10 in ch.ints) or (rel == 10 and 11 in ch.ints) \
                    or (rel == 4 and 3 in ch.ints) or (rel == 3 and 4 in ch.ints) or (rel == 5 and 4 in ch.ints and nt.dur >= 1.0)
                warns.append((label, nt.beat / beats + 1, mname(nt.midi), ch.sym, rel, "CLASH" if bad else "tension"))
    return warns


# ----------------------------------------------------------------------------- tracks / songs
class Track:
    def __init__(self, name, voice, notes, kind="poly", gain=0.0, pan=0.0, rev=0.0, dly=0.0, duck=0.0, eq=(),
                 ch=None, width=1.0, drive=0.0, vkw=None, var=1, group="music", vel_pow=1.0, lvl=None, trem=None):
        self.name, self.voice, self.notes, self.kind = name, voice, list(notes), kind
        self.lvl = lvl  # target stem loudness (LU relative to the song reference) -> automatic gain
        self.trem = trem  # (rate_hz, depth) amplitude tremolo, quantised to the loop
        self.gain, self.pan, self.rev, self.dly, self.duck = gain, pan, rev, dly, duck
        self.eq, self.ch, self.width, self.drive = list(eq), ch, width, drive
        self.vkw = dict(vkw or {})
        self.var, self.group, self.vel_pow = var, group, vel_pow


def apply_eq(x, eq, circular):
    def run(z):
        for e in eq:
            k = e[0]
            if k == "hp":
                z = butter(z, "highpass", e[1], e[2] if len(e) > 2 else 2)
            elif k == "lp":
                z = butter(z, "lowpass", e[1], e[2] if len(e) > 2 else 2)
            elif k in ("peak", "lowshelf", "highshelf"):
                z = bq(z, k, e[1], e[2], e[3])
            else:
                raise ValueError(k)
        return z
    if not eq:
        return x
    return circ(run, x, ns(0.5)) if circular else run(x)


class Song:
    def __init__(self, name, bpm, bars, key="", loop=True, swing8=0.0, swing16=0.0, length=None, desc="",
                 reverb=None, delay=None, lufs=-16.0, ceiling=-1.5, comp=None, master_eq=(), duck_from="kick",
                 duck_release=None):
        self.name, self.bpm, self.bars, self.key, self.loop = name, bpm, bars, key, loop
        self.spb = 60.0 / bpm
        self.swing8, self.swing16 = swing8, swing16
        self.loop_len_s = bars * 4 * self.spb
        self.length = length  # one-shots: total seconds (incl. tail)
        self.n = int(round(self.loop_len_s * SR)) if loop else ns(length)
        self.desc = desc
        self.tracks = []
        self.sections = []  # (name, bar0, bars, progression text)
        self.reverb = dict(rt60=1.8, predelay=0.02, seed=1, hp=220.0, lp=9000.0, width=1.0)
        self.reverb.update(reverb or {})
        self.delay = dict(beats=0.75, fb=0.35, lp=4500.0, hp=400.0, to_rev=0.25)
        self.delay.update(delay or {})
        self.lufs_target, self.ceiling = lufs, ceiling
        self.comp = dict(thr=-14.0, ratio=1.8, attack=0.012, release=0.16)
        self.comp.update(comp or {})
        self.master_eq = list(master_eq)
        self.duck_from = duck_from
        self.duck_release = duck_release if duck_release is not None else min(0.22, self.spb * 0.45)
        self.chords = []
        self.info = {}
        self.ref = -20.0

    def b2s(self, beat):
        """Beat position -> seconds. Swing is a continuous time-warp inside each beat (8th swing) or each
        8th (16th swing), so off-beat starts AND note ends move consistently."""
        b = float(beat)
        if self.swing8:
            k = np.floor(b)
            p = b - k
            sw = self.swing8
            p = p * (0.5 + sw) / 0.5 if p < 0.5 else 0.5 + sw + (p - 0.5) * (0.5 - sw) / 0.5
            b = k + p
        if self.swing16:
            k = np.floor(b * 2) / 2
            p = b - k
            sw = self.swing16
            p = p * (0.25 + sw) / 0.25 if p < 0.25 else 0.25 + sw + (p - 0.25) * (0.25 - sw) / 0.25
            b = k + p
        return b * self.spb

    def add(self, *tracks):
        self.tracks.extend(tracks)

    def section(self, name, bar0, bars, progression=""):
        self.sections.append((name, bar0, bars, progression))

    # ------------------------------------------------------------------ rendering
    def _render_track(self, tr):
        n = self.n
        circular = self.loop
        cache = {}
        stereo_out = None
        buf = None
        if tr.kind == "line":
            evs = [(self.b2s(nt.beat), self.b2s(nt.beat + nt.dur) - self.b2s(nt.beat), nt.midi, nt.vel) for nt in tr.notes]
            buf = np.zeros(n)
            for pos, sig in tr.voice(evs, **tr.vkw):
                mix_into(buf, pos, sig, circular)
        else:
            for i, nt in enumerate(tr.notes):
                t0 = self.b2s(nt.beat) + nt.kw.get("_offs", 0.0)
                kw = {k: v for k, v in nt.kw.items() if not k.startswith("_")}
                if tr.kind == "drum":
                    var = (i % tr.var) if tr.var > 1 else 0
                    key = ("d", var, tuple(sorted(kw.items())))
                    if key not in cache:
                        cache[key] = tr.voice(seed=var, **{**tr.vkw, **kw})
                    sig = cache[key] * (nt.vel ** tr.vel_pow)
                else:
                    dur = self.b2s(nt.beat + nt.dur) - self.b2s(nt.beat)
                    if tr.var > 1:
                        kw["var"] = i % tr.var
                    vq = round(nt.vel, 2)
                    key = (round(nt.midi, 3), round(dur, 3), vq, tuple(sorted(kw.items())))
                    if key not in cache:
                        cache[key] = tr.voice(nt.midi, dur, vq, **{**tr.vkw, **kw})
                    sig = cache[key]
                if buf is None:
                    buf = np.zeros((n, 2)) if sig.ndim == 2 else np.zeros(n)
                if sig.ndim == 2 and buf.ndim == 1:
                    buf = np.stack([buf, buf], 1)
                if sig.ndim == 1 and buf.ndim == 2:
                    sig = np.stack([sig, sig], 1)
                mix_into(buf, int(round(t0 * SR)), sig, circular)
        if buf is None:
            buf = np.zeros(n)
        # inserts
        if tr.trem:
            from synth import lfo_rate, tline
            rate = lfo_rate(tr.trem[0], self.loop_len_s if self.loop else None)
            lfo = 1.0 - tr.trem[1] * (0.5 - 0.5 * np.cos(2 * np.pi * rate * tline(n)))
            buf = buf * (lfo if buf.ndim == 1 else lfo[:, None])
        if tr.drive:
            buf = saturate(buf, tr.drive)
        buf = apply_eq(buf, tr.eq, circular)
        period = self.loop_len_s if self.loop else None
        panned = False
        if buf.ndim == 1 and not tr.ch:
            stereo_out = pan(buf, tr.pan)
            panned = True
        elif buf.ndim == 1:
            stereo_out = chorus(buf, period=period, circular=circular, **tr.ch)
        else:
            stereo_out = chorus(buf, period=period, circular=circular, **tr.ch) if tr.ch else buf
        if tr.width != 1.0:
            stereo_out = stereo_width(stereo_out, tr.width)
        if tr.pan and not panned:
            th = (np.clip(tr.pan, -1, 1) + 1) * np.pi / 4
            stereo_out = stereo_out * (np.array([np.cos(th), np.sin(th)]) * np.sqrt(2))[None, :]
        return stereo_out * undb(tr.gain)

    def render(self, verbose=False):
        n = self.n
        circular = self.loop
        dry = np.zeros((n, 2))
        rev_in = np.zeros((n, 2))
        dly_in = np.zeros((n, 2))
        # sidechain source
        kick_tr = [t for t in self.tracks if t.name == self.duck_from]
        hits_ = []
        for t in kick_tr:
            hits_ += [int(round(self.b2s(nt.beat) * SR)) for nt in t.notes if nt.vel > 0.5]
        duck_unit = duck_env(n, hits_, 1.0, 0.004, self.duck_release, circular) if hits_ else np.ones(n)
        stem_lufs = {}
        for tr in self.tracks:
            st = self._render_track(tr)
            if tr.duck:
                st = st * (1.0 - tr.duck * (1.0 - duck_unit))[:, None]
            L = lufs_integrated(st) if np.any(st) else -120.0
            if tr.lvl is not None and L > -100:
                st = st * undb(self.ref + tr.lvl - L)
                L = self.ref + tr.lvl
            stem_lufs[tr.name] = L
            dry += st
            if tr.rev:
                rev_in += st * tr.rev
            if tr.dly:
                dly_in += st * tr.dly
        R = self.reverb
        ir = reverb_ir(R["rt60"], R["predelay"], seed=R["seed"], hp=R["hp"], lp=R["lp"], width=R.get("width", 1.0),
                       hf=R.get("hf", 1.0), er_level=R.get("er", 0.6), early_span=R.get("early_span", 0.07))
        D = self.delay
        dir_ = delay_ir(D["beats"] * self.spb, D["fb"], taps=D.get("taps", 7), lp_hz=D["lp"], hp_hz=D["hp"])
        if np.any(dly_in):
            dly_out = conv_circ(dly_in, dir_) if circular else conv_lin(dly_in, dir_)[:n]
            rev_in += dly_out * D["to_rev"]
        else:
            dly_out = np.zeros((n, 2))
        rev_out = conv_circ(rev_in, ir) if circular else conv_lin(rev_in, ir)[:n]
        mix = dry + rev_out + dly_out
        self.info["stems"] = stem_lufs
        self.info["rev_lufs"] = lufs_integrated(rev_out) if np.any(rev_out) else -120
        return self.master(mix)

    def master(self, mix):
        circular = self.loop
        def hp_eq(z):
            z = butter(z, "highpass", 24.0, 2)
            for e in self.master_eq:
                z = bq(z, e[0], e[1], e[2], e[3])
            return z
        mix = circ(hp_eq, mix, ns(1.0)) if circular else hp_eq(mix)
        C = self.comp
        g = 0.0
        for it in range(6):
            x = mix * undb(g)
            if C.get("ratio", 1) > 1:
                x = compress(x, C["thr"], C["ratio"], 6.0, C["attack"], C["release"], circular=circular)
            y, gr = limiter(x, self.ceiling - 0.1, circular=circular)
            L = lufs_integrated(y)
            err = self.lufs_target - L
            if abs(err) < 0.08:
                break
            g += err
        self.info.update(limiter_gr=gr, pre_gain=g)
        if not self.loop:
            y = fade_edges(y, 0.0, 0.25)
        return y


def summarize_progression(song):
    lines = []
    for name, b0, nb, p in song.sections:
        lines.append(f"    {name:3s} bars {b0 + 1:2d}-{b0 + nb:2d}: {p}")
    return "\n".join(lines)
