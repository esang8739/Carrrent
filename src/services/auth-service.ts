import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, CreateUserData } from '../models/user.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

const authLogger = logger.child('auth');

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenPayload {
  userId: string;
  username: string;
  role: User['role'];
}

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, config.bcryptSaltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateAccessToken(user: Pick<User, 'id' | 'username' | 'role'>): string {
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };
    return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  }

  generateRefreshToken(user: Pick<User, 'id' | 'username' | 'role'>): string {
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };
    return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtRefreshExpiresIn });
  }

  verifyToken<T extends TokenPayload>(token: string): T {
    try {
      return jwt.verify(token, config.jwtSecret) as T;
    } catch (error) {
      authLogger.error('Token verification failed', { error });
      throw new Error('Invalid or expired token');
    }
  }

  verifyUser(user: User, password: string): AuthTokens {
    if (!user.passwordHash || !this.verifyPassword(password, user.passwordHash)) {
      throw new Error('Invalid credentials');
    }

    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      expiresIn: parseInt(config.jwtExpiresIn) || 86400,
    };
  }
}
