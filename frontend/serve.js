/**
 * Standalone frontend server for Railway's separate frontend service.
 * Reads API_BASE_URL env var at runtime and injects it into index.html as
 * window.__API_BASE__ so the React app can reach the backend without a rebuild.
 *
 * Set API_BASE_URL=https://your-backend.up.railway.app in Railway env vars.
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');
const PORT = process.env.PORT || 4173;
const API_BASE = process.env.API_BASE_URL || '';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const rawIndex = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8');
const indexHtml = rawIndex.replace(
  '<head>',
  `<head><script>window.__API_BASE__=${JSON.stringify(API_BASE)};</script>`
);

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  const filePath = path.join(DIST, urlPath);

  // Prevent path traversal
  if (!filePath.startsWith(DIST + path.sep) && filePath !== DIST) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (urlPath === '/' || urlPath === '/index.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(indexHtml);
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    // Long-term cache for hashed assets, no-cache for everything else
    if (/\.[0-9a-f]{8,}\.[a-z]+$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    fs.createReadStream(filePath).pipe(res);
  } else {
    // SPA fallback — let React Router handle the path
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(indexHtml);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend serving on ${PORT} (API_BASE_URL=${API_BASE || '(not set)'})`);
});
