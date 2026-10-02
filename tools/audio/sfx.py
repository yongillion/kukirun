"""DESSERT DASH - sound effects (one function per SFX, all original synthesis).

Every function returns a mono float64 array at 44.1 kHz that starts sounding at sample 0.
Level is not important here - build.py peak-normalises and loudness-balances per category.
Pitch references: `jelly` fundamental = C6 (1046.5 Hz); `letter` root = C5 (523.25 Hz).
"""
import numpy as np

import instruments as I
from synth import (SR, TWO_PI, bq, butter, conv_lin, env_exp_seg, env_perc, env_seg, fade_edges, fm_op,
                   mtof, noise, ns, onepole_hp, onepole_lp, osc_pulse, osc_saw, osc_sine, osc_tri, phase_acc,
                   pink, reverb_ir, rng, saturate, tline, tvf)

PENTA = [0, 2, 4, 7, 9]  # C major pentatonic degrees


# ----------------------------------------------------------------------------- building blocks
def _n(dur):
    return ns(dur)


def place(buf, sig, t):
    """Add `sig` at time t (s). Grows the buffer when needed (never truncates). Use: buf = place(buf, sig, t)."""
    i = ns(t)
    end = i + len(sig)
    if end > len(buf):
        buf = np.concatenate([buf, np.zeros(end - len(buf))])
    buf[i:end] += sig
    return buf


def mix(*sigs):
    """Sum signals of different lengths (zero-padded)."""
    n = max(len(x) for x in sigs)
    out = np.zeros(n)
    for x in sigs:
        out[: len(x)] += x
    return out


def sweep(f0, f1, dur, wave="sine", curve="exp", ease=1.0):
    """Pitch sweep oscillator. ease<1: fast start, slow end; ease>1: slow start."""
    n = _n(dur)
    x = (tline(n) / dur) ** ease
    f = f0 * (f1 / f0) ** x if curve == "exp" else f0 + (f1 - f0) * x
    if wave == "sine":
        y = osc_sine(f)
    elif wave == "tri":
        y = osc_tri(f, ph0=0.25)
    elif wave == "saw":
        y = osc_saw(f)
    elif wave == "square":
        y = osc_pulse(f, None, 0.5)
    else:
        raise ValueError(wave)
    return fade_edges(y, 0.0, 0.003)


def freq_tone(freq, wave="sine", width=0.5):
    if wave == "sine":
        return np.sin(TWO_PI * phase_acc(freq))
    if wave == "tri":
        return osc_tri(freq, ph0=0.25)
    if wave == "saw":
        return osc_saw(freq)
    return osc_pulse(freq, None, width)


def nburst(dur, lo=None, hi=None, seed=0, a=0.001, tau=0.05, pinkish=False):
    n = _n(dur)
    x = pink(n, "nb", seed) if pinkish else noise(n, "nb", seed)
    if lo and hi:
        x = butter(x, "bandpass", [lo, hi], 2)
    elif lo:
        x = butter(x, "highpass", lo, 2)
    elif hi:
        x = butter(x, "lowpass", hi, 2)
    return fade_edges(x * env_perc(n, a, tau), 0.0, min(0.004, dur / 4))


def whoosh_noise(dur, f0, f1, q=1.2, seed=0, peak_at=0.4, f2=None, start=0.18):
    """Band-pass noise sweep with a rise/fall envelope (peak at peak_at fraction, begins at `start`)."""
    n = _n(dur)
    t = tline(n) / dur
    if f2 is None:
        fc = f0 * (f1 / f0) ** t
    else:
        fc = np.where(t < peak_at, f0 * (f1 / f0) ** (t / peak_at), f1 * (f2 / f1) ** ((t - peak_at) / (1 - peak_at)))
    x = noise(n, "wh", seed)
    y = tvf(x, fc, q, "bandpass", block=64) * 2.0
    env = np.where(t < peak_at, start + (1 - start) * (t / peak_at) ** 1.5, ((1 - t) / (1 - peak_at)) ** 1.8)
    env[: ns(0.0005)] *= np.linspace(0, 1, ns(0.0005))
    return butter(y * env, "lowpass", 9000, 2)


def ping(m, dur=0.25, ratio=3.5, index=1.5, tau=0.08, bright=1.0):
    """Tiny FM ping (sparkles, droplets, glints)."""
    f = float(mtof(m))
    n = _n(dur)
    t = tline(n)
    I_ = index * bright * np.exp(-t / (tau * 0.6)) * min(1.0, (1500.0 / f) ** 0.5)
    y = np.sin(TWO_PI * f * t + I_ * np.sin(TWO_PI * f * ratio * t))
    return fade_edges(y * env_perc(n, 0.0005, tau), 0.0, 0.004)


def sparkle(dur=0.6, n_notes=8, lo=84, hi=100, seed=0, tau=0.07, density_pow=1.0, amp=1.0, start=0.0):
    """Random high pentatonic glints spread over `dur` seconds."""
    r = rng("sparkle", seed)
    buf = np.zeros(_n(dur + 0.3))
    hi = min(hi, 98)                      # keep glints <= D7 so FM sidebands stay below ~10 kHz
    lo = min(lo, hi - 7)
    notes = [m for m in range(lo, hi + 1) if m % 12 in PENTA]
    for k in range(n_notes):
        tt = start + (k / max(1, n_notes - 1)) ** density_pow * (dur - start) * r.uniform(0.85, 1.0)
        m = notes[r.integers(0, len(notes))]
        g = amp * r.uniform(0.5, 1.0) * (1.0 - 0.5 * k / n_notes)
        buf = place(buf, ping(m, 0.2, ratio=r.choice([2.0, 3.0]), index=1.0, tau=tau) * g, tt)
    return buf


def arpeggio(notes, step, voice, vel=0.8, ring=0.6, start=0.0, vel_ramp=0.0, **kw):
    total = start + step * len(notes) + ring + 0.5
    buf = np.zeros(_n(total))
    for i, m in enumerate(notes):
        v = vel * (1.0 + vel_ramp * i / max(1, len(notes) - 1))
        buf = place(buf, voice(m, ring, v, **kw), start + i * step)
    return buf


def verb(x, rt60=0.9, mix=0.25, seed=5, predelay=0.01, hp=300.0):
    """Add a short synthetic reverb tail (mono)."""
    ir = reverb_ir(rt60, predelay, seed=seed, hp=hp, lp=9000.0)[:, 0]
    w = conv_lin(x, ir)
    y = np.zeros(len(w))
    y[: len(x)] += x
    return y + mix * w * 0.5


def thump(f0=140.0, f1=55.0, dur=0.15, ptau=0.025, tau=0.05, drive=1.5):
    n = _n(dur)
    t = tline(n)
    f = f1 + (f0 - f1) * np.exp(-t / ptau)
    y = np.sin(TWO_PI * phase_acc(f)) * env_perc(n, 0.0005, tau)
    return fade_edges(saturate(y, drive), 0.0, 0.004)


def bubble(f0=300.0, f1=900.0, dur=0.05, tau=0.02, a=0.0008):
    """Rising sine 'bloop' (bubble / pop)."""
    n = _n(dur)
    t = tline(n)
    f = f0 * (f1 / f0) ** (t / dur)
    return fade_edges(np.sin(TWO_PI * phase_acc(f)) * env_perc(n, a, tau), 0.0, 0.003)


