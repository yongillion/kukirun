"""DESSERT DASH audio toolkit - instrument voices and drum kit.

Every voice returns a mono float64 array (or (n,2) for stereo voices) that starts sounding at
sample 0 and ends at exactly zero.  Signature convention:  voice(m, dur, vel, **params)
  m   : MIDI note number (float allowed)
  dur : note-on length in seconds (release / ring-out is appended after it)
  vel : 0..1
"""
import numpy as np
from scipy import signal

from synth import (SR, TWO_PI, bq, butter, dc_block, env_adsr, env_exp_seg, env_perc, env_seg,
                   fade_edges, fm_op, mtof, noise, ns, onepole_hp, onepole_lp, osc_pulse, osc_saw,
                   osc_sine, osc_tri, phase_acc, rng, saturate, tline, tvf, vibrato_curve)


def _finish(y, fout=0.006, fin=0.0):
    y = fade_edges(y, fin, fout)
    return y


# ============================================================================ mallets / bells
def _modal(f, n, modes, seed=None, phase_rand=False):
    """Sum of exponentially decaying sinusoidal modes [(ratio, amp, tau), ...]."""
    t = tline(n)
    y = np.zeros(n)
    r = rng("modal", seed) if phase_rand else None
    for ratio, amp, tau in modes:
        fr = f * ratio
        if fr > 17500 or amp <= 0:
            continue
        ph = r.uniform(0, 1) if r is not None else 0.0
        y += amp * np.exp(-t / tau) * np.sin(TWO_PI * (fr * t + ph))
    return y


def glock(m, dur, vel=0.8, bright=1.0, decay=1.0, ring=None):
    """Glockenspiel: free-bar modes 1 : 2.76 : 5.40 : 8.93, hard mallet tick."""
    f = mtof(m)
    k = (880.0 / f) ** 0.35
    T = ring if ring is not None else min(3.0, 2.2 * 0.75 * k * decay + 0.3)
    n = ns(T)
    modes = [(1.0, 1.0, 0.75 * k * decay), (2.756, 0.32 * bright, 0.20 * k), (5.404, 0.12 * bright, 0.07 * k),
             (8.933, 0.05 * bright, 0.035 * k)]
    y = _modal(f, n, modes)
    tick = noise(ns(0.004), "glk", int(m)) * env_perc(ns(0.004), 0.0002, 0.0008)
    tick = onepole_hp(tick, 3000) * 0.12 * bright
    y[: len(tick)] += tick
    y *= np.clip(tline(n) / 0.0008, 0, 1)
    return _finish(y * vel * 0.9, 0.05)


def celesta(m, dur, vel=0.8, decay=1.0):
    """Celesta / music-box: nearly harmonic plate with soft hammer."""
    f = mtof(m)
    k = (660.0 / f) ** 0.4
    T = min(3.0, 1.1 * k * decay + 0.25)
    n = ns(T)
    modes = [(1.0, 1.0, 0.55 * k * decay), (2.0, 0.28, 0.22 * k), (3.0, 0.10, 0.11 * k), (4.07, 0.07, 0.05 * k),
             (6.27, 0.03, 0.025 * k)]
    y = _modal(f, n, modes)
    y *= np.clip(tline(n) / 0.0012, 0, 1)
    return _finish(y * vel * 0.9, 0.06)


def marimba(m, dur, vel=0.8, hard=0.5, decay=1.0):
    """Marimba: tuned bar (1 : 4 : 9.9), resonator-reinforced fundamental, soft mallet thump."""
    f = mtof(m)
    tau1 = float(np.clip(0.42 * (440.0 / f) ** 0.55, 0.12, 1.1)) * decay
    T = tau1 * 4.0 + 0.05
    n = ns(T)
    modes = [(1.0, 1.0, tau1), (3.98, 0.20 + 0.25 * hard, tau1 * 0.22), (9.9, 0.05 + 0.08 * hard, tau1 * 0.06)]
    y = _modal(f, n, modes)
    th = butter(noise(ns(0.006), "mrb", int(m)), "lowpass", min(4000, 6 * f), 2) * env_perc(ns(0.006), 0.0003, 0.0015)
    y[: len(th)] += th * (0.15 + 0.2 * hard)
    y *= np.clip(tline(n) / 0.0012, 0, 1)
    return _finish(y * vel, 0.03)


def vibes(m, dur, vel=0.8, trem=5.2, decay=1.0):
    """Vibraphone with motor tremolo (soft, warm)."""
    f = mtof(m)
    T = min(3.5, dur + 1.6) * decay
    n = ns(T)
    t = tline(n)
    modes = [(1.0, 1.0, 1.5 * decay), (4.0, 0.12, 0.25), (10.0, 0.025, 0.06)]
    y = _modal(f, n, modes)
    y *= 1.0 - 0.28 * (0.5 - 0.5 * np.cos(TWO_PI * trem * t))
    # damper: notes shorter than ring get damped after dur
    rel = np.where(t > dur + 0.3, np.exp(-(t - dur - 0.3) / 0.15), 1.0)
    y *= rel * np.clip(t / 0.002, 0, 1)
    return _finish(y * vel, 0.05)


