import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { getEnv } from './env';

declare global {
  var __chonghubPool: Pool | undefined;
}

export const pool = globalThis.__chonghubPool ?? new Pool({
  connectionString: getEnv().DATABASE_URL,
  max: 10,
  application_name: 'chonghub-web',
});

if (process.env.NODE_ENV !== 'production') globalThis.__chonghubPool = pool;

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<T>> {
  return pool.query<T>(text, values);
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
