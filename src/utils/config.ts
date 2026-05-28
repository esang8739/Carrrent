import { z } from 'zod';

const configSchema = z.object({
  // Server
  serverHost: z.string().default('0.0.0.0'),
  serverPort: z.coerce.number().default(3000),
  serverLogLevel: z.string().default('info'),

  // Database
  databaseUrl: z.string().url(),
  databaseSsl: z
    .string()
    .transform((v) => v.toLowerCase() === 'true')
    .default('false'),
  databasePoolMin: z.coerce.number().default(2),
  databasePoolMax: z.coerce.number().default(10),
  dbMaxConnections: z.coerce.number().default(10),

  // Redis
  redisUrl: z.string().url(),
  redisPrefix: z.string().default('skills:'),

  // JWT
  jwtSecret: z.string().min(32),
  jwtExpiresIn: z.string().default('24h'),
  jwtRefreshExpiresIn: z.string().default('7d'),

  // Security
  bcryptSaltRounds: z.coerce.number().default(10),

  // Code Execution
  sandboxMemoryLimit: z.coerce.number().default(128),
  sandboxTimeout: z.coerce.number().default(5000),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const raw = {
    serverHost: process.env['SERVER_HOST'] || '0.0.0.0',
    serverPort: process.env['SERVER_PORT'] || '3000',
    serverLogLevel: process.env['SERVER_LOG_LEVEL'] || 'info',

    databaseUrl: process.env['DATABASE_URL'],
    databaseSsl: process.env['DATABASE_SSL'] || 'false',
    databasePoolMin: process.env['DATABASE_POOL_MIN'] || '2',
    databasePoolMax: process.env['DATABASE_POOL_MAX'] || '10',
    dbMaxConnections: process.env['DATABASE_POOL_MAX'] || '10',

    redisUrl: process.env['REDIS_URL'],
    redisPrefix: process.env['REDIS_PREFIX'] || 'skills:',

    jwtSecret: process.env['JWT_SECRET'],
    jwtExpiresIn: process.env['JWT_EXPIRES_IN'] || '24h',
    jwtRefreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] || '7d',

    bcryptSaltRounds: process.env['BCRYPT_SALT_ROUNDS'] || '10',
    sandboxMemoryLimit: process.env['SANDBOX_MEMORY_LIMIT'] || '128',
    sandboxTimeout: process.env['SANDBOX_TIMEOUT'] || '5000',
  };

  const parsed = configSchema.safeParse(raw);

  if (!parsed.success) {
    console.error('Invalid configuration:', parsed.error.format());
    process.exit(1);
  }

  return parsed.data;
}

export const config = loadConfig();
