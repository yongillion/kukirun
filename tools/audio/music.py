"""DESSERT DASH - music definitions (all compositions original).

Each song_* function builds a seq.Song from hand-written note lists.  Conventions:
  * loops are exactly `bars` long, bar 1 beat 1 = t0 (with a downbeat crash/kick), tails wrap circularly
  * melody text is validated bar by bar (4 beats each), see seq.py for the notation
"""
from functools import partial

import instruments as I
from seq import (Note, Song, Track, arp, chord_at, check_harmony, deg, gliss, grid, harmony_below, hits, mel,
                 melody_safe, only, prog, roll, shift, voicings)

G_MAJOR = {7, 9, 11, 0, 2, 4, 6}
F_MAJOR = {5, 7, 9, 10, 0, 2, 4}
A_MINOR = {9, 11, 0, 2, 4, 5, 7}
FS_MINOR = {6, 8, 9, 11, 1, 2, 4}
E_MAJOR = {4, 6, 8, 9, 11, 1, 3}
C_MINOR = {0, 2, 3, 5, 7, 8, 10}
D_MAJOR = {2, 4, 6, 7, 9, 11, 1}
BB_MAJOR = {10, 0, 2, 3, 5, 7, 9}
C_MAJOR = {0, 2, 4, 5, 7, 9, 11}


def rep(pattern, n):
    return " | ".join([pattern] * n)


def chord_notes(ch, voic, vel, bar0=0, bar1=10 ** 6, scale=0.98, beats=4.0):
    """Sustained chord notes (one per chord entry) between bars [bar0, bar1)."""
    return [Note(b, d * scale, m, vel) for (b, d, c), v in zip(ch, voic) for m in v if bar0 * beats <= b < bar1 * beats]


def at(bars, text="X...............", vel=1.0, **kw):
    """Single-bar grid placed at each bar index in `bars`."""
    out = []
    for b in bars:
        out += grid(text, b, vel=vel, kw=kw or None)
    return out


def _cat(*lists):
    out = []
    for l in lists:
        out += l
    return out


def _kw(notes, **kw):
    for n in notes:
        n.kw.update(kw)
    return notes


# ============================================================================ LAND 1 - Sugar Meadow
def song_land1():
    S = Song("bgm_land1", 150, 32, key="G major", desc="sunny upbeat run - candy pulse lead, glock, pluck stabs",
             reverb=dict(rt60=1.5, predelay=0.02, seed=11), delay=dict(beats=0.75, fb=0.32),
             comp=dict(thr=-15.0, ratio=1.8))
    A = "G | D/F# | Em7 | C | Am7 | D | Em7 | C D"
    B = "C | D | Bm7 | Em7 | Am7 | Bm7 | C | D7"
    C = "Cmaj7 | Bm7 | Am7 | Gmaj7 | Cmaj7 | Bm7 | Am7 | D7sus4 D7"
    ch = prog(A, 0) + prog(B, 8) + prog(A, 16) + prog(C, 24)
    S.chords = ch
    S.section("A", 0, 8, A)
    S.section("B", 8, 8, B)
    S.section("A'", 16, 8, A)
    S.section("C", 24, 8, C)

    lead_A = """B4e D5e G5q. G5e A5e B5e | A5q B5e A5e F#5q D5q | E5e G5e B5q. B5e C6e B5e | A5q G5e E5e G5h |
                C5e E5e A5q. A5e B5e C6e | D6q C6e B5e A5q F#5q | B5q. A5e G5q E5q | G5q. E5e F#5q A5q"""
    lead_B = """E5q. G5e C6q. B5e | A5q. F#5e D5q. E5e | F#5q. A5e D6q. B5e | B5q. G5e E5h |
                E5q. A5e C6q. B5e | D6q. B5e F#5q. A5e | G5q. E5e G5q C6q | D6h C6e A5e F#5q"""
    lead_A2 = """B4e D5e G5q. G5e A5e B5e | A5q B5e A5e F#5q D5q | E5e G5e B5q. B5e C6e B5e | A5q G5e E5e G5h |
                 C5e E5e A5q. A5e B5e C6e | D6q C6e B5e A5q F#5q | B5q. A5e G5q E5q | G5q. E5e D5h"""
    lead_C = """rw | rw | rw | rw |
                E5e G5e B5q. B5e C6e B5e | D5e F#5e A5q. A5e B5e A5e | C5e E5e A5q. A5e B5e C6e | D6q. C6e A5q F#5q"""
    lead = mel(lead_A, 0) + mel(lead_B, 8, vel=0.86) + mel(lead_A2, 16) + mel(lead_C, 24, vel=0.8)
    S.lead = lead

    # glockenspiel: doubles the B melody an octave up, answers in A', sings the breakdown
    glk = shift(mel(lead_B, 8, vel=0.55), semis=12)
    glk += mel("rh C6e D6e E6q", 19, vel=0.6) + mel("rh F#6e E6e D6q", 23, vel=0.6)
    glk += mel("E6q D6q B5h | D6q B5q F#5h | C6q B5q A5q E5q | F#5h D5h", 24, vel=0.62)
    # marimba harmony under the A' melody
    mar = harmony_below(mel(lead_A2, 16, vel=0.6), ch, G_MAJOR)

    # chord stabs (off-beat 8ths) + pad
    tops = lead + glk
    vo = melody_safe(voicings(ch, 4, 55, 74, drop=(11,)), ch, tops)
    stab_A = hits(ch, vo, "..x...x...x...x.", 0, 8, gate=0.32, vel=0.62)
    stab_B = hits(ch, vo, "x.x...x.x.x...x.", 8, 8, gate=0.3, vel=0.6)
    stab_A2 = hits(ch, vo, "..x...x...x...x.", 16, 8, gate=0.32, vel=0.62)
    stab_C = hits(ch, vo, "..x...x...x...x.", 28, 4, gate=0.28, vel=0.5)
    vp = melody_safe(voicings(ch, 4, 52, 72), ch, tops)
    pad = [Note(b, d, m, 0.75 if 24 * 4 <= b < 28 * 4 else 0.55) for (b, d, c), v in zip(ch, vp) for m in v
           if 8 * 4 <= b < 32 * 4]
    # harp arpeggio in the breakdown/build
    harp = arp(ch, [0, 2, 4, 2, 1, 3, 5, 3], 24, 8, rate=0.25, lo=62, vel=0.5, gate=1.5,
               accent=[1.0, 0.7, 0.85, 0.7], avoid=tops)

    bass = deg("R e R e O e R e R e R e O e R e" + " |R e R e O e R e R e R e O e R e" * 7, ch, 0, lo=31) \
        + deg("R e R e O e R e R e O e R e O e" + " |R e R e O e R e R e O e R e O e" * 7, ch, 8, lo=31) \
        + deg("R e R e O e R e R e R e O e R e" + " |R e R e O e R e R e R e O e R e" * 7, ch, 16, lo=31) \
        + deg("R w | R w | R w | R w", ch, 24, lo=31, vel=0.7) \
        + deg("R e R e R e R e R e R e R e R e |" * 3 + "R e R e R e R e R s R s R s R s R e R e", ch, 28, lo=31)

    # ---------------------------------------------------------------- drums
    kick = grid("X.....x.X.......|X.....x.X.....x.", 0, 4) \
        + grid("X...X...X...X...", 8, 8) \
        + grid("X.....x.X.......|X.....x.X.....x.", 16, 3) + grid("X.....x.X.....x.|X.....x.X.x.X.x.", 22) \
        + grid("X...............", 24, 4) + grid("X...X...X...X...", 28, 3) + grid("X...X...X.X.X.X.", 31)
    snare = grid("....X.......X...", 0, 7) + grid("....X.......XxXx", 7) \
        + grid("....X.......X...", 8, 7) + grid("....X...X.x.XxXx", 15) \
        + grid("....X.......X...", 16, 7) + grid("....X.......Xxxx", 23) \
        + grid("X...X...X...X...", 28, vel=0.55) + grid("X.x.X.x.X.x.X.x.", 29, vel=0.65) \
        + grid("xxxxxxxxXxxxXxxx", 30, vel=0.75) + grid("XxXxXxXxXXXXXXXX", 31, vel=0.85)
    clap = grid("....X.......X...", 8, 8) + grid("....X.......X...", 17, 1) + grid("....X.......X...", 19, 1) \
        + grid("....X.......X...", 21, 1) + grid("....X.......X...", 23, 1)
    hatc = grid("x.X.x.X.x.X.x.X.", 0, 8, vel=0.8) + grid("x.X.x.X.x.X.x.X.", 16, 8, vel=0.8) \
        + grid("o.o.o.o.o.o.o.o.", 24, 4, vel=0.7) + grid("x.X.x.X.x.X.x.X.", 28, 4, vel=0.85)
    hato = grid("..x...x...x...x.", 8, 8, vel=0.7)
    shk = grid("gogogogogogogogo", 8, 24, vel=0.8)
    crash = grid("X...............", 0) + grid("X...............", 8) + grid("X...............", 16) \
        + grid("X...............", 24, vel=0.7)
    toms = _kw(grid("........X.......", 15), m=50) + _kw(grid("..........X.....", 15), m=47) \
        + _kw(grid("............X.X.", 15), m=43) + _kw(grid("..............X.", 15, vel=0.9), m=40)
    riser = [Note(28 * 4, 16, 0, 1.0)]

    S.add(
        Track("kick", partial(I.kick, f_hi=175, f_lo=56, decay=0.2, click=0.8, tone=0.25, drive=2.0), kick, "drum",
              lvl=-6.0, eq=[("hp", 38)], group="drums"),
        Track("snare", partial(I.snare, tone_hz=200, decay=0.12), snare, "drum", lvl=-8.5, rev=0.14, group="drums", var=3),
        Track("clap", partial(I.clap, fc=1600), clap, "drum", lvl=-11.0, rev=0.2, pan=0.05, group="drums", var=2),
        Track("hatc", partial(I.hat, decay=0.03), hatc, "drum", lvl=-17.0, pan=0.25, group="drums", var=4),
        Track("hato", partial(I.hat, open_=True, decay=0.18, length=0.4), hato, "drum", lvl=-19.0, pan=0.25, group="drums", var=2),
        Track("shaker", I.shaker, shk, "drum", lvl=-21.0, pan=-0.35, group="drums", var=4),
        Track("crash", partial(I.crash, decay=1.5), crash, "drum", lvl=-14.0, rev=0.1, group="drums"),
        Track("toms", I.tom, toms, "drum", lvl=-10.0, rev=0.12, group="drums"),
        Track("riser", lambda seed=0, **k: I.riser(6.4, 300, 9000, seed=3), riser, "drum", lvl=-17.0, rev=0.2, group="fx"),
        Track("bass", partial(I.bass_synth, peak=1800, floor=280, tau=0.09, drive=1.8, sub=0.6), bass, lvl=-7.5, duck=0.35,
              eq=[("hp", 40)], group="bass"),
        Track("lead", I.mono_line, lead, "line", lvl=-5.0, rev=0.16, dly=0.12,
              vkw=dict(osc="candy", width=0.28, glide=0.03, vib_depth=0.16, cutoff=3800, fenv=2600, ftau=0.08,
                       a=0.004, s=0.75, r=0.09), eq=[("hp", 180), ("peak", 3000, 1.0, -1.5)]),
        Track("glock", partial(I.glock, bright=0.8), glk, lvl=-12.0, rev=0.25, dly=0.15, pan=0.2),
        Track("marimba", partial(I.marimba, hard=0.4), mar, lvl=-12.0, rev=0.15, pan=-0.3),
        Track("stabs", partial(I.pluck_synth, wave="mix", peak=4200, floor=700, tau=0.05, decay=0.16, width=0.4),
              stab_A + stab_B + stab_A2 + stab_C, lvl=-13.0, rev=0.12, duck=0.25,
              ch=dict(rate=0.4, depth_ms=2.0, mix=0.45), eq=[("hp", 250)]),
        Track("pad", partial(I.supersaw, voices=6, detune=0.2, cutoff=2600, a=0.08, r=0.4), pad, lvl=-13.0,
              rev=0.3, duck=0.45, eq=[("hp", 220), ("lp", 9000)]),
        Track("harp", partial(I.ks, kind="harp"), harp, lvl=-13.0, rev=0.25, dly=0.12, pan=-0.2, var=3),
    )
    S.checks = check_harmony(lead, ch, "lead") + check_harmony(glk, ch, "glock")
    return S




