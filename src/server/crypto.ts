import {
  createHash,
  createHmac,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomInt,
  scrypt as nodeScrypt,
  type ScryptOptions,
  timingSafeEqual,
} from 'node:crypto';

function scryptAsync(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export const GUEST_PASSWORD_SCRYPT = {
  N: 32_768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
} as const;

const AUTH_KEY_ENV = 'AUTH_HMAC_KEY';

function authKey(): Buffer {
  const configured = process.env[AUTH_KEY_ENV];
  if (!configured || Buffer.byteLength(configured, 'utf8') < 32) {
    throw new Error(`${AUTH_KEY_ENV} must be configured with at least 32 bytes`);
  }
  return Buffer.from(configured, 'utf8');
}

export function randomToken(bytes = 32): string {
  if (!Number.isSafeInteger(bytes) || bytes < 16 || bytes > 256) {
    throw new RangeError('token byte length must be between 16 and 256');
  }
  return randomBytes(bytes).toString('base64url');
}

export function randomOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function sha256Hex(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

export function hmacHex(value: string | Buffer, key = authKey()): string {
  return createHmac('sha256', key).update(value).digest('hex');
}

export function safeEqualHex(left: string, right: string): boolean {
  if (!/^[0-9a-f]+$/i.test(left) || !/^[0-9a-f]+$/i.test(right)) return false;
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

function deriveSecretKey(): Buffer {
  return createHash('sha256').update(authKey()).digest();
}

/** Encrypts short delivery secrets before placing them in the database outbox. */
export function encryptSecret(value: string): { ciphertext: string; iv: string; tag: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', deriveSecretKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64url'),
    iv: iv.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
  };
}

export function decryptSecret(input: { ciphertext: string; iv: string; tag: string }): string {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    deriveSecretKey(),
    Buffer.from(input.iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(input.tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export interface ScryptPasswordHash {
  algorithm: 'scrypt';
  salt: string;
  digest: string;
  N: number;
  r: number;
  p: number;
}

export async function hashPassword(password: string): Promise<ScryptPasswordHash> {
  validatePassword(password);
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, 32, GUEST_PASSWORD_SCRYPT)) as Buffer;
  return {
    algorithm: 'scrypt',
    salt: salt.toString('base64url'),
    digest: derived.toString('base64url'),
    N: GUEST_PASSWORD_SCRYPT.N,
    r: GUEST_PASSWORD_SCRYPT.r,
    p: GUEST_PASSWORD_SCRYPT.p,
  };
}

export async function verifyPassword(password: string, stored: ScryptPasswordHash): Promise<boolean> {
  if (!isPasswordHash(stored)) return false;
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) return false;
  const derived = (await scryptAsync(
    password,
    Buffer.from(stored.salt, 'base64url'),
    32,
    GUEST_PASSWORD_SCRYPT,
  )) as Buffer;
  const expected = Buffer.from(stored.digest, 'base64url');
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export function serializePasswordHash(hash: ScryptPasswordHash): string {
  return `scrypt$N=${hash.N}$r=${hash.r}$p=${hash.p}$${hash.salt}$${hash.digest}`;
}

export function parsePasswordHash(value: string): ScryptPasswordHash | null {
  const match = /^scrypt\$N=(\d+)\$r=(\d+)\$p=(\d+)\$([^$]+)\$([^$]+)$/.exec(value);
  if (!match) return null;
  const hash: ScryptPasswordHash = {
    algorithm: 'scrypt',
    N: Number(match[1]),
    r: Number(match[2]),
    p: Number(match[3]),
    salt: match[4],
    digest: match[5],
  };
  return isPasswordHash(hash) ? hash : null;
}

export function isPasswordHash(value: unknown): value is ScryptPasswordHash {
  if (!value || typeof value !== 'object') return false;
  const hash = value as Partial<ScryptPasswordHash>;
  return (
    hash.algorithm === 'scrypt' &&
    hash.N === GUEST_PASSWORD_SCRYPT.N &&
    hash.r === GUEST_PASSWORD_SCRYPT.r &&
    hash.p === GUEST_PASSWORD_SCRYPT.p &&
    typeof hash.salt === 'string' &&
    typeof hash.digest === 'string'
  );
}

export function validatePassword(password: string): void {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw new RangeError('guest password must contain 12 to 128 characters');
  }
}
