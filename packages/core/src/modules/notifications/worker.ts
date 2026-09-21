import { pool } from '@chonghub/core/server/db';
import { feishuSender } from './feishu';
import { localEmailSender } from './email';
import type { NotificationChannel, NotificationSender, NotificationType } from './contracts';

const backoffMinutes = [1, 5, 15, 60, 180];

export async function deliverBatch(now = new Date(), limit = 25): Promise<{ sent: number; failed: number }> {
  const claimed = await pool.query<{ event_id: string; channel: NotificationChannel; type: NotificationType; payload: Record<string, unknown> }>(
    `WITH picked AS (
       SELECT event_id FROM outbox
       WHERE (state = 'pending' AND available_at <= $1)
          OR (state = 'leased' AND leased_until < $1)
       ORDER BY created_at LIMIT $2 FOR UPDATE SKIP LOCKED
     )
     UPDATE outbox o SET state = 'leased', leased_until = $1 + interval '5 minutes', attempts = attempts + 1
     FROM picked WHERE o.event_id = picked.event_id
     RETURNING o.event_id, o.channel, o.type, o.payload`, [now, limit],
  );
  let sent = 0; let failed = 0;
  for (const event of claimed.rows) {
    if (event.type === 'otp' && !(await otpIsDeliverable(event.payload, now))) {
      await pool.query(`UPDATE outbox SET state='failed', payload='{}'::jsonb, leased_until=NULL, last_error='otp_expired' WHERE event_id=$1`, [event.event_id]);
      failed += 1;
      continue;
    }
    const sender: NotificationSender = event.channel === 'email' ? localEmailSender : feishuSender;
    try {
      await sender.send(event.type, event.payload, event.channel);
      await pool.query(`UPDATE outbox SET state='sent', payload=CASE WHEN type='otp' THEN '{}'::jsonb ELSE payload END, sent_at=now(), leased_until=NULL, last_error=NULL WHERE event_id=$1`, [event.event_id]);
      sent += 1;
    } catch (error) {
      const detail = error instanceof Error ? error.message.slice(0, 500) : 'transport failure';
      const attempt = await attemptCount(event.event_id);
      await pool.query(
        `UPDATE outbox SET state = CASE WHEN attempts >= 5 THEN 'failed' ELSE 'pending' END,
          payload = CASE WHEN type='otp' AND attempts >= 5 THEN '{}'::jsonb ELSE payload END,
          available_at = now() + ($2::text || ' minutes')::interval, leased_until=NULL, last_error=$3 WHERE event_id=$1`,
        [event.event_id, String(backoffMinutes[Math.min(4, Math.max(0, attempt - 1))] ?? 180), detail],
      );
      failed += 1;
    }
  }
  return { sent, failed };
}

async function otpIsDeliverable(payload: Record<string, unknown>, now: Date): Promise<boolean> {
  const challengeId = typeof payload.challengeId === 'string' ? payload.challengeId : '';
  if (!challengeId) return false;
  const result = await pool.query<{ expires_at: Date }>('SELECT expires_at FROM otp_challenges WHERE id=$1', [challengeId]);
  return Boolean(result.rows[0] && new Date(result.rows[0].expires_at).getTime() > now.getTime());
}

async function attemptCount(id: string): Promise<number> {
  const result = await pool.query<{ attempts: number }>('SELECT attempts FROM outbox WHERE event_id=$1', [id]);
  return result.rows[0]?.attempts ?? 5;
}
