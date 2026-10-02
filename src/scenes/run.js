// =============================================================================
//  RunScene — the actual game: running, collisions, scoring, power-ups, skills,
//  pets, SUGAR RUSH bonus, revive / relay / last spurt, lands, tutorial, pause.
// =============================================================================
import { CFG, LAND_IDS } from '../config.js';
import { Scene, Modal } from '../engine/scene.js';
import { Button, UIGroup } from '../engine/ui.js';
import { Particles } from '../engine/particles.js';
import { approach, circleRect, clamp, rand, rectsOverlap, TAU, buzz } from '../engine/util.js';
import { World } from '../game/world.js';
import { Generator } from '../game/generator.js';
import { Background } from '../game/background.js';
import { Runner } from '../game/player.js';
import { Pet } from '../game/pet.js';
import { HUD } from '../game/hud.js';
import { RushStage } from '../game/bonus.js';
import { Progress } from '../game/progress.js';
import { CHAR, LANDS, POWERUPS } from '../data/content.js';
import { Save } from '../engine/storage.js';
import { renderRun } from './run_view.js';

const GY = CFG.GROUND_Y;
const JELLY_SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 16, 14, 12, 9, 7, 4, 2];
const LETTER_STEPS = [0, 2, 4, 5, 7, 9, 11, 12, 14];

export class RunScene extends Scene {
  enter(p) {
    const g = this.game;
    this.params = p;
    this.charId = p.char;
    this.boosts = p.boosts || {};
    this.tutorialRun = !!p.tutorial;
    this.mods = Progress.mods(this.charId);
    this.world = new World();
    this.world.addGround(-1200, 0, 'meadow');
    this.mainWorld = this.world;
    this.gen = new Generator(this, { tutorial: this.tutorialRun });
    this.bg = new Background();
    this.bg.set('meadow', true);
    this.fx = new Particles(1100);
    this.fx.quality = Save.data.settings.quality === 'high' ? 1 : 0.55;
    this.hud = new HUD(this);
    this.runner = new Runner(this, this.charId);
    this.pet = p.pet ? new Pet(this, p.pet) : null;

    this.score = 0; this.coins = 0; this.coinAcc = 0; this.jellies = 0;
    this.combo = 0; this.maxCombo = 0; this.dist = 0;
    this.maxEnergy = this.mods.maxEnergy + (this.boosts.energy ? 30 : 0);
    this.energy = this.maxEnergy;
    this.letters = new Array(9).fill(false);
    if (this.boosts.letters) this.letters[0] = this.letters[1] = this.letters[2] = true;
    this.pw = { magnet: 0, giant: 0, dash: 0, coins: 0, shield: 0 };
    this.pwDur = { magnet: 1, giant: 1, dash: 1, coins: 1, shield: 1 };
    this.petMagnet = 0;
    this.skill = this.makeSkill(this.charId);
    this.saves = { cotton: this.charId === 'cotton', revive: !!this.boosts.revive, relay: p.relay && p.relay !== this.charId && Progress.owned(p.relay) ? p.relay : null };
    this.spurt = 0; this.spurtUsed = false;
    this.stats = { jumps: 0, djumps: 0, slideTime: 0, smash: 0, rush: 0, skills: 0, milk: 0, items: 0, cleanLand: 0, relay: 0, hits: 0, hitsLand: 0 };

    this.speed = this.gen.speed(); this.speedTarget = this.speed; this.curV = this.speed;
    this.landIdx = 0; this.lap = 0; this.landNo = 1;
    this.state = 'intro'; this.stateT = 0;
    this.camX = -CFG.PLAYER_SX;
    this.runner.x = -CFG.PLAYER_SX - 160;
    if (this.pet) this.pet.place(this.runner.x - 80, 430);
    this.bridgeT = 0; this.hitStop = 0; this.timeScale = 1;
    this.shake = 0; this.shakeX = 0; this.shakeY = 0;
    this.flash = 0; this.flashColor = '#ffffff'; this.hitVig = 0;
    this.popups = []; this.banners = []; this.projectiles = [];
    this.touchLeft = new Set(); this.touchSlide = new Set(); this.touchJumpQueued = false; this.touchJumpT = 0;
    this.lastJellyT = -1; this.jellyNote = 0;
    this.lowBeepT = 0; this.wasSliding = false; this.dustT = 0;
    this.downRunner = null;
    this.paused = false;
    this.tut = { cur: null, step: 0, shownMilk: false, shownLetter: !this.tutorialRun && Save.data.stats.runs > 2 };
    this.over = false;
    this.showTouch = Save.data.settings.touch !== 'off';

    this.gen.fill(this.camX + this.W + 1800);
    this.buildUI();
    g.audio.playMusic(LANDS[0].bgm, { fade: 0.4 });
    this.banner('READY?', { size: 64, dur: 0.95, color: '#ffe680' });
    g.audio.play('count_beep');
    this.visHandler = () => { if (document.hidden && !this.paused && this.state !== 'over') this.setPaused(true); };
    document.addEventListener('visibilitychange', this.visHandler);
  }
  exit() { document.removeEventListener('visibilitychange', this.visHandler); }

  buildUI() {
    this.ui.clear();
    this.pauseBtn = this.ui.add(new Button({ x: this.W - 50, y: 46, w: 58, round: true, icon: 'pause', iconSize: 40, color: 'cream', sound: 'ui_click', onClick: () => this.setPaused(true) }));
    this.pauseUI = new UIGroup(this.game);
    const W = this.W, H = this.H;
    const bw = 300, bh = 78, x = W / 2 - bw / 2;
    this.pauseUI.add(new Button({ x, y: H / 2 - 110, w: bw, h: bh, label: '계속 달리기', icon: 'play', color: 'green', key: ['confirm', 'Escape', 'KeyP'], onClick: () => this.setPaused(false) }));
    this.pauseUI.add(new Button({ x, y: H / 2 - 18, w: bw, h: bh, label: '다시 시작', icon: 'retry', color: 'orange', onClick: () => this.confirmLeave(true) }));
    this.pauseUI.add(new Button({ x, y: H / 2 + 74, w: bw, h: bh, label: '로비로', icon: 'home', color: 'pink', onClick: () => this.confirmLeave(false) }));
    const st = Save.data.settings;
    this.musicBtn = this.pauseUI.add(new Button({ x: W / 2 - 80, y: H / 2 + 200, w: 64, round: true, icon: st.music > 0 ? 'music_on' : 'music_off', iconSize: 44, color: 'cream',
      onClick: (b) => { st.music = st.music > 0 ? 0 : 0.7; this.game.applySettings(); b.icon = st.music > 0 ? 'music_on' : 'music_off'; Save.save(); } }));
    this.sfxBtn = this.pauseUI.add(new Button({ x: W / 2 + 80, y: H / 2 + 200, w: 64, round: true, icon: st.sfx > 0 ? 'sound_on' : 'sound_off', iconSize: 44, color: 'cream',
      onClick: (b) => { st.sfx = st.sfx > 0 ? 0 : 0.9; this.game.applySettings(); b.icon = st.sfx > 0 ? 'sound_on' : 'sound_off'; Save.save(); } }));
  }
  layout() { if (this.pauseUI) this.buildUI(); }