# ============================================================================ LOBBY
def song_lobby():
    S = Song("bgm_lobby", 112, 32, key="F major", swing8=0.10,
             desc="cosy, bouncy candy-pop (light shuffle): celesta & whistle leads, ukulele strums, round bass, snaps",
             reverb=dict(rt60=1.25, predelay=0.015, seed=21), delay=dict(beats=0.75, fb=0.28), comp=dict(thr=-16.0, ratio=1.6))
    A = "F | Am7 | Bbmaj7 | C7 | F | Dm7 | Gm7 | C7"
    B = "Bbmaj7 | C | Am7 | Dm7 | Gm7 | Am7 | Bbmaj7 | C7sus4 C7"
    A2 = "F | Am7 | Bbmaj7 | C7 | F | Dm7 | Gm7 C7 | F"
    C = "Dm | Bb | F/A | C | Dm | Bb | Gm7 | C7"
    ch = prog(A, 0) + prog(B, 8) + prog(A2, 16) + prog(C, 24)
    S.chords = ch
    for nm_, b0, t in (("A", 0, A), ("B", 8, B), ("A'", 16, A2), ("C", 24, C)):
        S.section(nm_, b0, 8, t)
    lead_A = """C5e F5e A5e G5e F5q C5q | E5e A5e C6q A5e G5e E5q | D5e F5e Bb5e A5e F5q D5q | E5e G5e C6e Bb5e G5h |
                C5e F5e A5e G5e F5q A5q | D6q. C6e A5q F5q | Bb5e A5e G5e F5e G5q D5q | E5q G5q C6h"""
    lead_B = """F5q. D5e F5q A5q | G5h. E5q | E5q. C5e E5q A5q | F5h. D5q |
                D5q. Bb4e D5q G5q | C6q. A5e G5q E5q | F5q. D5e F5q Bb5q | C6h Bb5e A5e G5q"""
    lead_A2 = """C5e F5e A5e G5e F5q C5q | E5e A5e C6q A5e G5e E5q | D5e F5e Bb5e A5e F5q D5q | E5e G5e C6e Bb5e G5h |
                 C5e F5e A5e G5e F5q A5q | D6q. C6e A5q F5q | Bb5e A5e G5e F5e E5q G5q | F5h. rq"""
    lead_C = """D5e F5e A5e D6e C6q A5q | Bb5q. A5e F5h | A5e C6e F6e E6e C6q A5q | G5h. rq |
                D5e F5e A5e D6e C6q A5q | D6q. C6e Bb5h | Bb5e A5e G5e F5e D5q G5q | C6q Bb5q G5q E5q"""
    cel = mel(lead_A, 0, vel=0.82) + shift(mel(lead_B, 8, vel=0.42), semis=12) + mel(lead_A2, 16, vel=0.82)
    # whistle sings section B an octave up (its natural register, clear of ukulele/e-piano), doubles A' and C
    whis = shift(mel(lead_B, 8, vel=0.85), semis=12) + mel(lead_A2, 16, vel=0.45) + only(mel(lead_C, 24, vel=0.7), 28 * 4, 32 * 4)
    vib = mel(lead_C, 24, vel=0.78) + harmony_below(mel(lead_A2, 16, vel=0.55), ch, F_MAJOR)
    glk = mel("rh. E6e G6e", 9, vel=0.55) + mel("rh. F6e A6e", 11, vel=0.55) + mel("rh. E6e C7e", 13, vel=0.55) \
        + mel("rh. Bb6e G6e", 15, vel=0.55) + mel("rh. A6e C7e", 23, vel=0.5) + mel("rh. E6e G6e", 27, vel=0.5)
    S.lead = cel
    tops = cel + whis + vib
    vu = melody_safe(voicings(ch, 4, 60, 76, drop=(11,)), ch, tops)
    uke = hits(ch, vu, "x...x.o...o.x.o.", 0, 24, gate=0.45, vel=0.62, strum=0.011, updown="pos") \
        + hits(ch, vu, "x...x...x...x...", 24, 4, gate=0.9, vel=0.5, strum=0.016, updown="pos") \
        + hits(ch, vu, "x...x.o...o.x.o.", 28, 4, gate=0.45, vel=0.6, strum=0.011, updown="pos")
    ep = chord_notes(ch, melody_safe(voicings(ch, 4, 53, 70), ch, tops + uke), 0.5, 8, 32)
    harp = arp(ch, [0, 1, 2, 3, 4, 3, 2, 1], 24, 8, rate=0.5, lo=53, vel=0.5, gate=1.2, avoid=tops, drop=(11,))
    bass = deg(rep("R q re R e 5 q O e 5 e", 23) + " | R q re R e 5 q R q", ch, 0, lo=33) \
        + deg(rep("R h 5 h", 4), ch, 24, lo=33, vel=0.75) + deg(rep("R q R q 5 q O q", 4), ch, 28, lo=33)
    kick = grid("X.......x.......|X.......x.....x.", 0, 4) + grid("X.......x...x...", 8, 8) \
        + grid("X.......x.......|X.......x.....x.", 16, 4) + grid("X...............", 24, 4) \
        + grid("X.......x.......|X.......x.....x.", 28, 2)
    snap = grid("....X.......X...", 0, 7) + grid("....X.......X.XX", 7) + grid("....X.......X...", 8, 7) \
        + grid("....X...X.X.XXXX", 15) + grid("....X.......X...", 16, 8) + grid("............X...", 24, 4) \
        + grid("....X.......X...", 28, 3) + grid("....X...X.X.XXXX", 31)
    shk = grid("x.o.x.o.x.o.x.o.", 0, 32, vel=0.8)
    tamb = grid("......x.......x.", 8, 16, vel=0.7)
    hat = grid("..x...x...x...x.", 16, 8, vel=0.6)
    crash = at([0], vel=0.6) + at([16], vel=0.7) + at([28], vel=0.5)
    toms = _kw(grid("........X...X...", 23), m=55) + _kw(grid("..........X...X.", 23), m=50) \
        + _kw(grid("........X.......", 31), m=57) + _kw(grid("..........X.....", 31), m=53) + _kw(grid("............X.X.", 31), m=48)
    S.add(
        Track("kick", partial(I.kick, f_hi=150, f_lo=56, decay=0.17, click=0.45, tone=0.25, drive=1.6), kick, "drum",
              lvl=-8.0, eq=[("hp", 40)], group="drums"),
        Track("snap", I.snap, snap, "drum", lvl=-11.0, rev=0.22, group="drums", var=3),
        Track("shaker", partial(I.shaker, decay=0.04), shk, "drum", lvl=-20.0, pan=-0.3, group="drums", var=4),
        Track("tamb", I.tambourine, tamb, "drum", lvl=-19.0, pan=0.35, rev=0.1, group="drums", var=3),
        Track("hat", partial(I.hat, decay=0.03), hat, "drum", lvl=-21.0, pan=0.25, group="drums", var=3),
        Track("crash", partial(I.crash, decay=1.3, bright=0.8), crash, "drum", lvl=-16.0, rev=0.15, group="drums"),
        Track("toms", partial(I.tom, decay=0.2), toms, "drum", lvl=-12.0, rev=0.15, group="drums"),
        Track("bass", partial(I.bass_round, decay=0.35, tone=0.4, bright=0.85, floor=560.0), bass, lvl=-8.0, duck=0.12, eq=[("hp", 38)], group="bass"),
        Track("celesta", I.celesta, cel, lvl=-7.0, rev=0.2, dly=0.1, pan=0.05),
        Track("whistle", I.mono_line, whis, "line", lvl=-8.5, rev=0.22, dly=0.12, pan=-0.05,
              vkw=dict(osc="sine", glide=0.06, vib_rate=5.4, vib_depth=0.22, vib_delay=0.16, a=0.03, d=0.1, s=0.9, r=0.1,
                       cutoff=6000, fenv=0, breath=0.02)),
        Track("vibes", I.vibes, vib, lvl=-11.0, rev=0.22, pan=0.25),
        Track("uke", partial(I.ks, kind="uke"), uke, lvl=-10.5, rev=0.1, pan=-0.2, var=3, eq=[("hp", 150)]),
        Track("ep", partial(I.epiano, bright=0.45), ep, lvl=-14.0, rev=0.15, ch=dict(rate=0.5, depth_ms=2.0, mix=0.5),
              eq=[("hp", 180)]),
        Track("glock", partial(I.glock, bright=0.7), glk, lvl=-15.0, rev=0.3, dly=0.2, pan=0.3),
        Track("harp", partial(I.ks, kind="harp"), harp, lvl=-13.0, rev=0.25, pan=-0.25, var=3),
    )
    S.checks = check_harmony(cel, ch, "celesta") + check_harmony(whis, ch, "whistle") + check_harmony(vib, ch, "vibes")
    return S