def finish(y, fout=0.01, trim_db=-60.0, max_len=None):
    """Trim trailing near-silence, fade out, make sure it starts at once.
    max_len: designed length (s); the last 35 % of it becomes a smooth cosine fade."""
    y = np.asarray(y, dtype=np.float64)
    if max_len is not None and len(y) > ns(max_len):
        y = y[: ns(max_len)].copy()
        k = ns(max_len * 0.35)
        y[-k:] *= 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, k))
    pk = np.max(np.abs(y)) + 1e-12
    thr = pk * 10 ** (trim_db / 20)
    idx = np.nonzero(np.abs(y) > thr)[0]
    if len(idx):
        y = y[: idx[-1] + 1]
    return fade_edges(y, 0.0002, fout)


# ----------------------------------------------------------------------------- UI
def ui_click():
    n = _n(0.07)
    t = tline(n)
    f = 1350 * (0.62 + 0.38 * np.exp(-t / 0.012))
    y = np.sin(TWO_PI * phase_acc(f)) * env_perc(n, 0.0004, 0.018)
    y += 0.25 * np.sin(2 * TWO_PI * phase_acc(f)) * env_perc(n, 0.0004, 0.008)
    y += 0.2 * nburst(0.07, 2500, 9000, seed=1, tau=0.002)
    return finish(y, 0.01)


def ui_back():
    a = bubble(950, 700, 0.045, 0.016)
    b = bubble(720, 480, 0.06, 0.022, a=0.002)
    buf = np.zeros(_n(0.13))
    buf = place(buf, a, 0.0)
    buf = place(buf, b * 0.85, 0.045)
    buf = place(buf, nburst(0.03, 2000, 8000, seed=2, tau=0.002) * 0.15, 0.0)
    return finish(buf, 0.012)


def ui_open():
    buf = np.zeros(_n(0.32))
    buf = place(buf, whoosh_noise(0.2, 700, 3500, 1.0, seed=3, peak_at=0.7) * 0.35, 0.0)
    buf = place(buf, bubble(420, 1300, 0.08, 0.035), 0.0)
    buf = place(buf, I.glock(91, 0.1, 0.5, bright=0.6, ring=0.25) * 0.35, 0.09)
    buf = place(buf, I.glock(96, 0.1, 0.45, bright=0.6, ring=0.22) * 0.3, 0.14)
    return finish(buf, 0.03, max_len=0.32)


def ui_buy():
    buf = np.zeros(_n(0.9))
    buf = place(buf, nburst(0.03, 1500, 7000, seed=4, tau=0.006) * 0.4, 0.0)
    buf = place(buf, ping(93, 0.3, ratio=1.41, index=1.5, tau=0.09), 0.0)     # metallic clink A6
    buf = place(buf, ping(96, 0.3, ratio=1.41, index=1.2, tau=0.09) * 0.8, 0.06)  # E7
    buf = place(buf, I.fm_bell(88, 0.3, 0.8, ratio=2.0, index=1.0, decay=0.8) * 0.8, 0.13)  # E6 ding
    buf = place(buf, I.fm_bell(95, 0.3, 0.7, ratio=2.0, index=1.0, decay=0.8) * 0.6, 0.13)  # B6
    buf = place(buf, sparkle(0.45, 7, 91, 103, seed=4, tau=0.05, amp=0.35), 0.18)
    return finish(verb(buf, 0.7, 0.2), 0.05, max_len=1.0)


def ui_levelup():
    notes = [72, 76, 79, 84, 88, 91]
    buf = arpeggio(notes, 0.055, I.fm_bell, vel=0.75, ring=0.7, ratio=2.0, index=1.1, decay=0.9, vel_ramp=0.25)
    out = np.zeros(_n(1.5))
    out = place(out, buf, 0.0)
    chord = mix(*[I.glock(m, 0.3, 0.55, bright=0.7, ring=1.0) for m in (84, 88, 91, 96)])
    out = place(out, chord * 0.5, 0.33)
    out = place(out, sparkle(0.7, 10, 91, 105, seed=6, tau=0.06, amp=0.35), 0.35)
    out = place(out, whoosh_noise(0.35, 1500, 9000, 1.0, seed=6, peak_at=0.8) * 0.15, 0.0)
    return finish(verb(out, 1.1, 0.25), 0.08, max_len=1.5)


def ui_unlock():
    out = np.zeros(_n(1.6))
    # mechanical lock click: two clicks
    for k, t0 in enumerate((0.0, 0.05)):
        c = mix(nburst(0.02, 1800, 7000, seed=10 + k, tau=0.003), 0.5 * ping(86 + 3 * k, 0.05, ratio=1.41, index=2, tau=0.01))
        out = place(out, c * 0.7, t0)
    # magical reveal: rising chord swell + harp gliss + sparkles
    sw = np.zeros(_n(1.3))
    for m in (60, 64, 67, 71, 74):
        sw = place(sw, I.supersaw(m, 0.6, 0.55, voices=5, detune=0.15, cutoff=3500, a=0.25, d=0.3, s=0.8, r=0.5)[:, 0], 0.0)
    out = place(out, sw * 0.25, 0.12)
    gl = np.zeros(_n(1.2))
    for i, m in enumerate([72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96]):
        gl = place(gl, I.ks(m, 0.4, 0.6, "harp"), i * 0.03)
    out = place(out, gl * 0.45, 0.12)
    out = place(out, sparkle(0.8, 12, 91, 108, seed=11, tau=0.06, amp=0.3), 0.3)
    return finish(verb(out, 1.3, 0.3), 0.1, max_len=1.5)


def ui_error():
    out = np.zeros(_n(0.36))
    for k, (m, t0) in enumerate(((64, 0.0), (60, 0.14))):
        f = float(mtof(m))
        n = _n(0.13)
        t = tline(n)
        y = 0.6 * osc_pulse(f, n, 0.35) + 0.6 * np.sin(TWO_PI * f * t)
        y = bq(y, "lowpass", 1600, 0.8)
        y *= env_seg([(0, 0), (0.004, 1), (0.09, 0.8), (0.13, 0)], n)
        out = place(out, y, t0)
    return finish(out, 0.02)


def ui_toggle():
    out = np.zeros(_n(0.09))
    out = place(out, nburst(0.02, 2000, 9000, seed=12, tau=0.0025) * 0.6, 0.0)
    out = place(out, bubble(900, 1500, 0.035, 0.012) * 0.8, 0.0)
    out = place(out, nburst(0.02, 3000, 9000, seed=13, tau=0.0015) * 0.35, 0.03)
    return finish(out, 0.01)


def ui_tick():
    n = _n(0.022)
    t = tline(n)
    y = np.sin(TWO_PI * 2350 * t) * env_perc(n, 0.0002, 0.0045) + 0.3 * np.sin(TWO_PI * 4700 * t) * env_perc(n, 0.0002, 0.002)
    return finish(y, 0.004)


def ui_reward():
    notes = [79, 84, 88, 91]
    out = np.zeros(_n(1.2))
    out = place(out, arpeggio(notes, 0.07, I.glock, vel=0.8, ring=0.8, bright=0.7), 0.0)
    chord = mix(*[I.fm_bell(m, 0.4, 0.6, ratio=2.0, index=0.9, decay=1.0) for m in (84, 88, 91)])
    out = place(out, chord * 0.4, 0.28)
    out = place(out, sparkle(0.6, 8, 93, 105, seed=14, amp=0.3), 0.3)
    return finish(verb(out, 1.0, 0.25), 0.08, max_len=1.4)


def ui_select():
    out = np.zeros(_n(0.22))
    out = place(out, I.fm_bell(79, 0.06, 0.7, ratio=2.0, index=0.8, decay=0.5) * 0.8, 0.0)
    out = place(out, I.fm_bell(84, 0.08, 0.8, ratio=2.0, index=0.8, decay=0.5), 0.055)
    out = place(out, nburst(0.01, 3000, 9000, seed=15, tau=0.0015) * 0.15, 0.0)
    return finish(out, 0.03, max_len=0.32)


