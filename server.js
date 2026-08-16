const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const WebSocket = require('ws');
const { joinRoom } = require('./game');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

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

const server = http.createServer((req, res) => {
  const reqPath = decodeURIComponent(req.url.split('?')[0]);
  const relPath = reqPath === '/' ? '/index.html' : reqPath;
  const filePath = path.join(PUBLIC_DIR, relPath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    // No caching at all — this project's static files change constantly during active
    // development, and a stale-cached style.css/client.js/image after an edit (needing an
    // unobvious hard-refresh to see) has already caused real confusion once. This is a
    // small LAN-only game, so the bandwidth cost of always refetching is negligible.
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const roomId = (url.searchParams.get('room') || 'DEFAULT').toUpperCase().slice(0, 8);
  const name = url.searchParams.get('name') || 'プレイヤー';
  const cpu = url.searchParams.get('cpu');
  const roulette = url.searchParams.get('roulette') === '1';
  joinRoom(roomId, ws, name, cpu, roulette);
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
