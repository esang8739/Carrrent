import { createMcpServer } from './mcp-server.js';
import { TenantRepository } from '../repositories/tenant-repository.js';
import { SkillRepository, SkillVersionRepository } from '../repositories/skill-repository.js';
import { AuditLogRepository } from '../repositories/audit-log-repository.js';
import { AuthService } from '../services/auth-service.js';
import { ExecutionService } from '../services/execution-service.js';
import { SkillRegistry } from '../services/skill-registry.js';
import { AuditLoggerService } from '../services/audit-logger-service.js';
import { db } from '../db/connection.js';
import { migrate } from '../db/migrate.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

const appLogger = logger.child('app');

async function main(): Promise<void> {
  const env = process.env['NODE_ENV'] || 'development';
  const apiKey = process.env['SKILL_API_KEY'];

  appLogger.info('Starting skill-management-server', {
    port: config.serverPort,
    environment: env,
  });

  try {
    await migrate();
    appLogger.info('Database initialized');

    const tenantRepo = new TenantRepository();
    const skillRepo = new SkillRepository();
    const skillVersionRepo = new SkillVersionRepository();
    const auditLogRepo = new AuditLogRepository();

    const authService = new AuthService(tenantRepo, null as any);
    const skillRegistry = new SkillRegistry(skillRepo, skillVersionRepo);
    const executionService = new ExecutionService(skillRegistry);
    const auditLogger = new AuditLoggerService(auditLogRepo);

    if (!apiKey) {
      appLogger.warn('No API key provided, using default tenant');
    }

    const tenant = apiKey ? await authService.validateApiKey(apiKey) : null;
    const tenantId = tenant?.id || 'default';

    const mcpServer = createMcpServer(
      { apiKey: apiKey || 'default', tenantId },
      executionService,
      skillRegistry,
      auditLogger
    );

    await mcpServer.start();
    appLogger.info('MCP server started successfully');

    const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

    shutdownSignals.forEach((signal) => {
      process.on(signal, async () => {
        appLogger.info(`Received ${signal}, shutting down gracefully`);
        try {
          await mcpServer.stop();
          await db.close();
          process.exit(0);
        } catch (error) {
          appLogger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });
    });
  } catch (error) {
    appLogger.error('Failed to start server', { error });
    process.exit(1);
  }
}

main().catch((error) => {
  appLogger.error('Unhandled error', { error });
  process.exit(1);
});