def ui_swipe():
    y = whoosh_noise(0.22, 900, 4200, 1.3, seed=16, peak_at=0.35, f2=1800)
    y = y + 0.08 * whoosh_noise(0.22, 2500, 7000, 0.8, seed=17, peak_at=0.3)
    y[: _n(0.004)] += nburst(0.004, 3000, 8000, seed=18, tau=0.001) * 0.1
    return finish(y, 0.02)


# ----------------------------------------------------------------------------- run
def jump():
    n = _n(0.22)
    t = tline(n)
    base = 250 * (3.1) ** (1 - np.exp(-t / 0.05))          # fast rise ~250 -> ~770 Hz
    wob = 1 + 0.035 * np.exp(-t / 0.06) * np.sin(TWO_PI * 22 * t)
    f = base * wob
    y = freq_tone(f, "sine") + 0.3 * freq_tone(2 * f, "sine") + 0.12 * freq_tone(f, "tri")
    y *= env_seg([(0, 0), (0.002, 1), (0.08, 0.75), (0.22, 0)], n) ** 1.2
    w = whoosh_noise(0.2, 900, 3200, 1.2, seed=20, peak_at=0.25) * 0.18
    out = np.zeros(n)
    out += y
    out = place(out, w, 0.0)
    return finish(out, 0.015)


def jump2():
    n = _n(0.28)
    t = tline(n)
    base = 430 * (2.9) ** (1 - np.exp(-t / 0.05))
    f = base * (1 + 0.03 * np.exp(-t / 0.07) * np.sin(TWO_PI * 26 * t))
    y = freq_tone(f, "sine") + 0.25 * freq_tone(2 * f, "sine")
    y *= env_seg([(0, 0), (0.002, 1), (0.09, 0.7), (0.28, 0)], n) ** 1.2
    out = y.copy()
    out = place(out, ping(96, 0.2, ratio=2.0, index=1.0, tau=0.06) * 0.35, 0.05)
    out = place(out, ping(96, 0.2, ratio=2.0, index=1.0, tau=0.06) * 0.25, 0.09)
    out = place(out, whoosh_noise(0.25, 1500, 6000, 1.0, seed=21, peak_at=0.3) * 0.2, 0.0)
    return finish(out, 0.02)


def slide():
    n = _n(0.4)
    t = tline(n) / 0.4
    nz = noise(n, "slide")
    fc = 4200 * (0.35 ** t)
    y = tvf(nz, fc, 0.8, "lowpass", block=64)
    y = butter(y, "highpass", 500, 2)
    env = np.clip(tline(n) / 0.004, 0, 1) * np.exp(-tline(n) / 0.16)
    tone = sweep(760, 380, 0.4, "tri", ease=0.7) * env_seg([(0, 0), (0.003, 0.35), (0.2, 0.15), (0.4, 0)], n)
    out = y * env * 0.9 + tone
    return finish(out, 0.03)


def land():
    out = np.zeros(_n(0.17))
    out = place(out, thump(150, 60, 0.12, 0.018, 0.035, 1.6), 0.0)
    out = place(out, nburst(0.15, 300, 2200, seed=22, a=0.002, tau=0.03, pinkish=True) * 0.5, 0.0)
    out = place(out, nburst(0.01, 2000, 6000, seed=23, tau=0.0015) * 0.15, 0.0)
    return finish(out, 0.02)


def jelly():
    """Tiny bright tick at C6 (1046.5 Hz). Harmonic partials only -> pitch-shifts musically."""
    f = 1046.5
    n = _n(0.105)
    t = tline(n)
    y = np.sin(TWO_PI * f * t) * env_perc(n, 0.0005, 0.032)
    y += 0.32 * np.sin(TWO_PI * 2 * f * t) * env_perc(n, 0.0005, 0.016)
    y += 0.10 * np.sin(TWO_PI * 3 * f * t) * env_perc(n, 0.0005, 0.008)
    y += 0.06 * np.sin(TWO_PI * 4 * f * t + 1.5 * np.sin(TWO_PI * f * t)) * env_perc(n, 0.0003, 0.004)
    return finish(y, 0.012)


def jelly_big():
    out = np.zeros(_n(0.4))
    out = place(out, I.fm_bell(84, 0.1, 0.8, ratio=2.0, index=1.0, decay=0.5), 0.0)
    out = place(out, I.fm_bell(91, 0.1, 0.6, ratio=2.0, index=1.0, decay=0.45) * 0.7, 0.0)
    out = place(out, ping(96, 0.2, ratio=2.0, index=1.0, tau=0.05) * 0.4, 0.04)
    out = place(out, ping(96, 0.2, ratio=2.0, index=1.0, tau=0.05) * 0.3, 0.075)
    return finish(out, 0.04, max_len=0.45)


def jelly_rainbow():
    out = np.zeros(_n(0.6))
    out = place(out, arpeggio([84, 88, 91, 96, 100], 0.032, I.fm_bell, vel=0.7, ring=0.35, ratio=2.0, index=1.0,
                        decay=0.5, vel_ramp=0.2), 0.0)
    out = place(out, sparkle(0.35, 6, 96, 108, seed=24, tau=0.04, amp=0.3), 0.08)
    sh = butter(noise(_n(0.4), "rbsh"), "highpass", 7000, 2) * env_perc(_n(0.4), 0.02, 0.1) * 0.05
    out = place(out, sh, 0.0)
    return finish(verb(out, 0.7, 0.2), 0.04, max_len=0.7)


def coin():
    out = np.zeros(_n(0.26))
    out = place(out, ping(93, 0.25, ratio=1.41, index=1.8, tau=0.07), 0.0)          # A6 metallic
    out = place(out, np.sin(TWO_PI * 1318.5 * tline(_n(0.2))) * env_perc(_n(0.2), 0.0005, 0.05) * 0.45, 0.0)
    out = place(out, ping(96, 0.15, ratio=1.41, index=1.2, tau=0.04) * 0.45, 0.035)  # E7 glint
    return finish(out, 0.02)


def coin_big():
    out = np.zeros(_n(0.55))
    out = place(out, ping(88, 0.4, ratio=1.41, index=2.0, tau=0.12), 0.0)
    out = place(out, I.fm_bell(76, 0.2, 0.6, ratio=2.0, index=0.8, decay=0.6) * 0.6, 0.0)
    out = place(out, ping(95, 0.3, ratio=1.41, index=1.5, tau=0.09) * 0.7, 0.06)
    out = place(out, sparkle(0.3, 5, 96, 106, seed=25, tau=0.04, amp=0.3), 0.1)
    return finish(verb(out, 0.6, 0.15), 0.03, max_len=0.65)


def item():
    out = np.zeros(_n(0.65))
    out = place(out, bubble(280, 950, 0.06, 0.03), 0.0)
    out = place(out, arpeggio([79, 84, 88, 91], 0.05, I.fm_bell, vel=0.7, ring=0.4, ratio=2.0, index=1.1, decay=0.6,
                        vel_ramp=0.2), 0.04)
    out = place(out, sparkle(0.35, 6, 93, 105, seed=26, tau=0.05, amp=0.3), 0.18)
    return finish(verb(out, 0.8, 0.2), 0.04, max_len=0.8)


