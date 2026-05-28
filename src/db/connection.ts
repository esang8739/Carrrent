import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { config } from '../utils/config.js';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.dbMaxConnections,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = {
  query: async <T>(sql: string, params?: unknown[]) => {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows as T[];
    } finally {
      client.release();
    }
  },

  transaction: async <T>(fn: (client: any) => Promise<T>) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  close: async () => {
    await pool.end();
  },
};

export type QueryResult<T> = T[];
