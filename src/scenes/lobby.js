// =============================================================================
//  Lobby: selected runner on stage, relay + pet, menus, play.
// =============================================================================
import { Scene, Modal } from '../engine/scene.js';
import { Assets } from '../engine/assets.js';
import { Button, text, counter, bar, COL, panel, rrPath, icon } from '../engine/ui.js';
import { fmt, TAU, Ease } from '../engine/util.js';
import { Save } from '../engine/storage.js';
import { Progress } from '../game/progress.js';
import { CHAR, CHARS, PET, PETS, TIPS, xpNeed } from '../data/content.js';
import { drawLobbyBg, drawChar, drawPet, pill } from './common.js';

export class LobbyScene extends Scene {
  enter() {
    Progress.ensureMissions();
    this.cheer = 0; this.hop = 0; this.hopV = 0;
    this.tipI = Math.floor(Math.random() * TIPS.length); this.tipT = 0;
    this.game.audio.playMusic('bgm_lobby', { fade: 0.8 });
    this.coinShown = Save.data.coins;
    this.build();
  }
  layout() { if (this.ui) this.build(); }
  get stageX() { const m = Assets.meta('bg_lobby'); return (m ? m.stage.x : 600) + (this.W - (m ? m.w : 1600)) / 2; }
  build() {
    const W = this.W, H = this.H, d = Save.data;
    this.ui.clear();
    const colX = W - 410;
    const bw = 182, bh = 92, gap = 16;
    const charBadge = CHARS.some((c) => !Progress.owned(c.id) && c.price <= d.coins) || CHARS.some((c) => Progress.owned(c.id) && Progress.charUpCost(c.id) != null && Progress.charUpCost(c.id) <= d.coins);
    const petBadge = PETS.some((p) => !Progress.ownsPet(p.id) && p.price <= d.coins);
    const items = [
      { label: '캐릭터', icon: 'char', color: 'orange', go: () => this.game.goScene('characters'), badge: charBadge },
      { label: '펫', icon: 'pet', color: 'blue', go: () => this.game.goScene('pets'), badge: petBadge },
      { label: '연구소', icon: 'lab', color: 'purple', go: () => this.game.goScene('lab'), badge: Progress.anyLabAffordable() },
      { label: '미션', icon: 'mission', color: 'mint', go: () => this.game.goScene('missions'), badge: Progress.claimable() || null },
    ];
    items.forEach((it, i) => {
      this.ui.add(new Button({ x: colX + (i % 2) * (bw + gap), y: 210 + Math.floor(i / 2) * (bh + gap), w: bw, h: bh, label: it.label, icon: it.icon, iconSize: 54, color: it.color, size: 28, badge: it.badge || null, onClick: it.go }));
    });
    this.playBtn = this.ui.add(new Button({ x: colX, y: 440, w: bw * 2 + gap, h: 128, label: '달리기!', icon: 'play', iconSize: 76, color: 'green', size: 48, key: ['confirm', 'Space'], sound: 'ui_select', onClick: () => this.game.goScene('prerun') }));
    this.ui.add(new Button({ x: W - 50, y: 50, w: 58, round: true, icon: 'gear', iconSize: 40, color: 'cream', onClick: () => this.game.goScene('settings') }));
  }
  update(dt) {
    super.update(dt);
    if (this.cheer > 0) this.cheer -= dt;
    if (this.hop < 0 || this.hopV !== 0) { this.hopV += 2600 * dt; this.hop += this.hopV * dt; if (this.hop >= 0) { this.hop = 0; this.hopV = 0; } }
    this.tipT += dt; if (this.tipT > 6) { this.tipT = 0; this.tipI = (this.tipI + 1) % TIPS.length; }
    const c = Save.data.coins; this.coinShown += (c - this.coinShown) * Math.min(1, dt * 10); if (Math.abs(c - this.coinShown) < 1) this.coinShown = c;
  }
  pointer(type, p) {
    if (this.ui.pointer(type, p)) return true;
    if (type === 'down') {
      const sx = this.stageX;
      if (Math.abs(p.x - sx) < 110 && p.y > 330 && p.y < 620) { this.cheer = 1.4; this.hopV = -800; this.hop = -1; this.game.audio.play('ui_select'); }
      else if (p.x >= 22 && p.x <= 322 && p.y >= 96 && p.y <= 142) { this.game.audio.play('ui_click'); this.showRecords(); }
    }
    return false;
  }
  showRecords() {
    const recs = Save.data.records || [];
    this.game.scenes.modal(new Modal(this.game, {
      title: '내 기록 TOP 5', color: 'yellow', width: 640, height: 470,
      buttons: [{ label: '닫기', color: 'pink', key: ['confirm', 'back', 'Space'] }],
      draw: (ctx, b) => {
        if (!recs.length) { text(ctx, '아직 기록이 없어요. 달려볼까요?', b.x + b.w / 2, b.y + 180, { size: 24, font: 'bold', color: COL.ink }); return; }
        recs.forEach((r, i) => {
          const y = b.y + 92 + i * 56;
          text(ctx, `${i + 1}`, b.x + 60, y, { size: 30, font: 'num', color: i === 0 ? COL.orangeD : COL.ink2 });
          Assets.draw(ctx, 'portrait_' + r.char, 0, b.x + 118, y, { scale: 0.42 });
          text(ctx, fmt(r.score), b.x + 160, y + 1, { size: 26, font: 'num', align: 'left', color: COL.ink });
          const dt = new Date(r.at);
          text(ctx, `LAND ${r.land} · ${fmt(r.dist)}m · ${dt.getMonth() + 1}/${dt.getDate()}`, b.x + b.w - 40, y + 1, { size: 17, font: 'bold', align: 'right', color: COL.ink2 });
        });
      },
    }));
  }
  render(ctx) {
    const W = this.W, H = this.H, d = Save.data, t = this.t;
    drawLobbyBg(ctx, W, H, t, 0);
    const sx = this.stageX;
    // stage glow
    ctx.save();
    const g = ctx.createRadialGradient(sx, 600, 10, sx, 600, 190);
    g.addColorStop(0, 'rgba(255,250,220,0.55)'); g.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, 596, 190, 50, 0, 0, TAU); ctx.fill();
    ctx.restore();
    if (d.relay && Progress.owned(d.relay)) {
      drawChar(ctx, d.relay, 'idle', t + 0.5, sx - 168, 590, 0.8);
      pill(ctx, sx - 168, 612, '릴레이', COL.blue, 14);
    }
    drawChar(ctx, d.sel, this.cheer > 0 ? 'cheer' : 'idle', t, sx, 598 + this.hop, 1.32);
    if (d.pet && Progress.ownsPet(d.pet)) drawPet(ctx, d.pet, t, sx + 150, 420, 1.0);
    // name plate
    const c = CHAR[d.sel];
    const lv = Progress.charLv(d.sel);
    ctx.save();
    rrPath(ctx, sx - 150, 626, 300, 62, 22); ctx.fillStyle = 'rgba(74,42,26,0.72)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
    text(ctx, `${c.name}  Lv.${lv}`, sx, 646, { size: 25, color: '#fff', stroke: COL.ink, sw: 5 });
    text(ctx, `스킬 · ${c.skill.name}`, sx, 673, { size: 16, font: 'bold', color: '#ffe680' });

