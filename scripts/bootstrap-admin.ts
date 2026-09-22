import 'dotenv/config';
import { pool, withTransaction } from '@chonghub/core/server/db';
import { normalizeEmail } from '@chonghub/core/modules/auth/contracts';
import { normalizeAdminUsername } from '@chonghub/core/modules/auth/admin-credentials';
import { hashPassword, serializePasswordHash } from '@chonghub/core/server/crypto';

async function main() {
  const usernameInput = process.env.ADMIN_USERNAME ?? process.argv[2];
  const password = process.env.ADMIN_PASSWORD ?? process.argv[3];
  const emailInput = process.env.ADMIN_EMAIL ?? process.argv[4] ?? 'admin@localhost.invalid';
  if (!usernameInput || !password) throw new Error('Usage: ADMIN_USERNAME=ops ADMIN_PASSWORD="<12+ chars>" [ADMIN_EMAIL=ops@example.com] pnpm tsx scripts/bootstrap-admin.ts');
  const username = normalizeAdminUsername(usernameInput);
  const email = normalizeEmail(emailInput);
  const passwordDigest = serializePasswordHash(await hashPassword(password));
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
    await client.query('DELETE FROM admin_credentials WHERE user_id <> $1', [userId]);
    await client.query(
      `INSERT INTO admin_identity (id, user_id)
       VALUES (1, $1)
       ON CONFLICT (id)
       DO UPDATE SET user_id = EXCLUDED.user_id, updated_at = now()`,
      [userId],
    );
    await client.query(
      `INSERT INTO admin_credentials (user_id, username, password_digest)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET username = EXCLUDED.username, password_digest = EXCLUDED.password_digest, updated_at = now()`,
      [userId, username, passwordDigest],
    );
  });
  console.log(`Admin credentials configured for ${username} (${email})`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
