import { z } from 'zod';

export const SkillSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  status: z.enum(['draft', 'published', 'archived']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Skill = z.infer<typeof SkillSchema>;

export const SkillCreateSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

export type SkillCreate = z.infer<typeof SkillCreateSchema>;

export const SkillVersionSchema = z.object({
  id: z.string().uuid(),
  skillId: z.string().uuid(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
  codePath: z.string(),
  publishedAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SkillVersion = z.infer<typeof SkillVersionSchema>;

export const SkillVersionCreateSchema = z.object({
  skillId: z.string().uuid(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
  codePath: z.string(),
});

export type SkillVersionCreate = z.infer<typeof SkillVersionCreateSchema>;

export const SkillPublishSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
  code: z.string(),
});

export type SkillPublish = z.infer<typeof SkillPublishSchema>;

export const ExecuteSkillRequestSchema = z.object({
  skillId: z.string().uuid(),
  version: z.string().optional(),
  parameters: z.record(z.unknown()),
  timeout: z.number().positive().optional(),
  memoryLimit: z.number().positive().optional(),
  code: z.string().optional(),
});

export type ExecuteSkillRequest = z.infer<typeof ExecuteSkillRequestSchema>;

export interface ExecuteSkillResult {
  success: boolean;
  output?: unknown;
  error?: string;
  executionTime: number;
  memoryUsed: number;
}
