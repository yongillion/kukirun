// =============================================================================
//  Shared helpers for menu scenes
// =============================================================================
import { Assets } from '../engine/assets.js';
import { Scene, Modal } from '../engine/scene.js';
import { Display } from '../engine/display.js';
import { Button, text, ribbon, counter, COL, rrPath, icon } from '../engine/ui.js';
import { fmt, TAU } from '../engine/util.js';
import { Save } from '../engine/storage.js';

export function drawLobbyBg(ctx, W, H, t, dim = 0) {
  const m = Assets.meta('bg_lobby');
  if (m) {
    const ox = (W - m.w) / 2;
    Assets.draw(ctx, 'bg_lobby', 0, ox, 0);
  } else { ctx.fillStyle = '#ffd9a8'; ctx.fillRect(0, 0, W, H); }
  if (dim > 0) {
    ctx.save();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(255,244,228,${dim})`); g.addColorStop(1, `rgba(255,224,200,${dim})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // soft sprinkles
    ctx.globalAlpha = 0.18 * dim;
    const cols = ['#ff8fb8', '#ffd23f', '#7fd8c4', '#a77bff', '#ffa53a'];
    for (let i = 0; i < 46; i++) {
      const x = (i * 211 + t * 10) % (W + 40) - 20, y = (i * 97) % H;
      ctx.save(); ctx.translate(x, y); ctx.rotate(i * 1.3);
      ctx.fillStyle = cols[i % cols.length]; rrPath(ctx, -9, -3.5, 18, 7, 3.5); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }
}

export function drawChar(ctx, id, anim, t, x, y, scale = 1, o = {}) {
  const sheet = 'char_' + id;
  const A = Assets.meta(sheet)?.anims;
  if (!A) return;
  const a = A[anim] || A.idle;
  const fr = a.frames;
  const i = Math.floor(t * (a.fps || 8));
  const f = fr.length === 1 ? fr[0] : a.loop === false ? fr[Math.min(fr.length - 1, i)] : fr[i % fr.length];
  if (o.shadow !== false) {
    ctx.save(); ctx.globalAlpha = 0.25 * (o.alpha ?? 1); ctx.fillStyle = '#3a1a10';
    ctx.beginPath(); ctx.ellipse(x, y + 2, 50 * scale, 11 * scale, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  Assets.draw(ctx, sheet, f, x, y, { scale, alpha: o.alpha ?? 1, tint: o.tint });
}
export function drawPet(ctx, id, t, x, y, scale = 1, o = {}) {
  const sheet = 'pet_' + id;
  const A = Assets.meta(sheet)?.anims;
  if (!A) return;
  const a = o.act ? A.act : A.fly;
  const f = a.frames[Math.floor(t * (a.fps || 8)) % a.frames.length];
  Assets.draw(ctx, sheet, f, x, y + Math.sin(t * 2.4) * 6, { scale, alpha: o.alpha ?? 1, tint: o.tint });
}

/** Base for menu screens: background, title ribbon, back button, coin pill. */
export class MenuScene extends Scene {
  constructor(game, title, color = 'pink') { super(game); this.title = title; this.color = color; this.coinShown = Save.data.coins; }
  chrome(onBack) {
    this.ui.add(new Button({ x: 52, y: 50, w: 62, round: true, icon: 'arrow_l', iconSize: 40, color: 'cream', sound: 'ui_back', key: ['back'], onClick: onBack || (() => this.game.goLobby()) }));
  }
  update(dt) {
    super.update(dt);
    const c = Save.data.coins;
    this.coinShown += (c - this.coinShown) * Math.min(1, dt * 10);
    if (Math.abs(c - this.coinShown) < 1) this.coinShown = c;
  }
  drawBg(ctx) { drawLobbyBg(ctx, this.W, this.H, this.t, 0.82); }
  drawChrome(ctx) {
    ribbon(ctx, this.W / 2, 50, Math.min(420, this.W * 0.3), this.title, this.color, 32);
    counter(ctx, this.W - 210, 50, 'coin', fmt(this.coinShown), { w: 180, h: 46 });
  }
}

export function stars(ctx, x, y, n, max, size = 22, gap = 24) {
  for (let i = 0; i < max; i++) icon(ctx, 'star', x + i * gap, y, size, i < n ? 1 : 0.25);
}
export function pill(ctx, x, y, label, color = COL.pink, size = 16) {
  ctx.save();
  ctx.font = `900 ${size}px "DDDisplay", sans-serif`;
  const w = ctx.measureText(label).width + 22;
  rrPath(ctx, x - w / 2, y - size * 0.8, w, size * 1.6, size * 0.8);
  ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 3; ctx.stroke();
  ctx.restore();
  text(ctx, label, x, y + 1, { size, color: '#fff', stroke: COL.ink, sw: 4 });
}

// ---------------------------------------------------------------------------
// Fullscreen / home-screen helpers (shared by title, lobby, settings, pause)
// ---------------------------------------------------------------------------
/** Round fullscreen button suited to this browser, or null when it can't help here. */
export function fsButton(game, x, y, o = {}) {
  if (!Display.mode) return null;
  const on = Display.isFullscreen;
  return new Button({ x, y, w: o.w ?? 58, round: true, icon: on ? 'exitfs' : 'fullscreen', iconSize: o.iconSize ?? 36, color: o.color ?? 'cream', sound: 'ui_click',
    onClick: () => fullscreenAction(game) });
}

export function fullscreenAction(game) {
  const mode = Display.mode;
  if (mode === 'toggle') {
    if (Display.isFullscreen) Display.exit();
    else Display.enterSoon((ok) => {
      if (ok) return;
      if (Display.kakao) showExternalHelp(game);
      else game.toast('이 브라우저에서는 전체 화면을 쓸 수 없어요', { icon: 'info' });
    });
  } else if (mode === 'help') showHomeScreenHelp(game);
  else if (mode === 'external') showExternalHelp(game);
}

function stepBadge(ctx, x, y, n) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, 17, 0, TAU);
  ctx.fillStyle = COL.pink; ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 3.5; ctx.stroke(); ctx.restore();
  text(ctx, String(n), x, y + 1, { size: 20, font: 'num', color: '#fff', stroke: COL.ink, sw: 4 });
}
function glyphDisc(ctx, x, y, name, color = COL.blue) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, 30, 0, TAU);
  ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = COL.ink; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
  icon(ctx, name, x, y, 40);
}