def magnet():
    n = _n(0.75)
    t = tline(n)
    f = 190 * (2.2) ** (t / 0.6)
    f = np.minimum(f, 420) * (1 + 0.025 * np.sin(TWO_PI * 13 * t))
    ph = phase_acc(f)
    y = np.sin(TWO_PI * ph + 1.4 * np.sin(TWO_PI * 2 * ph))
    y = bq(y, "lowpass", 2500, 0.7) + 0.25 * bq(osc_saw(f), "bandpass", 1200, 1.0)
    y *= np.sin(np.pi * np.clip(t / 0.62, 0, 1)) ** 0.7 * (0.75 + 0.25 * np.sin(TWO_PI * 13 * t))
    y[: _n(0.003)] *= np.linspace(0.3, 1, _n(0.003))
    out = np.zeros(_n(0.95))
    out = place(out, y * 0.7, 0.0)
    out = place(out, bubble(500, 1100, 0.05, 0.02) * 0.4, 0.0)
    out = place(out, ping(96, 0.3, ratio=2.0, index=1.0, tau=0.08) * 0.5, 0.55)
    out = place(out, ping(98, 0.3, ratio=2.0, index=1.0, tau=0.07) * 0.35, 0.6)
    return finish(verb(out, 0.6, 0.15), 0.04)


def giant_on():
    out = np.zeros(_n(1.5))
    out = place(out, bubble(200, 700, 0.07, 0.03) * 0.7, 0.0)                          # grab
    # growing whoosh: rising filtered saw + noise riser
    n = _n(0.62)
    t = tline(n)
    f = 70 * (4.5) ** (t / 0.62) ** 1.3
    s = osc_saw(f) + 0.6 * osc_saw(f * 1.5)
    s = tvf(s, 300 + 3200 * (t / 0.62) ** 2, 1.2, block=64) * (0.15 + 0.85 * (t / 0.62) ** 1.5)
    out = place(out, s * 0.45, 0.0)
    out = place(out, whoosh_noise(0.66, 300, 5000, 1.0, seed=30, peak_at=0.95) * 0.5, 0.0)
    # BOOM + power chord
    out = place(out, I.kick(f_hi=120, f_lo=42, decay=0.35, click=0.5, drive=2.0) * 1.0, 0.6)
    chord = mix(*[I.brass(m, 0.25, 0.85, bright=1.1) for m in (48, 55, 60, 64, 67)])
    out = place(out, chord * 0.45, 0.6)
    out = place(out, sparkle(0.5, 8, 88, 103, seed=31, amp=0.3), 0.62)
    return finish(verb(out, 1.2, 0.25), 0.08)


def giant_step():
    out = np.zeros(_n(0.32))
    out = place(out, thump(110, 42, 0.3, 0.03, 0.08, 2.2), 0.0)
    out = place(out, nburst(0.25, 80, 900, seed=32, a=0.001, tau=0.06, pinkish=True) * 0.6, 0.0)
    crunch = nburst(0.12, 800, 3500, seed=33, tau=0.025) * 0.25
    out = place(out, crunch, 0.004)
    return finish(out, 0.04)


def giant_off():
    n = _n(0.7)
    t = tline(n)
    f = 420 * (0.32) ** (t / 0.6) * (1 + 0.04 * np.sin(TWO_PI * 9 * t))
    s = bq(osc_saw(f), "lowpass", 1800, 0.9) + 0.6 * np.sin(TWO_PI * phase_acc(f))
    s *= env_seg([(0, 0), (0.004, 1), (0.45, 0.6), (0.7, 0)], n)
    air = butter(noise(n, "goff"), "bandpass", [800, 5000], 2) * env_seg([(0, 0), (0.01, 0.4), (0.4, 0.15), (0.7, 0)], n)
    out = s * 0.7 + air * 0.4
    pf = np.zeros(_n(0.9))
    pf = place(pf, out, 0.0)
    pf = place(pf, nburst(0.2, 200, 1500, seed=34, a=0.003, tau=0.05, pinkish=True) * 0.35, 0.55)
    return finish(pf, 0.05)


def dash_on():
    out = np.zeros(_n(1.15))
    out = place(out, nburst(0.06, 400, 6000, seed=40, a=0.0005, tau=0.015) * 0.9, 0.0)  # ignition crack
    for k in range(5):
        out = place(out, nburst(0.02, 1000, 7000, seed=41 + k, tau=0.004) * 0.4, 0.01 + 0.018 * k)
    n = _n(0.9)
    t = tline(n)
    roar = tvf(noise(n, "roar"), 250 * (9.0) ** (t / 0.9), 1.4, "bandpass", block=64) * 2.2
    roar *= env_seg([(0, 0.4), (0.15, 1.0), (0.6, 0.8), (0.9, 0)], n)
    out = place(out, roar * 0.55, 0.02)
    tone = osc_saw(110 * (3.0) ** (t / 0.9))
    tone = bq(tone, "lowpass", 1400, 0.8) * env_seg([(0, 0), (0.05, 0.7), (0.7, 0.5), (0.9, 0)], n)
    out = place(out, tone * 0.35, 0.02)
    zoom = sweep(500, 2200, 0.5, "sine", ease=0.8) * env_seg([(0, 0), (0.05, 1), (0.3, 0.5), (0.5, 0)], _n(0.5))
    out = place(out, zoom * 0.35, 0.12)
    return finish(verb(out, 0.8, 0.15), 0.06)


def smash():
    out = np.zeros(_n(0.55))
    out = place(out, thump(130, 48, 0.25, 0.02, 0.06, 2.4), 0.0)
    out = place(out, nburst(0.2, 400, 4500, seed=42, a=0.0005, tau=0.04) * 0.9, 0.0)
    r = rng("smash")
    for k in range(9):
        g = nburst(0.03, 1200, 6000, seed=43 + k, tau=r.uniform(0.004, 0.012)) * r.uniform(0.2, 0.5)
        out = place(out, g, 0.01 + r.uniform(0, 0.22) * (k / 9) ** 0.7)
    out = place(out, ping(96, 0.25, ratio=2.0, index=1.0, tau=0.07) * 0.35, 0.03)
    return finish(out, 0.04)


def convert():
    out = np.zeros(_n(0.8))
    gl = [m for m in range(84, 102) if m % 12 in PENTA]
    for i, m in enumerate(gl):
        out = place(out, ping(m, 0.25, ratio=2.0, index=0.9, tau=0.06) * (0.5 + 0.5 * i / len(gl)), i * 0.028)
    out = place(out, whoosh_noise(0.45, 1200, 8000, 0.9, seed=50, peak_at=0.6) * 0.25, 0.0)
    out = place(out, I.fm_bell(96, 0.2, 0.6, ratio=2.0, index=0.8, decay=0.7) * 0.6, 0.3)
    return finish(verb(out, 0.9, 0.25), 0.05, max_len=0.9)


def shield_on():
    out = np.zeros(_n(0.75))
    n = _n(0.25)
    t = tline(n)
    f = 260 * (3.6) ** (t / 0.25) ** 0.7
    b = np.sin(TWO_PI * phase_acc(f)) * env_seg([(0, 0), (0.003, 1), (0.15, 0.7), (0.25, 0)], n)
    out = place(out, b * 0.8, 0.0)
    out = place(out, I.fm_bell(88, 0.3, 0.7, ratio=1.5, index=1.2, decay=0.9) * 0.6, 0.08)
    out = place(out, I.fm_bell(95, 0.3, 0.6, ratio=1.5, index=1.0, decay=0.8) * 0.4, 0.1)
    shim = butter(noise(_n(0.5), "shon"), "bandpass", [5000, 11000], 2) * env_seg([(0, 0), (0.1, 0.06), (0.5, 0)], _n(0.5))
    out = place(out, shim, 0.05)
    return finish(verb(out, 0.9, 0.25), 0.05, max_len=0.9)