def kalimba(m, dur, vel=0.8, decay=1.0):
    f = mtof(m)
    k = (440.0 / f) ** 0.4
    T = min(2.5, 1.2 * k * decay + 0.1)
    n = ns(T)
    modes = [(1.0, 1.0, 0.5 * k * decay), (5.92, 0.18, 0.04 * k), (2.0, 0.06, 0.2 * k), (12.1, 0.05, 0.012)]
    y = _modal(f, n, modes)
    buzz = noise(ns(0.01), "kal", int(m)) * env_perc(ns(0.01), 0.0002, 0.002)
    y[: len(buzz)] += onepole_hp(buzz, 1500) * 0.15
    y *= np.clip(tline(n) / 0.0008, 0, 1)
    return _finish(y * vel, 0.04)


def fm_bell(m, dur, vel=0.8, ratio=3.5, index=2.5, decay=1.2, bright=1.0):
    """Two-op FM bell (inharmonic ratio) for sparkles and chimes."""
    f = mtof(m)
    T = min(4.0, decay * (660.0 / f) ** 0.3 + 0.3)
    n = ns(T)
    t = tline(n)
    I = index * bright * min(1.0, (700.0 / f) ** 0.6) * (0.08 + 0.92 * np.exp(-t / (0.12 * decay))) * vel
    maxside = f * (ratio + I.max() + 1)
    if maxside > 18000:
        I *= max(0.0, (18000.0 / f - ratio - 1)) / max(I.max(), 1e-6)
    y = np.sin(TWO_PI * f * t + I * np.sin(TWO_PI * f * ratio * t))
    y = bq(y, "lowpass", min(12000.0, f * 9), 0.6)
    y *= env_perc(n, 0.0008, decay * 0.45 * (660.0 / f) ** 0.3)
    return _finish(y * vel * 0.85, 0.05)


def epiano(m, dur, vel=0.7, bright=0.6, decay=1.0, rel=0.18):
    """FM electric piano: 1:1 modulator for the body + 1:14 'tine' transient."""
    f = mtof(m)
    n = ns(dur + rel)
    t = tline(n)
    i1 = (0.35 + 1.5 * vel * bright) * np.exp(-t / 0.45) + 0.18
    y1 = np.sin(TWO_PI * f * t + i1 * np.sin(TWO_PI * f * t))
    tr = 14.0 if f < 1250 else 7.0
    i2 = 1.3 * vel * bright * np.exp(-t / 0.018)
    y2 = np.sin(TWO_PI * f * t + i2 * np.sin(TWO_PI * f * tr * t))
    tau = float(np.clip(1.8 * (262.0 / f) ** 0.45, 0.35, 3.0)) * decay
    a = np.exp(-t / tau) * np.clip(t / 0.0015, 0, 1)
    a *= np.where(t > dur, np.exp(-(t - dur) / (rel / 4.5)) * np.clip(1 - (t - dur) / rel, 0, 1), 1.0)
    y = (y1 + 0.22 * y2) * a
    return _finish(y * vel * 0.8, 0.004)


# ============================================================================ plucked strings
_KS = {
    # t60(s @ A3), excitation lowpass, pick position, body EQ, mute release (s)
    "guitar": dict(t60=3.0, exc_lp=3800, pick=0.16, bright=0.5, body=[(110, 3.0, 2.5), (1050, 1.2, 2.0)], rel=0.06),
    "harp":   dict(t60=3.6, exc_lp=2600, pick=0.30, bright=0.5, body=[(220, 1.0, 1.5)], rel=0.5),
    "uke":    dict(t60=1.5, exc_lp=3000, pick=0.22, bright=0.5, body=[(330, 2.0, 3.0), (2200, 1.5, 2.0)], rel=0.05),
    "pizz":   dict(t60=0.55, exc_lp=2000, pick=0.24, bright=0.5, body=[(260, 1.0, 3.0), (900, 1.5, 2.0)], rel=0.04),
    "twang":  dict(t60=2.4, exc_lp=8000, pick=0.07, bright=0.5, body=[(180, 2.0, 2.0), (2800, 2.0, 3.0)], rel=0.05),
    "bass":   dict(t60=1.6, exc_lp=1300, pick=0.20, bright=0.5, body=[(90, 1.0, 2.0)], rel=0.04),
}


def ks(m, dur, vel=0.8, kind="guitar", var=0, t60=None, rel=None, exc_lp=None):
    """Karplus-Strong string with exact (allpass) fractional tuning, via a single IIR (lfilter)."""
    P = dict(_KS[kind])
    if t60 is not None:
        P["t60"] = t60
    if rel is not None:
        P["rel"] = rel
    if exc_lp is not None:
        P["exc_lp"] = exc_lp
    f = float(mtof(m))
    T60 = P["t60"] * (220.0 / f) ** 0.35
    D = SR / f                       # loop delay (samples)
    N = int(np.floor(D - 0.5 - 0.1))  # integer part; allpass gives the rest in [0.1, 1.1)
    d = D - 0.5 - N
    w0 = TWO_PI * f / SR
    c = np.sin(w0 * (1 - d) / 2) / np.sin(w0 * (1 + d) / 2)
    g = 0.001 ** (1.0 / (f * T60)) / np.cos(w0 / 2)
    g = min(g, 0.99995)
    total = ns(min(dur + P["rel"] + 0.02, T60 + 0.1)) if P["rel"] < 0.3 else ns(min(dur + P["rel"] * 4, T60 * 1.1) + 0.02)
    total = max(total, ns(0.05))
    r = rng("ks", kind, round(m * 8), var)
    exc = r.uniform(-1, 1, N + 1)
    exc = butter(exc, "lowpass", min(P["exc_lp"] * (0.6 + 0.6 * vel), 0.45 * SR), 2)
    pk = max(1, int(P["pick"] * N))
    exc = exc - np.concatenate([np.zeros(pk), exc[:-pk]])
    exc -= exc.mean()
    x = np.zeros(total)
    x[: len(exc)] = exc
    b = np.array([1.0, c])
    a = np.zeros(N + 3)
    a[0] = 1.0
    a[1] = c
    a[N] -= 0.5 * g * c
    a[N + 1] -= 0.5 * g * (1 + c)
    a[N + 2] -= 0.5 * g
    y = signal.lfilter(b, a, x)
    for f0, gdb, q in P["body"]:
        y = bq(y, "peak", f0, q, gdb)
    y = dc_block(y, 25.0)
    t = tline(total)
    # mute after note-off
    rr = P["rel"]
    y *= np.where(t > dur, np.exp(-(t - dur) / (rr / 3.0)), 1.0)
    y /= np.max(np.abs(y[: ns(0.05)])) + 1e-9
    return _finish(y * vel, 0.008)