  setPaused(on) {
    if (this.state === 'over') return;
    this.paused = on;
    this.touchLeft.clear(); this.touchSlide.clear();
    this.game.audio.musicLevel(on ? 0.3 : 1);
    if (on) this.game.audio.play('ui_open');
  }
  confirmLeave(retry) {
    this.game.scenes.modal(new Modal(this.game, {
      title: retry ? '다시 시작' : '로비로 가기', message: '지금까지의 기록은 저장되지 않아요.\n정말 그만둘까요?', height: 330, color: 'orange',
      buttons: [{ label: '취소', color: 'grey', key: ['back'] }, { label: retry ? '다시 시작' : '로비로', color: retry ? 'orange' : 'pink', key: ['confirm'], onClick: () => { this.game.audio.musicLevel(1); this.game.audio.stopMusic(0.3); retry ? this.game.startRun(this.params) : this.game.goLobby(); } }],
    }));
  }

  // ======================================================================
  //  Helpers
  // ======================================================================
  makeSkill(id) {
    const S = CHAR[id].skill, lv = Math.max(1, Progress.charLv(id));
    const cd = S.cd(lv);
    return { id, lv, name: S.name, cd, dur: S.dur ? S.dur(lv) : 1, timer: cd * 0.5, active: 0, heal: S.heal ? S.heal(lv) : 0, revive: S.revive ? S.revive(lv) : 0, rainT: 0, spawnX: 0 };
  }
  comboMult() { return 1 + (Math.min(this.combo, CFG.COMBO_CAP) / CFG.COMBO_CAP) * CFG.COMBO_MAX_BONUS; }
  landMult() { return 1 + 0.1 * this.landIdx + 0.25 * this.lap; }
  drain() { return CFG.DRAIN_BASE + CFG.DRAIN_LAND * this.landIdx + CFG.DRAIN_LAP * this.lap; }
  letterToSpawn() {
    for (let i = 0; i < 9; i++) if (!this.letters[i] && !this.mainWorld.lettersInFlight.has(i)) return i;
    return -1;
  }
  get invincible() { return this.pw.giant > 0 || this.pw.dash > 0 || this.runner.mode === 'roll' || this.spurt > 0; }
  get immune() { return this.runner.mode === 'float'; }

  addShake(a) { if (Save.data.settings.shake) this.shake = Math.max(this.shake, a); }
  popup(x, y, txt, color = '#fff', size = 26, o = {}) { this.popups.push({ x, y, txt, color, size, t: 0, dur: o.dur ?? 0.9, vy: o.vy ?? -70, screen: !!o.screen }); if (this.popups.length > 40) this.popups.shift(); }
  /** Popup that follows the runner on screen (runner-relative offsets). */
  rpop(dx, dy, txt, color, size = 28, o = {}) { const r = this.runner; this.popup(r.x - this.camX + dx, r.y + dy, txt, color, size, { ...o, screen: true }); }
  banner(txt, o = {}) {
    this.banners.push({ txt, sub: o.sub || null, t: 0, dur: o.dur ?? 1.6, size: o.size ?? 54, color: o.color || '#ffffff', y: o.y ?? 250, icon: o.icon || null });
    if (this.banners.length > 3) this.banners.shift();
  }
  sfx(name, o) { return this.game.audio.play(name, o); }

  // ======================================================================
  //  Input
  // ======================================================================
  pointer(type, p) {
    if (this.paused) { this.pauseUI.pointer(type, p); return true; }
    if (this.ui.pointer(type, p)) return true;
    if (type === 'down') {
      if (p.x < this.W / 2) { this.touchLeft.add(p.id); this.touchJumpQueued = true; this.touchJumpT = 0.14; }
      else this.touchSlide.add(p.id);
    } else if (type === 'up' || type === 'cancel') { this.touchLeft.delete(p.id); this.touchSlide.delete(p.id); }
    return true;
  }
  key(code, acts) {
    if (this.paused) { this.pauseUI.key(code, acts); return; }
    if (acts.includes('pause') && this.state !== 'over') { this.setPaused(true); return; }
    if (this.game.debug) this.debugKey(code);
  }
  blur() { if (!this.paused && this.state !== 'over') this.setPaused(true); }

  debugKey(code) {
    const r = this.runner;
    if (code === 'KeyG') this.activatePower('giant');
    if (code === 'KeyM') this.activatePower('magnet');
    if (code === 'KeyD') this.activatePower('dash');
    if (code === 'KeyC') this.activatePower('coins');
    if (code === 'KeyV') this.activatePower('stars');
    if (code === 'KeyB') this.activatePower('shield');
    if (code === 'KeyL') { for (let i = 0; i < 9; i++) if (!this.letters[i]) { this.collectLetter(i); break; } }
    if (code === 'KeyE') this.energy = this.maxEnergy;
    if (code === 'KeyQ') this.skill.timer = 0.01;
    if (code === 'KeyN') this.gen.landClock = CFG.LAND_TIME;
    if (code === 'KeyO') this.energy = 0;
    void r;
  }

  onJump() {
    const r = this.runner;
    if (this.state !== 'play' && this.state !== 'intro') return;
    if (this.tut.cur) this.tutorialAction('jump');
    const res = r.pressJump();
    if (res === 1) {
      this.stats.jumps++;
      this.sfx('jump', { rate: 0.96 + rand() * 0.08 });
      this.dust(r.x - 8, r.y, 4);
    } else if (res === 2) {
      this.stats.djumps++;
      this.sfx('jump2');
      this.fx.spawn({ x: r.x, y: r.y - 10, sprite: ['fx', 'ring'], size: 0.15, size1: 0.6, life: 0.3, alpha: 0.8, add: true });
    }
  }

  // ======================================================================
  //  Update
  // ======================================================================
  update(dt) {
    this.t += dt;
    this.tw.update(dt);
    this.ui.update(dt);
    this.pauseUI.update(dt);
    if (this.paused) return;
    const inp = this.game.input;
    if (inp.wasPressed('jump') || this.touchJumpQueued) this.onJump();
    this.touchJumpQueued = false;
    if (this.touchJumpT > 0) this.touchJumpT -= dt;
    const slideHeld = inp.isDown('slide') || this.touchSlide.size > 0;
    const jumpHeld = inp.isDown('jump') || this.touchLeft.size > 0;
    this.runner.slideHeld = slideHeld && (this.state === 'play' || this.state === 'intro');
    this.runner.thrust = jumpHeld;
    if (this.tut.cur && slideHeld) this.tutorialAction('slide');

    let ts = this.timeScale;
    if (this.hitStop > 0) { this.hitStop -= dt; ts *= 0.2; }
    const gdt = Math.min(dt, 1 / 20) * ts;
    const n = Math.max(1, Math.ceil(gdt / (1 / 120)));
    for (let i = 0; i < n; i++) this.step(gdt / n);
    this.fx.update(gdt);
    this.bg.update(gdt, this.state === 'rush' ? CFG.RUSH_SPEED : this.curV);
    this.hud.update(dt);
    for (const p of this.popups) { p.t += dt; p.y += p.vy * dt; }
    this.popups = this.popups.filter((p) => p.t < p.dur);
    for (const b of this.banners) b.t += dt;
    this.banners = this.banners.filter((b) => b.t < b.dur);
    this.shake = Math.max(0, this.shake - dt * 2.4);
    const a = this.shake * this.shake * 14;
    this.shakeX = (rand() * 2 - 1) * a; this.shakeY = (rand() * 2 - 1) * a;
    this.flash = Math.max(0, this.flash - dt * 2.2);
    this.hitVig = Math.max(0, this.hitVig - dt * 2);
  }

