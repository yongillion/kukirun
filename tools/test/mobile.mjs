#!/usr/bin/env node
// =============================================================================
//  Mobile / fullscreen smoke test (Playwright + Chromium, phone emulation).
//    node tools/test/mobile.mjs [outDir]
//  Serves the project under /kukirun/ (like GitHub Pages) and checks:
//  landscape + portrait (rotated) layouts and tap mapping, auto fullscreen on the
//  first tap, iPhone "add to home screen" help, safe-area insets, settings and
//  pause UI, manifest/installability, offline play through the service worker,
//  and that file:// still runs. Screenshots go to outDir (default: /tmp/dd-mobile).
// =============================================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { startServer } from '../serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = process.argv[2] || path.join(os.tmpdir(), 'dd-mobile');
fs.mkdirSync(OUT, { recursive: true });

async function loadPlaywright() {
  try { return await import('playwright'); } catch {}
  for (const g of ['/opt/npm-tools/node_modules/', path.join(ROOT, 'node_modules') + '/']) { try { return createRequire(g)('playwright'); } catch {} }
  throw new Error('playwright not found');
}

const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails.push(msg); };

// symlink so the game is served from a sub-path, like https://<user>.github.io/kukirun/
const web = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-web-'));
fs.symlinkSync(ROOT, path.join(web, 'kukirun'));
const server = await startServer(0, web);
const BASE = `http://127.0.0.1:${server.address().port}/kukirun/`;
const { chromium } = await loadPlaywright();
const browser = await chromium.launch();

async function phone(o) {
  const ctx = await browser.newContext({
    viewport: o.viewport, deviceScaleFactor: o.dpr ?? 2.6, isMobile: true, hasTouch: true, userAgent: o.ua || ANDROID_UA, locale: 'ko-KR',
    serviceWorkers: o.sw ? 'allow' : 'block',
  });
  if (o.init) await ctx.addInitScript(o.init);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/manifest|favicon/i.test(m.text())) errors.push(m.text()); });
  await page.goto(BASE + (o.query || 'index.html'));
  await page.waitForFunction(() => window.__DD_READY__ === true, null, { timeout: 60000 });
  return { ctx, page, errors };
}
const scene = (page) => page.evaluate(() => window.__DD_GAME__.scenes.cur.constructor.name);
const waitScene = (page, name) => page.waitForFunction((n) => window.__DD_GAME__.scenes.cur.constructor.name === n && window.__DD_GAME__.scenes.phase === 'idle', name, { timeout: 15000 });
/** client (CSS px) position of a logical game point, honouring the rotated frame */
const toClient = (page, lx, ly) => page.evaluate(([x, y]) => {
  const v = window.__DD_GAME__.view, r = v.canvas.getBoundingClientRect();
  const fx = v.ox + x * v.scale, fy = v.oy + y * v.scale;
  return v.rotated ? { x: r.right - fy, y: r.top + fx } : { x: r.left + fx, y: r.top + fy };
}, [lx, ly]);
const tapLogical = async (page, lx, ly) => { const p = await toClient(page, lx, ly); await page.touchscreen.tap(p.x, p.y); };
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name + '.png') });
const goToTitle = async (page) => { await waitScene(page, 'TitleScene'); await page.waitForTimeout(700); };

