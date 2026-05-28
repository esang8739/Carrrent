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

  public getTenantId(skill: SkillDB): string {
    return skill.tenant_id;
  }

  override async findById(id: string): Promise<SkillDB | null> {
    return super.findById(id);
  }

  override async findAll(): Promise<SkillDB[]> {
    return super.findAll();
  }

  override async create(data: SkillCreate): Promise<SkillDB> {
    return super.create(data);
  }

  override async update(id: string, data: Partial<SkillCreate>): Promise<SkillDB | null> {
    return super.update(id, data);
  }

  async findByIdAndMap(id: string): Promise<Skill | null> {
    const row = await super.findById(id);
    return row ? this.mapFromDB(row) : null;
  }

  async findAllAndMap(): Promise<Skill[]> {
    const rows = await super.findAll();
    return rows.map(row => this.mapFromDB(row));
  }

  async createAndMap(data: SkillCreate): Promise<Skill> {
    const row = await super.create(data);
    return this.mapFromDB(row);
  }

  async updateAndMap(id: string, data: Partial<SkillCreate>): Promise<Skill | null> {
    const row = await super.update(id, data);
    return row ? this.mapFromDB(row) : null;
  }

  async findByTenant(tenantId: string, status?: string): Promise<Skill[]> {
    const query = status
      ? 'SELECT * FROM skills WHERE tenant_id = $1 AND status = $2'
      : 'SELECT * FROM skills WHERE tenant_id = $1';
    const params = status ? [tenantId, status] : [tenantId];
    const rows = await db.query<SkillDB>(query, params);
    return rows.map(row => this.mapFromDB(row));
  }

  async findByName(tenantId: string, name: string): Promise<Skill | null> {
    const rows = await db.query<SkillDB>(
      'SELECT * FROM skills WHERE tenant_id = $1 AND name = $2',
      [tenantId, name]
    );
    const row = rows[0] || null;
    return row ? this.mapFromDB(row) : null;
  }

  async updateStatus(id: string, status: 'draft' | 'published' | 'archived'): Promise<Skill | null> {
    const rows = await db.query<SkillDB>(
      'UPDATE skills SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id, status]
    );
    const row = rows[0] || null;
    return row ? this.mapFromDB(row) : null;
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

  override async findById(id: string): Promise<SkillVersionDB | null> {
    return super.findById(id);
  }

  override async findAll(): Promise<SkillVersionDB[]> {
    return super.findAll();
  }

  override async create(data: SkillVersionCreate): Promise<SkillVersionDB> {
    return super.create(data);
  }

  async findByIdAndMap(id: string): Promise<SkillVersion | null> {
    const row = await super.findById(id);
    return row ? this.mapFromDB(row) : null;
  }

  async findAllAndMap(): Promise<SkillVersion[]> {
    const rows = await super.findAll();
    return rows.map(row => this.mapFromDB(row));
  }

  async createAndMap(data: SkillVersionCreate): Promise<SkillVersion> {
    const row = await super.create(data);
    return this.mapFromDB(row);
  }

  async findBySkill(skillId: string): Promise<SkillVersion[]> {
    const rows = await db.query<SkillVersionDB>(
      'SELECT * FROM skill_versions WHERE skill_id = $1 ORDER BY published_at DESC',
      [skillId]
    );
    return rows.map(row => this.mapFromDB(row));
  }

  async findByVersion(skillId: string, version: string): Promise<SkillVersion | null> {
    const rows = await db.query<SkillVersionDB>(
      'SELECT * FROM skill_versions WHERE skill_id = $1 AND version = $2',
      [skillId, version]
    );
    const row = rows[0] || null;
    return row ? this.mapFromDB(row) : null;
  }

  async findLatest(skillId: string): Promise<SkillVersion | null> {
    const rows = await db.query<SkillVersionDB>(
      'SELECT * FROM skill_versions WHERE skill_id = $1 ORDER BY published_at DESC LIMIT 1',
      [skillId]
    );
    const row = rows[0] || null;
    return row ? this.mapFromDB(row) : null;
  }

  public getPublishedAt(version: SkillVersionDB): Date {
    return version.published_at;
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
