import { User, CreateUserData, UpdateUserData } from '../models/user.js';
import { db } from '../db/connection.js';

interface UserDB {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  username: string;
  role: 'admin' | 'developer' | 'viewer';
  created_at: string;
  updated_at: string;
}

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    const rows = await db.query<UserDB>('SELECT * FROM users WHERE id = $1', [id]);
    const row = rows[0] || null;
    return row ? this.mapFromDB(row) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const rows = await db.query<UserDB>('SELECT * FROM users WHERE username = $1', [username]);
    const row = rows[0] || null;
    return row ? this.mapFromDB(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const rows = await db.query<UserDB>('SELECT * FROM users WHERE email = $1', [email]);
    const row = rows[0] || null;
    return row ? this.mapFromDB(row) : null;
  }

  async findAll(options?: FindAllUsersOptions): Promise<User[]> {
    let sql = 'SELECT * FROM users';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (options) {
      const conditions: string[] = [];
      if (options.role) {
        conditions.push(`role = $${paramIndex++}`);
        params.push(options.role);
      }
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      if (options.sortBy) {
        sql += ` ORDER BY ${options.sortBy} ${options.sortOrder.toUpperCase()}`;
      }
      if (options.limit !== undefined && options.offset !== undefined) {
        sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(options.limit, options.offset);
      }
    }

    const rows = await db.query<UserDB>(sql, params);
    return rows.map((row) => this.mapFromDB(row));
  }

  async create(data: CreateUserData): Promise<User> {
    const columns = ['tenant_id', 'email', 'password_hash', 'username', 'role'];
    const values = [data.tenantId, data.email, data.password, data.username, data.role];
    const now = new Date().toISOString();
    values.push(now, now);

    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO users (${columns.join(', ')}, created_at, updated_at) VALUES (${placeholders}, $${columns.length + 1}, $${columns.length + 2}) RETURNING *`;

    const rows = await db.query<UserDB>(sql, values);
    return this.mapFromDB(rows[0]!);
  }

  async update(id: string, data: UpdateUserData): Promise<User | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    if (data.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(data.role);
    }

    updates.push('updated_at = $' + paramIndex);
    values.push(new Date().toISOString());

    const updateClause = updates.join(', ');
    const sql = `UPDATE users SET ${updateClause} WHERE id = $${paramIndex + 1} RETURNING *`;

    const rows = await db.query<UserDB>(sql, [...values, id]);
    return rows[0] ? this.mapFromDB(rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await db.query<{ deleted: boolean }>('DELETE FROM users WHERE id = $1 RETURNING true', [id]);
    return rows[0]?.deleted ?? false;
  }

  async existsByUsername(username: string): Promise<boolean> {
    const rows = await db.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)',
      [username]
    );
    return rows[0]?.exists ?? false;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const rows = await db.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)',
      [email]
    );
    return rows[0]?.exists ?? false;
  }

  private mapFromDB(db: UserDB): User {
    return {
      id: db.id,
      tenantId: db.tenant_id,
      email: db.email,
      passwordHash: db.password_hash,
      username: db.username,
      role: db.role,
      createdAt: new Date(db.created_at),
      updatedAt: new Date(db.updated_at),
    };
  }
}

export interface FindAllUsersOptions {
  limit?: number;
  offset?: number;
  role?: User['role'];
  sortBy?: keyof User;
  sortOrder: 'asc' | 'desc';
}
