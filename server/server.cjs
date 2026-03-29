const http = require('http');
const fs = require('fs');
const path = require('path');
const {ShowdownEngineService} = require('./showdown-engine.cjs');

const rootDir = path.resolve(__dirname, '..');
const engine = new ShowdownEngineService();
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
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=0',
    });
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

    const pathname = req.url.split('?')[0];
    if (req.method === 'GET' && pathname === '/api/engine/status') {
      sendJson(res, 200, engine.status());
      return;
    }

    if (req.method === 'POST' && pathname === '/api/battle/start') {
      const body = await readJson(req);
      const snapshot = await engine.startSingles(body);
      sendJson(res, 200, {ok: true, snapshot});
      return;
    }

    if (req.method === 'POST' && pathname === '/api/battle/choice') {
      const body = await readJson(req);
      const snapshot = await engine.chooseSingles(body.battleId, body.choices || {});
      sendJson(res, 200, {ok: true, snapshot});
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