# ============================================================================ synth voices
def supersaw(m, dur, vel=0.7, voices=7, detune=0.22, cutoff=3200, q=0.6, a=0.06, d=0.4, s=0.8, r=0.35,
             hp=160.0, width=0.9, seed=0, fenv=0.0, ftau=0.25):
    """Stereo detuned saw stack (pads / leads). Returns (n, 2)."""
    f = float(mtof(m))
    env = env_adsr(dur, a, d, s, r)
    n = len(env)
    t = tline(n)
    rr = rng("ssaw", seed, round(m * 4))
    offs = np.linspace(-1, 1, voices)
    offs = np.sign(offs) * np.abs(offs) ** 1.4 * detune
    L = np.zeros(n)
    R = np.zeros(n)
    for i, o in enumerate(offs):
        sgl = osc_saw(f * 2 ** (o / 12), n, rr.uniform(0, 1))
        p = (i / (voices - 1) * 2 - 1) * width if voices > 1 else 0
        L += sgl * np.sqrt(0.5 * (1 - p))
        R += sgl * np.sqrt(0.5 * (1 + p))
    if fenv:
        fc = cutoff * (1 + fenv * np.exp(-t / ftau))
        L = tvf(L, fc, q)
        R = tvf(R, fc, q)
    else:
        L = bq(L, "lowpass", cutoff, q)
        R = bq(R, "lowpass", cutoff, q)
    y = np.stack([L, R], 1) / np.sqrt(voices)
    if hp:
        y = butter(y, "highpass", hp, 2)
    y *= env[:, None]
    return _finish(y * vel * 0.7, 0.01)


def strings(m, dur, vel=0.7, voices=4, a=0.18, d=0.3, s=0.9, r=0.35, cutoff=2600, seed=0, width=0.8):
    """Synth string ensemble: detuned saws with gentle vibrato, slow bow attack. Stereo."""
    f = float(mtof(m))
    env = env_adsr(dur, a, d, s, r, a_pow=1.6)
    n = len(env)
    rr = rng("str", seed, round(m * 4))
    L = np.zeros(n)
    R = np.zeros(n)
    for i in range(voices):
        det = (i - (voices - 1) / 2) * 0.07
        vib = vibrato_curve(n, 5.0 + 0.4 * i, 0.07, 0.15, 0.3, rr.uniform(0, 1))
        fr = f * 2 ** ((det + vib) / 12)
        sgl = osc_saw(fr, None, rr.uniform(0, 1))
        p = (i / max(voices - 1, 1) * 2 - 1) * width
        L += sgl * np.sqrt(0.5 * (1 - p))
        R += sgl * np.sqrt(0.5 * (1 + p))
    y = np.stack([L, R], 1) / np.sqrt(voices)
    fc = min(cutoff * (0.75 + 0.5 * vel), 9000)
    y = bq(y, "lowpass", fc, 0.6)
    y = bq(y, "peak", 1300, 1.0, 2.0)
    y = butter(y, "highpass", 140, 2)
    y *= env[:, None]
    return _finish(y * vel * 0.8, 0.01)


def spiccato(m, dur, vel=0.8, seed=0, cutoff=3000):
    """Short bowed string note (ostinato), mono."""
    f = float(mtof(m))
    n = ns(min(dur, 0.25) + 0.12)
    rr = rng("spic", seed, round(m * 4))
    t = tline(n)
    y = np.zeros(n)
    for i in range(3):
        y += osc_saw(f * 2 ** ((i - 1) * 0.06 / 12), n, rr.uniform(0, 1))
    y /= 3
    fc = cutoff * (0.5 + 0.8 * np.exp(-t / 0.05)) * (0.7 + 0.4 * vel)
    y = tvf(y, fc, 0.7)
    y = bq(y, "peak", 1100, 1.2, 2.5)
    bow = butter(noise(n, "bow", round(m)), "bandpass", [1500, 6000], 2) * env_perc(n, 0.002, 0.02) * 0.15
    env = env_adsr(min(dur, 0.25), 0.006, 0.09, 0.25, 0.08, total=n / SR)
    y = (y + bow) * env
    y = butter(y, "highpass", 120, 2)
    return _finish(y * vel, 0.01)


