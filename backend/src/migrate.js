import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('[migrate] DATABASE_URL is not set. On Railway, add a Postgres plugin and set DATABASE_URL=${{Postgres.DATABASE_URL}} in this service\'s Variables.');
    process.exit(1);
  }
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('[migrate] applying schema...');
  await pool.query(sql);
  console.log('[migrate] schema applied.');
  await pool.end();
}

run().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
