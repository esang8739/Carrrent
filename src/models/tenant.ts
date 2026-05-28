import { z } from 'zod';
import { randomBytes } from 'crypto';

export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  apiKey: z.string().min(32).max(64),
  quotaLimit: z.number().int().positive(),
  quotaUsed: z.number().int().nonnegative().default(0),
  enabled: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Tenant = Omit<z.infer<typeof TenantSchema>, 'quotaUsed'> & {
  quotaUsed: number;
};

export const TenantCreateSchema = z.object({
  name: z.string().min(1).max(255),
  apiKey: z.string().min(32).max(64),
  quotaLimit: z.number().int().positive().default(10000),
});

export type TenantCreate = z.infer<typeof TenantCreateSchema>;

export const TenantUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  apiKey: z.string().min(32).max(64).optional(),
  quotaLimit: z.number().int().positive().optional(),
  enabled: z.boolean().optional(),
});

export type TenantUpdate = z.infer<typeof TenantUpdateSchema>;

export function generateApiKey(): string {
  return `sk_${randomBytes(32).toString('hex')}`;
}
