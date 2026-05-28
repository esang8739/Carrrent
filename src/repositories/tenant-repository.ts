import { BaseRepository, BaseEntity } from '../db/base-repository.js';
import { Tenant, TenantCreate, TenantUpdate } from '../models/tenant.js';
import { db } from '../db/connection.js';

interface TenantDB extends BaseEntity {
  name: string;
  api_key: string;
  quota_limit: number;
  quota_used: number;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export class TenantRepository extends BaseRepository<TenantDB, TenantCreate, TenantUpdate> {
  protected tableName = 'tenants';
  protected selectQuery = 'SELECT * FROM tenants';

  async findByApiKey(apiKey: string): Promise<TenantDB | null> {
    const rows = await db.query<TenantDB>(
      'SELECT * FROM tenants WHERE api_key = $1 AND enabled = true',
      [apiKey]
    );
    return rows[0] || null;
  }

  async checkQuota(tenantId: string): Promise<{ quotaLimit: number; quotaUsed: number; remaining: number }> {
    const rows = await db.query<{ quota_limit: number; quota_used: number }>(
      'SELECT quota_limit, quota_used FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (!rows[0]) {
      throw new Error('Tenant not found');
    }

    const { quota_limit, quota_used } = rows[0];
    return {
      quotaLimit: quota_limit,
      quotaUsed: quota_used,
      remaining: quota_limit - quota_used,
    };
  }

  async decrementQuota(tenantId: string, amount: number = 1): Promise<void> {
    await db.query(
      'UPDATE tenants SET quota_used = quota_used + $2, updated_at = NOW() WHERE id = $1',
      [tenantId, amount]
    );
  }

  async incrementQuota(tenantId: string, amount: number = 1): Promise<void> {
    await db.query(
      'UPDATE tenants SET quota_used = GREATEST(0, quota_used - $2), updated_at = NOW() WHERE id = $1',
      [tenantId, amount]
    );
  }

  protected mapFromDB(db: TenantDB): Tenant {
    return {
      id: db.id,
      name: db.name,
      apiKey: db.api_key,
      quotaLimit: db.quota_limit,
      quotaUsed: db.quota_used,
      enabled: db.enabled,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    };
  }
}
