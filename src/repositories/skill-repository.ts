import { BaseRepository, BaseEntity } from '../db/base-repository.js';
import { Skill, SkillCreate, SkillVersion, SkillVersionCreate } from '../models/skill.js';
import { db } from '../db/connection.js';

interface SkillDB extends BaseEntity {
  tenant_id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  created_at: Date;
  updated_at: Date;
}

interface SkillVersionDB extends BaseEntity {
  id: string;
  skill_id: string;
  version: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  code_path: string;
  published_at: Date;
}

export class SkillRepository extends BaseRepository<SkillDB, SkillCreate, Partial<SkillCreate>> {
  protected tableName = 'skills';
  protected selectQuery = 'SELECT * FROM skills';

  async findByTenant(tenantId: string, status?: string): Promise<SkillDB[]> {
    const query = status
      ? 'SELECT * FROM skills WHERE tenant_id = $1 AND status = $2'
      : 'SELECT * FROM skills WHERE tenant_id = $1';
    const params = status ? [tenantId, status] : [tenantId];
    return db.query<SkillDB>(query, params);
  }

  async findByName(tenantId: string, name: string): Promise<SkillDB | null> {
    const rows = await db.query<SkillDB>(
      'SELECT * FROM skills WHERE tenant_id = $1 AND name = $2',
      [tenantId, name]
    );
    return rows[0] || null;
  }

  async updateStatus(id: string, status: 'draft' | 'published' | 'archived'): Promise<SkillDB | null> {
    const rows = await db.query<SkillDB>(
      'UPDATE skills SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id, status]
    );
    return rows[0] || null;
  }

  protected mapFromDB(db: SkillDB): Skill {
    return {
      id: db.id,
      tenantId: db.tenant_id,
      name: db.name,
      description: db.description ?? undefined,
      status: db.status,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    };
  }
}

export class SkillVersionRepository extends BaseRepository<SkillVersionDB, SkillVersionCreate, never> {
  protected tableName = 'skill_versions';
  protected selectQuery = 'SELECT id, skill_id, version, input_schema, output_schema, code_path, published_at, created_at, updated_at FROM skill_versions';

  async findBySkill(skillId: string): Promise<SkillVersionDB[]> {
    return db.query<SkillVersionDB>(
      'SELECT * FROM skill_versions WHERE skill_id = $1 ORDER BY published_at DESC',
      [skillId]
    );
  }

  async findByVersion(skillId: string, version: string): Promise<SkillVersionDB | null> {
    const rows = await db.query<SkillVersionDB>(
      'SELECT * FROM skill_versions WHERE skill_id = $1 AND version = $2',
      [skillId, version]
    );
    return rows[0] || null;
  }

  async findLatest(skillId: string): Promise<SkillVersionDB | null> {
    const rows = await db.query<SkillVersionDB>(
      'SELECT * FROM skill_versions WHERE skill_id = $1 ORDER BY published_at DESC LIMIT 1',
      [skillId]
    );
    return rows[0] || null;
  }

  protected mapFromDB(db: SkillVersionDB): SkillVersion {
    return {
      id: db.id,
      skillId: db.skill_id,
      version: db.version,
      inputSchema: db.input_schema,
      outputSchema: db.output_schema,
      codePath: db.code_path,
      publishedAt: db.published_at,
      createdAt: db.createdAt,
      updatedAt: db.updatedAt,
    };
  }
}