  step(dt) {
    this.stateT += dt;
    switch (this.state) {
      case 'intro': this.introStep(dt); break;
      case 'play': this.playStep(dt); break;
      case 'rushIn': this.rushInStep(dt); break;
      case 'rush': this.rushStep(dt); break;
      case 'rushOut': this.rushOutStep(dt); break;
      case 'dying': this.dyingStep(dt); break;
      case 'revive': this.reviveStep(dt); break;
      case 'relay': this.relayStep(dt); break;
      case 'over': this.overStep(dt); break;
    }
    for (const pr of this.projectiles) this.projStep(pr, dt);
    this.projectiles = this.projectiles.filter((pr) => !pr.done);
  }

  introStep(dt) {
    const r = this.runner;
    this.curV = this.speed;
    r.step(dt, this.world, { speed: this.speed * 1.15, bridge: true });
    if (this.pet) this.pet.update(dt, r, false);
    if (r.x > -70 && !this.goShown) { this.goShown = true; this.banner('GO!', { size: 84, dur: 0.8, color: '#9dff7a' }); this.sfx('count_go'); }
    if (r.x >= 0) {
      this.state = 'play'; this.stateT = 0;
      if (this.boosts.dash) { this.pw.dash = 5; this.pwDur.dash = 5; this.sfx('dash_on'); this.banner('스타트 대시!', { size: 44, color: '#86ceff', y: 300 }); }
      if (this.boosts.magnet) { this.pw.magnet = 12; this.pwDur.magnet = 12; }
    }
  }

  playStep(dt) {
    const r = this.runner;
    this.speed = approach(this.speed, this.speedTarget, 60 * dt);
    let v = this.speed;
    if (this.pw.dash > 0) v *= CFG.DASH_MULT;
    if (r.mode === 'roll') v *= 1.45;
    if (this.spurt > 0) v *= 1.5;
    if (this.pw.giant > 0) v *= 1.06;
    this.curV = v;
    const inv = this.invincible;
    const bridge = inv || this.bridgeT > 0 || r.mode === 'float';
    const ev = r.step(dt, this.world, { speed: v, bridge, floatY: r.mode === 'float' ? 300 : null });
    if (ev === 'land') this.onLand();
    else if (ev === 'bufferedJump') { this.stats.jumps++; this.sfx('jump'); }
    if (r.sliding && !this.wasSliding) { this.sfx('slide', { vol: 0.8 }); }
    this.wasSliding = r.sliding;
    if (r.sliding) { this.stats.slideTime += dt; if (rand() < dt * 30) this.fx.spawn({ x: r.x - 30, y: GY - 4, vx: -120 - rand() * 80, vy: -40 - rand() * 60, ay: 300, life: 0.35, sprite: ['fx', 'dust_1'], size: 0.25, size1: 0.45, alpha: 0.7 }); }
    else if (r.grounded && r.mode === 'run') { this.dustT -= dt; if (this.dustT <= 0) { this.dustT = 0.3; this.fx.spawn({ x: r.x - 18, y: r.y - 4, vx: -60, vy: -20, life: 0.4, sprite: ['fx', 'dust_0'], size: 0.22 * r.scale, size1: 0.42 * r.scale, alpha: 0.5 }); } }
    if (this.pw.giant > 0 && r.grounded) { this.giantStepT = (this.giantStepT || 0) - dt; if (this.giantStepT <= 0) { this.giantStepT = 0.34; this.addShake(0.35); this.sfx('giant_step', { vol: 0.55 }); this.dust(r.x + 10, r.y, 3); } }

    // energy & timers
    if (this.spurt > 0) { this.spurt -= dt; this.energy = 0; if (this.spurt <= 0) { this.die('down'); return; } }
    else if (!this.tut.cur) this.energy -= this.drain() * dt;
    if (this.energy > this.maxEnergy) this.energy = this.maxEnergy;
    this.timers(dt);

    // world interaction
    this.obstacles(dt, r, v);
    if (this.state !== 'play') return;
    this.pickups(dt, r, v);
    this.springs(r);
    this.updateSkill(dt);
    this.updatePet(dt);
    r.pushTrail(dt, this.pw.dash > 0 || r.mode === 'roll' || this.spurt > 0);
    if (r.mode === 'roll') r.rollAngle += dt * v / 42;
    this.dist += (v * dt) / 10;

    // lands
    const tr = this.gen.transitions[0];
    if (tr && r.x >= tr.x) { this.gen.transitions.shift(); this.enterLand(tr); }
    this.camX = r.x - CFG.PLAYER_SX;
    this.gen.fill(this.camX + this.W + 1800);
    this.world.cull(this.camX - 500);

    this.tutorialCheck(r, v);

    // fail states
    if (!r.grounded && r.y > GY + 26 && !bridge && r.mode === 'run') { this.die('pit'); return; }
    if (this.energy <= 0 && this.spurt <= 0) this.exhausted();
    const low = this.energy / this.maxEnergy < CFG.LOW_ENERGY;
    if (low) { this.lowBeepT -= dt; if (this.lowBeepT <= 0) { this.lowBeepT = 1.1; this.sfx('low_energy', { vol: 0.8 }); } }
  }

  timers(dt) {
    const r = this.runner, pw = this.pw;
    if (pw.magnet > 0) pw.magnet -= dt;
    if (pw.coins > 0) pw.coins -= dt;
    if (pw.shield > 0) pw.shield -= dt;
    if (this.petMagnet > 0) this.petMagnet -= dt;
    if (this.bridgeT > 0) this.bridgeT -= dt;
    if (pw.giant > 0) { pw.giant -= dt; if (pw.giant <= 0) { r.targetScale = r.mode === 'float' ? 1.2 : 1; this.sfx('giant_off'); r.invuln = Math.max(r.invuln, 1.1); this.bridgeT = Math.max(this.bridgeT, 0.7); } }
    if (pw.dash > 0) { pw.dash -= dt; if (pw.dash <= 0) { r.invuln = Math.max(r.invuln, 1.1); this.bridgeT = Math.max(this.bridgeT, 0.6); } }
    if (r.skillPose > 0) r.skillPose -= dt;
  }

  onLand() {
    const r = this.runner;
    this.dust(r.x, r.y, r.scale > 1.5 ? 6 : 3);
    this.sfx('land', { vol: 0.45 });
    if (r.scale > 1.5) { this.addShake(0.5); this.sfx('giant_step'); }
  }
  dust(x, y, n) {
    this.fx.burst(n, (i, k) => ({ x: x + (i - k / 2) * 10, y: y - 4, vx: (i - k / 2) * 50 - 40, vy: -40 - rand() * 50, ay: 120, life: 0.45, sprite: ['fx', 'dust_' + (i % 3)], size: 0.3, size1: 0.55, alpha: 0.75 }));
  }

