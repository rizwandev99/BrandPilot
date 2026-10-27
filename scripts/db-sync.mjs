import { execSync } from 'child_process';

const dbUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1')) {
  console.log('🔄 Remote Neon database detected, syncing schema via drizzle-kit push...');
  try {
    execSync('npx drizzle-kit push --force', { stdio: 'inherit' });
    console.log('✅ Database schema synced successfully.');
  } catch (err) {
    console.error('⚠️ Schema sync encountered error:', err.message);
  }
} else {
  console.log('ℹ️ Skipping auto-migration: local or default database URL.');
}