# ============================================================================ LAND 2 - Caramel Canyon
def song_land2():
    S = Song("bgm_land2", 154, 32, key="A minor (harmonic minor)",
             desc="driving sunset western: whistle lead, twang-guitar gallop, mariachi brass, castanets",
             reverb=dict(rt60=1.8, predelay=0.025, seed=31, er=0.8), delay=dict(beats=0.5, fb=0.25, lp=3800),
             comp=dict(thr=-15.0, ratio=1.8))
    A = "Am | Am | Dm | Am | F | G | E7 | E7"
    B = "C | G | Am | Em | F | C | Dm | E7"
    C = "F | G | Am | Am | F | G | E7sus4 | E7"
    ch = prog(A, 0) + prog(B, 8) + prog(A, 16) + prog(C, 24)
    S.chords = ch
    for nm_, b0, t in (("A", 0, A), ("B", 8, B), ("A'", 16, A), ("C", 24, C)):
        S.section(nm_, b0, 8, t)
    wh_A = """A5q E6h. | D6e C6e B5e C6e A5h | D6q A6h. | G6e F6e E6e D6e E6h |
              C6q. A5e C6q F6q | D6q. B5e D6q G6q | B5q E6q G#6h | E6e D6e B5e G#5e E5h"""
    br_B = """E5q. G5e C6h | B5q. A5e G5h | A5q. C6e E6q D6q | B5h. G5q |
              A5q. G5e F5q A5q | G5q. E5e C5h | F5q. E5e D5q F5q | G#5h E5q B4q"""
    wh_C = """rw | rw | rw | rw | C6q. A5e C6q F6q | D6q. B5e D6q G6q | E6h. A6q | G#6q E6q D6q B5q"""
    tw_C = """A4e C5e F5e A5e G5e F5e C5e A4e | B4e D5e G5e B5e A5e G5e D5e B4e |
              C5e E5e A5e C6e B5e A5e E5e C5e | E5q A5q C6q E6q"""
    whis = mel(wh_A, 0, vel=0.85) + mel(wh_A, 16, vel=0.85) + mel(wh_C, 24, vel=0.88)
    S.lead = whis
    brass_mel = mel(br_B, 8, vel=0.82)
    brass2 = harmony_below(brass_mel, ch, A_MINOR | {8})
    brass_ans = mel("rh [C5,E5]e_ [C5,E5]e_ [C5,E5]q", 17, vel=0.75) + mel("rh [E5,A5]e_ [E5,A5]e_ [E5,A5]q", 19, vel=0.75) \
        + mel("rh [B4,E5]e_ [B4,E5]e_ [G#4,D5]q", 23, vel=0.75) + mel("rh [E5,G#5]e_ [E5,G#5]e_ [D5,B5]q", 31, vel=0.8)
    twang = mel(tw_C, 24, vel=0.8)
    tops = whis + brass_mel + twang
    vg = melody_safe(voicings(ch, 3, 52, 67), ch, tops)
    gtr = hits(ch, vg, "x.xxx...x.xxx...", 0, 8, gate=0.2, vel=0.7, strum=0.006) \
        + hits(ch, vg, "x..x..x...x.x...", 8, 8, gate=0.4, vel=0.62, strum=0.008) \
        + hits(ch, vg, "x.xxx...x.xxx...", 16, 8, gate=0.2, vel=0.7, strum=0.006) \
        + hits(ch, vg, "x.xxx...x.xxx...", 28, 4, gate=0.2, vel=0.75, strum=0.006)
    vs = melody_safe(voicings(ch, 4, 55, 74), ch, tops)
    strings = chord_notes(ch, vs, 0.6, 8, 16) + chord_notes(ch, vs, 0.45, 16, 24) + chord_notes(ch, vs, 0.62, 24, 32)
    gal = "R e R s R s 5 e 5 s 5 s R e R s R s 5 e 5 s 5 s"
    bass = deg(rep(gal, 8), ch, 0, lo=33) + deg(rep("R q 5 q R q 5 q", 8), ch, 8, lo=33) + deg(rep(gal, 8), ch, 16, lo=33) \
        + deg(rep("R h 5 h", 4), ch, 24, lo=33) + deg(rep(gal, 4), ch, 28, lo=33)
    kick = grid("X.......X.......", 0, 8) + grid("X...X...X...X...", 8, 8) + grid("X.......X.......", 16, 7) \
        + grid("X.......X...X.X.", 23) + grid("X.......X.......", 24, 4) + grid("X...X...X...X...", 28, 3) + grid("X...X...X.X.X.X.", 31)
    snare = grid("....X.......X...", 0, 7) + grid("....X.......XxXx", 7) + grid("....X.......X...", 8, 7) \
        + grid("....X...X.x.XxXx", 15) + grid("....X.......X...", 16, 7) + grid("....X.......Xxxx", 23) \
        + grid("....X.......X...", 24, 6) + grid("X.x.X.x.X.x.X.x.", 30, vel=0.7) + grid("XxXxXxXxXXXXXXXX", 31, vel=0.8)
    hats = grid("x.xxx.xxx.xxx.xx", 0, 8, vel=0.55) + grid("x.xxx.xxx.xxx.xx", 16, 8, vel=0.55) + grid("x.xxx.xxx.xxx.xx", 28, 4, vel=0.6)
    tamb = grid("x.x.x.x.x.x.x.x.", 8, 8, vel=0.6) + grid("..x...x...x...x.", 16, 8, vel=0.6) + grid("..x...x...x...x.", 24, 4, vel=0.5)
    cast = grid("x..x..x...x.x...", 8, 8, vel=0.8) + grid("x..x..x...x.x...", 28, 4, vel=0.7)
    wood = grid("..x...x...x...x.", 0, 8, vel=0.6) + grid("..x...x...x...x.", 24, 4, vel=0.6)
    crash = at([0, 8, 16, 28]) + at([24], vel=0.6)
    toms = _kw(grid("........X.xx....", 15), m=50) + _kw(grid("............X.xx", 15), m=45) \
        + _kw(grid("........X.xx....", 31), m=52) + _kw(grid("............X.xx", 31), m=47)
    S.add(
        Track("kick", partial(I.kick, f_hi=160, f_lo=55, decay=0.2, click=0.6, tone=0.2, drive=1.8), kick, "drum",
              lvl=-6.5, eq=[("hp", 38)], group="drums"),
        Track("snare", partial(I.snare, tone_hz=210, decay=0.11, snappy=0.75), snare, "drum", lvl=-9.0, rev=0.16, group="drums", var=3),
        Track("hats", partial(I.hat, decay=0.025), hats, "drum", lvl=-18.0, pan=0.3, group="drums", var=4),
        Track("tamb", I.tambourine, tamb, "drum", lvl=-18.0, pan=-0.35, group="drums", var=3),
        Track("cast", I.castanet, cast, "drum", lvl=-16.0, pan=0.4, rev=0.12, group="drums", var=3),
        Track("wood", partial(I.woodblock, f=1150), wood, "drum", lvl=-17.0, pan=-0.4, rev=0.1, group="drums", var=2),
        Track("crash", partial(I.crash, decay=1.6), crash, "drum", lvl=-14.5, rev=0.1, group="drums"),
        Track("toms", partial(I.tom, decay=0.22), toms, "drum", lvl=-10.0, rev=0.15, group="drums"),
        Track("bass", partial(I.bass_synth, peak=1300, floor=240, tau=0.06, drive=1.7, sub=0.55, s=0.5), bass, lvl=-8.0,
              duck=0.2, eq=[("hp", 40)], group="bass"),
        Track("whistle", I.mono_line, whis, "line", lvl=-5.5, rev=0.25, dly=0.16,
              vkw=dict(osc="sine", glide=0.07, glide_max=12, vib_rate=6.0, vib_depth=0.28, vib_delay=0.14, a=0.025,
                       d=0.1, s=0.92, r=0.12, cutoff=7000, fenv=0, breath=0.025)),
        Track("brass", partial(I.brass, voices=3, bright=0.9), brass_mel + brass2 + brass_ans, lvl=-8.5, rev=0.2, dly=0.08,
              pan=0.1, eq=[("hp", 150)]),
        Track("gtr", partial(I.ks, kind="twang"), gtr, lvl=-11.0, rev=0.12, dly=0.1, pan=-0.25, var=3, trem=(6.5, 0.3),
              eq=[("hp", 120)]),
        Track("twang", partial(I.ks, kind="twang", rel=0.12), twang, lvl=-8.0, rev=0.2, dly=0.18, pan=0.2, var=3,
              trem=(6.5, 0.25)),
        Track("strings", partial(I.strings, a=0.25, r=0.45, cutoff=2400), strings, lvl=-14.0, rev=0.3, duck=0.2,
              eq=[("hp", 200)]),
    )
    S.checks = check_harmony(whis, ch, "whistle") + check_harmony(brass_mel, ch, "brass") + check_harmony(twang, ch, "twang")
    return S


