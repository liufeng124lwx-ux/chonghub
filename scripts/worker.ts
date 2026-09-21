import 'dotenv/config';
import { deliverBatch } from '../src/modules/notifications/worker';
import { pool } from '../src/server/db';

const POLL_MS = 5_000;
let stopping = false;
process.once('SIGTERM', () => { stopping = true; });
process.once('SIGINT', () => { stopping = true; });

async function main() {
  try {
    while (!stopping) {
      try {
        const result = await deliverBatch();
        if (result.sent || result.failed) console.log(`notification batch sent=${result.sent} failed=${result.failed}`);
      } catch (error) {
        console.error(error);
      }
      if (!stopping) await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
