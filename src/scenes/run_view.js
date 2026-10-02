// =============================================================================
//  RunScene rendering: world layers, runner/pet, effects, HUD, banners,
//  tutorial prompts, pause overlay, debug overlay.
// =============================================================================
import { CFG } from '../config.js';
import { Assets } from '../engine/assets.js';
import { text, panel, ribbon, COL, rrPath } from '../engine/ui.js';
import { TAU, Ease, fmt, rgba, clamp } from '../engine/util.js';
import { LANDS } from '../data/content.js';

const GY = CFG.GROUND_Y;

const TUT_TEXT = {
  jump: ['점프!', '화면 왼쪽을 탭하세요  ·  키보드 Space / ↑'],
  double0: ['점프!', '먼저 한 번 점프!'],
  double2: ['한 번 더!', '공중에서 한 번 더 누르면 더블 점프'],
  slide: ['슬라이드!', '화면 오른쪽을 꾹 누르세요  ·  키보드 ↓'],
  gap: ['구멍은 점프!', '떨어지면 바로 끝나요. 점프로 넘어가요'],
};

export function renderRun(s, ctx) {
  const W = s.W, H = s.H;
  const r = s.runner;
  const cam = s.camX + s.shakeX;
  ctx.save();
  ctx.translate(0, s.shakeY);
  s.bg.render(ctx, W, H, cam);
  const w = s.world;
  w.renderDecos(ctx, cam, W);
  const protect = s.state === 'play' && (s.bridgeT > 0 || s.invincible || r.mode === 'float');
  w.renderGround(ctx, cam, W, protect ? 1 : 0);
  w.renderPlats(ctx, cam, W);
  w.renderSprings(ctx, cam, W);
  w.renderObstacles(ctx, cam, W, s.t);
  w.renderPicks(ctx, cam, W, s.t);
  if (s.downRunner) {
    const d = s.downRunner;
    Assets.draw(ctx, d.sheet, d.f, d.x - cam, d.y, { alpha: 0.95 });
  }
  // magnet field
  const magnet = s.pw.magnet > 0 || s.petMagnet > 0 || (s.skill && s.skill.id === 'cupcake' && s.skill.active > 0);
  if (magnet && s.state === 'play') {
    const c = r.center();
    const ph = (s.t * 1.6) % 1;
    for (let i = 0; i < 2; i++) {
      const k = (ph + i * 0.5) % 1;
      Assets.draw(ctx, 'fx', 'ring', c.x - cam, c.y, { scale: 0.4 + k * 1.1, alpha: (1 - k) * 0.35, add: true });
    }
  }
  if (s.pet) s.pet.render(ctx, cam);
  const surface = r.mode === 'fly' ? null : w.surfaceBelow(r.x, r.y - 4);
  let aura = null;
  if (s.skill && s.skill.active > 0) aura = r.skillColor;
  if (s.spurt > 0) aura = '#ffb36b';
  if (s.pw.giant > 0 && s.pw.giant < 1.2 && Math.floor(s.t * 10) % 2 === 0) aura = '#ffffff';
  r.render(ctx, cam, s.t, { surface, auraColor: aura, shield: s.pw.shield > 0, ghost: s.pw.dash > 0 ? '#9fe0ff' : r.mode === 'roll' ? '#ffd0e8' : '#ffe2b0', noBlink: s.state !== 'play' });
  for (const pr of s.projectiles) if (pr.cx != null) Assets.draw(ctx, 'pet_pop', 4, pr.cx - cam, pr.cy, { scale: 0.55, rot: 0.2 });
  s.fx.render(ctx, cam, 0, false);
  for (const p of s.popups) {
    if (p.screen) continue;
    const k = p.t / p.dur;
    const sc = k < 0.15 ? Ease.outBack(k / 0.15) : 1;
    text(ctx, p.txt, p.x - cam, p.y, { size: p.size * sc, font: 'num', color: p.color, stroke: COL.ink, sw: Math.max(4, p.size * 0.2), alpha: k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1 });
  }
  ctx.restore();

  // ---------------------------------------------------------- screen fx
  if (s.state === 'play' && (s.pw.dash > 0 || r.mode === 'roll' || s.spurt > 0)) speedLines(ctx, s, W, H);
  if (s.state === 'rush' || s.state === 'rushIn') speedLines(ctx, s, W, H, 0.5);
  const lowE = s.energy / s.maxEnergy;
  if ((s.state === 'play' && lowE < CFG.LOW_ENERGY) || s.hitVig > 0) {
    const p = s.hitVig > 0 ? s.hitVig : (0.5 + 0.5 * Math.sin(s.t * 6)) * (1 - lowE / CFG.LOW_ENERGY) * 0.8;
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.7);
    g.addColorStop(0, 'rgba(255,40,60,0)'); g.addColorStop(1, `rgba(255,40,60,${0.45 * p})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (s.flash > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, s.flash); ctx.fillStyle = s.flashColor; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  s.fx.render(ctx, 0, 0, true);
  for (const p of s.popups) {
    if (!p.screen) continue;
    const k = p.t / p.dur;
    const sc = k < 0.15 ? Ease.outBack(k / 0.15) : 1;
    text(ctx, p.txt, p.x, p.y, { size: p.size * sc, font: /[가-힣]/.test(p.txt) ? 'display' : 'num', color: p.color, stroke: COL.ink, sw: Math.max(4, p.size * 0.2), alpha: k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1 });
  }

  // ---------------------------------------------------------- HUD
  s.hud.alpha = s.state === 'over' ? Math.max(0, 1 - s.stateT * 1.5) : 1;
  s.hud.render(ctx);
  if (s.state !== 'over') s.ui.draw(ctx);

  // ---------------------------------------------------------- banners
  for (const b of s.banners) {
    const k = b.t / b.dur;
    const sIn = Ease.outBack(Math.min(1, b.t / 0.28));
    const a = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
    ctx.save();
    ctx.translate(W / 2, b.y);
    ctx.scale(sIn, sIn);
    ctx.rotate(Math.sin(b.t * 5) * 0.02);
    text(ctx, b.txt, 0, 0, { size: b.size, font: /[가-힣]/.test(b.txt) ? 'display' : 'num', color: b.color, stroke: COL.ink, sw: Math.max(6, b.size * 0.17), alpha: a, shadow: { dx: 0, dy: 5, color: 'rgba(74,42,26,0.45)' } });
    if (b.sub) text(ctx, b.sub, 0, b.size * 0.78, { size: b.size * 0.5, color: '#fff', stroke: COL.ink, sw: 6, alpha: a });
    ctx.restore();
  }

  if (s.tut.cur) tutorialPrompt(ctx, s, W, H);
  if (s.paused) pauseOverlay(ctx, s, W, H);
  if (s.game.debug) debugOverlay(ctx, s, cam);
}

function speedLines(ctx, s, W, H, amt = 1) {
  ctx.save();
  for (let i = 0; i < 12 * amt; i++) {
    const sp = 1900 + (i % 4) * 300;
    const x = W + 200 - ((s.t * sp + i * 397) % (W + 600));
    const y = 70 + ((i * 137) % 560);
    Assets.draw(ctx, 'fx', 'speedline', x, y, { scale: 0.6 + (i % 3) * 0.25, alpha: 0.4, add: true });
  }
  ctx.restore();
}

function tutorialPrompt(ctx, s, W, H) {
  const c = s.tut.cur;
  const key = c.kind === 'double' ? (c.stage === 2 ? 'double2' : 'double0') : c.kind;
  if (c.kind === 'double' && c.stage === 1) return;
  const [t1, t2] = TUT_TEXT[key];
  ctx.save();
  ctx.fillStyle = 'rgba(30,12,20,0.28)'; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  const pw = 640, ph = 120, px = W / 2 - pw / 2, py = 150;
  panel(ctx, px, py, pw, ph, { r: 28 });
  text(ctx, t1, W / 2, py + 44, { size: 44, color: COL.pink, stroke: COL.ink, sw: 8 });
  text(ctx, t2, W / 2, py + 92, { size: 21, font: 'bold', color: COL.ink, maxW: pw - 40 });
  const isSlide = c.kind === 'slide';
  const bx = isSlide ? W - 96 : 96, by = H - 92;
  const p = (s.t * 2.2) % 1;
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${1 - p})`; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(bx, by, 62 + p * 40, 0, TAU); ctx.stroke();
  ctx.restore();
  const bob = Math.sin(s.t * 8) * 10;
  ctx.save();
  ctx.translate(bx, by - 110 + bob);
  ctx.fillStyle = '#ffe680'; ctx.strokeStyle = COL.ink; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-22, -30); ctx.lineTo(22, -30); ctx.lineTo(22, 0); ctx.lineTo(40, 0); ctx.lineTo(0, 38); ctx.lineTo(-40, 0); ctx.lineTo(-22, 0); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

function pauseOverlay(ctx, s, W, H) {
  ctx.save(); ctx.fillStyle = 'rgba(30,12,20,0.62)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  const pw = 440, ph = 470, px = W / 2 - pw / 2, py = H / 2 - 210;
  panel(ctx, px, py, pw, ph, { r: 32 });
  ribbon(ctx, W / 2, py + 6, 300, '일시 정지', 'purple', 30);
  text(ctx, `${fmt(s.score)}점  ·  LAND ${s.landNo}  ·  ${fmt(s.dist)}m`, W / 2, py + 64, { size: 19, font: 'bold', color: COL.ink2 });
  s.pauseUI.draw(ctx);
  text(ctx, '배경음', W / 2 - 80, H / 2 + 246, { size: 15, font: 'bold', color: COL.ink2 });
  text(ctx, '효과음', W / 2 + 80, H / 2 + 246, { size: 15, font: 'bold', color: COL.ink2 });
}

function debugOverlay(ctx, s, cam) {
  const r = s.runner;
  ctx.save();
  ctx.lineWidth = 2;
  const hb = r.hitbox();
  ctx.strokeStyle = '#00ff88'; ctx.strokeRect(hb.x - cam, hb.y, hb.w, hb.h);
  ctx.strokeStyle = '#ff3355';
  for (const o of s.world.obs) if (!o.smashed && o.hit.w) ctx.strokeRect(o.hit.x - cam, Math.max(-5, o.hit.y), o.hit.w, o.hit.h - Math.max(0, -5 - o.hit.y));
  ctx.strokeStyle = 'rgba(80,160,255,0.7)';
  for (const p of s.world.picks) if (!p.taken) { ctx.beginPath(); ctx.arc(p.x - cam, p.y, p.r, 0, TAU); ctx.stroke(); }
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(8, s.H - 150, 420, 140);
  ctx.fillStyle = '#fff'; ctx.font = '14px monospace'; ctx.textAlign = 'left';
  const lines = [
    `fps ${s.game.fps.toFixed(0)}  state ${s.state}  mode ${r.mode}`,
    `speed ${s.curV.toFixed(0)}  land ${s.landIdx} lap ${s.lap}  t ${s.gen.landClock.toFixed(1)}`,
    `x ${r.x.toFixed(0)} y ${r.y.toFixed(0)} vy ${r.vy.toFixed(0)} g ${r.grounded} j ${r.jumps}`,
    `energy ${s.energy.toFixed(1)}/${s.maxEnergy}  drain ${s.drain().toFixed(2)}/s`,
    `picks ${s.world.picks.length} obs ${s.world.obs.length} ground ${s.world.ground.length} fx ${s.fx.list.length}`,
    `keys: G M D C V B items, L letter, E energy, Q skill, N next land, O die`,
  ];
  lines.forEach((ln, i) => ctx.fillText(ln, 16, s.H - 128 + i * 20));
  ctx.restore();
  void rrPath; void rgba; void clamp; void LANDS; void GY; void ribbon;
}