def shield_break():
    out = np.zeros(_n(0.6))
    out = place(out, nburst(0.03, 800, 9000, seed=60, a=0.0003, tau=0.006) * 0.9, 0.0)
    out = place(out, sweep(1500, 220, 0.06, "sine", ease=0.5) * env_perc(_n(0.06), 0.0003, 0.02) * 0.8, 0.0)
    r = rng("glass")
    for k in range(9):
        m = r.uniform(86, 98)
        out = place(out, ping(m, 0.2, ratio=r.choice([1.41, 2.76, 3.3]), index=1.3, tau=r.uniform(0.03, 0.09)) * r.uniform(0.25, 0.55),
              0.01 + r.uniform(0, 0.2))
    out = place(out, nburst(0.35, 3000, 8000, seed=61, a=0.001, tau=0.07) * 0.18, 0.005)
    return finish(verb(out, 0.6, 0.15), 0.04)


def milk():
    out = np.zeros(_n(0.85))
    for k, t0 in enumerate((0.0, 0.085, 0.17)):
        out = place(out, bubble(170 + 30 * k, 480 + 60 * k, 0.07, 0.03) * 0.8, t0)
        out = place(out, nburst(0.04, 200, 1200, seed=70 + k, a=0.002, tau=0.012, pinkish=True) * 0.25, t0)
    out = place(out, I.fm_bell(79, 0.2, 0.7, ratio=2.0, index=0.8, decay=0.7) * 0.7, 0.26)
    out = place(out, I.fm_bell(86, 0.2, 0.7, ratio=2.0, index=0.8, decay=0.7) * 0.7, 0.33)
    out = place(out, sparkle(0.35, 6, 91, 103, seed=71, amp=0.3), 0.36)
    return finish(verb(out, 0.8, 0.2), 0.05, max_len=1.1)


def letter():
    """Magical chime rooted at C5 (523.25 Hz): bell C5+C6 with a C-major glint arpeggio above."""
    out = np.zeros(_n(0.95))
    out = place(out, I.fm_bell(72, 0.3, 0.85, ratio=2.0, index=1.2, decay=1.0), 0.0)
    out = place(out, I.fm_bell(84, 0.3, 0.6, ratio=2.0, index=0.9, decay=0.8) * 0.6, 0.0)
    out = place(out, I.glock(84, 0.2, 0.5, bright=0.6, ring=0.8) * 0.4, 0.0)
    for i, m in enumerate((88, 91, 96, 100)):
        out = place(out, ping(m, 0.25, ratio=2.0, index=0.8, tau=0.07) * (0.32 - 0.04 * i), 0.03 + 0.03 * i)
    return finish(verb(out, 1.0, 0.25), 0.06, max_len=1.2)


def rush_start():
    out = np.zeros(_n(2.0))
    out = place(out, I.kick(f_hi=140, f_lo=45, decay=0.3, click=0.6, drive=2.0) * 0.8, 0.0)
    out = place(out, whoosh_noise(0.55, 400, 9000, 1.0, seed=80, peak_at=0.75) * 0.45, 0.0)
    fan = arpeggio([60, 64, 67, 72], 0.06, I.brass, vel=0.85, ring=0.15, bright=1.1)
    out = place(out, fan * 0.5, 0.0)
    chord = np.zeros(_n(1.5))
    for m in (60, 64, 67, 72, 76):
        chord = place(chord, I.supersaw(m, 0.7, 0.7, voices=5, detune=0.18, cutoff=5000, a=0.005, d=0.4, s=0.6, r=0.5)[:, 0], 0.0)
        chord = place(chord, I.brass(m, 0.6, 0.85, bright=1.1) * 0.6, 0.0)
    out = place(out, chord * 0.35, 0.24)
    out = place(out, I.crash(decay=1.4, stereo=False) * 0.35, 0.24)
    out = place(out, sparkle(1.0, 16, 88, 108, seed=81, tau=0.07, amp=0.35), 0.26)
    gl = np.zeros(_n(1.0))
    for i, m in enumerate([m for m in range(84, 109) if m % 12 in PENTA]):
        gl = place(gl, ping(m, 0.2, ratio=2.0, index=0.8, tau=0.05), i * 0.025)
    out = place(out, gl * 0.35, 0.3)
    return finish(verb(out, 1.4, 0.3), 0.15, max_len=2.2)


def rush_end():
    out = np.zeros(_n(1.4))
    gl = [m for m in range(108, 83, -1) if m % 12 in PENTA]
    for i, m in enumerate(gl):
        out = place(out, ping(m, 0.25, ratio=2.0, index=0.8, tau=0.06) * (0.8 - 0.4 * i / len(gl)), i * 0.035)
    out = place(out, whoosh_noise(0.7, 6000, 500, 1.0, seed=82, peak_at=0.2) * 0.3, 0.0)
    pad = np.zeros(_n(1.3))
    for m in (60, 64, 67, 71):
        pad = place(pad, I.supersaw(m, 0.5, 0.5, voices=5, detune=0.15, cutoff=2500, a=0.1, d=0.3, s=0.7, r=0.6)[:, 0], 0.0)
    out = place(out, pad * 0.25, 0.2)
    out = place(out, I.fm_bell(72, 0.4, 0.7, ratio=2.0, index=0.8, decay=1.0) * 0.6, 0.55)
    return finish(verb(out, 1.2, 0.3), 0.1, max_len=1.8)


def hit():
    out = np.zeros(_n(0.55))
    n = _n(0.25)
    t = tline(n)
    f = 300 + 260 * np.exp(-t / 0.03)            # 'bonk' pitch drop
    ph = phase_acc(f)
    bonk = (np.sin(TWO_PI * ph) + 0.45 * np.sin(TWO_PI * ph * 1.58) * np.exp(-t / 0.03)) * env_perc(n, 0.0004, 0.07)
    out = place(out, fade_edges(saturate(bonk, 1.8) * 0.9, 0.0, 0.01), 0.0)
    out = place(out, nburst(0.012, 1500, 7000, seed=90, tau=0.002) * 0.5, 0.0)
    r = rng("hitcrunch")
    for k in range(6):
        out = place(out, nburst(0.03, 800, 5000, seed=91 + k, tau=r.uniform(0.005, 0.012)) * r.uniform(0.25, 0.45), 0.01 + 0.018 * k)
    n2 = _n(0.35)
    t2 = tline(n2)
    wob = np.sin(TWO_PI * phase_acc(190 * (1 + 0.06 * np.sin(TWO_PI * 11 * t2)))) * env_seg([(0, 0), (0.02, 0.4), (0.35, 0)], n2)
    out = place(out, wob * 0.35, 0.05)
    return finish(out, 0.04)


def low_energy():
    out = np.zeros(_n(0.42))
    for t0 in (0.0, 0.18):
        n = _n(0.11)
        t = tline(n)
        y = np.sin(TWO_PI * 880 * t) + 0.3 * np.sin(TWO_PI * 1760 * t) * np.exp(-t / 0.03) + 0.15 * osc_tri(880, n)
        y *= env_seg([(0, 0), (0.003, 1), (0.07, 0.8), (0.11, 0)], n)
        out = place(out, y, t0)
    return finish(out, 0.02)


def exhausted():
    """Cartoon-sad but cute: three drooping 'wah' notes and a little plop."""
    out = np.zeros(_n(1.55))
    seq_ = [(76, 0.0, 0.26), (75, 0.28, 0.26), (74, 0.56, 0.6)]
    for i, (m, t0, d) in enumerate(seq_):
        n = _n(d + 0.05)
        t = tline(n)
        pitch = m + np.zeros(n) + (0.25 * np.sin(TWO_PI * 5.5 * t) * np.clip((t - 0.12) / 0.15, 0, 1) if i == 2 else 0.0)
        if i == 2:
            pitch = pitch - 0.9 * np.clip((t - 0.3) / 0.35, 0, 1) ** 2
        f = mtof(pitch)
        y = 0.7 * osc_pulse(f, None, 0.4) + 0.5 * np.sin(TWO_PI * phase_acc(f))
        wah = 500 + 1600 * np.clip(t / 0.06, 0, 1) * np.exp(-np.maximum(t - 0.06, 0) / 0.25)
        y = tvf(y, wah, 2.0, block=32)
        y *= env_seg([(0, 0), (0.006, 1), (d * 0.8, 0.75), (d + 0.05, 0)], n)
        out = place(out, y * 0.8, t0)
    out = place(out, bubble(500, 260, 0.08, 0.035) * 0.6, 1.25)
    return finish(verb(out, 0.7, 0.15), 0.06)


