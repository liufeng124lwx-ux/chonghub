import { hmacHex, randomToken, safeEqualHex } from '@/server/crypto';

const COOKIE = 'chonghub_draft';
const MAX_AGE = 24 * 60 * 60;

export function getDraftScope(request: Request): string | null {
  const value = request.headers.get('cookie')?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!value) return null;
  const [token, expires, signature, extra] = value.split('.');
  if (extra || !/^[A-Za-z0-9_-]{43}$/.test(token ?? '') || !/^\d+$/.test(expires ?? '') || Number(expires) <= Date.now()) return null;
  return signature && safeEqualHex(signature, hmacHex(`order-draft:${token}.${expires}`)) ? token : null;
}

export function newDraftCookie(): string {
  const token = randomToken(32);
  const payload = `${token}.${Date.now() + MAX_AGE * 1000}`;
  return `${COOKIE}=${payload}.${hmacHex(`order-draft:${payload}`)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
