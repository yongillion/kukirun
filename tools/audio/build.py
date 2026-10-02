#!/usr/bin/env python3
"""DESSERT DASH - audio build.

Renders every SFX and music track (deterministic: all noise is seeded), loudness-normalises,
loop-wraps music (circular rendering), encodes MP3 with ffmpeg/libmp3lame, decodes the MP3 again
to verify length / loudness / true peak / seam continuity, then writes
  assets/audio/sfx/<name>.mp3   (mono, 44.1 kHz, 96 kbps)
  assets/audio/bgm/<name>.mp3   (stereo, 44.1 kHz, 128 kbps)
  assets/audio/audiopack.js     (window.__DD_AUDIO__ = { "sfx/jump": "<base64>", ... })
  src/data/audio_manifest.js    (AUDIO_MANIFEST, SPEC 4 format)
  tools/audio/build_report.txt  (the printed report)

usage: python3 tools/audio/build.py [--only a,b] [--plots DIR] [--jobs 2] [--no-music] [--no-sfx]
"""
import argparse
import base64
import os
import shutil
import subprocess
import sys
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.dont_write_bytecode = True  # keep the project tree clean (no __pycache__)

import numpy as np  # noqa: E402
from scipy.io import wavfile  # noqa: E402

from synth import (SR, bq, butter, fade_edges, limiter, lufs_integrated, lufs_max, sample_peak_db,  # noqa: E402
                   todb, true_peak_db, undb)

ROOT = HERE.parents[1]
AUDIO = ROOT / "assets" / "audio"
SFX_DIR = AUDIO / "sfx"
BGM_DIR = AUDIO / "bgm"
PACK = AUDIO / "audiopack.js"
MANIFEST = ROOT / "src" / "data" / "audio_manifest.js"
REPORT = HERE / "build_report.txt"
TMP = HERE / ".build_tmp"

MUSIC_LUFS = -16.0
MUSIC_TP_MAX = -1.0
SFX_KBPS, BGM_KBPS = 96, 128

# Max-momentary (400 ms) loudness targets per SFX category (LUFS, mono). Music sits at -16 LUFS integrated.
SFX_TARGET = {
    "tick": -24.0,          # jelly / ui_tick: spammed up to ~15/s, a stream of them adds ~+8 LU
    "ui": -21.0, "ui_big": -17.0,
    "run": -18.0, "run_soft": -20.0,
    "pickup_small": -21.5, "pickup": -19.0, "power": -17.5,
    "impact": -16.5, "alert": -19.0, "event": -15.5,
}
SFX_OVERRIDE = {"ui_tick": -26.0, "coin": -22.0}
SHORT_TERM_MAX = -14.0      # big fanfares must not exceed this short-term (3 s) loudness
FILE_PEAK_DB = -1.0         # SFX files are peak-normalised to -1 dBTP ...
FILE_PEAK_MIN_DB = -3.0     # ... and never pushed below -3 dBTP; remaining balance goes into manifest gain
MAX_SFX_LIMIT_DB = 3.0      # quiet transient SFX may be limited by up to 3 dB to reach their target


# ----------------------------------------------------------------------------- ffmpeg helpers
def _run(cmd):
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0:
        raise RuntimeError(f"command failed: {' '.join(map(str, cmd))}\n{r.stderr.decode(errors='replace')[-2000:]}")
    return r.stdout


def encode_mp3(x, mp3_path, kbps, tag):
    TMP.mkdir(exist_ok=True)
    wav = TMP / f"{tag}.wav"
    wavfile.write(str(wav), SR, np.asarray(x, dtype=np.float32))
    ch = 1 if x.ndim == 1 else x.shape[1]
    _run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-c:a", "libmp3lame", "-b:a", f"{kbps}k",
          "-ar", str(SR), "-ac", str(ch), "-map_metadata", "-1", "-id3v2_version", "0", "-write_id3v1", "0",
          "-fflags", "+bitexact", "-flags:a", "+bitexact", str(mp3_path)])
    wav.unlink()


def decode_mp3(mp3_path, channels):
    raw = _run(["ffmpeg", "-loglevel", "error", "-i", str(mp3_path), "-f", "f32le", "-ac", str(channels), "-"])
    y = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    return y.reshape(-1, channels) if channels > 1 else y


def ffprobe_dur(mp3_path):
    out = _run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(mp3_path)])
    return float(out.decode().strip())


# ----------------------------------------------------------------------------- SFX
def check_basic(x, label):
    if not np.all(np.isfinite(x)):
        raise ValueError(f"{label}: NaN/Inf in signal")


