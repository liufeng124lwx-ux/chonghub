import type { NotificationSender } from './contracts';
import { renderEmail } from './templates';
import nodemailer from 'nodemailer';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { decodeOtpForDelivery } from '@/modules/auth/otp';

/** Development transport: exposes only event type and recipient domain. */
export const localEmailSender: NotificationSender = {
  async send(type, payload) {
    const recipient = typeof payload.email === 'string' ? payload.email : '';
    const domain = recipient.includes('@') ? recipient.split('@')[1] : 'unknown';
    if (!recipient) throw new Error('notification email is missing recipient');
    const deliveredPayload = type === 'otp' && isCipherPayload(payload.codeCiphertext)
      ? { ...payload, code: decodeOtpForDelivery({ codeCiphertext: payload.codeCiphertext }) }
      : payload;
    const rendered = renderEmail(type, deliveredPayload);
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || '127.0.0.1',
      port: Number(process.env.SMTP_PORT || 1025),
      secure: false,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || '' } : undefined,
    });
    try {
      await transporter.sendMail({ from: process.env.MAIL_FROM || 'ChongHub <noreply@example.test>', to: recipient, subject: rendered.subject, text: rendered.text });
    } catch (error) {
      if (process.env.MAIL_TRANSPORT !== 'local') throw error;
      const directory = process.env.LOCAL_MAIL_DIR || './var/mail';
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, `${Date.now()}-${randomUUID()}.json`), JSON.stringify({ to: recipient, subject: rendered.subject, text: rendered.text, type }), { mode: 0o600 });
    }
    console.info(`[mail] ${type} ${domain}`);
  },
};

function isCipherPayload(value: unknown): value is { ciphertext: string; iv: string; tag: string } {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.ciphertext === 'string' && typeof item.iv === 'string' && typeof item.tag === 'string';
}
