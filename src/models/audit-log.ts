import { z } from 'zod';

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  skillId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  status: z.enum(['success', 'error', 'timeout']),
  durationMs: z.number().int().positive(),
  errorMessage: z.string().optional(),
  input: z.record(z.unknown()).optional(),
  output: z.record(z.unknown()).optional(),
  createdAt: z.date(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

export const AuditLogCreateSchema = z.object({
  tenantId: z.string().uuid(),
  skillId: z.string().uuid(),
  userId: z.string().uuid().optional(),
  status: z.enum(['success', 'error', 'timeout']),
  durationMs: z.number().int().positive(),
  errorMessage: z.string().optional(),
  input: z.record(z.unknown()).optional(),
  output: z.record(z.unknown()).optional(),
});

export type AuditLogCreate = z.infer<typeof AuditLogCreateSchema>;

export const AuditLogQuerySchema = z.object({
  tenantId: z.string().uuid(),
  skillId: z.string().uuid().optional(),
  status: z.enum(['success', 'error', 'timeout']).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().int().positive().max(1000).default(100),
  offset: z.number().int().nonnegative().default(0),
});

export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;

export const MetricsSchema = z.object({
  qps: z.number(),
  p99Latency: z.number(),
  p95Latency: z.number(),
  errorRate: z.number(),
  totalRequests: z.number(),
});

export type Metrics = z.infer<typeof MetricsSchema>;
