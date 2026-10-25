import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const dist = path.join(root, 'dist');
const config = JSON.parse(await fs.readFile(path.join(root, 'vercel.json'), 'utf8'));
assert.equal(config.framework, null, 'Deploy as a static site');
assert.equal(config.outputDirectory, 'dist');
assert.equal(config.buildCommand, 'npm run build');
assert.equal(config.trailingSlash, true);
const entries = await fs.readdir(root);
assert.ok(!entries.includes('server.mjs'), 'A root server entrypoint must not be regenerated');
assert.ok(!entries.includes('api'), 'Page delivery must not depend on functions');
const inventory = JSON.parse(await fs.readFile(path.join(root, 'content-inventory.json'), 'utf8'));
assert.equal(inventory.length, 27);
const localFiles = new Set();
for (const page of inventory) {
  const htmlPath = path.join(dist, page.path, 'index.html');
  const html = await fs.readFile(htmlPath, 'utf8');
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /<h1\b/i);
  for (const link of html.matchAll(/(?:href|src)="(\/[^\"]*)"/g)) {
    const pathname = decodeURIComponent(new URL(link[1].replaceAll('&amp;', '&'), 'http://localhost').pathname);
    let target = path.resolve(dist, '.' + pathname);
    assert.ok(target === dist || target.startsWith(dist + path.sep));
    if ((await fs.stat(target)).isDirectory()) target = path.join(target, 'index.html');
    assert.ok((await fs.stat(target)).isFile(), 'Missing local link: ' + pathname);
    localFiles.add(pathname);
  }
}
const child = spawn(process.execPath, [path.join(root, 'scripts/preview.mjs')], { cwd: root, env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
let errors=''; child.stderr.on('data', data => errors += data);
try {
  const url = await new Promise((resolve, reject) => {
    let text=''; const timer=setTimeout(() => reject(new Error('Preview startup timed out: ' + errors)), 10000);
    child.once('error', err => { clearTimeout(timer); reject(err); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error('Preview exited: ' + code + ' ' + errors)); });
    child.stdout.on('data', chunk => { text += chunk; const match=text.match(/http:\/\/127\.0\.0\.1:\d+/); if(match){clearTimeout(timer);resolve(match[0]);} });
  });
  for (const page of inventory) {
    const res = await fetch(url + page.path);
    assert.equal(res.status, 200, 'Route failed: ' + page.path);
    assert.match(res.headers.get('content-type'), /^text\/html/);
  }
  for (const [asset, type] of [['/style.css','text/css'], ['/app.js','text/javascript'], ['/assets/grand.jpg','image/jpeg'], ['/assets/zohery-tours-brochure.pdf','application/pdf']]) {
    const res = await fetch(url + asset, { method:'HEAD' });
    assert.equal(res.status, 200, asset);
    assert.ok(res.headers.get('content-type').startsWith(type), asset + ' content type');
    assert.ok(Number(res.headers.get('content-length')) > 0);
    assert.equal((await res.arrayBuffer()).byteLength, 0, 'HEAD must not return a body');
  }
  const missing = await fetch(url + '/missing-page/'); assert.equal(missing.status, 404);
  console.log('PASS: 27 page routes, ' + localFiles.size + ' local links/assets, CSS/JS/JPEG/PDF responses, HEAD requests, and missing-page 404.');
  console.log('PASS: Vercel serves dist statically; no root server entrypoint or page functions.');
} finally {
  const exit = once(child, 'exit'); child.kill(); await exit;
}
