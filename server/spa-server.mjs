/**
 * Production static file server for the Vite SPA build.
 * Copied to dist/server-dist.mjs by `yarn build`.
 *
 * Serves files from the dist directory (same folder as this script).
 * Unknown routes fall back to index.html for client-side routing.
 *
 * Also serves GET /config.js from process.env at request time so backend
 * URLs can change without rebuilding the Vite bundle.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderConfigJs } from './runtime-config.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
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
  '.txt': 'text/plain; charset=utf-8',
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0] || '/');
  const relative = decoded.replace(/^\/+/, '');
  const resolved = normalize(join(ROOT, relative || 'index.html'));
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

async function sendFile(res, filePath) {
  const ext = extname(filePath).toLowerCase();
  const body = await readFile(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(body);
}

function sendConfigJs(res) {
  res.writeHead(200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(renderConfigJs());
}

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  const urlPath = (req.url.split('?')[0] || '/');
  if (urlPath === '/config.js') {
    sendConfigJs(res);
    return;
  }

  let filePath = safePath(urlPath === '/' ? '/index.html' : urlPath);

  try {
    if (filePath && existsSync(filePath) && !filePath.endsWith('/')) {
      await sendFile(res, filePath);
      return;
    }

    const indexPath = join(ROOT, 'index.html');
    await sendFile(res, indexPath);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Serving ${ROOT} at http://${HOST}:${PORT}`);
  console.log('Runtime config via GET /config.js (from process.env)');
});