# ============================================================================ LAND 3 - Cocoa Cavern
def song_land3():
    S = Song("bgm_land3", 158, 32, key="F# minor",
             desc="mysterious minor groove in a chocolate cave: marimba lead, deep syncopated bass, kalimba, drips, choir",
             reverb=dict(rt60=2.6, predelay=0.03, seed=41, er=0.9, early_span=0.09), delay=dict(beats=0.75, fb=0.42, lp=3500),
             comp=dict(thr=-15.0, ratio=1.8))
    A = "F#m | D | E | F#m | F#m | D | Bm7 | C#7"
    B = "D | E | C#m7 | F#m | Bm7 | E | Dmaj7 | C#7sus4 C#7"
    C = "Bm | C#m | D | E | Bm | C#m | Dmaj7 | C#7"
    ch = prog(A, 0) + prog(B, 8) + prog(A, 16) + prog(C, 24)
    S.chords = ch
    for nm_, b0, t in (("A", 0, A), ("B", 8, B), ("A'", 16, A), ("C", 24, C)):
        S.section(nm_, b0, 8, t)
    mar_A = """F#5e. A5s C#6e B5e A5e G#5e F#5q | D5e. F#5s A5e G#5e F#5e E5e D5q | E5e. G#5s B5e A5e G#5e F#5e E5q |
               C#6q. B5e A5q G#5q | F#5e. A5s C#6e B5e A5e G#5e F#5q | D6e. C#6s A5e F#5e A5e B5e A5q |
               B5e. A5s F#5e D5e F#5e A5e B5q | C#6q B5e G#5e E#5q C#5q"""
    mar_B = """A5q. F#5e A5q D6q | B5h. G#5q | G#5q. E5e G#5q C#6q | A5h. F#5q |
               F#5q. D5e F#5q B5q | G#5q. B5e E6h | C#6q. A5e F#5q A5q | F#5h E#5h"""
    bell_C = "D5w | E5w | F#5w | G#5w | B5w | C#6w | C#6h A5h | G#5h E#5h"
    m_a = mel(mar_A, 0, vel=0.85)
    m_b = mel(mar_B, 8, vel=0.82)
    m_a2 = mel(mar_A, 16, vel=0.85)
    mar = m_a + roll(m_b) + m_a2 + arp(ch, [0, 1, 2, 3, 4, 3, 2, 1], 24, 8, rate=0.25, lo=66, vel=0.55, gate=1.0,
                                     accent=[1.0, 0.7, 0.8, 0.7])
    S.lead = m_a + m_b + m_a2
    kal = shift(m_a2, semis=12, vel=0.45) + arp(ch, [0, 2, 1, 3], 8, 8, rate=1.0, lo=78, vel=0.42, gate=1.0)
    bell = mel(bell_C, 24, vel=0.7)
    drips = []
    for k in range(16):
        b = (2 * k) * 4 + 3.5
        c = chord_at(ch, b)
        tones = [m for m in range(76, 88) if m % 12 in c.pcs]
        drips.append(Note(b, 0.5, tones[(k * 2) % len(tones)], 0.5))
    tops = S.lead + bell + kal
    vch = melody_safe(voicings(ch, 4, 57, 74, drop=(11,)), ch, tops)
    choir = chord_notes(ch, vch, 0.6, 8, 16) + chord_notes(ch, vch, 0.66, 24, 32)
    pad = chord_notes(ch, melody_safe(voicings(ch, 4, 49, 69), ch, tops + choir), 0.55, 16, 32)
    bass = deg(rep("R e. R s re R e re R e O e 5 e", 8), ch, 0, lo=30) + deg(rep("R q. R e re R e O q", 8), ch, 8, lo=30) \
        + deg(rep("R e. R s re R e re R e O e 5 e", 8), ch, 16, lo=30) + deg(rep("R h. R q", 4), ch, 24, lo=30, vel=0.8) \
        + deg(rep("R e R e R e R e R e R e R e R e", 4), ch, 28, lo=30)
    kick = grid("X.....X...X.....|X.....X...X...x.", 0, 4) + grid("X.....X.X.....X.", 8, 8) \
        + grid("X.....X...X.....|X.....X...X...x.", 16, 4) + grid("X.......X.......", 24, 4) \
        + grid("X...X...X...X...", 28, 3) + grid("X...X...X.X.XXXX", 31)
    snare = grid("....X..g.g..X..g", 0, 7) + grid("....X.......Xxxx", 7) + grid("....X..g.g..X..g", 8, 7) \
        + grid("....X...X.x.XxXx", 15) + grid("....X..g.g..X..g", 16, 7) + grid("....X.......XXXX", 23) \
        + grid("............X...", 24, 4) + grid("....X.......X...", 28, 2) + grid("X.x.X.x.X.x.X.x.", 30, vel=0.7) \
        + grid("XxxxXxxxXxXxXXXX", 31, vel=0.8)
    hats = grid("xgxgxgxgxgxgxgxg", 0, 24, vel=0.6) + grid("x.x.x.x.x.x.x.x.", 24, 8, vel=0.6)
    shk = grid("..x...x...x...x.", 8, 8, vel=0.7) + grid("gxgxgxgxgxgxgxgx", 28, 4, vel=0.6)
    rim = grid("..x..x....x..x..", 0, 8, vel=0.6) + grid("..x..x....x..x..", 16, 8, vel=0.6)
    toms = _kw(grid("..x.......x.....", 24, 8, vel=0.8), m=45) + _kw(grid("......x......x..", 24, 8, vel=0.7), m=40) \
        + _kw(grid("........X.xx....", 15), m=47) + _kw(grid("............X.xx", 15), m=42)
    crash = at([0, 8, 16, 28]) + at([24], vel=0.6)
    S.add(
        Track("kick", partial(I.kick, f_hi=150, f_lo=50, decay=0.22, click=0.7, tone=0.2, drive=2.0), kick, "drum",
              lvl=-6.0, eq=[("hp", 34)], group="drums"),
        Track("snare", partial(I.snare, tone_hz=230, decay=0.09, snappy=0.7, tone=0.45), snare, "drum", lvl=-9.5,
              rev=0.22, group="drums", var=3),
        Track("rim", I.rim, rim, "drum", lvl=-17.0, pan=0.3, rev=0.25, group="drums", var=2),
        Track("hats", partial(I.hat, decay=0.022, metal=0.3), hats, "drum", lvl=-19.0, pan=0.25, group="drums", var=4),
        Track("shaker", I.shaker, shk, "drum", lvl=-21.0, pan=-0.35, group="drums", var=4),
        Track("toms", partial(I.tom, decay=0.3), toms, "drum", lvl=-11.0, rev=0.25, pan=-0.1, group="drums"),
        Track("crash", partial(I.crash, decay=1.8, bright=0.85), crash, "drum", lvl=-15.0, rev=0.2, group="drums"),
        Track("bass", partial(I.bass_sub, growl=0.7, drive=1.7, growl_fc=1100.0), bass, lvl=-6.5, duck=0.25, eq=[("hp", 32)], group="bass"),
        Track("marimba", partial(I.marimba, hard=0.55), mar, lvl=-6.0, rev=0.2, dly=0.1),
        Track("kalimba", I.kalimba, kal, lvl=-14.0, rev=0.3, dly=0.15, pan=0.35),
        Track("bell", partial(I.fm_bell, ratio=2.0, index=1.6, decay=2.0), bell, lvl=-11.0, rev=0.35, dly=0.2, pan=-0.15),
        Track("drips", partial(I.fm_bell, ratio=1.0, index=0.8, decay=0.6), drips, lvl=-17.0, rev=0.45, dly=0.45, pan=0.45),
        Track("pad", partial(I.strings, a=0.35, r=0.5, cutoff=1500, voices=4), pad, lvl=-15.0, rev=0.3, duck=0.3,
              eq=[("hp", 150), ("lp", 4000)]),
        Track("choir", partial(I.choir, vowel="oo", a=0.3), choir, lvl=-14.0, rev=0.4, duck=0.2),
    )
    S.checks = check_harmony(S.lead, ch, "marimba") + check_harmony(bell, ch, "bell")
    return S


