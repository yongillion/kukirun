#!/usr/bin/env node
// =============================================================================
//  Zero-dependency bundler: src/**/*.js (ES modules) -> dist/game.js (one
//  classic script) so index.html runs straight from file:// (double-click).
//
//    node tools/build.mjs          # build
//    node tools/build.mjs --watch  # rebuild on change
//
//  Supported module syntax (what this project uses):
//    import { a, b as c } from './x.js';     import * as NS from './x.js';
//    export function f() {}  export async function f() {}  export class C {}
//    export const|let|var name = ...;        export { a, b as c };
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = 'src/main.js';
const OUT = path.join(ROOT, 'dist', 'game.js');

const IMPORT_RE = /^[ \t]*import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?/gm;
const IMPORT_BARE_RE = /^[ \t]*import\s+['"]([^'"]+)['"]\s*;?/gm;

function resolveId(fromId, spec) {
  if (!spec.startsWith('.')) throw new Error(`Only relative imports are supported: '${spec}' in ${fromId}`);
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromId), spec));
}

function transform(id, src) {
  const deps = [];
  const exportsMap = []; // [exportedName, localName]
  let code = src.replace(IMPORT_RE, (m, clause, spec) => {
    const dep = resolveId(id, spec);
    deps.push(dep);
    clause = clause.trim();
    const ns = clause.match(/^\*\s+as\s+(\w+)$/);
    if (ns) return `const ${ns[1]} = __req(${JSON.stringify(dep)});`;
    const named = clause.match(/^\{([\s\S]*)\}$/);
    if (named) {
      const parts = named[1].split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
        const mm = s.match(/^(\w+)\s+as\s+(\w+)$/);
        return mm ? `${mm[1]}: ${mm[2]}` : s;
      });
      return `const { ${parts.join(', ')} } = __req(${JSON.stringify(dep)});`;
    }
    throw new Error(`Unsupported import form in ${id}: ${m}`);
  });
  code = code.replace(IMPORT_BARE_RE, (m, spec) => { const dep = resolveId(id, spec); deps.push(dep); return `__req(${JSON.stringify(dep)});`; });
  code = code.replace(/^([ \t]*)export\s+(async\s+)?function\s*(\*?)\s*(\w+)/gm, (m, ind, asy, star, name) => { exportsMap.push([name, name]); return `${ind}${asy || ''}function${star ? '*' : ''} ${name}`; });
  code = code.replace(/^([ \t]*)export\s+class\s+(\w+)/gm, (m, ind, name) => { exportsMap.push([name, name]); return `${ind}class ${name}`; });
  code = code.replace(/^([ \t]*)export\s+(const|let|var)\s+(\w+)/gm, (m, ind, kw, name) => { exportsMap.push([name, name]); return `${ind}${kw} ${name}`; });
  code = code.replace(/^[ \t]*export\s*\{([^}]*)\}\s*;?/gm, (m, list) => {
    for (const s of list.split(',').map((x) => x.trim()).filter(Boolean)) {
      const mm = s.match(/^(\w+)\s+as\s+(\w+)$/);
      if (mm) exportsMap.push([mm[2], mm[1]]); else exportsMap.push([s, s]);
    }
    return '';
  });
  if (/^\s*export\s/m.test(code)) throw new Error(`Unsupported export form left in ${id}`);
  const getters = exportsMap.map(([e, l]) => `${JSON.stringify(e)}: () => ${l}`).join(', ');
  const body = `__def(${JSON.stringify(id)}, function (__exports, __req) {\n__exp(__exports, { ${getters} });\n${code}\n});\n`;
  return { deps, body };
}

export function build() {
  const t0 = Date.now();
  const order = [];
  const seen = new Map(); // id -> 'visiting' | 'done'
  const bodies = new Map();
  const visit = (id, chain) => {
    const st = seen.get(id);
    if (st === 'done') return;
    if (st === 'visiting') { console.warn('⚠ circular import:', [...chain, id].join(' -> ')); return; }
    seen.set(id, 'visiting');
    const file = path.join(ROOT, id);
    const src = fs.readFileSync(file, 'utf8');
    const { deps, body } = transform(id, src);
    bodies.set(id, body);
    for (const d of deps) visit(d, [...chain, id]);
    seen.set(id, 'done');
    order.push(id);
  };
  visit(ENTRY, []);
  const prelude = `/* Dessert Dash (project kukirun) — bundled by tools/build.mjs from src/ (${order.length} modules). Do not edit; edit src/ and rebuild. */
(function () {
'use strict';
const __mods = Object.create(null), __cache = Object.create(null);
function __def(id, fn) { __mods[id] = fn; }
function __exp(ex, g) { for (const k in g) Object.defineProperty(ex, k, { get: g[k], enumerable: true }); }
function __req(id) {
  const c = __cache[id]; if (c) return c;
  const ex = {}; __cache[id] = ex;
  const fn = __mods[id]; if (!fn) throw new Error('module not found: ' + id);
  fn(ex, __req); return ex;
}
`;
  const out = prelude + order.map((id) => `// ---- ${id}\n` + bodies.get(id)).join('\n') + `\n__req(${JSON.stringify(ENTRY)});\n})();\n`;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, out);
  console.log(`built dist/game.js — ${order.length} modules, ${(out.length / 1024).toFixed(0)} KB in ${Date.now() - t0} ms`);
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  build();
  if (process.argv.includes('--watch')) {
    let timer = null;
    fs.watch(path.join(ROOT, 'src'), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(() => { try { build(); } catch (e) { console.error(e.message); } }, 120); });
    console.log('watching src/ ...');
  }
}
