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
//

'use strict';

const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const crypto = require('crypto');

const PORT      = parseInt(process.env.TALKING_HEAD_PORT || '3747', 10);
const AUDIO_DIR = path.join(__dirname, 'public', 'audio');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Ensure audio temp dir exists
fs.mkdirSync(AUDIO_DIR, { recursive: true });

// SSE clients: Map<id, res>
const sseClients = new Map();

// Scheduled cleanup timers for audio files: Map<filename, timer>
const audioCleanupTimers = new Map();

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
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': stat.size,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
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

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST', 'Access-Control-Allow-Headers': 'Content-Type' });
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
    broadcastSSE({ type: 'reload' });
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
    res.end();
    return;
  }

  // Client log — browser posts debug lines here so they appear in server.log
  if (req.method === 'POST' && urlPath === '/clientlog') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => { console.log('[CLIENT] ' + String(body).slice(0, 400)); res.writeHead(204, { 'Access-Control-Allow-Origin': '*' }); res.end(); });
    return;
  }

  // Browser connection count
  if (req.method === 'GET' && urlPath === '/has-browser') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
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
      'Access-Control-Allow-Origin': '*',
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

  // POST /speak — receive audio from play-tts.ps1
  if (req.method === 'POST' && urlPath === '/speak') {
    let body;
    try { body = await parseBody(req); }
    catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    const hasBrowser = sseClients.size > 0;

    if (hasBrowser && body.audioBase64) {
      // Save audio to temp file
      const fileId = crypto.randomBytes(8).toString('hex');
      const fileName = `${fileId}.wav`;
      const filePath = path.join(AUDIO_DIR, fileName);

      try {
        const buf = Buffer.from(body.audioBase64, 'base64');
        fs.writeFileSync(filePath, buf);

        // Broadcast to browser
        broadcastSSE({
          type:    'speak',
          audioUrl: `/audio/${fileName}`,
          text:    body.text    || '',
          voice:   body.voice   || '',
          project: body.project || '',
          origin:  body.origin  || 'remote',
          llm:     body.llm     || '',
        });

        // Clean up audio file after 120 seconds
        const timer = setTimeout(() => {
          fs.unlink(filePath, () => {});
          audioCleanupTimers.delete(fileName);
        }, 120000);
        audioCleanupTimers.set(fileName, timer);

        console.log(`[SPEAK] Queued ${fileName} for ${sseClients.size} browser(s) | project=${body.project || '-'} voice=${body.voice || '-'}`);
      } catch (e) {
        console.error('[SPEAK] Audio save failed:', e.message);
      }
    } else if (hasBrowser) {
      // No audio bytes — just notify browser (e.g. SAPI plays inline, no file)
      broadcastSSE({
        type:    'speak',
        audioUrl: null,
        text:    body.text    || '',
        voice:   body.voice   || '',
        project: body.project || '',
        origin:  body.origin  || 'remote',
        llm:     body.llm     || '',
      });
    } else {
      console.log('[SPEAK] No browser connected — skipping SSE broadcast');
    }

    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
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