// ---------------------------------------------------------------- 1. Android landscape
{
  const { ctx, page, errors } = await phone({ viewport: { width: 915, height: 412 } });
  await goToTitle(page);
  const info = await page.evaluate(() => ({ coarse: matchMedia('(pointer: coarse)').matches, mode: window.__DD_GAME__ && null }));
  const st = await page.evaluate(() => { const v = window.__DD_GAME__.view; return { W: v.W, rot: v.rotated, scale: v.scale }; });
  ok(!st.rot, `landscape is not rotated (W=${st.W}, scale=${st.scale.toFixed(3)}, coarse=${info.coarse})`);
  const title = await page.evaluate(() => window.__DD_GAME__.scenes.cur.ui.items.map((b) => b.icon));
  ok(title.includes('fullscreen'), 'title shows a fullscreen button');
  await shot(page, '1_android_title');
  await page.touchscreen.tap(450, 300);
  await waitScene(page, 'LobbyScene');
  await page.waitForTimeout(400);
  const fsOn = await page.evaluate(() => !!document.fullscreenElement);
  ok(fsOn, 'first tap entered fullscreen (auto)');
  const icons = await page.evaluate(() => window.__DD_GAME__.scenes.cur.ui.items.map((b) => b.icon));
  ok(icons.includes(fsOn ? 'exitfs' : 'fullscreen'), `lobby fullscreen button reflects state (${icons.filter((i) => /fs|full/.test(i))})`);
  await shot(page, '1_android_lobby');
  // exit through our button, check it does not re-enter on the next tap
  const fsb = await page.evaluate(() => { const b = window.__DD_GAME__.scenes.cur.fsBtn; return { x: b.x, y: b.y }; });
  await tapLogical(page, fsb.x, fsb.y);
  await page.waitForTimeout(500);
  ok(!(await page.evaluate(() => !!document.fullscreenElement)), 'fullscreen button exits fullscreen');
  await page.touchscreen.tap(200, 380);
  await page.waitForTimeout(400);
  ok(!(await page.evaluate(() => !!document.fullscreenElement)), 'no auto re-enter after a deliberate exit');
  await tapLogical(page, fsb.x, fsb.y);
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => !!document.fullscreenElement), 'fullscreen button enters fullscreen again');
  // settings screen
  await page.evaluate(() => window.__DD_GAME__.goScene('settings'));
  await waitScene(page, 'SettingsScene');
  await page.waitForTimeout(300);
  await shot(page, '1_android_settings');
  // start a run, pause it, look at the pause menu
  await page.evaluate(() => window.__DD_GAME__.startRun({ char: 'chip' }));
  await waitScene(page, 'RunScene');
  await page.waitForTimeout(1500);
  const awake = await page.evaluate(() => 'wakeLock' in navigator);
  await page.evaluate(() => window.__DD_GAME__.scenes.cur.setPaused(true));
  await page.waitForTimeout(400);
  const pause = await page.evaluate(() => window.__DD_GAME__.scenes.cur.pauseUI.items.map((b) => b.icon || b.label));
  ok(pause.includes('exitfs') || pause.includes('fullscreen'), `pause menu has a fullscreen button (${pause.join(',')})`);
  await shot(page, '1_android_pause');
  // leaving fullscreen during a run pauses it
  await page.evaluate(() => window.__DD_GAME__.scenes.cur.setPaused(false));
  await page.waitForTimeout(300);
  await page.evaluate(() => document.exitFullscreen());
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.__DD_GAME__.scenes.cur.paused === true), 'exiting fullscreen mid-run pauses the run');
  ok(errors.length === 0, `no page errors (android landscape) ${errors.slice(0, 3).join(' | ')}`);
  console.log('      wakeLock API present:', awake);
  await ctx.close();
}

