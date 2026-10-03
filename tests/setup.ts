// Prépare la base SQLite jetable utilisée par les tests de routes.
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';

const file = path.join(__dirname, 'test.db');
rmSync(file, { force: true });
execSync('npx prisma db push --skip-generate --accept-data-loss', {
  stdio: 'ignore',
  env: { ...process.env, DATABASE_URL: `file:${file}` },
});