def fall():
    n = _n(0.95)
    t = tline(n)
    f = 1500 * (0.17) ** (t / 0.9) ** 0.9
    f = f * 2 ** (0.3 * np.sin(TWO_PI * 7.5 * t) / 12)
    ph = phase_acc(f)
    y = np.sin(TWO_PI * ph) + 0.05 * np.sin(2 * TWO_PI * ph)
    y *= env_seg([(0, 0), (0.008, 1), (0.6, 0.85), (0.95, 0)], n)
    br = bq(noise(n, "slwh"), "bandpass", 2500, 1.0) * 0.04
    out = np.zeros(_n(1.2))
    out = place(out, y + br, 0.0)
    out = place(out, nburst(0.18, 150, 1200, seed=95, a=0.003, tau=0.05, pinkish=True) * 0.4, 0.93)
    return finish(out, 0.05)


def revive():
    out = np.zeros(_n(1.9))
    out = place(out, arpeggio([72, 76, 79, 84, 88, 91], 0.08, I.fm_bell, vel=0.7, ring=0.8, ratio=2.0, index=0.9,
                        decay=1.0, vel_ramp=0.2), 0.0)
    ch = np.zeros(_n(1.7))
    for m in (60, 64, 67, 74, 76):
        c = I.choir(m, 0.9, 0.6, vowel="ah", a=0.35, r=0.6)
        ch = place(ch, c[:, 0], 0.0)
    out = place(out, ch * 0.35, 0.0)
    out = place(out, whoosh_noise(0.9, 500, 8000, 0.9, seed=96, peak_at=0.8) * 0.2, 0.0)
    out = place(out, sparkle(1.0, 14, 91, 108, seed=97, tau=0.07, amp=0.3), 0.4)
    return finish(verb(out, 1.5, 0.3), 0.12, max_len=1.9)


def relay():
    out = np.zeros(_n(0.65))
    out = place(out, whoosh_noise(0.3, 700, 4500, 1.1, seed=98, peak_at=0.4, f2=1500) * 0.5, 0.0)
    out = place(out, I.fm_bell(79, 0.15, 0.75, ratio=2.0, index=1.0, decay=0.6), 0.0)
    out = place(out, I.fm_bell(86, 0.2, 0.8, ratio=2.0, index=1.0, decay=0.7), 0.08)
    return finish(verb(out, 0.7, 0.2), 0.05, max_len=0.75)


def skill():
    out = np.zeros(_n(1.0))
    out = place(out, whoosh_noise(0.45, 500, 7000, 0.9, seed=100, peak_at=0.7) * 0.45, 0.0)
    out = place(out, bubble(300, 900, 0.06, 0.03) * 0.5, 0.0)
    for m in (84, 88, 91):
        out = place(out, I.fm_bell(m, 0.3, 0.6, ratio=2.0, index=1.0, decay=0.8) * 0.45, 0.3)
    out = place(out, sparkle(0.5, 9, 93, 106, seed=101, amp=0.3), 0.32)
    return finish(verb(out, 1.0, 0.25), 0.07, max_len=1.2)


def skill_chip():
    """Chocolate rain: pitter-patter droplets + choco plops + sparkle."""
    out = np.zeros(_n(1.45))
    out = place(out, whoosh_noise(0.35, 600, 4000, 1.0, seed=110, peak_at=0.5) * 0.3, 0.0)
    out = place(out, bubble(240, 600, 0.06, 0.025) * 0.5, 0.0)
    r = rng("chiprain")
    drops = [m for m in range(79, 98) if m % 12 in PENTA]
    for k in range(26):
        tt = 0.04 + 1.0 * (k / 26) + r.uniform(-0.015, 0.015)
        m = drops[r.integers(0, len(drops))]
        nn = _n(0.06)
        t = tline(nn)
        f = mtof(m) * (1 + 0.5 * (1 - np.exp(-t / 0.01)))      # droplet up-chirp
        d = np.sin(TWO_PI * phase_acc(f)) * env_perc(nn, 0.0005, 0.014)
        out = place(out, d * r.uniform(0.3, 0.6) * (1 - 0.4 * k / 26), tt)
        if k % 4 == 1:
            out = place(out, bubble(330, 160, 0.05, 0.02) * 0.35, tt + 0.02)
    out = place(out, sparkle(1.0, 10, 93, 106, seed=111, amp=0.25), 0.1)
    return finish(verb(out, 0.8, 0.2), 0.06)


def skill_maca():
    """Sweet blooming chord: little 'pop', swelling Fmaj9 bloom, harp gliss and sparkles."""
    out = np.zeros(_n(1.6))
    out = place(out, bubble(400, 1000, 0.05, 0.02) * 0.6, 0.0)
    bloom = np.zeros(_n(1.4))
    for m in (53, 60, 64, 67, 69, 72, 76):
        bloom = place(bloom, I.strings(m, 0.6, 0.6, a=0.22, r=0.6, cutoff=3200)[:, 0], 0.0)
    out = place(out, bloom * 0.35, 0.0)
    gl = np.zeros(_n(1.2))
    for i, m in enumerate([m for m in range(65, 92) if m % 12 in {5, 7, 9, 0, 2, 4}]):
        gl = place(gl, I.ks(m, 0.5, 0.55, "harp"), i * 0.022)
    out = place(out, gl * 0.4, 0.03)
    out = place(out, I.glock(89, 0.2, 0.5, bright=0.6, ring=1.0) * 0.4, 0.4)
    out = place(out, sparkle(0.8, 10, 93, 106, seed=112, amp=0.3), 0.35)
    return finish(verb(out, 1.3, 0.3), 0.1, max_len=1.7)


def skill_pudding():
    """Warm caramel healing shimmer: jiggle 'boing' + warm vibes/EP chord + rising soft sparkles."""
    out = np.zeros(_n(1.6))
    n = _n(0.4)
    t = tline(n)
    jig = np.sin(TWO_PI * phase_acc(180 * (1 + 0.12 * np.exp(-t / 0.12) * np.sin(TWO_PI * 9 * t)))) \
        * env_seg([(0, 0), (0.003, 1), (0.4, 0)], n)
    out = place(out, jig * 0.5, 0.0)
    for m in (53, 57, 60, 64, 67):
        out = place(out, I.vibes(m + 12, 0.9, 0.5) * 0.35, 0.02)
        out = place(out, I.epiano(m, 0.9, 0.5, bright=0.4) * 0.3, 0.02)
    asc = [77, 81, 84, 86, 89, 93, 96, 98]
    for i, m in enumerate(asc):
        out = place(out, ping(m, 0.3, ratio=2.0, index=0.6, tau=0.12) * 0.25, 0.15 + i * 0.08)
    sh = butter(noise(_n(1.2), "pud"), "bandpass", [3000, 9000], 2) * env_seg([(0, 0), (0.4, 0.04), (1.2, 0)], _n(1.2))
    out = place(out, sh, 0.1)
    return finish(verb(out, 1.3, 0.3), 0.1, max_len=1.7)


