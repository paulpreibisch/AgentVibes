#!/usr/bin/env node
//
// talking-head/server.js
// AgentVibes TalkingHead server — pure Node.js, no npm deps.
//
// Endpoints:
//   GET  /            → serves index.html
//   GET  /avatars.json → avatar config
//   GET  /audio/:file  → serves temp TTS audio files
//   GET  /events       → SSE stream (browser connects here)
//   GET  /health       → 200 OK (used by play-tts.ps1 to probe)
//   POST /speak        → {audioBase64, voice, project, origin, llm} → broadcasts to browser
//   GET  /has-browser  → {"connected": true/false}
//   POST /reload       → broadcast reload signal
//   POST /clientlog    → browser debug lines
//
// Security model: binds 127.0.0.1 only. State-changing endpoints reject any
// request carrying a non-loopback Origin header (blocks CSRF from a drive-by
// browser tab). Server-side callers (curl / Invoke-RestMethod) send no Origin
// and are allowed. Request bodies are size-capped to prevent OOM/disk DoS.
//

'use strict';

const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const crypto = require('crypto');

const PORT      = parseInt(process.env.TALKING_HEAD_PORT || '3747', 10);
const AUDIO_DIR = path.join(__dirname, 'public', 'audio');
const PUBLIC_DIR = path.join(__dirname, 'public');

const MAX_BODY = 8 * 1024 * 1024;   // 8 MB hard cap on any request body
const MAX_LOG  = 4 * 1024;          // 4 KB cap on /clientlog payloads

// Ensure audio temp dir exists
fs.mkdirSync(AUDIO_DIR, { recursive: true });

// SSE clients: Map<id, res>
const sseClients = new Map();

// Scheduled cleanup timers for audio files: Map<filename, timer>
const audioCleanupTimers = new Map();

// CSRF guard: requests from another website carry a foreign Origin header.
// No Origin (server-side curl/PowerShell) or a loopback Origin is allowed.
function originOk(req) {
  const o = req.headers.origin;
  if (!o) return true;
  try { const u = new URL(o); return u.hostname === '127.0.0.1' || u.hostname === 'localhost'; }
  catch { return false; }
}

function broadcastSSE(payload) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients.values()) {
    try { res.write(data); } catch {}
  }
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript',
    '.mjs':  'application/javascript',
    '.css':  'text/css',
    '.json': 'application/json',
    '.wav':  'audio/wav',
    '.mp3':  'audio/mpeg',
    '.glb':  'model/gltf-binary',
  };
  const mime = mimeTypes[ext] || 'application/octet-stream';

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    // no-store on the HTML/JS so the Chrome app never serves a stale page after an update.
    const cache = (ext === '.html' || ext === '.js' || ext === '.mjs') ? 'no-store, no-cache, must-revalidate' : 'no-cache';
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': stat.size,
      'Cache-Control': cache,
    });
    const stream = fs.createReadStream(filePath);
    // Without this, a file deleted mid-read (120s cleanup) or any read error
    // emits an unhandled 'error' event that crashes the whole server.
    stream.on('error', () => { try { res.destroy(); } catch {} });
    stream.pipe(res);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('body too large')); try { req.destroy(); } catch {} return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

