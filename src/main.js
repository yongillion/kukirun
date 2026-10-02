// =============================================================================
//  DESSERT DASH (디저트 대시) — project "kukirun"
//  An original single-player auto-runner. Entry point & game shell.
// =============================================================================
import { CFG } from './config.js';
import { View } from './engine/view.js';
import { Input } from './engine/input.js';
import { AudioEngine } from './engine/audio.js';
import { SceneManager } from './engine/scene.js';
import { Toasts, text, COL } from './engine/ui.js';
import { Assets } from './engine/assets.js';
import { Save } from './engine/storage.js';
import { Progress } from './game/progress.js';
import { LoadingScene } from './scenes/loading.js';
import { TitleScene } from './scenes/title.js';
import { LobbyScene } from './scenes/lobby.js';
import { CharactersScene } from './scenes/characters.js';
import { PetsScene } from './scenes/pets.js';
import { LabScene } from './scenes/lab.js';
import { MissionsScene } from './scenes/missions.js';
import { PrerunScene } from './scenes/prerun.js';
import { ResultScene } from './scenes/result.js';
import { SettingsScene } from './scenes/settings.js';
import { RunScene } from './scenes/run.js';

function loadScript(src) {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => { console.warn('failed to load', src); resolve(false); };
    document.head.appendChild(s);
  });
}

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.view = new View(this.canvas);
    this.input = new Input(this.view);
    this.audio = new AudioEngine();
    this.scenes = new SceneManager(this);
    this.toasts = new Toasts();
    let dbg = false;
    try { dbg = /[?&#]debug/.test(location.href) || localStorage.getItem('dd-debug') === '1'; } catch (e) { /* ignore */ }
    this.debug = dbg;
    this.fps = 60;
    this.errors = [];
    Save.load();
    this.applySettings();
    this.input.handler = {
      pointer: (t, p) => this.scenes.pointer(t, p),
      key: (code, acts) => this.onKey(code, acts),
      wheel: (dy, p) => this.scenes.wheel(dy, p),
      blur: () => this.scenes.blur(),
    };
    this.input.onFirstGesture = () => this.audio.unlock();
    this.view.onResize = () => this.scenes.layout();
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.audio.suspend(); else this.audio.resume(); });
    window.addEventListener('error', (e) => this.errors.push(String(e.message || e)));
    window.addEventListener('unhandledrejection', (e) => this.errors.push(String(e.reason && e.reason.message || e.reason)));
    this.last = performance.now() / 1000;
    this.loop = this.loop.bind(this);
  }

  async boot() {
    const loading = new LoadingScene(this);
    this.scenes.go(loading, {}, { fade: 0 });
    requestAnimationFrame(this.loop);
    if (!window.__DD_FONTS__) await loadScript('assets/fonts/fontpack.js');
    await this.loadFonts();
    loading.p.fonts = 1;
    await Assets.loadImages((d, n) => { loading.p.images = d / n; });
    if (!window.__DD_AUDIO__) await loadScript('assets/audio/audiopack.js');
    await this.audio.load((d, n) => { loading.p.audio = d / n; });
    loading.p.audio = 1;
    loading.done = true;
    window.__DD_READY__ = true;
  }

  async loadFonts() {
    const F = window.__DD_FONTS__;
    if (!F || !window.FontFace) return;
    const list = [['DDDisplay', '900'], ['DDBold', '700'], ['DDNum', '700']];
    await Promise.all(list.map(async ([name, weight]) => {
      try {
        const bin = Uint8Array.from(atob(F[name]), (c) => c.charCodeAt(0));
        const ff = new FontFace(name, bin.buffer, { weight, style: 'normal' });
        await ff.load();
        document.fonts.add(ff);
      } catch (e) { console.warn('font failed', name, e); }
    }));
    try { delete window.__DD_FONTS__; } catch (e) { window.__DD_FONTS__ = null; }
  }

  loop(ts) {
    const now = ts / 1000;
    let dt = now - this.last;
    this.last = now;
    if (!(dt > 0)) dt = 1 / 60;
    dt = Math.min(dt, 0.1);
    this.fps = this.fps * 0.95 + (1 / dt) * 0.05;
    this.input.pollPad();
    if (this.input.wasPressed('debug')) { this.debug = !this.debug; try { localStorage.setItem('dd-debug', this.debug ? '1' : '0'); } catch (e) { /* ignore */ } }
    try {
      this.scenes.update(dt);
      this.toasts.update(dt);
      this.view.begin();
      this.scenes.render(this.view.ctx);
      this.toasts.draw(this.view.ctx, this.view.W);
      if (this.errors.length && this.debug) this.drawErrors(this.view.ctx);
      this.view.end();
    } catch (e) {
      console.error(e);
      this.errors.push(String(e && e.stack || e));
      try { this.view.end(); } catch (e2) { /* ignore */ }
    }
    this.input.endFrame();
    requestAnimationFrame(this.loop);
  }

  drawErrors(ctx) {
    ctx.save(); ctx.fillStyle = 'rgba(120,0,20,0.85)'; ctx.fillRect(0, 0, this.view.W, 28 + 20 * Math.min(4, this.errors.length));
    this.errors.slice(-4).forEach((e, i) => text(ctx, e.slice(0, 140), 10, 18 + i * 20, { size: 14, font: 'bold', align: 'left', color: '#fff' }));
    ctx.restore();
  }

  onKey(code, acts) {
    if (this.debug && code === 'KeyK' && !(this.scenes.cur instanceof RunScene)) { Progress.earn(10000); this.toast('[debug] +10,000 코인', { icon: 'coin' }); }
    this.scenes.key(code, acts);
  }

  applySettings() {
    const st = Save.data.settings;
    this.audio.setVolumes(st.music, st.sfx);
    if (this.view.quality !== st.quality) this.view.setQuality(st.quality);
  }
  toast(msg, o) { this.toasts.push(msg, o); }

  // ------------------------------------------------------------ navigation
  goTitle() { this.scenes.go(new TitleScene(this), {}, { fade: 0.45 }); }
  goLobby() { this.scenes.go(new LobbyScene(this), {}, { fade: 0.3 }); }
  goScene(name) {
    const map = { characters: CharactersScene, pets: PetsScene, lab: LabScene, missions: MissionsScene, prerun: PrerunScene, settings: SettingsScene };
    const S = map[name];
    if (S) this.scenes.go(new S(this), {}, { fade: 0.25 });
  }
  startRun(params) {
    this.audio.stopMusic(0.35);
    this.scenes.go(new RunScene(this), params, { fade: 0.45, color: '#1c0f18' });
  }
  endRun(summary) {
    const d = Save.data;
    const prevBest = d.best;
    const newBest = summary.score > prevBest && summary.score > 0;
    const bonus = Math.floor(summary.score / 2500);
    const earned = Math.floor(summary.coins + bonus);
    const xpBefore = d.xp;
    Progress.earn(earned);
    const missions = Progress.applyRun({ ...summary, coins: earned }).map((m) => Progress.missionText(m));
    const xp = 20 + Math.floor(summary.score / 600) + summary.land * 5;
    const ups = Progress.addXP(xp);
    if (summary.tutorial) d.tutorial = true;
    const rec = { score: summary.score, char: summary.relayChar || summary.char, land: summary.land, dist: summary.dist, at: Date.now() };
    d.records = [...(d.records || []), rec].sort((a, b) => b.score - a.score).slice(0, 5);
    const rank = d.records.indexOf(rec) + 1;
    Save.save();
    this.scenes.go(new ResultScene(this), { summary, earned, bonus, xp, ups, newBest, prevBest, missions, xpBefore, rank }, { fade: 0.5 });
  }
}

const game = new Game();
window.__DD_GAME__ = game;
game.boot();
void CFG; void COL;
