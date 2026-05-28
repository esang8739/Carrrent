import { db } from './connection.js';
import { hashPassword } from '../models/user.js';
import { generateApiKey } from '../models/tenant.js';

export async function seed() {
  console.log('Seeding database...');

  await db.query(`DELETE FROM audit_logs`);
  await db.query(`DELETE FROM skill_versions`);
  await db.query(`DELETE FROM skills`);
  await db.query(`DELETE FROM users`);
  await db.query(`DELETE FROM tenants`);

  const apiKey = generateApiKey();

  await db.query(
    `INSERT INTO tenants (id, name, api_key, quota_limit, quota_used, enabled)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    ['00000000-0000-0000-0000-000000000001', 'Default Tenant', apiKey, 10000, 0, true]
  );

  const passwordHash = await hashPassword('Admin123!');

  await db.query(
    `INSERT INTO users (id, tenant_id, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)`,
    ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin@example.com', passwordHash, 'admin']
  );

  await db.query(
    `INSERT INTO skills (id, tenant_id, name, description, status)
     VALUES ($1, $2, $3, $4, $5)`,
    ['00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'hello-world', 'A simple hello world skill', 'published']
  );

  await db.query(
    `INSERT INTO skill_versions (id, skill_id, version, input_schema, output_schema, code_path)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '1.0.0',
      { type: 'object', properties: { name: { type: 'string' } } },
      { type: 'object', properties: { message: { type: 'string' } } },
      '/skills/hello-world/1.0.0.ts'
    ]
  );

  console.log(`Database seeded successfully.`);
  console.log(`Default Tenant API Key: ${apiKey}`);
  console.log(`Admin User: admin@example.com / Admin123!`);
}

if (import.meta.main) {
  seed()
    .then(() => {
      console.log('Seeding finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}