  // ---------------------------------------------------------------- obstacles
  obstacles(dt, r, v) {
    const hb = r.hitbox();
    const inv = this.invincible, immune = this.immune;
    for (const o of this.world.obs) {
      if (o.smashed) { o.t += dt; o.x += o.vx * dt; o.y += o.vy * dt; o.vy += 2600 * dt; o.rot += o.vr * dt; continue; }
      const dx = o.x - r.x;
      if (o.kind === 'fall') {
        if (o.state === 'hanging' && dx < v * 1.28) { o.state = 'shake'; o.t = 0; this.sfx('crumble', { vol: 0.8 }); }
        else if (o.state === 'shake') { o.t += dt; if (o.t > 0.22) { o.state = 'falling'; o.vy = 0; } }
        else if (o.state === 'falling') {
          o.vy += 4200 * dt; o.y += o.vy * dt;
          if (o.y >= GY) { o.y = GY; o.state = 'rest'; this.addShake(0.25); this.dust(o.x, GY, 4); }
          this.world.updateHit(o);
        }
        if (o.state === 'hanging' || o.state === 'shake') continue;
      } else if (o.kind === 'pop') {
        if (o.state === 'hidden') { if (dx < v * 0.6) { o.state = 'popped'; o.t = 0; this.world.updateHit(o); this.sfx('pop_spike', { vol: 0.9 }); this.fx.burst(5, () => ({ x: o.x + rand.range(-20, 20), y: GY - 10, vx: rand.range(-90, 90), vy: rand.range(-260, -120), ay: 900, life: 0.5, shape: 'circle', w: 6, color: '#dff6ff', alpha: 0.9 })); } else continue; }
        else o.t += dt;
      }
      if (dx > 900) { if (o.kind !== 'beam') break; else continue; }
      if (immune) continue;
      if (!rectsOverlap(hb, o.hit)) continue;
      if (inv) { this.smash(o); continue; }
      if (this.pw.shield > 0) { this.pw.shield = 0; this.smash(o); this.sfx('shield_break'); r.invuln = Math.max(r.invuln, 0.9); continue; }
      if (r.invuln > 0) continue;
      this.hitObstacle(o, hb);
      return;
    }
  }
  smash(o, silent = false) {
    if (o.smashed) return;
    o.smashed = true; o.t = 0;
    o.vx = 520 + this.curV * 0.4; o.vy = -820 - rand() * 300; o.vr = 8 + rand() * 8;
    if (o.kind === 'beam') o.vy = -1200;
    if (silent) return;
    this.score += CFG.SCORE.smash;
    this.stats.smash++;
    this.sfx('smash', { rate: 0.95 + rand() * 0.1 });
    const cx = o.kind === 'beam' ? o.x + o.w / 2 : o.x, cy = o.kind === 'hang' || o.kind === 'beam' ? CFG.OVERHEAD_Y - 40 : o.y - 40;
    this.fx.spawn({ x: cx, y: cy, anim: ['fx', ['smash_0', 'smash_1', 'smash_2', 'smash_3'], 16], life: 0.25, size: 0.8, alpha: 1, alpha1: 1 });
    this.fx.burst(8, () => ({ x: cx, y: cy, vx: rand.range(-200, 420), vy: rand.range(-520, -100), ay: 1400, vr: rand.range(-10, 10), life: 0.8, sprite: ['fx', 'chip_bit_' + rand.int(0, 2)], size: rand.range(0.8, 1.3), alpha: 1, alpha1: 0.2 }));
    this.popup(cx, cy - 30, `+${CFG.SCORE.smash}`, '#ffe680', 24);
    this.addShake(0.3);
  }
  hitObstacle(o, hb) {
    const r = this.runner;
    const dmg = CFG.HIT_DAMAGE + CFG.HIT_DAMAGE_LAND * this.landIdx + this.lap * 2;
    this.energy -= dmg;
    r.invuln = CFG.INVULN_HIT; r.hurtT = 0.36; r.flashT = 0.3;
    this.combo = 0;
    this.stats.hits++; this.stats.hitsLand++;
    this.hitStop = 0.07; this.hitVig = 1; this.addShake(0.55);
    this.hud.barShake = 1;
    this.sfx('hit');
    buzz(70, Save.data.settings.vibrate);
    const cx = clamp(o.hit.x + o.hit.w / 2, hb.x, hb.x + hb.w), cy = clamp(o.hit.y + o.hit.h, hb.y + 10, hb.y + hb.h - 10);
    this.fx.spawn({ x: cx + 10, y: cy, anim: ['fx', ['hit_0', 'hit_1'], 12], life: 0.22, size: 0.6, alpha: 1, alpha1: 0.6 });
    this.rpop(0, -120, `-${dmg}`, '#ff6b6b', 30);
  }

  springs(r) {
    if (r.mode !== 'run') return;
    for (const s of this.world.springs) {
      if (s.t > 0) s.t -= 1 / 120;
      const dx = Math.abs(s.x - r.x);
      if (dx > 38 * r.scale) continue;
      if (r.vy >= 0 && r.y >= GY - 34 && r.y <= GY + 4) {
        r.bounce(CFG.SPRING_V); s.t = 0.18;
        this.sfx('spring');
        this.fx.spawn({ x: s.x, y: GY - 20, sprite: ['fx', 'ring'], size: 0.2, size1: 0.7, life: 0.3, alpha: 0.8, add: true });
      }
    }
  }

