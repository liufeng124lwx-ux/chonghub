import 'dotenv/config';
import { pool, withTransaction } from '../src/server/db';
import { normalizeEmail } from '../src/modules/auth/contracts';

async function main() {
  const input = process.argv[2];
  if (!input) throw new Error('Usage: pnpm tsx scripts/bootstrap-admin.ts admin@example.com');
  const email = normalizeEmail(input);
  await withTransaction(async (client) => {
    const user = await client.query<{ id: string }>(
      `INSERT INTO users (canonical_email, verified_at)
       VALUES ($1, now())
       ON CONFLICT (canonical_email)
       DO UPDATE SET verified_at = COALESCE(users.verified_at, now()), updated_at = now()
       RETURNING id`,
      [email],
    );
    const userId = user.rows[0]?.id;
    if (!userId) throw new Error('Unable to create admin user');
    await client.query(
      `INSERT INTO admin_identity (id, user_id)
       VALUES (1, $1)
       ON CONFLICT (id)
       DO UPDATE SET user_id = EXCLUDED.user_id, updated_at = now()`,
      [userId],
    );
  });
  console.log(`Admin identity configured for ${email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
