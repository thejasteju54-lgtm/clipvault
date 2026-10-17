import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  CLIPVAULT_LOCAL_DB_PATH: z.string().default('./data/vault.sqlite'),
  CLIPVAULT_PORT: z.coerce.number().default(4000)
});

export type EnvConfig = z.infer<typeof EnvSchema>;

export function validateEnv(env: Record<string, string | undefined> = process.env): EnvConfig {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    const formatted = result.error.errors.map(e => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
    throw new Error(`Environment validation failed:\n${formatted}`);
  }
  return result.data;
}