def brass(m, dur, vel=0.8, voices=3, bright=1.0, a=0.03, r=0.14, vib=0.1, seed=0, fall=False):
    """Synth brass: detuned saws through an enveloped low-pass with a pitch scoop."""
    f = float(mtof(m))
    env = env_adsr(dur, a, 0.25, 0.82, r)
    n = len(env)
    t = tline(n)
    rr = rng("brass", seed, round(m * 4))
    scoop = -0.35 * np.exp(-t / 0.035)
    vv = vibrato_curve(n, 5.3, vib, 0.25, 0.3, rr.uniform(0, 1))
    pitch = scoop + vv
    if fall:
        pitch = pitch - 2.5 * np.clip((t - dur * 0.6) / (dur * 0.5 + 1e-3), 0, 1) ** 2
    y = np.zeros(n)
    for i in range(voices):
        det = (i - (voices - 1) / 2) * 0.08
        y += osc_saw(f * 2 ** ((pitch + det) / 12), None, rr.uniform(0, 1))
    y /= voices
    peak = (1400 + 3200 * vel) * bright
    fc = f * 1.2 + peak * (1 - np.exp(-t / 0.035)) * (0.62 + 0.38 * np.exp(-t / 0.25))
    fc *= np.where(t > dur, np.exp(-(t - dur) / 0.08), 1.0)
    y = tvf(y, np.maximum(fc, f * 1.1), 0.9)
    y = bq(y, "peak", 1200, 1.0, 2.0)
    y = butter(y, "highpass", 90, 2)
    y = saturate(y * 1.4, 1.2)
    y *= env
    return _finish(y * vel * 0.8, 0.01)


def choir(m, dur, vel=0.7, vowel="ah", a=0.25, r=0.5, voices=5, seed=0):
    """Formant-filtered saw ensemble 'aah'/'ooh'. Stereo."""
    F = {"ah": [(750, 1.0, 6.0), (1150, 0.5, 8.0), (2850, 0.12, 10.0)],
         "oo": [(380, 1.0, 6.0), (750, 0.35, 8.0), (2400, 0.05, 10.0)],
         "eh": [(550, 1.0, 6.0), (1800, 0.4, 9.0), (2600, 0.12, 10.0)]}[vowel]
    f = float(mtof(m))
    env = env_adsr(dur, a, 0.3, 0.9, r, a_pow=1.5)
    n = len(env)
    rr = rng("choir", seed, round(m * 4))
    L = np.zeros(n)
    R = np.zeros(n)
    for i in range(voices):
        vib = vibrato_curve(n, 4.6 + 0.5 * rr.uniform(), 0.12, 0.1, 0.4, rr.uniform(0, 1))
        det = (i - (voices - 1) / 2) * 0.09
        sgl = osc_saw(f * 2 ** ((det + vib) / 12), None, rr.uniform(0, 1))
        p = (i / max(voices - 1, 1) * 2 - 1) * 0.8
        L += sgl * np.sqrt(0.5 * (1 - p))
        R += sgl * np.sqrt(0.5 * (1 + p))
    y = np.stack([L, R], 1) / np.sqrt(voices)
    out = np.zeros_like(y)
    for fc, g, q in F:
        out += g * bq(y, "bandpass", fc, q)
    out = butter(out, "highpass", 150, 2)
    out *= env[:, None] * 2.2
    return _finish(out * vel, 0.02)


def flute(m, dur, vel=0.7, vib=0.13, breath=0.10, a=0.045, r=0.12, seed=0):
    f = float(mtof(m))
    env = env_adsr(dur, a, 0.12, 0.88, r, a_pow=1.3)
    n = len(env)
    t = tline(n)
    rr = rng("flute", seed, round(m * 4))
    pv = vibrato_curve(n, 5.0, vib, 0.22, 0.3, rr.uniform(0, 1))
    fr = f * 2 ** (pv / 12)
    ph = phase_acc(fr)
    y = np.sin(TWO_PI * ph) + 0.12 * np.sin(2 * TWO_PI * ph) + 0.04 * np.sin(3 * TWO_PI * ph)
    br = noise(n, "flb", seed, round(m))
    chiff = bq(br, "bandpass", min(f * 2.5, 9000), 2.0) * env_perc(n, 0.004, 0.035) * 0.6
    hiss = bq(br, "bandpass", min(f * 1.0, 9000), 6.0) * breath * 2.0 + bq(onepole_hp(br, 3000), "lowpass", 7000) * breath * 0.06
    y = y * env + (hiss * env + chiff)
    return _finish(y * vel * 0.8, 0.01)


def pluck_synth(m, dur, vel=0.7, wave="saw", peak=5500, floor=500, tau=0.07, decay=0.22, q=1.1, r=0.05,
                sub=0.0, width=0.5, seed=0):
    """Analog-style pluck: saw/pulse through a fast decaying filter envelope."""
    f = float(mtof(m))
    n = ns(dur + r)
    t = tline(n)
    if wave == "saw":
        y = osc_saw(f, n)
    elif wave == "pulse":
        y = osc_pulse(f, n, width)
    else:
        y = 0.6 * osc_saw(f * 2 ** (0.08 / 12), n) + 0.6 * osc_pulse(f * 2 ** (-0.08 / 12), n, width, 0.3)
    if sub:
        y = y + sub * osc_sine(f / 2, n)
    fc = floor + (peak * (0.5 + 0.5 * vel) - floor) * np.exp(-t / tau)
    y = tvf(y, np.minimum(fc, 16000), q)
    env = np.exp(-t / decay) * np.clip(t / 0.0015, 0, 1)
    env *= np.where(t > dur, np.exp(-(t - dur) / (r / 4)) * np.clip(1 - (t - dur) / r, 0, 1), 1.0)
    return _finish(y * env * vel * 0.8, 0.003)