# ============================================================================ LAND 4 - Sherbet Glacier
def song_land4():
    S = Song("bgm_land4", 162, 32, key="E major (Lydian colour)",
             desc="sparkly icy: glockenspiel + celesta lead, 16th bell arps, shimmering pad, sleigh bells",
             reverb=dict(rt60=2.3, predelay=0.025, seed=51, hf=1.2), delay=dict(beats=0.75, fb=0.38, lp=6000),
             comp=dict(thr=-15.0, ratio=1.8))
    A = "Emaj7 | F#/E | Emaj7 | F#/E | C#m7 | Amaj7 | F#m7 | B7sus4 B7"
    B = "Amaj7 | B | G#m7 | C#m7 | F#m7 | G#m7 | Amaj7 | B7sus4 B7"
    C = "C#m7 | G#m7 | Amaj7 | E/G# | F#m7 | E/G# | Amaj7 | B7"
    ch = prog(A, 0) + prog(B, 8) + prog(A, 16) + prog(C, 24)
    S.chords = ch
    for nm_, b0, t in (("A", 0, A), ("B", 8, B), ("A'", 16, A), ("C", 24, C)):
        S.section(nm_, b0, 8, t)
    glk_A = """B5e E6e G#6e F#6e E6q B5q | A#5e C#6e F#6q. E6e C#6q | B5e E6e G#6e B6e G#6q E6q | F#6q. E6e C#6q A#5q |
               G#5e C#6e E6e G#6e F#6e E6e C#6q | E6q. C#6e A5q G#5q | A5e C#6e F#6e E6e C#6q A5q | E6h D#6q F#6q"""
    glk_B = """C#6h. B5q | D#6h. F#6q | D#6q. B5e G#5h | E6h. C#6q |
               C#6q. E6e A6h | G#6q. F#6e D#6h | E6q. C#6e A5q C#6q | B5h D#6q F#6q"""
    cel_C = "E6w | D#6w | C#6w | B5w | A5w | G#5w | A5h C#6h | D#6h F#6h"
    g_a, g_b, g_a2 = mel(glk_A, 0, vel=0.85), mel(glk_B, 8, vel=0.85), mel(glk_A, 16, vel=0.85)
    glk = g_a + g_b + g_a2
    S.lead = glk
    cel = shift(g_a, semis=-12, vel=0.7) + shift(g_a2, semis=-12, vel=0.7) + mel(cel_C, 24, vel=0.8)
    tops = glk + cel
    strings = shift(g_b, semis=-12, vel=0.7) + chord_notes(ch, melody_safe(voicings(ch, 3, 59, 76), ch, tops), 0.5, 24, 32)
    arps = arp(ch, [0, 1, 2, 3, 2, 1, 2, 3], 16, 8, rate=0.25, lo=76, vel=0.45, gate=1.2, accent=[1, 0.6, 0.8, 0.6],
               avoid=tops) \
        + arp(ch, [0, 1, 2, 3, 4, 3, 2, 1], 24, 8, rate=0.25, lo=76, vel=0.5, gate=1.2, accent=[1, 0.6, 0.8, 0.6], avoid=tops)
    vpad = melody_safe(voicings(ch, 4, 59, 78, drop=(11,)), ch, tops + strings)
    pad = chord_notes(ch, vpad, 0.45, 0, 8) + chord_notes(ch, vpad, 0.6, 8, 16) + chord_notes(ch, vpad, 0.45, 16, 24) \
        + chord_notes(ch, vpad, 0.6, 24, 32)
    bass = deg(rep("R e R e O e R e R e R e O e 5 e", 8), ch, 0, lo=28) + deg(rep("R e O e R e O e R e O e R e O e", 8), ch, 8, lo=28) \
        + deg(rep("R e R e O e R e R e R e O e 5 e", 8), ch, 16, lo=28) + deg(rep("R w", 4), ch, 24, lo=28, vel=0.75) \
        + deg(rep("R e R e R e R e R e R e R e R e", 4), ch, 28, lo=28)
    kick = grid("X.......X.x.....|X.......X.......", 0, 4) + grid("X...X...X...X...", 8, 8) \
        + grid("X.......X.x.....|X.......X.......", 16, 3) + grid("X.......X.x.....|X.......X...X.X.", 22) \
        + grid("X...............", 24, 4) + grid("X...X...X...X...", 28, 3) + grid("X...X...X.X.XXXX", 31)
    snare = grid("....X.......X...", 0, 7) + grid("....X.......XxXx", 7) + grid("....X.......X...", 8, 7) \
        + grid("....X...X.x.XxXx", 15) + grid("....X.......X...", 16, 7) + grid("....X.......Xxxx", 23) \
        + grid("X...X...X...X...", 28, vel=0.5) + grid("X.x.X.x.X.x.X.x.", 29, vel=0.6) \
        + grid("xxxxxxxxXxxxXxxx", 30, vel=0.7) + grid("XxXxXxXxXXXXXXXX", 31, vel=0.8)
    hats = grid("x.x.x.x.x.x.x.x.", 0, 8, vel=0.7) + grid("x.x.x.x.x.x.x.x.", 16, 8, vel=0.7) + grid("x.x.x.x.x.x.x.x.", 28, 4, vel=0.7)
    sleigh = grid("xoxoxoxoxoxoxoxo", 8, 16, vel=0.7) + grid("x...x...x...x...", 24, 4, vel=0.6)
    ride = grid("x...x...x...x...", 16, 8, vel=0.7)
    crash = at([0, 8, 16, 28]) + at([24], vel=0.55)
    riser = [Note(28 * 4, 16, 0, 1.0)]
    S.add(
        Track("kick", partial(I.kick, f_hi=180, f_lo=58, decay=0.18, click=0.8, tone=0.25, drive=1.8), kick, "drum",
              lvl=-6.5, eq=[("hp", 40)], group="drums"),
        Track("snare", partial(I.snare, tone_hz=220, decay=0.13, snappy=0.85), snare, "drum", lvl=-9.0, rev=0.3, group="drums", var=3),
        Track("hats", partial(I.hat, decay=0.028), hats, "drum", lvl=-18.0, pan=0.25, group="drums", var=4),
        Track("sleigh", I.sleigh, sleigh, "drum", lvl=-19.0, pan=-0.35, rev=0.15, group="drums", var=4),
        Track("ride", partial(I.ride, decay=0.7, bell=0.6), ride, "drum", lvl=-19.0, pan=0.35, rev=0.1, group="drums", var=2),
        Track("crash", partial(I.crash, decay=1.8), crash, "drum", lvl=-14.5, rev=0.15, group="drums"),
        Track("riser", lambda seed=0, **k: I.riser(4 * 4 * 60 / 162, 400, 10000, seed=5), riser, "drum", lvl=-17.0, rev=0.3, group="fx"),
        Track("bass", partial(I.bass_synth, peak=1500, floor=300, tau=0.08, drive=1.6, sub=0.6), bass, lvl=-8.0, duck=0.3,
              eq=[("hp", 40)], group="bass"),
        Track("glock", partial(I.glock, bright=0.75), glk, lvl=-6.5, rev=0.25, dly=0.12, pan=0.05),
        Track("celesta", I.celesta, cel, lvl=-10.0, rev=0.25, dly=0.1, pan=-0.15),
        Track("strings", partial(I.strings, a=0.12, r=0.35, cutoff=3200), strings, lvl=-11.0, rev=0.3, duck=0.15,
              eq=[("hp", 200)]),
        Track("arps", partial(I.fm_bell, ratio=3.0, index=1.2, decay=0.6), arps, lvl=-15.0, rev=0.3, dly=0.25, pan=0.3),
        Track("pad", partial(I.supersaw, voices=7, detune=0.16, cutoff=4200, a=0.35, r=0.6), pad, lvl=-14.0, rev=0.4, duck=0.4,
              ch=dict(rate=0.3, depth_ms=2.5, mix=0.4), eq=[("hp", 300), ("lp", 9000)]),
    )
    S.checks = check_harmony(glk, ch, "glock") + check_harmony(mel(cel_C, 24), ch, "celesta")
    return S


