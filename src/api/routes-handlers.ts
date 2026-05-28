import { FastifyInstance, FastifyRequest } from 'fastify';
import { TenantRepository } from '../repositories/tenant-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { SkillRepository } from '../repositories/skill-repository.js';
import { AuditLogRepository } from '../repositories/audit-log-repository.js';
import { AuditLoggerService } from '../services/audit-logger-service.js';
import { hashPassword } from '../models/user.js';
import { generateApiKey } from '../models/tenant.js';
import { logger } from '../utils/logger.js';

const apiLogger = logger.child('api-routes');

export interface AuthRequest extends FastifyRequest {
  user?: {
    userId: string;
    tenantId: string;
    role: string;
  };
}

export class ApiRoutes {
  constructor(
    private tenantRepo: TenantRepository,
    private userRepo: UserRepository,
    private skillRepo: SkillRepository,
    private auditLogRepo: AuditLogRepository,
    private auditLogger: AuditLoggerService
  ) {}

  async registerAll(app: FastifyInstance) {
    app.post('/api/tenants', async (req, reply) => {
      const { name, quotaLimit } = req.body as { name: string; quotaLimit?: number };
      const apiKey = generateApiKey();
      const tenant = await this.tenantRepo.create({
        name,
        apiKey,
        quotaLimit: quotaLimit || 10000,
      });
      return reply.send({ tenant, apiKey });
    });

    app.get('/api/tenants/:id', async (req: AuthRequest, reply) => {
      const { id } = req.params as { id: string };
      const tenant = await this.tenantRepo.findById(id);
      if (!tenant) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }
      return reply.send({ tenant });
    });

    app.put('/api/tenants/:id', async (req: AuthRequest, reply) => {
      const { id } = req.params as { id: string };
      const updates = req.body as Record<string, unknown>;
      const tenant = await this.tenantRepo.update(id, updates);
      if (!tenant) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }
      return reply.send({ tenant });
    });

    app.delete('/api/tenants/:id', async (req: AuthRequest, reply) => {
      const { id } = req.params as { id: string };
      const deleted = await this.tenantRepo.delete(id);
      if (!deleted) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }
      return reply.send({ success: true });
    });

    app.post('/api/tenants/:id/api-keys/rotate', async (req: AuthRequest, reply) => {
      const { id } = req.params as { id: string };
      const newApiKey = generateApiKey();
      const tenant = await this.tenantRepo.update(id, { apiKey: newApiKey });
      if (!tenant) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }
      return reply.send({ tenant, apiKey: newApiKey });
    });

    app.post('/api/users', async (req, reply) => {
      const { tenantId, email, password, role, username } = req.body as {
        tenantId: string;
        email: string;
        password: string;
        username: string;
        role?: string;
      };
      const passwordHash = await hashPassword(password);
      const user = await this.userRepo.create({
        tenantId,
        email,
        username,
        password: passwordHash,
        role: (role || 'developer') as 'admin' | 'developer' | 'viewer',
      });
      const { passwordHash: _, ...userWithoutPassword } = user;
      return reply.send({ user: userWithoutPassword });
    });

    app.get('/api/users', async (_req, reply) => {
      const users = await this.userRepo.findAll();
      const usersWithoutPassword = users.map(({ passwordHash, ...u }) => u);
      return reply.send({ users: usersWithoutPassword });
    });

    app.put('/api/users/:id/role', async (req: AuthRequest, reply) => {
      const { id } = req.params as { id: string };
      const { role } = req.body as { role: string };
      const user = await this.userRepo.update(id, { role } as any);
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }
      const { passwordHash: _, ...userWithoutPassword } = user;
      return reply.send({ user: userWithoutPassword });
    });

    app.get('/api/skills', async (req: AuthRequest, reply) => {
      const { tenantId } = req.query as { tenantId?: string };
      const skills = tenantId
        ? await this.skillRepo.findByTenant(tenantId)
        : await this.skillRepo.findAll();
      return reply.send({ skills });
    });

    app.post('/api/skills', async (req: AuthRequest, reply) => {
      const { tenantId, name, description } = req.body as {
        tenantId: string;
        name: string;
        description?: string;
      };
      const skill = await this.skillRepo.create({ tenantId, name, description });
      return reply.send({ skill });
    });

    app.put('/api/skills/:id/publish', async (req: AuthRequest, reply) => {
      const { id } = req.params as { id: string };
      const { version: _version, inputSchema: _inputSchema, outputSchema: _outputSchema, code: _code } = req.body as {
        version: string;
        inputSchema: Record<string, unknown>;
        outputSchema: Record<string, unknown>;
        code: string;
      };
      const skill = await this.skillRepo.updateStatus(id, 'published');
      if (!skill) {
        return reply.code(404).send({ error: 'Skill not found' });
      }
      return reply.send({ skill });
    });

    app.put('/api/skills/:id/archive', async (req: AuthRequest, reply) => {
      const { id } = req.params as { id: string };
      const skill = await this.skillRepo.updateStatus(id, 'archived');
      if (!skill) {
        return reply.code(404).send({ error: 'Skill not found' });
      }
      return reply.send({ skill });
    });

    app.get('/api/logs', async (req: AuthRequest, reply) => {
      const { tenantId, skillId, status, startDate, endDate, limit, offset } = req.query as {
        tenantId: string;
        skillId?: string;
        status?: string;
        startDate?: string;
        endDate?: string;
        limit?: number;
        offset?: number;
      };
      const logs = await this.auditLogRepo.query({
        tenantId,
        skillId,
        status: status as any,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: limit || 100,
        offset: offset || 0,
      });
      return reply.send({ logs });
    });

    app.get('/api/metrics', async (req: AuthRequest, reply) => {
      const { tenantId, windowMs } = req.query as { tenantId: string; windowMs?: number };
      const metrics = await this.auditLogger.getMetrics(tenantId, windowMs || 3600000);
      return reply.send({ metrics });
    });

    apiLogger.info('API routes registered');
  }
}