def onset_ms(x, rel_db=-40.0):
    m = np.abs(x if x.ndim == 1 else x.max(1))
    thr = m.max() * undb(rel_db)
    return float(np.argmax(m > thr) / SR * 1000.0)


def process_sfx(name):
    import sfx as SFXMOD
    fn, cat = SFXMOD.SFX[name]
    x = np.asarray(fn(), dtype=np.float64)
    check_basic(x, name)
    x = butter(x, "highpass", 22.0, 2)
    x = bq(x, "highshelf", 9000.0, 0.7, -2.5)     # glossy, never harsh: gentle air-band polish
    # start immediately: drop anything before the first sample above -60 dB re peak
    pk = np.max(np.abs(x))
    first = int(np.argmax(np.abs(x) > pk * 1e-3))
    if first > 0:
        x = x[first:]
    x = fade_edges(x, 0.0002, 0.006)
    # 1) true-peak normalise to -1 dBTP
    x = x * undb(FILE_PEAK_DB - true_peak_db(x))
    L = lufs_max(x, 0.4)
    target = SFX_OVERRIDE.get(name, SFX_TARGET[cat])
    limited = 0.0
    if L < target - 0.3:  # too quiet even at -1 dBTP: gentle limiting (<= 3 dB)
        boost = min(MAX_SFX_LIMIT_DB, target - L)
        y, _ = limiter(x * undb(boost), FILE_PEAK_DB - 0.2, attack_s=0.001, release_s=0.04)
        y = y * undb(FILE_PEAK_DB - true_peak_db(y))
        limited = lufs_max(y, 0.4) - L
        x = y
        L = lufs_max(x, 0.4)
    delta = target - L
    file_gain_db = 0.0
    gain = 1.0
    if delta < 0:
        file_gain_db = max(delta, FILE_PEAK_MIN_DB - FILE_PEAK_DB)
        gain = float(undb(delta - file_gain_db))
    x = x * undb(file_gain_db)
    # short-term ceiling for long, big sounds (evaluate at playback gain)
    st = lufs_max(x, 3.0) + todb(gain)
    if st > SHORT_TERM_MAX:
        gain *= float(undb(SHORT_TERM_MAX - st))
    x = fade_edges(x, 0.0, 0.004)
    out = SFX_DIR / f"{name}.mp3"
    for _ in range(4):
        encode_mp3(x, out, SFX_KBPS, f"sfx_{name}")
        y = decode_mp3(out, 1)
        if len(y) == len(x):
            break
        # LAME's end-padding field is quantised for some lengths: extend with silence until it decodes exactly
        x = np.concatenate([x, np.zeros(max(1, len(y) - len(x)))])
    info = dict(name=name, cat=cat, n=len(x), dur=len(x) / SR, dec_n=len(y), size=out.stat().st_size,
                peak=sample_peak_db(x), tp=true_peak_db(x), tp_dec=true_peak_db(y), mom=lufs_max(x, 0.4),
                st=lufs_max(x, 3.0), mom_play=lufs_max(x, 0.4) + todb(gain), target=target, gain=gain,
                onset=onset_ms(x), onset_dec=onset_ms(y), limited=limited, end=float(np.abs(x[-1])),
                dc=float(np.mean(x)))
    return info


# ----------------------------------------------------------------------------- music
def process_music(name):
    import music
    from analyze import band_energy, seam_metrics, spectral_centroid
    from seq import summarize_progression
    t0 = time.time()
    S = music.SONGS[name]()
    y = S.render()
    check_basic(y, name)
    if S.loop:
        expect = S.loop_len_s * SR
        assert abs(len(y) - expect) <= 0.5 + 1e-6, (name, len(y), expect)
    src_lufs, src_tp = lufs_integrated(y), true_peak_db(y)
    out = BGM_DIR / f"{name}.mp3"
    gain_db = 0.0
    for it in range(3):
        encode_mp3(y * undb(gain_db), out, BGM_KBPS, f"bgm_{name}")
        d = decode_mp3(out, 2)
        dl, dtp = lufs_integrated(d), true_peak_db(d)
        corr = MUSIC_LUFS - dl
        if dtp + corr > MUSIC_TP_MAX - 0.05:
            corr = MUSIC_TP_MAX - 0.05 - dtp
        if abs(corr) < 0.12:
            break
        gain_db += corr
    final = y * undb(gain_db)
    info = dict(name=name, n=len(y), dur=len(y) / SR, dec_n=len(d), size=out.stat().st_size, loop=S.loop, bpm=S.bpm,
                ffprobe=ffprobe_dur(out),
                bars=S.bars, key=S.key, desc=S.desc, lufs_src=lufs_integrated(final), tp_src=true_peak_db(final),
                lufs_dec=dl, tp_dec=dtp, limiter_gr=S.info.get("limiter_gr", 0.0), stems=S.info.get("stems", {}),
                checks=getattr(S, "checks", []), progression=summarize_progression(S), bands=band_energy(final),
                centroid=spectral_centroid(final), render_s=time.time() - t0, sections=S.sections,
                nominal=S.loop_len_s if S.loop else len(y) / SR)
    if S.loop:
        info["seam_src"] = seam_metrics(final)
        info["seam_dec"] = seam_metrics(d)
    return info, final.astype(np.float32), d.astype(np.float32)


