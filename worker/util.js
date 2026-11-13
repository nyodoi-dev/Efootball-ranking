export const START_ELO = 1000;
export const K_FACTOR = 32;

export function eloDelta(ra, rb, result) {
  const ea = 1 / (1 + Math.pow(10, (rb - ra) / 400));
  return Math.round(K_FACTOR * (result - ea));
}

export const uid = () => crypto.randomUUID();

// A football score: a whole number from 0 to 99. Returns null for anything else
// (so "2.5", "abc", "" and 150 are refused rather than silently rounded).
export function parseScore(value) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return Number.isInteger(n) && n >= 0 && n <= 99 ? n : null;
}
export const now = () => new Date().toISOString();

// ── Admin session: a signed, expiring cookie ────────────────────────────────
const COOKIE = 'sl_session';
const SESSION_DAYS = 30;
const enc = new TextEncoder();

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Compare via HMAC so timing does not leak how much of the value matched.
async function safeEqual(a, b) {
  const [ha, hb] = await Promise.all([hmac('compare', a), hmac('compare', b)]);
  return ha === hb;
}

export async function checkPassword(env, password) {
  if (!env.ADMIN_PASSWORD || typeof password !== 'string') return false;
  return safeEqual(password, env.ADMIN_PASSWORD);
}

export async function sessionCookie(env, secure) {
  const exp = Date.now() + SESSION_DAYS * 86400000;
  const sig = await hmac(env.ADMIN_PASSWORD, `session:${exp}`);
  return `${COOKIE}=${exp}.${sig}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}`;
}

export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

export async function isAdmin(env, cookieHeader) {
  if (!env.ADMIN_PASSWORD || !cookieHeader) return false;
  const raw = cookieHeader
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${COOKIE}=`));
  if (!raw) return false;
  const [exp, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(env.ADMIN_PASSWORD, `session:${exp}`));
}
