const crypto = require('crypto');

const COOKIE_NAME = 'admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

function sign(value) {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET não configurada');
  }
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(value).digest('hex');
}

// Cookie assinado e sem estado: "expiraEm.assinatura". Sem sessão em banco —
// só precisamos validar que quem apresenta o cookie sabe o segredo do servidor.
function createSessionCookieHeader() {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const signature = sign(String(expiresAt));
  const value = `${expiresAt}.${signature}`;
  const maxAgeSeconds = Math.floor(SESSION_TTL_MS / 1000);
  return `${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

function clearSessionCookieHeader() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  }
  return out;
}

function isAuthenticated(req) {
  const cookies = parseCookies(req.headers.cookie);
  const raw = cookies[COOKIE_NAME];
  if (!raw) return false;

  const dotIndex = raw.indexOf('.');
  if (dotIndex === -1) return false;

  const expiresAtStr = raw.slice(0, dotIndex);
  const signature = raw.slice(dotIndex + 1);
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  const expected = sign(expiresAtStr);
  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Compara a senha enviada com ADMIN_PASSWORD em tempo constante, pra não
// vazar por timing quantos caracteres bateram.
function checkPassword(candidate) {
  if (!process.env.ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD não configurada');
  }
  const expected = Buffer.from(process.env.ADMIN_PASSWORD);
  const given = Buffer.from(String(candidate || ''));
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(given, expected);
}

module.exports = {
  createSessionCookieHeader,
  clearSessionCookieHeader,
  isAuthenticated,
  checkPassword,
};