// Security: validate that a filename is safe (no path traversal)
function safeName(name) {
  return /^[a-zA-Z0-9_\-]+\.wav$/.test(name);
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  const urlPath = urlObj.pathname;

  // CORS preflight — echo a loopback Origin only; foreign origins get no ACAO
  // so their preflight fails and the browser never sends the real request.
  if (req.method === 'OPTIONS') {
    const h = { 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Content-Type' };
    if (originOk(req) && req.headers.origin) h['Access-Control-Allow-Origin'] = req.headers.origin;
    res.writeHead(204, h);
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && urlPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, clients: sseClients.size }));
    return;
  }

  // Reload — broadcast a reload signal so open browsers refresh in place
  if (req.method === 'POST' && urlPath === '/reload') {
    if (!originOk(req)) { res.writeHead(403); res.end(); return; }
    broadcastSSE({ type: 'reload' });
    res.writeHead(204);
    res.end();
    return;
  }

  // Client log — browser posts debug lines here so they appear in server.log
  if (req.method === 'POST' && urlPath === '/clientlog') {
    if (!originOk(req)) { res.writeHead(403); res.end(); return; }
    let body = '';
    req.on('data', c => { body += c; if (body.length > MAX_LOG) { try { req.destroy(); } catch {} } });
    req.on('end', () => {
      // Strip CR/LF so a payload can't forge extra log lines (log injection).
      const clean = body.slice(0, MAX_LOG).replace(/[\r\n]+/g, ' ');
      console.log('[CLIENT] ' + clean);
      res.writeHead(204); res.end();
    });
    return;
  }

  // Browser connection count
  if (req.method === 'GET' && urlPath === '/has-browser') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ connected: sseClients.size > 0 }));
    return;
  }

  // SSE stream
  if (req.method === 'GET' && urlPath === '/events') {
    const clientId = crypto.randomBytes(4).toString('hex');
    res.writeHead(200, {
      'Content-Type':                'text/event-stream',
      'Cache-Control':               'no-cache',
      'Connection':                  'keep-alive',
      'X-Accel-Buffering':           'no',
    });
    res.write(`data: ${JSON.stringify({ type: 'connected', id: clientId })}\n\n`);
    sseClients.set(clientId, res);
    console.log(`[SSE] Browser connected: ${clientId} (total: ${sseClients.size})`);

    // Keepalive ping every 25s
    const ping = setInterval(() => {
      try { res.write(': ping\n\n'); } catch { clearInterval(ping); }
    }, 25000);

    req.on('close', () => {
      clearInterval(ping);
      sseClients.delete(clientId);
      console.log(`[SSE] Browser disconnected: ${clientId} (total: ${sseClients.size})`);
    });
    return;
  }

  // POST /speak — receive audio from play-tts.ps1 / forward-to-avatar.sh
  if (req.method === 'POST' && urlPath === '/speak') {
    if (!originOk(req)) { res.writeHead(403); res.end(); return; }
    let body;
    try { body = await parseBody(req); }
    catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON or body too large' }));
      return;
    }

    const hasBrowser = sseClients.size > 0;
    const payload = {
      type:    'speak',
      audioUrl: null,
      text:    body.text    || '',
      voice:   body.voice   || '',
      project: body.project || '',
      origin:  body.origin  || 'remote',
      llm:     body.llm     || '',
    };

    if (hasBrowser && body.audioBase64) {
      const buf = Buffer.from(String(body.audioBase64), 'base64');
      if (buf.length === 0 || buf.length > MAX_BODY) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'audio too large or empty' }));
        return;
      }
      const fileName = `${crypto.randomBytes(8).toString('hex')}.wav`;
      const filePath = path.join(AUDIO_DIR, fileName);
      // Async write — never block the event loop. Broadcast only after the
      // file is on disk so the browser can't 404 fetching it.
      fs.writeFile(filePath, buf, (err) => {
        if (err) { console.error('[SPEAK] Audio save failed:', err.message); return; }
        payload.audioUrl = `/audio/${fileName}`;
        broadcastSSE(payload);
        const timer = setTimeout(() => { fs.unlink(filePath, () => {}); audioCleanupTimers.delete(fileName); }, 120000);
        audioCleanupTimers.set(fileName, timer);
        console.log(`[SPEAK] Queued ${fileName} for ${sseClients.size} browser(s) | project=${body.project || '-'} voice=${body.voice || '-'}`);
      });
    } else if (hasBrowser) {
      // No audio bytes — just notify browser (e.g. SAPI plays inline, no file)
      broadcastSSE(payload);
    } else {
      console.log('[SPEAK] No browser connected — skipping SSE broadcast');
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ browserConnected: hasBrowser }));
    return;
  }

  // Static files
  if (req.method === 'GET') {
    // Audio files
    const audioMatch = urlPath.match(/^\/audio\/([a-zA-Z0-9_\-]+\.wav)$/);
    if (audioMatch && safeName(audioMatch[1])) {
      serveFile(path.join(AUDIO_DIR, audioMatch[1]), res);
      return;
    }

    // avatars.json
    if (urlPath === '/avatars.json') {
      serveFile(path.join(__dirname, 'avatars.json'), res);
      return;
    }

    // index.html for /
    if (urlPath === '/' || urlPath === '/index.html') {
      serveFile(path.join(PUBLIC_DIR, 'index.html'), res);
      return;
    }

    // Other public files
    const safePubPath = path.resolve(PUBLIC_DIR, urlPath.replace(/^\//, ''));
    if (safePubPath.startsWith(PUBLIC_DIR + path.sep) || safePubPath === PUBLIC_DIR) {
      serveFile(safePubPath, res);
      return;
    }
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[TalkingHead] Server listening on http://127.0.0.1:${PORT}`);
  console.log(`[TalkingHead] Open in browser: http://localhost:${PORT}`);
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[TalkingHead] Port ${PORT} already in use — server may already be running.`);
    process.exit(1);
  }
  throw err;
});
