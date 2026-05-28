import { skillServer } from './server.js';
import { migrate } from '../db/migrate.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

const appLogger = logger.child('app');

async function main(): Promise<void> {
  const env = process.env['NODE_ENV'] || 'development';

  appLogger.info('Starting skill-management-server', {
    port: config.serverPort,
    environment: env,
  });

  try {
    // Initialize database
    await migrate();

    // Start MCP server
    await skillServer.start();

    appLogger.info('Server started successfully');

    // Handle graceful shutdown
    const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

    shutdownSignals.forEach((signal) => {
      process.on(signal, async () => {
        appLogger.info(`Received ${signal}, shutting down gracefully`);
        try {
          await skillServer.stop();
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
