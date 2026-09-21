import { query } from '@chonghub/core/server/db';

export async function GET() {
  try {
    await query('SELECT 1');
    return Response.json({ service: 'admin', ok: true });
  } catch {
    return Response.json({ service: 'admin', ok: false }, { status: 503 });
  }
}