def organ_soft(m, dur, vel=0.6, a=0.02, r=0.12):
    f = float(mtof(m))
    env = env_adsr(dur, a, 0.1, 1.0, r)
    n = len(env)
    y = sum(g * osc_sine(f * h, n) for h, g in [(1, 1.0), (2, 0.45), (3, 0.18), (4, 0.12), (6, 0.05)])
    return _finish(y * env * vel * 0.5, 0.01)


# ============================================================================ basses
def bass_synth(m, dur, vel=0.8, peak=1600, floor=280, tau=0.11, q=0.9, sub=0.75, saw=0.55, drive=1.6,
               a=0.002, s=0.85, r=0.035, sq=0.0):
    """Sub sine + filtered saw (+ optional square) with filter envelope - audible on phone speakers."""
    f = float(mtof(m))
    n = ns(dur + r)
    t = tline(n)
    y = sub * np.sin(TWO_PI * f * t)
    bright = saw * osc_saw(f, n) + sq * osc_pulse(f, n, 0.5)
    fc = floor + (peak * (0.55 + 0.45 * vel) - floor) * np.exp(-t / tau)
    y = y + tvf(bright, fc, q)
    y = saturate(y, drive)
    env = env_adsr(dur, a, 0.15, s, r, total=n / SR)
    return _finish(y * env * vel, 0.004)


def bass_round(m, dur, vel=0.8, decay=0.45, r=0.05, bend=0.25, tone=0.35, bright=0.5, floor=380.0):
    """Bouncy round bass: sine+triangle with a little downward pitch 'boing' at the attack, plus an
    enveloped low-passed saw layer so the line stays audible on small (phone) speakers."""
    f = float(mtof(m))
    n = ns(dur + r)
    t = tline(n)
    fr = f * 2 ** (bend * np.exp(-t / 0.018) / 12)
    ph = phase_acc(fr)
    y = np.sin(TWO_PI * ph) + tone * (1 - 4 * np.abs(((ph + 0.25) % 1) - 0.5)) + 0.22 * np.sin(2 * TWO_PI * ph) \
        + 0.08 * np.sin(3 * TWO_PI * ph)
    if bright:
        fc = floor + 1100 * np.exp(-t / 0.09)
        y = y + bright * tvf(osc_saw(fr), fc, 0.8)
    y = saturate(y * 0.9, 1.5)
    env = np.exp(-t / decay) * 0.6 + 0.4 * np.exp(-t / (decay * 3))
    env *= np.clip(t / 0.002, 0, 1)
    env *= np.where(t > dur, np.exp(-(t - dur) / (r / 4)) * np.clip(1 - (t - dur) / r, 0, 1), 1.0)
    return _finish(y * env * vel * 0.75, 0.004)


def bass_sub(m, dur, vel=0.8, a=0.004, r=0.06, growl=0.25, drive=1.3, growl_fc=900.0):
    f = float(mtof(m))
    n = ns(dur + r)
    t = tline(n)
    y = np.sin(TWO_PI * f * t) + 0.25 * osc_tri(f, n)
    g = tvf(osc_saw(f, n), growl_fc * (0.7 + 0.6 * np.exp(-t / 0.12)), 0.8) * growl
    y = saturate(y + g, drive)
    env = env_adsr(dur, a, 0.2, 0.85, r, total=n / SR)
    return _finish(y * env * vel * 0.8, 0.004)


