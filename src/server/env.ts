import { z } from 'zod';

const envSchema = z.object({
  APP_ORIGIN: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

let cached: z.infer<typeof envSchema> | undefined;

export function getEnv() {
  if (!cached) {
    const databaseUrl = process.env.NODE_ENV === 'test' && process.env.TEST_DATABASE_URL
      ? process.env.TEST_DATABASE_URL
      : process.env.DATABASE_URL;
    const values = process.env.NEXT_PHASE === 'phase-production-build' && !databaseUrl
      ? { ...process.env, DATABASE_URL: 'postgresql://build-only.invalid/chonghub' }
      : { ...process.env, DATABASE_URL: databaseUrl };
    const parsed = envSchema.safeParse(values);
    if (!parsed.success) {
      throw new Error(`Invalid environment: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`);
    }
    cached = parsed.data;
  }
  return cached;
}