# ----------------------------------------------------------------------------- outputs
def write_manifest(sfx_infos, bgm_infos):
    L = ["// AUTO-GENERATED by tools/audio/build.py - do not edit by hand.",
         "// sfx gain = suggested playback gain (perceived-loudness balance). Pitch references:",
         "//   jelly = C6 (1046.5 Hz) tick, pitch-shift along a scale for combos;",
         "//   letter = chime rooted at C5 (523.25 Hz), pitch-shift upward per letter.",
         "// bgm loops are exact bar multiples (dur = bars*4*60/bpm, rounded to the nearest sample):",
         "//   loop the whole decoded buffer (source.loop = true, no loopStart/loopEnd needed).",
         "export const AUDIO_MANIFEST = {", "  sfx: {"]
    for i in sfx_infos:
        L.append(f"    {i['name']}: {{ file: 'sfx/{i['name']}', dur: {i['dur']:.3f}, gain: {i['gain']:.2f} }},")
    L.append("  },")
    L.append("  bgm: {")
    for i in bgm_infos:
        dur = f"{i['nominal']:.6f}".rstrip("0").rstrip(".") if i["loop"] else f"{i['dur']:.3f}"
        L.append(f"    {i['name']}: {{ file: 'bgm/{i['name']}', dur: {dur}, loop: {'true' if i['loop'] else 'false'}, "
                 f"bpm: {i['bpm']}, gain: 1.0 }},")
    L.append("  },")
    L.append("};")
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text("\n".join(L) + "\n")


def write_pack(sfx_names, bgm_names):
    parts = ["// AUTO-GENERATED by tools/audio/build.py - base64 MP3 data for file:// playback.",
             "window.__DD_AUDIO__ = {"]
    for n in sfx_names:
        parts.append(f'"sfx/{n}": "{base64.b64encode((SFX_DIR / f"{n}.mp3").read_bytes()).decode()}",')
    for n in bgm_names:
        parts.append(f'"bgm/{n}": "{base64.b64encode((BGM_DIR / f"{n}.mp3").read_bytes()).decode()}",')
    parts.append("};")
    PACK.write_text("\n".join(parts) + "\n")
    return PACK.stat().st_size


def make_plots(plot_dir, music_out, sfx_names):
    import sfx as SFXMOD
    from analyze import music_plot, seam_plot, spec_sheet
    plot_dir = Path(plot_dir)
    plot_dir.mkdir(parents=True, exist_ok=True)
    for info, final, dec in music_out:
        music_plot(dec, plot_dir / f"{info['name']}.png", info["name"], info["bpm"] if info["loop"] else None,
                   info["bars"] if info["loop"] else None)
        if info["loop"]:
            seam_plot(dec, plot_dir / f"{info['name']}_seam.png", info["name"] + " (decoded mp3)")
    items = []
    for n in sfx_names:
        y = decode_mp3(SFX_DIR / f"{n}.mp3", 1)
        items.append((n, y))
    for k in range(0, len(items), 12):
        spec_sheet(items[k : k + 12], plot_dir / f"sfx_sheet_{k // 12 + 1}.png", cols=4)