# ============================================================================ mono legato line
def mono_line(notes, osc="pulse", width=0.3, glide=0.035, glide_max=7, vib_rate=5.6, vib_depth=0.18,
              vib_delay=0.18, a=0.006, d=0.12, s=0.8, r=0.08, legato_gap=0.03, cutoff=5000, fenv=2500,
              ftau=0.09, q=0.8, detune=0.0, sub=0.0, breath=0.0, seed=0, drive=0.0):
    """Render a monophonic phrase-based line with glide, delayed vibrato and re-articulated notes.
    notes: list of (start_s, dur_s, midi, vel). Returns list of (start_sample, mono_signal)."""
    notes = sorted(notes, key=lambda z: z[0])
    phrases = []
    cur = []
    for nt in notes:
        if cur and nt[0] - (cur[-1][0] + cur[-1][1]) > legato_gap:
            phrases.append(cur)
            cur = []
        cur.append(nt)
    if cur:
        phrases.append(cur)
    out = []
    for ph_i, ph in enumerate(phrases):
        t0 = ph[0][0]
        end = ph[-1][0] + ph[-1][1] + r
        n = ns(end - t0) + 1
        t = tline(n)
        pitch = np.zeros(n)
        amp = np.zeros(n)
        fenv_curve = np.zeros(n)
        vib = np.zeros(n)
        rr = rng("mono", seed, ph_i)
        for i, (st, du, mm, vel) in enumerate(ph):
            s0 = ns(st - t0)
            s1 = ns(st + du - t0) if i == len(ph) - 1 else ns(ph[i + 1][0] - t0)
            seg = np.arange(s0, min(s1, n)) if i < len(ph) - 1 else np.arange(s0, n)
            ts = (seg - s0) / SR
            prev = ph[i - 1][2] if i > 0 else mm
            connected = i > 0 and (st - (ph[i - 1][0] + ph[i - 1][1])) <= legato_gap and abs(mm - prev) <= glide_max
            if connected and glide > 0:
                pitch[seg] = mm + (prev - mm) * np.exp(-ts / (glide / 3.0))
            else:
                pitch[seg] = mm
            vd = np.clip((ts - vib_delay) / 0.25, 0, 1) * vib_depth * min(1.0, du / 0.3)
            vib[seg] = vd * np.sin(TWO_PI * (vib_rate * ts + rr.uniform(0, 1)))
            # articulation envelope for this note (attack + decay to sustain, released at note end)
            n_on = ns(du)
            na = max(1, ns(a))
            e_len = n_on + ns(0.03)
            te = tline(e_len)
            e = np.where(te < a, (te / a), s + (1 - s) * np.exp(-np.maximum(te - a, 0) / (d / 4)))
            e *= np.where(te > du, np.clip(1 - (te - du) / 0.03, 0, 1), 1.0)
            if i == len(ph) - 1:
                tail = tline(ns(r))
                lvl = e[min(n_on, e_len - 1)] if n_on < e_len else e[-1]
                e = np.concatenate([e[:n_on], lvl * np.exp(-tail / (r / 4)) * np.clip(1 - tail / r, 0, 1)])
            if connected:
                e = np.maximum(e, 0.55 * s)  # legato: amplitude dips but never silences
                e[:na] = np.maximum(e[:na], np.linspace(0.55 * s, 1, na))
            idx = np.arange(s0, min(s0 + len(e), n))
            amp[idx] = np.maximum(amp[idx], e[: len(idx)] * vel)
            fe = np.exp(-ts / ftau)
            fenv_curve[seg] = np.maximum(fenv_curve[seg], fe * vel)
        fr = mtof(pitch + vib)
        if osc == "pulse":
            y = osc_pulse(fr, None, width)
        elif osc == "saw":
            y = osc_saw(fr)
        elif osc == "sine":
            pa = phase_acc(fr)
            y = np.sin(TWO_PI * pa) + 0.06 * np.sin(2 * TWO_PI * pa) + 0.02 * np.sin(3 * TWO_PI * pa)
        elif osc == "tri":
            y = osc_tri(fr)
        elif osc == "candy":
            y = 0.75 * osc_pulse(fr, None, width) + 0.35 * osc_saw(fr * 2 ** (0.07 / 12), None, 0.37) + 0.25 * osc_tri(fr * 2)
        elif osc == "supersaw":
            y = np.zeros(n)
            for k, o in enumerate([-0.16, -0.07, 0.0, 0.07, 0.16]):
                y += osc_saw(fr * 2 ** (o / 12), None, rr.uniform(0, 1))
            y /= 2.2
        else:
            raise ValueError(osc)
        if detune:
            y = y + 0.5 * osc_saw(fr * 2 ** (detune / 12), None, 0.5)
        if sub:
            y = y + sub * np.sin(TWO_PI * phase_acc(fr / 2))
        fc = np.minimum(cutoff + fenv * fenv_curve, 16000)
        y = tvf(y, fc, q, block=64)
        if breath:
            br = noise(n, "breath", seed, ph_i)
            y = y + breath * bq(br, "bandpass", 2500, 0.8) * (0.4 + fenv_curve)
        if drive:
            y = saturate(y, drive)
        y *= amp
        y = fade_edges(y, 0.0, 0.004)
        out.append((ns(t0), y))
    return out


# ============================================================================ drums
def kick(f_hi=160.0, f_lo=48.0, ptau=0.032, decay=0.3, click=0.6, drive=1.6, length=0.5, sub=0.0, tone=0.0, seed=0):
    n = ns(length)
    t = tline(n)
    fr = f_lo + (f_hi - f_lo) * np.exp(-t / ptau)
    ph = phase_acc(fr)
    body = np.sin(TWO_PI * ph) + tone * np.sin(2 * TWO_PI * ph) * np.exp(-t / 0.05)
    amp = np.exp(-np.maximum(t - 0.012, 0) / decay)
    y = saturate(body * amp, drive)
    if sub:
        y += sub * np.sin(TWO_PI * f_lo * t) * np.exp(-t / (decay * 1.5)) * np.clip(t / 0.02, 0, 1)
    cn = ns(0.006)
    c = onepole_hp(noise(cn, "kclick"), 1200) * env_perc(cn, 0.0001, 0.0012)
    c = bq(c, "lowpass", 7000)
    y[:cn] += click * 0.5 * c
    y *= np.clip(t / 0.0004, 0, 1)
    return _finish(y * 0.95, 0.02)


def snare(tone_hz=185.0, decay=0.13, tone=0.55, snappy=0.85, bright=1.0, length=0.35, seed=0):
    n = ns(length)
    t = tline(n)
    fr = tone_hz * (1 + 0.25 * np.exp(-t / 0.01))
    ph = phase_acc(fr)
    body = (np.sin(TWO_PI * ph) * np.exp(-t / 0.055) + 0.5 * np.sin(TWO_PI * ph * 1.78) * np.exp(-t / 0.035))
    nz = noise(n, "snare", seed)
    nz = butter(nz, "highpass", 1000 * bright, 2)
    nz = butter(nz, "lowpass", 7500 * bright, 4)
    nz = bq(nz, "peak", 3800, 1.0, 2.0)
    nenv = env_perc(n, 0.0005, decay) * (0.8 + 0.2 * np.exp(-t / 0.01))
    y = tone * body + snappy * nz * nenv * 0.9
    y = saturate(y, 1.3)
    return _finish(y * 0.9, 0.02)


