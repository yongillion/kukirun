"""DESSERT DASH audio toolkit - DSP core.

Pure numpy/scipy, fully deterministic (all noise comes from seeded generators).
Contents
  * helpers: seeds, pitch, dB, time
  * envelopes (ADSR, percussive, segments)
  * band-limited oscillators (PolyBLEP saw / pulse, triangle, sine, FM operators, noise)
  * filters (RBJ biquads, Butterworth, time-varying biquad, circular "pre-roll" filtering)
  * effects (fractional delay, chorus, synthetic stereo reverb IR, ping-pong delay IR,
    linear / circular FFT convolution, saturation)
  * dynamics (sidechain duck envelope, bus compressor, true-peak look-ahead limiter)
  * measurement (BS.1770-4 K-weighted LUFS: integrated / momentary / short-term, true peak)
"""
import zlib

import numpy as np
import scipy.fft as sfft
from scipy import signal
from scipy.ndimage import uniform_filter1d

SR = 44100
TWO_PI = 2.0 * np.pi


# ----------------------------------------------------------------------------- helpers
def seed_of(*parts):
    """Stable 31-bit seed from arbitrary parts (never use hash(): it is salted per process)."""
    return zlib.crc32(repr(parts).encode("utf-8")) & 0x7FFFFFFF


def rng(*parts):
    return np.random.default_rng(seed_of(*parts))


def mtof(m):
    return 440.0 * 2.0 ** ((np.asarray(m, dtype=np.float64) - 69.0) / 12.0)


def undb(d):
    return 10.0 ** (np.asarray(d, dtype=np.float64) / 20.0)


def todb(x, floor=1e-12):
    return 20.0 * np.log10(np.maximum(np.abs(x), floor))


def ns(sec):
    return max(0, int(round(sec * SR)))


def tline(n):
    return np.arange(n, dtype=np.float64) / SR


def pad_to(x, n):
    if len(x) >= n:
        return x[:n]
    out = np.zeros((n,) + x.shape[1:])
    out[: len(x)] = x
    return out


def mix_into(buf, pos, sig, circular=False):
    """Add `sig` into `buf` at sample `pos` (mono or stereo). circular=True wraps around the end."""
    n = len(buf)
    m = len(sig)
    if m == 0:
        return
    if circular:
        pos %= n
        while m > 0:
            take = min(m, n - pos)
            buf[pos : pos + take] += sig[:take]
            sig = sig[take:]
            m -= take
            pos = 0
        return
    if pos >= n or pos + m <= 0:
        return
    s0 = max(0, -pos)
    s1 = min(m, n - pos)
    buf[pos + s0 : pos + s1] += sig[s0:s1]


def fade_edges(x, fin=0.0005, fout=0.005):
    """Raised-cosine fade in / out (seconds)."""
    x = np.array(x, dtype=np.float64, copy=True)
    n = len(x)
    a = min(ns(fin), n // 2)
    b = min(ns(fout), n // 2)
    if a > 0:
        w = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, a, endpoint=False))
        x[:a] *= w if x.ndim == 1 else w[:, None]
    if b > 0:
        w = 0.5 + 0.5 * np.cos(np.linspace(0, np.pi, b))
        x[n - b :] *= w if x.ndim == 1 else w[:, None]
    return x


# ----------------------------------------------------------------------------- envelopes
def env_adsr(dur, a=0.005, d=0.2, s=0.7, r=0.15, a_pow=1.0, total=None):
    """ADSR: note held for `dur` s, then exponential-ish release that reaches exactly 0 after `r` s."""
    r = max(r, 0.002)
    n = ns(total if total is not None else dur + r)
    t = tline(n)
    a = max(a, 1e-4)
    tau_d = max(d, 1e-4) / 4.0

    def on(tt):
        att = np.clip(tt / a, 0.0, 1.0) ** a_pow
        dec = s + (1.0 - s) * np.exp(-np.maximum(tt - a, 0.0) / tau_d)
        return np.where(tt < a, att, dec)

    e = on(t)
    lvl = float(on(np.array([dur]))[0])
    tr = t - dur
    rel = lvl * np.exp(-np.maximum(tr, 0) / (r / 4.0)) * np.clip(1.0 - tr / r, 0.0, 1.0)
    return np.where(t < dur, e, rel)


