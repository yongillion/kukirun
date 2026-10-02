// =============================================================================
//  WebAudio mixer: SFX bus + music bus -> limiter -> speakers.
//  Audio comes from assets/audio/audiopack.js (base64 MP3s, works on file://)
//  or, if the pack is absent, from assets/audio/<file>.mp3 via fetch.
// =============================================================================
import { AUDIO_MANIFEST } from '../data/audio_manifest.js';

function b64ToBuffer(b64) {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export class AudioEngine {
  constructor() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ok = !!AC;
    this.sfx = {}; this.bgm = {};
    this.inst = {};           // name -> [{src, g, t}]
    this.music = null; this.musicName = null; this.wantMusic = null;
    this.musicVol = 0.7; this.sfxVol = 0.9;
    this.unlocked = false;
    this.muted = false;
    if (!this.ok) return;
    this.ctx = new AC({ latencyHint: 'interactive' });
    const c = this.ctx;
    this.master = c.createGain();
    this.limiter = c.createDynamicsCompressor();
    this.limiter.threshold.value = -4; this.limiter.knee.value = 4; this.limiter.ratio.value = 8;
    this.limiter.attack.value = 0.002; this.limiter.release.value = 0.12;
    this.master.connect(this.limiter); this.limiter.connect(c.destination);
    this.musicBus = c.createGain(); this.musicBus.connect(this.master);
    this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
    this.duckGain = c.createGain(); // music ducking stage
    this.duckGain.connect(this.musicBus);
    this.setVolumes(this.musicVol, this.sfxVol);
  }

  async load(onProgress) {
    if (!this.ok) return;
    const pack = window.__DD_AUDIO__ || null;
    const jobs = [];
    for (const [name, e] of Object.entries(AUDIO_MANIFEST.sfx)) jobs.push(['sfx', name, e]);
    for (const [name, e] of Object.entries(AUDIO_MANIFEST.bgm)) jobs.push(['bgm', name, e]);
    let done = 0;
    const decode = (ab) => new Promise((resolve, reject) => {
      try {
        const p = this.ctx.decodeAudioData(ab, resolve, reject);
        if (p && p.then) p.then(resolve, reject);
      } catch (e) { reject(e); }
    });
    const runJob = async ([kind, name, e]) => {
      try {
        let ab;
        if (pack && pack[e.file]) ab = b64ToBuffer(pack[e.file]);
        else { const r = await fetch(`assets/audio/${e.file}.mp3`); ab = await r.arrayBuffer(); }
        const buf = await decode(ab);
        (kind === 'sfx' ? this.sfx : this.bgm)[name] = buf;
      } catch (err) { console.warn('audio failed', name, err); }
      done++; onProgress && onProgress(done, jobs.length);
    };
    const queue = jobs.slice();
    const workers = Array.from({ length: 4 }, async () => { while (queue.length) await runJob(queue.shift()); });
    await Promise.all(workers);
    if (pack) { try { delete window.__DD_AUDIO__; } catch (e) { window.__DD_AUDIO__ = null; } }
  }

  /** Must be called from a user gesture. */
  unlock() {
    if (!this.ok) return;
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    if (!this.unlocked) {
      this.unlocked = true;
      // iOS: play a silent buffer inside the gesture
      try { const b = this.ctx.createBuffer(1, 1, 22050); const s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.ctx.destination); s.start(0); } catch (e) { /* ignore */ }
      if (this.wantMusic) { const w = this.wantMusic; this.wantMusic = null; this.playMusic(w.name, w.opts); }
    }
  }
  suspend() { if (this.ok && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); }
  resume() { if (this.ok && this.unlocked && this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); }

  setVolumes(music, sfx) {
    this.musicVol = music; this.sfxVol = sfx;
    if (!this.ok) return;
    const t = this.ctx.currentTime;
    // perceptual curve
    this.musicBus.gain.setTargetAtTime(Math.pow(music, 1.6) * 0.8, t, 0.03);
    this.sfxBus.gain.setTargetAtTime(Math.pow(sfx, 1.6), t, 0.03);
  }

  /**
   * Play a sound effect. o: { vol, rate, pan, delay, max }
   * Returns a handle with stop(fade) or null.
   */
  play(name, o = {}) {
    if (!this.ok || !this.unlocked || this.ctx.state !== 'running') return null;
    const buf = this.sfx[name];
    if (!buf) return null;
    const c = this.ctx;
    const e = AUDIO_MANIFEST.sfx[name];
    const src = c.createBufferSource();
    src.buffer = buf;
    if (o.rate && o.rate !== 1) src.playbackRate.value = o.rate;
    const g = c.createGain();
    g.gain.value = (o.vol ?? 1) * (e ? e.gain : 1);
    src.connect(g);
    let out = g;
    if (o.pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = o.pan; g.connect(p); out = p; }
    out.connect(this.sfxBus);
    const when = c.currentTime + (o.delay || 0);
    src.start(when);
    const list = this.inst[name] || (this.inst[name] = []);
    const h = { src, g, t: when, stop: (fade = 0.05) => { try { g.gain.setTargetAtTime(0, c.currentTime, fade / 3); src.stop(c.currentTime + fade); } catch (err) { /* ignore */ } } };
    list.push(h);
    const max = o.max ?? 5;
    while (list.length > max) { const old = list.shift(); old.stop(0.03); }
    src.onended = () => { const i = list.indexOf(h); if (i >= 0) list.splice(i, 1); };
    return h;
  }

  stopAll(name) { const l = this.inst[name]; if (l) { for (const h of l) h.stop(0.05); l.length = 0; } }

  playMusic(name, o = {}) {
    if (!this.ok) return;
    if (!this.unlocked || this.ctx.state !== 'running') { this.wantMusic = { name, opts: o }; if (!this.unlocked) return; }
    if (this.musicName === name && this.music && !o.restart) return;
    const c = this.ctx;
    const fade = o.fade ?? 0.6;
    this.stopMusic(fade);
    const buf = this.bgm[name];
    if (!buf) return;
    const e = AUDIO_MANIFEST.bgm[name];
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = e ? e.loop : true;
    const g = c.createGain();
    const vol = (o.vol ?? 1) * (e ? e.gain : 1);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(vol, c.currentTime + Math.max(0.02, fade));
    src.connect(g); g.connect(this.duckGain);
    src.start(c.currentTime + 0.01, o.offset || 0);
    this.music = { name, src, g, vol };
    this.musicName = name;
  }

  stopMusic(fade = 0.5) {
    this.wantMusic = null;
    if (!this.music) { this.musicName = null; return; }
    const { src, g } = this.music;
    const c = this.ctx;
    try {
      g.gain.cancelScheduledValues(c.currentTime);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + Math.max(0.02, fade));
      src.stop(c.currentTime + fade + 0.05);
    } catch (e) { /* ignore */ }
    this.music = null; this.musicName = null;
  }

  /** Temporarily lower music (e.g. under a jingle). */
  duck(level = 0.25, attack = 0.08, hold = 1, release = 0.6) {
    if (!this.ok) return;
    const p = this.duckGain.gain, t = this.ctx.currentTime;
    p.cancelScheduledValues(t);
    p.setValueAtTime(p.value, t);
    p.linearRampToValueAtTime(level, t + attack);
    p.setValueAtTime(level, t + attack + hold);
    p.linearRampToValueAtTime(1, t + attack + hold + release);
  }

  /** One-shot music cue on the music bus (music ducked underneath). */
  jingle(name, duck = 0.15) {
    if (!this.ok || !this.unlocked) return;
    const buf = this.bgm[name];
    if (!buf) return;
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = buf;
    const g = c.createGain(); g.gain.value = 1;
    src.connect(g); g.connect(this.musicBus);
    src.start(c.currentTime + 0.02);
    this.duck(duck, 0.1, buf.duration - 0.3, 0.8);
  }

  /** Smoothly change music playback level (e.g. pause menu). */
  musicLevel(v, time = 0.25) {
    if (!this.ok || !this.music) return;
    const g = this.music.g.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(0.0001, g.value), t);
    g.linearRampToValueAtTime(Math.max(0.0001, v * this.music.vol), t + time);
  }
}