  // ---------------------------------------------------------------- pickups
  pickups(dt, r, v) {
    const hb = r.hitbox();
    const pad = r.scale > 1.2 ? 14 : 6;
    const box = { x: hb.x - pad, y: hb.y - pad, w: hb.w + pad * 2, h: hb.h + pad * 2 };
    const c = r.center();
    const cupcake = this.skill && this.skill.id === 'cupcake' && this.skill.active > 0;
    const magnet = this.pw.magnet > 0 || this.petMagnet > 0 || cupcake || this.state === 'rush';
    const magR = this.state === 'rush' ? 150 : CFG.MAGNET_R * (r.scale > 1.2 ? 1.25 : 1);
    const toCoins = this.pw.coins > 0 || cupcake;
    const viewR = this.camX + this.W + 80;
    const maca = this.skill && this.skill.id === 'maca' && this.skill.active > 0;
    for (const p of this.world.picks) {
      if (p.taken) { p.t += dt; continue; }
      if (p.born > 0 && p.born < 1) p.born = Math.min(1, p.born + dt * 4);
      if (p.fall) {
        p.vy += 1700 * dt; p.y += p.vy * dt; if (p.vx) p.x += p.vx * dt;
        if (p.y >= p.restY) { p.y = p.restY; p.fall = false; p.vx = 0; }
        if (p.y > 1000) { p.taken = true; p.t = 99; continue; }
      }
      if (p.x > r.x + 1500) continue;
      if (p.x < viewR && p.kind.startsWith('jelly')) {
        if (toCoins && !p.mag) this.toCoin(p);
        else if (maca && !p.bloom && (p.kind === 'jelly' || p.kind === 'jelly_pink' || p.kind === 'jelly_choco' || p.kind === 'jelly_star')) {
          p.bloom = true;
          p.kind = p.kind === 'jelly_star' ? 'jelly_big' : 'jelly_star'; p.r = p.kind === 'jelly_big' ? 34 : 20;
          if (rand() < 0.35) this.fx.spawn({ x: p.x, y: p.y, anim: ['fx', ['spark_0', 'spark_1', 'spark_2', 'spark_3'], 20], life: 0.2, size: 0.5, add: true });
        }
      }
      const dx = c.x - p.x, dy = c.y - p.y;
      if (!p.mag && magnet && p.x > r.x - 60 && dx * dx + dy * dy < magR * magR) { p.mag = true; p.magT = 0; }
      if (p.mag) {
        p.magT += dt;
        const d = Math.hypot(dx, dy) || 1;
        const sp = 700 + 2600 * Math.min(1, p.magT * 2);
        p.x += (dx / d) * sp * dt + v * dt * 0.6;
        p.y += (dy / d) * sp * dt;
      }
      if (circleRect(p.x, p.y, p.r, box)) this.collect(p, r);
    }
  }
  toCoin(p) {
    const k = p.kind;
    p.kind = k === 'jelly_giant' || k === 'jelly_rainbow' ? 'coin_b' : k === 'jelly_big' || k === 'jelly_star' ? 'coin_g' : 'coin_s';
    p.r = p.kind === 'coin_b' ? 30 : 16;
  }
  collect(p, r) {
    p.taken = true; p.t = 0;
    const k = p.kind;
    if (k.startsWith('jelly')) {
      const base = CFG.SCORE[k] || 30;
      const val = Math.round(base * this.mods.jellyMult * this.comboMult() * this.landMult() * (this.state === 'rush' ? 1.5 : 1));
      this.score += val; this.jellies++;
      this.addCombo();
      this.hud.scorePop = Math.min(1, this.hud.scorePop + 0.25);
      if (k === 'jelly_big') {
        this.sfx('jelly_big'); this.popup(p.x, p.y - 30, `+${val}`, '#ffe680', 28);
        this.fx.spawn({ x: p.x, y: p.y, anim: ['fx', ['spark_0', 'spark_1', 'spark_2', 'spark_3'], 20], life: 0.2, size: 1.2, add: true });
      } else if (k === 'jelly_rainbow' || k === 'jelly_giant') {
        this.sfx('jelly_rainbow'); this.popup(p.x, p.y - 40, `+${val}`, '#ffb3f0', k === 'jelly_giant' ? 40 : 32, { dur: 1.2 });
        this.fx.burst(14, (i, n) => { const a = (i / n) * TAU; return { x: p.x, y: p.y, vx: Math.cos(a) * 340, vy: Math.sin(a) * 340, drag: 3, life: 0.6, sprite: ['fx', 'star_small'], size: 1, size1: 0.3, add: true }; });
        this.addShake(0.2);
      } else {
        this.jellySound(k === 'jelly_star' ? 1 : 0.85);
        if (rand() < 0.5) this.fx.spawn({ x: p.x, y: p.y, anim: ['fx', ['spark_0', 'spark_1', 'spark_2', 'spark_3'], 24], life: 0.17, size: k === 'jelly_star' ? 0.6 : 0.4, add: true });
      }
    } else if (k.startsWith('coin')) {
      const val = CFG.COIN[k[5]] * this.mods.coinMult;
      this.coinAcc += val; this.coins = Math.floor(this.coinAcc);
      this.addCombo();
      this.hud.coinPop = 1;
      this.sfx(k === 'coin_b' ? 'coin_big' : 'coin', { rate: 0.97 + rand() * 0.07, vol: 0.85, max: 6 });
      if (rand() < 0.6) this.fx.spawn({ x: p.x, y: p.y, anim: ['fx', ['glint_0', 'glint_1', 'glint_2', 'glint_3'], 18], life: 0.22, size: 0.6, add: true });
    } else if (k === 'milk_s' || k === 'milk_l') {
      const heal = (k === 'milk_l' ? CFG.MILK_L : CFG.MILK_S) * this.mods.milkMult;
      this.energy = Math.min(this.maxEnergy, this.energy + heal);
      this.stats.milk++;
      this.sfx('milk');
      this.rpop(0, -130, `+${Math.round(heal)}`, '#8dff7a', 30);
      this.fx.burst(8, () => ({ x: r.x + rand.range(-30, 30), y: r.y - rand.range(20, 100), vy: -rand.range(60, 140), life: 0.7, sprite: ['fx', 'heal'], size: rand.range(0.35, 0.6), alpha: 1, add: true }));
    } else if (k.startsWith('pw:')) {
      this.stats.items++;
      this.activatePower(k.slice(3));
    } else if (k === 'letter') {
      this.collectLetter(p.idx);
    }
  }
  addCombo() {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    if (this.combo % 10 === 0) this.hud.comboPop = 1;
    if (this.combo % 100 === 0) { this.sfx('combo'); this.popup(this.W - 92, 262, `${this.combo} COMBO!`, '#9dff7a', 26, { dur: 1.1, screen: true, vy: -40 }); }
  }
  jellySound(vol) {
    if (this.t - this.lastJellyT < 0.3) this.jellyNote++; else this.jellyNote = 0;
    this.lastJellyT = this.t;
    const semi = JELLY_SCALE[this.jellyNote % JELLY_SCALE.length];
    this.sfx('jelly', { rate: Math.pow(2, semi / 12), vol, max: 6 });
  }

  activatePower(type) {
    const r = this.runner;
    const dur = (CFG.DUR[type] || 5) * this.mods.itemMult;
    this.sfx('item');
    switch (type) {
      case 'magnet': this.pw.magnet = Math.max(this.pw.magnet, dur); this.sfx('magnet'); break;
      case 'giant': this.pw.giant = Math.max(this.pw.giant, dur); r.targetScale = CFG.GIANT_SCALE; this.sfx('giant_on'); this.addShake(0.4); break;
      case 'dash': this.pw.dash = Math.max(this.pw.dash, dur); this.sfx('dash_on'); break;
      case 'coins': this.pw.coins = Math.max(this.pw.coins, dur); this.sfx('convert'); break;
      case 'shield': this.pw.shield = Math.max(this.pw.shield, dur); this.sfx('shield_on'); break;
      case 'stars': this.convertStars(); this.sfx('convert'); break;
    }
    if (this.pw[type] !== undefined) this.pwDur[type] = this.pw[type];
    this.banner(POWERUPS[type].name, { size: 46, dur: 1.2, color: POWERUPS[type].color, y: 300 });
    this.fx.spawn({ x: r.x, y: r.y - 50 * r.scale, sprite: ['fx', 'ring_gold'], size: 0.3, size1: 1.4, life: 0.4, alpha: 0.9, add: true });
  }
  convertStars() {
    const viewR = this.camX + this.W + 300;
    for (const p of this.world.picks) {
      if (p.taken || p.x > viewR || !p.kind.startsWith('jelly')) continue;
      if (p.kind === 'jelly' || p.kind === 'jelly_pink' || p.kind === 'jelly_choco') { p.kind = 'jelly_star'; p.r = 20; }
      else if (p.kind === 'jelly_star') { p.kind = 'jelly_big'; p.r = 34; }
      if (rand() < 0.4) this.fx.spawn({ x: p.x, y: p.y, anim: ['fx', ['spark_0', 'spark_1', 'spark_2', 'spark_3'], 20], life: 0.2, size: 0.7, add: true });
    }
    this.flash = 0.35; this.flashColor = '#fff3b0';
  }

