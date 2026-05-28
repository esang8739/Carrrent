import postgres from 'postgres';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

const dbLogger = logger.child('database');

export interface DatabaseConnection {
  readonly sql: ReturnType<typeof postgres>;
  close: () => Promise<void>;
  isConnected: boolean;
}

let connection: DatabaseConnection | null = null;

export async function createConnection(): Promise<DatabaseConnection> {
  if (connection?.isConnected) {
    return connection;
  }

  try {
    const sql = postgres(config.databaseUrl, {
      ssl: config.databaseSsl
        ? { rejectUnauthorized: false }
        : undefined,
      min: config.databasePoolMin,
      max: config.databasePoolMax,
      onnotice: (notice) => {
        dbLogger.debug('PostgreSQL notice', { notice });
      },
    });

    // Test connection
    await sql`SELECT 1 AS connected`;

    connection = {
      sql,
      isConnected: true,
      close: async () => {
        await sql.end();
        connection!.isConnected = false;
        dbLogger.info('Database connection closed');
      },
    };

    dbLogger.info('Database connection established');
    return connection;
  } catch (error) {
    dbLogger.error('Failed to establish database connection', {
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

export async function getConnection(): Promise<DatabaseConnection> {
  if (!connection) {
    return createConnection();
  }
  return connection;
}

export async function closeConnection(): Promise<void> {
  if (connection) {
    await connection.close();
    connection = null;
  }
}

// Re-export postgres types
export type { Sql } from 'postgres';
