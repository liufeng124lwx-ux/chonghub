import type { PoolClient } from 'pg';
import { notificationTypes, type EnqueueEventInput } from './contracts';

export async function enqueueEvent(tx: PoolClient, input: EnqueueEventInput): Promise<void> {
  if (!notificationTypes.includes(input.type)) throw new Error('Unsupported notification type');
  await tx.query(
    `INSERT INTO outbox (dedupe_key, channel, type, payload)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (dedupe_key) DO NOTHING`,
    [input.dedupeKey, input.channel, input.type, JSON.stringify(input.payload)],
  );
}