# ============================================================================ LAND 5 - Starlight Castle
def song_land5():
    S = Song("bgm_land5", 168, 32, key="C minor (Eb major chorus)",
             desc="epic & heroic: synth-brass lead, spiccato string ostinato, choir, timpani, big drums",
             reverb=dict(rt60=2.8, predelay=0.03, seed=61), delay=dict(beats=0.5, fb=0.3, lp=4000),
             comp=dict(thr=-14.0, ratio=2.0))
    A = "Cm | Ab | Bb | Cm | Cm | Ab | Fm | G7"
    B = "Ab | Bb | Eb | Cm | Fm | Bb | Eb | G7"
    C = "Ab | Bb | Cm | Cm | Ab | Bb | G7sus4 | G7"
    ch = prog(A, 0) + prog(B, 8) + prog(A, 16) + prog(C, 24)
    S.chords = ch
    for nm_, b0, t in (("A", 0, A), ("B", 8, B), ("A'", 16, A), ("C", 24, C)):
        S.section(nm_, b0, 8, t)
    br_A = """G4q C5q. D5e Eb5q | Eb5q. D5e C5h | D5q. Eb5e F5q Bb5q | G5h. Eb5q |
              G4q C5q. D5e Eb5q | Ab5q. G5e Eb5q C5q | F5q. G5e Ab5q C6q | B5q. C6e D6h"""
    br_B = """C6h. Bb5e Ab5e | Bb5q. F5e D6h | Eb6h D6e C6e Bb5q | C6h G5h |
              Ab5q. G5e F5q C6q | D6q. C6e Bb5q F5q | G5q. Ab5e Bb5q Eb6q | D6h B5q G5q"""
    bells_C = "Eb5h C5h | D5h F5h | Eb5h G5h | C6w"
    br_C = "Ab4q C5q Eb5q Ab5q | Bb4q D5q F5q Bb5q | C5q D5q G5q C6q | D6w"
    b_a, b_b, b_a2, b_c = mel(br_A, 0, vel=0.85), mel(br_B, 8, vel=0.9), mel(br_A, 16, vel=0.9), mel(br_C, 28, vel=0.9)
    lead = b_a + b_b + b_a2 + b_c
    S.lead = lead
    br2 = harmony_below(b_b + b_a2 + b_c, ch, C_MINOR | {11})
    str_lead = b_a2 + shift(b_b, vel=0.8)
    bells = mel(bells_C, 24, vel=0.8) + mel("C6w", 0, vel=0.5) + mel("C6w", 16, vel=0.6)
    ost = arp(ch, [0, 0, 2, 0, 1, 0, 2, 0], 0, 32, rate=0.5, lo=60, vel=0.72, gate=0.6, accent=[1.0, 0.7, 0.85, 0.7],
              avoid=lead)
    tops = lead + bells
    choir = chord_notes(ch, melody_safe(voicings(ch, 4, 55, 74), ch, tops), 0.6, 8, 32)
    vsp = melody_safe(voicings(ch, 4, 48, 67), ch, tops)
    spad = chord_notes(ch, vsp, 0.5, 8, 16) + chord_notes(ch, vsp, 0.55, 24, 32)
    bass = deg(rep("R e O e R e O e R e O e R e O e", 8), ch, 0, lo=31) + deg(rep("R e O e R e O e R e O e R e O e", 8), ch, 8, lo=31) \
        + deg(rep("R e O e R e O e R e O e R e O e", 8), ch, 16, lo=31) + deg(rep("R w", 4), ch, 24, lo=31, vel=0.8) \
        + deg(rep("R e R e R e R e R e R e R e R e", 4), ch, 28, lo=31)
    timp = deg(rep("R h r h", 8), ch, 0, lo=36, vel=0.9) + deg(rep("R h R h", 8), ch, 16, lo=36, vel=0.85) \
        + deg(rep("R q r q R q r q", 4), ch, 24, lo=36, vel=0.8) + deg("R s R s R s R s R s R s R s R s R s R s R s R s R s R s R s R s | R s R s R s R s R s R s R s R s R s R s R s R s R q", ch, 30, lo=36, vel=0.6)
    kick = grid("X.......X.X.....|X.....X.X.......", 0, 4) + grid("X...X...X...X...", 8, 8) \
        + grid("X.......X.X.....|X.....X.X.......", 16, 3) + grid("X.......X.X.....|X.....X.X.X.X.X.", 22) \
        + grid("X.......X.......", 24, 4) + grid("X...X...X...X...", 28, 3) + grid("X.X.X.X.X.XXXXXX", 31)
    snare = grid("....X.......X...", 0, 7) + grid("....X.......XXXX", 7) + grid("....X.......X...", 8, 7) \
        + grid("....X...X.X.XXXX", 15) + grid("....X.......X...", 16, 7) + grid("....X.......XXXX", 23) \
        + grid("....X.......X...", 28, 2) + grid("X.x.X.x.X.x.X.x.", 30, vel=0.75) + grid("XxXxXxXxXXXXXXXX", 31, vel=0.85)
    hats = grid("x.x.x.x.x.x.x.x.", 0, 8, vel=0.6) + grid("x.x.x.x.x.x.x.x.", 16, 8, vel=0.6)
    ridepat = grid("x.x.x.x.x.x.x.x.", 8, 8, vel=0.6)
    taiko = _kw(grid("X..X..X.X..X.X..", 24, 4, vel=0.9), m=43) + _kw(grid("....X.......X.X.", 24, 4, vel=0.8), m=38) \
        + _kw(grid("........X.X.XXXX", 15), m=45) + _kw(grid("............X.X.", 23), m=41)
    crash = at([0, 8, 16, 24, 28])
    swell = [Note(7 * 4 + 2.0, 2, 0, 1.0), Note(23 * 4 + 2.0, 2, 0, 1.0)]
    S.add(
        Track("kick", partial(I.kick, f_hi=150, f_lo=50, decay=0.26, click=0.7, tone=0.2, drive=2.2), kick, "drum",
              lvl=-6.0, eq=[("hp", 34)], group="drums"),
        Track("snare", partial(I.snare, tone_hz=180, decay=0.16, snappy=0.85, tone=0.6), snare, "drum", lvl=-8.0,
              rev=0.32, group="drums", var=3),
        Track("hats", partial(I.hat, decay=0.03), hats, "drum", lvl=-19.0, pan=0.25, group="drums", var=4),
        Track("ride", partial(I.ride, decay=0.9, bell=0.3), ridepat, "drum", lvl=-19.0, pan=0.3, rev=0.1, group="drums", var=2),
        Track("taiko", partial(I.tom, decay=0.35, bend=0.4), taiko, "drum", lvl=-8.5, rev=0.3, group="drums"),
        Track("crash", partial(I.crash, decay=2.0), crash, "drum", lvl=-14.0, rev=0.2, group="drums"),
        Track("swell", lambda seed=0, **k: I.rev_cymbal(2 * 60 / 168 * 1.0, seed=2), swell, "drum", lvl=-16.0, rev=0.2, group="fx"),
        Track("timp", partial(I.timpani_note, decay=0.9), timp, lvl=-10.0, rev=0.3, group="drums"),
        Track("bass", partial(I.bass_synth, peak=1500, floor=260, tau=0.07, drive=1.8, sub=0.55), bass, lvl=-8.0,
              duck=0.25, eq=[("hp", 38)], group="bass"),
        Track("brass", partial(I.brass, voices=3, bright=1.0), lead, lvl=-5.0, rev=0.25, dly=0.06),
        Track("brass2", partial(I.brass, voices=3, bright=0.8), br2, lvl=-11.0, rev=0.25, pan=-0.25),
        Track("strlead", partial(I.strings, a=0.06, r=0.3, cutoff=3500), str_lead, lvl=-11.0, rev=0.3, pan=0.2),
        Track("ost", partial(I.spiccato, cutoff=3200), ost, lvl=-11.0, rev=0.22, pan=0.3, eq=[("hp", 180)]),
        Track("choir", partial(I.choir, vowel="ah", a=0.25), choir, lvl=-13.0, rev=0.45, duck=0.2),
        Track("spad", partial(I.strings, a=0.3, r=0.5, cutoff=2000), spad, lvl=-14.0, rev=0.35, duck=0.25, eq=[("hp", 150)]),
        Track("bells", partial(I.fm_bell, ratio=3.5, index=1.4, decay=2.2), bells, lvl=-12.0, rev=0.4, pan=-0.2),
    )
    S.checks = check_harmony(lead, ch, "brass") + check_harmony(mel(bells_C, 24), ch, "bells")
    return S


