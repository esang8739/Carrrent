export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  codeType: SkillCodeType;
  code: string;
  status: SkillStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type SkillCodeType = 'javascript' | 'typescript' | 'python';
export type SkillStatus = 'draft' | 'active' | 'archived' | 'disabled';

export interface CreateSkillData {
  name: string;
  description: string;
  version: string;
  author: string;
  codeType: SkillCodeType;
  code: string;
  status?: SkillStatus;
}

export interface UpdateSkillData {
  name?: string;
  description?: string;
  version?: string;
  author?: string;
  codeType?: SkillCodeType;
  code?: string;
  status?: SkillStatus;
}

export interface ExecuteSkillRequest {
  skillId: string;
  parameters: Record<string, unknown>;
  timeout?: number;
  memoryLimit?: number;
}

export interface ExecuteSkillResult {
  success: boolean;
  output?: unknown;
  error?: string;
  executionTime: number;
  memoryUsed: number;
}