// ---------------------------------------------------------------- 2. Android portrait (rotated frame)
{
  const { ctx, page, errors } = await phone({ viewport: { width: 412, height: 915 }, init: () => { localStorage.setItem('dessert-dash-save-v1', JSON.stringify({ settings: { autoFS: false } })); } });
  await goToTitle(page);
  const st = await page.evaluate(() => { const v = window.__DD_GAME__.view; return { W: v.W, rot: v.rotated, scale: v.scale, tf: v.canvas.style.transform, cw: v.canvas.style.width, ch: v.canvas.style.height }; });
  ok(st.rot, `portrait renders the landscape frame turned 90deg (W=${st.W}, ${st.cw}x${st.ch}, ${st.tf})`);
  await shot(page, '2_portrait_title');
  await page.touchscreen.tap(200, 450);
  await waitScene(page, 'LobbyScene');
  ok(!(await page.evaluate(() => !!document.fullscreenElement)), 'autoFS=false: no fullscreen on first tap');
  await page.waitForTimeout(300);
  await shot(page, '2_portrait_lobby');
  // tap the play button through the rotated mapping
  const pb = await page.evaluate(() => { const b = window.__DD_GAME__.scenes.cur.playBtn; return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; });
  await tapLogical(page, pb.x, pb.y);
  await waitScene(page, 'PrerunScene');
  ok(true, 'rotated tap on "달리기!" opened the pre-run screen');
  await shot(page, '2_portrait_prerun');
  // rotate to landscape mid-run -> paused
  await page.evaluate(() => window.__DD_GAME__.startRun({ char: 'chip' }));
  await waitScene(page, 'RunScene');
  await page.waitForTimeout(1200);
  await shot(page, '2_portrait_run');
  await page.setViewportSize({ width: 915, height: 412 });
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({ rot: window.__DD_GAME__.view.rotated, paused: window.__DD_GAME__.scenes.cur.paused }));
  ok(!after.rot && after.paused, `turning the phone mid-run un-rotates and pauses (rot=${after.rot}, paused=${after.paused})`);
  ok(errors.length === 0, `no page errors (portrait) ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

// ---------------------------------------------------------------- 3. iPhone (no Fullscreen API) + notch insets
{
  const noFs = () => {
    Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => false, configurable: true });
    Object.defineProperty(Document.prototype, 'webkitFullscreenEnabled', { get: () => false, configurable: true });
  };
  const { ctx, page, errors } = await phone({ viewport: { width: 844, height: 390 }, dpr: 3, ua: IPHONE_UA, init: noFs, query: 'index.html?safe=47,47,0,21' });
  await goToTitle(page);
  const v = await page.evaluate(() => { const v = window.__DD_GAME__.view; return { ox: v.ox, oy: v.oy, W: v.W, scale: v.scale }; });
  ok(v.ox >= 47, `logical area kept inside the notch insets (ox=${v.ox}, W=${v.W})`);
  await page.touchscreen.tap(420, 300);
  await waitScene(page, 'LobbyScene');
  await page.waitForTimeout(300);
  ok(!(await page.evaluate(() => !!document.fullscreenElement)), 'iPhone: no fullscreen attempt');
  await shot(page, '3_iphone_lobby');
  const fsb = await page.evaluate(() => { const b = window.__DD_GAME__.scenes.cur.fsBtn; return b && { x: b.x, y: b.y, icon: b.icon }; });
  ok(!!fsb, 'iPhone: lobby still shows the fullscreen button (opens help)');
  if (fsb) {
    await tapLogical(page, fsb.x, fsb.y);
    await page.waitForTimeout(600);
    ok(await page.evaluate(() => window.__DD_GAME__.scenes.modals.length === 1), 'iPhone: button opens the "홈 화면에 추가" help');
    await shot(page, '3_iphone_help');
  }
  ok(errors.length === 0, `no page errors (iphone) ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

// ---------------------------------------------------------------- 4. Manifest, installability, offline via service worker
{
  const { ctx, page, errors } = await phone({ viewport: { width: 915, height: 412 }, sw: true, query: 'index.html?sw' });
  const cdp = await ctx.newCDPSession(page);
  const man = await cdp.send('Page.getAppManifest');
  ok(man.errors.length === 0 && man.url.endsWith('manifest.webmanifest'), `manifest parses (${man.errors.map((e) => e.message).join('; ') || 'no errors'})`);
  const parsed = JSON.parse(man.data || '{}');
  ok(parsed.display === 'fullscreen' && parsed.orientation === 'landscape', 'manifest: display fullscreen + landscape');
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 60000 }).catch(() => {});
  const swState = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return r && r.active ? r.active.state : 'none'; });
  ok(swState === 'activated', `service worker active (${swState})`);
  await page.waitForTimeout(1500);
  const cached = await page.evaluate(async () => { const keys = await caches.keys(); let n = 0; for (const k of keys) n += (await (await caches.open(k)).keys()).length; return { keys, n }; });
  ok(cached.n >= 80, `precache filled (${cached.n} entries in ${cached.keys.join(',')})`);
  try {
    const inst = await cdp.send('Page.getInstallabilityErrors');
    ok(inst.installabilityErrors.length === 0, `installable (${inst.installabilityErrors.map((e) => e.errorId).join(', ') || 'no errors'})`);
  } catch (e) { console.log('      (installability check not available:', e.message, ')'); }
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => window.__DD_READY__ === true, null, { timeout: 60000 });
  ok(true, 'offline reload: game loads from the service worker cache');
  await shot(page, '4_offline');
  ok(errors.length === 0, `no page errors (sw) ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

// ---------------------------------------------------------------- 5. file:// still works (desktop)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForFunction(() => window.__DD_READY__ === true, null, { timeout: 60000 });
  const st = await page.evaluate(() => ({ rot: window.__DD_GAME__.view.rotated, W: window.__DD_GAME__.view.W }));
  ok(!st.rot && st.W === 1280, `file:// desktop runs (W=${st.W})`);
  ok(errors.length === 0, `no page errors (file://) ${errors.slice(0, 3).join(' | ')}`);
  await ctx.close();
}

await browser.close();
server.close();
fs.rmSync(web, { recursive: true, force: true });
console.log(fails.length ? `\n${fails.length} check(s) failed` : '\nall mobile checks passed', '— screenshots in', OUT);
process.exit(fails.length ? 1 : 0);