/** iPhone / iPad Safari: fullscreen means "Add to Home Screen" and launching from the icon. */
export function showHomeScreenHelp(game) {
  game.scenes.modal(new Modal(game, {
    title: '전체 화면으로 하기', color: 'blue', width: 720, height: 480,
    buttons: [{ label: '알겠어요', color: 'green', key: ['confirm', 'back', 'Space'] }],
    draw: (ctx, b) => {
      text(ctx, '홈 화면에 추가한 뒤 아이콘으로 실행하면 전체 화면이 돼요', b.x + b.w / 2, b.y + 76, { size: 20, font: 'bold', color: COL.ink2, maxW: b.w - 60 });
      const steps = [
        ['share', 'Safari의 공유 버튼을 눌러요'],
        ['addhome', "'홈 화면에 추가'를 골라요"],
        [null, "홈 화면의 '디저트 대시'로 실행!"],
      ];
      steps.forEach(([ic, label], i) => {
        const y = b.y + 142 + i * 78;
        stepBadge(ctx, b.x + 64, y, i + 1);
        if (ic) glyphDisc(ctx, b.x + 128, y, ic);
        else Assets.draw(ctx, 'portrait_chip', 0, b.x + 128, y, { scale: 0.62 });
        text(ctx, label, b.x + 176, y + 1, { size: 25, align: 'left', color: COL.ink, maxW: b.w - 210 });
      });
      text(ctx, '휴대폰은 가로로 돌려서 플레이하세요', b.x + b.w / 2, b.y + b.h - 128, { size: 17, font: 'bold', color: COL.ink2 });
    },
  }));
}

/** KakaoTalk's in-app browser can't go fullscreen: offer to reopen in the real browser. */
export function showExternalHelp(game) {
  game.scenes.modal(new Modal(game, {
    title: '전체 화면으로 하기', color: 'yellow', width: 680, height: 360,
    message: '카카오톡 안에서는 전체 화면을 쓸 수 없어요.\n브라우저로 열면 전체 화면으로 즐길 수 있어요!',
    buttons: [{ label: '닫기', color: 'grey', key: ['back'] }, { label: '브라우저로 열기', color: 'green', key: ['confirm'], onClick: () => Display.openExternal() }],
  }));
}

/** Chrome / Edge / Samsung Internet: the browser's own "install app" dialog. */
export function installApp(game) {
  Display.install().then((ok) => { if (ok) game.toast('홈 화면에 설치했어요! 아이콘으로 실행해 보세요', { icon: 'check', dur: 3 }); });
}
