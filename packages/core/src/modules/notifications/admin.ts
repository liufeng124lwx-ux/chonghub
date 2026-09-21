import 'server-only';
import { query, withTransaction } from '@chonghub/core/server/db';
import { AppError } from '@chonghub/core/server/errors';
import type { NotificationChannel, NotificationType } from './contracts';

export interface NotificationSummaryItem {
  eventId: string;
  channel: NotificationChannel;
  type: NotificationType;
  state: 'pending' | 'leased' | 'sent' | 'failed';
  attempts: number;
  availableAt: string;
  leasedUntil: string | null;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface NotificationSummary {
  counts: Record<string, number>;
  items: NotificationSummaryItem[];
}

/**
 * Returns queue metadata only. Payloads are intentionally excluded because an
 * OTP payload may contain an encrypted delivery secret and must never be
 * exposed through the admin list API.
 */
export async function getNotificationSummary(limit = 50): Promise<NotificationSummary> {
  const boundedLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  const [countsResult, itemsResult] = await Promise.all([
    query<{ state: string; count: string }>('SELECT state, count(*)::text AS count FROM outbox GROUP BY state'),
    query<{
      event_id: string;
      channel: NotificationChannel;
      type: NotificationType;
      state: NotificationSummaryItem['state'];
      attempts: number;
      available_at: Date;
      leased_until: Date | null;
      last_error: string | null;
      created_at: Date;
      sent_at: Date | null;
    }>(
      `SELECT event_id,channel,type,state,attempts,available_at,leased_until,last_error,created_at,sent_at
       FROM outbox
       WHERE state IN ('failed','pending','leased')
       ORDER BY CASE state WHEN 'failed' THEN 0 WHEN 'leased' THEN 1 ELSE 2 END, created_at DESC
       LIMIT $1`,
      [boundedLimit],
    ),
  ]);
  return {
    counts: Object.fromEntries(countsResult.rows.map((row) => [row.state, Number(row.count)])),
    items: itemsResult.rows.map((row) => ({
      eventId: row.event_id,
      channel: row.channel,
      type: row.type,
      state: row.state,
      attempts: row.attempts,
      availableAt: new Date(row.available_at).toISOString(),
      leasedUntil: row.leased_until ? new Date(row.leased_until).toISOString() : null,
      lastError: row.last_error,
      createdAt: new Date(row.created_at).toISOString(),
      sentAt: row.sent_at ? new Date(row.sent_at).toISOString() : null,
    })),
  };
}

/** Re-queues one terminally failed event without changing its payload. */
export async function retryNotification(eventId: string, actorUserId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) throw new AppError('INVALID_REQUEST', '通知标识无效。');
  return withTransaction(async (client) => {
    const current = await client.query<{ state: string }>('SELECT state FROM outbox WHERE event_id=$1 FOR UPDATE', [eventId]);
    const row = current.rows[0];
    if (!row) throw new AppError('NOT_FOUND', '通知不存在。', 404);
    if (row.state !== 'failed') return false;
    await client.query(
      `UPDATE outbox
       SET state='pending', available_at=now(), leased_until=NULL, last_error=NULL
       WHERE event_id=$1`,
      [eventId],
    );
    await client.query(
      `INSERT INTO audit_events (actor_user_id, action, details)
       VALUES ($1, 'notification_retry', jsonb_build_object('eventId', $2::text))`,
      [actorUserId, eventId],
    );
    return true;
  });
}
