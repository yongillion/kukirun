// =============================================================================
//  Display helpers for phones & tablets: fullscreen (+ landscape lock), the
//  "install as app" prompt, screen wake lock and a little platform sniffing.
//
//  mode tells a fullscreen button what it can do in this browser:
//    'toggle'   Fullscreen API works (Android, iPad, desktop)
//    'help'     iPhone Safari: no Fullscreen API -> explain "홈 화면에 추가"
//    'external' KakaoTalk in-app browser -> offer to reopen in a real browser
//    null       already an installed app window, or embedded where it can't work
// =============================================================================
const doc = document, root = document.documentElement;
const mq = (q) => { try { return matchMedia(q).matches; } catch (e) { return false; } };
const UA = navigator.userAgent || '';

export const Display = {
  ios: /iPad|iPhone|iPod/.test(UA) || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1),
  android: /Android/i.test(UA),
  kakao: /KAKAOTALK/i.test(UA),
  touch: mq('(pointer: coarse)') || ((navigator.maxTouchPoints || 0) > 0 && mq('(hover: none)')),
  embedded: (() => { try { return window.self !== window.top; } catch (e) { return true; } })(),

  installEvt: null,
  autoArmed: false,
  pending: null,
  lastPointer: 'mouse',
  restoreOnReturn: false,
  fsExitAt: -1e9,
  wake: null,
  wakeWanted: false,
  listeners: new Set(),

  /** Running as an installed app window ("display-mode: fullscreen" also matches Fullscreen-API fullscreen, so exclude that). */
  get standalone() { return mq('(display-mode: standalone)') || navigator.standalone === true || (mq('(display-mode: fullscreen)') && !this.isFullscreen); },
  get canFullscreen() { return !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled) && !!(root.requestFullscreen || root.webkitRequestFullscreen); },
  get isFullscreen() { return !!(doc.fullscreenElement || doc.webkitFullscreenElement); },
  get mode() {
    if (this.standalone) return null;
    if (this.kakao && (this.ios || !this.canFullscreen)) return 'external';
    if (this.canFullscreen) return 'toggle';
    if (this.ios && !this.embedded) return 'help';
    return null;
  },
  get canInstall() { return !!this.installEvt && !this.standalone; },

  /** o.auto(): whether to go fullscreen on the first tap (touch devices only). */
  init(o = {}) {
    this.autoPref = o.auto || (() => true);
    this.autoArmed = this.touch && this.autoPref();
    const onFs = () => {
      if (!this.isFullscreen) this.fsExitAt = performance.now();
      this.emit('fs');
    };
    doc.addEventListener('fullscreenchange', onFs);
    doc.addEventListener('webkitfullscreenchange', onFs);
    // The first tap (and the first tap after coming back to the app, if we were
    // fullscreen when it went to the background) enters fullscreen. For touch the
    // request has to happen in touchend: pointerdown is not a user gesture, and
    // Safari does not accept pointerup either.
    const release = (e) => {
      if (e.type === 'pointerup' && e.pointerType === 'touch') return; // wait for its touchend
      if (this.pending) { this.pending(); return; }
      if (!this.autoArmed) return;
      this.autoArmed = false;
      if (this.mode === 'toggle' && !this.isFullscreen) this.enter();
    };
    window.addEventListener('pointerdown', (e) => { this.lastPointer = e.pointerType || 'mouse'; }, true);
    window.addEventListener('pointerup', release, true);
    window.addEventListener('touchend', release, true);
    doc.addEventListener('visibilitychange', () => {
      if (doc.hidden) {
        if (this.isFullscreen || performance.now() - this.fsExitAt < 1500) this.restoreOnReturn = true;
      } else {
        if (this.restoreOnReturn && this.touch && this.autoPref()) this.autoArmed = true;
        this.restoreOnReturn = false;
        if (this.wakeWanted) this.keepAwake(true);
      }
    });
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this.installEvt = e; this.emit('install'); });
    window.addEventListener('appinstalled', () => { this.installEvt = null; this.emit('install'); });
    try { matchMedia('(display-mode: standalone), (display-mode: fullscreen)').addEventListener('change', () => this.emit('mode')); } catch (e) { /* old browsers */ }
  },

  /** Enter fullscreen from a button / toggle handler: right away for mouse & keys, at touchend for touch. */
  enterSoon(cb) {
    const run = () => { if (this.pending !== run) return; this.pending = null; this.autoArmed = false; this.enter().then((ok) => { if (cb) cb(ok); }); };
    this.pending = run;
    if (this.lastPointer === 'touch') setTimeout(run, 700); // fallback if no touchend arrives
    else run();
  },

  async enter() {
    try {
      if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' });
      else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
      else return false;
    } catch (e) { return false; }
    this.lockLandscape();
    return true;
  },
  async exit() {
    this.autoArmed = false;
    this.restoreOnReturn = false;
    try {
      if (doc.exitFullscreen) { if (doc.fullscreenElement) await doc.exitFullscreen(); }
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    } catch (e) { /* already out */ }
  },
  toggle() { return this.isFullscreen ? this.exit() : this.enter(); },
  async lockLandscape() {
    try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (e) { /* only works fullscreen / installed */ }
  },

  /** Show the browser's own "install app" dialog (Chrome / Edge / Samsung Internet). */
  async install() {
    const e = this.installEvt;
    if (!e) return false;
    this.installEvt = null;
    let ok = false;
    try { await e.prompt(); const r = await e.userChoice; ok = !!r && r.outcome === 'accepted'; } catch (err) { ok = false; }
    this.emit('install');
    return ok;
  },

  /** Keep the screen on while running (released automatically when hidden). */
  async keepAwake(on) {
    this.wakeWanted = on;
    if (!navigator.wakeLock) return;
    if (on) {
      if (this.wake || doc.hidden) return;
      try {
        const w = await navigator.wakeLock.request('screen');
        if (!this.wakeWanted) { w.release().catch(() => {}); return; }
        this.wake = w;
        w.addEventListener('release', () => { if (this.wake === w) this.wake = null; });
      } catch (e) { this.wake = null; }
    } else if (this.wake) {
      const w = this.wake; this.wake = null;
      try { await w.release(); } catch (e) { /* ignore */ }
    }
  },

  /** Reopen the page outside the KakaoTalk in-app browser. */
  openExternal() {
    location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(location.href);
  },

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit(kind) { for (const fn of [...this.listeners]) { try { fn(kind); } catch (e) { console.error(e); } } },
};
