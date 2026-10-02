// =============================================================================
//  Game content: runners, pets, lands, power-ups, lab upgrades, boosts, missions
//  (all original). Text is Korean.
// =============================================================================
import { fmt } from '../engine/util.js';

const lvv = (base, per) => (lv) => base + per * (lv - 1);
const s1 = (v) => (Math.round(v * 10) / 10).toString();

export const MAX_CHAR_LV = 10;
export const CHAR_LV_COST = [0, 200, 350, 550, 800, 1100, 1450, 1850, 2300, 2800];

export const CHARS = [
  {
    id: 'chip', name: '칩', kind: '초코칩 쿠키', price: 0, energy: 100,
    desc: '용감하고 씩씩한 초코칩 쿠키. 바람에 휘날리는 빨간 목도리가 자랑이에요.',
    skill: { name: '초코 소나기', cd: lvv(16, -0.5), dur: lvv(4, 0.2),
      text: (lv, S) => `${s1(S.cd(lv))}초마다 ${s1(S.dur(lv))}초 동안 길 위로 초코 젤리가 쏟아져요.` },
  },
  {
    id: 'maca', name: '마카', kind: '딸기 마카롱', price: 1500, energy: 95,
    desc: '달콤한 딸기 크림을 품은 마카롱. 반짝이는 걸 정말 좋아해요.',
    skill: { name: '스윗 블룸', cd: lvv(18, -0.5), dur: lvv(5, 0.25),
      text: (lv, S) => `${s1(S.cd(lv))}초마다 ${s1(S.dur(lv))}초 동안 앞의 젤리가 커다란 별 젤리로 피어나요.` },
  },
  {
    id: 'pudding', name: '푸딩', kind: '커스터드 푸딩', price: 2500, energy: 112,
    desc: '말랑말랑 탱글한 푸딩. 카라멜 시럽으로 친구들을 돌봐줘요.',
    skill: { name: '카라멜 힐', cd: lvv(15, -0.4), heal: lvv(10, 1.5),
      text: (lv, S) => `${s1(S.cd(lv))}초마다 에너지를 ${s1(S.heal(lv))} 회복해요. 체력이 높은 편이에요.` },
  },
  {
    id: 'donut', name: '도넛', kind: '스프링클 도넛', price: 4000, energy: 100,
    desc: '운동을 좋아하는 도넛. 바퀴처럼 굴러가면 아무도 못 말려요!',
    skill: { name: '링 롤', cd: lvv(17, -0.5), dur: lvv(3.5, 0.2),
      text: (lv, S) => `${s1(S.cd(lv))}초마다 ${s1(S.dur(lv))}초 동안 굴러가며 무적 상태로 장애물을 부숴요.` },
  },
  {
    id: 'marsh', name: '마시', kind: '마시멜로', price: 5500, energy: 96,
    desc: '폭신폭신 구름 같은 마시멜로. 몸을 부풀려 하늘을 둥실 떠다녀요.',
    skill: { name: '퐁신 플로트', cd: lvv(19, -0.5), dur: lvv(4.5, 0.25),
      text: (lv, S) => `${s1(S.cd(lv))}초마다 ${s1(S.dur(lv))}초 동안 하늘 높이 떠올라 젤리 길을 날아요.` },
  },
  {
    id: 'cupcake', name: '컵케', kind: '체리 컵케이크', price: 7000, energy: 95,
    desc: '행운을 부르는 컵케이크. 스프링클이 떨어지는 곳엔 코인이 가득!',
    skill: { name: '럭키 스프링클', cd: lvv(16, -0.5), dur: lvv(4.5, 0.25),
      text: (lv, S) => `${s1(S.cd(lv))}초마다 ${s1(S.dur(lv))}초 동안 젤리가 코인으로 바뀌고 자석 효과가 생겨요.` },
  },
  {
    id: 'cotton', name: '솜이', kind: '솜사탕', price: 9000, energy: 92,
    desc: '꿈결처럼 포근한 솜사탕. 넘어진 친구를 구름으로 받아줘요.',
    skill: { name: '구름 쿠션', cd: lvv(22, -0.6), revive: lvv(0.4, 0.04),
      text: (lv, S) => `한 판에 한 번, 쓰러지면 에너지 ${Math.round(S.revive(lv) * 100)}%로 부활해요. ${s1(S.cd(lv))}초마다 버블 실드를 만들어요.` },
  },
];
export const CHAR = Object.fromEntries(CHARS.map((c) => [c.id, c]));
export function charLevelBonus(lv) { return 0.03 * (lv - 1); } // jelly score bonus