# ----------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="comma separated names (sfx or music) to (re)build")
    ap.add_argument("--plots", default="", help="directory for verification plots")
    ap.add_argument("--jobs", type=int, default=2)
    ap.add_argument("--no-music", action="store_true")
    ap.add_argument("--no-sfx", action="store_true")
    a = ap.parse_args()
    import music
    import sfx as SFXMOD
    t_start = time.time()
    SFX_DIR.mkdir(parents=True, exist_ok=True)
    BGM_DIR.mkdir(parents=True, exist_ok=True)
    only = set(x for x in a.only.split(",") if x)
    sfx_names = list(SFXMOD.SFX.keys())
    bgm_names = list(music.SONGS.keys())
    do_sfx = [n for n in sfx_names if not only or n in only] if not a.no_sfx else []
    do_bgm = [n for n in bgm_names if not only or n in only] if not a.no_music else []
    if only and (set(do_sfx) | set(do_bgm)) != only:
        print("unknown names:", only - set(do_sfx) - set(do_bgm))
    lines = []

    def out(s=""):
        print(s)
        lines.append(s)

    sfx_infos = {}
    music_out = []
    with ProcessPoolExecutor(max(1, a.jobs)) as ex:
        mfut = [ex.submit(process_music, n) for n in do_bgm]
        for info in ex.map(process_sfx, do_sfx):
            sfx_infos[info["name"]] = info
        for f in mfut:
            music_out.append(f.result())
    shutil.rmtree(TMP, ignore_errors=True)

    # manifest + pack are always written for the full set (re-measuring files built earlier when using --only)
    all_sfx = []
    for n in sfx_names:
        if n in sfx_infos:
            all_sfx.append(sfx_infos[n])
        else:
            p = SFX_DIR / f"{n}.mp3"
            if not p.exists():
                raise SystemExit(f"missing {p}; run a full build")
            all_sfx.append(_reinfo_sfx(n))
    bgm_done = {i["name"]: i for i, _, _ in music_out}
    all_bgm = []
    for n in bgm_names:
        if n in bgm_done:
            all_bgm.append(bgm_done[n])
        else:
            p = BGM_DIR / f"{n}.mp3"
            if not p.exists():
                raise SystemExit(f"missing {p}; run a full build")
            all_bgm.append(_reinfo_bgm(n))
    write_manifest(all_sfx, all_bgm)
    pack_size = write_pack(sfx_names, bgm_names)

    # --------------------------------------------------------------- report
    out("DESSERT DASH audio build report")
    out("=" * 112)
    out("MUSIC (stereo 44.1 kHz 128 kbps; measured on the decoded MP3)")
    out(f"{'name':13s} {'dur s':>9s} {'bpm':>4s} {'bars':>4s} {'KB':>6s} {'LUFS':>6s} {'TP dB':>6s} {'limGR':>5s} "
        f"{'seam jump/p99':>13s} {'len ok':>6s} {'ffprobe':>8s}  key")
    problems = []
    for i in all_bgm:
        seam = i.get("seam_dec")
        sj = f"{seam['ratio_p99']:.2f}" if seam else "-"
        ok = i["dec_n"] == i["n"]
        if not ok:
            problems.append(f"{i['name']}: decoded length {i['dec_n']} != {i['n']}")
        if abs(i["lufs_dec"] - MUSIC_LUFS) > 1.0:
            problems.append(f"{i['name']}: loudness {i['lufs_dec']:.1f} LUFS")
        if i["tp_dec"] > MUSIC_TP_MAX:
            problems.append(f"{i['name']}: true peak {i['tp_dec']:.2f} dBTP")
        if seam and seam["ratio_p99"] > 1.0:
            problems.append(f"{i['name']}: seam discontinuity {seam['ratio_p99']:.2f}")
        out(f"{i['name']:13s} {i['dur']:9.4f} {i['bpm']:4d} {i['bars'] if i['loop'] else '-':>4} {i['size'] / 1024:6.0f} "
            f"{i['lufs_dec']:6.1f} {i['tp_dec']:6.2f} {i['limiter_gr']:5.1f} {sj:>13s} {'yes' if ok else 'NO':>6s} "
            f"{i.get('ffprobe', 0):8.3f}  {i['key']}")
    out("  (len ok = gapless-decoded sample count == rendered loop length; ffprobe's container duration includes the")
    out("   1105-sample LAME encoder delay + end padding that decoders - incl. Chromium decodeAudioData - trim.)")
    out()
    for i in all_bgm:
        out(f"{i['name']}: {i['desc']}")
        if i.get("progression"):
            out(i["progression"])
        b = i.get("bands")
        if b:
            out("    spectrum (dB re total): " + "  ".join(f"{k} {v:.1f}" for k, v in b.items()) + f"  centroid {i['centroid']:.0f} Hz")
        if i.get("checks"):
            out(f"    harmony notes (strong-beat non-chord tones): {len(i['checks'])} "
                + "; ".join(f"{c[0]} bar {c[1]:.1f} {c[2]}/{c[3]} {c[5]}" for c in i["checks"][:6]))
    out()
    out("SFX (mono 44.1 kHz 96 kbps). mom = max momentary (400 ms) LUFS of the file, play = mom + 20log10(gain)")
    out(f"{'name':14s} {'cat':12s} {'dur ms':>7s} {'KB':>5s} {'peak':>6s} {'TP':>6s} {'mom':>6s} {'play':>6s} {'tgt':>6s} "
        f"{'st3s':>6s} {'gain':>5s} {'onset':>6s} {'lim':>4s}")
    for i in all_sfx:
        if i["dec_n"] != i["n"]:
            problems.append(f"{i['name']}: decoded length {i['dec_n']} != {i['n']}")
        if i["onset"] > 2.0:
            problems.append(f"{i['name']}: onset {i['onset']:.1f} ms")
        if i["tp_dec"] > -0.5:
            problems.append(f"{i['name']}: decoded true peak {i['tp_dec']:.2f}")
        out(f"{i['name']:14s} {i['cat']:12s} {i['dur'] * 1000:7.0f} {i['size'] / 1024:5.1f} {i['peak']:6.1f} {i['tp']:6.1f} "
            f"{i['mom']:6.1f} {i['mom_play']:6.1f} {i['target']:6.1f} {i['st'] + todb(i['gain']):6.1f} {i['gain']:5.2f} "
            f"{i['onset']:6.2f} {i['limited']:4.1f}")
    tot_sfx = sum(i["size"] for i in all_sfx)
    tot_bgm = sum(i["size"] for i in all_bgm)
    out()
    out(f"files: {len(all_sfx)} sfx ({tot_sfx / 1024:.0f} KB), {len(all_bgm)} bgm ({tot_bgm / 1024 / 1024:.2f} MB); "
        f"audiopack.js {pack_size / 1024 / 1024:.2f} MB; build time {time.time() - t_start:.0f}s")
    out("problems: " + ("none" if not problems else "\n  " + "\n  ".join(problems)))
    REPORT.write_text("\n".join(lines) + "\n")
    if a.plots:
        make_plots(a.plots, music_out, sfx_names)
        print("plots written to", a.plots)
    return 1 if problems else 0


