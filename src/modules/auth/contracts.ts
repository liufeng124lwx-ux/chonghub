export type OtpPurpose = 'login' | 'guest_reset';
export type SessionKind = 'user' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  verifiedAt: string;
}

export interface SessionActor {
  userId: string;
  kind: SessionKind;
  expiresAt: string;
}

export interface GuestGrant {
  orderId: string;
  grantVersion: number;
  expiresAt: string;
}

export function normalizeEmail(value: string): string {
  if (typeof value !== 'string') throw new TypeError('email must be a string');
  const email = value.trim().toLowerCase();
  if (email.length === 0 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new TypeError('invalid email address');
  }
  return email;
}
