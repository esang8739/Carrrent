import { getConnection } from './connection.js';
import bcrypt from 'bcryptjs';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

const seedLogger = logger.child('seed');

export async function seedDatabase(): Promise<void> {
  let conn;

  try {
    conn = await getConnection();
    const sql = conn.sql;

    seedLogger.info('Seeding database with initial data');

    // Check if admin user already exists
    const existingAdmin = await sql`
      SELECT id FROM users WHERE role = 'admin' LIMIT 1
    `;

    if (existingAdmin.length > 0) {
      seedLogger.info('Admin user already exists, skipping seed');
      return;
    }

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', config.bcryptSaltRounds);

    await sql`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (
        'admin',
        'admin@example.com',
        ${adminPassword},
        'admin'
      )
    `;

    // Create demo user
    const demoPassword = await bcrypt.hash('demo123', config.bcryptSaltRounds);

    await sql`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (
        'demo',
        'demo@example.com',
        ${demoPassword},
        'developer'
      )
    `;

    // Create sample skills
    await sql`
      INSERT INTO skills (name, description, version, author, code_type, code, status)
      VALUES 
        (
          'hello-world',
          'A simple hello world skill',
          '1.0.0',
          'admin',
          'typescript',
          'export function process(params) { return { message: "Hello, World!", params }; }',
          'active'
        ),
        (
          'data-transformer',
          'Transform data with custom logic',
          '1.0.0',
          'admin',
          'javascript',
          'function process(params) { const { data } = params; return { transformed: data, timestamp: new Date().toISOString() }; }',
          'active'
        ),
        (
          'json-validator',
          'Validate JSON structure',
          '1.0.0',
          'admin',
          'javascript',
          'function process(params) { const { data } = params; try { JSON.parse(JSON.stringify(data)); return { valid: true }; } catch(e) { return { valid: false, error: e.message }; } }',
          'draft'
        );
    `;

    seedLogger.info('Database seeding completed successfully');
    seedLogger.info('Created admin user: admin@example.com / admin123');
    seedLogger.info('Created demo user: demo@example.com / demo123');
  } catch (error) {
    seedLogger.error('Database seeding failed', { error });
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
