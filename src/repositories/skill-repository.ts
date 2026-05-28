import { Skill, CreateSkillData, UpdateSkillData } from '../models/skill.js';

export interface SkillRepository {
  findById(id: string): Promise<Skill | null>;
  findByName(name: string): Promise<Skill | null>;
  findAll(options?: FindAllSkillsOptions): Promise<Skill[]>;
  findByStatus(status: Skill['status'], options?: FindAllSkillsOptions): Promise<Skill[]>;
  findByAuthor(author: string): Promise<Skill[]>;
  create(data: CreateSkillData): Promise<Skill>;
  update(id: string, data: UpdateSkillData): Promise<Skill | null>;
  delete(id: string): Promise<boolean>;
  countByStatus(): Promise<Record<Skill['status'], number>>;
}

export interface FindAllSkillsOptions {
  limit?: number;
  offset?: number;
  codeType?: Skill['codeType'];
  status?: Skill['status'];
  sortBy?: keyof Skill;
  sortOrder: 'asc' | 'desc';
}
