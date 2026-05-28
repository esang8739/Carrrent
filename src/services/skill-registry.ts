import { SkillRepository, SkillVersionRepository } from '../repositories/skill-repository.js';
import { Skill, SkillCreate, SkillPublish, SkillVersion } from '../models/skill.js';
import { logger } from '../utils/logger.js';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const registryLogger = logger.child('registry');

export class SkillRegistry {
  private skillStoragePath: string;

  constructor(
    private skillRepo: SkillRepository,
    private versionRepo: SkillVersionRepository
  ) {
    this.skillStoragePath = process.env['SKILL_STORAGE_PATH'] || './skills';
    if (!existsSync(this.skillStoragePath)) {
      mkdirSync(this.skillStoragePath, { recursive: true });
    }
  }

  async getSkill(skillId: string, version?: string): Promise<SkillVersion> {
    let skillVersion: SkillVersion | null;

    if (version) {
      skillVersion = await this.versionRepo.findByVersion(skillId, version);
    } else {
      const versions = await this.versionRepo.findBySkill(skillId);
      skillVersion = versions[0] ?? null;
    }

    if (!skillVersion) {
      throw new Error(`Skill version not found`);
    }

    return skillVersion;
  }

  async listPublishedSkills(tenantId: string): Promise<Skill[]> {
    return await this.skillRepo.findByTenant(tenantId, 'published');
  }

  async listAllSkills(tenantId: string): Promise<Skill[]> {
    return await this.skillRepo.findByTenant(tenantId);
  }

  async createSkill(data: SkillCreate): Promise<Skill> {
    const existing = await this.skillRepo.findByName(data.tenantId, data.name);
    if (existing) {
      throw new Error(`Skill '${data.name}' already exists`);
    }

    return await this.skillRepo.createAndMap(data);
  }

  async publishSkill(skillId: string, publishData: SkillPublish): Promise<SkillVersion> {
    const skill = await this.skillRepo.findByIdAndMap(skillId);
    if (!skill) {
      throw new Error('Skill not found');
    }

    const validationResult = this.validateSchema(publishData.inputSchema, publishData.outputSchema);
    if (!validationResult.valid) {
      throw new Error(`Invalid schema: ${validationResult.errors.join(', ')}`);
    }

    const codePath = this.saveSkillCode(skillId, publishData.version, publishData.code);

    const versions = await this.versionRepo.findBySkill(skillId);
    const isUpdate = versions.length > 0;

    const skillVersion = await this.versionRepo.createAndMap({
      skillId,
      version: publishData.version,
      inputSchema: publishData.inputSchema,
      outputSchema: publishData.outputSchema,
      codePath,
    });

    if (!isUpdate) {
      await this.skillRepo.updateStatus(skillId, 'published');
    }

    registryLogger.info('Skill published', {
      skillId,
      version: publishData.version,
    });

    return skillVersion;
  }

  async archiveSkill(skillId: string): Promise<Skill> {
    const updated = await this.skillRepo.updateStatus(skillId, 'archived');
    if (!updated) {
      throw new Error('Skill not found');
    }

    registryLogger.info('Skill archived', { skillId });
    return updated;
  }

  async updateSkill(id: string, updates: Partial<SkillCreate>): Promise<Skill> {
    const updated = await this.skillRepo.updateAndMap(id, updates);
    if (!updated) {
      throw new Error('Skill not found');
    }
    return updated;
  }

  async deleteSkill(id: string): Promise<boolean> {
    return await this.skillRepo.delete(id);
  }

  private validateSchema(
    inputSchema: Record<string, unknown>,
    outputSchema: Record<string, unknown>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!inputSchema || typeof inputSchema !== 'object') {
      errors.push('Input schema must be a valid object');
    }

    if (!outputSchema || typeof outputSchema !== 'object') {
      errors.push('Output schema must be a valid object');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private saveSkillCode(skillId: string, version: string, code: string): string {
    const skillDir = join(this.skillStoragePath, skillId);
    if (!existsSync(skillDir)) {
      mkdirSync(skillDir, { recursive: true });
    }

    const versionDir = join(skillDir, version);
    if (!existsSync(versionDir)) {
      mkdirSync(versionDir, { recursive: true });
    }

    const codePath = join(versionDir, 'index.ts');
    writeFileSync(codePath, code, 'utf-8');

    return codePath;
  }

  async getSkillCode(skillVersion: SkillVersion): Promise<string> {
    try {
      return readFileSync(skillVersion.codePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to load skill code from ${skillVersion.codePath}`);
    }
  }
}