def skill_donut():
    """Rolling wheel zoom: accelerating rumble + rising zoom + doppler whoosh."""
    n = _n(1.1)
    t = tline(n)
    rate = 7 + 28 * (t / 1.1) ** 1.5
    am = 0.55 + 0.45 * np.sin(TWO_PI * phase_acc(rate))
    rum = butter(pink(n, "donut"), "lowpass", 600, 2) * am * env_seg([(0, 0.5), (0.1, 1.0), (0.85, 0.8), (1.1, 0)], n)
    out = np.zeros(_n(1.3))
    out = place(out, rum * 0.8, 0.0)
    out = place(out, thump(120, 60, 0.12, 0.02, 0.04, 1.5) * 0.6, 0.0)
    z = sweep(180, 950, 0.9, "saw", ease=1.4)
    z = bq(z, "lowpass", 2200, 0.9) * env_seg([(0, 0), (0.05, 0.4), (0.8, 0.8), (0.9, 0)], _n(0.9))
    out = place(out, z * 0.4, 0.1)
    out = place(out, whoosh_noise(0.6, 600, 5000, 1.0, seed=113, peak_at=0.7, f2=2000) * 0.4, 0.45)
    return finish(out, 0.06)


def skill_marsh():
    """Soft puffy inflate + floaty."""
    out = np.zeros(_n(1.5))
    n = _n(0.55)
    t = tline(n)
    inf = tvf(noise(n, "marsh"), 220 * (6.0) ** (t / 0.55), 3.0, "bandpass", block=64) * 3.0
    inf *= env_seg([(0, 0.3), (0.05, 0.6), (0.5, 1.0), (0.55, 0)], n)
    out = place(out, inf * 0.35, 0.0)
    tone = sweep(150, 520, 0.5, "sine", ease=0.8) * env_seg([(0, 0), (0.005, 0.5), (0.45, 0.8), (0.5, 0)], _n(0.5))
    out = place(out, tone * 0.5, 0.0)
    out = place(out, bubble(400, 900, 0.08, 0.04) * 0.6, 0.5)
    for i, m in enumerate((79, 84, 88)):
        b = I.fm_bell(m, 0.5, 0.55, ratio=2.0, index=0.6, decay=1.0)
        nb = len(b)
        b = b * (1 + 0.15 * np.sin(TWO_PI * 4.5 * tline(nb)))
        out = place(out, b * 0.4, 0.55 + 0.06 * i)
    return finish(verb(out, 1.2, 0.3), 0.1, max_len=1.8)


def skill_cupcake():
    """Coin-sprinkle sparkle cascade."""
    out = np.zeros(_n(1.25))
    out = place(out, bubble(350, 1000, 0.05, 0.02) * 0.5, 0.0)
    r = rng("cupcake")
    for k in range(14):
        tt = 0.02 + 0.75 * (k / 14) ** 0.9 + r.uniform(0, 0.02)
        m = r.uniform(91, 101)
        out = place(out, ping(m, 0.2, ratio=1.41, index=1.6, tau=r.uniform(0.04, 0.08)) * r.uniform(0.35, 0.6), tt)
    out = place(out, sparkle(0.8, 10, 96, 108, seed=114, amp=0.25, tau=0.05), 0.05)
    out = place(out, I.fm_bell(96, 0.3, 0.6, ratio=2.0, index=0.8, decay=0.8) * 0.5, 0.8)
    return finish(verb(out, 0.9, 0.2), 0.06, max_len=1.4)


def skill_cotton():
    """Fluffy cloud whoosh with soft high chord."""
    out = np.zeros(_n(1.4))
    out = place(out, nburst(0.12, 300, 2500, seed=115, a=0.002, tau=0.04, pinkish=True) * 0.5, 0.0)
    n = _n(1.0)
    t = tline(n)
    cloud = butter(pink(n, "cotton"), "bandpass", [250, 2200], 2)
    cloud = tvf(cloud, 600 + 1800 * np.sin(np.pi * t / 1.0), 0.7, block=64)
    cloud *= env_seg([(0, 0.2), (0.25, 1.0), (0.6, 0.6), (1.0, 0)], n)
    out = place(out, cloud * 0.6, 0.0)
    for i, m in enumerate((84, 88, 91, 95)):
        out = place(out, I.celesta(m, 0.4, 0.5) * 0.35, 0.12 + 0.05 * i)
    out = place(out, sparkle(0.7, 6, 96, 106, seed=116, amp=0.2), 0.3)
    return finish(verb(out, 1.3, 0.3), 0.1)


def pet():
    out = np.zeros(_n(0.45))
    for k, (m, t0) in enumerate(((86, 0.0), (91, 0.075))):
        n = _n(0.07)
        t = tline(n)
        f = mtof(m) * (1 + 0.06 * (1 - np.exp(-t / 0.015)))
        y = np.sin(TWO_PI * phase_acc(f)) + 0.2 * np.sin(2 * TWO_PI * phase_acc(f))
        y *= env_seg([(0, 0), (0.002, 1), (0.04, 0.6), (0.07, 0)], n)
        out = place(out, y * 0.8, t0)
    out = place(out, sparkle(0.25, 4, 96, 106, seed=117, amp=0.3, tau=0.05), 0.12)
    return finish(out, 0.03, max_len=0.45)


def spring():
    n = _n(0.5)
    t = tline(n)
    f = (280 + 220 * (1 - np.exp(-t / 0.08))) * (1 + 0.22 * np.exp(-t / 0.12) * np.sin(TWO_PI * 15 * t))
    ph = phase_acc(f)
    y = np.sin(TWO_PI * ph) + 0.25 * np.sin(2 * TWO_PI * ph) * np.exp(-t / 0.1)
    y *= env_seg([(0, 0), (0.002, 1), (0.25, 0.6), (0.5, 0)], n)
    out = y.copy()
    out = place(out, nburst(0.02, 1500, 6000, seed=118, tau=0.003) * 0.2, 0.0)
    return finish(out, 0.03)


def crumble():
    out = np.zeros(_n(0.6))
    out = place(out, thump(160, 80, 0.1, 0.015, 0.03, 1.5) * 0.6, 0.0)
    out = place(out, nburst(0.08, 300, 3000, seed=119, a=0.0005, tau=0.02) * 0.6, 0.0)
    r = rng("crumble")
    for k in range(16):
        tt = r.uniform(0, 0.42) * (k / 16) ** 0.6
        lo = r.uniform(400, 1200)
        g = nburst(0.04, lo, lo * 4, seed=120 + k, a=0.0005, tau=r.uniform(0.004, 0.015)) * r.uniform(0.2, 0.55) * (1 - 0.5 * k / 16)
        out = place(out, g, tt)
    return finish(out, 0.04)


def pop_spike():
    out = np.zeros(_n(0.3))
    out = place(out, nburst(0.012, 1000, 8000, seed=121, tau=0.002) * 0.6, 0.0)
    out = place(out, bubble(500, 1400, 0.03, 0.012) * 0.6, 0.0)
    n = _n(0.25)
    t = tline(n)
    sh = np.sin(TWO_PI * 2400 * t + 2.0 * np.exp(-t / 0.03) * np.sin(TWO_PI * 2400 * 1.41 * t)) * env_perc(n, 0.0005, 0.06)
    out = place(out, sh * 0.45, 0.01)
    out = place(out, whoosh_noise(0.12, 2000, 9000, 1.0, seed=122, peak_at=0.3) * 0.25, 0.0)
    return finish(out, 0.03)


