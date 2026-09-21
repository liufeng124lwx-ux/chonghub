import 'dotenv/config';
import { pool } from '@chonghub/core/server/db';
import { seedCatalog } from '@chonghub/core/modules/catalog/seed';

seedCatalog()
  .then(() => console.log('Catalog seed complete'))
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => pool.end());