def _reinfo_sfx(n):
    """Re-measure an already built SFX file (used by --only builds)."""
    import sfx as SFXMOD
    from synth import lufs_max
    p = SFX_DIR / f"{n}.mp3"
    y = decode_mp3(p, 1)
    prev = _prev_manifest().get(("sfx", n), {})
    g = prev.get("gain", 1.0)
    cat = SFXMOD.SFX[n][1]
    return dict(name=n, cat=cat, n=len(y), dur=prev.get("dur", len(y) / SR), dec_n=len(y), size=p.stat().st_size,
                peak=sample_peak_db(y), tp=true_peak_db(y), tp_dec=true_peak_db(y), mom=lufs_max(y), st=lufs_max(y, 3.0),
                mom_play=lufs_max(y) + todb(g), target=SFX_OVERRIDE.get(n, SFX_TARGET[cat]), gain=g, onset=onset_ms(y),
                onset_dec=onset_ms(y), limited=0.0, end=0.0, dc=0.0)


def _reinfo_bgm(n):
    import music
    p = BGM_DIR / f"{n}.mp3"
    d = decode_mp3(p, 2)
    S = music.SONGS[n]()
    from analyze import seam_metrics
    info = dict(name=n, n=len(d), dur=len(d) / SR, dec_n=len(d), size=p.stat().st_size, loop=S.loop, bpm=S.bpm, ffprobe=ffprobe_dur(p),
                bars=S.bars, key=S.key, desc=S.desc, lufs_dec=lufs_integrated(d), tp_dec=true_peak_db(d), limiter_gr=0.0,
                nominal=S.loop_len_s if S.loop else len(d) / SR, progression="", checks=[])
    if S.loop:
        info["seam_dec"] = seam_metrics(d)
    return info


def _prev_manifest():
    import re
    res = {}
    if MANIFEST.exists():
        sec = None
        for line in MANIFEST.read_text().splitlines():
            if line.strip().startswith("sfx:"):
                sec = "sfx"
            elif line.strip().startswith("bgm:"):
                sec = "bgm"
            m = re.match(r"\s+(\w+): \{ file: '[^']+', dur: ([\d.]+),.*gain: ([\d.]+) \}", line)
            if m and sec:
                res[(sec, m.group(1))] = dict(dur=float(m.group(2)), gain=float(m.group(3)))
    return res


if __name__ == "__main__":
    sys.exit(main())