def env_perc(n, a=0.001, tau=0.2, hold=0.0, curve_pow=1.0):
    """Fast attack, optional hold, exponential decay. n = samples."""
    t = tline(n)
    a = max(a, 1e-5)
    att = np.clip(t / a, 0.0, 1.0) ** curve_pow
    dec = np.exp(-np.maximum(t - a - hold, 0.0) / tau)
    return att * dec


def env_seg(points, n=None):
    """Piecewise-linear envelope from [(t, value), ...] (seconds)."""
    ts = np.array([p[0] for p in points], dtype=np.float64)
    vs = np.array([p[1] for p in points], dtype=np.float64)
    if n is None:
        n = ns(ts[-1])
    return np.interp(tline(n), ts, vs)


def env_exp_seg(points, n=None):
    """Like env_seg but interpolates in log domain (values must be > 0) - good for pitch/cutoff."""
    ts = np.array([p[0] for p in points], dtype=np.float64)
    vs = np.log(np.array([p[1] for p in points], dtype=np.float64))
    if n is None:
        n = ns(ts[-1])
    return np.exp(np.interp(tline(n), ts, vs))


# ----------------------------------------------------------------------------- oscillators
def phase_acc(freq, n=None, ph0=0.0):
    """Unwrapped phase in cycles. freq: scalar (needs n) or per-sample array."""
    if np.isscalar(freq) or np.ndim(freq) == 0:
        return ph0 + np.arange(n, dtype=np.float64) * (float(freq) / SR)
    f = np.asarray(freq, dtype=np.float64)
    ph = np.empty_like(f)
    ph[0] = 0.0
    np.cumsum(f[:-1], out=ph[1:])
    return ph0 + ph / SR


def _dt(freq, n):
    if np.isscalar(freq) or np.ndim(freq) == 0:
        return np.full(n, abs(float(freq)) / SR)
    return np.abs(np.asarray(freq, dtype=np.float64)) / SR


def _polyblep(t, dt):
    out = np.zeros_like(t)
    m = t < dt
    if m.any():
        x = t[m] / dt[m]
        out[m] = x + x - x * x - 1.0
    m = t > 1.0 - dt
    if m.any():
        x = (t[m] - 1.0) / dt[m]
        out[m] = x * x + x + x + 1.0
    return out


def osc_sine(freq, n=None, ph0=0.0):
    ph = phase_acc(freq, n, ph0)
    return np.sin(TWO_PI * ph)


def osc_saw(freq, n=None, ph0=0.0):
    ph = phase_acc(freq, n, ph0)
    dt = np.minimum(_dt(freq, len(ph)), 0.5)
    t = ph % 1.0
    return 2.0 * t - 1.0 - _polyblep(t, dt)


def osc_pulse(freq, n=None, width=0.5, ph0=0.0):
    ph = phase_acc(freq, n, ph0)
    dt = np.minimum(_dt(freq, len(ph)), 0.5)
    t = ph % 1.0
    w = np.broadcast_to(np.asarray(width, dtype=np.float64), t.shape)
    y = np.where(t < w, 1.0, -1.0)
    y = y + _polyblep(t, dt) - _polyblep((t - w) % 1.0, dt)
    return y - (2.0 * w - 1.0)


def osc_tri(freq, n=None, ph0=0.25):
    """Triangle (naive; harmonics fall at 12 dB/oct so aliasing stays far below audibility)."""
    ph = phase_acc(freq, n, ph0)
    t = ph % 1.0
    return 1.0 - 4.0 * np.abs(t - 0.5)


def fm_op(freq, n, ratio, index, ph0=0.0, mod_ph0=0.0, fb=0.0):
    """Two-operator phase modulation: sin(2pi*fc*t + I(t)*sin(2pi*ratio*fc*t)). freq may be an array."""
    pc = phase_acc(freq, n, ph0)
    pm = phase_acc(freq * ratio if np.ndim(freq) else float(freq) * ratio, n, mod_ph0)
    mod = np.sin(TWO_PI * pm)
    if fb:
        mod = np.sin(TWO_PI * pm + fb * mod)
    return np.sin(TWO_PI * pc + index * mod)


