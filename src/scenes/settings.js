// =============================================================================
//  Settings: volumes, feel options, tutorial, reset, help & credits.
// =============================================================================
import { Modal } from '../engine/scene.js';
import { Button, Slider, Toggle, text, panel, para, COL } from '../engine/ui.js';
import { Save } from '../engine/storage.js';
import { CFG } from '../config.js';
import { MenuScene } from './common.js';

export class SettingsScene extends MenuScene {
  constructor(game) { super(game, '설정', 'purple'); }
  enter() { this.build(); }
  layout() { this.build(); }
  build() {
    const W = this.W, st = Save.data.settings;
    this.ui.clear();
    this.chrome();
    const lw = Math.min(560, W * 0.46), lx = 40;
    this.left = { x: lx, y: 108, w: lw, h: 580 };
    const cx = lx + 200;
    const save = () => { Save.save(); this.game.applySettings(); };
    this.ui.add(new Slider({ x: cx, y: 168, w: lw - 290, value: st.music, color: 'pink', onChange: (v) => { st.music = v; save(); } }));
    this.ui.add(new Slider({ x: cx, y: 236, w: lw - 290, value: st.sfx, color: 'blue', onChange: (v) => { st.sfx = v; save(); this.game.audio.play('jelly', { rate: 1.3 }); } }));
    this.ui.add(new Toggle({ x: cx, y: 282, value: st.shake, onChange: (v) => { st.shake = v; save(); } }));
    this.ui.add(new Toggle({ x: cx, y: 346, value: st.vibrate, onChange: (v) => { st.vibrate = v; save(); } }));
    this.ui.add(new Toggle({ x: cx, y: 410, value: st.touch !== 'off', onChange: (v) => { st.touch = v ? 'auto' : 'off'; save(); } }));
    this.ui.add(new Toggle({ x: cx, y: 474, value: st.quality === 'high', onChange: (v) => { st.quality = v ? 'high' : 'normal'; save(); } }));
    const bw = (lw - 72) / 2;
    this.ui.add(new Button({ x: lx + 24, y: 560, w: bw, h: 76, label: '튜토리얼 다시', icon: 'info', color: 'blue', size: 21,
      onClick: () => { Save.data.tutorial = false; Save.save(); this.game.toast('다음 달리기에서 튜토리얼이 나와요!', { icon: 'info' }); } }));
    this.ui.add(new Button({ x: lx + 48 + bw, y: 560, w: bw, h: 76, label: '데이터 초기화', icon: 'retry', color: 'red', size: 21,
      onClick: () => this.game.scenes.modal(new Modal(this.game, {
        title: '데이터 초기화', color: 'red', height: 340,
        message: '코인, 캐릭터, 펫, 연구소, 미션 기록이\n모두 처음으로 돌아가요. 정말 할까요?',
        buttons: [{ label: '취소', color: 'grey', key: ['back'] }, { label: '초기화', color: 'red', onClick: () => { Save.reset(); this.game.applySettings(); this.game.toast('처음부터 다시 시작해요!', { icon: 'retry' }); this.game.goTitle(); } }],
      })) }));
  }
  render(ctx) {
    const W = this.W;
    this.drawBg(ctx);
    const L = this.left;
    panel(ctx, L.x, L.y, L.w, L.h, { r: 30 });
    const rows = [['배경음', 168], ['효과음', 236], ['화면 흔들림', 305], ['진동 (모바일)', 369], ['터치 버튼 표시', 433], ['고화질 그래픽', 497]];
    for (const [label, y] of rows) text(ctx, label, L.x + 36, y, { size: 22, align: 'left', color: COL.ink });
    const rx = L.x + L.w + 24, rw = W - rx - 40;
    panel(ctx, rx, 108, rw, 580, { r: 30, fill: '#fffaf3', fill2: '#efe4ff' });
    text(ctx, '조작 방법', rx + rw / 2, 146, { size: 28, color: COL.purpleD, stroke: '#fff', sw: 4 });
    const help = [
      '점프 · 화면 왼쪽 탭 / Space · ↑ · W',
      '더블 점프 · 공중에서 한 번 더',
      '슬라이드 · 화면 오른쪽 꾹 / ↓ · S · Shift',
      '빨리 내려오기 · 공중에서 슬라이드',
      '일시 정지 · Esc · P',
      '게임패드 · A 점프, B 슬라이드',
    ];
    help.forEach((h, i) => text(ctx, h, rx + 34, 196 + i * 38, { size: 19, font: 'bold', align: 'left', color: COL.ink, maxW: rw - 60 }));
    text(ctx, '게임 정보', rx + rw / 2, 448, { size: 24, color: COL.purpleD, stroke: '#fff', sw: 4 });
    para(ctx, `디저트 대시 v${CFG.VERSION} · 프로젝트 kukirun\n모든 캐릭터·그림·음악·효과음은 이 게임을 위해 새로 만든 오리지널 작품이에요.\n글꼴: Noto Sans CJK KR, Poppins (SIL Open Font License)`, rx + 34, 474, rw - 68, { size: 16, color: COL.ink2, lh: 25 });
    if (!Save.available) text(ctx, '※ 이 브라우저에서는 저장이 꺼져 있어요', rx + rw / 2, 660, { size: 16, font: 'bold', color: COL.redD });
    this.ui.draw(ctx);
    this.drawChrome(ctx);
  }
}
