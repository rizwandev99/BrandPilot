import { defineConfig } from 'drizzle-kit';

try {
  process.loadEnvFile?.('.env.local');
} catch {
  // Ignore if file doesn't exist (e.g. CI / production)
}

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.DATABASE_URL ||
      'postgres://postgres:postgres@127.0.0.1:5432/brandpilot',
  },
});
