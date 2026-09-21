import { query } from '@chonghub/core/server/db';

export async function GET() {
  try {
    await query('SELECT 1');
    return Response.json({ service: 'web', ok: true });
  } catch {
    return Response.json({ service: 'web', ok: false }, { status: 503 });
  }
}