export const PETS = [
  { id: 'twinkle', name: '반짝이', price: 600, cd: 9, desc: '작은 별 요정. 9초마다 별 젤리를 줄지어 뿌려줘요.' },
  { id: 'buzzy', name: '붕붕', price: 1500, cd: 16, desc: '꿀벌 배달부. 16초마다 우유를 배달해 줘요.' },
  { id: 'puff', name: '몽실', price: 2000, cd: 12, desc: '자석 구름. 12초마다 3초 동안 젤리를 끌어당겨요.' },
  { id: 'oink', name: '꿀꿀', price: 2500, cd: 9, desc: '날개 달린 저금통. 9초마다 금화를 떨어뜨려요.' },
  { id: 'pop', name: '팡팡', price: 3500, cd: 12, desc: '폭죽 사탕. 12초마다 앞에 있는 장애물을 펑! 터뜨려요.' },
];
export const PET = Object.fromEntries(PETS.map((p) => [p.id, p]));

export const LANDS = [
  { id: 'meadow', name: '슈가 메도우', bgm: 'bgm_land1', specials: [] },
  { id: 'canyon', name: '캐러멜 캐니언', bgm: 'bgm_land2', specials: [] },
  { id: 'cavern', name: '코코아 동굴', bgm: 'bgm_land3', specials: ['fall'] },
  { id: 'glacier', name: '셔벗 빙하', bgm: 'bgm_land4', specials: ['fall', 'pop'] },
  { id: 'castle', name: '별사탕 성', bgm: 'bgm_land5', specials: ['fall', 'pop'] },
];

export const POWERUPS = {
  magnet: { name: '자석!', sprite: 'pw_magnet', color: '#ff5a6a', weight: 30 },
  giant: { name: '거대화!', sprite: 'pw_giant', color: '#ffa53a', weight: 18 },
  dash: { name: '로켓 대시!', sprite: 'pw_dash', color: '#4fb6ff', weight: 18 },
  coins: { name: '코인 러시!', sprite: 'pw_coins', color: '#ffd23f', weight: 14 },
  stars: { name: '별빛 변환!', sprite: 'pw_stars', color: '#a77bff', weight: 12 },
  shield: { name: '버블 실드!', sprite: 'pw_shield', color: '#4fdcb9', weight: 8 },
};

export const LAB = [
  { id: 'jelly', name: '젤리 연구', icon: 'jelly', max: 10, base: 150, mul: 1.5, desc: '젤리 점수가 올라가요.', val: (lv) => `+${lv * 7}%` },
  { id: 'energy', name: '튼튼한 체력', icon: 'heart', max: 8, base: 200, mul: 1.55, desc: '최대 에너지가 늘어나요.', val: (lv) => `+${lv * 6}` },
  { id: 'milk', name: '우유 영양', icon: 'milk', max: 6, base: 180, mul: 1.6, desc: '우유를 마시면 더 많이 회복해요.', val: (lv) => `+${lv * 10}%` },
  { id: 'item', name: '아이템 지속', icon: 'clock', max: 8, base: 160, mul: 1.5, desc: '자석·거대화·대시 등이 더 오래가요.', val: (lv) => `+${lv * 8}%` },
  { id: 'rush', name: '슈가 러시 연장', icon: 'star', max: 6, base: 250, mul: 1.6, desc: '보너스 스테이지가 더 길어져요.', val: (lv) => `+${(lv * 0.8).toFixed(1)}초` },
  { id: 'coin', name: '코인 행운', icon: 'coin', max: 6, base: 220, mul: 1.6, desc: '코인을 더 많이 얻어요.', val: (lv) => `+${lv * 8}%` },
  { id: 'spurt', name: '라스트 스퍼트', icon: 'rocket', max: 5, base: 400, mul: 1.7, desc: '에너지가 바닥나도 잠깐 무적으로 질주해요.', val: (lv) => (lv ? `${(1.5 + lv * 0.5).toFixed(1)}초` : '없음') },
];
export const LAB_ID = Object.fromEntries(LAB.map((u) => [u.id, u]));
export function labCost(u, lv) { return Math.round((u.base * Math.pow(u.mul, lv)) / 10) * 10; }