  collectLetter(idx) {
    if (this.letters[idx]) return;
    this.letters[idx] = true;
    this.mainWorld.lettersInFlight.delete(idx);
    this.hud.letterPop[idx] = 1;
    this.sfx('letter', { rate: Math.pow(2, LETTER_STEPS[idx] / 12) });
    const r = this.runner;
    this.fx.burst(10, (i, n) => { const a = (i / n) * TAU; return { x: r.x, y: r.y - 60, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, drag: 4, life: 0.5, sprite: ['fx', 'star_small'], size: 0.8, size1: 0.2, add: true }; });
    if (this.letters.every(Boolean)) this.tw.after(0.25, () => { if (this.state === 'play') this.startRush(); });
    else if (!this.tut.shownLetter) { this.tut.shownLetter = true; this.game.toast('S·U·G·A·R·R·U·S·H 글자를 모두 모으면 보너스 스테이지!', { icon: 'star', dur: 3.2 }); }
  }

  // ---------------------------------------------------------------- skills
  updateSkill(dt) {
    const sk = this.skill;
    if (!sk) return;
    if (sk.active > 0) {
      sk.active -= dt;
      this.skillTick(sk, dt);
      if (sk.active <= 0) this.skillEnd(sk);
      return;
    }
    sk.timer -= dt;
    if (sk.timer <= 0) { sk.timer = sk.cd; this.skillStart(sk); }
  }
  skillStart(sk) {
    const r = this.runner;
    this.stats.skills++;
    this.sfx('skill_' + sk.id);
    r.skillPose = 0.45;
    this.rpop(0, -160, sk.name, '#fff6a0', 28, { dur: 1.2 });
    this.fx.spawn({ x: r.x, y: r.y - 50, sprite: ['fx', 'ring'], size: 0.3, size1: 1.3, life: 0.45, alpha: 0.8, add: true });
    switch (sk.id) {
      case 'chip': sk.active = sk.dur; sk.rainT = 0; break;
      case 'maca': sk.active = sk.dur; break;
      case 'pudding': {
        sk.active = 0.9;
        this.energy = Math.min(this.maxEnergy, this.energy + sk.heal);
        this.rpop(40, -120, `+${Math.round(sk.heal)}`, '#8dff7a', 30);
        this.fx.burst(12, () => ({ x: r.x + rand.range(-40, 40), y: r.y - rand.range(10, 110), vy: -rand.range(80, 170), life: 0.8, sprite: ['fx', 'heal'], size: rand.range(0.4, 0.7), add: true }));
        break;
      }
      case 'donut': sk.active = sk.dur; r.mode = 'roll'; r.rollAngle = 0; r.sliding = false; break;
      case 'marsh': sk.active = sk.dur; r.mode = 'float'; r.targetScale = Math.max(r.targetScale, 1.2); sk.spawnX = r.x + 160; r.spinT = 0; break;
      case 'cupcake': sk.active = sk.dur; break;
      case 'cotton': sk.active = 0.6; this.pw.shield = Math.max(this.pw.shield, 7); this.pwDur.shield = this.pw.shield; this.sfx('shield_on'); break;
    }
  }
  skillTick(sk, dt) {
    const r = this.runner, w = this.world;
    if (sk.id === 'chip') {
      sk.rainT -= dt;
      while (sk.rainT <= 0) {
        sk.rainT += 0.085;
        const x = r.x + rand.range(240, 980);
        const surf = w.surfaceBelow(x, 0);
        const restY = surf == null ? 2000 : surf - (GY - CFG.JELLY_Y) - rand.range(0, 30);
        w.addPick('jelly_choco', x, -30 - rand() * 80, { fall: true, vy: rand.range(80, 260), vx: rand.range(-40, 10), restY, born: 0.01 });
      }
    } else if (sk.id === 'marsh') {
      while (sk.spawnX < r.x + this.W - 200) {
        w.addPick('jelly_star', sk.spawnX, 300 - 48 + Math.sin(sk.spawnX / 90) * 24, { born: 0.01 });
        sk.spawnX += 44;
      }
    }
  }
  skillEnd(sk) {
    const r = this.runner;
    if (sk.id === 'donut' && r.mode === 'roll') { r.mode = 'run'; r.invuln = Math.max(r.invuln, 0.9); this.bridgeT = Math.max(this.bridgeT, 0.5); }
    if (sk.id === 'marsh' && r.mode === 'float') {
      r.mode = 'run'; r.targetScale = this.pw.giant > 0 ? CFG.GIANT_SCALE : 1;
      r.grounded = false; r.vy = 0; r.jumps = 1;
      this.bridgeT = Math.max(this.bridgeT, 1.5); r.invuln = Math.max(r.invuln, 1.2);
    }
  }

  // ---------------------------------------------------------------- pet
  updatePet(dt) {
    if (!this.pet) return;
    if (this.pet.update(dt, this.runner, this.state === 'play' && !this.tut.cur)) this.petAbility();
  }
  petAbility() {
    const r = this.runner, w = this.world, pet = this.pet;
    this.sfx('pet');
    switch (pet.id) {
      case 'twinkle': {
        const x0 = r.x + 520;
        for (let i = 0; i < 9; i++) w.addPick('jelly_star', x0 + i * 44, CFG.JELLY_Y - 16 - Math.sin((i / 8) * Math.PI) * 34, { born: 0.01 });
        break;
      }
      case 'buzzy': {
        const x = pet.x + 420;
        const surf = w.surfaceBelow(x, 0);
        w.addPick('milk_s', x, pet.y, { fall: true, vy: -260, restY: (surf ?? GY) - 66, born: 0.01 });
        break;
      }
      case 'puff': this.petMagnet = 3; this.sfx('magnet', { vol: 0.6 }); break;
      case 'oink': {
        for (let i = 0; i < 6; i++) {
          const x = pet.x + 300 + i * 46;
          const surf = w.surfaceBelow(x, 0);
          w.addPick('coin_g', pet.x + 30, pet.y, { fall: true, vx: 300 + i * 46 * 1.5, vy: -420 - i * 20, restY: (surf ?? GY) - 46, born: 0.01 });
        }
        break;
      }
      case 'pop': {
        const target = w.obs.find((o) => !o.smashed && o.x > r.x + 80 && o.x < r.x + 1100 && !(o.kind === 'pop' && o.state === 'hidden'));
        if (target) this.projectiles.push({ x: pet.x, y: pet.y, o: target, t: 0, done: false });
        break;
      }
    }
  }
  projStep(pr, dt) {
    pr.t += dt;
    const o = pr.o;
    const tx = o.kind === 'beam' ? o.x + o.w / 2 : o.x, ty = o.kind === 'hang' || o.kind === 'beam' ? CFG.OVERHEAD_Y - 50 : o.y - 40;
    const k = Math.min(1, pr.t / 0.32);
    pr.cx = pr.x + (tx - pr.x) * k; pr.cy = pr.y + (ty - pr.y) * k - Math.sin(k * Math.PI) * 80;
    if (rand() < 0.7) this.fx.spawn({ x: pr.cx, y: pr.cy, vx: -60, vy: rand.range(-30, 30), life: 0.3, sprite: ['fx', 'spark_1'], size: 0.4, size1: 0.1, add: true });
    if (k >= 1) { pr.done = true; if (!o.smashed) { this.smash(o); this.sfx('smash'); } }
  }