def land_change():
    out = np.zeros(_n(1.8))
    out = place(out, whoosh_noise(0.8, 400, 6000, 0.9, seed=130, peak_at=0.5, f2=900) * 0.45, 0.0)
    out = place(out, arpeggio([72, 79, 84, 88, 91], 0.09, I.fm_bell, vel=0.75, ring=0.9, ratio=2.0, index=1.0, decay=1.0,
                        vel_ramp=0.2), 0.0)
    pad = np.zeros(_n(1.4))
    for m in (60, 64, 67, 72):
        pad = place(pad, I.supersaw(m, 0.7, 0.5, voices=5, detune=0.15, cutoff=3000, a=0.2, d=0.3, s=0.8, r=0.5)[:, 0], 0.0)
    out = place(out, pad * 0.25, 0.3)
    out = place(out, sparkle(0.9, 12, 91, 106, seed=131, amp=0.3), 0.4)
    return finish(verb(out, 1.4, 0.3), 0.12, max_len=1.7)


def count_beep():
    n = _n(0.2)
    t = tline(n)
    y = np.sin(TWO_PI * 880 * t + 0.6 * np.exp(-t / 0.02) * np.sin(TWO_PI * 1760 * t)) + 0.25 * np.sin(TWO_PI * 1760 * t) * np.exp(-t / 0.05)
    y *= env_seg([(0, 0), (0.002, 1), (0.12, 0.7), (0.2, 0)], n)
    return finish(y, 0.03)


def count_go():
    out = np.zeros(_n(0.8))
    for m, g in ((81, 1.0), (88, 0.7), (93, 0.8), (85, 0.5)):
        n = _n(0.5)
        t = tline(n)
        f = float(mtof(m))
        y = np.sin(TWO_PI * f * t + 0.7 * np.exp(-t / 0.03) * np.sin(TWO_PI * 2 * f * t)) * env_seg([(0, 0), (0.002, 1), (0.25, 0.6), (0.5, 0)], n)
        out = place(out, y * g * 0.5, 0.0)
    out = place(out, whoosh_noise(0.3, 1500, 9000, 0.9, seed=132, peak_at=0.2) * 0.2, 0.0)
    out = place(out, sparkle(0.4, 6, 96, 106, seed=133, amp=0.3), 0.05)
    return finish(verb(out, 0.8, 0.2), 0.05, max_len=0.75)


def new_record():
    out = np.zeros(_n(2.0))
    out = place(out, I.snare(tone_hz=210, decay=0.1) * 0.35, 0.0)
    out = place(out, ping(96, 0.2, ratio=2.0, index=1.0, tau=0.05) * 0.3, 0.0)
    out = place(out, arpeggio([67, 72, 76, 79], 0.07, I.brass, vel=0.85, ring=0.12, bright=1.1), 0.0)
    ch1 = mix(*[I.brass(m, 0.12, 0.8, bright=1.0) for m in (62, 67, 71, 74)])
    out = place(out, ch1 * 0.4, 0.3)
    ch2 = np.zeros(_n(1.5))
    for m in (60, 64, 67, 72, 76):
        ch2 = place(ch2, I.brass(m, 0.7, 0.85, bright=1.1), 0.0)
        ch2 = place(ch2, I.strings(m + 12, 0.7, 0.5, a=0.02, r=0.5)[:, 0] * 0.5, 0.0)
    out = place(out, ch2 * 0.35, 0.45)
    out = place(out, I.crash(decay=1.6, stereo=False) * 0.3, 0.45)
    out = place(out, I.timpani_note(48, 0.3, 0.8) * 0.5, 0.45)
    out = place(out, sparkle(1.2, 18, 91, 108, seed=134, amp=0.3), 0.5)
    return finish(verb(out, 1.5, 0.3), 0.15, max_len=2.4)


def spurt():
    out = np.zeros(_n(0.6))
    z = sweep(320, 1600, 0.35, "saw", ease=0.7)
    z = bq(z, "lowpass", 3000, 0.9) * env_seg([(0, 0), (0.003, 0.8), (0.25, 0.6), (0.35, 0)], _n(0.35))
    out = place(out, z * 0.45, 0.0)
    out = place(out, sweep(500, 2000, 0.3, "sine", ease=0.7) * env_perc(_n(0.3), 0.002, 0.12) * 0.5, 0.0)
    out = place(out, whoosh_noise(0.4, 900, 5500, 1.0, seed=135, peak_at=0.35, f2=2500) * 0.35, 0.0)
    out = place(out, ping(98, 0.2, ratio=2.0, index=1.0, tau=0.06) * 0.3, 0.3)
    return finish(out, 0.04)


def combo():
    out = np.zeros(_n(0.45))
    for i, m in enumerate((88, 91, 96)):
        out = place(out, I.fm_bell(m, 0.08, 0.7 + 0.1 * i, ratio=2.0, index=1.0, decay=0.45) * 0.8, i * 0.045)
    out = place(out, ping(98, 0.15, ratio=2.0, index=1.0, tau=0.04) * 0.3, 0.13)
    return finish(out, 0.04, max_len=0.45)


def whoosh():
    y = whoosh_noise(0.42, 350, 2600, 1.1, seed=136, peak_at=0.33, f2=700)
    y += 0.12 * whoosh_noise(0.42, 1500, 6500, 0.9, seed=137, peak_at=0.3, f2=3000)
    return finish(y, 0.03)


# ----------------------------------------------------------------------------- registry
# name -> (function, loudness category)
SFX = {
    "ui_click": (ui_click, "ui"), "ui_back": (ui_back, "ui"), "ui_open": (ui_open, "ui"), "ui_buy": (ui_buy, "ui_big"),
    "ui_levelup": (ui_levelup, "ui_big"), "ui_unlock": (ui_unlock, "ui_big"), "ui_error": (ui_error, "ui"),
    "ui_toggle": (ui_toggle, "ui"), "ui_tick": (ui_tick, "tick"), "ui_reward": (ui_reward, "ui_big"),
    "ui_select": (ui_select, "ui"), "ui_swipe": (ui_swipe, "ui"),
    "jump": (jump, "run"), "jump2": (jump2, "run"), "slide": (slide, "run"), "land": (land, "run_soft"),
    "jelly": (jelly, "tick"), "jelly_big": (jelly_big, "pickup"), "jelly_rainbow": (jelly_rainbow, "pickup"),
    "coin": (coin, "pickup_small"), "coin_big": (coin_big, "pickup"), "item": (item, "pickup"), "magnet": (magnet, "power"),
    "giant_on": (giant_on, "event"), "giant_step": (giant_step, "run_soft"), "giant_off": (giant_off, "power"),
    "dash_on": (dash_on, "event"), "smash": (smash, "impact"), "convert": (convert, "power"),
    "shield_on": (shield_on, "power"), "shield_break": (shield_break, "impact"), "milk": (milk, "pickup"),
    "letter": (letter, "pickup"), "rush_start": (rush_start, "event"), "rush_end": (rush_end, "event"),
    "hit": (hit, "impact"), "low_energy": (low_energy, "alert"), "exhausted": (exhausted, "impact"), "fall": (fall, "impact"),
    "revive": (revive, "event"), "relay": (relay, "power"), "skill": (skill, "event"), "skill_chip": (skill_chip, "event"),
    "skill_maca": (skill_maca, "event"), "skill_pudding": (skill_pudding, "event"), "skill_donut": (skill_donut, "event"),
    "skill_marsh": (skill_marsh, "event"), "skill_cupcake": (skill_cupcake, "event"), "skill_cotton": (skill_cotton, "event"),
    "pet": (pet, "pickup_small"), "spring": (spring, "run"), "crumble": (crumble, "run"), "pop_spike": (pop_spike, "run"),
    "land_change": (land_change, "event"), "count_beep": (count_beep, "alert"), "count_go": (count_go, "event"),
    "new_record": (new_record, "event"), "spurt": (spurt, "power"), "combo": (combo, "pickup_small"), "whoosh": (whoosh, "run_soft"),
}