def noise(n, *seed):
    return rng("noise", *seed).standard_normal(n)


def pink(n, *seed):
    w = noise(n + 2048, "pink", *seed)
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1.0, -2.494956002, 2.017265875, -0.522189400]
    y = signal.lfilter(b, a, w)[2048:]
    return y / (np.std(y) + 1e-12)


def vibrato_curve(n, rate=5.5, depth=0.2, delay=0.15, rise=0.2, ph0=0.0):
    """Pitch offset in semitones: delayed, fading-in sinusoidal vibrato."""
    t = tline(n)
    amt = np.clip((t - delay) / max(rise, 1e-3), 0.0, 1.0)
    return depth * amt * np.sin(TWO_PI * (rate * t + ph0))


# ----------------------------------------------------------------------------- filters
def rbj(kind, f0, q=0.7071, gain_db=0.0, sr=SR):
    f0 = float(np.clip(f0, 5.0, 0.49 * sr))
    w0 = TWO_PI * f0 / sr
    cw, sw = np.cos(w0), np.sin(w0)
    alpha = sw / (2.0 * q)
    A = 10.0 ** (gain_db / 40.0)
    if kind == "lowpass":
        b = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "highpass":
        b = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "bandpass":  # constant 0 dB peak gain
        b = [alpha, 0.0, -alpha]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "notch":
        b = [1.0, -2 * cw, 1.0]
        a = [1 + alpha, -2 * cw, 1 - alpha]
    elif kind == "peak":
        b = [1 + alpha * A, -2 * cw, 1 - alpha * A]
        a = [1 + alpha / A, -2 * cw, 1 - alpha / A]
    elif kind == "lowshelf":
        sa = 2 * np.sqrt(A) * alpha
        b = [A * ((A + 1) - (A - 1) * cw + sa), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - sa)]
        a = [(A + 1) + (A - 1) * cw + sa, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - sa]
    elif kind == "highshelf":
        sa = 2 * np.sqrt(A) * alpha
        b = [A * ((A + 1) + (A - 1) * cw + sa), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - sa)]
        a = [(A + 1) - (A - 1) * cw + sa, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - sa]
    else:
        raise ValueError(kind)
    b = np.array(b) / a[0]
    a = np.array(a) / a[0]
    return b, a


def bq(x, kind, f0, q=0.7071, gain_db=0.0):
    b, a = rbj(kind, f0, q, gain_db)
    return signal.lfilter(b, a, x, axis=0)


def butter(x, kind, f, order=2, zero_phase=False):
    sos = signal.butter(order, f, btype=kind, fs=SR, output="sos")
    if zero_phase:
        return signal.sosfiltfilt(sos, x, axis=0)
    return signal.sosfilt(sos, x, axis=0)


def onepole_lp(x, fc):
    a = np.exp(-TWO_PI * fc / SR)
    return signal.lfilter([1 - a], [1, -a], x, axis=0)


def onepole_hp(x, fc):
    a = np.exp(-TWO_PI * fc / SR)
    return signal.lfilter([(1 + a) / 2, -(1 + a) / 2], [1, -a], x, axis=0)


def dc_block(x, fc=20.0):
    return onepole_hp(x, fc)


