import { TenantRepository } from '../repositories/tenant-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { User } from '../models/user.js';
import { loadConfig } from '../utils/config.js';
import { logger } from '../utils/logger.js';

const authLogger = logger.child('auth');

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: User['role'];
}

export interface QuotaStatus {
  quotaLimit: number;
  quotaUsed: number;
  remaining: number;
}

export class AuthService {
  constructor(
    private tenantRepo: TenantRepository,
    private userRepo: UserRepository
  ) {}

  async validateApiKey(apiKey: string) {
    const tenant = await this.tenantRepo.findByApiKey(apiKey);
    if (!tenant) {
      throw new Error('Invalid or expired API key');
    }
    return tenant;
  }

  async checkQuota(tenantId: string): Promise<QuotaStatus> {
    return this.tenantRepo.checkQuota(tenantId);
  }

  async decrementQuota(tenantId: string, amount: number = 1): Promise<void> {
    await this.tenantRepo.decrementQuota(tenantId, amount);
  }

  async validateUser(credentials: { email: string; password: string }): Promise<AuthTokens> {
    const users = await this.userRepo.findAll();
    const user = users.find((u) => u.email === credentials.email);

    if (!user) {
      throw new Error('User not found');
    }

    const valid = await this.verifyPassword(credentials.password, user.passwordHash);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(password, hash);
  }

  private generateTokens(user: User): AuthTokens {
    const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken');
    const config = loadConfig();

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, config.jwtSecret as string, {
      expiresIn: config.jwtExpiresIn as any,
    });

    const refreshToken = jwt.sign(payload, config.jwtSecret as string, {
      expiresIn: config.jwtRefreshExpiresIn as any,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 86400,
    };
  }

  verifyToken(token: string): TokenPayload {
    const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken');
    const config = loadConfig();
    try {
      return jwt.verify(token, config.jwtSecret as string) as TokenPayload;
    } catch (error) {
      authLogger.error('Token verification failed', { error });
      throw new Error('Invalid or expired token');
    }
  }
}
