const http = require('http');
const fs = require('fs');
const path = require('path');
const {ShowdownEngineService} = require('./showdown-engine.cjs');
const {OnlineRoomService} = require('./online-room-service.cjs');

const rootDir = path.resolve(__dirname, '..');
const engine = new ShowdownEngineService();
const onlineRooms = new OnlineRoomService(engine);
const PORT = process.env.PORT ? Number(process.env.PORT) : 4173;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/plain; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
};

function sendJson(res, statusCode, body) {
  const text = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(text);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 5 * 1024 * 1024) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function safeJoin(base, target) {
  const resolved = path.resolve(base, '.' + target);
  if (!resolved.startsWith(base)) return null;
  return resolved;
}

function serveStatic(req, res) {
  let requestPath = req.url.split('?')[0];
  try {
    requestPath = decodeURIComponent(requestPath);
  } catch (error) {
    res.writeHead(400, {'Content-Type': 'text/plain; charset=utf-8'});
    res.end('Bad request');
    return;
  }
  if (requestPath === '/') requestPath = '/index.html';
  const resolved = safeJoin(rootDir, requestPath);
  if (!resolved) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.stat(resolved, (error, stats) => {
    if (error || !stats.isFile()) {
      res.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
      res.end('Not found');
      return;
    }
    const ext = path.extname(resolved).toLowerCase();
    const headers = {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=0',
    };
    if (ext === '.html' && ['index.html', 'online.html'].includes(path.basename(resolved).toLowerCase())) {
      fs.readFile(resolved, 'utf8', (readError, html) => {
        if (readError) {
          res.writeHead(500, {'Content-Type': 'text/plain; charset=utf-8'});
          res.end('Failed to load HTML file');
          return;
        }
        const baseName = path.basename(resolved).toLowerCase();
        const appProfile = baseName === 'online.html' ? 'online' : 'local';
        const withContext = html.replace(
          'window.__PKB_SERVER_CONTEXT__ = {bundledNodeServer: false, engineApiOrigin: "", engineProbeMode: "static-preview-or-file"};',
          `window.__PKB_SERVER_CONTEXT__ = {bundledNodeServer: true, engineApiOrigin: ${JSON.stringify(`http://localhost:${PORT}`)}, engineProbeMode: "bundled-node-server"};`
        );
        const injected = withContext.replace(
          /window\.__PKB_APP_PROFILE__\s*=\s*'[^']*';/g,
          `window.__PKB_APP_PROFILE__ = '${appProfile}';`
        );
        res.writeHead(200, headers);
        res.end(injected);
      });
      return;
    }
    res.writeHead(200, headers);
    fs.createReadStream(resolved).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      });
      res.end();
      return;
    }

    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = requestUrl.pathname;
    if (req.method === 'GET' && pathname === '/api/engine/status') {
      sendJson(res, 200, engine.status());
      return;
    }

    if (req.method === 'GET' && pathname === '/api/online/status') {
      sendJson(res, 200, {
        available: true,
        roomSupport: true,
        modeSupport: ['online-room-singles'],
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/battle/start') {
      const body = await readJson(req);
      const snapshot = await engine.startBattle(body);
      sendJson(res, 200, {ok: true, snapshot});
      return;
    }

    if (req.method === 'POST' && pathname === '/api/battle/choice') {
      const body = await readJson(req);
      const snapshot = await engine.chooseBattle(body.battleId, body.choices || {});
      sendJson(res, 200, {ok: true, snapshot});
      return;
    }

    if (req.method === 'POST' && pathname === '/api/rooms/create') {
      const body = await readJson(req);
      const result = onlineRooms.createRoom({
        name: body.name,
        builder: body.builder,
        teamSize: body.teamSize,
      });
      sendJson(res, 200, {ok: true, ...result});
      return;
    }

    if (req.method === 'POST' && pathname === '/api/rooms/join') {
      const body = await readJson(req);
      const result = onlineRooms.joinRoom({
        roomId: body.roomId,
        name: body.name,
        builder: body.builder,
        teamSize: body.teamSize,
      });
      sendJson(res, 200, {ok: true, ...result});
      return;
    }

    const roomStateMatch = /^\/api\/rooms\/([^/]+)\/state$/i.exec(pathname);
    if (req.method === 'GET' && roomStateMatch) {
      const roomId = roomStateMatch[1];
      const since = Number(requestUrl.searchParams.get('since') || 0);
      const waitMs = Number(requestUrl.searchParams.get('waitMs') || 0);
      const result = await onlineRooms.getState({roomId, since, waitMs});
      sendJson(res, 200, {ok: true, ...result});
      return;
    }

    const roomSyncBuilderMatch = /^\/api\/rooms\/([^/]+)\/sync-builder$/i.exec(pathname);
    if (req.method === 'POST' && roomSyncBuilderMatch) {
      const roomId = roomSyncBuilderMatch[1];
      const body = await readJson(req);
      const result = onlineRooms.syncBuilder({
        roomId,
        token: body.token,
        builder: body.builder,
      });
      sendJson(res, 200, {ok: true, ...result});
      return;
    }

    const roomSetReadyMatch = /^\/api\/rooms\/([^/]+)\/set-ready$/i.exec(pathname);
    if (req.method === 'POST' && roomSetReadyMatch) {
      const roomId = roomSetReadyMatch[1];
      const body = await readJson(req);
      const result = onlineRooms.setReady({
        roomId,
        token: body.token,
        ready: body.ready,
      });
      sendJson(res, 200, {ok: true, ...result});
      return;
    }

    const roomStartBattleMatch = /^\/api\/rooms\/([^/]+)\/start-battle$/i.exec(pathname);
    if (req.method === 'POST' && roomStartBattleMatch) {
      const roomId = roomStartBattleMatch[1];
      const body = await readJson(req);
      const result = await onlineRooms.startBattle({
        roomId,
        token: body.token,
      });
      sendJson(res, 200, {ok: true, ...result});
      return;
    }

    const roomSubmitChoiceMatch = /^\/api\/rooms\/([^/]+)\/submit-choice$/i.exec(pathname);
    if (req.method === 'POST' && roomSubmitChoiceMatch) {
      const roomId = roomSubmitChoiceMatch[1];
      const body = await readJson(req);
      const result = await onlineRooms.submitChoice({
        roomId,
        token: body.token,
        choice: body.choice,
      });
      sendJson(res, 200, {ok: true, ...result});
      return;
    }

    const roomForfeitMatch = /^\/api\/rooms\/([^/]+)\/forfeit$/i.exec(pathname);
    if (req.method === 'POST' && roomForfeitMatch) {
      const roomId = roomForfeitMatch[1];
      const body = await readJson(req);
      const result = onlineRooms.forfeitBattle({
        roomId,
        token: body.token,
      });
      sendJson(res, 200, {ok: true, ...result});
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    sendJson(res, statusCode, {
      ok: false,
      error: error.message || String(error),
    });
  }
});

server.listen(PORT, () => {
  console.log(`[PKB] Local Showdown migration server running at http://localhost:${PORT}`);
});