    // top-left level + xp
    ctx.save();
    ctx.fillStyle = COL.purple; ctx.beginPath(); ctx.arc(56, 52, 34, 0, TAU); ctx.fill();
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 4.5; ctx.stroke(); ctx.restore();
    text(ctx, 'Lv', 56, 36, { size: 14, font: 'num', color: '#fff' });
    text(ctx, d.level, 56, 60, { size: 30, font: 'num', color: '#fff', stroke: COL.ink, sw: 5 });
    bar(ctx, 100, 40, 220, 24, d.xp / xpNeed(d.level), { colors: ['#d6c2ff', '#9a6bff'] });
    text(ctx, `${d.xp} / ${xpNeed(d.level)} XP`, 210, 53, { size: 14, font: 'num', color: '#fff', stroke: COL.ink, sw: 3.5 });
    // best score
    ctx.save(); rrPath(ctx, 22, 96, 300, 46, 23); ctx.fillStyle = 'rgba(74,42,26,0.6)'; ctx.fill(); ctx.restore();
    icon(ctx, 'crown', 48, 119, 38);
    text(ctx, '최고 기록', 74, 119, { size: 17, align: 'left', color: '#ffe680', stroke: COL.ink, sw: 4 });
    text(ctx, fmt(d.best), 306, 120, { size: 22, font: 'num', align: 'right', color: '#fff', stroke: COL.ink, sw: 5 });
    // coins
    counter(ctx, W - 300, 50, 'coin', fmt(this.coinShown), { w: 200, h: 48 });
    // tip
    const tip = TIPS[this.tipI];
    const a = Math.min(1, this.tipT * 3, (6 - this.tipT) * 3);
    text(ctx, tip, W - 410 + 190, H - 34, { size: 17, font: 'bold', color: '#fff', stroke: 'rgba(74,42,26,0.85)', sw: 5, alpha: a, maxW: 400 });
    this.ui.draw(ctx);
    void panel; void Ease; void PET;
  }
}
