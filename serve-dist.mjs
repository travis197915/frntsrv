#!/usr/bin/env node
// Zero-dependency static server for the prebuilt `dist/` folder.
// Serves files with SPA fallback (any unknown route -> index.html) so
// React Router deep links work. Runs on any Node version, no network needed.
//
//   node serve-dist.mjs            # serves ./dist on http://localhost:5173
//   PORT=8080 node serve-dist.mjs  # custom port
//   node serve-dist.mjs 8080       # custom port via arg

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('./dist', import.meta.url)));
const PORT = Number(process.argv[2] || process.env.PORT || 5173);
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

async function sendFile(res, filePath, status = 200) {
  const body = await readFile(filePath);
  res.writeHead(status, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
    let filePath = join(ROOT, safePath);

    let info = await stat(filePath).catch(() => null);
    if (info && info.isDirectory()) {
      filePath = join(filePath, 'index.html');
      info = await stat(filePath).catch(() => null);
    }

    if (info && info.isFile()) {
      await sendFile(res, filePath);
      return;
    }

    // SPA fallback: unknown route with no file extension -> index.html
    if (!extname(safePath)) {
      await sendFile(res, join(ROOT, 'index.html'));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 Internal Server Error');
  }
});

stat(ROOT)
  .then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`Serving ${ROOT}`);
      console.log(`→ http://localhost:${PORT}`);
    });
  })
  .catch(() => {
    console.error(`dist/ not found at ${ROOT}. Build first (yarn build) or pull the committed dist.`);
    process.exit(1);
  });
