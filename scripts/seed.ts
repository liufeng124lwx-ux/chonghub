import 'dotenv/config';
import { pool } from '../src/server/db';
import { seedCatalog } from '../src/modules/catalog/seed';

seedCatalog()
  .then(() => console.log('Catalog seed complete'))
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => pool.end());