def tvf(x, fc, q=0.7071, kind="lowpass", block=32):
    """Time-varying biquad (block-wise coefficient update, DF2T state carried across blocks)."""
    x = np.asarray(x, dtype=np.float64)
    n = len(x)
    if np.ndim(fc) == 0:
        return bq(x, kind, float(fc), q)
    fc = np.asarray(fc, dtype=np.float64)
    nb = (n + block - 1) // block
    centers = np.minimum(np.arange(nb) * block + block // 2, n - 1)
    f0 = np.clip(fc[centers], 10.0, 0.45 * SR)
    w0 = TWO_PI * f0 / SR
    cw, sw = np.cos(w0), np.sin(w0)
    alpha = sw / (2.0 * q)
    a0 = 1 + alpha
    if kind == "lowpass":
        B = np.stack([(1 - cw) / 2, 1 - cw, (1 - cw) / 2], 1) / a0[:, None]
    elif kind == "highpass":
        B = np.stack([(1 + cw) / 2, -(1 + cw), (1 + cw) / 2], 1) / a0[:, None]
    elif kind == "bandpass":
        B = np.stack([alpha, np.zeros_like(alpha), -alpha], 1) / a0[:, None]
    else:
        raise ValueError(kind)
    Acoef = np.stack([np.ones_like(cw), -2 * cw / a0, (1 - alpha) / a0], 1)
    y = np.empty(n)
    zi = np.zeros(2)
    lf = signal.lfilter
    for i in range(nb):
        s = i * block
        y[s : s + block], zi = lf(B[i], Acoef[i], x[s : s + block], zi=zi)
    return y


def circ(fn, x, pre=None):
    """Apply a causal (stateful) process `fn` to a periodic signal without a seam transient:
    the last `pre` samples are pre-rolled so filter state at t=0 equals the state at the loop end."""
    n = len(x)
    pre = min(n, pre if pre is not None else SR)
    y = fn(np.concatenate([x[n - pre :], x], axis=0))
    return y[pre:]


# ----------------------------------------------------------------------------- effects
def frac_delay(x, d, circular=False):
    """Read x[n - d[n]] with linear interpolation (d in samples, array or scalar)."""
    n = len(x)
    idx = np.arange(n, dtype=np.float64) - d
    i0 = np.floor(idx).astype(np.int64)
    fr = idx - i0
    if x.ndim == 2:
        fr = fr[:, None]
    if circular:
        a = x[i0 % n]
        b = x[(i0 + 1) % n]
        return a * (1 - fr) + b * fr
    ok0 = (i0 >= 0) & (i0 < n)
    ok1 = (i0 + 1 >= 0) & (i0 + 1 < n)
    a = np.where(ok0 if x.ndim == 1 else ok0[:, None], x[np.clip(i0, 0, n - 1)], 0.0)
    b = np.where(ok1 if x.ndim == 1 else ok1[:, None], x[np.clip(i0 + 1, 0, n - 1)], 0.0)
    return a * (1 - fr) + b * fr


def lfo_rate(rate, period):
    """Quantise an LFO rate so an integer number of cycles fits the loop period (seamless loops)."""
    if not period:
        return rate
    k = max(1, int(round(rate * period)))
    return k / period


def chorus(x, rate=0.5, depth_ms=2.2, base_ms=11.0, voices=2, mix=0.5, period=None, circular=False):
    """Mono or stereo in -> stereo out. Quadrature LFOs per side give a wide, smooth ensemble."""
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    n = len(x)
    t = tline(n)
    out = np.zeros_like(x)
    for v in range(voices):
        r = lfo_rate(rate * (1.0 + 0.23 * v), period)
        for ch in (0, 1):
            ph = v / voices + 0.25 * ch
            d = (base_ms + 2.3 * v + depth_ms * np.sin(TWO_PI * (r * t + ph))) * SR / 1000.0
            out[:, ch] += frac_delay(x[:, ch], d, circular)
    out /= voices
    return (1 - mix) * x + mix * out


def saturate(x, drive=1.0):
    if drive <= 0:
        return x
    return np.tanh(drive * x) / np.tanh(drive)


def reverb_ir(rt60=1.8, predelay=0.018, length=None, seed=1, early=14, early_span=0.07,
              hf=1.0, lf=1.1, width=1.0, build_ms=25.0, er_level=0.6, hp=180.0, lp=9500.0):
    """Synthetic stereo room/hall impulse response: early reflections + band-wise exponentially
    decaying decorrelated noise tail (high bands decay faster). Returns (m, 2), unit energy/channel."""
    L = length if length is not None else rt60 * 1.15 + predelay
    n = ns(L)
    t = tline(n)
    bands = [(None, 300.0, 1.12 * lf), (300.0, 1200.0, 1.0), (1200.0, 3500.0, 0.85 * hf ** 0.5),
             (3500.0, 8000.0, 0.62 * hf), (8000.0, None, 0.40 * hf)]
    ir = np.zeros((n, 2))
    r = rng("ir", seed)
    pd = ns(predelay)
    for ch in range(2):
        wn = r.standard_normal(n)
        tail = np.zeros(n)
        for lo, hi, mul in bands:
            if lo is None:
                bnd = butter(wn, "lowpass", hi, 4, zero_phase=True)
            elif hi is None:
                bnd = butter(wn, "highpass", lo, 4, zero_phase=True)
            else:
                bnd = butter(wn, "bandpass", [lo, hi], 3, zero_phase=True)
            tail += bnd * np.exp(-6.9078 * t / max(rt60 * mul, 0.05))
        tail *= 1.0 - np.exp(-t / (build_ms / 1000.0 / 2.5))
        tail = np.concatenate([np.zeros(pd), tail])[:n]
        er = np.zeros(n)
        for k in range(early):
            tk = predelay * 0.35 + early_span * (k + r.uniform(0.1, 0.9)) / early
            g = er_level * (1.0 - 0.6 * k / early) * r.choice([-1.0, 1.0])
            i = ns(tk)
            if i < n - 4:
                er[i : i + 3] += g * np.array([0.5, 1.0, 0.5])
        er = onepole_lp(er, 7000.0)
        sig = tail / (np.sqrt(np.sum(tail ** 2)) + 1e-12) + er * 0.35
        ir[:, ch] = sig
    if width != 1.0:
        m = 0.5 * (ir[:, 0] + ir[:, 1])
        s = 0.5 * (ir[:, 0] - ir[:, 1]) * width
        ir = np.stack([m + s, m - s], 1)
    if hp:
        ir = butter(ir, "highpass", hp, 2)
    if lp:
        ir = butter(ir, "lowpass", lp, 2)
    ir /= np.sqrt(np.mean(np.sum(ir ** 2, axis=0)))
    ir = fade_edges(ir, 0.0, 0.05)
    return ir


def delay_ir(delay_s, feedback=0.38, taps=7, lp_hz=4500.0, hp_hz=350.0, pingpong=True, spread=0.85):
    """Explicit-tap stereo (ping-pong) feedback delay impulse response, repeats darken progressively."""
    n = ns(delay_s * taps + 0.06)
    ir = np.zeros((n, 2))
    h = np.zeros(1024)
    h[0] = 1.0
    h = onepole_hp(onepole_lp(h, lp_hz), hp_hz)
    cur = np.array([1.0])
    for k in range(1, taps + 1):
        cur = np.convolve(cur, h)[:1024]
        pos = ns(k * delay_s)
        g = feedback ** (k - 1)
        if pingpong:
            side = (k - 1) % 2
            gl = g * (spread if side == 0 else 1 - spread)
            gr = g * (1 - spread if side == 0 else spread)
        else:
            gl = gr = g
        seg = cur[: max(0, min(len(cur), n - pos))]
        ir[pos : pos + len(seg), 0] += gl * seg
        ir[pos : pos + len(seg), 1] += gr * seg
    return ir


def conv_circ(x, ir):
    """Circular (periodic) convolution: the exact steady-state response of a looping signal.
    x: (n,) or (n,2); ir: (m,) or (m,2). Returns same channel layout as ir (stereo if either is)."""
    n = len(x)
    if len(ir) > n:  # fold long IRs
        k = int(np.ceil(len(ir) / n))
        ir = pad_to(ir, k * n).reshape((k, n) + ir.shape[1:]).sum(0)
    X = sfft.rfft(x, axis=0)
    H = sfft.rfft(ir, n, axis=0)
    if X.ndim == 1 and H.ndim == 2:
        X = X[:, None]
    if H.ndim == 1 and X.ndim == 2:
        H = H[:, None]
    return sfft.irfft(X * H, n, axis=0)


def conv_lin(x, ir):
    """Linear convolution, output length len(x)+len(ir)-1."""
    if x.ndim == 1 and ir.ndim == 2:
        x = x[:, None]
    if ir.ndim == 1 and x.ndim == 2:
        ir = ir[:, None]
    return signal.fftconvolve(x, ir, axes=0) if x.ndim == 2 else signal.fftconvolve(x, ir)


def pan(x, p=0.0):
    """Constant-power pan of a mono signal, p in [-1, 1]."""
    th = (np.clip(p, -1, 1) + 1.0) * np.pi / 4.0
    return np.stack([x * np.cos(th), x * np.sin(th)], 1) * np.sqrt(2.0)


def stereo_width(x, w):
    m = 0.5 * (x[:, 0] + x[:, 1])
    s = 0.5 * (x[:, 0] - x[:, 1]) * w
    return np.stack([m + s, m - s], 1)


# ----------------------------------------------------------------------------- dynamics
def _maxplus_release(g, rate):
    """y[n] = max_{k<=n} (g[k] - rate*(n-k)): instant rise, linear (dB) fall."""
    k = np.arange(len(g), dtype=np.float64) * rate
    return np.maximum.accumulate(g + k) - k


def smooth_gr(gr, attack_s, release_s, depth_ref=12.0, circular=False):
    """Smooth a required gain-reduction curve (dB >= 0) so that the result is >= gr everywhere:
    linear-in-dB look-ahead attack (depth_ref dB per attack_s) and release (depth_ref dB per release_s)."""
    ra = depth_ref / max(attack_s * SR, 1.0)
    rr = depth_ref / max(release_s * SR, 1.0)
    n = len(gr)
    src = np.concatenate([gr, gr]) if circular else gr
    y = _maxplus_release(src, rr)
    y = _maxplus_release(y[::-1], ra)[::-1]
    if circular:
        y = np.maximum(y[n:], y[:n])
    return y


def duck_env(n, hits, depth=0.3, attack=0.004, release=0.18, circular=True, curve=2.0):
    """Sidechain-style gain curve built from kick sample positions: dip to (1-depth) then recover."""
    g = np.ones(n)
    la = max(1, ns(attack))
    lr = max(2, ns(release))
    seg = np.concatenate([0.5 - 0.5 * np.cos(np.linspace(0, np.pi, la, endpoint=False)),
                          (1.0 - np.linspace(0, 1, lr)) ** curve]) * depth
    for h in hits:
        idx = np.arange(int(h), int(h) + len(seg))
        if circular:
            idx %= n
            g[idx] = np.minimum(g[idx], 1.0 - seg)
        else:
            ok = (idx < n) & (idx >= 0)
            g[idx[ok]] = np.minimum(g[idx[ok]], 1.0 - seg[ok])
    return g


def compress(x, thr_db=-18.0, ratio=2.0, knee_db=6.0, attack_s=0.01, release_s=0.15,
             rms_s=0.012, makeup_db=0.0, circular=False):
    """Feed-forward RMS bus compressor (stereo-linked)."""
    xs = x if x.ndim == 2 else x[:, None]
    ms = np.mean(xs ** 2, axis=1)
    win = max(1, ns(rms_s))
    ms = uniform_filter1d(ms, win, mode="wrap" if circular else "nearest")
    lvl = 10.0 * np.log10(ms + 1e-12)
    over = lvl - thr_db
    slope = 1.0 - 1.0 / ratio
    gr = np.where(over <= -knee_db / 2, 0.0,
                  np.where(over >= knee_db / 2, over * slope, slope * (over + knee_db / 2) ** 2 / (2 * knee_db)))
    gr = smooth_gr(gr, attack_s, release_s, depth_ref=6.0, circular=circular)
    g = undb(makeup_db - gr)
    return x * (g[:, None] if x.ndim == 2 else g)


def true_peak_env(x, os=4, circular=False):
    """Per-sample true-peak magnitude (max over channels and `os` oversampled sub-samples)."""
    xs = x if x.ndim == 2 else x[:, None]
    n = len(xs)
    P = 64
    if circular:
        xp = np.concatenate([xs[n - P :], xs, xs[:P]], 0)
    else:
        xp = np.concatenate([np.zeros((P, xs.shape[1])), xs, np.zeros((P, xs.shape[1]))], 0)
    up = signal.resample_poly(xp, os, 1, axis=0)
    up = up[P * os : (P + n) * os]
    return np.abs(up).reshape(n, os, -1).max(axis=(1, 2))


def limiter(x, ceiling_db=-1.3, attack_s=0.0015, release_s=0.09, circular=False):
    """Look-ahead brickwall limiter with true-peak (4x oversampled) detection."""
    pk = true_peak_env(x, 4, circular)
    req = np.maximum(0.0, todb(pk) - ceiling_db)
    if req.max() <= 0:
        return x.copy(), 0.0
    gr = smooth_gr(req, attack_s, release_s, depth_ref=6.0, circular=circular)
    g = undb(-gr)
    return x * (g[:, None] if x.ndim == 2 else g), float(gr.max())


# ----------------------------------------------------------------------------- measurement
def _kweight_coeffs(sr=SR):
    f0 = 1681.974450955533
    G = 3.999843853973347
    Q = 0.7071752369554196
    K = np.tan(np.pi * f0 / sr)
    Vh = 10.0 ** (G / 20.0)
    Vb = Vh ** 0.4996667741545416
    a0 = 1.0 + K / Q + K * K
    b1 = np.array([(Vh + Vb * K / Q + K * K) / a0, 2.0 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0])
    a1 = np.array([1.0, 2.0 * (K * K - 1.0) / a0, (1.0 - K / Q + K * K) / a0])
    f0 = 38.13547087602444
    Q = 0.5003270373238773
    K = np.tan(np.pi * f0 / sr)
    d = 1.0 + K / Q + K * K
    a2 = np.array([1.0, 2.0 * (K * K - 1.0) / d, (1.0 - K / Q + K * K) / d])
    b2 = np.array([1.0, -2.0, 1.0])
    return (b1, a1), (b2, a2)


def kweight(x, sr=SR):
    (b1, a1), (b2, a2) = _kweight_coeffs(sr)
    return signal.lfilter(b2, a2, signal.lfilter(b1, a1, x, axis=0), axis=0)


def _block_ms(x, win, hop, sr=SR):
    """Channel-summed mean square of K-weighted signal over sliding windows."""
    xs = x if x.ndim == 2 else x[:, None]
    y = kweight(xs, sr)
    e = np.sum(y ** 2, axis=1)
    c = np.concatenate([[0.0], np.cumsum(e)])
    W = int(round(win * sr))
    H = max(1, int(round(hop * sr)))
    if len(e) < W:
        return np.array([c[-1] / W])
    starts = np.arange(0, len(e) - W + 1, H)
    return (c[starts + W] - c[starts]) / W


def lufs_integrated(x, sr=SR):
    z = _block_ms(x, 0.4, 0.1, sr)
    l = -0.691 + 10.0 * np.log10(z + 1e-20)
    g = l > -70.0
    if not g.any():
        return -120.0
    rel = -0.691 + 10.0 * np.log10(np.mean(z[g])) - 10.0
    g2 = g & (l > rel)
    return float(-0.691 + 10.0 * np.log10(np.mean(z[g2])))


def lufs_max(x, win=0.4, sr=SR, hop=0.01):
    """Maximum momentary (win=0.4) or short-term (win=3.0) loudness. Shorter signals are zero-padded."""
    xs = x if x.ndim == 2 else x[:, None]
    W = int(round(win * sr))
    if len(xs) < W:
        xs = np.concatenate([xs, np.zeros((W - len(xs), xs.shape[1]))], 0)
    z = _block_ms(xs, win, hop, sr)
    return float(-0.691 + 10.0 * np.log10(np.max(z) + 1e-20))


def true_peak_db(x, os=4):
    return float(todb(true_peak_env(x, os).max()))


def sample_peak_db(x):
    return float(todb(np.max(np.abs(x))))