def clap(decay=0.14, spread=0.0095, bursts=4, fc=1500.0, seed=0, length=0.4):
    n = ns(length)
    t = tline(n)
    nz = noise(n, "clap", seed)
    nz = bq(butter(bq(nz, "bandpass", fc, 0.9), "lowpass", 8000, 2), "highpass", 700)
    env = np.zeros(n)
    for k in range(bursts):
        t0 = k * spread * (1 + 0.15 * ((k * 7) % 3 - 1))
        tt = t - t0
        env += np.where(tt >= 0, np.exp(-np.maximum(tt, 0) / 0.0035), 0) * (0.8 if k < bursts - 1 else 1.0)
    tl = t - (bursts - 1) * spread
    env += np.where(tl >= 0, 0.55 * np.exp(-np.maximum(tl, 0) / decay), 0)
    y = nz * env
    y *= np.clip(t / 0.0003, 0, 1)
    return _finish(y * 1.1, 0.02)


def _metal(n, base=1.0, seed="hat"):
    """808-style metallic cluster of six square waves."""
    fr = np.array([205.3, 304.4, 369.6, 522.7, 540.0, 800.0]) * base
    y = np.zeros(n)
    for i, f in enumerate(fr):
        y += osc_pulse(f, n, 0.5, (i * 0.137) % 1)
    return y / 6


def hat(decay=0.035, open_=False, bright=1.0, metal=0.5, seed=0, length=None, hp=7000.0):
    length = length or (0.5 if open_ else 0.12)
    n = ns(length)
    t = tline(n)
    m = _metal(n, 1.0 + 0.01 * seed)
    nz = noise(n, "hat", seed)
    y = metal * bq(m, "bandpass", 9500 * bright, 1.2) * 3 + (1 - metal) * nz
    y = butter(y, "highpass", hp * bright, 2)
    y = butter(y, "lowpass", 12500, 2)
    tau = decay if not open_ else max(decay, 0.18)
    y *= env_perc(n, 0.0003, tau)
    return _finish(y * 0.8, 0.01 if not open_ else 0.04)


def crash(decay=1.6, bright=1.0, seed=0, length=None, stereo=True):
    length = length or decay * 1.8
    n = ns(length)
    t = tline(n)
    out = []
    for ch in range(2 if stereo else 1):
        nz = noise(n, "crash", seed, ch)
        m = _metal(n, 1.37 + 0.02 * ch)
        y = 0.75 * nz + 0.6 * bq(m, "bandpass", 6000, 0.8) * 3
        y = butter(y, "highpass", 2200 * bright, 2)
        fc = 4000 + 9500 * bright * np.exp(-t / (decay * 0.35))
        y = tvf(y, fc, 0.6, block=128)
        env = env_perc(n, 0.0008, decay * 0.45) * 0.7 + 0.3 * env_perc(n, 0.0008, 0.05)
        out.append(y * env)
    y = np.stack(out, 1) if stereo else out[0]
    return _finish(y * 0.75, 0.2)


def ride(decay=0.9, seed=0, bell=0.4, length=None):
    n = ns(length or decay * 1.4)
    t = tline(n)
    m = _metal(n, 2.2)
    y = bq(m, "bandpass", 5200, 1.5) * 2.0 + 0.3 * butter(noise(n, "ride", seed), "highpass", 5000, 2)
    b = sum(np.sin(TWO_PI * f * t) * a for f, a in [(2730, 1.0), (4120, 0.6), (5530, 0.4)]) * bell
    y = (y * env_perc(n, 0.0005, decay * 0.4) + b * env_perc(n, 0.0005, 0.35))
    y = butter(y, "highpass", 1800, 2)
    return _finish(y * 0.6, 0.08)


def tom(m=45, decay=0.25, length=0.5, seed=0, bend=0.6):
    f = float(mtof(m))
    n = ns(length)
    t = tline(n)
    fr = f * (1 + bend * np.exp(-t / 0.02))
    ph = phase_acc(fr)
    y = np.sin(TWO_PI * ph) * np.exp(-t / decay) + 0.25 * np.sin(TWO_PI * ph * 1.6) * np.exp(-t / (decay * 0.4))
    hit = bq(noise(ns(0.01), "tom", seed), "lowpass", 3000) * env_perc(ns(0.01), 0.0002, 0.002)
    y[: len(hit)] += 0.3 * hit
    y = saturate(y, 1.3)
    return _finish(y * 0.9, 0.03)


def shaker(decay=0.045, seed=0, bright=1.0, length=0.12):
    n = ns(length)
    nz = noise(n, "shk", seed)
    y = butter(nz, "bandpass", [3800 * bright, 11000], 2)
    t = tline(n)
    env = np.clip(t / 0.006, 0, 1) ** 1.5 * np.exp(-np.maximum(t - 0.006, 0) / decay)
    return _finish(y * env * 0.7, 0.01)


def tambourine(decay=0.07, seed=0, length=0.22):
    n = ns(length)
    t = tline(n)
    r = rng("tamb", seed)
    y = np.zeros(n)
    for k in range(5):
        t0 = r.uniform(0, 0.007)
        tt = np.maximum(t - t0, 0)
        jing = sum(np.sin(TWO_PI * f * tt + r.uniform(0, 6.28)) for f in r.uniform(6500, 11500, 4))
        y += np.where(t >= t0, jing * np.exp(-tt / decay), 0) * r.uniform(0.6, 1.0)
    nz = butter(noise(n, "tambn", seed), "highpass", 6000, 2) * env_perc(n, 0.0005, decay * 0.7)
    y = 0.18 * y + 0.5 * nz
    y = bq(y, "lowpass", 13000)
    return _finish(y * 0.7, 0.02)