  // ---------------------------------------------------------------- lands
  enterLand(tr) {
    if (this.stats.hitsLand === 0) this.stats.cleanLand++;
    this.stats.hitsLand = 0;
    this.landIdx = tr.landIdx; this.lap = tr.lap; this.landNo = tr.n;
    this.speedTarget = this.gen.speed(tr.landIdx, tr.lap);
    this.bg.set(LAND_IDS[tr.landIdx]);
    this.game.audio.playMusic(LANDS[tr.landIdx].bgm, { fade: 1.4 });
    this.sfx('land_change');
    this.banner(`LAND ${tr.n}`, { sub: LANDS[tr.landIdx].name, size: 58, dur: 2.4, color: '#ffe680', y: 230 });
    if (tr.n > 1) this.tw.after(0.9, () => this.rpop(140, -170, 'SPEED UP!', '#86ceff', 32, { dur: 1.3 }));
  }

  // ---------------------------------------------------------------- bonus
  startRush() {
    if (this.state !== 'play') return;
    const r = this.runner;
    this.state = 'rushIn'; this.stateT = 0;
    this.stats.rush++;
    this.sfx('rush_start');
    this.sfx('whoosh', { delay: 0.25 });
    this.game.audio.stopMusic(0.4);
    this.flash = 0.8; this.flashColor = '#ffffff';
    this.banner('SUGAR RUSH!', { size: 76, dur: 1.8, color: '#ffb3f0', y: 300 });
    if (r.mode === 'roll' || r.mode === 'float') r.mode = 'run';
    if (this.skill && this.skill.active > 0) { this.skillEnd(this.skill); this.skill.active = 0; }
    r.targetScale = 1;
  }
  rushInStep(dt) {
    const r = this.runner;
    r.x += this.curV * dt;
    r.y -= 900 * dt * Math.min(1, this.stateT * 3);
    r.grounded = false; r.spinT = 0;
    r.pushTrail(dt, true);
    this.camX = r.x - CFG.PLAYER_SX;
    if (this.pet) this.pet.update(dt, r, false);
    if (this.stateT > 0.85) this.beginRush();
  }
  beginRush() {
    const r = this.runner;
    this.mainX = r.x;
    this.rush = new RushStage(this, this.mods.rushTime);
    this.world = this.rush.world;
    r.x = 0; r.y = 330; r.vy = 200; r.mode = 'fly'; r.trail.length = 0; r.scale = 1;
    this.camX = r.x - CFG.PLAYER_SX;
    if (this.pet) this.pet.place(r.x - 90, 250);
    this.bg.set('rush', true);
    this.game.audio.playMusic('bgm_rush', { fade: 0.2 });
    this.flash = 0.7;
    this.state = 'rush'; this.stateT = 0;
  }
  rushStep(dt) {
    const r = this.runner, v = CFG.RUSH_SPEED;
    this.curV = v;
    const ev = r.step(dt, this.world, { speed: v });
    if (ev === 'bounce') this.sfx('spring', { vol: 0.5 });
    this.pickups(dt, r, v);
    if (this.pet) this.pet.update(dt, r, false);
    this.camX = r.x - CFG.PLAYER_SX;
    this.rush.fill(this.camX + this.W + 900);
    this.world.cull(this.camX - 300);
    this.dist += (v * dt) / 10;
    this.rush.left -= dt;
    if (this.rush.left <= 0) { this.state = 'rushOut'; this.stateT = 0; this.sfx('rush_end'); }
  }
  rushOutStep(dt) {
    const r = this.runner;
    r.x += CFG.RUSH_SPEED * dt;
    r.y -= 1000 * dt;
    this.camX = r.x - CFG.PLAYER_SX;
    this.pickups(dt, r, CFG.RUSH_SPEED);
    if (this.stateT > 0.6) this.endRush();
  }
  endRush() {
    const r = this.runner;
    this.world = this.mainWorld;
    r.x = this.mainX; r.y = -80; r.vy = 300; r.mode = 'run'; r.grounded = false; r.jumps = 1; r.onPlat = null; r.trail.length = 0;
    r.invuln = 2.6; this.bridgeT = 2.4;
    this.letters.fill(false);
    for (const p of this.world.picks) if (p.kind === 'letter' && !p.taken) { p.kind = 'jelly_star'; p.r = 20; }
    this.world.lettersInFlight.clear();
    this.camX = r.x - CFG.PLAYER_SX;
    for (const o of this.world.obs) if (!o.smashed && o.x > r.x - 100 && o.x < r.x + 700) this.smash(o, true);
    if (this.pet) this.pet.place(r.x - 90, 200);
    this.bg.set(LAND_IDS[this.landIdx], true);
    this.game.audio.playMusic(LANDS[this.landIdx].bgm, { fade: 0.6 });
    this.flash = 0.6;
    this.rush = null;
    this.state = 'play'; this.stateT = 0;
  }