export const BOOSTS = [
  { id: 'dash', name: '스타트 대시', price: 300, icon: 'rocket', desc: '출발하자마자 5초 동안 로켓 대시!' },
  { id: 'energy', name: '에너지 +30', price: 250, icon: 'milk', desc: '최대 에너지 +30으로 출발해요.' },
  { id: 'revive', name: '부활', price: 600, icon: 'heart', desc: '쓰러져도 한 번 다시 일어나요.' },
  { id: 'letters', name: '럭키 레터', price: 200, icon: 'star', desc: 'S·U·G 글자를 모은 채로 시작해요.' },
  { id: 'magnet', name: '자석 스타트', price: 150, icon: 'items:pw_magnet', desc: '처음 12초 동안 자석 효과가 있어요.' },
];

export const MISSION_TEMPLATES = [
  { id: 'jelly_run', mode: 'run', stat: 'jellies', tiers: [250, 500, 900, 1400, 2200], text: (n) => `한 판에 젤리 ${fmt(n)}개 먹기` },
  { id: 'score_run', mode: 'run', stat: 'score', tiers: [20000, 60000, 150000, 300000, 600000], text: (n) => `한 판에 ${fmt(n)}점 달성하기` },
  { id: 'coins_total', mode: 'total', stat: 'coins', tiers: [300, 800, 1600, 3000, 5000], text: (n) => `코인 ${fmt(n)}개 모으기` },
  { id: 'land_run', mode: 'run', stat: 'land', tiers: [2, 3, 4, 5, 6], text: (n) => (n <= 5 ? `${n}번째 랜드까지 달리기` : '모든 랜드 돌파하기') },
  { id: 'jumps_total', mode: 'total', stat: 'jumps', tiers: [150, 400, 900, 1600], text: (n) => `점프 ${fmt(n)}번 하기` },
  { id: 'djump_total', mode: 'total', stat: 'djumps', tiers: [40, 120, 300, 600], text: (n) => `더블 점프 ${fmt(n)}번 하기` },
  { id: 'slide_total', mode: 'total', stat: 'slideTime', tiers: [20, 60, 150, 300], text: (n) => `슬라이드로 ${n}초 미끄러지기` },
  { id: 'smash_total', mode: 'total', stat: 'smash', tiers: [10, 30, 80, 160], text: (n) => `장애물 ${n}개 부수기` },
  { id: 'rush_total', mode: 'total', stat: 'rush', tiers: [1, 3, 8, 15], text: (n) => `슈가 러시 ${n}번 발동하기` },
  { id: 'milk_run', mode: 'run', stat: 'milk', tiers: [5, 9, 15, 22], text: (n) => `한 판에 우유 ${n}개 마시기` },
  { id: 'items_run', mode: 'run', stat: 'items', tiers: [4, 8, 14, 20], text: (n) => `한 판에 아이템 ${n}개 먹기` },
  { id: 'combo_run', mode: 'run', stat: 'maxCombo', tiers: [100, 250, 500, 800, 1200], text: (n) => `한 판에 ${fmt(n)} 콤보 달성하기` },
  { id: 'dist_run', mode: 'run', stat: 'dist', tiers: [800, 2000, 4000, 7000, 10000], text: (n) => `한 판에 ${fmt(n)}m 달리기` },
  { id: 'nohit_run', mode: 'run', stat: 'cleanLand', tiers: [1, 2, 3], text: (n) => `부딪히지 않고 랜드 ${n}개 통과하기` },
  { id: 'relay_run', mode: 'run', stat: 'relay', tiers: [1], text: () => '릴레이로 이어 달리기' },
  { id: 'skill_total', mode: 'total', stat: 'skills', tiers: [10, 30, 70], text: (n) => `스킬 ${n}번 사용하기` },
];
export const MISSION_REWARD = [150, 260, 420, 650, 950];

export function xpNeed(level) { return 100 + 60 * (level - 1); }
export function levelReward(level) { return 100 + 50 * level; }

export const TIPS = [
  '화면 왼쪽을 누르면 점프, 오른쪽을 꾹 누르면 슬라이드!',
  '공중에서 한 번 더 누르면 더블 점프를 할 수 있어요.',
  '공중에서 슬라이드를 누르면 빠르게 내려와요.',
  '우유를 마시면 에너지가 회복돼요. 에너지가 0이 되면 끝!',
  'S·U·G·A·R·R·U·S·H 글자를 모두 모으면 슈가 러시 보너스!',
  '릴레이 캐릭터를 정하면 쓰러져도 친구가 이어 달려요.',
  '연구소에서 업그레이드하면 더 멀리, 더 높은 점수로!',
  '거대화나 로켓 대시 중에는 장애물을 부술 수 있어요.',
  '젤리를 끊김 없이 먹으면 콤보 보너스가 쌓여요.',
  '스프링을 밟으면 하늘 높이 튀어 올라요.',
];