# ============================================================================ SUGAR RUSH bonus
def song_rush():
    S = Song("bgm_rush", 184, 16, key="D major",
             desc="euphoric hyper-fast sugar rush: supersaw lead, sparkling 16th bell arps, pumping chords, four-on-the-floor",
             reverb=dict(rt60=1.6, predelay=0.015, seed=71, hf=1.1), delay=dict(beats=0.75, fb=0.35, lp=6000),
             comp=dict(thr=-14.0, ratio=2.0))
    A = "D | A | Bm | G | D | A | G | A"
    B = "Bm | G | D | A | Bm | G | Em7 | A7sus4 A7"
    ch = prog(A, 0) + prog(B, 8)
    S.chords = ch
    S.section("A", 0, 8, A)
    S.section("B", 8, 8, B)
    lead_t = """F#5e A5e D6e C#6e D6q A5q | E5e A5e C#6e B5e C#6q E6q | D6e C#6e B5e A5e B5q F#5q | G5e A5e B5e D6e B5h |
                F#5e A5e D6e C#6e D6q F#6q | E6q. C#6e A5h | B5e D6e G6e F#6e E6q D6q | C#6q E6q A6h |
                F#6q. D6e B5h | G6q. D6e B5h | A6q. F#6e D6h | E6q. C#6e A5h |
                D6e F#6e D6e B5e F#5q B5q | D6e B5e G5e B5e D6q G6q | E6q. D6e B5q G5q | A5q D6q C#6q E6q"""
    lead = mel(lead_t, 0, vel=0.9)
    S.lead = lead
    low = shift(lead, semis=-12, vel=0.8)
    arps = arp(ch, [0, 1, 2, 3, 4, 3, 2, 1], 0, 16, rate=0.25, lo=86, vel=0.5, gate=1.0, accent=[1, 0.6, 0.8, 0.6],
               avoid=lead)
    vo = melody_safe(voicings(ch, 4, 57, 76), ch, lead)
    stabs = hits(ch, vo, "..x...x...x...x.", 0, 16, gate=0.35, vel=0.7)
    pad = chord_notes(ch, melody_safe(voicings(ch, 4, 52, 72), ch, lead), 0.5, 0, 16)
    glk = gliss(7 * 4 + 2, 2, 74, 98, D_MAJOR, vel=0.5, note_dur=0.5) + gliss(15 * 4 + 2, 2, 74, 98, D_MAJOR, vel=0.55, note_dur=0.5)
    bass = deg(rep("R e O e R e O e R e O e R e O e", 16), ch, 0, lo=33)
    kick = grid("X...X...X...X...", 0, 15) + grid("X...X...X.X.XXXX", 15)
    clap = grid("....X.......X...", 0, 16)
    snare = grid("....X.......X...", 0, 7) + grid("....X.......XXXX", 7) + grid("....X.......X...", 8, 6) \
        + grid("X.x.X.x.X.x.X.x.", 14, vel=0.6) + grid("XxXxXxXxXXXXXXXX", 15, vel=0.75)
    hato = grid("..x...x...x...x.", 0, 16, vel=0.75)
    hatc = grid("xgxgxgxgxgxgxgxg", 0, 16, vel=0.55)
    crash = at([0, 8])
    riser = [Note(14 * 4, 8, 0, 1.0)]
    S.add(
        Track("kick", partial(I.kick, f_hi=190, f_lo=56, decay=0.17, click=0.9, tone=0.25, drive=2.2), kick, "drum",
              lvl=-6.0, eq=[("hp", 40)], group="drums"),
        Track("clap", partial(I.clap, fc=1500), clap, "drum", lvl=-10.0, rev=0.22, group="drums", var=3),
        Track("snare", partial(I.snare, tone_hz=220, decay=0.1), snare, "drum", lvl=-11.0, rev=0.2, group="drums", var=3),
        Track("hato", partial(I.hat, open_=True, decay=0.12, length=0.3), hato, "drum", lvl=-17.0, pan=0.2, group="drums", var=3),
        Track("hatc", partial(I.hat, decay=0.02), hatc, "drum", lvl=-21.0, pan=-0.25, group="drums", var=4),
        Track("crash", partial(I.crash, decay=1.5), crash, "drum", lvl=-14.0, rev=0.15, group="drums"),
        Track("riser", lambda seed=0, **k: I.riser(2 * 4 * 60 / 184, 500, 11000, seed=7), riser, "drum", lvl=-15.0, rev=0.25, group="fx"),
        Track("bass", partial(I.bass_synth, peak=2000, floor=320, tau=0.05, drive=2.0, sub=0.6), bass, lvl=-8.0, duck=0.5,
              eq=[("hp", 40)], group="bass"),
        Track("lead", I.mono_line, lead, "line", lvl=-5.0, rev=0.2, dly=0.14,
              vkw=dict(osc="supersaw", glide=0.025, vib_depth=0.1, vib_delay=0.2, cutoff=4200, fenv=2500, ftau=0.1,
                       a=0.004, s=0.85, r=0.1), eq=[("hp", 200), ("lp", 9000)]),
        Track("leadlo", I.mono_line, low, "line", lvl=-11.0, rev=0.15,
              vkw=dict(osc="saw", glide=0.025, vib_depth=0.08, cutoff=2400, fenv=1500, a=0.004, s=0.8, r=0.08),
              eq=[("hp", 150)]),
        Track("arps", partial(I.fm_bell, ratio=2.0, index=1.1, decay=0.35), arps, lvl=-14.0, rev=0.25, dly=0.2, pan=0.3),
        Track("stabs", partial(I.supersaw, voices=5, detune=0.18, cutoff=3800, a=0.003, d=0.12, s=0.3, r=0.08), stabs,
              lvl=-12.0, rev=0.15, duck=0.4, eq=[("hp", 250)]),
        Track("pad", partial(I.supersaw, voices=7, detune=0.22, cutoff=2800, a=0.15, r=0.4), pad, lvl=-15.0, rev=0.35,
              duck=0.6, eq=[("hp", 250)]),
        Track("glock", partial(I.glock, bright=0.8), glk, lvl=-14.0, rev=0.3, pan=-0.3),
    )
    S.checks = check_harmony(lead, ch, "lead")
    return S


