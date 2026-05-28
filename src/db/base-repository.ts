import { db } from './connection.js';

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Repository<T extends BaseEntity, CreateDTO, UpdateDTO> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: CreateDTO): Promise<T>;
  update(id: string, data: UpdateDTO): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

export abstract class BaseRepository<
  T extends BaseEntity,
  CreateDTO,
  UpdateDTO
> implements Repository<T, CreateDTO, UpdateDTO> {
  protected abstract tableName: string;
  protected abstract selectQuery: string;

  async findById(id: string): Promise<T | null> {
    const rows = await db.query<T>(`${this.selectQuery} WHERE id = $1`, [id]);
    return rows[0] || null;
  }

  async findAll(): Promise<T[]> {
    return db.query<T>(this.selectQuery);
  }

  async create(data: CreateDTO): Promise<T> {
    const columns: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const createData = data as Record<string, unknown>;
    for (const [key, value] of Object.entries(createData)) {
      columns.push(key);
      values.push(value);
      paramIndex++;
    }

    const now = new Date();
    columns.push('created_at', 'updated_at');
    values.push(now, now);

    const columnNames = columns.join(', ');
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const rows = await db.query<T>(
      `INSERT INTO ${this.tableName} (${columnNames}) VALUES (${placeholders}) RETURNING *`,
      values
    );

    return rows[0]!;
  }

  async update(id: string, data: UpdateDTO): Promise<T | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const updateData = data as Record<string, unknown>;
    for (const [key, value] of Object.entries(updateData)) {
      updates.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    updates.push('updated_at = $' + paramIndex);
    values.push(new Date());

    const updateClause = updates.join(', ');

    const rows = await db.query<T>(
      `UPDATE ${this.tableName} SET ${updateClause} WHERE id = $${paramIndex + 1} RETURNING *`,
      [...values, id]
    );

    return rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await db.query<{ count: string }>(
      `DELETE FROM ${this.tableName} WHERE id = $1`,
      [id]
    );
    return (rows[0]?.count ?? '0') !== '0';
  }
}
