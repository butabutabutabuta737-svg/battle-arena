const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const WebSocket = require('ws');
const { joinRoom } = require('./game');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Last-resort safety net: game.js already wraps its own tick loop and WS message dispatch in
// try/catch, but anything outside those (e.g. a bug in the plain HTTP request handler below)
// would otherwise crash the whole process by default, dropping every connected player's game
// until someone notices and manually restarts it. Logging and continuing is strictly better
// than that for a small always-on game server like this one.
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});
process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

// Images only. Deliberately NOT max-age caching: 'no-cache' means the browser must revalidate
// on every request, so a replaced file is picked up immediately — there is no stale-file risk at
// all, which is the whole reason the rest of this server sends no-store. What it buys is that an
// UNCHANGED image comes back as a 304 with no body. The artwork is ~2.6MB and every reload was
// re-sending all of it; now it re-sends only what actually changed.
// Cheap, collision-safe validator: size + mtime, which is what any static file server uses.
function imageEtag(stat) {
  return '"' + stat.size.toString(16) + '-' + stat.mtimeMs.toString(16) + '"';
}

const server = http.createServer((req, res) => {
  const reqPath = decodeURIComponent(req.url.split('?')[0]);
  const relPath = reqPath === '/' ? '/index.html' : reqPath;
  const filePath = path.join(PUBLIC_DIR, relPath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end();
    return;
  }
  const ext = path.extname(filePath);
  const isImage = ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp' || ext === '.svg';
  fs.stat(filePath, (statErr, stat) => {
    if (!statErr && isImage) {
      const etag = imageEtag(stat);
      if (req.headers['if-none-match'] === etag) {
        // Unchanged since the browser last saw it — send the header only, no body.
        res.writeHead(304, { ETag: etag, 'Cache-Control': 'no-cache' });
        res.end();
        return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache', ETag: etag });
        res.end(data);
      });
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      // Everything that is not an image keeps no-store, unchanged: this project's html/js/css
      // change constantly during active development, and a stale one of those (needing an
      // unobvious hard-refresh to notice) has already caused real confusion once.
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    });
  });
});

const wss = new WebSocket.Server({ server });

// Defense-in-depth alongside the client's own normalizeRoomCode() (public/client.js) — a
// full-width room code ("ＡＢ１２") looks identical to its half-width form ("AB12") but is a
// different string, and .toUpperCase() alone doesn't fix that (only affects case, not width).
// Normalizing here too means any future/alternate client path still lands in the same room.
function normalizeRoomId(raw) {
  return raw
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .toUpperCase();
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const roomId = normalizeRoomId(url.searchParams.get('room') || 'DEFAULT').slice(0, 8);
  const name = url.searchParams.get('name') || 'プレイヤー';
  const cpu = url.searchParams.get('cpu');
  const roulette = url.searchParams.get('roulette') === '1';
  const coop = url.searchParams.get('coop') === '1';
  const hard = url.searchParams.get('hard') === '1';
  joinRoom(roomId, ws, name, cpu, roulette, coop, hard);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('=================================================');
  console.log(' リアルタイム対戦アリーナ サーバー起動');
  console.log('=================================================');
  console.log(`このPCで開く:        http://localhost:${PORT}`);
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`同じWi-Fiの相手はこちら: http://${net.address}:${PORT}`);
      }
    }
  }
  console.log('=================================================');
  console.log('終了するにはこのウィンドウを閉じるか Ctrl+C を押してください。');
});