# ============================================================================ RESULT
def song_result():
    S = Song("bgm_result", 100, 16, key="Bb major", swing8=0.06,
             desc="warm, gentle, satisfied: flute melody, FM e-piano, harp arpeggios, brushed groove",
             reverb=dict(rt60=1.9, predelay=0.02, seed=81), delay=dict(beats=0.75, fb=0.3, lp=4000), comp=dict(thr=-17.0, ratio=1.5))
    A = "Bbmaj7 | Gm7 | Cm7 | F7 | Bbmaj7 | Gm7 | Ebmaj7 | F7sus4 F7"
    B = "Ebmaj7 | Dm7 | Cm7 | F7 | Ebmaj7 | Dm7 G7 | Cm7 | F7sus4 F7"
    ch = prog(A, 0) + prog(B, 8)
    S.chords = ch
    S.section("A", 0, 8, A)
    S.section("B", 8, 8, B)
    fl_t = """F5q. D5e F5q Bb5q | Bb5q. A5e G5h | Eb5q. C5e Eb5q G5q | A5h. C6q |
              D6q. C6e Bb5q F5q | G5q. A5e Bb5q D6q | Bb5q. G5e Eb5q G5q | F5h Eb5q C5q |
              G5q. Bb5e D6h | C6q. A5e F5h | Bb5q. G5e Eb5h | A5h. C6q |
              Bb5q. G5e Bb5q Eb6q | D6q C6q B5q G5q | Eb6q. D6e C6q G5q | Bb5h A5h"""
    fl = mel(fl_t, 0, vel=0.8)
    S.lead = fl
    vib = harmony_below(only(fl, 32, 64), ch, BB_MAJOR)
    ep = chord_notes(ch, melody_safe(voicings(ch, 4, 53, 70), ch, fl + vib), 0.55, 0, 16)
    harp = arp(ch, [0, 1, 2, 3, 4, 3, 2, 1], 0, 16, rate=0.5, lo=50, vel=0.5, gate=1.4, avoid=fl + vib, drop=(11,))
    strings = chord_notes(ch, melody_safe(voicings(ch, 4, 58, 77, drop=(11,)), ch, fl + vib), 0.45, 8, 16)
    bass = deg(rep("R q. R e 5 h", 15) + " | R h 5 q R q", ch, 0, lo=34, vel=0.75)
    kick = grid("X.........x.....", 0, 16, vel=0.7)
    brush = grid("....X.......X...", 0, 15, vel=0.7) + grid("....X.......X.xx", 15, vel=0.7)
    shk = grid("x.o.x.o.x.o.x.o.", 0, 16, vel=0.6)
    rim = grid("..........x.....", 8, 8, vel=0.5)
    S.add(
        Track("kick", partial(I.kick, f_hi=120, f_lo=52, decay=0.2, click=0.3, tone=0.15, drive=1.3), kick, "drum",
              lvl=-10.0, eq=[("hp", 38)], group="drums"),
        Track("brush", partial(I.snare, tone_hz=190, decay=0.2, snappy=0.6, tone=0.25, bright=0.7), brush, "drum",
              lvl=-14.0, rev=0.25, group="drums", var=3),
        Track("shaker", partial(I.shaker, decay=0.05), shk, "drum", lvl=-21.0, pan=-0.3, group="drums", var=4),
        Track("rim", I.rim, rim, "drum", lvl=-19.0, pan=0.3, rev=0.25, group="drums", var=2),
        Track("bass", partial(I.bass_round, decay=0.6, tone=0.3, bend=0.1, bright=0.75, floor=520.0), bass, lvl=-9.0, eq=[("hp", 38)], group="bass"),
        Track("flute", I.flute, fl, lvl=-6.0, rev=0.25, dly=0.12),
        Track("vibes", I.vibes, vib, lvl=-13.0, rev=0.25, pan=0.25),
        Track("ep", partial(I.epiano, bright=0.5), ep, lvl=-11.0, rev=0.2, ch=dict(rate=0.6, depth_ms=2.0, mix=0.5),
              eq=[("hp", 150)]),
        Track("harp", partial(I.ks, kind="harp"), harp, lvl=-12.0, rev=0.3, pan=-0.25, var=3),
        Track("strings", partial(I.strings, a=0.4, r=0.6, cutoff=2400), strings, lvl=-15.0, rev=0.35, eq=[("hp", 200)]),
    )
    S.checks = check_harmony(fl, ch, "flute") + check_harmony(vib, ch, "vibes")
    return S


# ============================================================================ JINGLES (one-shots)
def jingle_over():
    S = Song("jingle_over", 120, 2, key="F major", loop=False, length=3.1,
             desc="cute 'aww': chromatic droop A-Ab-G, then a warm resolving F(add9) chord with a sparkle",
             reverb=dict(rt60=1.5, predelay=0.015, seed=91), delay=dict(beats=0.5, fb=0.25), comp=dict(thr=-16.0, ratio=1.5))
    ch = prog("F Fm C7sus4 C7 | Fadd9", 0)
    lead = mel("A5q Ab5q G5h | F5h rh", 0, vel=0.8)
    cel = mel("rw | [F5,A5]e C6e F6q rh", 0, vel=0.75)
    glk = mel("rw | rq F6e A6e C7h", 0, vel=0.5)
    ep = mel("[F3,A3,C4]q [F3,Ab3,C4]q [Bb3,C4,F4]q [Bb3,C4,E4]q | [F3,A3,C4,G4]h rh", 0, vel=0.55)
    pizz = mel("F3e_ re Ab3e_ re C4e_ re C3e_ re | F3e_ rq. rh", 0, vel=0.7)
    bass = mel("rw | F2q rq rh", 0, vel=0.85)
    harp = gliss(4.0, 0.5, 65, 89, F_MAJOR, vel=0.45, note_dur=1.0)
    snap = grid("X.......X.......|X...............", 0, vel=0.6)
    S.add(
        Track("lead", I.mono_line, lead, "line", lvl=-6.0, rev=0.25, dly=0.12,
              vkw=dict(osc="tri", glide=0.09, glide_max=3, vib_rate=5.0, vib_depth=0.35, vib_delay=0.12, a=0.02, d=0.1,
                       s=0.85, r=0.25, cutoff=4500, fenv=1000)),
        Track("cel", I.celesta, cel, lvl=-9.0, rev=0.3),
        Track("glock", partial(I.glock, bright=0.7), glk, lvl=-13.0, rev=0.35, pan=0.25),
        Track("ep", partial(I.epiano, bright=0.4), ep, lvl=-11.0, rev=0.2, ch=dict(rate=0.6, depth_ms=2.0, mix=0.5)),
        Track("pizz", partial(I.ks, kind="pizz"), pizz, lvl=-12.0, rev=0.2, pan=-0.2),
        Track("bass", partial(I.bass_round, decay=0.5), bass, lvl=-9.0),
        Track("harp", partial(I.ks, kind="harp"), harp, lvl=-14.0, rev=0.35, pan=-0.3),
        Track("snap", I.snap, snap, "drum", lvl=-15.0, rev=0.2),
    )
    S.checks = []
    return S


def jingle_clear():
    S = Song("jingle_clear", 140, 2, key="C major", loop=False, length=3.55,
             desc="bright fanfare: brass arpeggio C-E-G-C-E-D-C over C - G7 - C, timpani, crash, glock sparkle",
             reverb=dict(rt60=1.9, predelay=0.02, seed=92), delay=dict(beats=0.5, fb=0.25), comp=dict(thr=-15.0, ratio=1.8))
    ch = prog("C:3.5 G7:0.5 | C", 0)
    br = mel("C5e E5e G5e C6e E6q. D6e | C6h. rq", 0, vel=0.9)
    br2 = mel("[G4]e [C5]e [E5]e [G5]e [C6]q. [B5]e | [G5,E5]h. rq", 0, vel=0.8)
    strings = mel("[C4,G4,E5]h. [B3,F4,D5]q | [C4,G4,E5,C6]h. rq", 0, vel=0.6)
    glk = mel("rw | rq C7e G6e E7h", 0, vel=0.45) + gliss(4.0, 0.75, 84, 100, C_MAJOR, vel=0.5, note_dur=1.0)
    bass = mel("C2q C2q C2q G1q | C2h. rq", 0, vel=0.85)
    timp = mel("C2q rq rq G1q | C2q rq rh", 0, vel=0.9)
    snare = grid("rrrrrrrr........|X...............", 0, vel=0.7)
    kick = grid("X.............x.|X...............", 0)
    crash = grid("X...............|X...............", 0)
    S.add(
        Track("brass", partial(I.brass, voices=3, bright=1.1), br, lvl=-5.0, rev=0.25, dly=0.08),
        Track("brass2", partial(I.brass, voices=3, bright=0.9), br2, lvl=-10.0, rev=0.25, pan=-0.3),
        Track("strings", partial(I.strings, a=0.05, r=0.4, cutoff=3500), strings, lvl=-11.0, rev=0.35, pan=0.25),
        Track("glock", partial(I.glock, bright=0.8), glk, lvl=-12.0, rev=0.35, pan=0.25),
        Track("bass", partial(I.bass_synth, peak=1200, floor=250, drive=1.5), bass, lvl=-9.0),
        Track("timp", partial(I.timpani_note, decay=0.9), timp, lvl=-10.0, rev=0.3),
        Track("snare", partial(I.snare, tone_hz=200, decay=0.1), snare, "drum", lvl=-13.0, rev=0.25),
        Track("kick", partial(I.kick, f_hi=150, f_lo=52, decay=0.3, drive=2.0), kick, "drum", lvl=-8.0),
        Track("crash", partial(I.crash, decay=1.8), crash, "drum", lvl=-13.0, rev=0.2),
    )
    S.checks = check_harmony(br, ch, "brass")
    return S


SONGS = {
    "bgm_lobby": song_lobby, "bgm_land1": song_land1, "bgm_land2": song_land2, "bgm_land3": song_land3,
    "bgm_land4": song_land4, "bgm_land5": song_land5, "bgm_rush": song_rush, "bgm_result": song_result,
    "jingle_over": jingle_over, "jingle_clear": jingle_clear,
}
