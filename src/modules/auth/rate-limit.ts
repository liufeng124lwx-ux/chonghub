import type { PoolClient } from 'pg';
import { hmacHex } from '@/server/crypto';

const HOUR_MS = 60 * 60 * 1000;

export interface RateLimitSpec {
  namespace: string;
  identity: string;
  max: number;
}

export async function consumeRateLimit(
  client: PoolClient,
  spec: RateLimitSpec,
  now = new Date(),
): Promise<boolean> {
  if (!Number.isSafeInteger(spec.max) || spec.max <= 0) throw new RangeError('invalid rate limit');
  const windowMs = Math.floor(now.getTime() / HOUR_MS) * HOUR_MS;
  const keyDigest = hmacHex(`${spec.namespace}:${spec.identity}`);
  const result = await client.query<{ count: number }>(
    `INSERT INTO rate_limits (key_digest, window_start, count)
     VALUES ($1, to_timestamp($2 / 1000.0), 1)
     ON CONFLICT (key_digest, window_start)
     DO UPDATE SET count = rate_limits.count + 1
     RETURNING count`,
    [keyDigest, windowMs],
  );
  return (result.rows[0]?.count ?? spec.max + 1) <= spec.max;
}

export { HOUR_MS };