  // ---------------------------------------------------------------- death
  exhausted() {
    if (!this.spurtUsed && this.mods.spurt > 0) {
      this.spurtUsed = true; this.spurt = this.mods.spurt;
      this.sfx('spurt');
      this.banner('라스트 스퍼트!', { size: 52, color: '#ffb36b', y: 290 });
      return;
    }
    this.die('down');
  }
  die(reason) {
    const r = this.runner;
    this.state = 'dying'; this.stateT = 0; this.deathReason = reason;
    if (r.mode === 'roll' || r.mode === 'float') r.mode = 'run';
    if (this.skill) this.skill.active = 0;
    this.pw.giant = 0; this.pw.dash = 0; r.targetScale = 1; this.spurt = 0;
    r.trail.length = 0;
    if (reason === 'pit') { r.mode = 'pit'; r.modeT = 0; r.vy = Math.max(r.vy, 200); this.sfx('fall'); }
    else { r.mode = 'down'; r.modeT = 0; r.y = r.onPlat ? r.onPlat.y : (this.world.groundAt(r.x, 30) ? GY : r.y); this.sfx('exhausted'); this.energy = 0; }
    this.deathV = this.curV;
    this.game.audio.musicLevel(0.25, 0.4);
    buzz(120, Save.data.settings.vibrate);
  }
  dyingStep(dt) {
    const r = this.runner;
    if (this.deathReason === 'down') {
      this.deathV = Math.max(0, this.deathV - 1100 * dt);
      r.x += this.deathV * dt;
      if (!r.grounded && r.y < GY) { r.vy += CFG.GRAVITY * dt; r.y = Math.min(GY, r.y + r.vy * dt); }
      this.camX = r.x - CFG.PLAYER_SX;
    } else r.step(dt, this.world, { speed: this.deathV * 0.35 });
    if (this.pet) this.pet.update(dt, r, false);
    if (this.stateT > 1.35) this.resolveDeath();
  }
  resolveDeath() {
    if (this.saves.cotton) { this.saves.cotton = false; this.revive(this.skill.revive || 0.4, '구름 쿠션!'); return; }
    if (this.saves.revive) { this.saves.revive = false; this.revive(0.5, '부활!'); return; }
    if (this.saves.relay) { this.startRelay(); return; }
    this.gameOver();
  }
  safeGroundX(from) {
    for (const g of this.world.ground) if (g.x1 - Math.max(g.x0, from) > 360) return Math.max(g.x0 + 60, from);
    return from;
  }
  revive(ratio, label) {
    const r = this.runner;
    this.state = 'revive'; this.stateT = 0;
    this.energy = Math.max(this.energy, this.maxEnergy * ratio);
    this.sfx('revive');
    this.banner(label, { size: 60, color: '#fff3a0', y: 280 });
    if (this.deathReason === 'pit') { r.x = this.safeGroundX(r.x + 40); r.y = 120; }
    r.mode = 'run'; r.grounded = false; r.vy = -600; r.jumps = 1;
    r.invuln = 3.2; this.bridgeT = 3;
    for (const o of this.world.obs) if (!o.smashed && o.x > r.x - 200 && o.x < r.x + 800) this.smash(o, true);
    this.flash = 0.7; this.flashColor = '#fff6c0';
    this.game.audio.musicLevel(1, 0.6);
    this.camX = r.x - CFG.PLAYER_SX;
  }
  reviveStep(dt) {
    const r = this.runner;
    r.step(dt, this.world, { speed: this.speed * Math.min(1, this.stateT), bridge: true });
    this.camX = r.x - CFG.PLAYER_SX;
    this.fx.spawn({ x: r.x + rand.range(-40, 40), y: r.y - rand.range(0, 100), vy: -120, life: 0.6, sprite: ['fx', 'star_small'], size: 0.6, size1: 0.1, add: true });
    if (this.pet) this.pet.update(dt, r, false);
    if (this.stateT > 0.9) { this.state = 'play'; this.stateT = 0; }
  }
  startRelay() {
    const old = this.runner;
    const id = this.saves.relay;
    this.saves.relay = null;
    this.stats.relay = 1;
    if (this.deathReason === 'down') this.downRunner = { id: old.id, sheet: old.sheet, x: old.x, y: old.y, f: old.meta.anims.down.frames[1] };
    const r = new Runner(this, id);
    this.runner = r;
    this.charId = id;
    this.mods = Progress.mods(id);
    this.maxEnergy = this.mods.maxEnergy + (this.boosts.energy ? 30 : 0);
    this.energy = this.maxEnergy * 0.75;
    this.skill = this.makeSkill(id);
    this.saves.cotton = id === 'cotton';
    this.spurtUsed = false;
    r.x = this.camX - 120; r.y = GY; r.grounded = true;
    r.invuln = 3; this.bridgeT = 3.2;
    this.state = 'relay'; this.stateT = 0;
    this.sfx('relay');
    this.sfx('whoosh', { vol: 0.8 });
    this.banner('릴레이!', { sub: `${CHAR[id].name} 출동!`, size: 64, color: '#9dff7a', y: 270 });
    this.game.audio.musicLevel(1, 0.6);
    for (const o of this.world.obs) if (!o.smashed && o.x > this.camX && o.x < this.camX + this.W + 400) this.smash(o, true);
  }
  relayStep(dt) {
    const r = this.runner;
    r.step(dt, this.world, { speed: this.speed * 1.7, bridge: true });
    if (this.pet) this.pet.update(dt, r, false);
    if (r.x >= this.camX + CFG.PLAYER_SX) { this.state = 'play'; this.stateT = 0; }
  }
  gameOver() {
    this.state = 'over'; this.stateT = 0;
    this.game.audio.stopMusic(0.6);
    this.game.audio.jingle('jingle_over');
    this.banner(this.deathReason === 'pit' ? '앗, 떨어졌다!' : '기진맥진!', { size: 60, color: '#ffd0d0', y: 300, dur: 2 });
  }
  overStep() {
    if (this.stateT > 2 && !this.over) {
      this.over = true;
      if (this.stats.hitsLand === 0 && this.landNo > 1) this.stats.cleanLand += 0; // only completed lands count
      this.game.endRun(this.summary());
    }
  }
  summary() {
    return {
      char: this.params.char, relayChar: this.stats.relay ? this.runner.id : null, pet: this.params.pet,
      score: this.score, coins: this.coins, jellies: this.jellies, land: this.landNo, milk: this.stats.milk, items: this.stats.items,
      maxCombo: this.maxCombo, dist: Math.floor(this.dist), cleanLand: this.stats.cleanLand, relay: this.stats.relay,
      jumps: this.stats.jumps, djumps: this.stats.djumps, slideTime: Math.floor(this.stats.slideTime), smash: this.stats.smash,
      rush: this.stats.rush, skills: this.stats.skills, tutorial: this.tutorialRun, params: this.params,
    };
  }

  // ---------------------------------------------------------------- tutorial
  tutorialCheck(r, v) {
    if (!this.tutorialRun) return;
    if (!this.tut.cur) {
      for (const o of this.world.obs) {
        if (!o.tutorial || o.tutDone) continue;
        const d = o.hit.x - (r.x + 23);
        const trigger = o.tutorial === 'slide' ? v * 0.32 : v * 0.34 - 20;
        if (d < trigger && d > -40) { this.tut.cur = { kind: o.tutorial, o, stage: 0 }; o.tutDone = true; this.timeScale = 0.06; break; }
      }
      if (!this.tut.cur && this.world.tutorialPits) {
        for (const pt of this.world.tutorialPits) {
          if (pt.done) continue;
          const d = pt.x - r.x;
          if (d < v * 0.22 && d > -20) { pt.done = true; this.tut.cur = { kind: 'gap', stage: 0 }; this.timeScale = 0.06; break; }
        }
      }
      if (!this.tut.shownMilk) {
        const milk = this.world.picks.find((p) => !p.taken && p.kind.startsWith('milk') && p.x < this.camX + this.W - 100);
        if (milk) { this.tut.shownMilk = true; this.game.toast('우유를 마시면 에너지가 회복돼요!', { icon: 'milk', dur: 3 }); }
      }
    } else if (this.tut.cur.kind === 'double' && this.tut.cur.stage === 1 && r.vy > -380) {
      this.tut.cur.stage = 2; this.timeScale = 0.06;
    }
  }
  tutorialAction(act) {
    const c = this.tut.cur;
    if (!c) return;
    if ((c.kind === 'jump' || c.kind === 'gap') && act === 'jump') { this.tut.cur = null; this.timeScale = 1; }
    else if (c.kind === 'slide' && act === 'slide') { this.tut.cur = null; this.timeScale = 1; }
    else if (c.kind === 'double' && act === 'jump') {
      if (c.stage === 0) { c.stage = 1; this.timeScale = 1; }
      else if (c.stage === 2) { this.tut.cur = null; this.timeScale = 1; }
    }
  }

  render(ctx) { renderRun(this, ctx); }
}