def snap(seed=0, length=0.15):
    n = ns(length)
    t = tline(n)
    nz = noise(n, "snap", seed)
    y = bq(nz, "bandpass", 2100, 2.5) * env_perc(n, 0.0002, 0.012) * 2.2
    y += bq(nz, "highpass", 4000) * env_perc(n, 0.0001, 0.003) * 0.6
    return _finish(y * 0.8, 0.01)


def rim(seed=0, length=0.1):
    n = ns(length)
    t = tline(n)
    y = (np.sin(TWO_PI * 1650 * t) * 0.8 + np.sin(TWO_PI * 520 * t) * 0.6) * env_perc(n, 0.0001, 0.009)
    y += bq(noise(n, "rim", seed), "highpass", 3000) * env_perc(n, 0.0001, 0.003) * 0.5
    return _finish(y * 0.8, 0.01)


def woodblock(f=880.0, seed=0, length=0.12):
    n = ns(length)
    t = tline(n)
    y = (np.sin(TWO_PI * f * t) + 0.4 * np.sin(TWO_PI * f * 2.71 * t) * np.exp(-t / 0.01)) * env_perc(n, 0.0002, 0.03)
    y += bq(noise(n, "wb", seed), "bandpass", f * 2, 2) * env_perc(n, 0.0001, 0.002) * 0.4
    return _finish(y * 0.8, 0.01)


def castanet(seed=0, length=0.09):
    n = ns(length)
    t = tline(n)
    y = np.zeros(n)
    for k, t0 in enumerate([0.0, 0.014]):
        tt = np.maximum(t - t0, 0)
        e = np.where(t >= t0, np.exp(-tt / 0.006), 0) * (1.0 if k == 0 else 0.7)
        y += e * (np.sin(TWO_PI * 2900 * tt) * 0.6 + bq(noise(n, "cast", seed, k), "bandpass", 3600, 2.0) * 1.5)
    return _finish(y * 0.8, 0.008)


def sleigh(seed=0, length=0.25, decay=0.08):
    n = ns(length)
    t = tline(n)
    r = rng("sleigh", seed)
    y = np.zeros(n)
    for k in range(9):
        t0 = r.uniform(0, 0.03)
        tt = np.maximum(t - t0, 0)
        f = r.uniform(4500, 8000)
        y += np.where(t >= t0, np.sin(TWO_PI * f * tt) + 0.5 * np.sin(TWO_PI * f * 1.51 * tt), 0) * np.exp(-tt / decay) * r.uniform(0.4, 1)
    y = butter(y, "highpass", 3000, 2) * 0.25
    y *= np.clip(t / 0.001, 0, 1)
    return _finish(y, 0.03)


def timpani(m=41, decay=1.2, vel=1.0, seed=0, length=None):
    f = float(mtof(m))
    n = ns(length or decay * 2.0)
    t = tline(n)
    fr = f * (1 + 0.03 * np.exp(-t / 0.06))
    ph = phase_acc(fr)
    y = np.zeros(n)
    for ratio, amp, tau in [(1.0, 1.0, decay), (1.504, 0.5, decay * 0.6), (1.742, 0.25, decay * 0.4),
                            (2.0, 0.3, decay * 0.45), (2.245, 0.15, decay * 0.3)]:
        y += amp * np.sin(TWO_PI * ph * ratio) * np.exp(-t / tau)
    hit = bq(noise(ns(0.03), "timp", seed), "lowpass", 1500) * env_perc(ns(0.03), 0.0005, 0.008)
    y[: len(hit)] += hit * 0.6
    y = saturate(y * 0.8, 1.2)
    y *= np.clip(t / 0.0008, 0, 1)
    return _finish(y * vel, 0.1)


def riser(length=2.0, f0=400.0, f1=7000.0, seed=0, q=1.5, curve=2.0, **_):
    """Noise sweep up (filtered), crescendo - for builds."""
    n = ns(length)
    t = tline(n)
    x = (t / length)
    fc = f0 * (f1 / f0) ** (x ** curve)
    nz = noise(n, "riser", seed)
    y = tvf(nz, fc, q, "bandpass", block=64) * 1.5 + 0.15 * tvf(nz, fc * 1.5, 0.7, "highpass", block=64)
    env = x ** 1.6
    y *= env
    return fade_edges(y * 0.6, 0.01, 0.01)


def rev_cymbal(length=1.5, seed=0):
    c = crash(decay=length * 0.9, seed=seed + 7, stereo=True, length=length)
    y = c[::-1].copy()
    return fade_edges(y, 0.02, 0.004)


def boom(f=55.0, length=1.2, seed=0):
    n = ns(length)
    t = tline(n)
    fr = f * (1 + 1.5 * np.exp(-t / 0.05))
    y = np.sin(TWO_PI * phase_acc(fr)) * np.exp(-t / (length * 0.35))
    y += bq(noise(n, "boom", seed), "lowpass", 300) * env_perc(n, 0.001, 0.08) * 0.5
    return _finish(saturate(y, 1.5), 0.05)


def timpani_note(m, dur, vel=0.9, decay=1.0, **kw):
    """Poly-voice wrapper (m, dur, vel) for the timpani."""
    return timpani(m, decay=decay, vel=vel, length=max(decay * 2.0, dur + 0.3))
