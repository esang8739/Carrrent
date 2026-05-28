import Fastify from 'fastify';
import { ApiRoutes } from './routes-handlers.js';
import { TenantRepository } from '../repositories/tenant-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { SkillRepository } from '../repositories/skill-repository.js';
import { AuditLogRepository } from '../repositories/audit-log-repository.js';
import { AuditLoggerService } from '../services/audit-logger-service.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

const serverLogger = logger.child('http-server');

export async function createHttpServer() {
  const fastify = Fastify({
    logger: {
      level: config.serverLogLevel,
    },
  });

  fastify.addHook('onRequest', async (request) => {
    serverLogger.debug('HTTP request', {
      method: request.method,
      url: request.url,
    });
  });

  fastify.addHook('onResponse', async (request, reply) => {
    serverLogger.debug('HTTP response', {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
    });
  });

  const tenantRepo = new TenantRepository();
  const userRepo = new UserRepository();
  const skillRepo = new SkillRepository();
  const auditLogRepo = new AuditLogRepository();
  const auditLogger = new AuditLoggerService(auditLogRepo);

  const apiRoutes = new ApiRoutes(
    tenantRepo,
    userRepo,
    skillRepo,
    auditLogRepo,
    auditLogger
  );

  await apiRoutes.registerAll(fastify);

  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  const shutdown = async (signal: string) => {
    serverLogger.info(`Received ${signal}, shutting down gracefully`);
    await auditLogger.destroy();
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return fastify;
}

export async function startHttpServer() {
  const fastify = await createHttpServer();

  try {
    await fastify.listen({
      port: config.serverPort,
      host: config.serverHost,
    });

    serverLogger.info(`HTTP server listening on ${config.serverHost}:${config.serverPort}`);
  } catch (error) {
    serverLogger.error('Failed to start HTTP server', { error });
    process.exit(1);
  }

  return fastify;
}
