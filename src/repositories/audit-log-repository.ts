import { BaseRepository, BaseEntity } from '../db/base-repository.js';
import { AuditLog, AuditLogCreate, AuditLogQuery } from '../models/audit-log.js';
import { db } from '../db/connection.js';

interface AuditLogDB extends BaseEntity {
  tenant_id: string;
  skill_id: string;
  user_id: string | null;
  status: 'success' | 'error' | 'timeout';
  duration_ms: number;
  error_message: string | null;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  created_at: Date;
}

export class AuditLogRepository extends BaseRepository<AuditLogDB, AuditLogCreate, never> {
  protected tableName = 'audit_logs';
  protected selectQuery = 'SELECT * FROM audit_logs';

  async createMultiple(logs: AuditLogCreate[]): Promise<void> {
    if (logs.length === 0) return;

    const values: unknown[] = [];
    const rows: string[] = [];
    let paramIndex = 1;

    for (const log of logs) {
      const row = `($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}::jsonb, $${paramIndex++}::jsonb, NOW())`;
      rows.push(row);
      values.push(
        this.generateId(),
        log.tenantId,
        log.skillId,
        log.userId || null,
        log.status,
        log.durationMs,
        JSON.stringify(log.errorMessage || null),
        JSON.stringify(log.input || null),
        JSON.stringify(log.output || null)
      );
    }

    await db.query(
      `INSERT INTO audit_logs (id, tenant_id, skill_id, user_id, status, duration_ms, error_message, input, output, created_at) VALUES ${rows.join(', ')}`,
      values
    );
  }

  async query(params: AuditLogQuery): Promise<AuditLogDB[]> {
    const conditions: string[] = ['tenant_id = $1'];
    const values: unknown[] = [params.tenantId];
    let paramIndex = 2;

    if (params.skillId) {
      conditions.push(`skill_id = $${paramIndex++}`);
      values.push(params.skillId);
    }

    if (params.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(params.status);
    }

    if (params.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(params.startDate);
    }

    if (params.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(params.endDate);
    }

    const whereClause = conditions.join(' AND ');
    const query = `
      SELECT * FROM audit_logs
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    values.push(params.limit, params.offset);

    return db.query<AuditLogDB>(query, values);
  }

  async count(queryParams: Omit<AuditLogQuery, 'limit' | 'offset'>): Promise<number> {
    const conditions: string[] = ['tenant_id = $1'];
    const values: unknown[] = [queryParams.tenantId];
    let paramIndex = 2;

    if (queryParams.skillId) {
      conditions.push(`skill_id = $${paramIndex++}`);
      values.push(queryParams.skillId);
    }

    if (queryParams.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(queryParams.status);
    }

    if (queryParams.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(queryParams.startDate);
    }

    if (queryParams.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(queryParams.endDate);
    }

    const whereClause = conditions.join(' AND ');
    const rows = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM audit_logs WHERE ${whereClause}`,
      values
    );

    return parseInt(rows[0]?.count || '0', 10);
  }

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  protected mapFromDB(db: AuditLogDB): AuditLog {
    return {
      id: db.id,
      tenantId: db.tenant_id,
      skillId: db.skill_id,
      userId: db.user_id || undefined,
      status: db.status,
      durationMs: db.duration_ms,
      errorMessage: db.error_message || undefined,
      input: db.input || undefined,
      output: db.output || undefined,
      createdAt: db.created_at,
    };
  }
}
