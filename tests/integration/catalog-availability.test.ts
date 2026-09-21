import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const migration = readFileSync('db/migrations/010_catalog_availability.sql', 'utf8');
const createSource = readFileSync('packages/core/src/modules/orders/create.ts', 'utf8');
const adminSource = readFileSync('apps/admin/src/app/api/admin/[...path]/route.ts', 'utf8');

describe('catalog availability integration boundary', () => {
  it('defines an idempotent availability constraint and index', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS availability');
    expect(migration).toContain("availability IN ('available', 'sold_out')");
    expect(migration).toContain('skus_published_available_idx');
  });

  it('locks the SKU and rejects sold-out orders before insert', () => {
    expect(createSource).toContain("availability !== 'available'");
    expect(createSource).toContain('FOR UPDATE');
    expect(createSource.indexOf("availability !== 'available'")).toBeLessThan(createSource.indexOf('INSERT INTO orders'));
    expect(adminSource).toContain('setSkuAvailability');
  });
});
