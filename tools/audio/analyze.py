"""DESSERT DASH audio toolkit - analysis & verification plots (matplotlib, Agg backend)."""
import numpy as np

from synth import SR, kweight, lufs_integrated, lufs_max, todb, true_peak_db

BANDS = [("sub", 20, 60), ("bass", 60, 150), ("lowmid", 150, 500), ("mid", 500, 2000),
         ("himid", 2000, 5000), ("pres", 5000, 10000), ("air", 10000, 20000)]


def band_energy(x):
    """Long-term spectrum energy per band in dB relative to total (Welch PSD)."""
    from scipy import signal
    m = x.mean(1) if x.ndim == 2 else x
    f, p = signal.welch(m, SR, nperseg=8192)
    tot = np.sum(p) + 1e-30
    out = {}
    for name, lo, hi in BANDS:
        sel = (f >= lo) & (f < hi)
        out[name] = 10 * np.log10(np.sum(p[sel]) / tot + 1e-30)
    return out


def spectral_centroid(x):
    from scipy import signal
    m = x.mean(1) if x.ndim == 2 else x
    f, p = signal.welch(m, SR, nperseg=4096)
    return float(np.sum(f * p) / (np.sum(p) + 1e-30))


def _plt():
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    return plt


def spec_sheet(items, out_png, cols=4, fmax=16000, title=None):
    """Grid of (waveform + spectrogram) panels for short sounds. items: [(name, signal), ...]."""
    plt = _plt()
    rows = (len(items) + cols - 1) // cols
    fig, axes = plt.subplots(rows * 2, cols, figsize=(cols * 3.6, rows * 3.3),
                             gridspec_kw={"height_ratios": [1, 2.2] * rows})
    axes = np.atleast_2d(axes)
    for i in range(rows * cols):
        r, c = divmod(i, cols)
        aw, asp = axes[2 * r, c], axes[2 * r + 1, c]
        if i >= len(items):
            aw.axis("off")
            asp.axis("off")
            continue
        name, y = items[i]
        m = y.mean(1) if y.ndim == 2 else y
        t = np.arange(len(m)) / SR
        aw.plot(t, m, lw=0.5, color="#c0398f")
        aw.set_xlim(0, t[-1] if len(t) else 1)
        aw.set_ylim(-1.05, 1.05)
        aw.set_title(f"{name}  {len(m) / SR * 1000:.0f}ms  pk {todb(np.max(np.abs(y))):.1f}dB", fontsize=8)
        aw.tick_params(labelsize=6)
        nfft = 512 if len(m) > 2048 else 256
        if len(m) > nfft:
            from scipy import signal as _sg
            f, tt, S = _sg.spectrogram(m, SR, window="hann", nperseg=nfft, noverlap=nfft * 3 // 4, mode="magnitude")
            S = 20 * np.log10(S + 1e-12)
            S -= S.max()
            asp.pcolormesh(tt, f, np.maximum(S, -70), cmap="magma", vmin=-70, vmax=0, shading="auto")
        asp.set_ylim(0, fmax)
        asp.tick_params(labelsize=6)
    if title:
        fig.suptitle(title)
    fig.tight_layout()
    fig.savefig(out_png, dpi=80)
    plt.close(fig)


def music_plot(x, out_png, title="", bpm=None, bars=None):
    plt = _plt()
    m = x.mean(1) if x.ndim == 2 else x
    fig, axes = plt.subplots(3, 1, figsize=(16, 9), gridspec_kw={"height_ratios": [1, 2.5, 1]})
    t = np.arange(len(m)) / SR
    # short-term RMS (momentary-ish loudness) curve
    w = int(0.1 * SR)
    k = kweight(x if x.ndim == 2 else x[:, None])
    e = np.sum(k ** 2, 1)
    c = np.concatenate([[0], np.cumsum(e)])
    idx = np.arange(0, len(e) - int(0.4 * SR), w)
    mom = -0.691 + 10 * np.log10((c[idx + int(0.4 * SR)] - c[idx]) / (0.4 * SR) + 1e-20)
    axes[0].plot(t[::20], m[::20], lw=0.3, color="#555")
    axes[0].set_xlim(0, t[-1])
    axes[0].set_title(title)
    axes[1].specgram(m + 1e-9, NFFT=2048, Fs=SR, noverlap=1024, cmap="magma", vmin=-130, vmax=-30)
    axes[1].set_ylim(0, 16000)
    axes[2].plot(idx / SR, mom, color="#c0398f", lw=0.8)
    axes[2].set_xlim(0, t[-1])
    axes[2].set_ylim(-40, -5)
    axes[2].set_ylabel("momentary LUFS")
    if bpm and bars:
        for b in range(0, bars + 1, 4):
            for ax in axes:
                ax.axvline(b * 4 * 60 / bpm, color="#3aa", lw=0.5, alpha=0.6)
    fig.tight_layout()
    fig.savefig(out_png, dpi=70)
    plt.close(fig)


def seam_plot(x, out_png, title="", ms=40):
    """Waveform of the loop's last `ms` followed by its first `ms` (what plays across the seam)."""
    plt = _plt()
    n = int(ms / 1000 * SR)
    xs = x if x.ndim == 2 else x[:, None]
    joined = np.concatenate([xs[-n:], xs[:n]], 0)
    fig, axes = plt.subplots(2, 1, figsize=(14, 6))
    tt = (np.arange(len(joined)) - n) / SR * 1000
    for ch in range(xs.shape[1]):
        axes[0].plot(tt, joined[:, ch], lw=0.7, label=f"ch{ch}")
    axes[0].axvline(0, color="r", lw=0.8)
    axes[0].set_title(f"{title}: last {ms} ms | first {ms} ms (seam at 0)")
    axes[0].legend(fontsize=7)
    # zoom +-2 ms
    z = int(0.002 * SR)
    jz = np.concatenate([xs[-z:], xs[:z]], 0)
    tz = (np.arange(len(jz)) - z) / SR * 1000
    for ch in range(xs.shape[1]):
        axes[1].plot(tz, jz[:, ch], ".-", lw=0.7, ms=2)
    axes[1].axvline(0, color="r", lw=0.8)
    axes[1].set_title("zoom +-2 ms")
    fig.tight_layout()
    fig.savefig(out_png, dpi=80)
    plt.close(fig)


def seam_metrics(x):
    """Click / continuity metrics across the loop seam."""
    xs = x if x.ndim == 2 else x[:, None]
    d = np.abs(np.diff(xs, axis=0))
    jump = np.abs(xs[0] - xs[-1]).max()
    p99 = np.percentile(d.max(1), 99.0)
    p50 = np.median(d.max(1))
    w = int(0.05 * SR)
    r_end = np.sqrt(np.mean(xs[-w:] ** 2))
    r_start = np.sqrt(np.mean(xs[:w] ** 2))
    # spectral continuity: compare 4096-pt spectra before/after seam
    nfft = 4096
    a = xs[-nfft:].mean(1) * np.hanning(nfft)
    b = xs[:nfft].mean(1) * np.hanning(nfft)
    A = todb(np.abs(np.fft.rfft(a)) + 1e-9)
    B = todb(np.abs(np.fft.rfft(b)) + 1e-9)
    spec_diff = float(np.mean(np.abs(A[10:1500] - B[10:1500])))
    return dict(jump=float(jump), d_p50=float(p50), d_p99=float(p99), ratio_p99=float(jump / (p99 + 1e-12)),
                rms_end_db=float(todb(r_end)), rms_start_db=float(todb(r_start)), spec_diff_db=spec_diff)
