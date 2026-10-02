// =============================================================================
//  Dessert Dash — global tuning constants (logical units: 720 px tall view)
// =============================================================================
export const CFG = {
  VERSION: '1.0.0',
  SAVE_KEY: 'dessert-dash-save-v1',

  // view
  VIEW_H: 720,
  VIEW_W_MIN: 1100,
  VIEW_W_MAX: 1600,

  // world
  GROUND_Y: 600,          // walking surface
  OVERHEAD_Y: 518,        // bottom of hanging obstacles
  PLAYER_SX: 290,         // runner screen x (feet)
  DEATH_Y: 900,           // below this you fell into a pit

  // runner physics (px, s)
  GRAVITY: 3200,
  JUMP_V: 1150,
  DJUMP_V: 1050,
  FAST_FALL: 1.85,        // gravity multiplier while holding slide in the air
  MAX_FALL: 1900,
  COYOTE: 0.09,
  JUMP_BUFFER: 0.13,
  SPRING_V: 1750,

  // hitboxes (relative to feet centre)
  HIT_W: 46, HIT_H: 92,
  SLIDE_W: 72, SLIDE_H: 44,
  TUCK_H: 78,

  INVULN_HIT: 1.25,

  // pacing
  LAND_TIME: 46,                        // seconds per land
  LAND_SPEEDS: [470, 505, 540, 575, 610],
  LAP_SPEED: 45,
  MAX_SPEED: 760,

  // collectibles
  JELLY_Y: 558,           // centre height of ground jelly lines
  SLIDE_JELLY_Y: 576,
  JELLY_GAP: 42,
  ARC_LIFT: 44,           // jelly arcs float this much above the feet path
  MAGNET_R: 300,

  // energy
  DRAIN_BASE: 1.3,
  DRAIN_LAND: 0.3,
  DRAIN_LAP: 0.35,
  HIT_DAMAGE: 16,
  HIT_DAMAGE_LAND: 2,
  MILK_S: 16,
  MILK_L: 35,
  LOW_ENERGY: 0.22,

  // schedules (seconds of running between specials)
  MILK_EVERY: 11,
  MILK_EVERY_LAND: 1.2,
  BIGMILK_EVERY: 40,
  LETTER_EVERY: 6.2,
  ITEM_EVERY: 10.5,

  // power-up durations (s, before upgrades)
  DUR: { magnet: 6.5, giant: 5.5, dash: 4.2, coins: 6.0, shield: 12 },
  GIANT_SCALE: 2.3,
  DASH_MULT: 1.75,

  // bonus stage
  RUSH_TIME: 8.5,
  RUSH_SPEED: 640,

  // scoring
  SCORE: { jelly: 30, jelly_pink: 60, jelly_star: 150, jelly_choco: 120, jelly_big: 800, jelly_rainbow: 2000, jelly_giant: 8000, smash: 300 },
  COIN: { s: 1, g: 5, b: 20 },
  COMBO_MAX_BONUS: 0.5,   // +50 % at combo cap
  COMBO_CAP: 300,
};

export const LAND_IDS = ['meadow', 'canyon', 'cavern', 'glacier', 'castle'];
