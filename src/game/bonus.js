// =============================================================================
//  SUGAR RUSH bonus stage: a sky world full of jelly formations. The runner
//  flies (hold jump to rise) over a bouncy cloud floor. No obstacles.
// =============================================================================
import { CFG } from '../config.js';
import { World } from './world.js';
import { makeRand } from '../engine/util.js';

const GY = CFG.GROUND_Y;

export class RushStage {
  constructor(run, dur) {
    this.run = run;
    this.world = new World();
    this.world.addGround(-2000, 1e9, 'rush');
    this.dur = dur; this.left = dur;
    this.genX = 520;
    this.r = makeRand();
    this.n = 0;
  }
  fill(toX) { while (this.genX < toX) this.wave(); }

  wave() {
    const w = this.world, r = this.r, x0 = this.genX;
    const kinds = ['rows', 'sine', 'stairs', 'bigs', 'coins', 'heart', 'double_sine', 'rainbow'];
    const k = this.n === 0 ? 'sine' : r.pick(kinds);
    this.n++;
    const jy = (y) => Math.max(170, Math.min(GY - 40, y));
    let len = 0;
    switch (k) {
      case 'rows': {
        len = 560;
        for (const y of [250, 370, 490]) for (let x = 0; x < len; x += 40) w.addPick(x % 200 === 0 ? 'jelly_star' : 'jelly_pink', x0 + x, y);
        break;
      }
      case 'sine': {
        len = 900;
        for (let x = 0; x < len; x += 36) w.addPick(x % 180 === 0 ? 'jelly_big' : 'jelly_star', x0 + x, jy(370 + Math.sin(x / 120) * 170));
        break;
      }
      case 'double_sine': {
        len = 840;
        for (let x = 0; x < len; x += 38) {
          w.addPick('jelly_pink', x0 + x, jy(370 + Math.sin(x / 110) * 150));
          w.addPick('jelly_star', x0 + x, jy(370 - Math.sin(x / 110) * 150));
        }
        break;
      }
      case 'stairs': {
        len = 800;
        for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) w.addPick('jelly_star', x0 + i * 160 + j * 38, jy(500 - i * 70));
        w.addPick('jelly_rainbow', x0 + 780, 200);
        break;
      }
      case 'bigs': {
        len = 760;
        for (let i = 0; i < 6; i++) w.addPick('jelly_big', x0 + i * 130, i % 2 ? 260 : 460);
        for (let x = 0; x < len; x += 44) w.addPick('jelly_pink', x0 + x, 360);
        break;
      }
      case 'coins': {
        len = 520;
        for (let i = 0; i < 12; i++) for (let j = 0; j < 4; j++) w.addPick((i + j) % 5 === 0 ? 'coin_b' : 'coin_g', x0 + i * 44, 300 + j * 50);
        break;
      }
      case 'heart': {
        const rows = ['.##...##.', '####.####', '#########', '.#######.', '..#####..', '...###...', '....#....'];
        len = 9 * 34 + 120;
        rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') w.addPick('jelly_pink', x0 + 60 + i * 34, 230 + j * 34); });
        w.addPick('jelly_giant', x0 + len + 90, 380);
        len += 260;
        break;
      }
      case 'rainbow': {
        len = 700;
        for (let x = 0; x < len; x += 40) w.addPick('jelly_star', x0 + x, jy(520 - Math.sin((x / len) * Math.PI) * 300));
        w.addPick('jelly_rainbow', x0 + len / 2, 170);
        break;
      }
    }
    this.genX = x0 + len + 160;
  }
}
