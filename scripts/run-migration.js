import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const client = new pg.Client({
  host: 'db.ebkorrlmqyxnhmtgixvn.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '@Aaryanjagga122510030607',
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  try {
    console.log('Connecting to Supabase PostgreSQL database...');
    await client.connect();
    console.log('Connected successfully!');

    const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/20260101000000_initial_schema.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying database migration (tables, indexes, RLS policies, triggers)...');
    await client.query(sqlContent);
    console.log('Migration applied successfully!');

    // Query tables created
    const res = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('Public tables in Supabase database:', res.rows.map(r => r.table_name));

    await client.end();
  } catch (err) {
    console.error('Migration execution failed:', err);
    if (client) await client.end().catch(() => {});
    process.exit(1);
  }
}

main();
