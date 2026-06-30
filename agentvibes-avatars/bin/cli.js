#!/usr/bin/env node
'use strict';
//
// agentvibes-avatars — start the receiver server and open the avatar window.
//
// Usage:
//   agentvibes-avatars                 # start server + open the avatar window
//   agentvibes-avatars --port 4000     # custom port
//   agentvibes-avatars --view gallery.html
//
// The window speaks any TTS audio POSTed to  http://localhost:<port>/speak
//   { audioBase64, text, voice, project, origin }
//
// The TalkingHead library + three.js + avatars load from CDN at runtime — nothing
// is bundled here. First run needs internet; after that the page is cached by the
// browser.
//

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const os   = require('os');
const fs   = require('fs');

const argv = process.argv.slice(2);
function flag(name, def) { const i = argv.indexOf(name); return (i >= 0 && argv[i + 1]) ? argv[i + 1] : def; }

const PORT = parseInt(process.env.AVATARS_PORT || flag('--port', '3747'), 10);
const VIEW = flag('--view', 'cosmic.html');
const BASE = `http://localhost:${PORT}`;

function get(p) {
  return new Promise(resolve => {
    const req = http.get(`${BASE}${p}`, res => { let b = ''; res.on('data', c => b += c); res.on('end', () => resolve({ status: res.statusCode, body: b })); });
    req.on('error', () => resolve(null));
    req.setTimeout(1500, () => { req.destroy(); resolve(null); });
  });
}
function post(p) {
  return new Promise(resolve => {
    const req = http.request(`${BASE}${p}`, { method: 'POST' }, res => { res.on('data', () => {}); res.on('end', () => resolve(true)); });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => { req.destroy(); resolve(false); });
    req.end();
  });
}

function findChrome() {
  const c = [];
  if (process.platform === 'win32') {
    c.push(`${process.env['PROGRAMFILES']}\\Google\\Chrome\\Application\\chrome.exe`,
           `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
           `${process.env['LOCALAPPDATA']}\\Google\\Chrome\\Application\\chrome.exe`);
  } else if (process.platform === 'darwin') {
    c.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  } else {
    c.push('/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium');
  }
  return c.find(p => { try { return p && fs.existsSync(p); } catch { return false; } });
}

function openWindow(url) {
  const chrome = findChrome();
  if (chrome) {
    // Dedicated app window with autoplay enabled so audio plays hands-free.
    const profile = path.join(os.homedir(), '.agentvibes-avatars', 'chrome-profile');
    spawn(chrome, [`--app=${url}`, '--autoplay-policy=no-user-gesture-required',
      `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check'],
      { detached: true, stdio: 'ignore' }).unref();
    return 'chrome app window';
  }
  // Fallback: the OS default browser (autoplay may require one click).
  const opener = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]]
               : process.platform === 'darwin' ? ['open', [url]]
               : ['xdg-open', [url]];
  spawn(opener[0], opener[1], { detached: true, stdio: 'ignore' }).unref();
  return 'default browser';
}

(async () => {
  // 1. Ensure the receiver server is running.
  let health = await get('/health');
  if (!health) {
    const serverPath = path.join(__dirname, '..', 'server.js');
    const child = spawn(process.execPath, [serverPath], {
      detached: true, stdio: 'ignore',
      env: { ...process.env, TALKING_HEAD_PORT: String(PORT) },
    });
    child.unref();
    for (let i = 0; i < 25 && !health; i++) { await new Promise(r => setTimeout(r, 150)); health = await get('/health'); }
    if (!health) { console.error(`agentvibes-avatars: server failed to start on ${BASE}`); process.exit(1); }
    console.log(`agentvibes-avatars: server started on ${BASE}`);
  } else {
    console.log(`agentvibes-avatars: server already running on ${BASE}`);
  }

  // 2. Idempotent: if a window is already connected, refresh it instead of duplicating.
  const hb = await get('/has-browser');
  if (hb && /"connected":true/.test(hb.body)) {
    await post('/reload');
    console.log('agentvibes-avatars: existing window refreshed (no duplicate).');
    return;
  }

  // 3. Open the window.
  const how = openWindow(`${BASE}/${VIEW}`);
  console.log(`agentvibes-avatars: opened ${BASE}/${VIEW} via ${how}`);
  console.log(`POST TTS audio to ${BASE}/speak  { audioBase64, text, voice, project, origin }`);
})();
