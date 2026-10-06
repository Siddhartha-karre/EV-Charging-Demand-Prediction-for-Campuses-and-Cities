import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_PORT = 5050;

console.log(`[Fullstack] Starting Python FastAPI on port ${BACKEND_PORT}...`);
const pyProc = spawn('python3', ['-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', String(BACKEND_PORT)], {
  stdio: 'inherit',
});

pyProc.on('error', (err) => {
  console.error('[Fullstack] Python process error:', err);
});

// Proxy /api requests to Python FastAPI on 5050
app.use('/api', (req, res) => {
  const options = {
    hostname: '127.0.0.1',
    port: BACKEND_PORT,
    path: req.originalUrl,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${BACKEND_PORT}` },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[Proxy Error]', err.message);
    res.status(502).json({ error: 'Backend service initializing or unavailable', detail: err.message });
  });

  req.pipe(proxyReq, { end: true });
});

// Serve static assets from dist
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`[Fullstack] Server listening on port ${PORT}`);
});

const cleanup = () => {
  console.log('[Fullstack] Terminating processes...');
  pyProc.kill();
  server.close();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
