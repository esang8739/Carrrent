import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UserService } from '../src/services/user-service';
import { UserService as UserServiceImpl } from '../src/services/user-service';
import type { UserRepository } from '../src/repositories/user-repository';
import type { User } from '../src/models/user';

class MockUserRepository implements UserRepository {
  users: Map<string, User> = new Map();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.username === username) return user;
    }
    return null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async findAll(options?: any) {
    return Array.from(this.users.values());
  }

  async create(data: any): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      tenantId: data.tenantId || 'test-tenant-id',
      username: data.username,
      email: data.email,
      passwordHash: 'hashed_' + data.password,
      role: data.role || 'developer',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async update(id: string, data: any): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...data, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async existsByUsername(username: string): Promise<boolean> {
    for (const user of this.users.values()) {
      if (user.username === username) return true;
    }
    return false;
  }

  async existsByEmail(email: string): Promise<boolean> {
    for (const user of this.users.values()) {
      if (user.email === email) return true;
    }
    return false;
  }
}

describe('UserService', () => {
  let userRepository: MockUserRepository;
  let userService: UserService;

  beforeEach(() => {
    userRepository = new MockUserRepository();
    userService = new UserServiceImpl(userRepository);
  });

  afterEach(() => {
    userRepository.users.clear();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        tenantId: 'test-tenant-id',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'developer' as const,
      };

      const user = await userService.createUser(userData);

      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.role).toBe('developer');
      expect(user.passwordHash).toContain('hashed_');
    });

    it('should throw error when username already exists', async () => {
      const userData = {
        tenantId: 'test-tenant-id',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      await userService.createUser(userData);

      await expect(
        userService.createUser({ ...userData, email: 'another@example.com' })
      ).rejects.toThrow('Username already exists');
    });

    it('should throw error when email already exists', async () => {
      const userData = {
        tenantId: 'test-tenant-id',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      await userService.createUser(userData);

      await expect(
        userService.createUser({ ...userData, username: 'anotheruser' })
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('getUserById', () => {
    it('should get user by id', async () => {
      const userData = {
        tenantId: 'test-tenant-id',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      const created = await userService.createUser(userData);
      const retrieved = await userService.getUserById(created.id);

      expect(retrieved.id).toBe(created.id);
      expect(retrieved.username).toBe('testuser');
    });

    it('should throw error when user not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(userService.getUserById(fakeId)).rejects.toThrow('User not found');
    });
  });

  describe('updateUser', () => {
    it('should update user', async () => {
      const userData = {
        tenantId: 'test-tenant-id',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      const created = await userService.createUser(userData);
      const updated = await userService.updateUser(created.id, {
        username: 'updateduser' as any,
      });

      expect(updated?.username).toBe('updateduser');
    });

    it('should throw error when updating non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(
        userService.updateUser(fakeId, { username: 'newuser' as any })
      ).rejects.toThrow('User not found');
    });
  });
});
