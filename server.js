const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const mysql = require('mysql2/promise');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const CONTACT_EMAIL = 'evans.mathibe@mail.com';
const pool = process.env.DATABASE_URL ? mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 5 }) : null;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

async function ensureSchema() {
  if (!pool) throw new Error('DATABASE_URL is not configured');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contact_submissions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(254) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_contact_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 32000) {
        reject(new Error('Request too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function validateContact(input) {
  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim();
  const message = String(input.message || '').trim();
  const errors = {};
  if (name.length < 2 || name.length > 120) errors.name = 'Please enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) errors.email = 'Please enter a valid email address.';
  if (message.length < 10 || message.length > 10000) errors.message = 'Please add a little more detail to your message.';
  return { name, email, message, errors };
}

async function handleContact(req, res) {
  let input;
  try {
    input = JSON.parse(await readBody(req));
  } catch {
    return sendJson(res, 400, { ok: false, error: 'Please send a valid JSON message.' });
  }
  const { name, email, message, errors } = validateContact(input);
  if (Object.keys(errors).length) return sendJson(res, 422, { ok: false, errors });
  if (!pool) return sendJson(res, 503, { ok: false, error: 'Contact storage is temporarily unavailable. Please email Evans directly.' });

  try {
    const [result] = await pool.execute(
      'INSERT INTO contact_submissions (name, email, message) VALUES (?, ?, ?)',
      [name, email, message],
    );
    return sendJson(res, 201, {
      ok: true,
      id: result.insertId,
      mailto: `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Creative enquiry from ${name}`)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)}`,
    });
  } catch (error) {
    console.error('Contact submission failed:', error.message);
    return sendJson(res, 500, { ok: false, error: 'We could not save your message. Please email Evans directly.' });
  }
}

function safePath(requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const cleanPath = decoded === '/' ? '/index.html' : decoded;
  const candidate = path.normalize(path.join(ROOT, cleanPath));
  return candidate.startsWith(ROOT) ? candidate : null;
}

function serveStatic(req, res, pathname) {
  const filePath = safePath(pathname);
  if (!filePath) return sendJson(res, 400, { ok: false, error: 'Invalid path.' });
  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      if (pathname !== '/') return serveStatic(req, res, '/404.html');
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' };
    if (ext === '.png' || ext === '.pdf') headers['Cache-Control'] = 'public, max-age=86400';
    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && requestUrl.pathname === '/api/health') {
      return sendJson(res, pool ? 200 : 503, { ok: Boolean(pool), database: Boolean(pool) });
    }
    if (req.method === 'POST' && requestUrl.pathname === '/api/contact') return handleContact(req, res);
    if (req.method === 'GET') return serveStatic(req, res, requestUrl.pathname);
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  } catch (error) {
    console.error('Request failed:', error.message);
    return sendJson(res, 500, { ok: false, error: 'Unexpected server error.' });
  }
});

async function start() {
  await ensureSchema();
  server.listen(PORT, '0.0.0.0', () => console.log(`Evans Mathibe server listening on ${PORT}`));
}

start().catch((error) => {
  console.error('Startup failed:', error.message);
  process.exit(1);
});
